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
  const fmtPhone = (s) => { const d = digits(s).slice(0, 10); return d.length > 6 ? d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6) : d.length > 3 ? d.slice(0, 3) + '-' + d.slice(3) : d; };
  const validPhone = (s) => /^(809|829|849)\d{7}$/.test(digits(s));
  const cardBrand = (n) => { const d = digits(n); if (/^4/.test(d)) return 'visa'; if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard'; if (/^3[47]/.test(d)) return 'amex'; return null; };
  const luhn = (n) => { const d = digits(n); if (d.length < 13) return false; let s = 0, alt = false; for (let i = d.length - 1; i >= 0; i--) { let x = +d[i]; if (alt) { x *= 2; if (x > 9) x -= 9; } s += x; alt = !alt; } return s % 10 === 0; };
  const brandName = (b) => ({ visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex' }[b] || 'Tarjeta');
  const authCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  // ---------- Cuentas Brinco (simuladas en este equipo) ----------
  const B = {
    accounts() { return store.get('brinco_accounts', {}); },
    save(a) { store.set('brinco_accounts', a); },
    session() { return store.get('brinco_session', null); },
    me() { const s = B.session(); if (!s) return null; return B.accounts()[s.phone] || null; },
    login(phone) { store.set('brinco_session', { phone: digits(phone), at: Date.now() }); },
    logout() { try { localStorage.removeItem('brinco_session'); } catch (e) {} },
    upsert(phone, fn) { const a = B.accounts(); const k = digits(phone); a[k] = fn(a[k] || null); B.save(a); return a[k]; },
    consent(acc, type, text) { (acc.consents = acc.consents || []).push({ type, text, at: new Date().toISOString(), channel: 'web', v: '2026-10' }); }
  };

  // ---------- Estado de la caja ----------
  const S = { mode: 'delivery', view: 'checkout', hist: [], pendingPay: null, otpCode: '', otpPhone: '', otpNext: null,
    bAddr: null, bCard: null, bNew: false };

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
      <button class="brinco-btn" type="button" id="bPayBtn">Pagar con <span class="bw">brinco</span>${card ? `<span class="card">· ${brandName(card.brand)} •••• ${card.last4}</span>` : ''}</button>
      <div class="co-or">o paga con tarjeta</div>
      <div class="co-sec"><h3>¿Cómo lo quieres?</h3>
        <div class="seg" role="group" aria-label="Entrega">
          <button type="button" data-mode="delivery" aria-pressed="${S.mode === 'delivery'}">Delivery<small>+${fmt(SHIP)} · 35–45 min</small></button>
          <button type="button" data-mode="pickup" aria-pressed="${S.mode === 'pickup'}">Recoger en tienda<small>Gratis · 20 min</small></button>
        </div></div>
      <div class="co-sec"><h3>Tus datos</h3>
        <div class="fld"><label for="coName">Nombre</label><input id="coName" autocomplete="name" placeholder="Tu nombre"><span class="err">Escribe tu nombre.</span></div>
        <div class="fld"><label for="coPhone">WhatsApp</label><input id="coPhone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="809-555-1234"><span class="err">Número dominicano de 10 dígitos (809, 829 o 849).</span></div>
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
    S.pendingPay = { via: 'tarjeta', name, phone: digits(phone), mode: S.mode, address: S.mode === 'delivery' ? { street, sector, ref, label: 'Casa' } : null, card, save, total: t.total };
    track('pago_enviado', { total: t.total, metodo: 'tarjeta', guardar: save });
    if (save) {
      // Cuenta Brinco nueva al pagar (flujo A): primero confirmamos el WhatsApp
      sendOtp(phone, () => verify3ds());
    } else verify3ds();
  }

  // --- Código por WhatsApp (simulado: aparece como notificación) ---
  function sendOtp(phone, next, opts) {
    opts = opts || {};
    S.otpPhone = digits(phone);
    S.otpCode = String(Math.floor(100000 + Math.random() * 900000));
    S.otpNext = next;
    S.otpTries = 0;
    show('otp', `
      <div class="center" style="display:flex;flex-direction:column;gap:8px;align-items:center">
        <span class="brinco-word" style="font-size:28px">brinco</span>
        <p class="h3">Confirma tu WhatsApp</p>
        <p class="muted">Te enviamos un código de 6 dígitos al <b>${fmtPhone(S.otpPhone)}</b>.</p>
      </div>
      <div class="otp-boxes" id="otpBoxes">${'<input inputmode="numeric" maxlength="1" aria-label="Dígito">'.repeat(6)}</div>
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
      if (code === S.otpCode) { hideWa(); track('codigo_ok'); S.otpNext && S.otpNext(); }
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
    VIEWS.done(order);
  }

  VIEWS.done = function (o) {
    show('done', `<div class="co-view done" style="padding:0">
      <svg class="okmark" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="38"/><path d="M26 43l11 11 21-23"/></svg>
      <p class="h3">¡Pedido confirmado!</p>
      <span class="ordno">Orden ${o.no}</span>
      <span class="eta"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${o.mode === 'delivery' ? 'Llega en 35–45 min' : 'Lista para recoger en 20 min'}</span>
      <p class="muted">Te escribimos por WhatsApp al ${fmtPhone(o.phone)} cuando salga del horno.</p>
      <div class="receipt">
        ${o.items.map((c) => `<div class="l" style="display:flex;justify-content:space-between;gap:8px"><span>${c.qty} × ${esc(c.name)}</span><span>${fmt(c.qty * c.unit)}</span></div>`).join('')}
        <div style="display:flex;justify-content:space-between;color:#6E625D"><span>${o.mode === 'delivery' ? 'Envío' : 'Recoger en tienda'}</span><span>${o.ship ? fmt(o.ship) : 'Gratis'}</span></div>
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:16px;border-top:1px solid #F0E6E2;padding-top:8px"><span>Total pagado</span><span>${fmt(o.total)}</span></div>
        <div style="color:#6E625D;font-size:13px">${o.via === 'brinco' ? 'Pagado con Brinco · ' : ''}${brandName(o.card.brand)} •••• ${o.card.last4} · Autorización ${o.auth}${o.address ? '<br>Entrega: ' + esc(o.address.street) + ', ' + esc(o.address.sector) : ''}</div>
      </div>
      ${o.brincoNew ? `<div class="brinco-ok"><span class="brinco-word" style="font-size:18px">brinco</span><br><b>Tu Cuenta Brinco quedó lista.</b> La próxima vez pagas con un toque aquí y en cualquier negocio Brinco.</div>` : ''}
      <button class="pay" type="button" data-x>Seguir comprando</button>
      ${badgesHTML}</div>`, { root: true, replace: true, title: 'Listo', brinco: false });
    $('#coBack', root).hidden = true;
  };

  // ---------- Hoja Brinco ----------
  function startBrinco() {
    const me = B.me();
    if (me && me.cards && me.cards.length && (me.addresses.length || true)) { S.bNew = false; VIEWS.bSummary(); }
    else VIEWS.bLogin();
  }

  VIEWS.bLogin = function () {
    show('bLogin', `
      <div class="center" style="display:flex;flex-direction:column;gap:6px;align-items:center">
        <span class="brinco-word" style="font-size:34px">brinco</span>
        <p class="h3">Paga con un toque</p>
        <p class="muted">Entra con tu número de WhatsApp. Sin contraseñas: te mandamos un código.</p>
      </div>
      <div class="fld"><label for="bPhone">Número de WhatsApp</label><input id="bPhone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="809-555-1234" autofocus><span class="err">Número dominicano de 10 dígitos (809, 829 o 849).</span></div>
      <button class="pay blue" type="button" id="bSend">Enviar código por WhatsApp</button>
      <p class="muted center" style="font-size:12px">Al continuar aceptas los Términos de la Cuenta Brinco y su Política de privacidad. Nunca usamos SMS.</p>`, { brinco: true });
    const ph = $('#bPhone', body);
    if (S.form && S.form.coPhone) ph.value = S.form.coPhone;
    ph.addEventListener('input', () => { ph.value = fmtPhone(ph.value); setErr('bPhone', false); });
    const go = () => {
      if (!validPhone(ph.value)) { setErr('bPhone', true); ph.focus(); return; }
      const phone = digits(ph.value);
      sendOtp(phone, () => {
        B.login(phone);
        const acc = B.accounts()[phone];
        if (acc && acc.cards && acc.cards.length) { S.bNew = false; VIEWS.bSummary({ root: true }); }
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
        VIEWS.bSummary({ root: true });
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
    show('bSummary', `
      <div class="hello"><span class="avatar">${esc((me.name || 'B').trim().charAt(0).toUpperCase())}</span><div><p class="h3" style="font-size:24px">Hola, ${esc(first)}</p><p class="muted">${fmtPhone(me.phone)}</p></div></div>
      ${o.error ? `<div class="azul-err" role="alert">${esc(o.error)}</div>` : ''}
      <div class="co-sec"><h3 style="color:#1F4FFF">Entrega</h3>
        ${addrs.map((a) => `<button type="button" class="opt" role="radio" data-addr="${a.id}" aria-checked="${S.bAddr === a.id}"><span class="dot"></span><span class="tx"><b>${esc(a.label || 'Casa')} · Delivery ${fmt(SHIP)}</b><span>${esc(a.street)}, ${esc(a.sector)}</span></span></button>`).join('')}
        <button type="button" class="opt" role="radio" data-addr="pickup" aria-checked="${S.bAddr === 'pickup'}"><span class="dot"></span><span class="tx"><b>Recoger en tienda · Gratis</b><span>Lista en 20 min</span></span></button>
      </div>
      <div class="co-sec"><h3 style="color:#1F4FFF">Tarjeta</h3>
        ${cards.map((c) => `<button type="button" class="opt" role="radio" data-card="${c.id}" aria-checked="${S.bCard === c.id}"><span class="dot"></span>${BRAND_IMG[c.brand] ? `<img src="${BRAND_IMG[c.brand]}" alt="">` : ''}<span class="tx"><b>${brandName(c.brand)} •••• ${c.last4}</b><span>Vence ${esc(c.exp)}${c.main ? ' · principal' : ''}</span></span></button>`).join('')}
        <button class="linkbtn" type="button" id="bAddCard" style="align-self:flex-start;padding:6px 0">+ Agregar otra tarjeta</button>
      </div>
      ${sumHTML(mode)}
      <button class="pay blue" type="button" id="bConfirm">Confirmar y pagar ${fmt(totals(mode).total)}</button>
      ${testNote}
      <button class="linkbtn" type="button" id="bOut">¿No eres ${esc(first)}? Cerrar sesión</button>`, { brinco: true, root: o.root, replace: o.replace });
    $$('[data-addr]', body).forEach((b) => b.addEventListener('click', () => { S.bAddr = b.dataset.addr === 'pickup' ? 'pickup' : +b.dataset.addr; VIEWS.bSummary({ replace: true }); }));
    $$('[data-card]', body).forEach((b) => b.addEventListener('click', () => { S.bCard = +b.dataset.card; VIEWS.bSummary({ replace: true }); }));
    $('#bAddCard', body).addEventListener('click', () => VIEWS.bCard());
    $('#bOut', body).addEventListener('click', () => { B.logout(); S.bAddr = S.bCard = null; VIEWS.checkout({ replace: true }); });
    $('#bConfirm', body).addEventListener('click', () => {
      const card = cards.find((c) => c.id === S.bCard);
      const addr = addrs.find((a) => a.id === S.bAddr) || null;
      S.mode = mode;
      S.pendingPay = { via: 'brinco', name: me.name, phone: me.phone, mode, address: mode === 'delivery' ? addr : null,
        card: { brand: card.brand, last4: card.last4, exp: card.exp, declineCode: card.declineCode || null }, total: totals(mode).total };
      track('pago_enviado', { total: S.pendingPay.total, metodo: 'brinco' });
      processing();
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
