/* PIEZZA — caja con tarjeta (campos de AZUL) y "Pagar con Brinco".
   Ambiente de pruebas: ningún dato de tarjeta sale del navegador ni se guarda.
   De la tarjeta solo se conserva marca, últimos 4 y vencimiento (como el token del procesador). */
(function () {
  'use strict';
  const SHIP = 150;
  const SECTORES = ['Piantini', 'Naco', 'Evaristo Morales', 'Serrallés', 'Bella Vista', 'Los Cacicazgos', 'Mirador Sur',
    'Gazcue', 'Zona Colonial', 'Arroyo Hondo', 'Los Prados', 'Ensanche Julieta', 'La Esperilla', 'Paraíso', 'Renacimiento'];
  const BRAND_IMG = { visa: '/images/pagos/visa.webp', mastercard: '/images/pagos/mastercard.webp' };
  const DECLINE = {
    '51': 'Fondos insuficientes. Intenta con otra tarjeta.',
    '05': 'El banco no autorizó la transacción. Contacta a tu banco o usa otra tarjeta.',
    '54': 'La tarjeta está vencida.'
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = (n) => 'RD$ ' + Math.round(n).toLocaleString('es-DO');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const track = (e, d) => { if (window.pzTrack) window.pzTrack(e, d); };
  const digits = (s) => String(s || '').replace(/\D/g, '');
  // Acepta el número como lo escriban (con o sin +1, guiones o espacios)
  const phoneDigits = (s) => { let d = digits(s); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.slice(0, 15); };
  const fmtPhone = (s) => { const d = phoneDigits(s); if (d.length > 10) return d; return d.length > 6 ? d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6) : d.length > 3 ? d.slice(0, 3) + '-' + d.slice(3) : d; };
  const validPhone = (s) => phoneDigits(s).length >= 7;
  const cardBrand = (n) => { const d = digits(n); if (/^4/.test(d)) return 'visa'; if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard'; if (/^3[47]/.test(d)) return 'amex'; return null; };
  const luhn = (n) => { const d = digits(n); if (d.length < 13) return false; let s = 0, alt = false; for (let i = d.length - 1; i >= 0; i--) { let x = +d[i]; if (alt) { x *= 2; if (x > 9) x -= 9; } s += x; alt = !alt; } return s % 10 === 0; };
  const brandName = (b) => ({ visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex' }[b] || 'Tarjeta');
  const authCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  // ---------- Cuenta Brinco compartida entre los negocios de sandscap.com.do ----------
  // Sin servidor todavía: la cuenta (sin datos de tarjeta, solo marca/últimos 4/token) viaja en una cookie
  // del dominio padre, así PIEZZA, HUMO y los demás ven la misma cuenta en el mismo navegador.
  const SHARED = /(^|\.)sandscap\.com\.do$/.test(location.hostname) ? 'sandscap.com.do' : null;
  const RP = SHARED || location.hostname;   // las passkeys se crean para todo sandscap.com.do
  const ck = {
    get(n) { try { const m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? JSON.parse(decodeURIComponent(m[1])) : null; } catch (e) { return null; } },
    set(n, v) {
      if (!SHARED) return;
      try { document.cookie = n + '=' + (v == null ? '' : encodeURIComponent(JSON.stringify(v))) + '; domain=.' + SHARED + '; path=/; max-age=' + (v == null ? 0 : 31536000) + '; secure; samesite=lax'; } catch (e) {}
    }
  };
  // Versión liviana para la cookie (máx. ~4 KB): las 2 cuentas más recientes, sin textos de consentimiento
  const slim = (a) => {
    const o = {};
    Object.keys(a).map((k) => a[k]).filter(Boolean).sort((x, y) => (x.touched || x.createdAt || 0) - (y.touched || y.createdAt || 0)).slice(-2).forEach((x) => {
      o[x.phone] = { phone: x.phone, name: x.name, email: x.email, createdAt: x.createdAt, touched: x.touched,
        addresses: (x.addresses || []).slice(-2).map((d) => ({ id: d.id, label: d.label, street: d.street, sector: d.sector, ref: d.ref, main: d.main })),
        cards: (x.cards || []).slice(-2).map((c) => ({ id: c.id, brand: c.brand, last4: c.last4, exp: c.exp, processor: c.processor, main: c.main, declineCode: c.declineCode || undefined })),
        passkeys: (x.passkeys || []).filter((p) => p.rp === RP).slice(-2).map((p) => ({ id: p.id, kind: p.kind, rp: p.rp })),
        merchants: (x.merchants || []).slice(-3).map((m) => ({ name: m.name, at: m.at })) };
    });
    return o;
  };
  const B = {
    accounts() {
      const loc = store.get('brinco_accounts', {}), sh = ck.get('brinco_acc');
      if (!sh) return loc;
      Object.keys(sh).forEach((k) => { loc[k] = Object.assign({}, loc[k] || {}, sh[k], { consents: (loc[k] && loc[k].consents) || [] }); });
      return loc;
    },
    save(a) { store.set('brinco_accounts', a); ck.set('brinco_acc', slim(a)); },
    session() { return (SHARED && ck.get('brinco_s')) || store.get('brinco_session', null); },
    me() { const s = B.session(); if (!s) return null; return B.accounts()[s.phone] || null; },
    login(phone) { const s = { phone: phoneDigits(phone), at: Date.now() }; store.set('brinco_session', s); ck.set('brinco_s', s); },
    logout() { try { localStorage.removeItem('brinco_session'); } catch (e) {} ck.set('brinco_s', null); },
    upsert(phone, fn) { const a = B.accounts(); const k = phoneDigits(phone); a[k] = fn(a[k] || null); if (a[k]) a[k].touched = Date.now(); B.save(a); return a[k]; },
    consent(acc, type, text) { (acc.consents = acc.consents || []).push({ type, text, at: new Date().toISOString(), channel: 'web', v: '2026-10' }); }
  };
  // Primera visita con la cuenta compartida: sube a la cookie lo que ya estaba guardado en este sitio
  if (SHARED) {
    const l0 = store.get('brinco_accounts', null), s0 = store.get('brinco_session', null);
    if (l0 && Object.keys(l0).length && !ck.get('brinco_acc')) ck.set('brinco_acc', slim(l0));
    if (s0 && !ck.get('brinco_s')) ck.set('brinco_s', s0);
  }

  // ---------- Passkeys: Face ID / huella (WebAuthn real; demo sin servidor, no se verifican firmas) ----------
  // En este equipo se guarda solo { phone, credId } en brinco_passkey. La biometría nunca sale del teléfono.
  const PK_TXT = {
    faceid: { name: 'Face ID', enter: 'Entrar con Face ID', on: 'Activar Face ID', title: '¿Entrar con Face ID la próxima vez?', use: 'Mira tu celular para entrar con Face ID.', ok: 'Face ID activado', pay: 'Confirma con Face ID…' },
    touchid: { name: 'Touch ID', enter: 'Entrar con Touch ID', on: 'Activar Touch ID', title: '¿Entrar con Touch ID la próxima vez?', use: 'Pon tu dedo en Touch ID para entrar.', ok: 'Touch ID activado', pay: 'Confirma con Touch ID…' },
    huella: { name: 'Huella', enter: 'Entrar con tu huella', on: 'Activar huella', title: '¿Entrar con tu huella la próxima vez?', use: 'Pon tu dedo en el lector para entrar.', ok: 'Huella activada', pay: 'Confirma con tu huella…' },
    bio: { name: 'Biometría', enter: 'Entrar con biometría', on: 'Activar biometría', title: '¿Entrar con biometría la próxima vez?', use: 'Confirma con la biometría de tu equipo.', ok: 'Biometría activada', pay: 'Confirma con tu biometría…' }
  };
  const PK = {
    _ok: null,
    kind() {
      const ua = navigator.userAgent || '';
      if (/Android/i.test(ua)) return 'huella';
      if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'faceid';
      if (/Macintosh/.test(ua)) return 'touchid';
      return 'bio';
    },
    t(k) { return PK_TXT[PK.kind()][k]; },
    can() { return !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.get && window.isSecureContext !== false); },
    // ¿Este equipo tiene lector biométrico? (se pregunta una sola vez)
    available() {
      if (!PK._ok) {
        PK._ok = (PK.can() && typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function')
          ? PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then((x) => !!x, () => false) : Promise.resolve(false);
      }
      return PK._ok;
    },
    // Passkey guardada en este equipo, solo si la cuenta todavía la tiene
    device() {
      const d = store.get('brinco_passkey', null);
      const ok = (acc, id) => acc && (acc.passkeys || []).some((p) => p.id === id && p.rp === RP);
      if (d && d.phone && d.credId && ok(B.accounts()[d.phone], d.credId)) return d;
      // Activada en otro negocio Brinco de sandscap.com.do con este mismo navegador
      const me = B.me(), pk = me && (me.passkeys || []).filter((p) => p.rp === RP).pop();
      return pk ? { phone: me.phone, credId: pk.id, kind: pk.kind } : null;
    },
    rand(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; },
    b64u(buf) { let s = ''; new Uint8Array(buf).forEach((b) => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
    unb64u(s) { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(b, (c) => c.charCodeAt(0)); },
    create(phone, displayName) {
      return navigator.credentials.create({ publicKey: {
        challenge: PK.rand(32),
        rp: { name: 'Brinco', id: RP },
        user: { id: PK.rand(16), name: phone, displayName: displayName || phone },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
        timeout: 60000
      } }).then((cred) => {
        if (!cred) throw new Error('sin credencial');
        const id = PK.b64u(cred.rawId);
        B.upsert(phone, (acc) => {
          if (acc) { acc.passkeys = (acc.passkeys || []).filter((p) => p.id !== id); acc.passkeys.push({ id, kind: PK.kind(), at: new Date().toISOString(), rp: RP }); }
          return acc;
        });
        store.set('brinco_passkey', { phone, credId: id, kind: PK.kind(), at: Date.now() });
        S.pkAt = Date.now();
        return id;
      });
    },
    get(d) {
      return navigator.credentials.get({ publicKey: {
        challenge: PK.rand(32),
        allowCredentials: [{ type: 'public-key', id: PK.unb64u(d.credId) }],
        userVerification: 'required', rpId: RP, timeout: 60000
      } }).then((cred) => {
        if (!cred || PK.b64u(cred.rawId) !== d.credId) throw new Error('no coincide');
        S.pkAt = Date.now();
        return d.phone;
      });
    }
  };
  // Navegador dentro de Instagram/Facebook/TikTok: Apple no deja usar Face ID ahí
  const INAPP = /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|BytedanceWebview|Line\//i.test(navigator.userAgent || '');
  const IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  function safariURL() { return 'x-safari-' + location.origin + location.pathname; }
  // Ícono: rostro (Face ID / biometría) o huella (Android)
  function pkIcon(size) {
    size = size || 22;
    const a = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
    if (PK.kind() === 'huella' || PK.kind() === 'touchid') return `<svg ${a}><path d="M12 11v2.5a9 9 0 0 1-1.6 5.2"/><path d="M8.6 10.6a3.4 3.4 0 0 1 6.8.4v1.6a13 13 0 0 1-.9 4.6"/><path d="M5.6 15.6a12 12 0 0 0 .6-4.6 5.8 5.8 0 0 1 10.6-3.3"/><path d="M18.3 10.2c.1.3.1.6.1.9 0 2.3-.3 4.4-.9 6.4"/><path d="M3.4 9.2A9 9 0 0 1 12 3a9 9 0 0 1 4.6 1.3"/><path d="M7.8 20.2a14 14 0 0 0 1.1-2.1"/></svg>`;
    return `<svg ${a}><path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H8M16 4h1.5A2.5 2.5 0 0 1 20 6.5V8M20 16v1.5a2.5 2.5 0 0 1-2.5 2.5H16M8 20H6.5A2.5 2.5 0 0 1 4 17.5V16"/><path d="M9 9.2v1.4M15 9.2v1.4M12 9.2v3.6h-.9M9.6 15.6a3.4 3.4 0 0 0 4.8 0"/></svg>`;
  }

  // ---------- Estado de la caja ----------
  const S = { mode: 'delivery', view: 'checkout', hist: [], pendingPay: null, otpCode: '', otpPhone: '', otpNext: null,
    bAddr: null, bCard: null, bNew: false, pkAsked: {}, pkAt: 0 };

  // ---------- DOM ----------
  const root = document.createElement('div');
  root.className = 'co';
  root.id = 'co';
  root.innerHTML = `
  <div class="co-scrim" data-x></div>
  <div class="co-sheet" role="dialog" aria-modal="true" aria-labelledby="coTitle">
    <div class="co-grab" aria-hidden="true"></div>
    <div class="co-head">
      <button class="co-back" id="coBack" type="button" aria-label="Volver" hidden><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></button>
      <h2 id="coTitle">Finalizar pedido</h2>
      <div class="co-brand" id="coBrand" hidden><img src="/images/piezza-horizontal.png" alt="PIEZZA"><span class="with">con <span class="brinco-word" style="font-size:15px">brinco</span></span></div>
      <button class="co-x" type="button" data-x aria-label="Cerrar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
    <div class="co-body" id="coBody"></div>
  </div>`;
  document.body.appendChild(root);
  const body = $('#coBody', root);

  const wa = document.createElement('button');
  wa.type = 'button';
  wa.className = 'wa-note';
  wa.setAttribute('aria-live', 'polite');
  wa.innerHTML = `<span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.5 4c1.7.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z"/></svg></span>
    <span style="flex:1;min-width:0"><span class="tt"><b>WhatsApp · Brinco</b><span>ahora</span></span><span class="bd" id="waText"></span></span>`;
  document.body.appendChild(wa);

  // ---------- Utilidades de vistas ----------
  function header(brinco, title) {
    $('#coTitle', root).hidden = !!brinco;
    $('#coTitle', root).textContent = title || 'Finalizar pedido';
    $('#coBrand', root).hidden = !brinco;
    root.classList.toggle('is-brinco', !!brinco);
    $('#coBack', root).hidden = S.hist.length === 0;
  }
  function show(view, html, opts) {
    opts = opts || {};
    if (!opts.replace && S.view && S.view !== view && !opts.root && S.view !== 'otp' && S.view !== 'verify') S.hist.push(S.view);
    if (opts.root) S.hist = [];
    S.view = view;
    body.innerHTML = `<div class="co-view enter" data-view="${view}">${html}</div>`;
    body.scrollTop = 0;
    header(opts.brinco, opts.title);
    const f = body.querySelector('[autofocus]');
    if (f) setTimeout(() => f.focus(), 60);
  }
  function back() {
    const v = S.hist.pop();
    if (!v) return;
    S.view = null;
    (VIEWS[v] || VIEWS.checkout)({ replace: true });
    $('#coBack', root).hidden = S.hist.length === 0;
  }
  function setErr(id, on) { const f = body.querySelector('#' + id); if (!f) return; f.closest('.fld').classList.toggle('bad', !!on); }

  function totals(mode) {
    const items = window.PZCart ? window.PZCart.items() : [];
    const sub = items.reduce((a, c) => a + c.qty * c.unit, 0);
    const ship = (mode || S.mode) === 'delivery' ? SHIP : 0;
    return { items, sub, ship, total: sub + ship };
  }
  function sumHTML(mode) {
    const t = totals(mode);
    return `<div class="sum">
      ${t.items.map((c) => `<div class="l"><span>${c.qty} × ${esc(c.name)} <small style="color:#6E625D">· ${esc(c.detail)}</small></span><span>${fmt(c.qty * c.unit)}</span></div>`).join('')}
      <div class="l" style="margin-top:4px"><span>Subtotal</span><span>${fmt(t.sub)}</span></div>
      <div class="l"><span>${(mode || S.mode) === 'delivery' ? 'Envío' : 'Recoger en tienda'}</span><span>${t.ship ? fmt(t.ship) : 'Gratis'}</span></div>
      <div class="l tot"><span>Total</span><span>${fmt(t.total)}</span></div>
      <span class="note">ITBIS incluido</span>
    </div>`;
  }
  const badgesHTML = `<div class="badges"><img src="/images/pagos/visa.webp" alt="Visa"><img src="/images/pagos/mastercard.webp" alt="Mastercard"><img src="/images/pagos/visa-secure.webp" alt="Visa Secure"><img src="/images/pagos/mastercard-id-check.webp" alt="Mastercard ID Check"></div>`;
  const testNote = `<p class="testmode">Ambiente de pruebas de AZUL · no se realiza ningún cargo real</p>`;

  function azulHTML(prefix) {
    return `<div class="azul" id="${prefix}Azul">
      <div class="azul-top"><span style="display:flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Campos seguros de <b>AZUL</b></span><span>Cifrado TLS · PCI DSS</span></div>
      <div class="azul-err" id="${prefix}AzErr" role="alert" hidden></div>
      <div class="fld cardnum"><label for="${prefix}Num">Número de tarjeta</label><input id="${prefix}Num" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" maxlength="19"><span class="brand" id="${prefix}Brand"></span><span class="err">Revisa el número de la tarjeta.</span></div>
      <div class="row2">
        <div class="fld"><label for="${prefix}Exp">Vence (MM/AA)</label><input id="${prefix}Exp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/AA" maxlength="5"><span class="err">Fecha no válida.</span></div>
        <div class="fld"><label for="${prefix}Cvv">CVV</label><input id="${prefix}Cvv" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4"><span class="err">3 o 4 dígitos.</span></div>
      </div>
      <div class="fld"><label for="${prefix}Holder">Nombre en la tarjeta</label><input id="${prefix}Holder" autocomplete="cc-name" placeholder="Como aparece en la tarjeta"><span class="err">Escribe el nombre.</span></div>
      <div class="testcards">Tarjetas de prueba: <button type="button" data-test="4242424242424242">4242 4242 4242 4242 · aprobada</button><button type="button" data-test="4000000000000002">4000 0000 0000 0002 · rechazada</button></div>
    </div>`;
  }
  function bindAzul(prefix) {
    const num = $('#' + prefix + 'Num', body), exp = $('#' + prefix + 'Exp', body), cvv = $('#' + prefix + 'Cvv', body), br = $('#' + prefix + 'Brand', body);
    const paintBrand = () => { const b = cardBrand(num.value); br.innerHTML = BRAND_IMG[b] ? `<img src="${BRAND_IMG[b]}" alt="${brandName(b)}">` : ''; };
    num.addEventListener('input', () => { num.value = digits(num.value).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); paintBrand(); setErr(prefix + 'Num', false); });
    exp.addEventListener('input', () => { const d = digits(exp.value).slice(0, 4); exp.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; setErr(prefix + 'Exp', false); });
    cvv.addEventListener('input', () => { cvv.value = digits(cvv.value).slice(0, 4); setErr(prefix + 'Cvv', false); });
    $$('[data-test]', body).forEach((b) => b.addEventListener('click', () => {
      num.value = b.dataset.test.replace(/(\d{4})(?=\d)/g, '$1 '); paintBrand();
      const y = (new Date().getFullYear() + 3) % 100; exp.value = '12/' + String(y).padStart(2, '0'); cvv.value = '123';
      const h = $('#' + prefix + 'Holder', body); if (!h.value) h.value = ($('#coName', body) && $('#coName', body).value) || 'Cliente PIEZZA';
      ['Num', 'Exp', 'Cvv', 'Holder'].forEach((k) => setErr(prefix + k, false));
    }));
  }
  function readAzul(prefix) {
    const num = $('#' + prefix + 'Num', body).value, exp = $('#' + prefix + 'Exp', body).value, cvv = $('#' + prefix + 'Cvv', body).value, holder = $('#' + prefix + 'Holder', body).value.trim();
    const m = exp.match(/^(\d{2})\/(\d{2})$/); let expOk = false;
    if (m) { const mm = +m[1], yy = 2000 + +m[2], now = new Date(); expOk = mm >= 1 && mm <= 12 && (yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1)); }
    const brand = cardBrand(num);
    const ok = { num: luhn(num) && !!brand, exp: expOk, cvv: /^\d{3,4}$/.test(cvv), holder: holder.length > 1 };
    setErr(prefix + 'Num', !ok.num); setErr(prefix + 'Exp', !ok.exp); setErr(prefix + 'Cvv', !ok.cvv); setErr(prefix + 'Holder', !ok.holder);
    if (!(ok.num && ok.exp && ok.cvv && ok.holder)) return null;
    const d = digits(num);
    // Solo lo que el procesador devolvería con el token: nunca el número completo ni el CVV
    return { brand, last4: d.slice(-4), exp, holder, declineCode: d === '4000000000000002' ? '51' : null };
  }

  // ---------- Vistas ----------
  const VIEWS = {};

  VIEWS.checkout = function (o) {
    o = o || {};
    const me = B.me();
    const card = me && me.cards && me.cards.find((c) => c.main) || (me && me.cards && me.cards[0]);
    const t = totals();
    show('checkout', `
      <button class="brinco-btn${card ? ' has-card' : ''}" type="button" id="bPayBtn"><span class="bl">Pagar con <span class="bw">brinco</span></span>${card ? `<span class="bc">${brandName(card.brand)} •••• ${card.last4}</span>` : ''}</button>
      <div class="co-or">o paga con tarjeta</div>
      <div class="co-sec"><h3>¿Cómo lo quieres?</h3>
        <div class="seg" role="group" aria-label="Entrega">
          <button type="button" data-mode="delivery" aria-pressed="${S.mode === 'delivery'}">Delivery<small>+${fmt(SHIP)} · 35–45 min</small></button>
          <button type="button" data-mode="pickup" aria-pressed="${S.mode === 'pickup'}">Recoger en tienda<small>Gratis · 20 min</small></button>
        </div></div>
      <div class="co-sec"><h3>Tus datos</h3>
        <div class="fld"><label for="coName">Nombre</label><input id="coName" autocomplete="name" placeholder="Tu nombre"><span class="err">Escribe tu nombre.</span></div>
        <div class="fld"><label for="coPhone">WhatsApp</label><input id="coPhone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="809-555-1234"><span class="err">Escribe tu número de WhatsApp.</span></div>
        <div id="coAddr" ${S.mode === 'delivery' ? '' : 'hidden'} style="display:${S.mode === 'delivery' ? 'flex' : 'none'};flex-direction:column;gap:10px">
          <div class="fld"><label for="coStreet">Dirección</label><input id="coStreet" autocomplete="street-address" placeholder="Calle, número, edificio, apto."><span class="err">Escribe la dirección.</span></div>
          <div class="row2">
            <div class="fld"><label for="coSector">Sector</label><select id="coSector"><option value="">Escoge…</option>${SECTORES.map((s) => `<option>${s}</option>`).join('')}</select><span class="err">Escoge el sector.</span></div>
            <div class="fld"><label for="coRef">Referencia</label><input id="coRef" placeholder="Frente a…"><span class="err"></span></div>
          </div>
        </div>
      </div>
      <div class="co-sec"><h3>Pago</h3>${azulHTML('c')}</div>
      <label class="chk"><input type="checkbox" id="coSave"><span>Guardar mis datos y mi tarjeta en <span class="brinco-word">brinco</span> para pagar con un toque en cualquier negocio Brinco<small>Te enviamos un código por WhatsApp para confirmar. Brinco no ve el número de tu tarjeta; lo guarda AZUL.</small></span></label>
      <div id="coSum">${sumHTML()}</div>
      <button class="pay" type="button" id="coPay"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Pagar ${fmt(t.total)}</button>
      ${testNote}${badgesHTML}`, { root: true, replace: o.replace });
    // Si ya llenó algo antes, se lo devolvemos
    const d = S.form || {};
    ['coName', 'coPhone', 'coStreet', 'coSector', 'coRef'].forEach((k) => { if (d[k]) $('#' + k, body).value = d[k]; });
    bindAzul('c');
    $('#coPhone', body).addEventListener('input', (e) => { e.target.value = fmtPhone(e.target.value); setErr('coPhone', false); });
    ['coName', 'coStreet', 'coSector'].forEach((k) => $('#' + k, body).addEventListener('input', () => setErr(k, false)));
    $$('[data-mode]', body).forEach((b) => b.addEventListener('click', () => {
      S.mode = b.dataset.mode;
      $$('[data-mode]', body).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const a = $('#coAddr', body); a.hidden = S.mode !== 'delivery'; a.style.display = S.mode === 'delivery' ? 'flex' : 'none';
      $('#coSum', body).innerHTML = sumHTML();
      $('#coPay', body).lastChild.textContent = 'Pagar ' + fmt(totals().total);
    }));
    $('#bPayBtn', body).addEventListener('click', () => { keepForm(); track('brinco_boton'); startBrinco(); });
    $('#coPay', body).addEventListener('click', payWithCard);
  };

  function keepForm() {
    S.form = {};
    ['coName', 'coPhone', 'coStreet', 'coSector', 'coRef'].forEach((k) => { const el = $('#' + k, body); if (el) S.form[k] = el.value; });
  }

  function payWithCard() {
    const name = $('#coName', body).value.trim(), phone = $('#coPhone', body).value;
    const street = $('#coStreet', body).value.trim(), sector = $('#coSector', body).value, ref = $('#coRef', body).value.trim();
    let ok = true;
    if (name.length < 2) { setErr('coName', true); ok = false; }
    if (!validPhone(phone)) { setErr('coPhone', true); ok = false; }
    if (S.mode === 'delivery') {
      if (street.length < 4) { setErr('coStreet', true); ok = false; }
      if (!sector) { setErr('coSector', true); ok = false; }
    }
    const card = readAzul('c');
    if (!ok || !card) { const bad = body.querySelector('.fld.bad input, .fld.bad select'); if (bad) bad.focus(); return; }
    keepForm();
    const save = $('#coSave', body).checked;
    const t = totals();
    S.pendingPay = { via: 'tarjeta', name, phone: phoneDigits(phone), mode: S.mode, address: S.mode === 'delivery' ? { street, sector, ref, label: 'Casa' } : null, card, save, total: t.total };
    track('pago_enviado', { total: t.total, metodo: 'tarjeta', guardar: save });
    if (save) {
      // Cuenta Brinco nueva al pagar (flujo A): primero confirmamos el WhatsApp
      sendOtp(phone, () => verify3ds());
    } else verify3ds();
  }

  // --- Código por WhatsApp (simulado: aparece como notificación) ---
  function sendOtp(phone, next, opts) {
    opts = opts || {};
    S.otpPhone = phoneDigits(phone);
    S.otpCode = String(Math.floor(100000 + Math.random() * 900000));
    S.otpNext = next;
    S.otpTries = 0;
    show('otp', `
      <div class="center" style="display:flex;flex-direction:column;gap:8px;align-items:center">
        <span class="brinco-word" style="font-size:28px">brinco</span>
        <p class="h3">Confirma tu WhatsApp</p>
        <p class="muted">Te enviamos un código de 6 dígitos al <b>${fmtPhone(S.otpPhone)}</b>.</p>
      </div>
      <div class="otp-boxes" id="otpBoxes"><input inputmode="numeric" autocomplete="one-time-code" aria-label="Dígito 1">${[2,3,4,5,6].map((n) => `<input inputmode="numeric" aria-label="Dígito ${n}">`).join('')}</div>
      <p class="muted center" id="otpMsg" role="alert"></p>
      <button class="pay blue" type="button" id="otpGo">Confirmar código</button>
      <button class="linkbtn" type="button" id="otpAgain">Enviar otro código</button>`, { brinco: true });
    const boxes = $$('#otpBoxes input', body);
    boxes[0].focus();
    boxes.forEach((b, i) => {
      b.addEventListener('input', () => {
        const v = digits(b.value);
        if (v.length > 1) { fill(v); return; }
        b.value = v; $('#otpBoxes', body).classList.remove('bad');
        if (v && boxes[i + 1]) boxes[i + 1].focus();
        if (boxes.every((x) => x.value)) check();
      });
      b.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !b.value && boxes[i - 1]) boxes[i - 1].focus(); });
    });
    function fill(code) { code.slice(0, 6).split('').forEach((c, k) => { boxes[k].value = c; }); boxes[Math.min(5, code.length - 1)].focus(); if (code.length >= 6) check(); }
    function check() {
      const code = boxes.map((x) => x.value).join('');
      if (code.length < 6) return;
      if (/^\d{6}$/.test(code)) { hideWa(); track('codigo_ok'); S.otpNext && S.otpNext(); }
      else {
        S.otpTries++;
        $('#otpBoxes', body).classList.add('bad');
        $('#otpMsg', body).textContent = S.otpTries >= 5 ? 'Demasiados intentos. Pide otro código.' : 'Código incorrecto. Revisa el mensaje de WhatsApp.';
        boxes.forEach((x) => { x.value = ''; }); boxes[0].focus();
      }
    }
    $('#otpGo', body).addEventListener('click', check);
    $('#otpAgain', body).addEventListener('click', () => sendOtp(S.otpPhone, S.otpNext));
    wa.onclick = () => { fill(S.otpCode); };
    setTimeout(() => showWa(`Tu código de Brinco es <b>${S.otpCode.slice(0, 3)} ${S.otpCode.slice(3)}</b>. Vence en 10 minutos. No lo compartas con nadie.`), 900);
  }
  let waTimer;
  function showWa(html) { $('#waText').innerHTML = html; wa.classList.add('show'); clearTimeout(waTimer); waTimer = setTimeout(hideWa, 12000); }
  function hideWa() { wa.classList.remove('show'); }

  // --- Avisos cortos ---
  const toastEl = document.createElement('div');
  toastEl.className = 'pk-toast';
  toastEl.setAttribute('role', 'status');
  document.body.appendChild(toastEl);
  let toastTimer;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200); }

  // --- Ofrecer Face ID / huella después de crear la cuenta o confirmar el WhatsApp ---
  function offerPasskey(phone, next) {
    const acc = B.accounts()[phone];
    const d = PK.device();
    if (!acc || S.pkAsked[phone] || (d && d.phone === phone)) { next(); return; }
    PK.available().then((ok) => {
      if (!ok) { next(); return; }
      S.pkAsked[phone] = true;
      VIEWS.bPasskey(phone, next);
    }, () => next());
  }

  VIEWS.bPasskey = function (phone, next) {
    if (typeof phone !== 'string') { VIEWS.checkout({ replace: true }); return; }
    const acc = B.accounts()[phone] || {};
    const check = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F4FFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    show('bPasskey', `
      <div class="pk-offer">
        <span class="pk-ico">${pkIcon(46)}</span>
        <p class="h3">${PK.t('title')}</p>
        <p class="muted">Usa la huella o el rostro de tu celular. Tu biometría nunca sale de tu teléfono.</p>
        <ul class="pk-pts"><li>${check}Entras y pagas en un segundo</li><li>${check}Sin códigos ni contraseñas</li></ul>
      </div>
      <button class="pay blue" type="button" id="pkOn">${pkIcon(22)}${PK.t('on')}</button>
      <button class="linkbtn" type="button" id="pkSkip">Ahora no</button>`, { brinco: true, root: true });
    let busy = false;
    $('#pkOn', body).addEventListener('click', (e) => {
      if (busy) return;
      busy = true; e.currentTarget.disabled = true;
      PK.create(phone, acc.name).then(() => {
        track('passkey_activada', { tipo: PK.kind() });
        VIEWS.bPasskeyOk(next);
      }, (err) => {
        track('passkey_fallo', { paso: 'activar', error: (err && err.name) || 'error' });
        toast('No se activó, puedes hacerlo luego');
        next();
      });
    });
    $('#pkSkip', body).addEventListener('click', () => next());
  };

  VIEWS.bPasskeyOk = function (next) {
    if (typeof next !== 'function') { VIEWS.checkout({ replace: true }); return; }
    show('bPasskeyOk', `<div class="co-view done" style="padding:0">
      <svg class="okmark" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="38"/><path d="M26 43l11 11 21-23"/></svg>
      <p class="h3">${PK.t('ok')}</p>
      <p class="muted">La próxima vez entras y pagas con ${PK.kind() === 'faceid' ? 'una mirada' : 'un toque'}.</p></div>`, { brinco: true, root: true });
    setTimeout(() => { if (S.view === 'bPasskeyOk') next(); }, 1300);
  };

  // --- Entrar con Face ID / huella; si falla, al WhatsApp de siempre ---
  function passkeyLogin(d, fromLogin) {
    show('pkWait', `<div class="co-view verify" style="padding:0">
      <span class="pk-ico pulse">${pkIcon(46)}</span>
      <p class="h3">Confirma que eres tú</p>
      <p class="muted">${PK.t('use')}</p></div>`, { brinco: true, replace: !!fromLogin });
    PK.get(d).then((phone) => {
      B.login(phone);
      track('passkey_login', { tipo: PK.kind(), paso: 'entrar' });
      const acc = B.accounts()[phone];
      S.bNew = false;
      if (acc && acc.cards && acc.cards.length) VIEWS.bSummary({ root: true });
      else VIEWS.bProfile();
    }, (err) => {
      track('passkey_fallo', { paso: 'entrar', error: (err && err.name) || 'error' });
      VIEWS.bLogin({ replace: true, phone: d.phone, msg: 'Usa tu número de WhatsApp' });
    });
  }

  // --- 3D Secure y cobro ---
  function verify3ds() {
    const p = S.pendingPay;
    const logo = p.card.brand === 'mastercard' ? '/images/pagos/mastercard-id-check.webp' : '/images/pagos/visa-secure.webp';
    show('verify', `<div class="co-view verify" style="padding:0">
      <img class="logo3ds" src="${logo}" alt="">
      <p class="h3">Verificando con tu banco</p>
      <p class="muted">${brandName(p.card.brand)} •••• ${p.card.last4} · ${fmt(p.total)}</p>
      <div class="spin" aria-label="Procesando"></div>
      <p class="muted" style="font-size:12px">No cierres esta ventana.</p></div>`, { replace: true, brinco: p.via === 'brinco' });
    $('#coBack', root).hidden = true;
    setTimeout(charge, 2100);
  }
  function processing() {
    const p = S.pendingPay;
    show('verify', `<div class="co-view verify" style="padding:0">
      <span class="brinco-word" style="font-size:30px">brinco</span>
      <div class="spin" aria-label="Procesando"></div>
      <p class="h3">Procesando tu pago</p>
      <p class="muted">${brandName(p.card.brand)} •••• ${p.card.last4} · ${fmt(p.total)}</p></div>`, { replace: true, brinco: true });
    $('#coBack', root).hidden = true;
    setTimeout(charge, 1500);
  }
  function charge() {
    const p = S.pendingPay;
    if (p.card.declineCode) {
      track('rechazo', { codigo: p.card.declineCode, metodo: p.via });
      if (p.via === 'brinco') { VIEWS.bSummary({ root: true, error: DECLINE[p.card.declineCode] }); return; }
      VIEWS.checkout({ replace: true });
      const e = $('#cAzErr', body); e.hidden = false; e.textContent = DECLINE[p.card.declineCode] + ' (código ' + p.card.declineCode + ')';
      e.scrollIntoView({ block: 'center' });
      return;
    }
    const t = totals(p.mode);
    const order = {
      no: 'PZ-' + String(Math.floor(10000 + Math.random() * 90000)),
      at: Date.now(), items: t.items, sub: t.sub, ship: t.ship, total: t.total, mode: p.mode,
      name: p.name, phone: p.phone, address: p.address, via: p.via,
      card: { brand: p.card.brand, last4: p.card.last4 }, auth: authCode(),
      src: window.pzSource ? window.pzSource().source : 'Directo', med: window.pzSource ? window.pzSource().medium : 'organico',
      brincoNew: false
    };
    // Cuenta Brinco: crear o agregar tarjeta (solo marca, últimos 4, vencimiento)
    if (p.via === 'tarjeta' && p.save) {
      const existed = !!B.accounts()[p.phone];
      B.upsert(p.phone, (acc) => {
        acc = acc || { phone: p.phone, name: p.name, email: '', addresses: [], cards: [], createdAt: Date.now(), merchants: [] };
        B.consent(acc, 'cuenta', 'Guardar mis datos en Brinco para pagar con un toque en cualquier negocio Brinco');
        B.consent(acc, 'guardar_tarjeta', 'Guardar esta tarjeta para mis compras en negocios Brinco. Brinco no ve el número; lo guarda AZUL.');
        if (p.address && !acc.addresses.some((a) => a.street === p.address.street)) acc.addresses.push(Object.assign({ id: Date.now(), main: !acc.addresses.length }, p.address));
        if (!acc.cards.some((c) => c.last4 === p.card.last4 && c.brand === p.card.brand)) acc.cards.forEach((c) => { c.main = false; }), acc.cards.push({ id: Date.now(), brand: p.card.brand, last4: p.card.last4, exp: p.card.exp, processor: 'azul', main: true });
        return acc;
      });
      B.login(p.phone);
      order.brincoNew = !existed;
      track('brinco_cuenta', { nueva: !existed });
    }
    if (p.via === 'brinco') order.brincoNew = S.bNew;
    // Historial del cliente: solo nombre del negocio y fecha
    if (B.session()) B.upsert(B.session().phone, (acc) => { if (acc) { acc.merchants = acc.merchants || []; acc.merchants.push({ name: 'PIEZZA', at: Date.now() }); } return acc; });
    const orders = store.get('pz_orders', []); orders.push(order); store.set('pz_orders', orders.slice(-300));
    track('compra', { total: order.total, metodo: order.via, orden: order.no });
    if (window.PZCart) window.PZCart.clear();
    S.form = null;
    // Flujo A: cuenta creada al pagar → ofrecemos Face ID / huella antes de la confirmación
    if (p.via === 'tarjeta' && p.save) offerPasskey(p.phone, () => VIEWS.done(order));
    else VIEWS.done(order);
  }

  VIEWS.done = function (o) {
    show('done', `<div class="co-view done" style="padding:0">
      <svg class="okmark" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="38"/><path d="M26 43l11 11 21-23"/></svg>
      <p class="h3">¡Pedido confirmado!</p>
      <span class="ordno">Orden ${o.no}</span>
      <span class="eta"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${o.mode === 'delivery' ? 'Llega en 35–45 min' : 'Lista para recoger en 20 min'}</span>
      <p class="muted">Te avisamos por WhatsApp al ${fmtPhone(o.phone)} en cada paso, con el link para seguirlo.</p>
      <a class="pay track-btn" href="/pedido/?o=${encodeURIComponent(o.no)}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>Seguir mi pedido</a>
      <div class="receipt">
        ${o.items.map((c) => `<div class="l" style="display:flex;justify-content:space-between;gap:8px"><span>${c.qty} × ${esc(c.name)}</span><span>${fmt(c.qty * c.unit)}</span></div>`).join('')}
        <div style="display:flex;justify-content:space-between;color:#6E625D"><span>${o.mode === 'delivery' ? 'Envío' : 'Recoger en tienda'}</span><span>${o.ship ? fmt(o.ship) : 'Gratis'}</span></div>
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:16px;border-top:1px solid #F0E6E2;padding-top:8px"><span>Total pagado</span><span>${fmt(o.total)}</span></div>
        <div style="color:#6E625D;font-size:13px">${o.via === 'brinco' ? 'Pagado con Brinco · ' : ''}${brandName(o.card.brand)} •••• ${o.card.last4} · Autorización ${o.auth}${o.address ? '<br>Entrega: ' + esc(o.address.street) + ', ' + esc(o.address.sector) : ''}</div>
      </div>
      ${o.brincoNew ? `<div class="brinco-ok"><span class="brinco-word" style="font-size:18px">brinco</span><br><b>Tu Cuenta Brinco quedó lista.</b> La próxima vez pagas con un toque aquí y en cualquier negocio Brinco.</div>` : ''}
      <button class="linkbtn" type="button" data-x>Seguir comprando</button>
      ${badgesHTML}</div>`, { root: true, replace: true, title: 'Listo', brinco: false });
    if (window.PZPill) window.PZPill();
    $('#coBack', root).hidden = true;
  };

  // ---------- Hoja Brinco ----------
  function startBrinco() {
    const me = B.me();
    if (me && me.cards && me.cards.length) { S.bNew = false; VIEWS.bSummary(); return; }
    // Sin sesión, pero este equipo tiene Face ID / huella: entra directo (se llama dentro del toque)
    const d = PK.can() ? PK.device() : null;
    if (d) { passkeyLogin(d); return; }
    VIEWS.bLogin();
  }

  VIEWS.bLogin = function (o) {
    o = o || {};
    const d = PK.can() ? PK.device() : null;
    show('bLogin', `
      <div class="center" style="display:flex;flex-direction:column;gap:6px;align-items:center">
        <span class="brinco-word" style="font-size:34px">brinco</span>
        <p class="h3">Paga con un toque</p>
        <p class="muted">${d ? 'Entra con ' + PK.t('enter').replace('Entrar con ', '') + ' o con tu número de WhatsApp.' : 'Entra con tu número de WhatsApp. Sin contraseñas: te mandamos un código.'}</p>
      </div>
      ${o.msg ? `<p class="pk-msg" role="status">${esc(o.msg)}</p>` : ''}
      ${d ? `<button class="pay blue" type="button" id="bPk">${pkIcon(22)}${PK.t('enter')}</button><div class="co-or">o con tu WhatsApp</div>` : ''}
      <div class="fld"><label for="bPhone">Número de WhatsApp</label><input id="bPhone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="809-555-1234" ${d ? '' : 'autofocus'}><span class="err">Escribe tu número de WhatsApp.</span></div>
      <button class="pay ${d ? 'ghost' : 'blue'}" type="button" id="bSend">Enviar código por WhatsApp</button>
      <p class="muted center" style="font-size:12px">Al continuar aceptas los Términos de la Cuenta Brinco y su Política de privacidad. Nunca usamos SMS.</p>`, { brinco: true, replace: o.replace });
    const ph = $('#bPhone', body);
    if (o.phone) ph.value = fmtPhone(o.phone);
    else if (S.form && S.form.coPhone) ph.value = S.form.coPhone;
    if (d) $('#bPk', body).addEventListener('click', () => passkeyLogin(d, true));
    ph.addEventListener('input', () => { ph.value = fmtPhone(ph.value); setErr('bPhone', false); });
    const go = () => {
      if (!validPhone(ph.value)) { setErr('bPhone', true); ph.focus(); return; }
      const phone = phoneDigits(ph.value);
      sendOtp(phone, () => {
        B.login(phone);
        const acc = B.accounts()[phone];
        if (acc && acc.cards && acc.cards.length) { S.bNew = false; offerPasskey(phone, () => VIEWS.bSummary({ root: true })); }
        else { S.bNew = !acc; VIEWS.bProfile(); }
      });
    };
    $('#bSend', body).addEventListener('click', go);
    ph.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  };

  VIEWS.bProfile = function () {
    const acc = B.me() || {}, f = S.form || {};
    const a0 = (acc.addresses || [])[0] || {};
    show('bProfile', `
      <p class="h3">Crea tu Cuenta Brinco</p>
      <p class="muted">Una sola vez. Después pagas con un toque en cualquier negocio Brinco.</p>
      <div class="fld"><label for="bName">Nombre</label><input id="bName" autocomplete="name" value="${esc(acc.name || f.coName || '')}" autofocus><span class="err">Escribe tu nombre.</span></div>
      <div class="fld"><label for="bEmail">Correo <span style="color:#8A7D78;font-weight:400">(opcional)</span></label><input id="bEmail" type="email" autocomplete="email" value="${esc(acc.email || '')}"><span class="err">Correo no válido.</span></div>
      <div class="co-sec"><h3 style="color:#1F4FFF">Dirección de entrega</h3>
        <div class="seg" role="group" aria-label="Etiqueta"><button type="button" data-lbl="Casa" aria-pressed="true">Casa</button><button type="button" data-lbl="Trabajo" aria-pressed="false">Trabajo</button></div>
        <div class="fld"><label for="bStreet">Dirección</label><input id="bStreet" autocomplete="street-address" value="${esc(a0.street || f.coStreet || '')}" placeholder="Calle, número, edificio, apto."><span class="err">Escribe la dirección.</span></div>
        <div class="row2">
          <div class="fld"><label for="bSector">Sector</label><select id="bSector"><option value="">Escoge…</option>${SECTORES.map((s) => `<option ${s === (a0.sector || f.coSector) ? 'selected' : ''}>${s}</option>`).join('')}</select><span class="err">Escoge el sector.</span></div>
          <div class="fld"><label for="bRef">Referencia</label><input id="bRef" value="${esc(a0.ref || f.coRef || '')}" placeholder="Frente a…"><span class="err"></span></div>
        </div>
      </div>
      <label class="chk"><input type="checkbox" id="bConsent"><span>Guardar mis datos en <span class="brinco-word">brinco</span> para pagar con un toque en cualquier negocio Brinco<small>Puedes borrarlos cuando quieras desde Mi cuenta.</small></span></label>
      <p class="muted" id="bConsentErr" style="color:#C62828;font-size:13px" hidden>Marca la casilla para crear tu cuenta.</p>
      <button class="pay blue" type="button" id="bNext">Continuar</button>`, { brinco: true });
    let lbl = 'Casa';
    $$('[data-lbl]', body).forEach((b) => b.addEventListener('click', () => { lbl = b.dataset.lbl; $$('[data-lbl]', body).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
    $('#bNext', body).addEventListener('click', () => {
      const name = $('#bName', body).value.trim(), email = $('#bEmail', body).value.trim();
      const street = $('#bStreet', body).value.trim(), sector = $('#bSector', body).value, ref = $('#bRef', body).value.trim();
      let ok = true;
      if (name.length < 2) { setErr('bName', true); ok = false; }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('bEmail', true); ok = false; }
      if (street.length < 4) { setErr('bStreet', true); ok = false; }
      if (!sector) { setErr('bSector', true); ok = false; }
      const c = $('#bConsent', body).checked; $('#bConsentErr', body).hidden = c;
      if (!ok || !c) return;
      const phone = B.session().phone;
      B.upsert(phone, (acc) => {
        acc = acc || { phone, addresses: [], cards: [], createdAt: Date.now(), merchants: [] };
        acc.name = name; acc.email = email;
        if (!acc.consents || !acc.consents.some((x) => x.type === 'cuenta')) B.consent(acc, 'cuenta', 'Guardar mis datos en Brinco para pagar con un toque en cualquier negocio Brinco');
        if (!acc.addresses.some((a) => a.street === street)) acc.addresses.push({ id: Date.now(), label: lbl, street, sector, ref, main: !acc.addresses.length });
        return acc;
      });
      track('brinco_cuenta', { nueva: true });
      VIEWS.bCard();
    });
  };

  VIEWS.bCard = function () {
    show('bCard', `
      <p class="h3">Agrega tu tarjeta</p>
      <p class="muted">La tarjeta va directo a AZUL. Brinco solo guarda un token con la marca y los últimos 4 dígitos.</p>
      ${azulHTML('b')}
      <label class="chk"><input type="checkbox" id="bCardConsent"><span>Guardar esta tarjeta para mis compras en negocios Brinco<small>Brinco no ve el número; lo guarda AZUL.</small></span></label>
      <p class="muted" id="bCardErr" style="color:#C62828;font-size:13px" hidden>Marca la casilla para guardar la tarjeta.</p>
      <button class="pay blue" type="button" id="bSaveCard">Guardar tarjeta</button>
      ${testNote}${badgesHTML}`, { brinco: true });
    bindAzul('b');
    $('#bSaveCard', body).addEventListener('click', () => {
      const card = readAzul('b');
      const c = $('#bCardConsent', body).checked; $('#bCardErr', body).hidden = c;
      if (!card || !c) return;
      const logo = card.brand === 'mastercard' ? '/images/pagos/mastercard-id-check.webp' : '/images/pagos/visa-secure.webp';
      show('verify', `<div class="co-view verify" style="padding:0"><img class="logo3ds" src="${logo}" alt=""><p class="h3">Verificando tu tarjeta</p><p class="muted">${brandName(card.brand)} •••• ${card.last4}</p><div class="spin"></div></div>`, { replace: true, brinco: true });
      $('#coBack', root).hidden = true;
      setTimeout(() => {
        B.upsert(B.session().phone, (acc) => {
          B.consent(acc, 'guardar_tarjeta', 'Guardar esta tarjeta para mis compras en negocios Brinco. Brinco no ve el número; lo guarda AZUL.');
          acc.cards.forEach((x) => { x.main = false; });
          acc.cards.push({ id: Date.now(), brand: card.brand, last4: card.last4, exp: card.exp, processor: 'azul', main: true, declineCode: card.declineCode });
          return acc;
        });
        track('brinco_tarjeta');
        // Flujo B: cuenta lista → ofrecemos Face ID / huella y seguimos al resumen
        offerPasskey(B.session().phone, () => VIEWS.bSummary({ root: true }));
      }, 1600);
    });
  };

  VIEWS.bSummary = function (o) {
    o = o || {};
    const me = B.me();
    if (!me) { VIEWS.bLogin(); return; }
    const addrs = me.addresses || [], cards = me.cards || [];
    if (S.bAddr == null || (S.bAddr !== 'pickup' && !addrs.some((a) => a.id === S.bAddr))) S.bAddr = (addrs.find((a) => a.main) || addrs[0] || {}).id || 'pickup';
    if (S.bCard == null || !cards.some((c) => c.id === S.bCard)) S.bCard = (cards.find((c) => c.main) || cards[0] || {}).id;
    const mode = S.bAddr === 'pickup' ? 'pickup' : 'delivery';
    const first = (me.name || '').split(' ')[0] || 'de nuevo';
    const pkd = PK.can() ? PK.device() : null;
    const pk = pkd && pkd.phone === me.phone ? pkd : null;
    show('bSummary', `
      <div class="hello"><span class="avatar">${esc((me.name || 'B').trim().charAt(0).toUpperCase())}</span><div><p class="h3" style="font-size:24px">Hola, ${esc(first)}</p><p class="muted">${fmtPhone(me.phone)}${pk ? ` <span class="pk-tag">${pkIcon(14)}${PK.t('name')}</span>` : ''}</p></div></div>
      ${o.error ? `<div class="azul-err" role="alert">${esc(o.error)}</div>` : ''}
      <div class="co-sec"><h3 style="color:#1F4FFF">Entrega</h3>
        ${addrs.map((a) => `<button type="button" class="opt" role="radio" data-addr="${a.id}" aria-checked="${S.bAddr === a.id}"><span class="dot"></span><span class="tx"><b>${esc(a.label || 'Casa')} · Delivery ${fmt(SHIP)}</b><span>${esc(a.street)}, ${esc(a.sector)}</span></span></button>`).join('')}
        <button type="button" class="opt" role="radio" data-addr="pickup" aria-checked="${S.bAddr === 'pickup'}"><span class="dot"></span><span class="tx"><b>Recoger en tienda · Gratis</b><span>Lista en 20 min</span></span></button>
      </div>
      <div class="co-sec"><h3 style="color:#1F4FFF">Tarjeta</h3>
        ${cards.map((c) => `<button type="button" class="opt" role="radio" data-card="${c.id}" aria-checked="${S.bCard === c.id}"><span class="dot"></span>${BRAND_IMG[c.brand] ? `<img src="${BRAND_IMG[c.brand]}" alt="">` : ''}<span class="tx"><b>${brandName(c.brand)} •••• ${c.last4}</b><span>Vence ${esc(c.exp)}${c.main ? ' · principal' : ''}</span></span></button>`).join('')}
        <button class="linkbtn" type="button" id="bAddCard" style="align-self:flex-start;padding:6px 0">+ Agregar otra tarjeta</button>
      </div>
      ${!pk ? '<div id="pkSlot"></div>' : ''}
      ${sumHTML(mode)}
      <button class="pay blue" type="button" id="bConfirm">${pk ? pkIcon(20) : ''}Confirmar y pagar ${fmt(totals(mode).total)}</button>
      ${testNote}
      <button class="linkbtn" type="button" id="bOut">¿No eres ${esc(first)}? Cerrar sesión</button>`, { brinco: true, root: o.root, replace: o.replace });
    $$('[data-addr]', body).forEach((b) => b.addEventListener('click', () => { S.bAddr = b.dataset.addr === 'pickup' ? 'pickup' : +b.dataset.addr; VIEWS.bSummary({ replace: true }); }));
    $$('[data-card]', body).forEach((b) => b.addEventListener('click', () => { S.bCard = +b.dataset.card; VIEWS.bSummary({ replace: true }); }));
    $('#bAddCard', body).addEventListener('click', () => VIEWS.bCard());
    // Sin Face ID en este equipo: ofrecer activarlo aquí mismo (o abrir en Safari si está dentro de Instagram)
    const slot = $('#pkSlot', body);
    if (slot) {
      if (INAPP && IOS) {
        slot.innerHTML = `<a class="pk-banner" href="${safariURL()}"><span class="pk-ico sm">${pkIcon(22)}</span><span class="tx"><b>Paga con Face ID</b><span>Abre PIEZZA en Safari para usar tu rostro</span></span><span class="go">Abrir</span></a>`;
      } else {
        PK.available().then((ok) => {
          if (!ok || S.view !== 'bSummary' || !document.body.contains(slot)) return;
          slot.innerHTML = `<button type="button" class="pk-banner" id="pkAct"><span class="pk-ico sm">${pkIcon(22)}</span><span class="tx"><b>${PK.t('on')}</b><span>Paga con ${PK.kind() === 'faceid' ? 'una mirada' : 'un toque'}, sin códigos</span></span><span class="go">Activar</span></button>`;
          $('#pkAct', slot).addEventListener('click', (ev) => {
            ev.currentTarget.disabled = true;
            PK.create(me.phone, me.name).then(() => {
              track('passkey_activada', { tipo: PK.kind(), desde: 'resumen' });
              toast(PK.t('ok'));
              VIEWS.bSummary({ replace: true });
            }, (err) => {
              track('passkey_fallo', { paso: 'activar', error: (err && err.name) || 'error' });
              toast('No se activó, puedes hacerlo luego');
              ev.currentTarget && (ev.currentTarget.disabled = false);
            });
          });
        });
      }
    }
    $('#bOut', body).addEventListener('click', () => { B.logout(); S.bAddr = S.bCard = null; VIEWS.checkout({ replace: true }); });
    let paying = false;
    $('#bConfirm', body).addEventListener('click', (e) => {
      if (paying) return;
      const card = cards.find((c) => c.id === S.bCard);
      const addr = addrs.find((a) => a.id === S.bAddr) || null;
      S.mode = mode;
      S.pendingPay = { via: 'brinco', name: me.name, phone: me.phone, mode, address: mode === 'delivery' ? addr : null,
        card: { brand: card.brand, last4: card.last4, exp: card.exp, declineCode: card.declineCode || null }, total: totals(mode).total };
      const pay = () => { track('pago_enviado', { total: S.pendingPay.total, metodo: 'brinco' }); processing(); };
      // Con Face ID / huella activo: se pide justo antes de cobrar (salvo que acabe de usarlo hace menos de 2 min)
      if (pk && !(S.pkAt && Date.now() - S.pkAt < 120000)) {
        paying = true;
        const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = pkIcon(20) + esc(PK.t('pay'));
        PK.get(pk).then(() => {
          track('passkey_login', { tipo: PK.kind(), paso: 'pago' });
          pay();
        }, (err) => {
          track('passkey_fallo', { paso: 'pago', error: (err && err.name) || 'error' });
          toast('Usa tu número de WhatsApp');
          sendOtp(me.phone, pay);
        });
        return;
      }
      pay();
    });
  };

  // ---------- Abrir / cerrar ----------
  let lastFocus = null;
  function open() {
    if (!window.PZCart || !window.PZCart.items().length) return;
    lastFocus = document.activeElement;
    window.PZCart.close();
    root.classList.add('open');
    document.body.style.overflow = 'hidden';
    track('checkout', { total: totals().total });
    S.hist = []; S.view = null;
    VIEWS.checkout({ replace: true });
  }
  function close() {
    root.classList.remove('open');
    document.body.style.overflow = '';
    hideWa();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  root.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) close(); });
  $('#coBack', root).addEventListener('click', back);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('open')) close(); });
  const go = document.getElementById('goCheckout');
  if (go) go.addEventListener('click', open);
  window.PZCheckout = { open, close };
})();
