/*! Brinco Kit v1 · Sandscap · 2026-10-16T00:00Z */
(function () {
'use strict';

/* --- src/core/00-base.js --- */
/* ===== Brinco Kit · base: namespace, helpers ===== */
const VERSION = '1.4.0';
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
const hhmm = (ms) => new Date(ms).toLocaleTimeString(Brinco._loc ? Brinco._loc() : 'es-DO', { hour: 'numeric', minute: '2-digit' });
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
// Sin biometría: se borra la llave que haya dejado una versión anterior del kit.
store.del('brinco_passkey');

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
/* ===== Brinco Kit · textos (un solo objeto; español por defecto, inglés completo) =====
   Claves sin prefijo: caja y Brinco. p_: /pedido/. pn_: /panel/. pill_: píldora. hd_: encabezado/pie. Las páginas legales tienen su propio texto en inglés en legal.js. */
const STR = {
  es: {
    title: 'Finalizar pedido', back: 'Volver', close: 'Cerrar', with: 'con',
    payBrinco: 'Pagar con', orCard: 'o paga con tarjeta', howTitle: '¿Cómo lo quieres?', delivery: 'Delivery', pickup: 'Recoger en tienda',
    free: 'Gratis', min: 'min', yourData: 'Tus datos', name: 'Nombre', namePh: 'Tu nombre', nameErr: 'Escribe tu nombre.',
    wa: 'WhatsApp', waErr: 'Escribe tu número de WhatsApp.', street: 'Dirección', streetPh: 'Calle, número, edificio, apto.', streetErr: 'Escribe la dirección.', geoUse: 'Usar mi ubicación', geoBusy: 'Buscando dónde estás…', geoDenied: 'No pudimos ver tu ubicación. Escribe la dirección o activa la ubicación del navegador.', geoPin: 'Mueve el pin hasta tu puerta', geoSaved: 'Ubicación exacta guardada para el mensajero', geoOutside: 'Esa zona no está en la lista de entrega. Escoge el sector más cercano.', mapLink: 'Ver en el mapa',
    sector: 'Sector', choose: 'Escoge…', sectorErr: 'Escoge el sector.', ref: 'Referencia', refPh: 'Frente a…', payment: 'Pago',
    saveBrinco: 'Guardar mis datos y mi tarjeta en {brinco} para pagar con un toque en cualquier negocio Brinco',
    saveBrincoSmall: 'Te enviamos un código por WhatsApp para confirmar. Brinco no guarda tu tarjeta: la guarda tu procesador de pago (AZUL, CardNet o MIO).',
    pay: 'Pagar', subtotal: 'Subtotal', ship: 'Envío', total: 'Total', itbis: 'ITBIS incluido', itbisLine: 'ITBIS ({p}%)', coupon: 'Cupón', apply: 'Aplicar', couponErr: 'Ese cupón no es válido.',
    freeFrom: 'Envío gratis desde {x}', freeLeft: 'Te faltan {x} para envío gratis', freeOk: '¡Tu envío es gratis!',
    store: 'Tienda', storeChoose: '¿En cuál tienda lo recoges?',
    when: '¿Para cuándo?', day: 'Día', hour: 'Hora', scheduledFor: 'Programado para {x}', today: 'Hoy', tomorrow: 'Mañana', noSlots: 'No hay horarios disponibles en los próximos días.',
    testMode: 'Ambiente de pruebas de AZUL · no se realiza ningún cargo real',
    azulTop: 'Campos seguros de', azulSec: 'Cifrado TLS · PCI DSS', cardNum: 'Número de tarjeta', cardNumErr: 'Revisa el número de la tarjeta.',
    exp: 'Vence (MM/AA)', expPh: 'MM/AA', expErr: 'Fecha no válida.', cvv: 'CVV', cvvErr: '3 o 4 dígitos.', holder: 'Nombre en la tarjeta', holderPh: 'Como aparece en la tarjeta', holderErr: 'Escribe el nombre.',
    testCards: 'Tarjetas de prueba:', approved: 'aprobada', declined: 'rechazada',
    otpTitle: 'Confirma tu WhatsApp', otpSent: 'Te enviamos un código de 6 dígitos al {phone}.', otpGo: 'Confirmar código', otpAgain: 'Enviar otro código',
    otpBad: 'Código incorrecto. Revisa el mensaje de WhatsApp.', otpMany: 'Demasiados intentos. Pide otro código.', digit: 'Dígito {n}',
    otpMsg: 'Tu código de Brinco es {code}. Vence en 10 minutos. No lo compartas con nadie.', now: 'ahora',
    otpSending: 'Enviando tu código por WhatsApp…', otpTest: 'Modo de prueba: escribe cualquier código de 6 dígitos.',
    wOffline: 'No pudimos conectar con Brinco. Revisa tu internet e intenta otra vez.', wErr: 'Algo falló con Brinco. Intenta otra vez.',
    wSaveFail: 'Tu pedido quedó pagado, pero no pudimos guardar la tarjeta en Brinco.',
    verifyBank: 'Verificando con tu banco', noClose: 'No cierres esta ventana.', processing: 'Procesando tu pago', verifyCard: 'Verificando tu tarjeta', processingAria: 'Procesando',
    done: '¡Pedido confirmado!', order: 'Orden', arrives: 'Llega en {a}–{b} min', ready: 'Listo para recoger en {a} min',
    doneWa: 'Te avisamos por WhatsApp al {phone} en cada paso, con el link para seguirlo.', follow: 'Seguir mi pedido',
    paid: 'Total pagado', paidBrinco: 'Pagado con Brinco · ', auth: 'Autorización', deliverTo: 'Entrega', pickAt: 'Recoger en', keepShopping: 'Seguir comprando',
    brincoReady: 'Tu Cuenta Brinco quedó lista.', brincoReadyTx: 'La próxima vez pagas con un toque aquí y en cualquier negocio Brinco. Tu tarjeta no la guarda Brinco: queda protegida por tu procesador de pago.',
    doneTitle: 'Listo',
    bTagline: 'Paga con un toque', bLoginTx: 'Entra con tu número de WhatsApp. Sin contraseñas: te mandamos un código.',
    waNumber: 'Número de WhatsApp', sendCode: 'Enviar código por WhatsApp',
    bLoginTxG: 'Entra con Google o con tu número de WhatsApp. Sin contraseñas.',
    gLinkTx: 'Ya confirmamos tu Google ({email}). Para terminar, confirma tu WhatsApp con un código: así tu Cuenta Brinco queda lista también con Google.',
    gIn: 'Entraste a Brinco con Google.', gNeedPhone: 'Ya confirmamos tu Google. Al pagar con Brinco te pedimos tu WhatsApp una sola vez.',
    bTerms: 'Al continuar aceptas los Términos de la Cuenta Brinco y su Política de privacidad. Nunca usamos SMS.',
    bCreate: 'Crea tu Cuenta Brinco', bCreateTx: 'Una sola vez. Después pagas con un toque en cualquier negocio Brinco.',
    email: 'Correo', optional: '(opcional)', emailErr: 'Correo no válido.', addrTitle: 'Dirección de entrega', home: 'Casa', work: 'Trabajo', label: 'Etiqueta',
    consent: 'Guardar mis datos en {brinco} para pagar con un toque en cualquier negocio Brinco', consentSmall: 'Puedes borrarlos cuando quieras desde Mi cuenta.',
    consentErr: 'Marca la casilla para crear tu cuenta.', continue: 'Continuar',
    addCard: 'Agrega tu tarjeta', cardConsent: 'Guardar esta tarjeta para mis compras en negocios Brinco', cardConsentSmall: 'Brinco no guarda tu tarjeta: la guarda tu procesador de pago (AZUL, CardNet o MIO).',
    cardConsentErr: 'Marca la casilla para guardar la tarjeta.', saveCard: 'Guardar tarjeta',
    hello: 'Hola, {name}', again: 'de nuevo', delivTitle: 'Entrega', cardTitle: 'Tarjeta', readyIn: 'Lista en {a} min', expires: 'Vence {exp}', main: 'principal',
    addOther: '+ Agregar otra tarjeta', addAddr: '+ Agregar otra dirección', newAddr: 'Nueva dirección', saveAddr: 'Guardar dirección', plat: 'Tarifa de servicio', confirmPay: 'Confirmar y pagar {total}', notYou: '¿No eres {name}? Cerrar sesión',
   
    vaultLine: 'Brinco <b>no guarda</b> tu tarjeta. La protegen <b>AZUL</b>, <b>CardNet</b> o <b>MIO</b>.',
    vaultT: 'Brinco no guarda tu tarjeta', vaultTx: 'Tu tarjeta queda guardada y protegida por el procesador de pago certificado PCI DSS. Brinco solo recibe un código seguro (token) que no sirve fuera de tu cuenta.',
    vaultFooter: '<b>Brinco no guarda tarjetas.</b> Tus datos de pago quedan protegidos por el procesador certificado PCI DSS: <b>AZUL</b>, <b>CardNet</b> o <b>MIO</b>.',
    vaultProcs: 'Procesadores: AZUL, CardNet y MIO',
    d51: 'Fondos insuficientes. Intenta con otra tarjeta.', d05: 'El banco no autorizó la transacción. Contacta a tu banco o usa otra tarjeta.', d54: 'La tarjeta está vencida.',
    code: 'código', emptyCart: 'Tu carrito está vacío.', defaultClient: 'Cliente', card: 'Tarjeta',
    // Etapas por defecto ({s} = producto en singular)
    st_programado: 'Programado', st_programadoTexto: 'Lo preparamos a tiempo para tu hora.', st_programadoWa: 'Recibimos tu pedido {no} programado. ¡Gracias!',
    st_recibido: 'Pedido recibido', st_recibidoTexto: 'Ya lo tenemos. Lo estamos revisando.', st_recibidoWa: 'Recibimos tu pedido {no}. ¡Gracias!',
    st_preparando: 'Preparando tu {s}', st_preparandoTexto: 'Lo estamos preparando al momento, con cariño.', st_preparandoWa: 'Tu {s} ya se está preparando 👨‍🍳',
    st_coccion: 'Casi listo', st_coccionTexto: 'Dando los últimos toques. Ya casi.', st_coccionWa: 'Tu {s} está casi listo 🔥',
    st_camino: 'En camino', st_caminoTexto: 'Tu rider va directo a tu casa.', st_caminoWa: '¡Tu pedido va en camino! 🛵 Síguelo aquí: {dominio}/pedido',
    st_entregado: 'Entregado', st_entregadoTexto: '¡Buen provecho! Gracias por pedir directo.', st_entregadoWa: 'Pedido entregado. ¡Buen provecho! ❤️',
    st_lista: 'Listo para recoger', st_listaTexto: 'Te esperamos en la tienda. Di tu número de orden.', st_listaWa: '¡Tu pedido está listo para recoger! Orden {no}',
    st_recogido: 'Recogido', st_recogidoTexto: '¡Buen provecho! Gracias por pedir directo.', st_recogidoWa: 'Pedido recogido. ¡Buen provecho! ❤️',
    // Encabezado / pie de las páginas del kit
    hd_home: 'inicio', hd_legal: 'Legal', hd_sec: 'Políticas de seguridad', hd_priv: 'Privacidad', hd_terms: 'Términos y entregas', hd_back: 'Volver a la tienda',
    hd_vault: 'Brinco no guarda tarjetas: las protege tu procesador de pago (AZUL, CardNet o MIO).',
    // Píldora
    pill_your: 'Tu pedido ', pill_see: 'Ver', pill_aria: 'Tu pedido {no}{st}. Ver pedido',
    pill_recibido: 'Recibido', pill_preparando: 'Preparando', pill_coccion: 'Preparando', pill_camino: 'En camino', pill_entregado: 'Entregado', pill_lista: 'Lista', pill_recogido: 'Entregado', pill_programado: 'Programado',
    // /pedido/
    p_orderAgain: 'Pedir de nuevo', p_order: 'Pedido {no}', p_track: 'Sigue tu pedido', p_trackSub: 'Mira en qué va tu pedido, en vivo.', p_your: 'Tu pedido',
    p_madeAt: 'Hecho a las {h}', p_inProc: 'En proceso', p_delivered: 'Entregado', p_picked: 'Recogido', p_scheduled: 'Programado',
    p_readyAt: 'Lista aprox. {h}', p_arrives: 'Llega entre {a} y {b}', p_where: 'Dónde recoger', p_rider: 'Tu rider', p_detail: 'Detalle',
    p_store: 'Nuestra tienda', p_readyIn: 'Lista en {a} min', p_dir: 'Cómo llegar', p_call: 'Llamar a {n}', p_waTo: 'Escribir por WhatsApp a {n}',
    p_wait: 'Te asignamos un rider en cuanto tu pedido {x}.', p_waitReady: 'esté listo', p_waitOut: 'salga {x}',
    p_discount: 'Descuento', p_total: 'Total pagado', p_paidB: 'Pagado con Brinco · ', p_auth: 'Autorización', p_deliver: 'Entrega', p_wa: 'WhatsApp',
    p_mine: 'Mis pedidos', p_help: '¿Algún problema?', p_calling: 'Llamando a {n}…', p_chat: 'Abriendo chat con {n}…', p_helpMsg: 'Te escribimos por WhatsApp en un momento',
    p_none: 'Todavía no tienes pedidos en este celular.', p_find: 'Buscar un pedido', p_no: 'Número de orden', p_ph: 'Tu WhatsApp', p_see: 'Ver mi pedido', p_make: 'Hacer un pedido',
    p_notFound: 'No encontramos ese pedido. Revisa el número de orden que te llegó por WhatsApp.', p_notHere: 'No encontramos ese pedido en este celular.', p_loadErr: 'No pudimos cargar tus pedidos. Recarga la página.',
    p_mapStore: 'Ubicación de la tienda', p_mapRoute: 'Ruta de tu pedido', p_yourStore: 'Tu tienda',
    // /panel/
    pn_h1: 'Ventas y origen de clientes', pn_sub: 'De dónde llegan los clientes de {n}, cuántos compran y cuánto vende cada canal, orgánico y pagado.',
    pn_period: 'Periodo', pn_today: 'Hoy', pn_7: '7 días', pn_30: '30 días', pn_all: 'Todo', pn_summary: 'Resumen',
    pn_clicks: 'Clics en links', pn_visits: 'Visitas', pn_buys: 'Compras', pn_rev: 'Ventas', pn_funnel: 'Embudo de compra', pn_org: 'Orgánico', pn_paidAds: 'Pagado (anuncios)', pn_paid: 'Pagado',
    pn_people: 'Cada paso cuenta personas (sesiones únicas), no clics repetidos.', pn_split: 'Orgánico vs. pagado', pn_bySrc: 'Por origen', pn_src: 'Origen', pn_type: 'Tipo', pn_cart: 'Carrito', pn_pay: 'Pago', pn_conv: 'Conversión',
    pn_last: 'Últimos pedidos', pn_order: 'Orden', pn_date: 'Fecha', pn_client: 'Cliente', pn_deliv: 'Entrega', pn_tot: 'Total', pn_links: 'Tus links',
    pn_foot: 'Cada visita queda marcada con el link por donde entró, y cada pedido pagado guarda ese origen. Datos de este equipo.',
    pn_l_ig: 'Bio de Instagram · orgánico', pn_l_ad: 'Anuncios de Meta · pagado', pn_l_fb: 'Perfil de Facebook · orgánico', pn_l_tt: 'Bio de TikTok · orgánico', pn_l_wa: 'Estados y chats de WhatsApp · orgánico',
    pn_clicksS: '{o} orgánicos · {p} pagados', pn_noClicks: 'Aún sin clics', pn_srcs: '{n} orígenes distintos', pn_convX: 'Conversión {x}', pn_aov: 'Ticket promedio {x}',
    pn_f1: 'Visitas', pn_f2: 'Agregaron al carrito', pn_f3: 'Abrieron el pago', pn_f4: 'Enviaron el pago', pn_f5: 'Compraron', pn_fAria: '{s}: {o} orgánico, {p} pagado',
    pn_vb: '{v} visitas · {b} compras', pn_brinco: '<b>{x}</b> de las compras se pagaron con un toque en Brinco · {n} cuenta(s) Brinco nueva(s)',
    
    pn_noVisits: 'Todavía no hay visitas en este periodo.', pn_noOrders: 'Todavía no hay pedidos en este periodo.', pn_pickup: 'Recoger', pn_direct: 'Directo',
    pn_refresh: 'Actualizar', pn_shop: 'Ver tienda', pn_reset: 'Borrar datos', pn_updated: 'Panel actualizado', pn_wiped: 'Datos borrados',
    pn_confirm: '¿Borrar las estadísticas, pedidos y cuentas Brinco guardados en este equipo?', pn_title: 'Panel {n} · Ventas y origen'
  },
  en: {
    title: 'Checkout', back: 'Back', close: 'Close', with: 'with',
    payBrinco: 'Pay with', orCard: 'or pay by card', howTitle: 'How do you want it?', delivery: 'Delivery', pickup: 'Store pickup',
    free: 'Free', min: 'min', yourData: 'Your details', name: 'Name', namePh: 'Your name', nameErr: 'Enter your name.',
    wa: 'WhatsApp', waErr: 'Enter your WhatsApp number.', street: 'Address', streetPh: 'Street, number, building, apt.', streetErr: 'Enter the address.', geoUse: 'Use my location', geoBusy: 'Finding where you are…', geoDenied: 'We could not get your location. Type the address or allow location in your browser.', geoPin: 'Drag the pin to your door', geoSaved: 'Exact location saved for the rider', geoOutside: 'That area is not on the delivery list. Choose the closest neighborhood.', mapLink: 'View on map',
    sector: 'Neighborhood', choose: 'Choose…', sectorErr: 'Choose the neighborhood.', ref: 'Landmark', refPh: 'Across from…', payment: 'Payment',
    saveBrinco: 'Save my details and card in {brinco} to pay with one tap at any Brinco business',
    saveBrincoSmall: 'We will send you a WhatsApp code to confirm. Brinco does not store your card: your payment processor (AZUL, CardNet or MIO) does.',
    pay: 'Pay', subtotal: 'Subtotal', ship: 'Delivery', total: 'Total', itbis: 'ITBIS (tax) included', itbisLine: 'ITBIS tax ({p}%)', coupon: 'Coupon', apply: 'Apply', couponErr: 'That coupon is not valid.',
    freeFrom: 'Free delivery from {x}', freeLeft: '{x} more for free delivery', freeOk: 'Your delivery is free!',
    store: 'Store', storeChoose: 'Which store will you pick up from?',
    when: 'When do you want it?', day: 'Day', hour: 'Time', scheduledFor: 'Scheduled for {x}', today: 'Today', tomorrow: 'Tomorrow', noSlots: 'No times available in the next few days.',
    testMode: 'AZUL test environment · no real charge is made',
    azulTop: 'Secure fields by', azulSec: 'TLS encryption · PCI DSS', cardNum: 'Card number', cardNumErr: 'Check the card number.',
    exp: 'Expires (MM/YY)', expPh: 'MM/YY', expErr: 'Invalid date.', cvv: 'CVV', cvvErr: '3 or 4 digits.', holder: 'Name on card', holderPh: 'As it appears on the card', holderErr: 'Enter the name.',
    testCards: 'Test cards:', approved: 'approved', declined: 'declined',
    otpTitle: 'Confirm your WhatsApp', otpSent: 'We sent a 6-digit code to {phone}.', otpGo: 'Confirm code', otpAgain: 'Send another code',
    otpBad: 'Wrong code. Check the WhatsApp message.', otpMany: 'Too many attempts. Request a new code.', digit: 'Digit {n}',
    otpMsg: 'Your Brinco code is {code}. It expires in 10 minutes. Do not share it with anyone.', now: 'now',
    otpSending: 'Sending your code on WhatsApp…', otpTest: 'Test mode: type any 6-digit code.',
    wOffline: 'We could not reach Brinco. Check your connection and try again.', wErr: 'Something went wrong with Brinco. Try again.',
    wSaveFail: 'Your order is paid, but we could not save the card in Brinco.',
    verifyBank: 'Verifying with your bank', noClose: 'Do not close this window.', processing: 'Processing your payment', verifyCard: 'Verifying your card', processingAria: 'Processing',
    done: 'Order confirmed!', order: 'Order', arrives: 'Arrives in {a}–{b} min', ready: 'Ready for pickup in {a} min',
    doneWa: 'We will update you on WhatsApp at {phone} at every step, with a link to track it.', follow: 'Track my order',
    paid: 'Total paid', paidBrinco: 'Paid with Brinco · ', auth: 'Authorization', deliverTo: 'Delivery to', pickAt: 'Pick up at', keepShopping: 'Keep shopping',
    brincoReady: 'Your Brinco Account is ready.', brincoReadyTx: 'Next time you pay with one tap here and at any Brinco business. Brinco does not store your card: your payment processor protects it.',
    doneTitle: 'Done',
    bTagline: 'Pay with one tap', bLoginTx: 'Sign in with your WhatsApp number. No passwords: we send you a code.',
    waNumber: 'WhatsApp number', sendCode: 'Send code on WhatsApp',
    bLoginTxG: 'Sign in with Google or with your WhatsApp number. No passwords.',
    gLinkTx: 'Your Google account ({email}) is confirmed. To finish, confirm your WhatsApp with a code: your Brinco Account will also work with Google.',
    gIn: 'You signed in to Brinco with Google.', gNeedPhone: 'Your Google account is confirmed. When you pay with Brinco we will ask for your WhatsApp just once.',
    bTerms: 'By continuing you accept the Brinco Account Terms and Privacy Policy. We never use SMS.',
    bCreate: 'Create your Brinco Account', bCreateTx: 'Just once. Then you pay with one tap at any Brinco business.',
    email: 'Email', optional: '(optional)', emailErr: 'Invalid email.', addrTitle: 'Delivery address', home: 'Home', work: 'Work', label: 'Label',
    consent: 'Save my details in {brinco} to pay with one tap at any Brinco business', consentSmall: 'You can delete them anytime from My account.',
    consentErr: 'Check the box to create your account.', continue: 'Continue',
    addCard: 'Add your card', cardConsent: 'Save this card for my purchases at Brinco businesses', cardConsentSmall: 'Brinco does not store your card: your payment processor (AZUL, CardNet or MIO) does.',
    cardConsentErr: 'Check the box to save the card.', saveCard: 'Save card',
    hello: 'Hi, {name}', again: 'again', delivTitle: 'Delivery', cardTitle: 'Card', readyIn: 'Ready in {a} min', expires: 'Expires {exp}', main: 'main',
    addOther: '+ Add another card', addAddr: '+ Add another address', newAddr: 'New address', saveAddr: 'Save address', plat: 'Service fee', confirmPay: 'Confirm and pay {total}', notYou: 'Not {name}? Sign out',
   
    vaultLine: 'Brinco <b>does not store</b> your card. It is protected by <b>AZUL</b>, <b>CardNet</b> or <b>MIO</b>.',
    vaultT: 'Brinco does not store your card', vaultTx: 'Your card is stored and protected by the PCI DSS–certified payment processor. Brinco only receives a secure code (token) that is useless outside your account.',
    vaultFooter: '<b>Brinco does not store cards.</b> Your payment details are protected by the PCI DSS–certified processor: <b>AZUL</b>, <b>CardNet</b> or <b>MIO</b>.',
    vaultProcs: 'Processors: AZUL, CardNet and MIO',
    d51: 'Insufficient funds. Try another card.', d05: 'The bank did not authorize the transaction. Contact your bank or use another card.', d54: 'The card has expired.',
    code: 'code', emptyCart: 'Your cart is empty.', defaultClient: 'Customer', card: 'Card',
    st_programado: 'Scheduled', st_programadoTexto: 'We’ll have it ready on time for your slot.', st_programadoWa: 'We received your scheduled order {no}. Thank you!',
    st_recibido: 'Order received', st_recibidoTexto: 'We’ve got it and we’re reviewing it.', st_recibidoWa: 'We received your order {no}. Thank you!',
    st_preparando: 'Preparing your {s}', st_preparandoTexto: 'We’re making it fresh, with love.', st_preparandoWa: 'Your {s} is being prepared 👨‍🍳',
    st_coccion: 'Almost ready', st_coccionTexto: 'Final touches. Almost there.', st_coccionWa: 'Your {s} is almost ready 🔥',
    st_camino: 'On the way', st_caminoTexto: 'Your rider is heading straight to you.', st_caminoWa: 'Your order is on the way! 🛵 Track it here: {dominio}/pedido',
    st_entregado: 'Delivered', st_entregadoTexto: 'Enjoy! Thanks for ordering direct.', st_entregadoWa: 'Order delivered. Enjoy! ❤️',
    st_lista: 'Ready for pickup', st_listaTexto: 'We’re waiting for you at the store. Give your order number.', st_listaWa: 'Your order is ready for pickup! Order {no}',
    st_recogido: 'Picked up', st_recogidoTexto: 'Enjoy! Thanks for ordering direct.', st_recogidoWa: 'Order picked up. Enjoy! ❤️',
    hd_home: 'home', hd_legal: 'Legal', hd_sec: 'Security policy', hd_priv: 'Privacy', hd_terms: 'Terms and delivery', hd_back: 'Back to the store',
    hd_vault: 'Brinco does not store cards: your payment processor protects them (AZUL, CardNet or MIO).',
    pill_your: 'Your order ', pill_see: 'View', pill_aria: 'Your order {no}{st}. View order',
    pill_recibido: 'Received', pill_preparando: 'Preparing', pill_coccion: 'Preparing', pill_camino: 'On the way', pill_entregado: 'Delivered', pill_lista: 'Ready', pill_recogido: 'Picked up', pill_programado: 'Scheduled',
    p_orderAgain: 'Order again', p_order: 'Order {no}', p_track: 'Track your order', p_trackSub: 'See where your order is, live.', p_your: 'Your order',
    p_madeAt: 'Placed at {h}', p_inProc: 'In progress', p_delivered: 'Delivered', p_picked: 'Picked up', p_scheduled: 'Scheduled',
    p_readyAt: 'Ready around {h}', p_arrives: 'Arrives between {a} and {b}', p_where: 'Where to pick up', p_rider: 'Your rider', p_detail: 'Details',
    p_store: 'Our store', p_readyIn: 'Ready in {a} min', p_dir: 'Get directions', p_call: 'Call {n}', p_waTo: 'Message {n} on WhatsApp',
    p_wait: 'We’ll assign a rider as soon as your order {x}.', p_waitReady: 'is ready', p_waitOut: 'leaves {x}',
    p_discount: 'Discount', p_total: 'Total paid', p_paidB: 'Paid with Brinco · ', p_auth: 'Authorization', p_deliver: 'Delivery', p_wa: 'WhatsApp',
    p_mine: 'My orders', p_help: 'Any problem?', p_calling: 'Calling {n}…', p_chat: 'Opening chat with {n}…', p_helpMsg: 'We’ll message you on WhatsApp in a moment',
    p_none: 'You don’t have orders on this phone yet.', p_find: 'Find an order', p_no: 'Order number', p_ph: 'Your WhatsApp', p_see: 'View my order', p_make: 'Place an order',
    p_notFound: 'We couldn’t find that order. Check the order number we sent you on WhatsApp.', p_notHere: 'We couldn’t find that order on this phone.', p_loadErr: 'We couldn’t load your orders. Reload the page.',
    p_mapStore: 'Store location', p_mapRoute: 'Your order’s route', p_yourStore: 'Your store',
    pn_h1: 'Sales and customer sources', pn_sub: 'Where {n}’s customers come from, how many buy and how much each channel sells, organic and paid.',
    pn_period: 'Period', pn_today: 'Today', pn_7: '7 days', pn_30: '30 days', pn_all: 'All', pn_summary: 'Summary',
    pn_clicks: 'Link clicks', pn_visits: 'Visits', pn_buys: 'Purchases', pn_rev: 'Sales', pn_funnel: 'Purchase funnel', pn_org: 'Organic', pn_paidAds: 'Paid (ads)', pn_paid: 'Paid',
    pn_people: 'Each step counts people (unique sessions), not repeated clicks.', pn_split: 'Organic vs. paid', pn_bySrc: 'By source', pn_src: 'Source', pn_type: 'Type', pn_cart: 'Cart', pn_pay: 'Payment', pn_conv: 'Conversion',
    pn_last: 'Latest orders', pn_order: 'Order', pn_date: 'Date', pn_client: 'Customer', pn_deliv: 'Delivery', pn_tot: 'Total', pn_links: 'Your links',
    pn_foot: 'Every visit is tagged with the link it came from, and every paid order keeps that source. Data from this device.',
    pn_l_ig: 'Instagram bio · organic', pn_l_ad: 'Meta ads · paid', pn_l_fb: 'Facebook profile · organic', pn_l_tt: 'TikTok bio · organic', pn_l_wa: 'WhatsApp statuses and chats · organic',
    pn_clicksS: '{o} organic · {p} paid', pn_noClicks: 'No clicks yet', pn_srcs: '{n} different sources', pn_convX: 'Conversion {x}', pn_aov: 'Average ticket {x}',
    pn_f1: 'Visits', pn_f2: 'Added to cart', pn_f3: 'Opened checkout', pn_f4: 'Submitted payment', pn_f5: 'Purchased', pn_fAria: '{s}: {o} organic, {p} paid',
    pn_vb: '{v} visits · {b} purchases', pn_brinco: '<b>{x}</b> of purchases were paid with one tap on Brinco · {n} new Brinco account(s)',
    
    pn_noVisits: 'No visits in this period yet.', pn_noOrders: 'No orders in this period yet.', pn_pickup: 'Pickup', pn_direct: 'Direct',
    pn_refresh: 'Refresh', pn_shop: 'View store', pn_reset: 'Delete data', pn_updated: 'Dashboard updated', pn_wiped: 'Data deleted',
    pn_confirm: 'Delete the stats, orders and Brinco accounts saved on this device?', pn_title: '{n} dashboard · Sales and sources'
  }
};
let LANG = 'es';
function t(k, v) {
  let s = (STR[LANG] && STR[LANG][k]);
  if (s == null) s = STR.es[k];
  if (s == null) s = k;
  if (v) Object.keys(v).forEach((x) => { s = s.split('{' + x + '}').join(v[x]); });
  return s;
}
// Idioma: Brinco.setLang('en') (queda guardado en este equipo para las páginas del kit) o config.idioma
function setLang(l, opts) {
  LANG = STR[l] ? l : 'es';
  if (!(opts && opts.noSave)) { try { localStorage.setItem('brinco_lang', LANG); } catch (e) {} }
  try { window.dispatchEvent(new CustomEvent('brinco:lang', { detail: LANG })); } catch (e) {}
}
Brinco.setLang = (l) => setLang(l);
Brinco.lang = () => LANG;
Brinco._t = t;
Brinco._strings = STR;
const loc = () => (LANG === 'en' ? 'en-US' : 'es-DO');
Brinco._loc = loc;
Brinco.fmt = function (n) { return ((Brinco.config && Brinco.config.moneda) || 'RD$') + ' ' + Math.round(Number(n) || 0).toLocaleString('es-DO'); };
const fmt = (n) => Brinco.fmt(n);
// "mié 15 oct, 10:00 a. m." / "Wed, Oct 15, 10:00 AM"
function fmtWhen(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString(loc(), { hour: 'numeric', minute: '2-digit' });
}
Brinco._fmtWhen = fmtWhen;

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
// ---- Contraste (WCAG) para textos sobre el color de la marca ----
function hexRgb(h) {
  h = String(h || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function lum(rgb) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]); }
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const DARK_INK = [31, 26, 21];   // #1F1A15
function onBrand(c) {
  if (c.colorSobreMarca) return c.colorSobreMarca;
  const b = hexRgb(c.color); if (!b) return '#fff';
  return contrast(b, [255, 255, 255]) >= 4.5 || contrast(b, [255, 255, 255]) >= contrast(b, DARK_INK) ? '#fff' : '#1F1A15';
}
// Color de marca para TEXTO sobre fondo claro: se oscurece hasta 4.5:1 si hace falta
function brandText(c) {
  if (c.colorMarcaTexto) return c.colorMarcaTexto;
  let b = hexRgb(c.color); if (!b) return c.color;
  for (let i = 0; i < 20 && contrast(b, [255, 255, 255]) < 4.5; i++) b = b.map((v) => v * 0.9);
  return toHex(b);
}
// Texto sobre superficies blancas del kit (la hoja, tarjetas): oscuro aunque el sitio sea de tema oscuro
function surfaceInk(c) {
  if (c.colorTextoSuperficie) return c.colorTextoSuperficie;
  const t = hexRgb(c.colorTexto);
  return t && contrast(t, [255, 255, 255]) < 4.5 ? '#1F1A15' : c.colorTexto;
}
Brinco._color = { contrast: (a, b) => contrast(hexRgb(a), hexRgb(b)), onBrand, brandText, surfaceInk };
function applyConfig(c) {
  const r = document.documentElement.style;
  r.setProperty('--bk-brand', c.color);
  r.setProperty('--bk-ink', c.colorTexto);
  r.setProperty('--bk-bg', c.colorFondo);
  r.setProperty('--bk-on-brand', onBrand(c));
  r.setProperty('--bk-brand-text', brandText(c));
  r.setProperty('--bk-surface-ink', surfaceInk(c));
  // Sitio de tema oscuro (texto claro): las páginas que pinta el kit (/pedido/, /panel/, legales) van en claro,
  // con tinta oscura y fondo crema, para que tarjetas y textos se lean. Forzable con "tema": "oscuro" | "claro".
  const dark = c.tema === 'oscuro' || (c.tema !== 'claro' && surfaceInk(c) !== c.colorTexto);
  document.documentElement.classList.toggle('bk-dark-site', !!dark);
  if (dark && document.querySelector('[data-brinco="pedido"],[data-brinco="panel"],[data-brinco="legal"]')) {
    r.setProperty('--bk-ink', surfaceInk(c));
    r.setProperty('--bk-bg', c.colorFondoClaro || '#FBF8F3');
  }
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
  // Idioma: lo que el cliente escogió en este equipo (Brinco.setLang) > config.idioma > <html lang="en">
  let saved = null; try { saved = localStorage.getItem('brinco_lang'); } catch (e) {}
  const want = saved || c.idioma || (/^en/i.test(document.documentElement.lang || '') ? 'en' : 'es');
  setLang(want, { noSave: true });
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
  const x = { e: String(name), t: Date.now(), sid: SID.id, src: o.source, med: o.medium, d: data || null };
  ev.push(x);
  if (ev.length > 2000) ev = ev.slice(-2000);
  store.set(KEY_EV, ev);
  // Copia al Wallet para los informes del negocio (visitas, platos vistos, carritos abandonados, sectores…)
  SEND.q.push(Object.assign({ vid: VID }, x)); clearTimeout(SEND.t); SEND.t = setTimeout(evFlush, 4000);
};
const VID = (function () { try { let v = localStorage.getItem('brinco_vid'); if (!v) { v = Math.random().toString(36).slice(2, 12); localStorage.setItem('brinco_vid', v); } return v; } catch (e) { return SID.id; } })();
const SEND = { q: [], t: 0 };
function evFlush(beacon) {
  try {
    const base = typeof WALLET === 'string' ? WALLET : '';
    const slug = Brinco.config && Brinco.config.negocio;
    if (!base || !slug || !SEND.q.length) return;
    const body = JSON.stringify({ m: slug, ev: SEND.q.splice(0, 60) });
    const url = base + '/v1/ev';
    if (beacon && navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }));
    else fetch(url, { method: 'POST', credentials: 'include', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body }).catch(() => {});
    if (SEND.q.length) SEND.t = setTimeout(evFlush, 1000);
  } catch (e) {}
}
addEventListener('pagehide', () => evFlush(true));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') evFlush(true); });
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
// Etiquetas: textos del kit (es/en) + brinco.json "etapas" (español) o "etapasEn" (inglés).
// Claves: programado, recibido, preparando, coccion, camino, entregado, lista, recogido (+ "<clave>Texto" y "<clave>Wa")
function etapaTexts() {
  const c = C(), en = LANG === 'en';
  const p = (en ? c.productoEn : null) || (en ? { singular: 'order' } : c.producto) || {};
  const sing = p.singular || (en ? 'order' : 'pedido');
  const o = {};
  ['programado', 'recibido', 'preparando', 'coccion', 'camino', 'entregado', 'lista', 'recogido'].forEach((k) => {
    ['', 'Texto', 'Wa'].forEach((x) => { o[k + x] = t('st_' + k + x, { s: sing }); });
  });
  return Object.assign(o, (en ? c.etapasEn : c.etapas) || {});
}
// Segundos (desde que se pagó) en que empieza cada etapa
const STAGE_T = { delivery: [0, 20, 45, 80, 170], pickup: [0, 20, 45, 80, 260] };
const STAGE_K = { delivery: ['recibido', 'preparando', 'coccion', 'camino', 'entregado'], pickup: ['recibido', 'preparando', 'coccion', 'lista', 'recogido'] };
// Pedido programado: se queda en "Programado" hasta la hora. Para la demo, la espera real se comprime
// (24 h ≈ 60 s; mínimo 15 s, máximo 90 s), pero en pantalla se muestran las horas reales.
function schedInfo(o) {
  const P = o && o.programado ? Date.parse(o.programado) : NaN;
  if (!P || isNaN(P)) return null;
  const W = Math.max(0, P - o.at);
  return { P, wait: Math.min(90000, Math.max(15000, W / 1440)) };
}
function stages(o) {
  const mode = o && o.mode === 'pickup' ? 'pickup' : 'delivery';
  const e = etapaTexts();
  const fill = (s) => String(s || '').replace('{dominio}', C().dominio || location.hostname);
  const sc = schedInfo(o || {});
  const at0 = o && o.at ? o.at : Date.now();
  const list = STAGE_K[mode].map((k, i) => ({ k, t: STAGE_T[mode][i], label: e[k], txt: e[k + 'Texto'], wa: fill(e[k + 'Wa']) }));
  if (!sc) return list.map((x) => Object.assign(x, { at: at0 + x.t * 1000 }));
  const off = sc.wait / 1000;
  return [{ k: 'programado', t: 0, at: at0, label: e.programado, txt: e.programadoTexto, wa: fill(e.programadoWa) }]
    .concat(list.map((x) => Object.assign(x, { t: x.t + off, at: sc.P + x.t * 1000 })));
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
  const sc = schedInfo(o);
  return { i, stage: cur, stages: st, part: p, done: !nxt, total: (i + p) / (st.length - 1), scheduled: !!sc, programado: sc ? sc.P : null };
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
  // Tienda donde se recoge (la escogida en el pedido, o la de brinco.json)
  store(o) {
    const c = C(), l = Array.isArray(c.tiendas) && c.tiendas.length ? c.tiendas : [c.tienda || {}];
    return Object.assign({ nombre: c.nombre }, (o && o.tienda) || l[0] || {});
  },
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
  const nw = w.querySelector('.bk-wa-tt span'); if (nw) nw.textContent = t('now');
  w.onclick = onClick || null;
  w.classList.add('bk-show');
  clearTimeout(waTimer);
  waTimer = setTimeout(hideWa, ms || 12000);
}
function hideWa() { if (waEl) waEl.classList.remove('bk-show'); }

