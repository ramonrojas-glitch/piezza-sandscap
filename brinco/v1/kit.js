/*! Brinco Kit v1 · Sandscap · 2026-10-14T17:41Z */
(function () {
'use strict';

/* --- src/core/00-base.js --- */
/* ===== Brinco Kit · base: namespace, helpers ===== */
const VERSION = '1.0.0';
const SCRIPT = document.currentScript || (function () {
  const s = document.querySelectorAll('script[src*="kit.js"]'); return s[s.length - 1] || null;
})();
// Base del kit (para imágenes): carpeta de kit.js, sin "/" final
const KIT_BASE = (function () {
  try { const u = new URL(SCRIPT.src, location.href); return u.href.replace(/\/[^\/]*$/, ''); } catch (e) { return ''; }
})();
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const digits = (s) => String(s || '').replace(/\D/g, '');
const hhmm = (t) => { const d = new Date(t); return d.toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' }); };
// Acepta el número como lo escriban (con o sin +1, guiones o espacios)
const phoneDigits = (s) => { let d = digits(s); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.slice(0, 15); };
const fmtPhone = (s) => { const d = phoneDigits(s); if (d.length > 10) return d; return d.length > 6 ? d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6) : d.length > 3 ? d.slice(0, 3) + '-' + d.slice(3) : d; };
const validPhone = (s) => phoneDigits(s).length >= 7;

const Brinco = window.Brinco = window.Brinco && window.Brinco._kit ? window.Brinco : {};
Brinco._kit = true;
Brinco.version = VERSION;
Brinco._base = KIT_BASE;
Brinco._script = SCRIPT;
Brinco._esc = esc;
Brinco._hhmm = hhmm;
Brinco._phone = { digits: phoneDigits, fmt: fmtPhone, valid: validPhone };
Brinco._$ = $;
Brinco._$$ = $$;
Brinco._img = (name) => KIT_BASE + '/img/' + name;

/* --- src/core/10-store.js --- */
/* ===== Brinco Kit · almacenamiento local + migración de las claves viejas de PIEZZA ===== */
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
Brinco._store = store;

// Una sola vez por sitio: pz_events → brinco_events, pz_orders → brinco_orders, pz_src → brinco_src.
// Se fusionan sin duplicar; las claves viejas se dejan (no se borran) por si algo las lee todavía.
(function migrate() {
  if (store.get('brinco_migrated', 0)) return;
  try {
    // pz_* (PIEZZA), hm_* (HUMO) y cualquier otro prefijo corto de los checkouts viejos
    const pre = {};
    for (let i = 0; i < localStorage.length; i++) { const m = /^([a-z]{2,3})_(events|orders|src)$/.exec(localStorage.key(i) || ''); if (m && m[1] !== 'bk') pre[m[1]] = 1; }
    Object.keys(pre).forEach((p) => {
      const pe = store.get(p + '_events', null);
      if (pe && pe.length) {
        const ne = store.get('brinco_events', []);
        const seen = {}; ne.forEach((e) => { seen[e.e + e.t] = 1; });
        store.set('brinco_events', pe.filter((e) => e && !seen[e.e + e.t]).concat(ne).sort((a, b) => a.t - b.t).slice(-2000));
      }
      const po = store.get(p + '_orders', null);
      if (po && po.length) {
        const no = store.get('brinco_orders', []);
        const seen = {}; no.forEach((o) => { seen[o.no] = 1; });
        store.set('brinco_orders', po.filter((o) => o && !seen[o.no]).concat(no).sort((a, b) => a.at - b.at).slice(-300));
      }
      const ps = store.get(p + '_src', null);
      if (ps && !store.get('brinco_src', null)) store.set('brinco_src', ps);
    });
  } catch (e) {}
  store.set('brinco_migrated', Date.now());
})();

/* --- src/core/20-i18n.js --- */
/* ===== Brinco Kit · textos (un solo objeto; "es" completo, "en" parcial con respaldo en español) ===== */
const STR = {
  es: {
    title: 'Finalizar pedido', back: 'Volver', close: 'Cerrar', with: 'con',
    payBrinco: 'Pagar con', orCard: 'o paga con tarjeta', howTitle: '¿Cómo lo quieres?', delivery: 'Delivery', pickup: 'Recoger en tienda',
    free: 'Gratis', min: 'min', yourData: 'Tus datos', name: 'Nombre', namePh: 'Tu nombre', nameErr: 'Escribe tu nombre.',
    wa: 'WhatsApp', waErr: 'Escribe tu número de WhatsApp.', street: 'Dirección', streetPh: 'Calle, número, edificio, apto.', streetErr: 'Escribe la dirección.',
    sector: 'Sector', choose: 'Escoge…', sectorErr: 'Escoge el sector.', ref: 'Referencia', refPh: 'Frente a…', payment: 'Pago',
    saveBrinco: 'Guardar mis datos y mi tarjeta en {brinco} para pagar con un toque en cualquier negocio Brinco',
    saveBrincoSmall: 'Te enviamos un código por WhatsApp para confirmar. Brinco no guarda tu tarjeta: la guarda tu procesador de pago (AZUL, CardNet o MIO).',
    pay: 'Pagar', subtotal: 'Subtotal', ship: 'Envío', total: 'Total', itbis: 'ITBIS incluido', coupon: 'Cupón',
    testMode: 'Ambiente de pruebas de AZUL · no se realiza ningún cargo real',
    azulTop: 'Campos seguros de', azulSec: 'Cifrado TLS · PCI DSS', cardNum: 'Número de tarjeta', cardNumErr: 'Revisa el número de la tarjeta.',
    exp: 'Vence (MM/AA)', expErr: 'Fecha no válida.', cvv: 'CVV', cvvErr: '3 o 4 dígitos.', holder: 'Nombre en la tarjeta', holderPh: 'Como aparece en la tarjeta', holderErr: 'Escribe el nombre.',
    testCards: 'Tarjetas de prueba:', approved: 'aprobada', declined: 'rechazada',
    otpTitle: 'Confirma tu WhatsApp', otpSent: 'Te enviamos un código de 6 dígitos al {phone}.', otpGo: 'Confirmar código', otpAgain: 'Enviar otro código',
    otpBad: 'Código incorrecto. Revisa el mensaje de WhatsApp.', otpMany: 'Demasiados intentos. Pide otro código.',
    otpMsg: 'Tu código de Brinco es {code}. Vence en 10 minutos. No lo compartas con nadie.', now: 'ahora',
    verifyBank: 'Verificando con tu banco', noClose: 'No cierres esta ventana.', processing: 'Procesando tu pago', verifyCard: 'Verificando tu tarjeta',
    done: '¡Pedido confirmado!', order: 'Orden', arrives: 'Llega en {a}–{b} min', ready: 'Listo para recoger en {a} min',
    doneWa: 'Te avisamos por WhatsApp al {phone} en cada paso, con el link para seguirlo.', follow: 'Seguir mi pedido',
    paid: 'Total pagado', paidBrinco: 'Pagado con Brinco · ', auth: 'Autorización', deliverTo: 'Entrega', keepShopping: 'Seguir comprando',
    brincoReady: 'Tu Cuenta Brinco quedó lista.', brincoReadyTx: 'La próxima vez pagas con un toque aquí y en cualquier negocio Brinco. Tu tarjeta no la guarda Brinco: queda protegida por tu procesador de pago.',
    doneTitle: 'Listo',
    bTagline: 'Paga con un toque', bLoginTx: 'Entra con tu número de WhatsApp. Sin contraseñas: te mandamos un código.', bLoginPk: 'Entra con {x} o con tu número de WhatsApp.',
    orWa: 'o con tu WhatsApp', waNumber: 'Número de WhatsApp', sendCode: 'Enviar código por WhatsApp',
    bTerms: 'Al continuar aceptas los Términos de la Cuenta Brinco y su Política de privacidad. Nunca usamos SMS.',
    bCreate: 'Crea tu Cuenta Brinco', bCreateTx: 'Una sola vez. Después pagas con un toque en cualquier negocio Brinco.',
    email: 'Correo', optional: '(opcional)', emailErr: 'Correo no válido.', addrTitle: 'Dirección de entrega', home: 'Casa', work: 'Trabajo',
    consent: 'Guardar mis datos en {brinco} para pagar con un toque en cualquier negocio Brinco', consentSmall: 'Puedes borrarlos cuando quieras desde Mi cuenta.',
    consentErr: 'Marca la casilla para crear tu cuenta.', continue: 'Continuar',
    addCard: 'Agrega tu tarjeta', cardConsent: 'Guardar esta tarjeta para mis compras en negocios Brinco', cardConsentSmall: 'Brinco no guarda tu tarjeta: la guarda tu procesador de pago (AZUL, CardNet o MIO).',
    cardConsentErr: 'Marca la casilla para guardar la tarjeta.', saveCard: 'Guardar tarjeta',
    hello: 'Hola, {name}', again: 'de nuevo', delivTitle: 'Entrega', cardTitle: 'Tarjeta', readyIn: 'Lista en {a} min', expires: 'Vence {exp}', main: 'principal',
    addOther: '+ Agregar otra tarjeta', confirmPay: 'Confirmar y pagar {total}', notYou: '¿No eres {name}? Cerrar sesión',
    pkPoints1: 'Entras y pagas en un segundo', pkPoints2: 'Sin códigos ni contraseñas', pkBio: 'Usa la huella o el rostro de tu celular. Tu biometría nunca sale de tu teléfono.',
    notNow: 'Ahora no', pkNext: 'La próxima vez entras y pagas con {x}.', aLook: 'una mirada', aTouch: 'un toque',
    pkConfirm: 'Confirma que eres tú', pkFail: 'No se activó, puedes hacerlo luego', useWa: 'Usa tu número de WhatsApp',
    pkBanner: 'Paga con {x}, sin códigos', activate: 'Activar', safariT: 'Paga con Face ID', safariTx: 'Abre {n} en Safari para usar tu rostro', open: 'Abrir',
    vaultLine: 'Brinco <b>no guarda</b> tu tarjeta. La protegen <b>AZUL</b>, <b>CardNet</b> o <b>MIO</b>.',
    vaultT: 'Brinco no guarda tu tarjeta', vaultTx: 'Tu tarjeta queda guardada y protegida por el procesador de pago certificado PCI DSS. Brinco solo recibe un código seguro (token) que no sirve fuera de tu cuenta.',
    vaultFooter: '<b>Brinco no guarda tarjetas.</b> Tus datos de pago quedan protegidos por el procesador certificado PCI DSS: <b>AZUL</b>, <b>CardNet</b> o <b>MIO</b>.',
    d51: 'Fondos insuficientes. Intenta con otra tarjeta.', d05: 'El banco no autorizó la transacción. Contacta a tu banco o usa otra tarjeta.', d54: 'La tarjeta está vencida.',
    code: 'código', emptyCart: 'Tu carrito está vacío.', defaultClient: 'Cliente'
  },
  en: {
    title: 'Checkout', back: 'Back', close: 'Close', with: 'with', payBrinco: 'Pay with', orCard: 'or pay by card', howTitle: 'How do you want it?',
    pickup: 'Store pickup', free: 'Free', yourData: 'Your details', name: 'Name', namePh: 'Your name', street: 'Address', payment: 'Payment',
    pay: 'Pay', ship: 'Delivery', itbis: 'Taxes included', done: 'Order confirmed!', order: 'Order', follow: 'Track my order', keepShopping: 'Keep shopping',
    arrives: 'Arrives in {a}–{b} min', ready: 'Ready for pickup in {a} min', paid: 'Total paid', doneTitle: 'Done'
  }
};
let LANG = 'es';
function t(k, v) {
  let s = (STR[LANG] && STR[LANG][k]) || STR.es[k] || k;
  if (v) Object.keys(v).forEach((x) => { s = s.split('{' + x + '}').join(v[x]); });
  return s;
}
function setLang(l) { LANG = STR[l] ? l : 'es'; }
Brinco.setLang = setLang;
Brinco._t = t;
Brinco._strings = STR;
Brinco.fmt = function (n) { return ((Brinco.config && Brinco.config.moneda) || 'RD$') + ' ' + Math.round(Number(n) || 0).toLocaleString('es-DO'); };
const fmt = (n) => Brinco.fmt(n);

/* --- src/core/30-config.js --- */
/* ===== Brinco Kit · configuración (defaults + /brinco.json) ===== */
const DEFAULTS = {
  negocio: 'tienda',
  nombre: 'Tienda',
  nombreLegal: '',
  dominio: location.hostname,
  logo: '',
  logoBlanco: '',
  favicon: '',
  color: '#1F4FFF',
  colorTexto: '#241A17',
  colorFondo: '#FFFFFF',
  fuenteTitulos: '',
  fuenteTexto: '',
  googleFonts: '',
  prefijoOrden: 'BR',
  moneda: 'RD$',
  envio: 150,
  entrega: { delivery: true, pickup: true, deliveryMin: 35, deliveryMax: 45, pickupMin: 20 },
  sectores: ['Piantini', 'Naco', 'Evaristo Morales', 'Serrallés', 'Bella Vista', 'Los Cacicazgos', 'Mirador Sur',
    'Gazcue', 'Zona Colonial', 'Arroyo Hondo', 'Los Prados', 'Ensanche Julieta', 'La Esperilla', 'Paraíso', 'Renacimiento'],
  tienda: { direccion: 'Santo Domingo', ciudad: 'Santo Domingo', mapa: '' },
  producto: { singular: 'pedido', plural: 'pedidos' },
  etapas: {},
  cupon: null,
  contacto: { direccion: '[Dirección del local]', telefono: '[Teléfono / WhatsApp]', correo: '[Correo]', instagram: '[@usuario]' },
  idioma: 'es'
};
function deepMerge(a, b) {
  const o = Array.isArray(a) ? a.slice() : Object.assign({}, a);
  Object.keys(b || {}).forEach((k) => {
    const v = b[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && a && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) o[k] = deepMerge(a[k], v);
    else if (v !== undefined) o[k] = v;
  });
  return o;
}
Brinco.config = deepMerge(DEFAULTS, {});
const C = () => Brinco.config;

// Ruta del config: data-config en el <script> del kit, o /brinco.json del mismo sitio
function configURL() { return (SCRIPT && SCRIPT.getAttribute('data-config')) || '/brinco.json'; }
function loadConfig() {
  if (window.BRINCO_CONFIG && typeof window.BRINCO_CONFIG === 'object') return Promise.resolve(window.BRINCO_CONFIG);
  return fetch(configURL(), { cache: 'no-cache', credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
}
function applyConfig(c) {
  const r = document.documentElement.style;
  r.setProperty('--bk-brand', c.color);
  r.setProperty('--bk-ink', c.colorTexto);
  r.setProperty('--bk-bg', c.colorFondo);
  if (c.fuenteTitulos) r.setProperty('--bk-font-title', `"${c.fuenteTitulos}", Georgia, serif`);
  if (c.fuenteTexto) r.setProperty('--bk-font-body', `"${c.fuenteTexto}", system-ui, sans-serif`);
  if (c.googleFonts && !document.querySelector('link[data-bk-fonts]')) {
    const already = $$('link[rel="stylesheet"]').some((l) => l.href === c.googleFonts);
    if (!already) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = c.googleFonts; l.setAttribute('data-bk-fonts', '');
      document.head.appendChild(l);
    }
  }
  if (c.favicon && !document.querySelector('link[rel~="icon"]')) {
    const l = document.createElement('link'); l.rel = 'icon'; l.href = c.favicon; document.head.appendChild(l);
  }
  if (c.idioma && c.idioma !== 'es') setLang(c.idioma);
}

const READY = { done: false, q: [] };
Brinco.ready = function (fn) {
  if (typeof fn !== 'function') return;
  if (READY.done) { try { fn(Brinco.config); } catch (e) { console.error(e); } }
  else READY.q.push(fn);
};
function fireReady() {
  READY.done = true;
  const q = READY.q.splice(0);
  q.forEach((fn) => { try { fn(Brinco.config); } catch (e) { console.error(e); } });
}

/* --- src/core/40-track.js --- */
/* ===== Brinco Kit · origen de cada visita y eventos del embudo (visita → carrito → checkout → pago → compra) ===== */
const LINKS = {
  ig: { source: 'Instagram · bio', medium: 'organico' },
  ad: { source: 'Anuncio Meta', medium: 'pagado' },
  fb: { source: 'Facebook · perfil', medium: 'organico' },
  tt: { source: 'TikTok · bio', medium: 'organico' },
  wa: { source: 'WhatsApp', medium: 'organico' }
};
Brinco._links = LINKS;
const KEY_SRC = 'brinco_src', KEY_EV = 'brinco_events', KEY_SID = 'brinco_sid';
const SID = (function () {
  try {
    let s = sessionStorage.getItem(KEY_SID);
    if (!s) { s = Math.random().toString(36).slice(2, 10); sessionStorage.setItem(KEY_SID, s); return { id: s, fresh: true }; }
    return { id: s, fresh: false };
  } catch (e) { return { id: 'x', fresh: false }; }
})();

Brinco.source = function () {
  const s = store.get(KEY_SRC, null) || { key: 'directo', source: 'Directo', medium: 'organico' };
  return { key: s.key, source: s.source, medium: s.medium, at: s.at };
};
Brinco.track = function (name, data) {
  if (!name) return;
  let ev = store.get(KEY_EV, []);
  const o = Brinco.source();
  ev.push({ e: String(name), t: Date.now(), sid: SID.id, src: o.source, med: o.medium, d: data || null });
  if (ev.length > 2000) ev = ev.slice(-2000);
  store.set(KEY_EV, ev);
};
const track = (e, d) => Brinco.track(e, d);

// Lee el origen de la URL: ?src=ig (link corto), utm_* o fbclid/gclid
(function detectSource() {
  const isLinkPage = !!(SCRIPT && SCRIPT.getAttribute('data-link'));
  if (isLinkPage) return; // la página /ig/ (etc.) solo registra clic_link y redirige (módulo links)
  const isPanel = /^\/panel(\/|$)/.test(location.pathname) || !!document.querySelector('[data-brinco="panel"]');
  const q = new URLSearchParams(location.search);
  let src = null; const srcKey = q.get('src');
  if (srcKey && LINKS[srcKey]) src = { key: srcKey, source: LINKS[srcKey].source, medium: LINKS[srcKey].medium };
  else if (q.get('utm_source')) {
    const m = (q.get('utm_medium') || '').toLowerCase();
    src = { key: 'utm', source: q.get('utm_source') + (q.get('utm_campaign') ? ' · ' + q.get('utm_campaign') : ''),
      medium: /cpc|paid|ads?|pagad/.test(m) ? 'pagado' : 'organico' };
  }
  // fbclid solo confirma que vino de Meta; "pagado" lo define el link (/ad) o utm_medium de pago
  if (q.get('fbclid') && !src) src = { key: 'meta', source: 'Instagram/Facebook', medium: 'organico' };
  if (q.get('gclid')) src = { key: 'google', source: 'Anuncio Google', medium: 'pagado' };
  if (src) { src.at = Date.now(); store.set(KEY_SRC, src); }
  else if (SID.fresh && !store.get(KEY_SRC, null)) {
    let ref = '';
    try { ref = document.referrer && new URL(document.referrer).hostname !== location.hostname ? new URL(document.referrer).hostname : ''; } catch (e) {}
    store.set(KEY_SRC, { key: ref ? 'ref' : 'directo', source: ref || 'Directo', medium: 'organico', at: Date.now() });
  }
  // Limpia la URL para que se vea corta al compartir
  if (q.has('src') || q.has('fbclid')) {
    ['src', 'fbclid'].forEach((k) => q.delete(k));
    const clean = location.pathname + (q.toString() ? '?' + q : '') + location.hash;
    try { history.replaceState(history.state, '', clean); } catch (e) {}
  }
  if ((SID.fresh || src) && !isPanel) track('visita');
})();

/* --- src/core/50-orders.js --- */
/* ===== Brinco Kit · pedidos y su estado (demo: el tiempo corre acelerado para la presentación) ===== */
// Etiquetas por defecto; cada negocio las cambia en brinco.json → "etapas"
// Claves: recibido, preparando, coccion, camino, entregado, lista, recogido (+ "<clave>Texto" y "<clave>Wa")
function etapaDefaults() {
  const p = C().producto || {}, sing = p.singular || 'pedido';
  return {
    recibido: 'Pedido recibido', recibidoTexto: 'Ya lo tenemos. Lo estamos revisando.', recibidoWa: 'Recibimos tu pedido {no}. ¡Gracias!',
    preparando: 'Preparando tu ' + sing, preparandoTexto: 'Lo estamos preparando al momento, con cariño.', preparandoWa: 'Tu ' + sing + ' ya se está preparando 👨‍🍳',
    coccion: 'Casi listo', coccionTexto: 'Dando los últimos toques. Ya casi.', coccionWa: 'Tu ' + sing + ' está casi listo 🔥',
    camino: 'En camino', caminoTexto: 'Tu rider va directo a tu casa.', caminoWa: '¡Tu pedido va en camino! 🛵 Síguelo aquí: {dominio}/pedido',
    entregado: 'Entregado', entregadoTexto: '¡Buen provecho! Gracias por pedir directo.', entregadoWa: 'Pedido entregado. ¡Buen provecho! ❤️',
    lista: 'Listo para recoger', listaTexto: 'Te esperamos en la tienda. Di tu número de orden.', listaWa: '¡Tu pedido está listo para recoger! Orden {no}',
    recogido: 'Recogido', recogidoTexto: '¡Buen provecho! Gracias por pedir directo.', recogidoWa: 'Pedido recogido. ¡Buen provecho! ❤️'
  };
}
// Segundos (desde que se pagó) en que empieza cada etapa
const STAGE_T = { delivery: [0, 20, 45, 80, 170], pickup: [0, 20, 45, 80, 260] };
const STAGE_K = { delivery: ['recibido', 'preparando', 'coccion', 'camino', 'entregado'], pickup: ['recibido', 'preparando', 'coccion', 'lista', 'recogido'] };
const _stageCache = {};
function stages(o) {
  const mode = o && o.mode === 'pickup' ? 'pickup' : 'delivery';
  const e = Object.assign(etapaDefaults(), C().etapas || {});
  const key = mode + JSON.stringify(e);
  if (_stageCache[key]) return _stageCache[key];
  const fill = (s) => String(s || '').replace('{dominio}', C().dominio || location.hostname);
  return (_stageCache[key] = STAGE_K[mode].map((k, i) => ({ k, t: STAGE_T[mode][i], label: e[k], txt: e[k + 'Texto'], wa: fill(e[k + 'Wa']) })));
}
const RIDERS = [
  { name: 'Luis Martínez', moto: 'Honda roja · A845221', ini: 'LM' },
  { name: 'Yeison Peña', moto: 'Yamaha negra · K301774', ini: 'YP' },
  { name: 'Carlos Abreu', moto: 'Suzuki roja · N552390', ini: 'CA' }
];
function orderStatus(o, now) {
  const st = stages(o);
  const el = Math.max(0, ((now || Date.now()) - o.at) / 1000);
  let i = 0; st.forEach((s, j) => { if (el >= s.t) i = j; });
  const cur = st[i], nxt = st[i + 1];
  const p = nxt ? Math.min(1, (el - cur.t) / (nxt.t - cur.t)) : 1;
  return { i, stage: cur, stages: st, part: p, done: !nxt, total: (i + p) / (st.length - 1) };
}
function allOrders() { return store.get('brinco_orders', []).slice().sort((a, b) => b.at - a.at); }
Brinco.orders = {
  all: allOrders,
  find(no) {
    no = String(no || '').trim().toUpperCase();
    const pre = String(C().prefijoOrden || '').toUpperCase();
    if (no && pre && /^\d+$/.test(no)) no = pre + '-' + no;
    return allOrders().find((o) => String(o.no).toUpperCase() === no) || null;
  },
  active() { return allOrders().find((o) => !orderStatus(o).done && Date.now() - o.at < 86400000) || null; },
  status: orderStatus,
  stages,
  rider(o) { let h = 0; String(o.no).split('').forEach((c) => { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return RIDERS[h % RIDERS.length]; },
  save(o) {
    const a = store.get('brinco_orders', []);
    const i = a.findIndex((x) => x.no === o.no);
    if (i >= 0) a[i] = o; else a.push(o);
    store.set('brinco_orders', a.slice(-300));
    return o;
  },
  newNo() {
    const pre = String(C().prefijoOrden || 'BR').toUpperCase();
    let no, n = 0;
    do { no = pre + '-' + String(Math.floor(10000 + Math.random() * 90000)); n++; } while (n < 20 && allOrders().some((o) => o.no === no));
    return no;
  }
};

/* --- src/core/60-ui.js --- */
/* ===== Brinco Kit · piezas de interfaz compartidas: íconos, aviso corto (toast), notificación de WhatsApp ===== */
const ICONS = {
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  x: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  lock: (s) => `<svg width="${s || 18}" height="${s || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
  clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  pin: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6z"/><rect x="9" y="11" width="6" height="5" rx="1"/><path d="M10.5 11V9.6a1.5 1.5 0 0 1 3 0V11"/></svg>',
  check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F4FFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  okmark: '<svg class="bk-okmark" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="38"/><path d="M26 43l11 11 21-23"/></svg>',
  whatsapp: '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.5 4c1.7.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z"/></svg>'
};
Brinco._icons = ICONS;
const bword = (size) => `<span class="bk-bword"${size ? ` style="font-size:${size}px"` : ''}>brinco</span>`;

// --- Aviso corto abajo (oculto con visibility cuando no se muestra) ---
let toastEl = null, toastTimer;
function toast(msg, ms) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'bk-toast';
    toastEl.setAttribute('role', 'status');
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  // reflow para reiniciar la transición si ya estaba visible
  void toastEl.offsetWidth;
  toastEl.classList.add('bk-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('bk-show'), ms || 3200);
}

// --- Notificación de WhatsApp simulada (arriba) ---
let waEl = null, waTimer;
function waEnsure() {
  if (waEl) return waEl;
  waEl = document.createElement('button');
  waEl.type = 'button';
  waEl.className = 'bk-wa';
  waEl.setAttribute('aria-live', 'polite');
  waEl.innerHTML = `<span class="bk-wa-ic">${ICONS.whatsapp}</span>
    <span class="bk-wa-main"><span class="bk-wa-tt"><b>WhatsApp · Brinco</b><span>${t('now')}</span></span><span class="bk-wa-bd" id="waText"></span></span>`;
  document.body.appendChild(waEl);
  return waEl;
}
function showWa(html, onClick, ms) {
  const w = waEnsure();
  $('#waText', w).innerHTML = html;
  w.onclick = onClick || null;
  w.classList.add('bk-show');
  clearTimeout(waTimer);
  waTimer = setTimeout(hideWa, ms || 12000);
}
function hideWa() { if (waEl) waEl.classList.remove('bk-show'); }

Brinco._ui = { toast, waNote: showWa, hideWa, bword, icons: ICONS, isOpen: () => false };

/* --- src/core/65-vault.js --- */
/* ===== Brinco Kit · aviso de confianza: Brinco no guarda tarjetas (las guarda AZUL, CardNet o MIO) ===== */
const PROCS = '<span class="bk-vault-procs" aria-label="Procesadores: AZUL, CardNet y MIO"><i>AZUL</i><i>CardNet</i><i>MIO</i></span>';
function vaultHTML(compact) {
  if (compact) return `<p class="bk-vault-line">${ICONS.shield}<span>${t('vaultLine')}</span></p>`;
  return `<div class="bk-vault"><span class="bk-vault-ic">${ICONS.shield}</span><div class="bk-vault-tx"><b>${t('vaultT')}</b><span>${t('vaultTx')}</span>${PROCS}</div></div>`;
}
function vaultFooterHTML() {
  return `<span class="bk-fvault">${ICONS.shield.replace('width="18" height="18"', 'width="16" height="16"')}<span>${t('vaultFooter')}</span></span>`;
}
function fillVaultFooters(root) {
  $$('[data-brinco="vault-footer"]', root).forEach((el) => {
    if (el.getAttribute('data-bk-done') && el.querySelector('.bk-fvault')) return;
    el.setAttribute('data-bk-done', '1');
    el.innerHTML = vaultFooterHTML();
  });
}
// Marcadores que el sitio agrega después (carritos que se redibujan con innerHTML)
function watchVaultFooters() {
  if (!window.MutationObserver || !document.body) return;
  let pend = false;
  new MutationObserver(() => {
    if (pend) return; pend = true;
    requestAnimationFrame(() => { pend = false; if (document.querySelector('[data-brinco="vault-footer"]:not([data-bk-done])')) fillVaultFooters(document); });
  }).observe(document.body, { childList: true, subtree: true });
}
Brinco.fill = function (r) { fillVaultFooters(r || document); };
Brinco._vault = { html: vaultHTML, footerHTML: vaultFooterHTML, fill: fillVaultFooters };

/* --- src/core/70-brinco.js --- */
/* ===== Brinco Kit · Cuenta Brinco compartida entre los negocios de sandscap.com.do =====
   Sin servidor todavía: la cuenta (sin datos de tarjeta, solo marca/últimos 4/vencimiento) viaja en una cookie
   del dominio padre, así todos los negocios en *.sandscap.com.do ven la misma cuenta en el mismo navegador.
   En otros dominios (*.sandscap.io, localhost…) se queda en el localStorage de ese sitio. */
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
  logout() { store.del('brinco_session'); ck.set('brinco_s', null); },
  upsert(phone, fn) { const a = B.accounts(); const k = phoneDigits(phone); a[k] = fn(a[k] || null); if (a[k]) a[k].touched = Date.now(); B.save(a); return a[k]; },
  consent(acc, type, text) { (acc.consents = acc.consents || []).push({ type, text, at: new Date().toISOString(), channel: 'web', v: '2026-10' }); }
};
// Primera visita con la cuenta compartida: sube a la cookie lo que ya estaba guardado en este sitio
if (SHARED) {
  const l0 = store.get('brinco_accounts', null), s0 = store.get('brinco_session', null);
  if (l0 && Object.keys(l0).length && !ck.get('brinco_acc')) ck.set('brinco_acc', slim(l0));
  if (s0 && !ck.get('brinco_s')) ck.set('brinco_s', s0);
}
Brinco._account = B;
Brinco._shared = SHARED;

/* --- src/core/75-passkeys.js --- */
/* ===== Brinco Kit · Passkeys: Face ID / huella (WebAuthn real; demo sin servidor, no se verifican firmas) =====
   En este equipo se guarda solo { phone, credId } en brinco_passkey. La biometría nunca sale del teléfono. */
const PK_TXT = {
  faceid: { name: 'Face ID', enter: 'Entrar con Face ID', on: 'Activar Face ID', title: '¿Entrar con Face ID la próxima vez?', use: 'Mira tu celular para entrar con Face ID.', ok: 'Face ID activado', pay: 'Confirma con Face ID…' },
  touchid: { name: 'Touch ID', enter: 'Entrar con Touch ID', on: 'Activar Touch ID', title: '¿Entrar con Touch ID la próxima vez?', use: 'Pon tu dedo en Touch ID para entrar.', ok: 'Touch ID activado', pay: 'Confirma con Touch ID…' },
  huella: { name: 'Huella', enter: 'Entrar con tu huella', on: 'Activar huella', title: '¿Entrar con tu huella la próxima vez?', use: 'Pon tu dedo en el lector para entrar.', ok: 'Huella activada', pay: 'Confirma con tu huella…' },
  bio: { name: 'Biometría', enter: 'Entrar con biometría', on: 'Activar biometría', title: '¿Entrar con biometría la próxima vez?', use: 'Confirma con la biometría de tu equipo.', ok: 'Biometría activada', pay: 'Confirma con tu biometría…' }
};
const PK = {
  _ok: null,
  lastAt: 0,
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
      PK.lastAt = Date.now();
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
      PK.lastAt = Date.now();
      return d.phone;
    });
  }
};
// Navegador dentro de Instagram/Facebook/TikTok: Apple no deja usar Face ID ahí
const INAPP = /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|BytedanceWebview|Line\//i.test(navigator.userAgent || '');
const IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
function safariURL() { return 'x-safari-' + location.origin + location.pathname; }
// Ícono: rostro (Face ID / biometría) o huella (Android / Touch ID)
function pkIcon(size) {
  size = size || 22;
  const a = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
  if (PK.kind() === 'huella' || PK.kind() === 'touchid') return `<svg ${a}><path d="M12 11v2.5a9 9 0 0 1-1.6 5.2"/><path d="M8.6 10.6a3.4 3.4 0 0 1 6.8.4v1.6a13 13 0 0 1-.9 4.6"/><path d="M5.6 15.6a12 12 0 0 0 .6-4.6 5.8 5.8 0 0 1 10.6-3.3"/><path d="M18.3 10.2c.1.3.1.6.1.9 0 2.3-.3 4.4-.9 6.4"/><path d="M3.4 9.2A9 9 0 0 1 12 3a9 9 0 0 1 4.6 1.3"/><path d="M7.8 20.2a14 14 0 0 0 1.1-2.1"/></svg>`;
  return `<svg ${a}><path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H8M16 4h1.5A2.5 2.5 0 0 1 20 6.5V8M20 16v1.5a2.5 2.5 0 0 1-2.5 2.5H16M8 20H6.5A2.5 2.5 0 0 1 4 17.5V16"/><path d="M9 9.2v1.4M15 9.2v1.4M12 9.2v3.6h-.9M9.6 15.6a3.4 3.4 0 0 0 4.8 0"/></svg>`;
}
Brinco._passkeys = PK;
Brinco._icons.passkey = pkIcon;

/* --- src/core/80-checkout.js --- */
/* ===== Brinco Kit · caja con tarjeta (campos de AZUL) y "Pagar con Brinco" =====
   Ambiente de pruebas: ningún dato de tarjeta sale del navegador ni se guarda.
   De la tarjeta solo se conserva marca, últimos 4 y vencimiento (como el token del procesador). */
const BRAND_IMG = { visa: 'visa.webp', mastercard: 'mastercard.webp' };
const brandImg = (b) => (BRAND_IMG[b] ? Brinco._img(BRAND_IMG[b]) : '');
const cardBrand = (n) => { const d = digits(n); if (/^4/.test(d)) return 'visa'; if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard'; if (/^3[47]/.test(d)) return 'amex'; return null; };
const luhn = (n) => { const d = digits(n); if (d.length < 13) return false; let s = 0, alt = false; for (let i = d.length - 1; i >= 0; i--) { let x = +d[i]; if (alt) { x *= 2; if (x > 9) x -= 9; } s += x; alt = !alt; } return s % 10 === 0; };
const brandName = (b) => ({ visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex' }[b] || 'Tarjeta');
const authCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const declineMsg = (c) => t('d' + c) !== 'd' + c ? t('d' + c) : t('d05');
const ent = () => Object.assign({ delivery: true, pickup: true, deliveryMin: 35, deliveryMax: 45, pickupMin: 20 }, C().entrega || {});
const SHIP = () => (ent().delivery ? Number(C().envio) || 0 : 0);
const cart = () => window.BrincoCart || null;
const CONSENT_CARD = 'Guardar esta tarjeta para mis compras en negocios Brinco. Brinco no guarda tu tarjeta: la guarda tu procesador de pago (AZUL, CardNet o MIO).';
const CONSENT_ACC = 'Guardar mis datos en Brinco para pagar con un toque en cualquier negocio Brinco';

// ---------- Estado de la caja ----------
const S = { mode: 'delivery', view: 'checkout', hist: [], pendingPay: null, otpCode: '', otpPhone: '', otpNext: null,
  bAddr: null, bCard: null, bNew: false, pkAsked: {}, coupon: null, form: store.get('brinco_form', null) };

// ---------- DOM (se crea al abrir por primera vez) ----------
let root = null, body = null;
function ensureRoot() {
  if (root) return;
  const c = C();
  root = document.createElement('div');
  root.className = 'bk-co';
  root.id = 'bkCo';
  root.innerHTML = `
  <div class="bk-scrim" data-x></div>
  <div class="bk-sheet" role="dialog" aria-modal="true" aria-labelledby="coTitle">
    <div class="bk-grab" aria-hidden="true"></div>
    <div class="bk-head">
      <button class="bk-back" id="coBack" type="button" aria-label="${t('back')}" hidden>${ICONS.back}</button>
      <h2 id="coTitle">${t('title')}</h2>
      <div class="bk-brand" id="coBrand" hidden>${c.logo ? `<img src="${esc(c.logo)}" alt="${esc(c.nombre)}">` : `<b class="bk-brand-name">${esc(c.nombre)}</b>`}<span class="bk-with">${t('with')} ${bword(15)}</span></div>
      <button class="bk-x" type="button" data-x aria-label="${t('close')}">${ICONS.x}</button>
    </div>
    <div class="bk-body" id="coBody"></div>
  </div>`;
  document.body.appendChild(root);
  body = $('#coBody', root);
  root.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) close(); });
  $('#coBack', root).addEventListener('click', back);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('bk-open')) close(); });
}

// ---------- Utilidades de vistas ----------
function header(brinco, title) {
  $('#coTitle', root).hidden = !!brinco;
  $('#coTitle', root).textContent = title || t('title');
  $('#coBrand', root).hidden = !brinco;
  root.classList.toggle('bk-is-brinco', !!brinco);
  $('#coBack', root).hidden = S.hist.length === 0;
}
function show(view, html, opts) {
  opts = opts || {};
  if (!opts.replace && S.view && S.view !== view && !opts.root && S.view !== 'otp' && S.view !== 'verify') S.hist.push(S.view);
  if (opts.root) S.hist = [];
  S.view = view;
  body.innerHTML = `<div class="bk-view bk-enter" data-view="${view}">${html}</div>`;
  body.scrollTop = 0;
  header(opts.brinco, opts.title);
  const f = body.querySelector('[autofocus]');
  if (f) setTimeout(() => { try { f.focus({ preventScroll: true }); } catch (e) {} }, 60);
}
function back() {
  const v = S.hist.pop();
  if (!v) return;
  S.view = null;
  (VIEWS[v] || VIEWS.checkout)({ replace: true });
  $('#coBack', root).hidden = S.hist.length === 0;
}
function setErr(id, on) { const f = body.querySelector('#' + id); if (!f) return; f.closest('.bk-fld').classList.toggle('bk-bad', !!on); }

function totals(mode) {
  const items = cart() ? cart().items() || [] : [];
  const sub = cart() && typeof cart().total === 'function' ? Number(cart().total()) || items.reduce((a, c) => a + c.qty * c.unit, 0) : items.reduce((a, c) => a + c.qty * c.unit, 0);
  const ship = (mode || S.mode) === 'delivery' ? SHIP() : 0;
  const disc = S.coupon ? Math.min(sub, Number(S.coupon.monto) || 0) : 0;
  return { items, sub, ship, disc, total: Math.max(0, sub + ship - disc) };
}
function sumHTML(mode) {
  const tt = totals(mode);
  return `<div class="bk-sum">
    ${tt.items.map((c) => `<div class="bk-l"><span>${c.qty} × ${esc(c.name)}${c.detail ? ` <small class="bk-dim">· ${esc(c.detail)}</small>` : ''}</span><span>${fmt(c.qty * c.unit)}</span></div>`).join('')}
    <div class="bk-l bk-l-sub"><span>${t('subtotal')}</span><span>${fmt(tt.sub)}</span></div>
    <div class="bk-l"><span>${(mode || S.mode) === 'delivery' ? t('ship') : t('pickup')}</span><span>${tt.ship ? fmt(tt.ship) : t('free')}</span></div>
    ${tt.disc ? `<div class="bk-l bk-l-disc"><span>${t('coupon')} ${esc(S.coupon.codigo)}</span><span>− ${fmt(tt.disc)}</span></div>` : ''}
    <div class="bk-l bk-tot"><span>${t('total')}</span><span>${fmt(tt.total)}</span></div>
    <span class="bk-note">${t('itbis')}</span>
  </div>`;
}
const badgesHTML = () => `<div class="bk-badges"><img src="${Brinco._img('visa.webp')}" alt="Visa"><img src="${Brinco._img('mastercard.webp')}" alt="Mastercard"><img src="${Brinco._img('visa-secure.webp')}" alt="Visa Secure"><img src="${Brinco._img('mastercard-id-check.webp')}" alt="Mastercard ID Check"></div>`;
const testNote = () => `<p class="bk-testmode">${t('testMode')}</p>`;

function azulHTML(prefix) {
  return `<div class="bk-azul" id="${prefix}Azul">
    <div class="bk-azul-top"><span class="bk-azul-lock">${ICONS.lock(14)}${t('azulTop')} <b>AZUL</b></span><span>${t('azulSec')}</span></div>
    <div class="bk-azul-err" id="${prefix}AzErr" role="alert" hidden></div>
    <div class="bk-fld bk-cardnum"><label for="${prefix}Num">${t('cardNum')}</label><input id="${prefix}Num" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" maxlength="19"><span class="bk-cbrand" id="${prefix}Brand"></span><span class="bk-err">${t('cardNumErr')}</span></div>
    <div class="bk-row2">
      <div class="bk-fld"><label for="${prefix}Exp">${t('exp')}</label><input id="${prefix}Exp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/AA" maxlength="5"><span class="bk-err">${t('expErr')}</span></div>
      <div class="bk-fld"><label for="${prefix}Cvv">${t('cvv')}</label><input id="${prefix}Cvv" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4"><span class="bk-err">${t('cvvErr')}</span></div>
    </div>
    <div class="bk-fld"><label for="${prefix}Holder">${t('holder')}</label><input id="${prefix}Holder" autocomplete="cc-name" placeholder="${t('holderPh')}"><span class="bk-err">${t('holderErr')}</span></div>
    <div class="bk-testcards">${t('testCards')} <button type="button" data-test="4242424242424242">4242 4242 4242 4242 · ${t('approved')}</button><button type="button" data-test="4000000000000002">4000 0000 0000 0002 · ${t('declined')}</button></div>
  </div>`;
}
function bindAzul(prefix) {
  const num = $('#' + prefix + 'Num', body), exp = $('#' + prefix + 'Exp', body), cvv = $('#' + prefix + 'Cvv', body), br = $('#' + prefix + 'Brand', body);
  const paintBrand = () => { const b = cardBrand(num.value); br.innerHTML = brandImg(b) ? `<img src="${brandImg(b)}" alt="${brandName(b)}">` : ''; };
  num.addEventListener('input', () => { num.value = digits(num.value).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); paintBrand(); setErr(prefix + 'Num', false); });
  exp.addEventListener('input', () => { const d = digits(exp.value).slice(0, 4); exp.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; setErr(prefix + 'Exp', false); });
  cvv.addEventListener('input', () => { cvv.value = digits(cvv.value).slice(0, 4); setErr(prefix + 'Cvv', false); });
  $('#' + prefix + 'Holder', body).addEventListener('input', () => setErr(prefix + 'Holder', false));
  $$('[data-test]', body).forEach((b) => b.addEventListener('click', () => {
    num.value = b.dataset.test.replace(/(\d{4})(?=\d)/g, '$1 '); paintBrand();
    const y = (new Date().getFullYear() + 3) % 100; exp.value = '12/' + String(y).padStart(2, '0'); cvv.value = '123';
    const h = $('#' + prefix + 'Holder', body); if (!h.value) h.value = ($('#coName', body) && $('#coName', body).value) || (t('defaultClient') + ' ' + C().nombre);
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
// Limpia los campos de tarjeta del DOM (que no queden en memoria de la página)
function wipeAzul(prefix) { ['Num', 'Cvv'].forEach((k) => { const el = body && body.querySelector('#' + prefix + k); if (el) el.value = ''; }); }

// ---------- Vistas ----------
const VIEWS = {};

VIEWS.checkout = function (o) {
  o = o || {};
  const e = ent();
  if (!e.delivery) S.mode = 'pickup'; else if (!e.pickup) S.mode = 'delivery';
  const me = B.me();
  const card = me && me.cards && (me.cards.find((c) => c.main) || me.cards[0]);
  const tt = totals();
  const cup = C().cupon;
  show('checkout', `
    <button class="bk-bbtn${card ? ' bk-has-card' : ''}" type="button" id="bPayBtn"><span class="bk-bl">${t('payBrinco')} <span class="bk-bw">brinco</span></span>${card ? `<span class="bk-bc">${brandName(card.brand)} •••• ${esc(card.last4)}</span>` : ''}</button>
    ${vaultHTML(true)}
    <div class="bk-or">${t('orCard')}</div>
    ${e.delivery && e.pickup ? `<div class="bk-sec"><h3>${t('howTitle')}</h3>
      <div class="bk-seg" role="group" aria-label="Entrega">
        <button type="button" data-mode="delivery" aria-pressed="${S.mode === 'delivery'}">${t('delivery')}<small>+${fmt(SHIP())} · ${e.deliveryMin}–${e.deliveryMax} ${t('min')}</small></button>
        <button type="button" data-mode="pickup" aria-pressed="${S.mode === 'pickup'}">${t('pickup')}<small>${t('free')} · ${e.pickupMin} ${t('min')}</small></button>
      </div></div>` : ''}
    <div class="bk-sec"><h3>${t('yourData')}</h3>
      <div class="bk-fld"><label for="coName">${t('name')}</label><input id="coName" autocomplete="name" placeholder="${t('namePh')}"><span class="bk-err">${t('nameErr')}</span></div>
      <div class="bk-fld"><label for="coPhone">${t('wa')}</label><input id="coPhone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="809-555-1234"><span class="bk-err">${t('waErr')}</span></div>
      <div id="coAddr" class="bk-addr"${S.mode === 'delivery' ? '' : ' hidden'}>
        <div class="bk-fld"><label for="coStreet">${t('street')}</label><input id="coStreet" autocomplete="street-address" placeholder="${t('streetPh')}"><span class="bk-err">${t('streetErr')}</span></div>
        <div class="bk-row2">
          <div class="bk-fld"><label for="coSector">${t('sector')}</label><select id="coSector"><option value="">${t('choose')}</option>${(C().sectores || []).map((s) => `<option>${esc(s)}</option>`).join('')}</select><span class="bk-err">${t('sectorErr')}</span></div>
          <div class="bk-fld"><label for="coRef">${t('ref')}</label><input id="coRef" placeholder="${t('refPh')}"><span class="bk-err"></span></div>
        </div>
      </div>
    </div>
    <div class="bk-sec"><h3>${t('payment')}</h3>${azulHTML('c')}</div>
    <label class="bk-chk"><input type="checkbox" id="coSave"><span>${t('saveBrinco', { brinco: bword() })}<small>${t('saveBrincoSmall')}</small></span></label>
    ${cup && cup.codigo ? `<div class="bk-coupon"><div class="bk-fld"><label for="coCoupon">${t('coupon')}${cup.texto ? ` <span class="bk-dim">· ${esc(cup.texto)}</span>` : ''}</label><div class="bk-coupon-row"><input id="coCoupon" autocomplete="off" placeholder="${esc(cup.codigo)}" value="${S.coupon ? esc(S.coupon.codigo) : ''}"><button type="button" class="bk-coupon-go" id="coCouponGo">${S.coupon ? '✓' : 'Aplicar'}</button></div><span class="bk-err">Ese cupón no es válido.</span></div></div>` : ''}
    <div id="coSum">${sumHTML()}</div>
    <button class="bk-pay" type="button" id="coPay">${ICONS.lock(18)}<span>${t('pay')} ${fmt(tt.total)}</span></button>
    ${testNote()}${badgesHTML()}`, { root: true, replace: o.replace });
  // Si ya llenó algo antes, se lo devolvemos
  const d = S.form || {};
  ['coName', 'coPhone', 'coStreet', 'coSector', 'coRef'].forEach((k) => { const el = $('#' + k, body); if (el && d[k]) el.value = d[k]; });
  bindAzul('c');
  $('#coPhone', body).addEventListener('input', (ev) => { ev.target.value = fmtPhone(ev.target.value); setErr('coPhone', false); });
  ['coName', 'coStreet', 'coSector'].forEach((k) => { const el = $('#' + k, body); if (el) { el.addEventListener('input', () => setErr(k, false)); el.addEventListener('change', () => setErr(k, false)); } });
  const repaint = () => { $('#coSum', body).innerHTML = sumHTML(); $('#coPay span', body).textContent = t('pay') + ' ' + fmt(totals().total); };
  $$('[data-mode]', body).forEach((b) => b.addEventListener('click', () => {
    S.mode = b.dataset.mode;
    $$('[data-mode]', body).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('#coAddr', body).hidden = S.mode !== 'delivery';
    repaint();
  }));
  const cgo = $('#coCouponGo', body);
  if (cgo) {
    const apply = () => {
      const v = $('#coCoupon', body).value.trim().toUpperCase();
      const ok = v && v === String(cup.codigo).toUpperCase();
      setErr('coCoupon', !!v && !ok);
      S.coupon = ok ? cup : null; cgo.textContent = ok ? '✓' : 'Aplicar';
      if (ok) track('cupon', { codigo: cup.codigo });
      repaint();
    };
    cgo.addEventListener('click', apply);
    $('#coCoupon', body).addEventListener('keydown', (ev) => { if (ev.key === 'Enter') apply(); });
  }
  $('#bPayBtn', body).addEventListener('click', () => { keepForm(); track('brinco_boton'); startBrinco(); });
  $('#coPay', body).addEventListener('click', payWithCard);
};

function keepForm() {
  S.form = {};
  ['coName', 'coPhone', 'coStreet', 'coSector', 'coRef'].forEach((k) => { const el = $('#' + k, body); if (el) S.form[k] = el.value; });
  store.set('brinco_form', S.form);   // solo nombre, WhatsApp y dirección; nunca datos de tarjeta
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
  if (!ok || !card) { const bad = body.querySelector('.bk-fld.bk-bad input, .bk-fld.bk-bad select'); if (bad) bad.focus(); return; }
  keepForm();
  const save = $('#coSave', body).checked;
  const tt = totals();
  S.pendingPay = { via: 'tarjeta', name, phone: phoneDigits(phone), mode: S.mode, address: S.mode === 'delivery' ? { street, sector, ref, label: t('home') } : null, card, save, total: tt.total };
  wipeAzul('c');
  track('pago_enviado', { total: tt.total, metodo: 'tarjeta', guardar: save });
  if (save) sendOtp(phone, () => verify3ds());   // Cuenta Brinco nueva al pagar (flujo A): primero confirmamos el WhatsApp
  else verify3ds();
}

// --- Código por WhatsApp (simulado: aparece como notificación) ---
function sendOtp(phone, next) {
  S.otpPhone = phoneDigits(phone);
  S.otpCode = String(Math.floor(100000 + Math.random() * 900000));
  S.otpNext = next;
  S.otpTries = 0;
  show('otp', `
    <div class="bk-center bk-stack">
      ${bword(28)}
      <p class="bk-h3">${t('otpTitle')}</p>
      <p class="bk-muted">${t('otpSent', { phone: '<b>' + fmtPhone(S.otpPhone) + '</b>' })}</p>
    </div>
    <div class="bk-otp" id="otpBoxes"><input inputmode="numeric" autocomplete="one-time-code" aria-label="Dígito 1">${[2, 3, 4, 5, 6].map((n) => `<input inputmode="numeric" aria-label="Dígito ${n}">`).join('')}</div>
    <p class="bk-muted bk-center" id="otpMsg" role="alert"></p>
    <button class="bk-pay bk-blue" type="button" id="otpGo">${t('otpGo')}</button>
    <button class="bk-link" type="button" id="otpAgain">${t('otpAgain')}</button>`, { brinco: true });
  const boxes = $$('#otpBoxes input', body);
  try { boxes[0].focus({ preventScroll: true }); } catch (e) {}
  let checked = false;
  boxes.forEach((b, i) => {
    b.addEventListener('input', () => {
      const v = digits(b.value);
      if (v.length > 1) { fill(v, i); return; }
      b.value = v; $('#otpBoxes', body).classList.remove('bk-bad');
      if (v && boxes[i + 1]) boxes[i + 1].focus();
      if (boxes.every((x) => x.value)) check();
    });
    b.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !b.value && boxes[i - 1]) boxes[i - 1].focus(); });
    b.addEventListener('paste', (e) => {
      const txt = digits((e.clipboardData || window.clipboardData).getData('text'));
      if (txt.length > 1) { e.preventDefault(); fill(txt, 0); }
    });
  });
  function fill(code, from) {
    from = from || 0;
    if (code.length >= 6) from = 0;
    code.slice(0, 6 - from).split('').forEach((c, k) => { boxes[from + k].value = c; });
    boxes[Math.min(5, from + code.length - 1)].focus();
    if (boxes.every((x) => x.value)) check();
  }
  function check() {
    if (checked || S.view !== 'otp') return;
    const code = boxes.map((x) => x.value).join('');
    if (code.length < 6) return;
    if (/^\d{6}$/.test(code)) { checked = true; hideWa(); track('codigo_ok'); S.otpNext && S.otpNext(); }
    else {
      S.otpTries++;
      $('#otpBoxes', body).classList.add('bk-bad');
      $('#otpMsg', body).textContent = S.otpTries >= 5 ? t('otpMany') : t('otpBad');
      boxes.forEach((x) => { x.value = ''; }); boxes[0].focus();
    }
  }
  $('#otpGo', body).addEventListener('click', check);
  $('#otpAgain', body).addEventListener('click', () => sendOtp(S.otpPhone, S.otpNext));
  const code = S.otpCode;
  setTimeout(() => { if (S.view === 'otp' && S.otpCode === code) showWa(t('otpMsg', { code: `<b>${code.slice(0, 3)} ${code.slice(3)}</b>` }), () => { if (S.view === 'otp') fill(S.otpCode, 0); }); }, 900);
}

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
  show('bPasskey', `
    <div class="bk-pk-offer">
      <span class="bk-pk-ico">${pkIcon(46)}</span>
      <p class="bk-h3">${PK.t('title')}</p>
      <p class="bk-muted">${t('pkBio')}</p>
      <ul class="bk-pk-pts"><li>${ICONS.check}${t('pkPoints1')}</li><li>${ICONS.check}${t('pkPoints2')}</li></ul>
    </div>
    <button class="bk-pay bk-blue" type="button" id="pkOn">${pkIcon(22)}${PK.t('on')}</button>
    <button class="bk-link" type="button" id="pkSkip">${t('notNow')}</button>`, { brinco: true, root: true });
  let busy = false;
  $('#pkOn', body).addEventListener('click', (e) => {
    if (busy) return;
    busy = true; e.currentTarget.disabled = true;
    PK.create(phone, acc.name).then(() => {
      track('passkey_activada', { tipo: PK.kind() });
      VIEWS.bPasskeyOk(next);
    }, (err) => {
      track('passkey_fallo', { paso: 'activar', error: (err && err.name) || 'error' });
      toast(t('pkFail'));
      next();
    });
  });
  $('#pkSkip', body).addEventListener('click', () => next());
};

VIEWS.bPasskeyOk = function (next) {
  if (typeof next !== 'function') { VIEWS.checkout({ replace: true }); return; }
  show('bPasskeyOk', `<div class="bk-view bk-done bk-flat">
    ${ICONS.okmark}
    <p class="bk-h3">${PK.t('ok')}</p>
    <p class="bk-muted">${t('pkNext', { x: PK.kind() === 'faceid' ? t('aLook') : t('aTouch') })}</p></div>`, { brinco: true, root: true });
  setTimeout(() => { if (S.view === 'bPasskeyOk') next(); }, 1300);
};

// --- Entrar con Face ID / huella; si falla, al WhatsApp de siempre ---
function passkeyLogin(d, fromLogin) {
  show('pkWait', `<div class="bk-view bk-verify bk-flat">
    <span class="bk-pk-ico bk-pulse">${pkIcon(46)}</span>
    <p class="bk-h3">${t('pkConfirm')}</p>
    <p class="bk-muted">${PK.t('use')}</p></div>`, { brinco: true, replace: !!fromLogin });
  PK.get(d).then((phone) => {
    B.login(phone);
    track('passkey_login', { tipo: PK.kind(), paso: 'entrar' });
    const acc = B.accounts()[phone];
    S.bNew = false;
    if (acc && acc.cards && acc.cards.length) VIEWS.bSummary({ root: true });
    else VIEWS.bProfile();
  }, (err) => {
    track('passkey_fallo', { paso: 'entrar', error: (err && err.name) || 'error' });
    VIEWS.bLogin({ replace: true, phone: d.phone, msg: t('useWa') });
  });
}

// --- 3D Secure y cobro ---
function verify3ds() {
  const p = S.pendingPay;
  const logo = Brinco._img(p.card.brand === 'mastercard' ? 'mastercard-id-check.webp' : 'visa-secure.webp');
  show('verify', `<div class="bk-view bk-verify bk-flat">
    <img class="bk-logo3ds" src="${logo}" alt="">
    <p class="bk-h3">${t('verifyBank')}</p>
    <p class="bk-muted">${brandName(p.card.brand)} •••• ${p.card.last4} · ${fmt(p.total)}</p>
    <div class="bk-spin" aria-label="Procesando"></div>
    <p class="bk-muted bk-small">${t('noClose')}</p></div>`, { replace: true, brinco: p.via === 'brinco' });
  $('#coBack', root).hidden = true;
  setTimeout(charge, 2100);
}
function processing() {
  const p = S.pendingPay;
  show('verify', `<div class="bk-view bk-verify bk-flat">
    ${bword(30)}
    <div class="bk-spin" aria-label="Procesando"></div>
    <p class="bk-h3">${t('processing')}</p>
    <p class="bk-muted">${brandName(p.card.brand)} •••• ${p.card.last4} · ${fmt(p.total)}</p></div>`, { replace: true, brinco: true });
  $('#coBack', root).hidden = true;
  setTimeout(charge, 1500);
}
function charge() {
  const p = S.pendingPay;
  if (!p || !root.classList.contains('bk-open')) return;
  if (p.card.declineCode) {
    track('rechazo', { codigo: p.card.declineCode, metodo: p.via });
    if (p.via === 'brinco') { VIEWS.bSummary({ root: true, error: declineMsg(p.card.declineCode) }); return; }
    VIEWS.checkout({ replace: true });
    const e = $('#cAzErr', body); e.hidden = false; e.textContent = declineMsg(p.card.declineCode) + ' (' + t('code') + ' ' + p.card.declineCode + ')';
    e.scrollIntoView({ block: 'center' });
    return;
  }
  const tt = totals(p.mode);
  const src = Brinco.source();
  const order = {
    no: Brinco.orders.newNo(), negocio: C().negocio,
    at: Date.now(), items: tt.items.map((c) => ({ name: c.name, detail: c.detail || '', qty: c.qty, unit: c.unit, img: c.img || '' })),
    sub: tt.sub, ship: tt.ship, disc: tt.disc || 0, coupon: S.coupon ? S.coupon.codigo : null, total: tt.total, mode: p.mode,
    name: p.name, phone: p.phone, address: p.address, via: p.via,
    card: { brand: p.card.brand, last4: p.card.last4 }, auth: authCode(),
    src: src.source, med: src.medium, brincoNew: false
  };
  // Cuenta Brinco: crear o agregar tarjeta (solo marca, últimos 4, vencimiento)
  if (p.via === 'tarjeta' && p.save) {
    const existed = !!B.accounts()[p.phone];
    B.upsert(p.phone, (acc) => {
      acc = acc || { phone: p.phone, name: p.name, email: '', addresses: [], cards: [], createdAt: Date.now(), merchants: [] };
      acc.addresses = acc.addresses || []; acc.cards = acc.cards || [];
      B.consent(acc, 'cuenta', CONSENT_ACC);
      B.consent(acc, 'guardar_tarjeta', CONSENT_CARD);
      if (p.address && !acc.addresses.some((a) => a.street === p.address.street)) acc.addresses.push(Object.assign({ id: Date.now(), main: !acc.addresses.length }, p.address));
      if (!acc.cards.some((c) => c.last4 === p.card.last4 && c.brand === p.card.brand)) {
        acc.cards.forEach((c) => { c.main = false; });
        acc.cards.push({ id: Date.now(), brand: p.card.brand, last4: p.card.last4, exp: p.card.exp, processor: 'azul', main: true });
      }
      return acc;
    });
    B.login(p.phone);
    order.brincoNew = !existed;
    track('brinco_cuenta', { nueva: !existed });
  }
  if (p.via === 'brinco') order.brincoNew = S.bNew;
  // Historial del cliente: solo nombre del negocio y fecha
  if (B.session()) B.upsert(B.session().phone, (acc) => { if (acc) { acc.merchants = acc.merchants || []; acc.merchants.push({ name: C().nombre, at: Date.now() }); } return acc; });
  Brinco.orders.save(order);
  track('compra', { total: order.total, metodo: order.via, orden: order.no });
  try { if (cart() && cart().clear) cart().clear(); } catch (e) { console.error(e); }
  S.coupon = null; S.pendingPay = null;
  const fire = () => { try { window.dispatchEvent(new CustomEvent('brinco:order', { detail: order })); } catch (e) {} };
  // Flujo A: cuenta creada al pagar → ofrecemos Face ID / huella antes de la confirmación
  if (p.via === 'tarjeta' && p.save) offerPasskey(p.phone, () => { VIEWS.done(order); fire(); });
  else { VIEWS.done(order); fire(); }
}

VIEWS.done = function (o) {
  if (!o || !o.no) { VIEWS.checkout({ replace: true }); return; }
  const e = ent();
  show('done', `<div class="bk-view bk-done bk-flat">
    ${ICONS.okmark}
    <p class="bk-h3">${t('done')}</p>
    <span class="bk-ordno">${t('order')} ${esc(o.no)}</span>
    <span class="bk-eta">${ICONS.clock}${o.mode === 'delivery' ? t('arrives', { a: e.deliveryMin, b: e.deliveryMax }) : t('ready', { a: e.pickupMin })}</span>
    <p class="bk-muted">${t('doneWa', { phone: fmtPhone(o.phone) })}</p>
    <a class="bk-pay bk-track-btn" href="/pedido/?o=${encodeURIComponent(o.no)}">${ICONS.pin}${t('follow')}</a>
    <div class="bk-receipt">
      ${o.items.map((c) => `<div class="bk-l"><span>${c.qty} × ${esc(c.name)}</span><span>${fmt(c.qty * c.unit)}</span></div>`).join('')}
      <div class="bk-l bk-dim"><span>${o.mode === 'delivery' ? t('ship') : t('pickup')}</span><span>${o.ship ? fmt(o.ship) : t('free')}</span></div>
      ${o.disc ? `<div class="bk-l bk-dim"><span>${t('coupon')} ${esc(o.coupon || '')}</span><span>− ${fmt(o.disc)}</span></div>` : ''}
      <div class="bk-l bk-rtot"><span>${t('paid')}</span><span>${fmt(o.total)}</span></div>
      <div class="bk-rmeta">${o.via === 'brinco' ? t('paidBrinco') : ''}${brandName(o.card.brand)} •••• ${esc(o.card.last4)} · ${t('auth')} ${esc(o.auth)}${o.address ? '<br>' + t('deliverTo') + ': ' + esc(o.address.street) + ', ' + esc(o.address.sector) : ''}</div>
    </div>
    ${o.brincoNew ? `<div class="bk-bok">${bword(18)}<br><b>${t('brincoReady')}</b> ${t('brincoReadyTx')}</div>` : ''}
    <button class="bk-link" type="button" data-x>${t('keepShopping')}</button>
    ${badgesHTML()}</div>`, { root: true, replace: true, title: t('doneTitle'), brinco: false });
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
    <div class="bk-center bk-stack">
      ${bword(34)}
      <p class="bk-h3">${t('bTagline')}</p>
      <p class="bk-muted">${d ? t('bLoginPk', { x: PK.t('enter').replace('Entrar con ', '') }) : t('bLoginTx')}</p>
    </div>
    ${o.msg ? `<p class="bk-pk-msg" role="status">${esc(o.msg)}</p>` : ''}
    ${d ? `<button class="bk-pay bk-blue" type="button" id="bPk">${pkIcon(22)}${PK.t('enter')}</button><div class="bk-or">${t('orWa')}</div>` : ''}
    <div class="bk-fld"><label for="bPhone">${t('waNumber')}</label><input id="bPhone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="809-555-1234" ${d ? '' : 'autofocus'}><span class="bk-err">${t('waErr')}</span></div>
    <button class="bk-pay ${d ? 'bk-ghost' : 'bk-blue'}" type="button" id="bSend">${t('sendCode')}</button>
    ${vaultHTML(false)}
    <p class="bk-muted bk-center bk-small">${t('bTerms')}</p>`, { brinco: true, replace: o.replace });
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
  const needAddr = ent().delivery;
  show('bProfile', `
    <p class="bk-h3">${t('bCreate')}</p>
    <p class="bk-muted">${t('bCreateTx')}</p>
    <div class="bk-fld"><label for="bName">${t('name')}</label><input id="bName" autocomplete="name" value="${esc(acc.name || f.coName || '')}" autofocus><span class="bk-err">${t('nameErr')}</span></div>
    <div class="bk-fld"><label for="bEmail">${t('email')} <span class="bk-dim bk-light">${t('optional')}</span></label><input id="bEmail" type="email" autocomplete="email" value="${esc(acc.email || '')}"><span class="bk-err">${t('emailErr')}</span></div>
    ${needAddr ? `<div class="bk-sec"><h3 class="bk-blue-h">${t('addrTitle')}</h3>
      <div class="bk-seg" role="group" aria-label="Etiqueta"><button type="button" data-lbl="${t('home')}" aria-pressed="true">${t('home')}</button><button type="button" data-lbl="${t('work')}" aria-pressed="false">${t('work')}</button></div>
      <div class="bk-fld"><label for="bStreet">${t('street')}</label><input id="bStreet" autocomplete="street-address" value="${esc(a0.street || f.coStreet || '')}" placeholder="${t('streetPh')}"><span class="bk-err">${t('streetErr')}</span></div>
      <div class="bk-row2">
        <div class="bk-fld"><label for="bSector">${t('sector')}</label><select id="bSector"><option value="">${t('choose')}</option>${(C().sectores || []).map((s) => `<option ${s === (a0.sector || f.coSector) ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select><span class="bk-err">${t('sectorErr')}</span></div>
        <div class="bk-fld"><label for="bRef">${t('ref')}</label><input id="bRef" value="${esc(a0.ref || f.coRef || '')}" placeholder="${t('refPh')}"><span class="bk-err"></span></div>
      </div>
    </div>` : ''}
    <label class="bk-chk"><input type="checkbox" id="bConsent"><span>${t('consent', { brinco: bword() })}<small>${t('consentSmall')}</small></span></label>
    <p class="bk-muted bk-errline" id="bConsentErr" hidden>${t('consentErr')}</p>
    <button class="bk-pay bk-blue" type="button" id="bNext">${t('continue')}</button>`, { brinco: true });
  let lbl = t('home');
  $$('[data-lbl]', body).forEach((b) => b.addEventListener('click', () => { lbl = b.dataset.lbl; $$('[data-lbl]', body).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
  ['bName', 'bEmail', 'bStreet', 'bSector'].forEach((k) => { const el = $('#' + k, body); if (el) el.addEventListener('input', () => setErr(k, false)); });
  $('#bNext', body).addEventListener('click', () => {
    const name = $('#bName', body).value.trim(), email = $('#bEmail', body).value.trim();
    const street = needAddr ? $('#bStreet', body).value.trim() : '', sector = needAddr ? $('#bSector', body).value : '', ref = needAddr ? $('#bRef', body).value.trim() : '';
    let ok = true;
    if (name.length < 2) { setErr('bName', true); ok = false; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('bEmail', true); ok = false; }
    if (needAddr && street.length < 4) { setErr('bStreet', true); ok = false; }
    if (needAddr && !sector) { setErr('bSector', true); ok = false; }
    const c = $('#bConsent', body).checked; $('#bConsentErr', body).hidden = c;
    if (!ok || !c) return;
    const phone = B.session().phone;
    B.upsert(phone, (acc) => {
      acc = acc || { phone, addresses: [], cards: [], createdAt: Date.now(), merchants: [] };
      acc.addresses = acc.addresses || []; acc.cards = acc.cards || [];
      acc.name = name; acc.email = email;
      if (!acc.consents || !acc.consents.some((x) => x.type === 'cuenta')) B.consent(acc, 'cuenta', CONSENT_ACC);
      if (needAddr && !acc.addresses.some((a) => a.street === street)) acc.addresses.push({ id: Date.now(), label: lbl, street, sector, ref, main: !acc.addresses.length });
      return acc;
    });
    track('brinco_cuenta', { nueva: true });
    VIEWS.bCard();
  });
};

VIEWS.bCard = function () {
  show('bCard', `
    <p class="bk-h3">${t('addCard')}</p>
    ${vaultHTML(false)}
    ${azulHTML('b')}
    <label class="bk-chk"><input type="checkbox" id="bCardConsent"><span>${t('cardConsent')}<small>${t('cardConsentSmall')}</small></span></label>
    <p class="bk-muted bk-errline" id="bCardErr" hidden>${t('cardConsentErr')}</p>
    <button class="bk-pay bk-blue" type="button" id="bSaveCard">${t('saveCard')}</button>
    ${testNote()}${badgesHTML()}`, { brinco: true });
  bindAzul('b');
  $('#bSaveCard', body).addEventListener('click', () => {
    const card = readAzul('b');
    const c = $('#bCardConsent', body).checked; $('#bCardErr', body).hidden = c;
    if (!card || !c) return;
    wipeAzul('b');
    const logo = Brinco._img(card.brand === 'mastercard' ? 'mastercard-id-check.webp' : 'visa-secure.webp');
    show('verify', `<div class="bk-view bk-verify bk-flat"><img class="bk-logo3ds" src="${logo}" alt=""><p class="bk-h3">${t('verifyCard')}</p><p class="bk-muted">${brandName(card.brand)} •••• ${card.last4}</p><div class="bk-spin"></div></div>`, { replace: true, brinco: true });
    $('#coBack', root).hidden = true;
    setTimeout(() => {
      if (!root.classList.contains('bk-open') || !B.session()) return;
      B.upsert(B.session().phone, (acc) => {
        acc.cards = acc.cards || [];
        B.consent(acc, 'guardar_tarjeta', CONSENT_CARD);
        acc.cards.forEach((x) => { x.main = false; });
        acc.cards.push({ id: Date.now(), brand: card.brand, last4: card.last4, exp: card.exp, processor: 'azul', main: true, declineCode: card.declineCode || undefined });
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
  const e = ent();
  const addrs = e.delivery ? (me.addresses || []) : [], cards = me.cards || [];
  if (S.bAddr == null || (S.bAddr !== 'pickup' && !addrs.some((a) => a.id === S.bAddr))) S.bAddr = (addrs.find((a) => a.main) || addrs[0] || {}).id || 'pickup';
  if (S.bAddr === 'pickup' && !e.pickup && addrs.length) S.bAddr = addrs[0].id;
  if (S.bCard == null || !cards.some((c) => c.id === S.bCard)) S.bCard = (cards.find((c) => c.main) || cards[0] || {}).id;
  if (!cards.length) { VIEWS.bCard(); return; }
  const mode = S.bAddr === 'pickup' ? 'pickup' : 'delivery';
  const first = (me.name || '').split(' ')[0] || t('again');
  const pkd = PK.can() ? PK.device() : null;
  const pk = pkd && pkd.phone === me.phone ? pkd : null;
  show('bSummary', `
    <div class="bk-hello"><span class="bk-avatar">${esc((me.name || 'B').trim().charAt(0).toUpperCase())}</span><div><p class="bk-h3 bk-h3-sm">${t('hello', { name: esc(first) })}</p><p class="bk-muted">${fmtPhone(me.phone)}${pk ? ` <span class="bk-pk-tag">${pkIcon(14)}${PK.t('name')}</span>` : ''}</p></div></div>
    ${o.error ? `<div class="bk-azul-err" role="alert">${esc(o.error)}</div>` : ''}
    <div class="bk-sec"><h3 class="bk-blue-h">${t('delivTitle')}</h3>
      ${addrs.map((a) => `<button type="button" class="bk-opt" role="radio" data-addr="${a.id}" aria-checked="${S.bAddr === a.id}"><span class="bk-dot"></span><span class="bk-otx"><b>${esc(a.label || t('home'))} · ${t('delivery')} ${fmt(SHIP())}</b><span>${esc(a.street)}, ${esc(a.sector)}</span></span></button>`).join('')}
      ${e.pickup ? `<button type="button" class="bk-opt" role="radio" data-addr="pickup" aria-checked="${S.bAddr === 'pickup'}"><span class="bk-dot"></span><span class="bk-otx"><b>${t('pickup')} · ${t('free')}</b><span>${t('readyIn', { a: e.pickupMin })}</span></span></button>` : ''}
    </div>
    <div class="bk-sec"><h3 class="bk-blue-h">${t('cardTitle')}</h3>
      ${cards.map((c) => `<button type="button" class="bk-opt" role="radio" data-card="${c.id}" aria-checked="${S.bCard === c.id}"><span class="bk-dot"></span>${brandImg(c.brand) ? `<img src="${brandImg(c.brand)}" alt="">` : ''}<span class="bk-otx"><b>${brandName(c.brand)} •••• ${esc(c.last4)}</b><span>${t('expires', { exp: esc(c.exp) })}${c.main ? ' · ' + t('main') : ''}</span></span></button>`).join('')}
      <button class="bk-link bk-link-left" type="button" id="bAddCard">${t('addOther')}</button>
      ${vaultHTML(true)}
    </div>
    ${!pk ? '<div id="pkSlot"></div>' : ''}
    ${sumHTML(mode)}
    <button class="bk-pay bk-blue" type="button" id="bConfirm">${pk ? pkIcon(20) : ''}${t('confirmPay', { total: fmt(totals(mode).total) })}</button>
    ${testNote()}
    <button class="bk-link" type="button" id="bOut">${t('notYou', { name: esc(first) })}</button>`, { brinco: true, root: o.root, replace: o.replace });
  $$('[data-addr]', body).forEach((b) => b.addEventListener('click', () => { S.bAddr = b.dataset.addr === 'pickup' ? 'pickup' : +b.dataset.addr; VIEWS.bSummary({ replace: true }); }));
  $$('[data-card]', body).forEach((b) => b.addEventListener('click', () => { S.bCard = +b.dataset.card; VIEWS.bSummary({ replace: true }); }));
  $('#bAddCard', body).addEventListener('click', () => VIEWS.bCard());
  // Sin Face ID en este equipo: ofrecer activarlo aquí mismo (o abrir en Safari si está dentro de Instagram)
  const slot = $('#pkSlot', body);
  if (slot) {
    if (INAPP && IOS) {
      slot.innerHTML = `<a class="bk-pk-banner" href="${safariURL()}"><span class="bk-pk-ico bk-sm">${pkIcon(22)}</span><span class="bk-pk-tx"><b>${t('safariT')}</b><span>${t('safariTx', { n: esc(C().nombre) })}</span></span><span class="bk-go">${t('open')}</span></a>`;
    } else {
      PK.available().then((ok) => {
        if (!ok || S.view !== 'bSummary' || !document.body.contains(slot)) return;
        slot.innerHTML = `<button type="button" class="bk-pk-banner" id="pkAct"><span class="bk-pk-ico bk-sm">${pkIcon(22)}</span><span class="bk-pk-tx"><b>${PK.t('on')}</b><span>${t('pkBanner', { x: PK.kind() === 'faceid' ? t('aLook') : t('aTouch') })}</span></span><span class="bk-go">${t('activate')}</span></button>`;
        const btn = $('#pkAct', slot);
        btn.addEventListener('click', () => {
          btn.disabled = true;
          PK.create(me.phone, me.name).then(() => {
            track('passkey_activada', { tipo: PK.kind(), desde: 'resumen' });
            toast(PK.t('ok'));
            if (S.view === 'bSummary') VIEWS.bSummary({ replace: true });
          }, (err) => {
            track('passkey_fallo', { paso: 'activar', error: (err && err.name) || 'error' });
            toast(t('pkFail'));
            btn.disabled = false;
          });
        });
      });
    }
  }
  $('#bOut', body).addEventListener('click', () => { B.logout(); S.bAddr = S.bCard = null; VIEWS.checkout({ replace: true }); });
  let paying = false;
  $('#bConfirm', body).addEventListener('click', (ev) => {
    if (paying) return;
    const card = cards.find((c) => c.id === S.bCard);
    const addr = addrs.find((a) => a.id === S.bAddr) || null;
    S.mode = mode;
    S.pendingPay = { via: 'brinco', name: me.name, phone: me.phone, mode, address: mode === 'delivery' ? addr : null,
      card: { brand: card.brand, last4: card.last4, exp: card.exp, declineCode: card.declineCode || null }, total: totals(mode).total };
    const pay = () => { track('pago_enviado', { total: S.pendingPay.total, metodo: 'brinco' }); processing(); };
    // Con Face ID / huella activo: se pide justo antes de cobrar (salvo que acabe de usarlo hace menos de 2 min)
    if (pk && !(PK.lastAt && Date.now() - PK.lastAt < 120000)) {
      paying = true;
      const btn = ev.currentTarget; btn.disabled = true; btn.innerHTML = pkIcon(20) + esc(PK.t('pay'));
      PK.get(pk).then(() => {
        track('passkey_login', { tipo: PK.kind(), paso: 'pago' });
        pay();
      }, (err) => {
        track('passkey_fallo', { paso: 'pago', error: (err && err.name) || 'error' });
        toast(t('useWa'));
        sendOtp(me.phone, pay);
      });
      return;
    }
    pay();
  });
};

// ---------- Abrir / cerrar ----------
let lastFocus = null, prevOverflow = '';
function open() {
  if (!READY.done) { Brinco.ready(open); return; }
  const c = cart();
  if (!c || !(c.items() || []).length) { toast(t('emptyCart')); return; }
  ensureRoot();
  lastFocus = document.activeElement;
  try { if (c.close) c.close(); } catch (e) {}
  root.classList.add('bk-open');
  document.documentElement.classList.add('bk-open');
  prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  track('checkout', { total: totals().total });
  S.hist = []; S.view = null;
  VIEWS.checkout({ replace: true });
  document.dispatchEvent(new CustomEvent('brinco:checkout-open'));
}
function close() {
  if (!root) return;
  root.classList.remove('bk-open');
  document.documentElement.classList.remove('bk-open');
  document.body.style.overflow = prevOverflow || '';
  hideWa();
  S.pendingPay = null;
  if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  document.dispatchEvent(new CustomEvent('brinco:checkout-close'));
}
Brinco.checkout = open;
Brinco.closeCheckout = close;
Brinco._ui.isOpen = () => !!(root && root.classList.contains('bk-open'));

/* --- src/modules/header.js --- */
(function () {
/* Brinco Kit · módulos: utilidades compartidas (encabezado fijo, pie, escape, horas, avisos).
   Se comparten por window.__bkm para funcionar igual si build.sh envuelve cada archivo o no. */
(function () {
  var M = window.__bkm = window.__bkm || {};
  // Base del kit (…/v1/) a partir del <script src=".../kit.js">
  var sc = document.currentScript && /kit(\.min)?\.js/.test(document.currentScript.src) ? document.currentScript : null;
  if (!sc) { var all = document.querySelectorAll('script[src]'); for (var i = all.length - 1; i >= 0; i--) if (/\/kit(\.min)?\.js(\?|$)/.test(all[i].src)) { sc = all[i]; break; } }
  M.script = sc;
  M.base = sc ? sc.src.replace(/kit(\.min)?\.js.*$/, '') : '/v1/';

  M.B = function () { return window.Brinco || {}; };
  M.cfg = function () { return (window.Brinco && window.Brinco.config) || {}; };
  M.ready = function (fn) {
    var run = function () { try { fn(); } catch (e) { if (window.console) console.error('[brinco]', e); } };
    if (window.Brinco && typeof window.Brinco.ready === 'function') window.Brinco.ready(run);
    else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  };
  M.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  M.fmt = function (n) {
    var B = M.B(); if (typeof B.fmt === 'function') return B.fmt(n);
    return (M.cfg().moneda || 'RD$') + ' ' + Math.round(n || 0).toLocaleString('es-DO');
  };
  M.track = function (n, d) { var B = M.B(); if (typeof B.track === 'function') { try { B.track(n, d || {}); } catch (e) {} } };
  M.hhmm = function (t) { return new Date(t).toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' }); };
  M.digits = function (s) { return String(s || '').replace(/\D/g, ''); };
  M.fmtPhone = function (s) { var d = M.digits(s); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 ? d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6) : d; };
  M.get = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  M.name = function () { var c = M.cfg(); return c.nombreLegal || c.nombre || 'Tienda'; };
  M.short = function () { var c = M.cfg(); return c.nombre || c.nombreLegal || 'Tienda'; };
  M.dominio = function () { return M.cfg().dominio || location.host; };
  M.producto = function (n) { var p = M.cfg().producto || {}; return n === 1 ? (p.singular || 'producto') : (p.plural || 'productos'); };

  // Encabezado fijo con el logo del negocio y un botón a la derecha
  M.header = function (label, href, extra) {
    var c = M.cfg();
    var logo = c.logo ? '<img src="' + M.esc(c.logo) + '" alt="' + M.esc(M.name()) + ', inicio">' : '<span class="bk-hd-name">' + M.esc(M.short()) + '</span>';
    return '<header class="bk-hd"><div class="bk-hd-in"><a class="bk-hd-logo" href="/" aria-label="' + M.esc(M.name()) + ', inicio">' + logo + '</a>' +
      (extra || '') + (label ? '<a class="bk-hd-btn" href="' + M.esc(href || '/') + '">' + M.esc(label) + '</a>' : '') + '</div></header>';
  };
  M.vaultLine = 'Brinco no guarda tarjetas: las protege tu procesador de pago (AZUL, CardNet o MIO).';
  M.footer = function () {
    return '<footer class="bk-ft"><nav aria-label="Legal"><a href="/seguridad/">Políticas de seguridad</a> · <a href="/privacidad/">Privacidad</a> · <a href="/terminos/">Términos y entregas</a></nav>' +
      '<p data-brinco="vault-footer"></p><p>© ' + new Date().getFullYear() + ' ' + M.esc(M.name()) + '</p></footer>';
  };

  // Toast y notificación tipo WhatsApp: usa los de core si existen, si no, unos propios
  function el(id, cls, html) {
    var n = document.getElementById(id);
    if (!n) { n = document.createElement('div'); n.id = id; n.className = cls; n.setAttribute('role', 'status'); n.setAttribute('aria-live', 'polite'); n.innerHTML = html || ''; document.body.appendChild(n); }
    return n;
  }
  var tT, wT;
  M.toast = function (m) {
    var B = M.B(); if (B._ui && typeof B._ui.toast === 'function') return B._ui.toast(m);
    var t = el('bkm-toast', 'bk-m-toast'); t.textContent = m; t.classList.add('bk-show');
    clearTimeout(tT); tT = setTimeout(function () { t.classList.remove('bk-show'); }, 2600);
  };
  M.waIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"/></svg>';
  M.waNote = function (m) {
    var B = M.B(); if (B._ui && typeof B._ui.waNote === 'function') return B._ui.waNote(m);
    var n = el('bkm-wa', 'bk-m-wa', '<span class="bk-m-wa-ic">' + M.waIcon + '</span><div class="bk-m-wa-tx"><div class="bk-m-wa-top"><b></b><small>ahora</small></div><p></p></div>');
    n.querySelector('b').textContent = M.short(); n.querySelector('p').textContent = m; n.classList.add('bk-show');
    clearTimeout(wT); wT = setTimeout(function () { n.classList.remove('bk-show'); }, 4200);
  };
  // Llena los pies "Brinco no guarda tarjetas" vacíos: con el de core si existe, si no con texto simple
  M.fillVault = function (root) {
    var B = M.B();
    if (B._vault && typeof B._vault.fill === 'function') { try { B._vault.fill(root || document); return; } catch (e) {} }
    (root || document).querySelectorAll('[data-brinco="vault-footer"]').forEach(function (p) {
      if (p.getAttribute('data-bk-filled') || p.textContent.trim()) return;
      p.setAttribute('data-bk-filled', '1'); p.textContent = M.vaultLine;
    });
  };
  M.setTitle = function (t) { document.title = t + ' | ' + M.name(); };
})();
})();

/* --- src/modules/legal.js --- */
(function () {
/* Brinco Kit · páginas legales: [data-brinco="legal" data-doc="seguridad|privacidad|terminos"]
   Textos de PIEZZA generalizados con el nombre, dominio, contacto y entregas de brinco.json. */
(function () {
  var M = window.__bkm; if (!M) return;
  var UPD = '14 de octubre de 2026';
  function img(n) { var B = M.B(); return typeof B._img === 'function' ? B._img(n) : M.base + 'img/' + n; }
  function contacto() {
    var c = M.cfg().contacto || {}, t = M.cfg().tienda || {};
    var ciudad = t.ciudad || 'Santo Domingo';
    var lines = [M.esc(M.name()), M.esc(c.direccion || t.direccion || '[Dirección del local]') + (ciudad ? ', ' + M.esc(ciudad) + ', R.D.' : '')];
    if (c.telefono) lines.push(M.esc(c.telefono));
    if (c.correo) lines.push(/@/.test(c.correo) ? '<a href="mailto:' + M.esc(c.correo) + '">' + M.esc(c.correo) + '</a>' : M.esc(c.correo));
    if (c.instagram) lines.push('Instagram: ' + M.esc(c.instagram));
    return '<h2>Contacto</h2><p>' + lines.join('<br>') + '</p>';
  }
  var DOCS = {
    seguridad: {
      t: 'Políticas de seguridad para la transmisión de datos de tarjetas',
      d: function (n) { return 'Cómo ' + n + ' y AZUL protegen los datos de tu tarjeta.'; },
      body: function (n, dom) {
        return '<div class="bk-lg-badges"><span><img src="' + img('visa.webp') + '" alt="Visa"></span><span><img src="' + img('mastercard.webp') + '" alt="Mastercard"></span><span><img src="' + img('visa-secure.webp') + '" alt="Visa Secure"></span><span><img src="' + img('mastercard-id-check.webp') + '" alt="Mastercard ID Check"></span></div>' +
          '<h2>Website</h2><p>Tomamos todas las medidas y precauciones razonables para proteger tu información personal y seguimos las mejores prácticas de la industria para asegurar que no sea usada de manera inapropiada, alterada o destruida. Todo el sitio ' + dom + ' usa conexión cifrada HTTPS (TLS).</p>' +
          '<h2>Datos de tu tarjeta</h2><p>Los datos de tu tarjeta se escriben directamente en los campos seguros de AZUL (Servicios Digitales Popular), que cifran la transmisión con TLS y cumplen con los requerimientos de PCI DSS. ' + n + ' no recibe ni almacena el número completo de la tarjeta ni el código de seguridad (CVV). Solo conservamos la marca, los últimos 4 dígitos, el código de autorización y la referencia de la transacción.</p>' +
          '<h2>Brinco no guarda tarjetas</h2><p>Brinco nunca guarda el número de tu tarjeta ni su código de seguridad. Si autorizas guardar tu tarjeta en tu Cuenta Brinco, la tarjeta queda guardada y protegida por el procesador de pago certificado PCI DSS que procesa la compra: <b>AZUL</b>, <b>CardNet</b> o <b>MIO</b>. Brinco recibe solo un identificador seguro (token), que no permite reconstruir el número y no sirve fuera de tu cuenta. Puedes borrar tu tarjeta o tu cuenta en cualquier momento.</p>' +
          '<h2>Face ID y huella</h2><p>Si activas Face ID o tu huella para entrar a Brinco, la biometría nunca sale de tu teléfono: tu equipo solo confirma que eres tú con una llave segura (passkey). Ni ' + n + ' ni Brinco ven tu cara ni tu huella.</p>' +
          '<h2>3D Secure</h2><p>Las compras pueden requerir autenticación adicional del banco emisor mediante Visa Secure y Mastercard ID Check, que protege contra el uso no autorizado de tu tarjeta.</p>' +
          '<h2>Pagos</h2><p>Los métodos de pago usados por ' + n + ' son servicios de terceros (AZUL) que cumplen con todos los estándares de seguridad y cifrado para mantener tu información segura. Solo usan la información necesaria para completar el pago. Te recomendamos leer también las políticas de privacidad de estos proveedores.</p>';
      }
    },
    privacidad: {
      t: 'Política de privacidad',
      d: function (n) { return 'Qué datos recoge ' + n + ' y para qué.'; },
      body: function (n) {
        return '<h2>Qué datos usamos</h2><p>Para preparar y entregar tu pedido usamos tu nombre, tu número de WhatsApp y, si pides delivery, tu dirección y referencia. Del pago solo conservamos la marca, los últimos 4 dígitos de la tarjeta y la autorización del banco.</p>' +
          '<h2>Cómo llegaste a la tienda</h2><p>Guardamos por cuál de nuestros enlaces entraste (por ejemplo, Instagram o un anuncio) para saber qué canales funcionan. No usamos esa información para identificarte fuera de nuestra tienda.</p>' +
          '<h2>Cuenta Brinco</h2><p>Si lo autorizas con la casilla correspondiente, tus datos y tu tarjeta se guardan en tu Cuenta Brinco para pagar con un toque en negocios Brinco. Brinco no guarda el número de tu tarjeta: la protege tu procesador de pago (AZUL, CardNet o MIO). Cada permiso queda registrado con la fecha y el texto que aceptaste. ' + n + ' solo ve los datos de los pedidos que le haces a ' + n + ', nunca tus compras en otros negocios.</p>' +
          '<h2>Mensajes</h2><p>Te escribimos por WhatsApp para avisarte del estado de tu pedido. Solo te enviamos promociones si lo aceptas, y puedes retirarlo cuando quieras.</p>' +
          '<h2>Tus derechos</h2><p>Puedes pedir una copia de tus datos, corregirlos o borrarlos escribiéndonos. Tratamos tus datos conforme a la Ley 172-13 sobre protección de datos de carácter personal.</p>';
      }
    },
    terminos: {
      t: 'Términos, entregas y devoluciones',
      d: function (n) { return 'Condiciones de compra, entrega y reembolso de ' + n + '.'; },
      body: function (n) {
        var c = M.cfg(), e = c.entrega || {}, envio = +c.envio || 0;
        var deliv = e.delivery !== false, pick = e.pickup !== false;
        var dMin = e.deliveryMin || 35, dMax = e.deliveryMax || 45, pMin = e.pickupMin || 20;
        var ent = '';
        if (deliv) ent += 'Hacemos delivery en los sectores que aparecen al pagar, ' + (envio ? 'con un cargo de envío de ' + M.esc(M.fmt(envio)) : 'sin cargo de envío') + '. El tiempo estimado es de ' + dMin + ' a ' + dMax + ' minutos y puede variar según el tráfico y la demanda.';
        if (pick) ent += (deliv ? ' Si prefieres, puedes' : 'Puedes') + ' recoger tu pedido en la tienda sin costo; normalmente está listo en unos ' + pMin + ' minutos.';
        var prod = M.producto(1);
        return '<h2>Pedidos y precios</h2><p>Los precios se muestran en pesos dominicanos (' + M.esc(c.moneda || 'RD$') + ') e incluyen ITBIS. El pedido se confirma cuando el banco aprueba el pago; recibirás el número de orden en pantalla y un aviso por WhatsApp.</p>' +
          '<h2>Entregas</h2><p>' + ent + '</p>' +
          '<h2>Cancelaciones</h2><p>Puedes cancelar sin cargo mientras no hayamos empezado a preparar tu ' + M.esc(prod) + '. Escríbenos por WhatsApp con tu número de orden.</p>' +
          '<h2>Reembolsos</h2><p>Si tu pedido llega incompleto, equivocado o en mal estado, escríbenos el mismo día con una foto y tu número de orden. Te reponemos el producto o hacemos el reembolso a la misma tarjeta; el reembolso puede tardar de 7 a 15 días hábiles en reflejarse, según tu banco.</p>';
      }
    }
  };

  M.ready(function () {
    var root = document.querySelector('[data-brinco="legal"]'); if (!root || root.dataset.bkDone) return;
    root.dataset.bkDone = '1';
    var key = root.getAttribute('data-doc'); if (!DOCS[key]) key = (location.pathname.match(/(seguridad|privacidad|terminos)/) || [])[1] || 'seguridad';
    var D = DOCS[key], n = M.esc(M.name()), dom = M.esc(M.dominio());
    document.documentElement.classList.add('bk-page', 'bk-white');
    document.title = D.t + ' | ' + M.name();
    var md = document.querySelector('meta[name="description"]');
    if (!md) { md = document.createElement('meta'); md.name = 'description'; document.head.appendChild(md); }
    if (!md.content) md.content = D.d(M.name());
    root.classList.add('bk-lg');
    root.insertAdjacentHTML('beforebegin', M.header('Volver a la tienda', '/').replace('class="bk-hd"', 'class="bk-hd bk-hd-legal"'));
    root.innerHTML = '<span class="bk-lg-tag">LEGAL</span><h1>' + D.t + '</h1><p class="bk-lg-upd">Última actualización: ' + UPD + '</p>' + D.body(n, dom) + contacto();
    root.insertAdjacentHTML('afterend', '<div class="bk-lg-foot">' + M.footer() + '</div>');
    M.fillVault(root.nextElementSibling);
  });
})();
})();

/* --- src/modules/links.js --- */
(function () {
/* Brinco Kit · links cortos (/ig/ /ad/ /fb/ /tt/ /wa/): el <script> del kit trae data-link="ig".
   Registra clic_link con el origen del link y redirige a /?src=ig. Corre al cargar, sin esperar el config. */
(function () {
  var M = window.__bkm || {};
  var sc = M.script || document.currentScript;
  if (!sc || !sc.getAttribute) { var all = document.querySelectorAll('script[data-link]'); sc = all[all.length - 1]; }
  var key = sc && sc.getAttribute && sc.getAttribute('data-link');
  if (!key) return;
  key = String(key).toLowerCase().replace(/[^a-z0-9_-]/g, '');
  // Igual que track.js de PIEZZA (core lo expone en Brinco._links)
  var LINKS = (window.Brinco && window.Brinco._links) || {
    ig: { source: 'Instagram · bio', medium: 'organico' },
    ad: { source: 'Anuncio Meta', medium: 'pagado' },
    fb: { source: 'Facebook · perfil', medium: 'organico' },
    tt: { source: 'TikTok · bio', medium: 'organico' },
    wa: { source: 'WhatsApp', medium: 'organico' }
  };
  var L = LINKS[key];
  if (L) {
    try {
      var ev = JSON.parse(localStorage.getItem('brinco_events') || '[]');
      ev.push({ e: 'clic_link', t: Date.now(), sid: 'link', src: L.source, med: L.medium, d: { link: '/' + key } });
      localStorage.setItem('brinco_events', JSON.stringify(ev.slice(-2000)));
    } catch (e) {}
  }
  // Conserva utm_*, fbclid, etc. que traiga el link
  var q = location.search ? location.search.slice(1) + '&' : '';
  location.replace(L ? '/?' + q + 'src=' + key : '/' + location.search);
})();
})();

/* --- src/modules/panel.js --- */
(function () {
/* Brinco Kit · /panel/: ventas y origen de clientes (orgánico vs. pagado), embudo, Brinco, Face ID, pedidos y links.
   Monta en [data-brinco="panel"]. Lee brinco_events y brinco_orders de este equipo. */
(function () {
  var M = window.__bkm; if (!M) return;
  var LINKS = [
    ['ig', 'Bio de Instagram · orgánico'],
    ['ad', 'Anuncios de Meta · pagado'],
    ['fb', 'Perfil de Facebook · orgánico'],
    ['tt', 'Bio de TikTok · orgánico'],
    ['wa', 'Estados y chats de WhatsApp · orgánico']
  ];
  var BRAND = { visa: 'Visa', mastercard: 'MC', amex: 'Amex' };
  function pct(a, b) { return b ? Math.round(a * 1000 / b) / 10 + '%' : '—'; }
  function isPaid(m) { return m === 'pagado'; }
  function uniq(arr) { var s = {}, n = 0; arr.forEach(function (x) { if (!s[x]) { s[x] = 1; n++; } }); return n; }

  function shell(root) {
    var d = M.dominio();
    root.innerHTML =
      '<h1 class="bk-pn-h1">Ventas y origen de clientes</h1>' +
      '<p class="bk-pn-sub">' + M.esc(M.short()) + ': de dónde llegan, cuántos compran y cuánto vende cada canal, orgánico y pagado.</p>' +
      '<div class="bk-pn-seg" role="group" aria-label="Periodo">' +
        '<button type="button" data-p="1" aria-pressed="false">Hoy</button><button type="button" data-p="7" aria-pressed="false">7 días</button>' +
        '<button type="button" data-p="30" aria-pressed="false">30 días</button><button type="button" data-p="0" aria-pressed="true">Todo</button></div>' +
      '<section class="bk-pn-kpis" aria-label="Resumen">' +
        '<div class="bk-pn-k"><span>Clics en links</span><b data-k="clicks">0</b><small data-k="clicksS">&nbsp;</small></div>' +
        '<div class="bk-pn-k"><span>Visitas</span><b data-k="visits">0</b><small data-k="visitsS">&nbsp;</small></div>' +
        '<div class="bk-pn-k"><span>Compras</span><b data-k="buys">0</b><small data-k="conv">&nbsp;</small></div>' +
        '<div class="bk-pn-k"><span>Ventas</span><b data-k="rev">' + M.fmt(0) + '</b><small data-k="aov">&nbsp;</small></div>' +
      '</section>' +
      '<div class="bk-pn-grid2">' +
        '<section class="bk-pn-card"><h2 class="bk-pn-h2">Embudo de compra</h2><div class="bk-pn-fun" data-k="funnel"></div>' +
          '<div class="bk-pn-leg"><span><i class="bk-pn-o"></i>Orgánico</span><span><i class="bk-pn-pd"></i>Pagado (anuncios)</span></div>' +
          '<p class="bk-pn-note">Cada paso cuenta personas (sesiones únicas), no clics repetidos.</p></section>' +
        '<section class="bk-pn-card"><h2 class="bk-pn-h2">Orgánico vs. pagado</h2><div class="bk-pn-split" data-k="split"></div>' +
          '<div class="bk-pn-bz" data-k="brinco"></div><div class="bk-pn-bz" data-k="pk"></div></section>' +
      '</div>' +
      '<section class="bk-pn-card bk-pn-mt"><h2 class="bk-pn-h2">Por origen</h2><div class="bk-pn-scroll"><table class="bk-pn-tbl"><thead><tr><th>Origen</th><th>Tipo</th><th class="bk-pn-n">Visitas</th><th class="bk-pn-n">Carrito</th><th class="bk-pn-n">Pago</th><th class="bk-pn-n">Compras</th><th class="bk-pn-n">Ventas</th><th class="bk-pn-n">Conversión</th></tr></thead><tbody data-k="bySrc"></tbody></table></div></section>' +
      '<section class="bk-pn-card bk-pn-mt"><h2 class="bk-pn-h2">Últimos pedidos</h2><div class="bk-pn-scroll"><table class="bk-pn-tbl"><thead><tr><th>Orden</th><th>Fecha</th><th>Cliente</th><th>Entrega</th><th>Pago</th><th>Origen</th><th class="bk-pn-n">Total</th></tr></thead><tbody data-k="orders"></tbody></table></div></section>' +
      '<section class="bk-pn-card bk-pn-mt"><h2 class="bk-pn-h2">Tus links</h2><div class="bk-pn-links">' +
        LINKS.map(function (l) { return '<div class="bk-pn-lk"><code>' + M.esc(d) + '/' + l[0] + '</code><small>' + l[1] + '</small></div>'; }).join('') +
      '</div></section>' +
      '<p class="bk-pn-foot">Cada visita queda marcada con el link por donde entró, y cada pedido pagado guarda ese origen. Datos de este equipo (demo).</p>';
  }

  function render(root, days) {
    var $ = function (k) { return root.querySelector('[data-k="' + k + '"]'); };
    var since = days ? Date.now() - days * 864e5 : 0;
    var ev = M.get('brinco_events', []).filter(function (e) { return e && e.t >= since; });
    var orders = M.get('brinco_orders', []).filter(function (o) { return o && o.at >= since; }).sort(function (a, b) { return a.at - b.at; });
    var clicks = ev.filter(function (e) { return e.e === 'clic_link'; });
    var visits = ev.filter(function (e) { return e.e === 'visita'; });
    var count = function (name, paid) { return ev.filter(function (e) { return e.e === name && (paid == null || isPaid(e.med) === paid); }).length; };
    var buyers = function (paid) { return uniq(ev.filter(function (e) { return e.e === 'compra' && (paid == null || isPaid(e.med) === paid); }).map(function (e) { return e.sid; })); };
    var visitors = function (paid) { return uniq(visits.filter(function (e) { return paid == null || isPaid(e.med) === paid; }).map(function (e) { return e.sid; })); };

    $('clicks').textContent = clicks.length;
    var cp = clicks.filter(function (c) { return isPaid(c.med); }).length;
    $('clicksS').textContent = clicks.length ? (clicks.length - cp) + ' orgánicos · ' + cp + ' pagados' : 'Aún sin clics';
    $('visits').textContent = visits.length;
    $('visitsS').textContent = visits.length ? uniq(visits.map(function (v) { return v.src; })) + ' orígenes distintos' : ' ';
    $('buys').textContent = orders.length;
    $('conv').textContent = 'Conversión ' + pct(buyers(), visitors());
    var rev = orders.reduce(function (a, o) { return a + (o.total || 0); }, 0);
    $('rev').textContent = M.fmt(rev);
    $('aov').textContent = orders.length ? 'Ticket promedio ' + M.fmt(rev / orders.length) : ' ';

    // Embudo: personas (sesiones únicas) por paso, divididas orgánico / pagado
    var steps = [['Visitas', 'visita'], ['Agregaron al carrito', 'carrito'], ['Abrieron el pago', 'checkout'], ['Enviaron el pago', 'pago_enviado'], ['Compraron', 'compra']];
    var people = function (name, paid) { return uniq(ev.filter(function (e) { return e.e === name && isPaid(e.med) === paid; }).map(function (e) { return e.sid; })); };
    var top = Math.max.apply(null, [1].concat(steps.map(function (s) { return people(s[1], true) + people(s[1], false); })));
    $('funnel').innerHTML = steps.map(function (s) {
      var p = people(s[1], true), o = people(s[1], false);
      return '<div class="bk-pn-fr"><span>' + s[0] + '</span><span class="bk-pn-track" role="img" aria-label="' + s[0] + ': ' + o + ' orgánico, ' + p + ' pagado"><i class="bk-pn-o" style="width:' + (o / top * 100) + '%"></i><i class="bk-pn-pd" style="width:' + (p / top * 100) + '%"></i></span><b>' + (p + o) + '</b></div>';
    }).join('');

    var block = function (paid) {
      var v = count('visita', paid), b = orders.filter(function (x) { return isPaid(x.med) === paid; }), r = b.reduce(function (a, x) { return a + (x.total || 0); }, 0);
      return '<div class="bk-pn-sp ' + (paid ? 'bk-pn-pd' : 'bk-pn-o') + '"><span class="bk-pn-pill ' + (paid ? 'bk-pn-pd' : 'bk-pn-o') + '">' + (paid ? 'Pagado' : 'Orgánico') + '</span>' +
        '<div class="bk-pn-v">' + M.fmt(r) + '</div><div class="bk-pn-m">' + v + ' visitas · ' + b.length + ' compras<br>Conversión ' + pct(buyers(paid), visitors(paid)) + '</div></div>';
    };
    $('split').innerHTML = block(false) + block(true);
    var bz = orders.filter(function (o) { return o.via === 'brinco'; }).length, newAcc = orders.filter(function (o) { return o.brincoNew; }).length;
    $('brinco').innerHTML = '<span class="bk-pn-bword">brinco</span><div class="bk-pn-m"><b>' + pct(bz, orders.length) + '</b> de las compras se pagaron con un toque en Brinco · ' + newAcc + ' cuenta' + (newAcc === 1 ? '' : 's') + ' Brinco nueva' + (newAcc === 1 ? '' : 's') + '</div>';

    // Face ID / huella (passkeys)
    var act = ev.filter(function (e) { return e.e === 'passkey_activada'; });
    var logins = count('passkey_login'), fails = count('passkey_fallo');
    var kinds = {}; act.forEach(function (e) { var k = (e.d && e.d.tipo) || 'Face ID / huella'; kinds[k] = (kinds[k] || 0) + 1; });
    var here = M.get('brinco_passkey', null);
    $('pk').innerHTML = '<span class="bk-pn-pk">Face ID / huella</span><div class="bk-pn-m"><b>' + act.length + '</b> activado' + (act.length === 1 ? '' : 's') +
      (Object.keys(kinds).length ? ' (' + Object.keys(kinds).map(function (k) { return M.esc(k) + ': ' + kinds[k]; }).join(', ') + ')' : '') +
      ' · <b>' + logins + '</b> entrada' + (logins === 1 ? '' : 's') + ' o pago' + (logins === 1 ? '' : 's') + ' con un toque · ' + fails + ' cancelado' + (fails === 1 ? '' : 's') +
      '<br>Este equipo: ' + (here ? 'Face ID activo para ' + M.esc(M.fmtPhone(here.phone)) : 'sin Face ID') + '</div>';

    // Por origen
    var srcs = {};
    var row = function (src, med) { var k = src + '|' + med; return srcs[k] = srcs[k] || { src: src, med: med, visita: 0, carrito: 0, checkout: 0, compra: 0, rev: 0, vs: {}, bs: {} }; };
    ev.forEach(function (e) { if (e.e === 'clic_link') return; var r = row(e.src, e.med); if (r[e.e] != null && e.e !== 'rev') r[e.e]++; if (e.e === 'visita') r.vs[e.sid] = 1; if (e.e === 'compra') r.bs[e.sid] = 1; });
    orders.forEach(function (o) { row(o.src, o.med).rev += o.total || 0; });
    var rows = Object.keys(srcs).map(function (k) { return srcs[k]; }).sort(function (a, b) { return b.rev - a.rev || b.visita - a.visita; });
    $('bySrc').innerHTML = rows.length ? rows.map(function (r) {
      return '<tr><td>' + M.esc(r.src || 'Directo') + '</td><td><span class="bk-pn-pill ' + (isPaid(r.med) ? 'bk-pn-pd' : 'bk-pn-o') + '">' + (isPaid(r.med) ? 'Pagado' : 'Orgánico') + '</span></td><td class="bk-pn-n">' + r.visita + '</td><td class="bk-pn-n">' + r.carrito + '</td><td class="bk-pn-n">' + r.checkout + '</td><td class="bk-pn-n">' + r.compra + '</td><td class="bk-pn-n">' + M.fmt(r.rev) + '</td><td class="bk-pn-n">' + pct(Object.keys(r.bs).length, Object.keys(r.vs).length) + '</td></tr>';
    }).join('') : '<tr><td colspan="8" class="bk-pn-empty">Todavía no hay visitas en este periodo.</td></tr>';

    var list = orders.slice().reverse().slice(0, 25);
    $('orders').innerHTML = list.length ? list.map(function (o) {
      var c = o.card || {};
      return '<tr><td><a href="/pedido/?o=' + encodeURIComponent(o.no) + '"><b>' + M.esc(o.no) + '</b></a></td><td>' + new Date(o.at).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' }) + '</td><td>' + M.esc(o.name) + '</td>' +
        '<td>' + (o.mode === 'pickup' ? 'Recoger' : 'Delivery' + (o.address && o.address.sector ? ' · ' + M.esc(o.address.sector) : '')) + '</td>' +
        '<td>' + (o.via === 'brinco' ? '<span class="bk-pn-pill bk-pn-brinco">Brinco</span> ' : '') + (BRAND[c.brand] || 'Tarjeta') + ' ' + M.esc(c.last4) + '</td>' +
        '<td><span class="bk-pn-pill ' + (isPaid(o.med) ? 'bk-pn-pd' : 'bk-pn-o') + '">' + M.esc(o.src || 'Directo') + '</span></td><td class="bk-pn-n">' + M.fmt(o.total) + '</td></tr>';
    }).join('') : '<tr><td colspan="7" class="bk-pn-empty">Todavía no hay pedidos en este periodo.</td></tr>';
  }

  function wipe() {
    var ks = [];
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^(brinco_|pz_)/.test(k)) ks.push(k); } } catch (e) {}
    ks.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    try { localStorage.setItem('brinco_migrated', JSON.stringify(Date.now())); } catch (e) {}
    try { sessionStorage.removeItem('brinco_sid'); } catch (e) {}
    // Cookies de la cuenta Brinco compartida (.sandscap.com.do) y del propio sitio
    var parts = location.hostname.split('.'), doms = [''];
    for (var j = 0; j < parts.length - 1; j++) doms.push('; domain=.' + parts.slice(j).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var n = c.split('=')[0].trim(); if (!/^brinco_/.test(n)) return;
      doms.forEach(function (d) { document.cookie = n + '=; path=/; max-age=0' + d + (location.protocol === 'https:' ? '; secure' : ''); });
    });
  }

  M.ready(function () {
    var root = document.querySelector('[data-brinco="panel"]'); if (!root || root.dataset.bkDone) return;
    root.dataset.bkDone = '1';
    root.classList.add('bk-pn');
    document.documentElement.classList.add('bk-page', 'bk-panel-page');
    document.title = 'Panel ' + M.short() + ' · Ventas y origen';
    var tools = '<div class="bk-pn-tools"><button type="button" data-bk="refresh">Actualizar</button><a href="/">Ver tienda</a><button type="button" data-bk="reset">Borrar datos</button></div>';
    root.insertAdjacentHTML('beforebegin', M.header('', '', tools).replace('class="bk-hd"', 'class="bk-hd bk-hd-wide"'));
    shell(root);
    var hd = root.previousElementSibling;
    var days = 0;
    var go = function () { render(root, days); };
    root.querySelectorAll('[data-p]').forEach(function (b) {
      b.addEventListener('click', function () {
        days = +b.dataset.p;
        root.querySelectorAll('[data-p]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        go();
      });
    });
    hd.querySelector('[data-bk="refresh"]').addEventListener('click', function () { go(); M.toast('Panel actualizado'); });
    hd.querySelector('[data-bk="reset"]').addEventListener('click', function () {
      if (!confirm('¿Borrar las estadísticas, pedidos y cuentas Brinco guardados en este equipo?')) return;
      wipe(); go(); M.toast('Datos borrados');
    });
    window.addEventListener('storage', go);
    go();
  });
})();
})();

/* --- src/modules/pedido.js --- */
(function () {
/* Brinco Kit · /pedido/: seguimiento en vivo de un pedido (?o=NO), "Mis pedidos" y búsqueda.
   Monta en [data-brinco="pedido"]. Usa Brinco.orders (core) para el estado. */
(function () {
  var M = window.__bkm; if (!M) return;
  var RIDERS = [
    { name: 'Luis Martínez', moto: 'Honda roja · A845221', ini: 'LM' },
    { name: 'Yeison Peña', moto: 'Yamaha negra · K301774', ini: 'YP' },
    { name: 'Carlos Abreu', moto: 'Suzuki roja · N552390', ini: 'CA' }
  ];
  function rider(o) { var h = 0; String(o.no).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return RIDERS[h % RIDERS.length]; }
  var CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var I_PHONE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>';
  var I_WA = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z"/></svg>';
  var I_GO = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8z"/></svg>';
  var PATH = 'M70 250 L70 170 L190 170 L190 95 L330 95 L330 150 L455 150 L455 70 L560 70';
  var BRANDS = { visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex' };

  function O() { return (window.Brinco && window.Brinco.orders) || null; }
  function allOrders() { var o = O(); var l = o && o.all ? o.all() : M.get('brinco_orders', []); return (l || []).slice().sort(function (a, b) { return b.at - a.at; }); }
  function findOrder(no) {
    var o = O(); if (o && o.find) return o.find(no);
    no = String(no || '').trim().toUpperCase(); return allOrders().filter(function (x) { return x.no === no; })[0] || null;
  }
  function status(o) { return O().status(o); }
  function ent() { var e = M.cfg().entrega || {}; return { dMin: e.deliveryMin || 35, dMax: e.deliveryMax || 45, pMin: e.pickupMin || 20 }; }
  function tienda() { return M.cfg().tienda || {}; }
  function mapsUrl() {
    var t = tienda(); if (t.mapa) return t.mapa;
    var q = [t.direccion, t.ciudad || 'Santo Domingo'].filter(Boolean).join(', ');
    return 'https://maps.google.com/?q=' + encodeURIComponent(q || M.name());
  }
  function streetLabel(s) { return String(s || '').split(',')[0].replace(/\s+#?\d+[A-Za-z]?$/, '').slice(0, 28); }
  function isRoad(s) { return s && (s.k === 'camino' || /camino/i.test(s.label || '')); }

  function mapSVG(o) {
    var pick = o.mode === 'pickup';
    var st = streetLabel(tienda().direccion) || 'Tu tienda';
    var home = pick ? '' : streetLabel(o.address && o.address.street);
    return '<svg viewBox="0 0 640 400" role="img" aria-label="' + (pick ? 'Ubicación de la tienda' : 'Ruta de tu pedido') + '">' +
      '<rect width="640" height="400" fill="#F3EEE9"/>' +
      '<g fill="#E8E0D9"><rect x="0" y="0" width="50" height="150"/><rect x="90" y="0" width="80" height="150"/><rect x="210" y="0" width="100" height="75"/><rect x="350" y="0" width="85" height="130"/><rect x="475" y="0" width="165" height="50"/><rect x="475" y="90" width="165" height="120"/><rect x="0" y="190" width="50" height="210"/><rect x="90" y="190" width="220" height="80"/><rect x="350" y="170" width="85" height="100"/><rect x="90" y="300" width="400" height="100"/><rect x="520" y="230" width="120" height="170"/></g>' +
      '<rect x="210" y="115" width="100" height="35" rx="6" fill="#D9EDD3"/><rect x="350" y="300" width="70" height="60" rx="6" fill="#D9EDD3"/>' +
      '<g stroke="#fff" stroke-width="20" fill="none" stroke-linecap="square"><path d="M70 0V400M190 0V290M330 0V290M455 0V290M0 170H640M0 95H640M0 290H640M500 70H640"/></g>' +
      '<text x="96" y="285" font-size="13" fill="#A69A94" font-family="system-ui,sans-serif">' + M.esc(st) + '</text>' +
      (home ? '<text x="470" y="166" font-size="13" fill="#A69A94" font-family="system-ui,sans-serif">' + M.esc(home) + '</text>' : '') +
      (pick ? '' : '<path d="' + PATH + '" fill="none" stroke="var(--bk-brand,#B3172E)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 12" opacity=".55"/>') +
      '<g transform="translate(70 250)"><circle r="20" fill="var(--bk-brand,#B3172E)"/><path d="M-8 -6l16 0 -8 14z" fill="#fff"/></g>' +
      (pick ? '' : '<g transform="translate(560 70)"><circle r="20" fill="var(--bk-ink,#241A17)"/><path d="M-8 2l8-8 8 8v8h-16z" fill="#fff"/></g>') +
      (pick ? '' : '<g class="bk-p-rdot" style="display:none"><circle r="16" fill="#fff" stroke="var(--bk-brand,#B3172E)" stroke-width="4"/><circle r="6" fill="var(--bk-brand,#B3172E)"/></g>') +
      '</svg>';
  }
  var pathEl = null;
  function placeRider(root, s) {
    var g = root.querySelector('.bk-p-rdot'); if (!g) return;
    if (!pathEl) { pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path'); pathEl.setAttribute('d', PATH); }
    var L = pathEl.getTotalLength();
    var k = isRoad(s.stage) ? s.part : (s.done ? 1 : 0);
    var pt = pathEl.getPointAtLength(L * k);
    g.setAttribute('transform', 'translate(' + pt.x + ' ' + pt.y + ')');
    g.style.display = (isRoad(s.stage) || s.done) ? '' : 'none';
  }

  var timer = null;
  function renderOrder(root, o) {
    var app = root.querySelector('.bk-p-app');
    M.track('seguimiento', { orden: o.no });
    M.setTitle('Pedido ' + o.no);
    var r = rider(o), e = ent(), pick = o.mode === 'pickup', t = tienda(), c = M.cfg();
    var card = o.card || {};
    var itemsHtml = (o.items || []).map(function (it) {
      return '<div class="bk-p-l"><span>' + it.qty + ' × ' + M.esc(it.name) + (it.detail ? ' <small>· ' + M.esc(it.detail) + '</small>' : '') + '</span><span>' + M.fmt(it.qty * it.unit) + '</span></div>';
    }).join('');
    var place = pick
      ? '<div class="bk-p-rider"><span class="bk-p-av">' + M.esc(M.short().charAt(0).toUpperCase()) + '</span><div class="bk-p-tx"><b>' + M.esc(M.short()) + '</b><span>' + M.esc(t.direccion || 'Nuestra tienda') + ' · Lista en ' + e.pMin + ' min</span></div>' +
        '<a class="bk-p-ib" href="' + M.esc(mapsUrl()) + '" target="_blank" rel="noopener" aria-label="Cómo llegar">' + I_GO + '</a></div>' +
        '<a class="bk-p-btn bk-p-ghost bk-p-dir" href="' + M.esc(mapsUrl()) + '" target="_blank" rel="noopener">Cómo llegar</a>'
      : '<div class="bk-p-rider" data-bk-rider hidden><span class="bk-p-av">' + r.ini + '</span><div class="bk-p-tx"><b>' + r.name + '</b><span>' + r.moto + '</span></div>' +
        '<button class="bk-p-ib" type="button" data-act="llamar" aria-label="Llamar a ' + r.name + '">' + I_PHONE + '</button>' +
        '<button class="bk-p-ib bk-p-wa" type="button" data-act="whatsapp" aria-label="Escribir por WhatsApp a ' + r.name + '">' + I_WA + '</button></div>' +
        '<p class="bk-p-sub bk-p-wait" data-bk-wait>Te asignamos un rider en cuanto tu pedido salga de cocina.</p>';
    app.innerHTML =
      '<h1 class="bk-p-h1">Tu pedido</h1>' +
      '<p class="bk-p-sub">Hecho a las ' + M.hhmm(o.at) + ' · ' + (pick ? 'Recoger en tienda' : 'Delivery') + '</p>' +
      '<section class="bk-p-card" aria-live="polite">' +
        '<div class="bk-p-head"><span class="bk-p-no">Orden ' + M.esc(o.no) + '</span><span class="bk-p-pill" data-bk="pill"></span></div>' +
        '<p class="bk-p-big" data-bk="big"></p><p class="bk-p-eta" data-bk="eta"></p>' +
        '<div class="bk-p-prog" aria-hidden="true"><i data-bk="bar"></i></div>' +
        '<ol class="bk-p-steps" data-bk="steps"></ol>' +
      '</section>' +
      '<section class="bk-p-card"><h2 class="bk-p-h2">' + (pick ? 'Dónde recoger' : 'Tu rider') + '</h2><div class="bk-p-map">' + mapSVG(o) + '</div>' + place + '</section>' +
      '<section class="bk-p-card bk-p-rec"><h2 class="bk-p-h2">Detalle</h2>' + itemsHtml +
        '<div class="bk-p-l bk-p-mut"><span>' + (pick ? 'Recoger en tienda' : 'Envío') + '</span><span>' + (o.ship ? M.fmt(o.ship) : 'Gratis') + '</span></div>' +
        (o.discount ? '<div class="bk-p-l bk-p-mut"><span>Descuento</span><span>−' + M.fmt(o.discount) + '</span></div>' : '') +
        '<div class="bk-p-l bk-p-tot"><span>Total pagado</span><span>' + M.fmt(o.total) + '</span></div>' +
        '<div class="bk-p-meta">' + (o.via === 'brinco' ? 'Pagado con Brinco · ' : '') + (BRANDS[card.brand] || 'Tarjeta') + ' •••• ' + M.esc(card.last4) +
          (o.auth ? ' · Autorización ' + M.esc(o.auth) : '') +
          (o.address && !pick ? '<br>Entrega: ' + M.esc(o.address.street) + (o.address.sector ? ', ' + M.esc(o.address.sector) : '') : '') +
          (o.phone ? '<br>WhatsApp: ' + M.esc(M.fmtPhone(o.phone)) : '') + '</div>' +
      '</section>' +
      '<div class="bk-p-help"><a class="bk-p-btn bk-p-ghost" href="/pedido/">Mis pedidos</a><button class="bk-p-btn bk-p-ghost" type="button" data-bk="help">¿Algún problema?</button></div>';
    app.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        M.track('contacto_rider', { orden: o.no, via: b.dataset.act });
        var n = r.name.split(' ')[0];
        M.toast(b.dataset.act === 'llamar' ? 'Llamando a ' + n + '…' : 'Abriendo chat con ' + n + '…');
      });
    });
    app.querySelector('[data-bk="help"]').addEventListener('click', function () { M.track('ayuda_pedido', { orden: o.no }); M.toast('Te escribimos por WhatsApp en un momento'); });
    var last = null;
    function tick() {
      var s = status(o); if (!s || !s.stage) return;
      var q = function (k) { return app.querySelector('[data-bk="' + k + '"]'); };
      q('big').textContent = s.stage.label;
      var pill = q('pill');
      pill.textContent = s.done ? (pick ? 'Recogido' : 'Entregado') : 'En proceso';
      pill.className = 'bk-p-pill' + (s.done ? ' bk-p-done' : '');
      var eta = q('eta');
      if (s.done) eta.textContent = s.stage.txt || '';
      else if (pick) eta.innerHTML = M.esc(s.stage.txt) + '<br><b>Lista aprox. ' + M.hhmm(o.at + e.pMin * 60000) + '</b>';
      else eta.innerHTML = M.esc(s.stage.txt) + '<br><b>Llega entre ' + M.hhmm(o.at + e.dMin * 60000) + ' y ' + M.hhmm(o.at + e.dMax * 60000) + '</b>';
      q('bar').style.width = Math.round(Math.min(1, s.total) * 100) + '%';
      q('steps').innerHTML = (s.stages || []).map(function (x, j) {
        var cls = j < s.i || (s.done && j === s.i) ? 'bk-p-ok' : j === s.i ? 'bk-p-now' : 'bk-p-next';
        return '<li class="' + cls + '"><span class="bk-p-dot">' + (cls === 'bk-p-ok' ? CHECK : '') + '</span><div class="bk-p-st"><b>' + M.esc(x.label) + '</b>' +
          (cls !== 'bk-p-next' ? '<time>' + M.hhmm(o.at + x.t * 1000) + '</time>' : '') + (cls === 'bk-p-now' ? '<span>' + M.esc(x.txt) + '</span>' : '') + '</div></li>';
      }).join('');
      var box = app.querySelector('[data-bk-rider]'), wait = app.querySelector('[data-bk-wait]');
      if (box) { var on = isRoad(s.stage) || s.done; box.hidden = !on; wait.hidden = on; }
      placeRider(app, s);
      if (last !== null && last !== s.stage.k && s.stage.wa) M.waNote(String(s.stage.wa).replace('{no}', o.no));
      last = s.stage.k;
      if (s.done) clearInterval(timer);
    }
    tick();
    clearInterval(timer); timer = setInterval(tick, 1000);
  }

  function renderList(root, msg) {
    var app = root.querySelector('.bk-p-app');
    M.setTitle('Sigue tu pedido');
    var list = allOrders().slice(0, 10);
    var pre = (M.cfg().prefijoOrden || 'XX') + '-12345';
    app.innerHTML =
      '<h1 class="bk-p-h1">Sigue tu pedido</h1><p class="bk-p-sub">Mira en qué va tu pedido, en vivo.</p>' +
      '<section class="bk-p-card"><h2 class="bk-p-h2">Mis pedidos</h2>' +
      (list.length ? '<div class="bk-p-list">' + list.map(function (o) {
        var s = status(o) || { stage: { label: '' } }, n = (o.items || []).reduce(function (a, c) { return a + c.qty; }, 0);
        return '<a href="/pedido/?o=' + encodeURIComponent(o.no) + '"><div><b>' + M.esc(o.no) + ' · ' + M.fmt(o.total) + '</b><span>' +
          new Date(o.at).toLocaleDateString('es-DO', { day: 'numeric', month: 'short' }) + ', ' + M.hhmm(o.at) + ' · ' + n + ' ' + M.esc(M.producto(n)) + '</span></div>' +
          '<span class="bk-p-pill' + (s.done ? ' bk-p-done' : '') + '">' + M.esc(s.stage.label) + '</span></a>';
      }).join('') + '</div>' : '<p class="bk-p-empty">Todavía no tienes pedidos en este celular.</p>') +
      '</section>' +
      '<section class="bk-p-card"><h2 class="bk-p-h2">Buscar un pedido</h2><form class="bk-p-form" novalidate>' +
        '<label for="bkNo">Número de orden</label><input id="bkNo" name="no" inputmode="text" autocapitalize="characters" placeholder="' + M.esc(pre) + '" autocomplete="off">' +
        '<label for="bkPh">Tu WhatsApp</label><input id="bkPh" name="ph" type="tel" inputmode="tel" placeholder="809-555-1234" autocomplete="tel">' +
        (msg ? '<p class="bk-p-err" role="alert">' + M.esc(msg) + '</p>' : '') +
        '<button class="bk-p-btn" type="submit">Ver mi pedido</button></form></section>' +
      '<div class="bk-p-help"><a class="bk-p-btn bk-p-ghost" href="/">Hacer un pedido</a></div>';
    app.querySelector('form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var o = findOrder(app.querySelector('#bkNo').value);
      var ph = M.digits(app.querySelector('#bkPh').value).slice(-7);
      if (!o || (ph && M.digits(o.phone).slice(-7) !== ph)) { renderList(root, 'No encontramos ese pedido. Revisa el número de orden que te llegó por WhatsApp.'); return; }
      location.href = '/pedido/?o=' + encodeURIComponent(o.no);
    });
  }

  M.ready(function () {
    var root = document.querySelector('[data-brinco="pedido"]'); if (!root || root.dataset.bkDone) return;
    root.dataset.bkDone = '1';
    root.classList.add('bk-p');
    root.insertAdjacentHTML('beforebegin', M.header('Pedir de nuevo', '/'));
    root.innerHTML = '<div class="bk-p-app bk-p-wrap"></div>';
    root.insertAdjacentHTML('afterend', '<div class="bk-p bk-p-wrap">' + M.footer() + '</div>');
    document.documentElement.classList.add('bk-page');
    M.fillVault(root.nextElementSibling);
    if (!O() || !O().status) { root.querySelector('.bk-p-app').innerHTML = '<p class="bk-p-empty">No pudimos cargar tus pedidos. Recarga la página.</p>'; return; }
    var q = new URLSearchParams(location.search).get('o');
    var o = q ? findOrder(q) : null;
    if (o) renderOrder(root, o); else renderList(root, q ? 'No encontramos ese pedido en este celular.' : '');
  });
})();
})();

/* --- src/modules/pill.js --- */
(function () {
/* Brinco Kit · píldora "Tu pedido XX-12345 · <estado> · Ver" (todas las páginas menos /pedido/ y /panel/)
   y respaldo del pie "Brinco no guarda tarjetas" en [data-brinco="vault-footer"]. */
(function () {
  var M = window.__bkm; if (!M) return;

  function sheetOpen() {
    var h = document.documentElement;
    if (h.classList.contains('bk-open') || h.classList.contains('bk-lock')) return true;
    var B = window.Brinco || {};
    if (B._ui && typeof B._ui.isOpen === 'function') { try { if (B._ui.isOpen()) return true; } catch (e) {} }
    return !!document.querySelector('.bk-sheet.bk-open,.bk-sheet[open],.bk-sheet.is-open,.bk-co.bk-open');
  }

  M.ready(function () {
    // Core puede llenar el pie primero; esperamos un tick y solo llenamos los vacíos
    setTimeout(function () { M.fillVault(); }, 0);
    if (/^\/(pedido|panel)(\/|$)/.test(location.pathname)) return;
    if (document.querySelector('[data-brinco="pedido"],[data-brinco="panel"]')) return;
    var B = window.Brinco; if (!B || !B.orders || !B.orders.active) return;
    var a = document.createElement('a');
    a.className = 'bk-pill'; a.setAttribute('aria-live', 'polite'); a.setAttribute('aria-hidden', 'true'); a.tabIndex = -1;
    a.innerHTML = '<i aria-hidden="true"></i><span></span><b>Ver</b>';
    document.body.appendChild(a);
    function upd() {
      var o = null; try { o = B.orders.active(); } catch (e) {}
      if (!o || sheetOpen()) { a.classList.remove('bk-show'); a.setAttribute('aria-hidden', 'true'); a.tabIndex = -1; return; }
      var s = null; try { s = B.orders.status(o); } catch (e) {}
      a.href = '/pedido/?o=' + encodeURIComponent(o.no);
      var txt = 'Tu pedido ' + o.no + (s && s.stage ? ' · ' + s.stage.label : '');
      var span = a.querySelector('span'); if (span.textContent !== txt) span.textContent = txt;
      a.setAttribute('aria-label', txt + '. Ver pedido');
      a.classList.add('bk-show'); a.removeAttribute('aria-hidden'); a.tabIndex = 0;
    }
    M.pill = upd;
    upd(); setInterval(upd, 3000);
    // Reacciona enseguida al pagar y al cerrar la hoja del kit
    window.addEventListener('brinco:order', function () { setTimeout(upd, 50); });
    try { new MutationObserver(function () { upd(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); } catch (e) {}
  });
})();
})();

/* --- src/core/99-boot.js --- */
/* ===== Brinco Kit · arranque: carga brinco.json, aplica tema, llena marcadores y avisa a los módulos ===== */
function bindCheckoutButtons() {
  // Atajo opcional: cualquier botón con data-brinco="checkout" abre la caja
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-brinco="checkout"]');
    if (b) { e.preventDefault(); Brinco.checkout(); }
  });
}
function boot() {
  if (SCRIPT && SCRIPT.getAttribute('data-link')) return;   // página de link corto: solo redirige (módulo links)
  bindCheckoutButtons();
  loadConfig().then((cfg) => {
    Brinco.config = deepMerge(DEFAULTS, cfg || {});
    if (!cfg || !cfg.negocio) console.warn('[Brinco] No se encontró ' + configURL() + ' (usando valores por defecto)');
    applyConfig(Brinco.config);
    fillVaultFooters(document);
    watchVaultFooters();
    document.documentElement.classList.add('bk-ready');
    fireReady();
    try { window.dispatchEvent(new CustomEvent('brinco:ready', { detail: Brinco.config })); } catch (e) {}
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
