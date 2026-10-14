/* PIEZZA — origen de cada visita y eventos del embudo (visita → carrito → pago → compra). */
(function () {
  var KEY_SRC = 'pz_src', KEY_EV = 'pz_events', KEY_SID = 'pz_sid';
  var LINKS = {
    ig: { source: 'Instagram · bio', medium: 'organico' },
    ad: { source: 'Anuncio Meta', medium: 'pagado' },
    fb: { source: 'Facebook · perfil', medium: 'organico' },
    tt: { source: 'TikTok · bio', medium: 'organico' },
    wa: { source: 'WhatsApp', medium: 'organico' }
  };
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function sid() {
    try {
      var s = sessionStorage.getItem(KEY_SID);
      if (!s) { s = Math.random().toString(36).slice(2, 10); sessionStorage.setItem(KEY_SID, s); return { id: s, fresh: true }; }
      return { id: s, fresh: false };
    } catch (e) { return { id: 'x', fresh: false }; }
  }

  // Lee el origen de la URL: ?src=ig (link corto), utm_* o fbclid (clic en anuncio de Meta)
  var q = new URLSearchParams(location.search);
  var src = null, srcKey = q.get('src');
  if (srcKey && LINKS[srcKey]) src = { key: srcKey, source: LINKS[srcKey].source, medium: LINKS[srcKey].medium };
  else if (q.get('utm_source')) {
    var m = (q.get('utm_medium') || '').toLowerCase();
    src = { key: 'utm', source: q.get('utm_source') + (q.get('utm_campaign') ? ' · ' + q.get('utm_campaign') : ''),
      medium: /cpc|paid|ads?|pagad/.test(m) ? 'pagado' : 'organico' };
  }
  // Instagram/Facebook agregan fbclid a todo clic que sale de la app (pagado u orgánico):
  // lo que define "pagado" es el link usado (/ad) o utm_medium de pago. fbclid solo confirma que vino de Meta.
  if (q.get('fbclid') && !src) src = { key: 'meta', source: 'Instagram/Facebook', medium: 'organico' };
  if (q.get('gclid')) src = { key: 'google', source: 'Anuncio Google', medium: 'pagado' };

  var s = sid();
  if (src) { src.at = Date.now(); set(KEY_SRC, src); }
  else if (s.fresh && !get(KEY_SRC, null)) {
    var ref = document.referrer && !/piezza\.sandscap\.com\.do/.test(document.referrer) ? document.referrer : '';
    set(KEY_SRC, { key: ref ? 'ref' : 'directo', source: ref ? new URL(ref).hostname : 'Directo', medium: 'organico', at: Date.now() });
  }
  // Limpia la URL para que se vea corta al compartir
  if (q.has('src') || q.has('fbclid')) {
    ['src', 'fbclid'].forEach(function (k) { q.delete(k); });
    var clean = location.pathname + (q.toString() ? '?' + q : '') + location.hash;
    try { history.replaceState(null, '', clean); } catch (e) {}
  }

  window.pzSource = function () { return get(KEY_SRC, { key: 'directo', source: 'Directo', medium: 'organico' }); };
  window.pzTrack = function (name, data) {
    var ev = get(KEY_EV, []);
    var o = window.pzSource();
    ev.push({ e: name, t: Date.now(), sid: s.id, src: o.source, med: o.medium, d: data || null });
    if (ev.length > 2000) ev = ev.slice(-2000);
    set(KEY_EV, ev);
  };
  if (s.fresh || src) window.pzTrack('visita');
})();