Brinco._ui = { toast, waNote: showWa, hideWa, bword, icons: ICONS, isOpen: () => false };

/* --- src/core/65-vault.js --- */
/* ===== Brinco Kit · aviso de confianza: Brinco no guarda tarjetas (las guarda AZUL, CardNet o MIO) ===== */
const PROCS = () => `<span class="bk-vault-procs" aria-label="${t('vaultProcs')}"><i>AZUL</i><i>CardNet</i><i>MIO</i></span>`;
function vaultHTML(compact) {
  if (compact) return `<p class="bk-vault-line">${ICONS.shield}<span>${t('vaultLine')}</span></p>`;
  return `<div class="bk-vault"><span class="bk-vault-ic">${ICONS.shield}</span><div class="bk-vault-tx"><b>${t('vaultT')}</b><span>${t('vaultTx')}</span>${PROCS()}</div></div>`;
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
window.addEventListener('brinco:lang', () => { $$('[data-brinco="vault-footer"][data-bk-done]').forEach((el) => el.removeAttribute('data-bk-done')); fillVaultFooters(document); });
Brinco.fill = function (r) { fillVaultFooters(r || document); };
Brinco._vault = { html: vaultHTML, footerHTML: vaultFooterHTML, fill: fillVaultFooters };

/* --- src/core/70-brinco.js --- */
/* ===== Brinco Kit · Cuenta Brinco =====
   En *.sandscap.com.do la cuenta vive en el servidor de Brinco (brinco.sandscap.com.do):
   el código de WhatsApp se revisa allá, la sesión es una cookie HttpOnly que el sitio no puede leer ni falsificar,
   y las tarjetas son tokens del adquiriente que nunca llegan al navegador.
   En este equipo solo quedan las direcciones de entrega y el correo (perfil local).
   Fuera de sandscap.com.do (pruebas en localhost) se usa el modo demo, sin servidor y sin cobros. */
const SHARED = /(^|\.)sandscap\.com\.do$/.test(location.hostname) ? 'sandscap.com.do' : null;
const WALLET = ((SCRIPT && SCRIPT.getAttribute('data-wallet')) || (SHARED ? 'https://brinco.sandscap.com.do' : '')).replace(/\/$/, '');
// La cuenta ya no viaja en cookies compartidas ni se guarda en el localStorage: se borra lo que dejaron versiones anteriores
(function cleanup() {
  if (SHARED) ['brinco_acc', 'brinco_s'].forEach((n) => { try { document.cookie = n + '=; domain=.' + SHARED + '; path=/; max-age=0; secure; samesite=lax'; } catch (e) {} });
  if (WALLET) { store.del('brinco_accounts'); store.del('brinco_session'); }
})();
const W = {
  on: !!WALLET, me: null, cards: [], otpMode: 'test', hadAccount: false, ready: Promise.resolve(),
  call(path, method, body) {
    return fetch(WALLET + '/v1' + path, { method: method || 'GET', credentials: 'include', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
      .catch(() => { throw Object.assign(new Error(t('wOffline')), { status: 0 }); })
      .then((r) => r.json().catch(() => ({})).then((d) => { if (!r.ok) throw Object.assign(new Error(d.error || t('wErr')), { status: r.status }); return d; }));
  },
  apply(d) { W.me = d.account || null; W.cards = d.cards || []; if (d.otp_mode) W.otpMode = d.otp_mode; },
  loaded: false,
  refresh() { W.ready = W.call('/me').then(W.apply, () => {}).then(() => { W.loaded = true; }); return W.ready; },
  sendCode(phone) { return W.call('/otp/send', 'POST', { phone }).then((d) => { W.otpMode = d.test_mode ? 'test' : 'whatsapp'; W.hadAccount = !!d.has_account; return d; }); },
  // gLink: Google ya confirmado pero sin Cuenta Brinco todavía → el boleto liga ese correo al confirmar el WhatsApp
  gLink: null,
  verify(phone, code, name) {
    return W.call('/otp/verify', 'POST', { phone, code, name: name || (W.gLink && W.gLink.name) || '', google: W.gLink ? W.gLink.google : undefined })
      .then((d) => { W.apply(d); W.gLink = null; return d; });
  },
  // Entrar con Google: el pase de Cuenta Sandscap (site 'brinco') lo verifica el servidor de Brinco.
  google(pase) {
    return W.call('/auth/google', 'POST', { pase }).then((d) => {
      if (d.account) { W.apply(d); W.gLink = null; } else if (d.necesitaTelefono) W.gLink = { google: d.google, email: d.email || '', name: d.name || '' };
      return d;
    });
  },
  saveCard(card, text) {
    return W.call('/cards', 'POST', { merchant: C().negocio, token: card.token, brand: card.brand, last4: card.last4, exp: card.exp, processor: 'AZUL',
      consent: { accepted: true, text, version: '2026-10' } }).then((d) => { W.cards = d.cards || W.cards; return d; });
  },
  // El Wallet recalcula el total con el "catalogo" de este brinco.json; si no cuadra, no cobra.
  pay(cardId, amount, reference, order) {
    return W.call('/pay', 'POST', Object.assign({ merchant: C().negocio, card_id: cardId, amount, reference, description: C().nombre + ' ' + reference }, order || {}));
  },
  logout() { const done = () => { W.me = null; W.cards = []; }; return W.call('/logout', 'POST').then(done, done); }
};
// Perfil local (solo este equipo): nombre, correo y direcciones de la cuenta en sesión
const P = {
  all() { return store.get('brinco_profile', {}); },
  get(phone) { return P.all()[phone] || {}; },
  set(phone, v) { const a = P.all(); a[phone] = v; store.set('brinco_profile', a); }
};
// Modo demo (sin servidor de Brinco): todo en el localStorage de este sitio, sin cookies
const demo = {
  accounts() { return store.get('brinco_accounts', {}); },
  save(a) { store.set('brinco_accounts', a); },
  session() { return store.get('brinco_session', null); },
  me() { const s = demo.session(); if (!s) return null; return demo.accounts()[s.phone] || null; },
  login(phone) { store.set('brinco_session', { phone: phoneDigits(phone), at: Date.now() }); },
  logout() { store.del('brinco_session'); },
  upsert(phone, fn) { const a = demo.accounts(); const k = phoneDigits(phone); a[k] = fn(a[k] || null); if (a[k]) a[k].touched = Date.now(); demo.save(a); return a[k]; },
  consent(acc, type, text) { (acc.consents = acc.consents || []).push({ type, text, at: new Date().toISOString(), channel: 'web', v: '2026-10' }); }
};
const B = !W.on ? demo : {
  accounts() { const m = B.me(); return m ? { [m.phone]: m } : {}; },
  session() { return W.me ? { phone: W.me.phone } : null; },
  me() {
    if (!W.me) return null;
    const p = P.get(W.me.phone);
    return { phone: W.me.phone, name: W.me.name || p.name || '', email: p.email || W.me.email || '', addresses: p.addresses || [], consents: p.consents || [], merchants: [],
      cards: W.cards.map((c, i) => ({ id: c.id, brand: String(c.brand || '').toLowerCase(), last4: c.last4, exp: c.exp, processor: String(c.processor || '').toLowerCase(), main: i === 0 })) };
  },
  login() {},          // la sesión la abre el servidor de Brinco cuando el código es correcto
  logout() { return W.logout(); },
  upsert(phone, fn) {
    const k = phoneDigits(phone), cur = B.me();
    const acc = fn(cur && cur.phone === k ? JSON.parse(JSON.stringify(cur)) : null);
    if (acc) P.set(k, { name: acc.name || '', email: acc.email || '', addresses: (acc.addresses || []).slice(-3), consents: (acc.consents || []).slice(-6) });
    return acc;
  },
  consent: demo.consent
};
if (W.on) W.refresh();
// «Continuar con Google» (Cuenta Sandscap): cliente.js se carga solo cuando se muestra el botón o se vuelve de Google,
// así el HTML de cada tienda no cambia.
const G_SITE = 'brinco';
const CUENTA_JS = (SCRIPT && SCRIPT.getAttribute('data-cuenta')) || 'https://cuenta.sandscap.com.do/cliente.js';
let gLoad = null;
function loadGoogle() {
  if (window.SandscapGoogle) return Promise.resolve(window.SandscapGoogle);
  return gLoad || (gLoad = new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = CUENTA_JS; s.async = true;
    s.onload = () => (window.SandscapGoogle ? ok(window.SandscapGoogle) : ko(new Error('google')));
    s.onerror = () => { gLoad = null; ko(new Error('google')); };
    document.head.appendChild(s);
  }));
}
Brinco._account = B;
Brinco._wallet = W;
Brinco._shared = SHARED;

/* --- src/core/75-inapp.js --- */
/* ===== Brinco Kit · Navegador dentro de Instagram/Facebook/TikTok =====
   Sandscap no usa biometría en ningún producto.
   La cuenta Brinco se verifica solo con el código de WhatsApp. */
const UA = navigator.userAgent || '';
const ANDROID = /Android/i.test(UA);
const INAPP = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|FB4A|TikTok|musical_ly|BytedanceWebview|Snapchat|Line\/|LinkedInApp|Twitter|GSA\//i.test(UA) || (ANDROID && /; wv\)/.test(UA));
Brinco._inapp = INAPP;

/* --- src/core/80-checkout.js --- */
/* ===== Brinco Kit · caja con tarjeta (campos de AZUL) y "Pagar con Brinco" =====
   Ambiente de pruebas: ningún dato de tarjeta sale del navegador ni se guarda.
   De la tarjeta solo se conserva marca, últimos 4 y vencimiento (como el token del procesador). */
const BRAND_IMG = { visa: 'visa.webp', mastercard: 'mastercard.webp' };
const brandImg = (b) => (BRAND_IMG[b] ? Brinco._img(BRAND_IMG[b]) : '');
const cardBrand = (n) => { const d = digits(n); if (/^4/.test(d)) return 'visa'; if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard'; if (/^3[47]/.test(d)) return 'amex'; return null; };
const luhn = (n) => { const d = digits(n); if (d.length < 13) return false; let s = 0, alt = false; for (let i = d.length - 1; i >= 0; i--) { let x = +d[i]; if (alt) { x *= 2; if (x > 9) x -= 9; } s += x; alt = !alt; } return s % 10 === 0; };
const brandName = (b) => ({ visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex' }[b] || t('card'));
const authCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const declineMsg = (c) => t('d' + c) !== 'd' + c ? t('d' + c) : t('d05');
const ent = () => Object.assign({ delivery: true, pickup: true, deliveryMin: 35, deliveryMax: 45, pickupMin: 20 }, C().entrega || {});
const SHIP = () => (ent().delivery ? Number(C().envio) || 0 : 0);
const cart = () => window.BrincoCart || null;
// v1.1: ITBIS aparte, envío gratis desde un monto, varias tiendas, pedidos programados
const itbisCfg = () => { const i = C().itbis || {}; return { incl: i.incluido !== false, tasa: Number(i.tasa != null ? i.tasa : 0.18) }; };
const freeFrom = () => Number(C().envioGratisDesde) || 0;
// Tarifa de servicio de Brinco: fija por pedido con delivery, la paga el cliente, va aparte del ITBIS. brinco.json "cargoPlataforma" (por defecto 100).
const PLAT = () => { const v = C().cargoPlataforma; return v == null ? 100 : Number(v) || 0; };
const platFor = (mode) => (mode === 'delivery' && ent().delivery ? PLAT() : 0);
function shipFor(mode, base) { if (mode !== 'delivery') return 0; const g = freeFrom(); return g && base >= g ? 0 : SHIP(); }
function stores() {
  const l = Array.isArray(C().tiendas) && C().tiendas.length ? C().tiendas : [Object.assign({ nombre: C().nombre }, C().tienda || {})];
  return l.map((x) => Object.assign({ nombre: C().nombre }, x));
}
const curStore = () => { const l = stores(); return l[Math.min(S.store || 0, l.length - 1)] || l[0]; };
const progOn = () => !!(C().programar && C().programar.activo);
function hm(s, d) { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '')); return m ? [+m[1], +m[2]] : d; }
// Días y horas disponibles: desde ahora + anticipación, dentro del horario, durante "dias" días
function buildSlots() {
  const p = C().programar || {};
  const lead = (Number(p.anticipacionHoras) || 0) * 3600e3, step = (Number(p.intervaloMin) || 30) * 60e3, want = Number(p.dias) || 7;
  const h = p.horario || {}, op = hm(h.apertura, [8, 0]), cl = hm(h.cierre, [20, 0]);
  const earliest = Date.now() + lead, out = [];
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  for (let d = 0; d < want + Math.ceil(lead / 864e5) + 2 && out.length < want; d++) {
    const day = new Date(d0); day.setDate(d0.getDate() + d);
    const a = new Date(day); a.setHours(op[0], op[1], 0, 0);
    const z = new Date(day); z.setHours(cl[0], cl[1], 0, 0);
    const times = [];
    for (let x = a.getTime(); x + step <= z.getTime() + 1; x += step) if (x >= earliest) times.push(x);
    if (times.length) out.push({ day: day.getTime(), times });
  }
  return out;
}
function dayLabel(ms) {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const n = Math.round((ms - d0.getTime()) / 864e5);
  const dm = new Date(ms).toLocaleDateString(loc(), { day: 'numeric', month: 'short' });
  return n === 0 ? t('today') + ', ' + dm : n === 1 ? t('tomorrow') + ', ' + dm : new Date(ms).toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short' });
}
function progHTML(px) {
  if (!progOn()) return '';
  const sl = buildSlots();
  if (!sl.length) return `<div class="bk-sec"><h3>${t('when')}</h3><p class="bk-muted">${t('noSlots')}</p></div>`;
  if (!S.prog || !sl.some((d) => d.times.indexOf(S.prog) >= 0)) S.prog = sl[0].times[0];
  const cur = sl.find((d) => d.times.indexOf(S.prog) >= 0) || sl[0];
  return `<div class="bk-sec bk-when"><h3>${t('when')}</h3><div class="bk-row2">
    <div class="bk-fld"><label for="${px}Day">${t('day')}</label><select id="${px}Day">${sl.map((d) => `<option value="${d.day}"${d === cur ? ' selected' : ''}>${esc(dayLabel(d.day))}</option>`).join('')}</select></div>
    <div class="bk-fld"><label for="${px}Slot">${t('hour')}</label><select id="${px}Slot">${slotOpts(cur)}</select></div>
  </div></div>`;
}
function slotOpts(d) { return d.times.map((x) => `<option value="${x}"${x === S.prog ? ' selected' : ''}>${esc(hhmm(x))}</option>`).join(''); }
function bindProg(px) {
  const dy = body.querySelector('#' + px + 'Day'), sl = body.querySelector('#' + px + 'Slot');
  if (!dy || !sl) return;
  dy.addEventListener('change', () => { const d = buildSlots().find((x) => String(x.day) === dy.value); if (!d) return; S.prog = d.times[0]; sl.innerHTML = slotOpts(d); });
  sl.addEventListener('change', () => { S.prog = +sl.value; });
}
function storesHTML(px) {
  const l = stores(); if (l.length < 2) return '';
  return `<div class="bk-sec bk-stores" id="${px}Stores"><h3>${t('storeChoose')}</h3>${l.map((x, i) => `<button type="button" class="bk-opt" role="radio" data-store="${i}" aria-checked="${(S.store || 0) === i}"><span class="bk-dot"></span><span class="bk-otx"><b>${esc(x.nombre)}</b><span>${esc(x.direccion || '')}</span></span></button>`).join('')}</div>`;
}
const notaHTML = (c) => (c.nota ? `<small class="bk-nota">“${esc(c.nota)}”</small>` : '');
const CONSENT_CARD = 'Guardar esta tarjeta para mis compras en negocios Brinco. Brinco no guarda tu tarjeta: la guarda tu procesador de pago (AZUL, CardNet o MIO).';
const CONSENT_ACC = 'Guardar mis datos en Brinco para pagar con un toque en cualquier negocio Brinco';

// ---------- Estado de la caja ----------
const S = { mode: 'delivery', view: 'checkout', hist: [], pendingPay: null, otpCode: '', otpPhone: '', otpNext: null,
  bAddr: null, bCard: null, bNew: false, coupon: null, store: 0, prog: null, form: store.get('brinco_form', null) };

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
  const disc = S.coupon ? Math.min(sub, Number(S.coupon.monto) || 0) : 0;
  const ship = shipFor(mode || S.mode, sub - disc);
  const ic = itbisCfg(), base = Math.max(0, sub - disc + ship);
  const tax = ic.incl ? 0 : Math.round(base * ic.tasa);
  const plat = platFor(mode || S.mode);
  return { items, sub, ship, disc, tax, plat, taxRate: ic.tasa, taxIncl: ic.incl, total: base + tax + plat };
}
// Revisión: cada línea del carrito debe costar lo mismo que dice el "catalogo" de brinco.json (lo que usa el Wallet).
function skuUnit(cat, sku) {
  if (!cat || !sku) return null;
  const pr = cat.productos && cat.productos[sku.p];
  let u = typeof pr === 'number' ? pr : pr && typeof pr[sku.v] === 'number' ? pr[sku.v] : null;
  if (u == null) return null;
  for (const x of sku.x || []) { const e = cat.extras && cat.extras[x]; if (typeof e !== 'number') return null; u += e; }
  return u;
}
Brinco.checkPrices = function () {
  const items = cart() ? cart().items() || [] : [];
  return items.filter((c) => skuUnit(C().catalogo, c.sku) !== c.unit).map((c) => ({ name: c.name, sku: c.sku || null, unit: c.unit, menu: skuUnit(C().catalogo, c.sku) }));
};
function sumHTML(mode) {
  const tt = totals(mode);
  return `<div class="bk-sum">
    ${tt.items.map((c) => `<div class="bk-l"><span>${c.qty} × ${esc(c.name)}${c.detail ? ` <small class="bk-dim">· ${esc(c.detail)}</small>` : ''}${notaHTML(c)}</span><span>${fmt(c.qty * c.unit)}</span></div>`).join('')}
    <div class="bk-l bk-l-sub"><span>${t('subtotal')}</span><span>${fmt(tt.sub)}</span></div>
    <div class="bk-l"><span>${(mode || S.mode) === 'delivery' ? t('ship') : t('pickup')}</span><span>${tt.ship ? fmt(tt.ship) : t('free')}</span></div>
    ${tt.disc ? `<div class="bk-l bk-l-disc"><span>${t('coupon')} ${esc(S.coupon.codigo)}</span><span>− ${fmt(tt.disc)}</span></div>` : ''}
    ${tt.tax ? `<div class="bk-l bk-l-tax"><span>${t('itbisLine', { p: Math.round(tt.taxRate * 100) })}</span><span>${fmt(tt.tax)}</span></div>` : ''}
    ${tt.plat ? `<div class="bk-l bk-l-plat"><span>${t('plat')}</span><span>${fmt(tt.plat)}</span></div>` : ''}
    <div class="bk-l bk-tot"><span>${t('total')}</span><span>${fmt(tt.total)}</span></div>
    ${tt.taxIncl ? `<span class="bk-note">${t('itbis')}</span>` : ''}
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
      <div class="bk-fld"><label for="${prefix}Exp">${t('exp')}</label><input id="${prefix}Exp" inputmode="numeric" autocomplete="cc-exp" placeholder="${t('expPh')}" maxlength="5"><span class="bk-err">${t('expErr')}</span></div>
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
  const tok = 'tok_test_' + Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
  return { brand, last4: d.slice(-4), exp, holder, token: tok, declineCode: d === '4000000000000002' ? '51' : null };
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
        <button type="button" data-mode="delivery" aria-pressed="${S.mode === 'delivery'}">${t('delivery')}<small id="coShipTx">${shipSmall()}</small></button>
        <button type="button" data-mode="pickup" aria-pressed="${S.mode === 'pickup'}">${t('pickup')}<small>${t('free')} · ${e.pickupMin} ${t('min')}</small></button>
      </div>${freeHint()}</div>` : (e.delivery && freeFrom() ? `<div class="bk-sec">${freeHint()}</div>` : '')}
    <div id="coStoresWrap"${S.mode === 'pickup' ? '' : ' hidden'}>${storesHTML('co')}</div>
    ${progHTML('co')}
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
    ${cup && cup.codigo ? `<div class="bk-coupon"><div class="bk-fld"><label for="coCoupon">${t('coupon')}${cup.texto ? ` <span class="bk-dim">· ${esc(cup.texto)}</span>` : ''}</label><div class="bk-coupon-row"><input id="coCoupon" autocomplete="off" placeholder="${esc(cup.codigo)}" value="${S.coupon ? esc(S.coupon.codigo) : ''}"><button type="button" class="bk-coupon-go" id="coCouponGo">${S.coupon ? '✓' : t('apply')}</button></div><span class="bk-err">${t('couponErr')}</span></div></div>` : ''}
    <div id="coSum">${sumHTML()}</div>
    <button class="bk-pay" type="button" id="coPay">${ICONS.lock(18)}<span>${t('pay')} ${fmt(tt.total)}</span></button>
    ${testNote()}${badgesHTML()}`, { root: true, replace: o.replace });
  // Si ya llenó algo antes, se lo devolvemos
  const d = S.form || {};
  ['coName', 'coPhone', 'coStreet', 'coSector', 'coRef'].forEach((k) => { const el = $('#' + k, body); if (el && d[k]) el.value = d[k]; });
  if (!S.geo && d.geo) S.geo = d.geo;
  geoAddr('co');
  bindAzul('c');
  $('#coPhone', body).addEventListener('input', (ev) => { ev.target.value = fmtPhone(ev.target.value); setErr('coPhone', false); });
  ['coName', 'coStreet', 'coSector'].forEach((k) => { const el = $('#' + k, body); if (el) { el.addEventListener('input', () => setErr(k, false)); el.addEventListener('change', () => setErr(k, false)); } });
  const repaint = () => {
    $('#coSum', body).innerHTML = sumHTML(); $('#coPay span', body).textContent = t('pay') + ' ' + fmt(totals().total);
    const st = $('#coShipTx', body); if (st) st.textContent = shipSmall();
    const fh = $('#coFree', body); if (fh) fh.outerHTML = freeHint();
  };
  bindProg('co');
  $$('[data-store]', body).forEach((b) => b.addEventListener('click', () => { S.store = +b.dataset.store; $$('[data-store]', body).forEach((x) => x.setAttribute('aria-checked', String(x === b))); }));
  $$('[data-mode]', body).forEach((b) => b.addEventListener('click', () => {
    S.mode = b.dataset.mode;
    $$('[data-mode]', body).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('#coAddr', body).hidden = S.mode !== 'delivery';
    $('#coStoresWrap', body).hidden = S.mode !== 'pickup';
    repaint();
  }));
  const cgo = $('#coCouponGo', body);
  if (cgo) {
    const apply = () => {
      const v = $('#coCoupon', body).value.trim().toUpperCase();
      const ok = v && v === String(cup.codigo).toUpperCase();
      setErr('coCoupon', !!v && !ok);
      S.coupon = ok ? cup : null; cgo.textContent = ok ? '✓' : t('apply');
      if (ok) track('cupon', { codigo: cup.codigo });
      repaint();
    };
    cgo.addEventListener('click', apply);
    $('#coCoupon', body).addEventListener('keydown', (ev) => { if (ev.key === 'Enter') apply(); });
  }
  $('#bPayBtn', body).addEventListener('click', () => { keepForm(); track('brinco_boton'); startBrinco(); });
  $('#coPay', body).addEventListener('click', payWithCard);
};

function shipSmall() {
  const e = ent(), tt = totals('delivery');
  return (tt.ship ? '+' + fmt(tt.ship) : t('free')) + ' · ' + e.deliveryMin + '–' + e.deliveryMax + ' ' + t('min');
}
// "Te faltan RD$X para envío gratis" / "¡Tu envío es gratis!" (solo con envioGratisDesde)
function freeHint() {
  const g = freeFrom(); if (!g || !ent().delivery) return '';
  const tt = totals('delivery'), left = g - (tt.sub - tt.disc);
  return `<p class="bk-free${left <= 0 ? ' bk-free-ok' : ''}" id="coFree">${left <= 0 ? t('freeOk') : t('freeLeft', { x: fmt(left) })}</p>`;
}

/* --- Dirección con GPS y autocompletado (Google Maps: Places API (New) + Geocoding) ---
   brinco.json "mapsKey" o la llave de Sandscap (restringida a *.sandscap.com.do). Si Maps no carga, el formulario sigue igual. */
const MAPS_KEY = () => C().mapsKey || 'AIzaSyCBSV4QKk6s423XvNZn87lZI3z9xY1SRYY';
const SD = { lat: 18.4735, lng: -69.9310 };
let GM = null;
function gmaps() {
  if (GM) return GM;
  GM = new Promise((res, rej) => {
    if (window.google && window.google.maps && window.google.maps.importLibrary) { res(window.google.maps); return; }
    window.__bkMapsReady = () => res(window.google.maps);
    const sc = document.createElement('script');
    sc.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(MAPS_KEY()) + '&v=weekly&language=' + (LANG === 'en' ? 'en' : 'es') + '&region=DO&loading=async&callback=__bkMapsReady';
    sc.async = true; sc.onerror = () => { GM = null; rej(new Error('maps')); };
    document.head.appendChild(sc);
    setTimeout(() => rej(new Error('maps-timeout')), 15000);
  });
  return GM;
}
const fold = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
function shortAddr(full) {
  return String(full || '').replace(/,?\s*(Rep[uú]blica Dominicana|Dominican Republic)\s*$/i, '').replace(/,?\s*\d{5}\b/g, '').replace(/\s+,/g, ',').trim();
}
// Componentes de Google -> sector de brinco.json (Naco, Piantini…)
function pickSector(comps) {
  const opts = C().sectores || [];
  const names = (comps || []).filter((c) => (c.types || []).some((tp) => /neighborhood|sublocality|locality/.test(tp))).map((c) => fold(c.longText || c.long_name));
  for (const n of names) { const hit = opts.find((o) => fold(o) === n || n.includes(fold(o)) || fold(o).includes(n)); if (hit) return hit; }
  return '';
}
function geoAddr(px) {
  const st = $('#' + px + 'Street', body), sec = $('#' + px + 'Sector', body);
  if (!st || st.dataset.bkGeo) return;
  st.dataset.bkGeo = '1';
  const fld = st.closest('.bk-fld');
  fld.insertAdjacentHTML('beforebegin', `<button type="button" class="bk-geo" id="${px}Geo">${ICONS.pin}<span>${t('geoUse')}</span></button>`);
  fld.classList.add('bk-ac-wrap');
  st.insertAdjacentHTML('afterend', `<div class="bk-ac" id="${px}Ac" role="listbox" hidden></div>`);
  fld.insertAdjacentHTML('afterend', `<div class="bk-map-wrap" id="${px}MapWrap" hidden><div class="bk-map" id="${px}Map"></div><p class="bk-geo-note" id="${px}GeoNote">${t('geoPin')}</p></div>`);
  st.setAttribute('autocomplete', 'off');
  const ac = $('#' + px + 'Ac', body), btn = $('#' + px + 'Geo', body), note = $('#' + px + 'GeoNote', body);
  let token = null, timer = null, map = null, marker = null, seq = 0;
  const setGeo = (lat, lng, src) => { S.geo = { lat: +lat.toFixed(6), lng: +lng.toFixed(6), src }; S.form = Object.assign(S.form || {}, { geo: S.geo }); };
  const applyComps = (comps) => {
    if (!sec) return;
    const s = pickSector(comps);
    if (s) { sec.value = s; setErr(px + 'Sector', false); note.textContent = t('geoSaved'); }
    else if (!sec.value) note.textContent = t('geoOutside');
  };
  async function showMap(lat, lng) {
    const g = await gmaps(); const { Map } = await g.importLibrary('maps'); const { Marker } = await g.importLibrary('marker');
    $('#' + px + 'MapWrap', body).hidden = false;
    const pos = { lat, lng };
    if (!map) {
      map = new Map($('#' + px + 'Map', body), { center: pos, zoom: 17, disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false });
      marker = new Marker({ position: pos, map, draggable: true });
      marker.addListener('dragend', () => { const p = marker.getPosition(); setGeo(p.lat(), p.lng(), 'pin'); reverse(p.lat(), p.lng(), false); });
      map.addListener('click', (e) => { marker.setPosition(e.latLng); setGeo(e.latLng.lat(), e.latLng.lng(), 'pin'); reverse(e.latLng.lat(), e.latLng.lng(), false); });
    } else { map.setCenter(pos); marker.setPosition(pos); }
  }
  async function reverse(lat, lng, fillStreet) {
    try {
      const g = await gmaps(); const { Geocoder } = await g.importLibrary('geocoding');
      const r = await new Geocoder().geocode({ location: { lat, lng }, language: LANG === 'en' ? 'en' : 'es' });
      const best = (r.results || []).find((x) => !(x.types || []).includes('plus_code')) || (r.results || [])[0];
      if (!best) return;
      if (fillStreet || !st.value.trim()) { st.value = shortAddr(best.formatted_address); setErr(px + 'Street', false); }
      applyComps(best.address_components);
    } catch (e) {}
  }
  btn.addEventListener('click', () => {
    if (!navigator.geolocation) { note.textContent = t('geoDenied'); $('#' + px + 'MapWrap', body).hidden = false; return; }
    btn.disabled = true; btn.querySelector('span').textContent = t('geoBusy');
    navigator.geolocation.getCurrentPosition(async (p) => {
      btn.disabled = false; btn.querySelector('span').textContent = t('geoUse');
      const { latitude: lat, longitude: lng } = p.coords;
      setGeo(lat, lng, 'gps'); track('geo_gps');
      try { await showMap(lat, lng); } catch (e) {}
      reverse(lat, lng, true);
    }, () => {
      btn.disabled = false; btn.querySelector('span').textContent = t('geoUse');
      const w = $('#' + px + 'MapWrap', body); w.hidden = false; $('#' + px + 'Map', body).hidden = true; note.textContent = t('geoDenied');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });
  const close = () => { ac.hidden = true; ac.innerHTML = ''; };
  st.addEventListener('input', () => {
    clearTimeout(timer);
    const q = st.value.trim();
    if (q.length < 3) { close(); return; }
    timer = setTimeout(async () => {
      const my = ++seq;
      try {
        const g = await gmaps(); const { AutocompleteSessionToken, AutocompleteSuggestion } = await g.importLibrary('places');
        token = token || new AutocompleteSessionToken();
        const center = S.geo ? { lat: S.geo.lat, lng: S.geo.lng } : SD;
        const r = await AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: q, sessionToken: token, includedRegionCodes: ['do'], language: LANG === 'en' ? 'en' : 'es', locationBias: { center, radius: 25000 } });
        if (my !== seq) return;
        const list = (r.suggestions || []).map((x) => x.placePrediction).filter(Boolean).slice(0, 5);
        if (!list.length) { close(); return; }
        ac.innerHTML = list.map((pp, i) => `<button type="button" role="option" data-i="${i}">${ICONS.pin}<span><b>${esc(pp.mainText ? pp.mainText.toString() : pp.text.toString())}</b><small>${esc(pp.secondaryText ? pp.secondaryText.toString() : '')}</small></span></button>`).join('');
        ac.hidden = false;
        $$('button', ac).forEach((b) => b.addEventListener('mousedown', async (ev) => {
          ev.preventDefault();
          const pp = list[+b.dataset.i]; close();
          st.value = shortAddr(pp.text.toString()); setErr(px + 'Street', false);
          try {
            const place = pp.toPlace(); await place.fetchFields({ fields: ['formattedAddress', 'location', 'addressComponents'] });
            token = null;
            if (place.formattedAddress) st.value = shortAddr(place.formattedAddress);
            if (place.location) { const la = place.location.lat(), ln = place.location.lng(); setGeo(la, ln, 'buscador'); track('geo_buscador'); showMap(la, ln).catch(() => {}); }
            applyComps(place.addressComponents);
          } catch (e) {}
        }));
      } catch (e) { close(); }
    }, 220);
  });
  st.addEventListener('blur', () => setTimeout(close, 150));
  st.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close(); });
  // si ya había una ubicación en este pedido, se vuelve a mostrar
  if (S.geo) showMap(S.geo.lat, S.geo.lng).then(() => { note.textContent = t('geoSaved'); }).catch(() => {});
  gmaps().catch(() => { btn.hidden = true; });   // sin Maps: solo el formulario de siempre
}
const mapURL = (a) => (a && a.lat != null ? 'https://www.google.com/maps/search/?api=1&query=' + a.lat + ',' + a.lng : '');

function keepForm() {
  S.form = {};
  ['coName', 'coPhone', 'coStreet', 'coSector', 'coRef'].forEach((k) => { const el = $('#' + k, body); if (el) S.form[k] = el.value; });
  if (S.geo) S.form.geo = S.geo;
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
  S.pendingPay = { via: 'tarjeta', name, phone: phoneDigits(phone), mode: S.mode, address: S.mode === 'delivery' ? Object.assign({ street, sector, ref, label: t('home') }, S.geo ? { lat: S.geo.lat, lng: S.geo.lng } : {}) : null, card, save, total: tt.total,
    store: S.mode === 'pickup' ? curStore() : null, prog: progOn() ? S.prog : null };
  wipeAzul('c');
  track('pago_enviado', { total: tt.total, metodo: 'tarjeta', guardar: save });
  if (save) sendOtp(phone, () => verify3ds());   // Cuenta Brinco nueva al pagar (flujo A): primero confirmamos el WhatsApp
  else verify3ds();
}

// --- Código por WhatsApp (simulado: aparece como notificación) ---
function sendOtp(phone, next) {
  S.otpPhone = phoneDigits(phone);
  S.otpNext = next;
  S.otpTries = 0;
  if (W.on) {
    show('verify', `<div class="bk-view bk-verify bk-flat">${bword(28)}<div class="bk-spin"></div><p class="bk-muted">${t('otpSending')}</p></div>`, { brinco: true });
    W.sendCode(S.otpPhone).then(() => otpView(), (e) => { toast(e.message); back(); });
    return;
  }
  S.otpCode = String(Math.floor(100000 + Math.random() * 900000));
  otpView();
}
function otpView() {
  show('otp', `
    <div class="bk-center bk-stack">
      ${bword(28)}
      <p class="bk-h3">${t('otpTitle')}</p>
      <p class="bk-muted">${t('otpSent', { phone: '<b>' + fmtPhone(S.otpPhone) + '</b>' })}</p>
    </div>
    <div class="bk-otp" id="otpBoxes"><input inputmode="numeric" autocomplete="one-time-code" aria-label="${t('digit', { n: 1 })}">${[2, 3, 4, 5, 6].map((n) => `<input inputmode="numeric" aria-label="${t('digit', { n })}">`).join('')}</div>
    ${W.on && W.otpMode === 'test' ? `<p class="bk-info-msg" role="status">${t('otpTest')}</p>` : ''}
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
    if (W.on) {
      checked = true;
      const name = (S.pendingPay && S.pendingPay.name) || (S.form && S.form.coName) || '';
      W.verify(S.otpPhone, code, name).then(() => { track('codigo_ok'); S.otpNext && S.otpNext(); }, (e) => {
        checked = false; S.otpTries++;
        if (S.view !== 'otp') return;
        $('#otpBoxes', body).classList.add('bk-bad');
        $('#otpMsg', body).textContent = e.message;
        boxes.forEach((x) => { x.value = ''; }); boxes[0].focus();
      });
      return;
    }
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
  if (W.on) return;   // el código llega por WhatsApp desde el servidor de Brinco; aquí nunca se muestra
  const code = S.otpCode;
  setTimeout(() => { if (S.view === 'otp' && S.otpCode === code) showWa(t('otpMsg', { code: `<b>${code.slice(0, 3)} ${code.slice(3)}</b>` }), () => { if (S.view === 'otp') fill(S.otpCode, 0); }); }, 900);
}

// --- 3D Secure y cobro ---
function verify3ds() {
  const p = S.pendingPay;
  const logo = Brinco._img(p.card.brand === 'mastercard' ? 'mastercard-id-check.webp' : 'visa-secure.webp');
  show('verify', `<div class="bk-view bk-verify bk-flat">
    <img class="bk-logo3ds" src="${logo}" alt="">
    <p class="bk-h3">${t('verifyBank')}</p>
    <p class="bk-muted">${brandName(p.card.brand)} •••• ${p.card.last4} · ${fmt(p.total)}</p>
    <div class="bk-spin" aria-label="${t('processingAria')}"></div>
    <p class="bk-muted bk-small">${t('noClose')}</p></div>`, { replace: true, brinco: p.via === 'brinco' });
  $('#coBack', root).hidden = true;
  setTimeout(charge, 2100);
}
function processing() {
  const p = S.pendingPay;
  if (W.on && p && p.via === 'brinco') {
    p.no = p.no || Brinco.orders.newNo();
    show('verify', `<div class="bk-view bk-verify bk-flat">
    ${bword(30)}
    <div class="bk-spin" aria-label="${t('processingAria')}"></div>
    <p class="bk-h3">${t('processing')}</p>
    <p class="bk-muted">${brandName(p.card.brand)} •••• ${p.card.last4} · ${fmt(p.total)}</p></div>`, { replace: true, brinco: true });
    $('#coBack', root).hidden = true;
    const tt0 = totals(p.mode);
    const order = { items: tt0.items.map((c) => ({ sku: c.sku || null, qty: c.qty })), mode: p.mode, coupon: S.coupon ? S.coupon.codigo : null };
    W.pay(p.card.id, p.total, p.no, order).then((r) => { p.auth = r.ref; charge(); }, (e) => {
      track('rechazo', { codigo: e.status || 'error', metodo: 'brinco' });
      if (e.status === 401) { VIEWS.bLogin({ replace: true, phone: p.phone, msg: e.message }); return; }
      VIEWS.bSummary({ root: true, error: e.message });
    });
    return;
  }
  show('verify', `<div class="bk-view bk-verify bk-flat">
    ${bword(30)}
    <div class="bk-spin" aria-label="${t('processingAria')}"></div>
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
    no: p.no || Brinco.orders.newNo(), negocio: C().negocio,
    at: Date.now(), items: tt.items.map((c) => { const x = { name: c.name, detail: c.detail || '', qty: c.qty, unit: c.unit, img: c.img || '' }; if (c.nota) x.nota = String(c.nota); return x; }),
    sub: tt.sub, ship: tt.ship, disc: tt.disc || 0, coupon: S.coupon ? S.coupon.codigo : null,
    itbis: tt.tax || 0, plat: tt.plat || 0, itbisTasa: tt.taxRate, itbisIncluido: tt.taxIncl, total: tt.total, mode: p.mode,
    tienda: p.mode === 'pickup' && p.store ? { nombre: p.store.nombre || '', direccion: p.store.direccion || '', mapa: p.store.mapa || '' } : null,
    programado: p.prog ? new Date(p.prog).toISOString() : null,
    name: p.name, phone: p.phone, address: p.address, via: p.via,
    card: { brand: p.card.brand, last4: p.card.last4 }, auth: p.auth || authCode(),
    src: src.source, med: src.medium, brincoNew: false
  };
  // Cuenta Brinco: crear o agregar tarjeta (solo marca, últimos 4, vencimiento)
  if (p.via === 'tarjeta' && p.save && W.on) {
    // Cuenta Brinco en el servidor: la tarjeta se guarda como token del adquiriente, con el texto exacto del consentimiento
    B.upsert(p.phone, (acc) => {
      acc = acc || { phone: p.phone, name: p.name, email: '', addresses: [] };
      acc.name = acc.name || p.name;
      B.consent(acc, 'cuenta', CONSENT_ACC);
      if (p.address && !acc.addresses.some((a) => a.street === p.address.street)) acc.addresses.push(Object.assign({ id: Date.now(), main: !acc.addresses.length }, p.address));
      return acc;
    });
    W.saveCard(p.card, CONSENT_CARD).then(() => track('brinco_tarjeta'), (e) => toast(t('wSaveFail') + ' ' + e.message, 6000));
    order.brincoNew = !W.hadAccount;
    track('brinco_cuenta', { nueva: !W.hadAccount });
  } else if (p.via === 'tarjeta' && p.save) {
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
  track('compra', { total: order.total, metodo: order.via, orden: order.no, modo: order.mode, sector: order.address ? order.address.sector : '', tel: order.phone, items: order.items.map((c, i) => ({ sku: ((tt.items[i] || {}).sku || {}).p || c.name, qty: c.qty, unit: c.unit })) });
  try { if (cart() && cart().clear) cart().clear(); } catch (e) { console.error(e); }
  S.coupon = null; S.pendingPay = null;
  const fire = () => { try { window.dispatchEvent(new CustomEvent('brinco:order', { detail: order })); } catch (e) {} };
  VIEWS.done(order); fire();
}

VIEWS.done = function (o) {
  if (!o || !o.no) { VIEWS.checkout({ replace: true }); return; }
  const e = ent();
  show('done', `<div class="bk-view bk-done bk-flat">
    ${ICONS.okmark}
    <p class="bk-h3">${t('done')}</p>
    <span class="bk-ordno">${t('order')} ${esc(o.no)}</span>
    <span class="bk-eta">${ICONS.clock}${o.programado ? t('scheduledFor', { x: esc(fmtWhen(Date.parse(o.programado))) }) : o.mode === 'delivery' ? t('arrives', { a: e.deliveryMin, b: e.deliveryMax }) : t('ready', { a: e.pickupMin })}</span>
    <p class="bk-muted">${t('doneWa', { phone: fmtPhone(o.phone) })}</p>
    <a class="bk-pay bk-track-btn" href="/pedido/?o=${encodeURIComponent(o.no)}">${ICONS.pin}${t('follow')}</a>
    <div class="bk-receipt">
      ${o.items.map((c) => `<div class="bk-l"><span>${c.qty} × ${esc(c.name)}${notaHTML(c)}</span><span>${fmt(c.qty * c.unit)}</span></div>`).join('')}
      <div class="bk-l bk-dim"><span>${o.mode === 'delivery' ? t('ship') : t('pickup')}</span><span>${o.ship ? fmt(o.ship) : t('free')}</span></div>
      ${o.disc ? `<div class="bk-l bk-dim"><span>${t('coupon')} ${esc(o.coupon || '')}</span><span>− ${fmt(o.disc)}</span></div>` : ''}
      ${o.itbis ? `<div class="bk-l bk-dim"><span>${t('itbisLine', { p: Math.round((o.itbisTasa || 0.18) * 100) })}</span><span>${fmt(o.itbis)}</span></div>` : ''}
      ${o.plat ? `<div class="bk-l bk-dim"><span>${t('plat')}</span><span>${fmt(o.plat)}</span></div>` : ''}
      <div class="bk-l bk-rtot"><span>${t('paid')}</span><span>${fmt(o.total)}</span></div>
      <div class="bk-rmeta">${o.via === 'brinco' ? t('paidBrinco') : ''}${brandName(o.card.brand)} •••• ${esc(o.card.last4)} · ${t('auth')} ${esc(o.auth)}${o.address ? '<br>' + t('deliverTo') + ': ' + esc(o.address.street) + ', ' + esc(o.address.sector) + (o.address.lat != null ? ' · <a href="' + mapURL(o.address) + '" target="_blank" rel="noopener">' + t('mapLink') + '</a>' : '') : ''}${o.tienda && stores().length > 1 ? '<br>' + t('pickAt') + ': ' + esc(o.tienda.nombre) + (o.tienda.direccion ? ', ' + esc(o.tienda.direccion) : '') : ''}</div>
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
  VIEWS.bLogin();
}

// Google solo con el servidor de Brinco y fuera de Instagram/Facebook/TikTok (Google no deja entrar desde esos navegadores)
const googleOK = () => W.on && !INAPP;
// Después de entrar con Google: mismo camino que después del código de WhatsApp
function afterGoogle(d, o) {
  o = o || {};
  if (d && d.account) {
    const acc = B.me();
    if (acc && acc.cards && acc.cards.length) { S.bNew = false; VIEWS.bSummary({ root: true }); }
    else { S.bNew = false; VIEWS.bProfile(); }
  } else VIEWS.bLogin({ replace: !!o.replace });
}
function mountGoogle(el) {
  if (!el) return;
  loadGoogle().then((G) => {
    if (!el.isConnected) return;
    G.boton(el, { site: G_SITE, volverA: 'brinco', alEntrar: (pase) => W.google(pase).then((d) => { track('google_ok', { nueva: !d.account }); afterGoogle(d, { replace: true }); }) });
  }, () => { el.hidden = true; });
}
// Al volver de Google la página se recarga: se recibe el pase y se sigue en la hoja Brinco si hay carrito.
function googleReturn() {
  if (!W.on || !/sandscap_(pase|error)=/.test(location.hash)) return;
  loadGoogle().then((G) => Brinco.ready(() => W.ready.then(() => {
    const r = G.recibir(G_SITE);
    if (!r) return;
    if (r.error) { toast(r.error, 6000); return; }
    W.google(r.pase).then((d) => {
      track('google_ok', { nueva: !d.account });
      const c = cart();
      if (c && (c.items() || []).length) { open(); afterGoogle(d); }
      else toast(d.account ? t('gIn') : t('gNeedPhone'), 6000);
    }, (e) => toast(e.message, 6000));
  })), () => {});
}

VIEWS.bLogin = function (o) {
  o = o || {};
  const g = googleOK();
  show('bLogin', `
    <div class="bk-center bk-stack">
      ${bword(34)}
      <p class="bk-h3">${t('bTagline')}</p>
      <p class="bk-muted">${t(g && !W.gLink ? 'bLoginTxG' : 'bLoginTx')}</p>
    </div>
    ${o.msg ? `<p class="bk-info-msg" role="status">${esc(o.msg)}</p>` : ''}
    ${g && W.gLink ? `<p class="bk-info-msg" role="status">${t('gLinkTx', { email: esc(W.gLink.email) })}</p>` : ''}
    ${g && !W.gLink ? '<div class="bk-gslot" id="bGoogle"></div>' : ''}
    <div class="bk-fld"><label for="bPhone">${t('waNumber')}</label><input id="bPhone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="809-555-1234" autofocus><span class="bk-err">${t('waErr')}</span></div>
    <button class="bk-pay bk-blue" type="button" id="bSend">${t('sendCode')}</button>
    ${vaultHTML(false)}
    <p class="bk-muted bk-center bk-small">${t('bTerms')}</p>`, { brinco: true, replace: o.replace });
  if (g && !W.gLink) mountGoogle($('#bGoogle', body));
  const ph = $('#bPhone', body);
  if (o.phone) ph.value = fmtPhone(o.phone);
  else if (S.form && S.form.coPhone) ph.value = S.form.coPhone;
  ph.addEventListener('input', () => { ph.value = fmtPhone(ph.value); setErr('bPhone', false); });
  const go = () => {
    if (!validPhone(ph.value)) { setErr('bPhone', true); ph.focus(); return; }
    const phone = phoneDigits(ph.value);
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
  const needAddr = ent().delivery;
  show('bProfile', `
    <p class="bk-h3">${t('bCreate')}</p>
    <p class="bk-muted">${t('bCreateTx')}</p>
    <div class="bk-fld"><label for="bName">${t('name')}</label><input id="bName" autocomplete="name" value="${esc(acc.name || f.coName || '')}" autofocus><span class="bk-err">${t('nameErr')}</span></div>
    <div class="bk-fld"><label for="bEmail">${t('email')} <span class="bk-dim bk-light">${t('optional')}</span></label><input id="bEmail" type="email" autocomplete="email" value="${esc(acc.email || '')}"><span class="bk-err">${t('emailErr')}</span></div>
    ${needAddr ? `<div class="bk-sec"><h3 class="bk-blue-h">${t('addrTitle')}</h3>
      <div class="bk-seg" role="group" aria-label="${t('label')}"><button type="button" data-lbl="${t('home')}" aria-pressed="true">${t('home')}</button><button type="button" data-lbl="${t('work')}" aria-pressed="false">${t('work')}</button></div>
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
  if (needAddr) geoAddr('b');
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
      if (needAddr && !acc.addresses.some((a) => a.street === street)) acc.addresses.push(Object.assign({ id: Date.now(), label: lbl, street, sector, ref, main: !acc.addresses.length }, S.geo ? { lat: S.geo.lat, lng: S.geo.lng } : {}));
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
    if (W.on) {
      W.saveCard(card, CONSENT_CARD).then(() => { track('brinco_tarjeta'); VIEWS.bSummary({ root: true }); }, (e) => {
        if (e.status === 401) { VIEWS.bLogin({ replace: true, msg: e.message }); return; }
        VIEWS.bCard(); toast(e.message, 6000);
      });
      return;
    }
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
      VIEWS.bSummary({ root: true });
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
  show('bSummary', `
    <div class="bk-hello"><span class="bk-avatar">${esc((me.name || 'B').trim().charAt(0).toUpperCase())}</span><div><p class="bk-h3 bk-h3-sm">${t('hello', { name: esc(first) })}</p><p class="bk-muted">${fmtPhone(me.phone)}</p></div></div>
    ${o.error ? `<div class="bk-azul-err" role="alert">${esc(o.error)}</div>` : ''}
    <div class="bk-sec"><h3 class="bk-blue-h">${t('delivTitle')}</h3>
      ${addrs.map((a) => `<button type="button" class="bk-opt" role="radio" data-addr="${a.id}" aria-checked="${S.bAddr === a.id}"><span class="bk-dot"></span><span class="bk-otx"><b>${esc(a.label || t('home'))} · ${t('delivery')} ${totals('delivery').ship ? fmt(totals('delivery').ship) : t('free')}</b><span>${esc(a.street)}, ${esc(a.sector)}</span></span></button>`).join('')}
      ${e.delivery ? `<button class="bk-link bk-link-left" type="button" id="bAddAddr">${t('addAddr')}</button>` : ''}
      ${e.pickup ? `<button type="button" class="bk-opt" role="radio" data-addr="pickup" aria-checked="${S.bAddr === 'pickup'}"><span class="bk-dot"></span><span class="bk-otx"><b>${t('pickup')} · ${t('free')}</b><span>${t('readyIn', { a: e.pickupMin })}</span></span></button>` : ''}
      ${e.delivery && freeFrom() ? freeHint() : ''}
    </div>
    ${mode === 'pickup' ? storesHTML('b') : ''}
    ${progHTML('b')}
    <div class="bk-sec"><h3 class="bk-blue-h">${t('cardTitle')}</h3>
      ${cards.map((c) => `<button type="button" class="bk-opt" role="radio" data-card="${c.id}" aria-checked="${S.bCard === c.id}"><span class="bk-dot"></span>${brandImg(c.brand) ? `<img src="${brandImg(c.brand)}" alt="">` : ''}<span class="bk-otx"><b>${brandName(c.brand)} •••• ${esc(c.last4)}</b><span>${t('expires', { exp: esc(c.exp) })}${c.main ? ' · ' + t('main') : ''}</span></span></button>`).join('')}
      <button class="bk-link bk-link-left" type="button" id="bAddCard">${t('addOther')}</button>
      ${vaultHTML(true)}
    </div>
    ${sumHTML(mode)}
    <button class="bk-pay bk-blue" type="button" id="bConfirm">${t('confirmPay', { total: fmt(totals(mode).total) })}</button>
    ${testNote()}
    <button class="bk-link" type="button" id="bOut">${t('notYou', { name: esc(first) })}</button>`, { brinco: true, root: o.root, replace: o.replace });
  $$('[data-addr]', body).forEach((b) => b.addEventListener('click', () => { S.bAddr = b.dataset.addr === 'pickup' ? 'pickup' : +b.dataset.addr; VIEWS.bSummary({ replace: true }); }));
  $$('[data-card]', body).forEach((b) => b.addEventListener('click', () => { S.bCard = +b.dataset.card; VIEWS.bSummary({ replace: true }); }));
  $('#bAddCard', body).addEventListener('click', () => VIEWS.bCard());
  const aa = $('#bAddAddr', body); if (aa) aa.addEventListener('click', () => VIEWS.bAddr());
  bindProg('b');
  $$('[data-store]', body).forEach((b) => b.addEventListener('click', () => { S.store = +b.dataset.store; $$('[data-store]', body).forEach((x) => x.setAttribute('aria-checked', String(x === b))); }));
  $('#bOut', body).addEventListener('click', () => { B.logout(); S.bAddr = S.bCard = null; VIEWS.checkout({ replace: true }); });
  let paying = false;
  $('#bConfirm', body).addEventListener('click', (ev) => {
    if (paying) return;
    const card = cards.find((c) => c.id === S.bCard);
    const addr = addrs.find((a) => a.id === S.bAddr) || null;
    S.mode = mode;
    S.pendingPay = { via: 'brinco', name: me.name, phone: me.phone, mode, address: mode === 'delivery' ? addr : null,
      card: { id: card.id, brand: card.brand, last4: card.last4, exp: card.exp, declineCode: card.declineCode || null }, total: totals(mode).total,
      store: mode === 'pickup' ? curStore() : null, prog: progOn() ? S.prog : null };
    const pay = () => { track('pago_enviado', { total: S.pendingPay.total, metodo: 'brinco' }); processing(); };
    pay();
  });
};

// Nueva dirección para una cuenta Brinco que ya existe (con GPS y autocompletado)
VIEWS.bAddr = function () {
  S.geo = null;
  show('bAddr', `
    <p class="bk-h3">${t('newAddr')}</p>
    <div class="bk-seg" role="group" aria-label="${t('label')}"><button type="button" data-lbl="${t('home')}" aria-pressed="true">${t('home')}</button><button type="button" data-lbl="${t('work')}" aria-pressed="false">${t('work')}</button></div>
    <div class="bk-fld"><label for="bStreet">${t('street')}</label><input id="bStreet" autocomplete="street-address" placeholder="${t('streetPh')}"><span class="bk-err">${t('streetErr')}</span></div>
    <div class="bk-row2">
      <div class="bk-fld"><label for="bSector">${t('sector')}</label><select id="bSector"><option value="">${t('choose')}</option>${(C().sectores || []).map((s) => `<option>${esc(s)}</option>`).join('')}</select><span class="bk-err">${t('sectorErr')}</span></div>
      <div class="bk-fld"><label for="bRef">${t('ref')}</label><input id="bRef" placeholder="${t('refPh')}"><span class="bk-err"></span></div>
    </div>
    <button class="bk-pay bk-blue" type="button" id="bSaveAddr">${t('saveAddr')}</button>`, { brinco: true });
  let lbl = t('home');
  $$('[data-lbl]', body).forEach((b) => b.addEventListener('click', () => { lbl = b.dataset.lbl; $$('[data-lbl]', body).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
  ['bStreet', 'bSector'].forEach((k) => { const el = $('#' + k, body); el.addEventListener('input', () => setErr(k, false)); el.addEventListener('change', () => setErr(k, false)); });
  geoAddr('b');
  $('#bSaveAddr', body).addEventListener('click', () => {
    const street = $('#bStreet', body).value.trim(), sector = $('#bSector', body).value, ref = $('#bRef', body).value.trim();
    let ok = true;
    if (street.length < 4) { setErr('bStreet', true); ok = false; }
    if (!sector) { setErr('bSector', true); ok = false; }
    if (!ok) return;
    const id = Date.now(), phone = (B.me() || {}).phone || B.session().phone;
    B.upsert(phone, (acc) => {
      acc = acc || { phone, addresses: [], cards: [], createdAt: Date.now(), merchants: [] };
      acc.addresses = (acc.addresses || []).filter((a) => a.street !== street);
      acc.addresses.push(Object.assign({ id, label: lbl, street, sector, ref, main: !acc.addresses.length }, S.geo ? { lat: S.geo.lat, lng: S.geo.lng } : {}));
      return acc;
    });
    track('brinco_direccion');
    S.bAddr = id;
    VIEWS.bSummary({ replace: true });
  });
};

// ---------- Abrir / cerrar ----------
let lastFocus = null, prevOverflow = '';
function open() {
  if (!READY.done) { Brinco.ready(open); return; }
  if (W.on && !W.loaded) { W.ready.then(open); return; }   // primero saber si hay sesión Brinco (máx. lo que tarde /me)
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
// Cambio de idioma: la hoja se vuelve a armar la próxima vez que se abra
window.addEventListener('brinco:lang', () => { if (root && !root.classList.contains('bk-open')) { root.remove(); root = null; body = null; } });
Brinco.checkout = open;
Brinco.closeCheckout = close;
googleReturn();
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
  // Idioma (core): M.t('clave', {vars}), M.en() y M.loc() para fechas
  M.t = function (k, v) { var B = M.B(); return typeof B._t === 'function' ? B._t(k, v) : k; };
  M.en = function () { var B = M.B(); return typeof B.lang === 'function' && B.lang() === 'en'; };
  M.loc = function () { return M.en() ? 'en-US' : 'es-DO'; };
  M.when = function (ms) { var B = M.B(); return typeof B._fmtWhen === 'function' ? B._fmtWhen(ms) : new Date(ms).toLocaleString(M.loc()); };
  M.hhmm = function (t) { return new Date(t).toLocaleTimeString(M.loc(), { hour: 'numeric', minute: '2-digit' }); };
  M.digits = function (s) { return String(s || '').replace(/\D/g, ''); };
  M.fmtPhone = function (s) { var d = M.digits(s); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 ? d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6) : d; };
  M.get = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  M.name = function () { var c = M.cfg(); return c.nombreLegal || c.nombre || 'Tienda'; };
  M.short = function () { var c = M.cfg(); return c.nombre || c.nombreLegal || 'Tienda'; };
  M.dominio = function () { return M.cfg().dominio || location.host; };
  M.producto = function (n) {
    var c = M.cfg(), en = M.en(), p = (en ? c.productoEn : c.producto) || {};
    return n === 1 ? (p.singular || (en ? 'item' : 'producto')) : (p.plural || (en ? 'items' : 'productos'));
  };

  // Encabezado fijo con el logo del negocio y un botón a la derecha
  M.header = function (label, href, extra) {
    var c = M.cfg();
    var logo = c.logo ? '<img src="' + M.esc(c.logo) + '" alt="' + M.esc(M.name()) + ', ' + M.t('hd_home') + '">' : '<span class="bk-hd-name">' + M.esc(M.short()) + '</span>';
    return '<header class="bk-hd"><div class="bk-hd-in"><a class="bk-hd-logo" href="/" aria-label="' + M.esc(M.name()) + ', ' + M.t('hd_home') + '">' + logo + '</a>' +
      (extra || '') + (label ? '<a class="bk-hd-btn" href="' + M.esc(href || '/') + '">' + M.esc(label) + '</a>' : '') + '</div></header>';
  };
  M.vaultLine = 'Brinco no guarda tarjetas: las protege tu procesador de pago (AZUL, CardNet o MIO).';
  Object.defineProperty(M, 'vaultLine', { get: function () { return M.t('hd_vault'); } });
  M.footer = function () {
    return '<footer class="bk-ft"><nav aria-label="' + M.t('hd_legal') + '"><a href="/seguridad/">' + M.t('hd_sec') + '</a> · <a href="/privacidad/">' + M.t('hd_priv') + '</a> · <a href="/terminos/">' + M.t('hd_terms') + '</a></nav>' +
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
  var UPD = '14 de octubre de 2026', UPD_EN = 'October 14, 2026';
  var T = function (k, v) { return M.t(k, v); };
  // ITBIS aparte (brinco.json "itbis": { "incluido": false, "tasa": 0.18 })
  function itbisTx(en) {
    var i = M.cfg().itbis || {}, p = Math.round((i.tasa != null ? +i.tasa : 0.18) * 100);
    if (i.incluido === false) return en ? 'do not include ITBIS; the ' + p + '% ITBIS tax is added at checkout and shown before you pay' : 'no incluyen ITBIS; el ITBIS (' + p + '%) se suma al pagar y se muestra antes de confirmar';
    return en ? 'include ITBIS (sales tax)' : 'incluyen ITBIS';
  }
  function img(n) { var B = M.B(); return typeof B._img === 'function' ? B._img(n) : M.base + 'img/' + n; }
  function contacto() {
    var c = M.cfg().contacto || {}, t = M.cfg().tienda || {};
    var ciudad = t.ciudad || 'Santo Domingo';
    var lines = [M.esc(M.name()), M.esc(c.direccion || t.direccion || '[Dirección del local]') + (ciudad ? ', ' + M.esc(ciudad) + ', R.D.' : '')];
    if (c.telefono) lines.push(M.esc(c.telefono));
    if (c.correo) lines.push(/@/.test(c.correo) ? '<a href="mailto:' + M.esc(c.correo) + '">' + M.esc(c.correo) + '</a>' : M.esc(c.correo));
    if (c.instagram) lines.push('Instagram: ' + M.esc(c.instagram));
    return '<h2>' + (M.en() ? 'Contact' : 'Contacto') + '</h2><p>' + lines.join('<br>') + '</p>';
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
        if (deliv) ent += 'Hacemos delivery en los sectores que aparecen al pagar, ' + (envio ? 'con un cargo de envío de ' + M.esc(M.fmt(envio)) + (+c.envioGratisDesde ? ' (gratis desde ' + M.esc(M.fmt(+c.envioGratisDesde)) + ')' : '') : 'sin cargo de envío') + '. El tiempo estimado es de ' + dMin + ' a ' + dMax + ' minutos y puede variar según el tráfico y la demanda.';
        if (pick) ent += (deliv ? ' Si prefieres, puedes' : 'Puedes') + ' recoger tu pedido en la tienda sin costo; normalmente está listo en unos ' + pMin + ' minutos.';
        if (c.programar && c.programar.activo) ent += ' También puedes programar tu pedido para otro día y hora.';
        var prod = M.producto(1);
        return '<h2>Pedidos y precios</h2><p>Los precios se muestran en pesos dominicanos (' + M.esc(c.moneda || 'RD$') + ') e ' + itbisTx(false) + '. El pedido se confirma cuando el banco aprueba el pago; recibirás el número de orden en pantalla y un aviso por WhatsApp.</p>' +
          '<h2>Entregas</h2><p>' + ent + '</p>' +
          '<h2>Cancelaciones</h2><p>Puedes cancelar sin cargo mientras no hayamos empezado a preparar tu ' + M.esc(prod) + '. Escríbenos por WhatsApp con tu número de orden.</p>' +
          '<h2>Reembolsos</h2><p>Si tu pedido llega incompleto, equivocado o en mal estado, escríbenos el mismo día con una foto y tu número de orden. Te reponemos el producto o hacemos el reembolso a la misma tarjeta; el reembolso puede tardar de 7 a 15 días hábiles en reflejarse, según tu banco.</p>';
      }
    }
  };

  // English version (config.idioma "en" or Brinco.setLang('en'))
  var DOCS_EN = {
    seguridad: {
      t: 'Security policy for the transmission of card data',
      d: function (n) { return 'How ' + n + ' and AZUL protect your card data.'; },
      body: function (n, dom) {
        return DOCS.seguridad.body(n, dom).split('<h2>')[0] +
          '<h2>Website</h2><p>We take all reasonable measures and precautions to protect your personal information and follow industry best practices to make sure it is not misused, altered or destroyed. The whole site ' + dom + ' uses an encrypted HTTPS (TLS) connection.</p>' +
          '<h2>Your card data</h2><p>Your card details are typed directly into AZUL’s secure fields (Servicios Digitales Popular), which encrypt the transmission with TLS and meet PCI DSS requirements. ' + n + ' never receives or stores the full card number or the security code (CVV). We only keep the card brand, the last 4 digits, the authorization code and the transaction reference.</p>' +
          '<h2>Brinco does not store cards</h2><p>Brinco never stores your card number or security code. If you choose to save your card in your Brinco Account, it is stored and protected by the PCI DSS–certified payment processor that handles the purchase: <b>AZUL</b>, <b>CardNet</b> or <b>MIO</b>. Brinco only receives a secure identifier (token) that cannot be used to rebuild the number and is useless outside your account. You can delete your card or your account at any time.</p>' +
          '<h2>3D Secure</h2><p>Purchases may require additional authentication from the issuing bank through Visa Secure and Mastercard ID Check, which protects against unauthorized use of your card.</p>' +
          '<h2>Payments</h2><p>The payment methods used by ' + n + ' are third-party services (AZUL) that meet all security and encryption standards to keep your information safe. They only use the information needed to complete the payment. We recommend you also read these providers’ privacy policies.</p>';
      }
    },
    privacidad: {
      t: 'Privacy policy',
      d: function (n) { return 'What data ' + n + ' collects and why.'; },
      body: function (n) {
        return '<h2>What data we use</h2><p>To prepare and deliver your order we use your name, your WhatsApp number and, if you choose delivery, your address and landmark. From the payment we only keep the card brand, the last 4 digits and the bank authorization.</p>' +
          '<h2>How you reached the store</h2><p>We record which of our links you came through (for example, Instagram or an ad) to learn which channels work. We do not use that information to identify you outside our store.</p>' +
          '<h2>Brinco Account</h2><p>If you allow it with the corresponding checkbox, your details and card are saved in your Brinco Account so you can pay with one tap at Brinco businesses. Brinco does not store your card number: your payment processor (AZUL, CardNet or MIO) protects it. Each permission is recorded with the date and the text you accepted. ' + n + ' only sees the orders you place with ' + n + ', never your purchases at other businesses.</p>' +
          '<h2>Messages</h2><p>We message you on WhatsApp to update you on your order. We only send promotions if you agree, and you can opt out anytime.</p>' +
          '<h2>Your rights</h2><p>You can ask for a copy of your data, correct it or delete it by writing to us. We process your data under Dominican Law 172-13 on the protection of personal data.</p>';
      }
    },
    terminos: {
      t: 'Terms, delivery and refunds',
      d: function (n) { return 'Purchase, delivery and refund conditions of ' + n + '.'; },
      body: function (n) {
        var c = M.cfg(), e = c.entrega || {}, envio = +c.envio || 0, g = +c.envioGratisDesde || 0;
        var deliv = e.delivery !== false, pick = e.pickup !== false;
        var dMin = e.deliveryMin || 35, dMax = e.deliveryMax || 45, pMin = e.pickupMin || 20;
        var ent = '';
        if (deliv) ent += 'We deliver to the neighborhoods listed at checkout, ' + (envio ? 'with a delivery fee of ' + M.esc(M.fmt(envio)) + (g ? ' (free from ' + M.esc(M.fmt(g)) + ')' : '') : 'with no delivery fee') + '. The estimated time is ' + dMin + ' to ' + dMax + ' minutes and may vary with traffic and demand.';
        if (pick) ent += (deliv ? ' If you prefer, you can' : 'You can') + ' pick up your order at the store at no cost; it is usually ready in about ' + pMin + ' minutes.';
        if (c.programar && c.programar.activo) ent += ' You can also schedule your order for a later day and time.';
        return '<h2>Orders and prices</h2><p>Prices are shown in Dominican pesos (' + M.esc(c.moneda || 'RD$') + ') and ' + itbisTx(true) + '. Your order is confirmed when the bank approves the payment; you will see your order number on screen and receive a WhatsApp message.</p>' +
          '<h2>Delivery</h2><p>' + ent + '</p>' +
          '<h2>Cancellations</h2><p>You can cancel at no charge as long as we have not started preparing your order. Message us on WhatsApp with your order number.</p>' +
          '<h2>Refunds</h2><p>If your order arrives incomplete, wrong or damaged, write to us the same day with a photo and your order number. We will replace the product or refund the same card; the refund may take 7 to 15 business days to show, depending on your bank.</p>';
      }
    }
  };

  M.ready(function () {
    var root = document.querySelector('[data-brinco="legal"]'); if (!root || root.dataset.bkDone) return;
    root.dataset.bkDone = '1';
    var key = root.getAttribute('data-doc'); if (!DOCS[key]) key = (location.pathname.match(/(seguridad|privacidad|terminos)/) || [])[1] || 'seguridad';
    var D = (M.en() ? DOCS_EN : DOCS)[key], n = M.esc(M.name()), dom = M.esc(M.dominio());
    document.documentElement.classList.add('bk-page', 'bk-white');
    document.title = D.t + ' | ' + M.name();
    var md = document.querySelector('meta[name="description"]');
    if (!md) { md = document.createElement('meta'); md.name = 'description'; document.head.appendChild(md); }
    if (!md.content) md.content = D.d(M.name());
    root.classList.add('bk-lg');
    root.insertAdjacentHTML('beforebegin', M.header(T('hd_back'), '/').replace('class="bk-hd"', 'class="bk-hd bk-hd-legal"'));
    root.innerHTML = '<span class="bk-lg-tag">LEGAL</span><h1>' + D.t + '</h1><p class="bk-lg-upd">' + (M.en() ? 'Last updated: ' + UPD_EN : 'Última actualización: ' + UPD) + '</p>' + D.body(n, dom) + contacto();
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
/* Brinco Kit · /panel/: ventas y origen de clientes (orgánico vs. pagado), embudo, Brinco, pedidos y links.
   Monta en [data-brinco="panel"]. Lee brinco_events y brinco_orders de este equipo. */
(function () {
  var M = window.__bkm; if (!M) return;
  var T = function (k, v) { return M.t(k, v); };
  var LINKS = ['ig', 'ad', 'fb', 'tt', 'wa'];
  var BRAND = { visa: 'Visa', mastercard: 'MC', amex: 'Amex' };
  function pct(a, b) { return b ? Math.round(a * 1000 / b) / 10 + '%' : '—'; }
  function isPaid(m) { return m === 'pagado'; }
  function uniq(arr) { var s = {}, n = 0; arr.forEach(function (x) { if (!s[x]) { s[x] = 1; n++; } }); return n; }

  function shell(root) {
    var d = M.dominio();
    root.innerHTML =
      '<h1 class="bk-pn-h1">' + T('pn_h1') + '</h1>' +
      '<p class="bk-pn-sub">' + T('pn_sub', { n: M.esc(M.short()) }) + '</p>' +
      '<div class="bk-pn-seg" role="group" aria-label="' + T('pn_period') + '">' +
        '<button type="button" data-p="1" aria-pressed="false">' + T('pn_today') + '</button><button type="button" data-p="7" aria-pressed="false">' + T('pn_7') + '</button>' +
        '<button type="button" data-p="30" aria-pressed="false">' + T('pn_30') + '</button><button type="button" data-p="0" aria-pressed="true">' + T('pn_all') + '</button></div>' +
      '<section class="bk-pn-kpis" aria-label="' + T('pn_summary') + '">' +
        '<div class="bk-pn-k"><span>' + T('pn_clicks') + '</span><b data-k="clicks">0</b><small data-k="clicksS">&nbsp;</small></div>' +
        '<div class="bk-pn-k"><span>' + T('pn_visits') + '</span><b data-k="visits">0</b><small data-k="visitsS">&nbsp;</small></div>' +
        '<div class="bk-pn-k"><span>' + T('pn_buys') + '</span><b data-k="buys">0</b><small data-k="conv">&nbsp;</small></div>' +
        '<div class="bk-pn-k"><span>' + T('pn_rev') + '</span><b data-k="rev">' + M.fmt(0) + '</b><small data-k="aov">&nbsp;</small></div>' +
      '</section>' +
      '<div class="bk-pn-grid2">' +
        '<section class="bk-pn-card"><h2 class="bk-pn-h2">' + T('pn_funnel') + '</h2><div class="bk-pn-fun" data-k="funnel"></div>' +
          '<div class="bk-pn-leg"><span><i class="bk-pn-o"></i>' + T('pn_org') + '</span><span><i class="bk-pn-pd"></i>' + T('pn_paidAds') + '</span></div>' +
          '<p class="bk-pn-note">' + T('pn_people') + '</p></section>' +
        '<section class="bk-pn-card"><h2 class="bk-pn-h2">' + T('pn_split') + '</h2><div class="bk-pn-split" data-k="split"></div>' +
          '<div class="bk-pn-bz" data-k="brinco"></div></section>' +
      '</div>' +
      '<section class="bk-pn-card bk-pn-mt"><h2 class="bk-pn-h2">' + T('pn_bySrc') + '</h2><div class="bk-pn-scroll"><table class="bk-pn-tbl"><thead><tr><th>' + T('pn_src') + '</th><th>' + T('pn_type') + '</th><th class="bk-pn-n">' + T('pn_visits') + '</th><th class="bk-pn-n">' + T('pn_cart') + '</th><th class="bk-pn-n">' + T('pn_pay') + '</th><th class="bk-pn-n">' + T('pn_buys') + '</th><th class="bk-pn-n">' + T('pn_rev') + '</th><th class="bk-pn-n">' + T('pn_conv') + '</th></tr></thead><tbody data-k="bySrc"></tbody></table></div></section>' +
      '<section class="bk-pn-card bk-pn-mt"><h2 class="bk-pn-h2">' + T('pn_last') + '</h2><div class="bk-pn-scroll"><table class="bk-pn-tbl"><thead><tr><th>' + T('pn_order') + '</th><th>' + T('pn_date') + '</th><th>' + T('pn_client') + '</th><th>' + T('pn_deliv') + '</th><th>' + T('pn_pay') + '</th><th>' + T('pn_src') + '</th><th class="bk-pn-n">' + T('pn_tot') + '</th></tr></thead><tbody data-k="orders"></tbody></table></div></section>' +
      '<section class="bk-pn-card bk-pn-mt"><h2 class="bk-pn-h2">' + T('pn_links') + '</h2><div class="bk-pn-links">' +
        LINKS.map(function (l) { return '<div class="bk-pn-lk"><code>' + M.esc(d) + '/' + l + '</code><small>' + T('pn_l_' + l) + '</small></div>'; }).join('') +
      '</div></section>' +
      '<p class="bk-pn-foot">' + T('pn_foot') + '</p>';
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
    $('clicksS').textContent = clicks.length ? T('pn_clicksS', { o: clicks.length - cp, p: cp }) : T('pn_noClicks');
    $('visits').textContent = visits.length;
    $('visitsS').textContent = visits.length ? T('pn_srcs', { n: uniq(visits.map(function (v) { return v.src; })) }) : ' ';
    $('buys').textContent = orders.length;
    $('conv').textContent = T('pn_convX', { x: pct(buyers(), visitors()) });
    var rev = orders.reduce(function (a, o) { return a + (o.total || 0) - (o.plat || 0); }, 0);
    $('rev').textContent = M.fmt(rev);
    $('aov').textContent = orders.length ? T('pn_aov', { x: M.fmt(rev / orders.length) }) : ' ';

    // Embudo: personas (sesiones únicas) por paso, divididas orgánico / pagado
    var steps = [[T('pn_f1'), 'visita'], [T('pn_f2'), 'carrito'], [T('pn_f3'), 'checkout'], [T('pn_f4'), 'pago_enviado'], [T('pn_f5'), 'compra']];
    var people = function (name, paid) { return uniq(ev.filter(function (e) { return e.e === name && isPaid(e.med) === paid; }).map(function (e) { return e.sid; })); };
    var top = Math.max.apply(null, [1].concat(steps.map(function (s) { return people(s[1], true) + people(s[1], false); })));
    $('funnel').innerHTML = steps.map(function (s) {
      var p = people(s[1], true), o = people(s[1], false);
      return '<div class="bk-pn-fr"><span>' + s[0] + '</span><span class="bk-pn-track" role="img" aria-label="' + T('pn_fAria', { s: s[0], o: o, p: p }) + '"><i class="bk-pn-o" style="width:' + (o / top * 100) + '%"></i><i class="bk-pn-pd" style="width:' + (p / top * 100) + '%"></i></span><b>' + (p + o) + '</b></div>';
    }).join('');

    var block = function (paid) {
      var v = count('visita', paid), b = orders.filter(function (x) { return isPaid(x.med) === paid; }), r = b.reduce(function (a, x) { return a + (x.total || 0); }, 0);
      return '<div class="bk-pn-sp ' + (paid ? 'bk-pn-pd' : 'bk-pn-o') + '"><span class="bk-pn-pill ' + (paid ? 'bk-pn-pd' : 'bk-pn-o') + '">' + (paid ? T('pn_paid') : T('pn_org')) + '</span>' +
        '<div class="bk-pn-v">' + M.fmt(r) + '</div><div class="bk-pn-m">' + T('pn_vb', { v: v, b: b.length }) + '<br>' + T('pn_convX', { x: pct(buyers(paid), visitors(paid)) }) + '</div></div>';
    };
    $('split').innerHTML = block(false) + block(true);
    var bz = orders.filter(function (o) { return o.via === 'brinco'; }).length, newAcc = orders.filter(function (o) { return o.brincoNew; }).length;
    $('brinco').innerHTML = '<span class="bk-pn-bword">brinco</span><div class="bk-pn-m">' + T('pn_brinco', { x: pct(bz, orders.length), n: newAcc }) + '</div>';

    // Por origen
    var srcs = {};
    var row = function (src, med) { var k = src + '|' + med; return srcs[k] = srcs[k] || { src: src, med: med, visita: 0, carrito: 0, checkout: 0, compra: 0, rev: 0, vs: {}, bs: {} }; };
    ev.forEach(function (e) { if (e.e === 'clic_link') return; var r = row(e.src, e.med); if (r[e.e] != null && e.e !== 'rev') r[e.e]++; if (e.e === 'visita') r.vs[e.sid] = 1; if (e.e === 'compra') r.bs[e.sid] = 1; });
    orders.forEach(function (o) { row(o.src, o.med).rev += (o.total || 0) - (o.plat || 0); });
    var rows = Object.keys(srcs).map(function (k) { return srcs[k]; }).sort(function (a, b) { return b.rev - a.rev || b.visita - a.visita; });
    $('bySrc').innerHTML = rows.length ? rows.map(function (r) {
      return '<tr><td>' + M.esc(r.src || T('pn_direct')) + '</td><td><span class="bk-pn-pill ' + (isPaid(r.med) ? 'bk-pn-pd' : 'bk-pn-o') + '">' + (isPaid(r.med) ? T('pn_paid') : T('pn_org')) + '</span></td><td class="bk-pn-n">' + r.visita + '</td><td class="bk-pn-n">' + r.carrito + '</td><td class="bk-pn-n">' + r.checkout + '</td><td class="bk-pn-n">' + r.compra + '</td><td class="bk-pn-n">' + M.fmt(r.rev) + '</td><td class="bk-pn-n">' + pct(Object.keys(r.bs).length, Object.keys(r.vs).length) + '</td></tr>';
    }).join('') : '<tr><td colspan="8" class="bk-pn-empty">' + T('pn_noVisits') + '</td></tr>';

    var list = orders.slice().reverse().slice(0, 25);
    $('orders').innerHTML = list.length ? list.map(function (o) {
      var c = o.card || {};
      return '<tr><td><a href="/pedido/?o=' + encodeURIComponent(o.no) + '"><b>' + M.esc(o.no) + '</b></a></td><td>' + new Date(o.at).toLocaleString(M.loc(), { dateStyle: 'short', timeStyle: 'short' }) + '</td><td>' + M.esc(o.name) + '</td>' +
        '<td>' + (o.mode === 'pickup' ? T('pn_pickup') + (o.tienda && o.tienda.nombre && (M.cfg().tiendas || []).length > 1 ? ' · ' + M.esc(o.tienda.nombre) : '') : T('delivery') + (o.address && o.address.sector ? ' · ' + M.esc(o.address.sector) : '') + (o.address && o.address.lat != null ? ' · <a href="https://www.google.com/maps/search/?api=1&query=' + o.address.lat + ',' + o.address.lng + '" target="_blank" rel="noopener">' + T('mapLink') + '</a>' : '')) + '</td>' +
        '<td>' + (o.via === 'brinco' ? '<span class="bk-pn-pill bk-pn-brinco">Brinco</span> ' : '') + (BRAND[c.brand] || T('card')) + ' ' + M.esc(c.last4) + '</td>' +
        '<td><span class="bk-pn-pill ' + (isPaid(o.med) ? 'bk-pn-pd' : 'bk-pn-o') + '">' + M.esc(o.src || T('pn_direct')) + '</span></td><td class="bk-pn-n">' + M.fmt(o.total) + '</td></tr>';
    }).join('') : '<tr><td colspan="7" class="bk-pn-empty">' + T('pn_noOrders') + '</td></tr>';
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
    document.title = T('pn_title', { n: M.short() });
    var tools = '<div class="bk-pn-tools"><button type="button" data-bk="refresh">' + T('pn_refresh') + '</button><a href="/">' + T('pn_shop') + '</a><button type="button" data-bk="reset">' + T('pn_reset') + '</button></div>';
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
    hd.querySelector('[data-bk="refresh"]').addEventListener('click', function () { go(); M.toast(T('pn_updated')); });
    hd.querySelector('[data-bk="reset"]').addEventListener('click', function () {
      if (!confirm(T('pn_confirm'))) return;
      wipe(); go(); M.toast(T('pn_wiped'));
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
  var MOTO_EN = { 'Honda roja': 'Red Honda', 'Yamaha negra': 'Black Yamaha', 'Suzuki roja': 'Red Suzuki' };
  function rider(o) { var h = 0; String(o.no).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); var r = RIDERS[h % RIDERS.length];
    var m = r.moto.split(' · '); return { name: r.name, ini: r.ini, moto: M.en() ? (MOTO_EN[m[0]] || m[0]) + ' · ' + m[1] : r.moto }; }
  var T = function (k, v) { return M.t(k, v); };
  function nota(it) { return it.nota ? '<small class="bk-nota">“' + M.esc(it.nota) + '”</small>' : ''; }
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
  var CUR = null;   // pedido que se está mostrando (para su tienda)
  function tienda() { var O_ = O(); return O_ && O_.store ? O_.store(CUR) : (M.cfg().tienda || {}); }
  function mapsUrl() {
    var t = tienda(); if (t.mapa) return t.mapa;
    var q = [t.direccion, t.ciudad || 'Santo Domingo'].filter(Boolean).join(', ');
    return 'https://maps.google.com/?q=' + encodeURIComponent(q || M.name());
  }
  function streetLabel(s) { return String(s || '').split(',')[0].replace(/\s+#?\d+[A-Za-z]?$/, '').slice(0, 28); }
  // etapas.salida: "de la barra", "del horno"… (opcional)
  function waitText() {
    var sal = String((M.cfg().etapas || {}).salida || '').trim().replace(/[.\s]+$/, '');
    return T('p_wait', { x: sal && !M.en() ? T('p_waitOut', { x: M.esc(sal) }) : T('p_waitReady') });
  }
  function isRoad(s) { return s && (s.k === 'camino' || /camino/i.test(s.label || '')); }

  function mapSVG(o) {
    var pick = o.mode === 'pickup';
    var st = streetLabel(tienda().direccion) || T('p_yourStore');
    var home = pick ? '' : streetLabel(o.address && o.address.street);
    return '<svg viewBox="0 0 640 400" role="img" aria-label="' + (pick ? T('p_mapStore') : T('p_mapRoute')) + '">' +
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
    CUR = o;
    M.setTitle(T('p_order', { no: o.no }));
    var r = rider(o), e = ent(), pick = o.mode === 'pickup', t = tienda(), c = M.cfg();
    var sched = o.programado ? Date.parse(o.programado) : 0;
    var card = o.card || {};
    var itemsHtml = (o.items || []).map(function (it) {
      return '<div class="bk-p-l"><span>' + it.qty + ' × ' + M.esc(it.name) + (it.detail ? ' <small>· ' + M.esc(it.detail) + '</small>' : '') + nota(it) + '</span><span>' + M.fmt(it.qty * it.unit) + '</span></div>';
    }).join('');
    var place = pick
      ? '<div class="bk-p-rider"><span class="bk-p-av">' + M.esc(M.short().charAt(0).toUpperCase()) + '</span><div class="bk-p-tx"><b>' + M.esc(t.nombre || M.short()) + '</b><span>' + M.esc(t.direccion || T('p_store')) + (sched ? '' : ' · ' + T('p_readyIn', { a: e.pMin })) + '</span></div>' +
        '<a class="bk-p-ib" href="' + M.esc(mapsUrl()) + '" target="_blank" rel="noopener" aria-label="' + T('p_dir') + '">' + I_GO + '</a></div>' +
        '<a class="bk-p-btn bk-p-ghost bk-p-dir" href="' + M.esc(mapsUrl()) + '" target="_blank" rel="noopener">' + T('p_dir') + '</a>'
      : '<div class="bk-p-rider" data-bk-rider hidden><span class="bk-p-av">' + r.ini + '</span><div class="bk-p-tx"><b>' + r.name + '</b><span>' + r.moto + '</span></div>' +
        '<button class="bk-p-ib" type="button" data-act="llamar" aria-label="' + M.esc(T('p_call', { n: r.name })) + '">' + I_PHONE + '</button>' +
        '<button class="bk-p-ib bk-p-wa" type="button" data-act="whatsapp" aria-label="' + M.esc(T('p_waTo', { n: r.name })) + '">' + I_WA + '</button></div>' +
        '<p class="bk-p-sub bk-p-wait" data-bk-wait>' + waitText() + '</p>';
    app.innerHTML =
      '<h1 class="bk-p-h1">' + T('p_your') + '</h1>' +
      '<p class="bk-p-sub">' + T('p_madeAt', { h: M.hhmm(o.at) }) + ' · ' + (pick ? T('pickup') : T('delivery')) + '</p>' +
      (sched ? '<p class="bk-p-sched">' + M.esc(T('scheduledFor', { x: M.when(sched) })) + '</p>' : '') +
      '<section class="bk-p-card" aria-live="polite">' +
        '<div class="bk-p-head"><span class="bk-p-no">' + T('order') + ' ' + M.esc(o.no) + '</span><span class="bk-p-pill" data-bk="pill"></span></div>' +
        '<p class="bk-p-big" data-bk="big"></p><p class="bk-p-eta" data-bk="eta"></p>' +
        '<div class="bk-p-prog" aria-hidden="true"><i data-bk="bar"></i></div>' +
        '<ol class="bk-p-steps" data-bk="steps"></ol>' +
      '</section>' +
      '<section class="bk-p-card"><h2 class="bk-p-h2">' + (pick ? T('p_where') : T('p_rider')) + '</h2><div class="bk-p-map">' + mapSVG(o) + '</div>' + place + '</section>' +
      '<section class="bk-p-card bk-p-rec"><h2 class="bk-p-h2">' + T('p_detail') + '</h2>' + itemsHtml +
        '<div class="bk-p-l bk-p-mut"><span>' + (pick ? T('pickup') : T('ship')) + '</span><span>' + (o.ship ? M.fmt(o.ship) : T('free')) + '</span></div>' +
        ((o.disc || o.discount) ? '<div class="bk-p-l bk-p-mut"><span>' + (o.coupon ? T('coupon') + ' ' + M.esc(o.coupon) : T('p_discount')) + '</span><span>−' + M.fmt(o.disc || o.discount) + '</span></div>' : '') +
        (o.itbis ? '<div class="bk-p-l bk-p-mut"><span>' + T('itbisLine', { p: Math.round((o.itbisTasa || 0.18) * 100) }) + '</span><span>' + M.fmt(o.itbis) + '</span></div>' : '') +
        (o.plat ? '<div class="bk-p-l bk-p-mut"><span>' + T('plat') + '</span><span>' + M.fmt(o.plat) + '</span></div>' : '') +
        '<div class="bk-p-l bk-p-tot"><span>' + T('p_total') + '</span><span>' + M.fmt(o.total) + '</span></div>' +
        '<div class="bk-p-meta">' + (o.via === 'brinco' ? T('p_paidB') : '') + (BRANDS[card.brand] || T('card')) + ' •••• ' + M.esc(card.last4) +
          (o.auth ? ' · ' + T('p_auth') + ' ' + M.esc(o.auth) : '') +
          (o.address && !pick ? '<br>' + T('p_deliver') + ': ' + M.esc(o.address.street) + (o.address.sector ? ', ' + M.esc(o.address.sector) : '') + (o.address.lat != null ? ' · <a href="https://www.google.com/maps/search/?api=1&query=' + o.address.lat + ',' + o.address.lng + '" target="_blank" rel="noopener">' + T('mapLink') + '</a>' : '') : '') +
          (pick && o.tienda && o.tienda.nombre ? '<br>' + T('pickAt') + ': ' + M.esc(o.tienda.nombre) + (o.tienda.direccion ? ', ' + M.esc(o.tienda.direccion) : '') : '') +
          (o.phone ? '<br>' + T('p_wa') + ': ' + M.esc(M.fmtPhone(o.phone)) : '') + '</div>' +
      '</section>' +
      '<div class="bk-p-help"><a class="bk-p-btn bk-p-ghost" href="/pedido/">' + T('p_mine') + '</a><button class="bk-p-btn bk-p-ghost" type="button" data-bk="help">' + T('p_help') + '</button></div>';
    app.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        M.track('contacto_rider', { orden: o.no, via: b.dataset.act });
        var n = r.name.split(' ')[0];
        M.toast(b.dataset.act === 'llamar' ? T('p_calling', { n: n }) : T('p_chat', { n: n }));
      });
    });
    app.querySelector('[data-bk="help"]').addEventListener('click', function () { M.track('ayuda_pedido', { orden: o.no }); M.toast(T('p_helpMsg')); });
    var last = null;
    function tick() {
      var s = status(o); if (!s || !s.stage) return;
      var q = function (k) { return app.querySelector('[data-bk="' + k + '"]'); };
      q('big').textContent = s.stage.label;
      var pill = q('pill');
      pill.textContent = s.done ? (pick ? T('p_picked') : T('p_delivered')) : (s.stage.k === 'programado' ? T('p_scheduled') : T('p_inProc'));
      pill.className = 'bk-p-pill' + (s.done ? ' bk-p-done' : '');
      var eta = q('eta');
      if (s.done) eta.textContent = s.stage.txt || '';
      else if (sched) eta.innerHTML = M.esc(s.stage.txt) + '<br><b>' + M.esc(T('scheduledFor', { x: M.when(sched) })) + '</b>';
      else if (pick) eta.innerHTML = M.esc(s.stage.txt) + '<br><b>' + T('p_readyAt', { h: M.hhmm(o.at + e.pMin * 60000) }) + '</b>';
      else eta.innerHTML = M.esc(s.stage.txt) + '<br><b>' + T('p_arrives', { a: M.hhmm(o.at + e.dMin * 60000), b: M.hhmm(o.at + e.dMax * 60000) }) + '</b>';
      q('bar').style.width = Math.round(Math.min(1, s.total) * 100) + '%';
      q('steps').innerHTML = (s.stages || []).map(function (x, j) {
        var cls = j < s.i || (s.done && j === s.i) ? 'bk-p-ok' : j === s.i ? 'bk-p-now' : 'bk-p-next';
        return '<li class="' + cls + '"><span class="bk-p-dot">' + (cls === 'bk-p-ok' ? CHECK : '') + '</span><div class="bk-p-st"><b>' + M.esc(x.label) + '</b>' +
          (cls !== 'bk-p-next' || sched ? '<time>' + M.hhmm(x.at || o.at + x.t * 1000) + '</time>' : '') + (cls === 'bk-p-now' ? '<span>' + M.esc(x.txt) + '</span>' : '') + '</div></li>';
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
    M.setTitle(T('p_track'));
    var list = allOrders().slice(0, 10);
    var pre = (M.cfg().prefijoOrden || 'XX') + '-12345';
    app.innerHTML =
      '<h1 class="bk-p-h1">' + T('p_track') + '</h1><p class="bk-p-sub">' + T('p_trackSub') + '</p>' +
      '<section class="bk-p-card"><h2 class="bk-p-h2">' + T('p_mine') + '</h2>' +
      (list.length ? '<div class="bk-p-list">' + list.map(function (o) {
        var s = status(o) || { stage: { label: '' } }, n = (o.items || []).reduce(function (a, c) { return a + c.qty; }, 0);
        return '<a href="/pedido/?o=' + encodeURIComponent(o.no) + '"><div><b>' + M.esc(o.no) + ' · ' + M.fmt(o.total) + '</b><span>' +
          new Date(o.at).toLocaleDateString(M.loc(), { day: 'numeric', month: 'short' }) + ', ' + M.hhmm(o.at) + ' · ' + n + ' ' + M.esc(M.producto(n)) + '</span></div>' +
          '<span class="bk-p-pill' + (s.done ? ' bk-p-done' : '') + '">' + M.esc(s.stage.label) + '</span></a>';
      }).join('') + '</div>' : '<p class="bk-p-empty">' + T('p_none') + '</p>') +
      '</section>' +
      '<section class="bk-p-card"><h2 class="bk-p-h2">' + T('p_find') + '</h2><form class="bk-p-form" novalidate>' +
        '<label for="bkNo">' + T('p_no') + '</label><input id="bkNo" name="no" inputmode="text" autocapitalize="characters" placeholder="' + M.esc(pre) + '" autocomplete="off">' +
        '<label for="bkPh">' + T('p_ph') + '</label><input id="bkPh" name="ph" type="tel" inputmode="tel" placeholder="809-555-1234" autocomplete="tel">' +
        (msg ? '<p class="bk-p-err" role="alert">' + M.esc(msg) + '</p>' : '') +
        '<button class="bk-p-btn" type="submit">' + T('p_see') + '</button></form></section>' +
      '<div class="bk-p-help"><a class="bk-p-btn bk-p-ghost" href="/">' + T('p_make') + '</a></div>';
    app.querySelector('form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var o = findOrder(app.querySelector('#bkNo').value);
      var ph = M.digits(app.querySelector('#bkPh').value).slice(-7);
      if (!o || (ph && M.digits(o.phone).slice(-7) !== ph)) { renderList(root, T('p_notFound')); return; }
      location.href = '/pedido/?o=' + encodeURIComponent(o.no);
    });
  }

  M.ready(function () {
    var root = document.querySelector('[data-brinco="pedido"]'); if (!root || root.dataset.bkDone) return;
    root.dataset.bkDone = '1';
    root.classList.add('bk-p');
    root.insertAdjacentHTML('beforebegin', M.header(T('p_orderAgain'), '/'));
    root.innerHTML = '<div class="bk-p-app bk-p-wrap"></div>';
    root.insertAdjacentHTML('afterend', '<div class="bk-p bk-p-wrap">' + M.footer() + '</div>');
    document.documentElement.classList.add('bk-page');
    M.fillVault(root.nextElementSibling);
    if (!O() || !O().status) { root.querySelector('.bk-p-app').innerHTML = '<p class="bk-p-empty">' + T('p_loadErr') + '</p>'; return; }
    var q = new URLSearchParams(location.search).get('o');
    var o = q ? findOrder(q) : null;
    if (o) renderOrder(root, o); else renderList(root, q ? T('p_notHere') : '');
  });
})();
})();

/* --- src/modules/pill.js --- */
(function () {
/* Brinco Kit · píldora "Tu pedido XX-12345 · <estado> · Ver" (todas las páginas menos /pedido/ y /panel/)
   y respaldo del pie "Brinco no guarda tarjetas" en [data-brinco="vault-footer"]. */
(function () {
  var M = window.__bkm; if (!M) return;

  // Palabra corta para que quepa en 360 px (la etapa completa va en aria-label y en /pedido/)
  function short(k) { var x = M.t('pill_' + k); return x === 'pill_' + k ? '' : x; }
  function sheetOpen() {
    var h = document.documentElement;
    if (h.classList.contains('bk-open') || h.classList.contains('bk-lock')) return true;
    var B = window.Brinco || {};
    if (B._ui && typeof B._ui.isOpen === 'function') { try { if (B._ui.isOpen()) return true; } catch (e) {} }
    return !!document.querySelector('.bk-sheet.bk-open,.bk-sheet[open],.bk-sheet.is-open,.bk-co.bk-open');
  }
  // Diálogos o cajones del sitio (carrito, menú…): la píldora no debe tapar sus botones
  var LOCK = /(^|\s)(cart-open|cart-is-open|open-cart|drawer-open|menu-open|nav-open|modal-open|dialog-open|no-scroll|noscroll|scroll-lock|is-locked|locked|lock|overflow-hidden)(\s|$)/;
  function shown(el) {
    if (el.closest('.bk-pill') || el.closest('[aria-hidden="true"]') || el.hidden) return false;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.right > 1 && r.bottom > 1 && r.left < innerWidth - 1 && r.top < innerHeight - 1;
  }
  function siteOverlay() {
    var h = document.documentElement, b = document.body;
    if (LOCK.test(h.className) || LOCK.test(b.className)) return true;
    if (b.style.overflow === 'hidden' || h.style.overflow === 'hidden') return true;
    var ds = document.querySelectorAll('[aria-modal="true"],[role="dialog"],[role="alertdialog"],dialog[open]');
    for (var i = 0; i < ds.length; i++) if (shown(ds[i])) return true;
    return false;
  }

  M.ready(function () {
    // Core puede llenar el pie primero; esperamos un tick y solo llenamos los vacíos
    setTimeout(function () { M.fillVault(); }, 0);
    if (/^\/(pedido|panel)(\/|$)/.test(location.pathname)) return;
    if (document.querySelector('[data-brinco="pedido"],[data-brinco="panel"]')) return;
    var B = window.Brinco; if (!B || !B.orders || !B.orders.active) return;
    var a = document.createElement('a');
    a.className = 'bk-pill'; a.setAttribute('aria-live', 'polite'); a.setAttribute('aria-hidden', 'true'); a.tabIndex = -1;
    a.innerHTML = '<i aria-hidden="true"></i><span><em class="bk-pill-pre"></em><span class="bk-pill-tx"></span></span><b></b>';
    document.body.appendChild(a);
    function upd() {
      var o = null; try { o = B.orders.active(); } catch (e) {}
      if (!o || sheetOpen() || siteOverlay()) { if (a.classList.contains('bk-show')) { a.classList.remove('bk-show'); a.setAttribute('aria-hidden', 'true'); a.tabIndex = -1; } return; }
      var s = null; try { s = B.orders.status(o); } catch (e) {}
      var hr = '/pedido/?o=' + encodeURIComponent(o.no); if (a.getAttribute('href') !== hr) a.setAttribute('href', hr);
      var pre = M.t('pill_your'), see = M.t('pill_see');
      if (a.querySelector('em').textContent !== pre) a.querySelector('em').textContent = pre;
      if (a.querySelector('b').textContent !== see) a.querySelector('b').textContent = see;
      var word = s && s.stage ? (short(s.stage.k) || s.stage.label) : '';
      var txt = o.no + (word ? ' · ' + word : '');
      var span = a.querySelector('.bk-pill-tx'); if (span.textContent !== txt) span.textContent = txt;
      var lbl = M.t('pill_aria', { no: o.no, st: s && s.stage ? ', ' + s.stage.label : '' }); if (a.getAttribute('aria-label') !== lbl) a.setAttribute('aria-label', lbl);
      if (!a.classList.contains('bk-show')) { a.classList.add('bk-show'); a.removeAttribute('aria-hidden'); a.tabIndex = 0; }
    }
    M.pill = upd;
    upd(); setInterval(upd, 1000);
    // Reacciona enseguida al pagar y al cerrar la hoja del kit
    window.addEventListener('brinco:order', function () { setTimeout(upd, 50); });
    // Un cajón que se cierra con transición no cambia atributos al terminar: revisamos al final
    document.addEventListener('transitionend', function () { upd(); }, true);
    var raf = 0;
    try {
      new MutationObserver(function (ms) { if (raf || ms.every(function (m) { return a.contains(m.target) || m.target === a; })) return; raf = requestAnimationFrame(function () { raf = 0; upd(); }); })
        .observe(document.documentElement, { attributes: true, subtree: true, childList: true, attributeFilter: ['class', 'style', 'open', 'hidden', 'aria-hidden', 'aria-modal'] });
    } catch (e) {}
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
    // ?bk=pk (links viejos de v1.0): se quita de la URL sin hacer nada más
    try {
      const q = new URLSearchParams(location.search);
      if (q.has('bk')) {
        q.delete('bk');
        history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
      }
    } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('brinco:ready', { detail: Brinco.config })); } catch (e) {}
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
