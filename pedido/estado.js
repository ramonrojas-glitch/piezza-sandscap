/* PIEZZA · estado de pedidos (demo: el tiempo corre acelerado para la presentación) */
(function () {
  // Segundos (desde que se pagó) en que empieza cada etapa
  const DELIVERY = [
    { k: 'recibido', t: 0, label: 'Pedido recibido', txt: 'Ya lo tenemos. Lo estamos revisando.', wa: 'Recibimos tu pedido {no}. ¡Gracias! 🍕' },
    { k: 'preparando', t: 20, label: 'Preparando tu pizza', txt: 'Estiramos la masa y le ponemos tus toppings.', wa: 'Tu pizza ya se está preparando 👨‍🍳' },
    { k: 'horno', t: 45, label: 'En el horno', txt: 'Horno de leña a más de 400 °C. Ya casi.', wa: 'Tu pizza entró al horno 🔥' },
    { k: 'camino', t: 80, label: 'En camino', txt: 'Tu rider va directo a tu casa.', wa: '¡Tu pedido va en camino! 🛵 Síguelo aquí: piezza.sandscap.com.do/pedido' },
    { k: 'entregado', t: 170, label: 'Entregado', txt: '¡Buen provecho! Gracias por pedir directo.', wa: 'Pedido entregado. ¡Buen provecho! ❤️' }
  ];
  const PICKUP = [
    DELIVERY[0], DELIVERY[1], DELIVERY[2],
    { k: 'lista', t: 80, label: 'Lista para recoger', txt: 'Te esperamos en la tienda. Di tu número de orden.', wa: '¡Tu pizza está lista para recoger! 🍕 Orden {no}' },
    { k: 'recogido', t: 260, label: 'Recogido', txt: '¡Buen provecho! Gracias por pedir directo.', wa: 'Pedido recogido. ¡Buen provecho! ❤️' }
  ];
  const RIDERS = [
    { name: 'Luis Martínez', moto: 'Honda roja · A845221', ini: 'LM' },
    { name: 'Yeison Peña', moto: 'Yamaha negra · K301774', ini: 'YP' },
    { name: 'Carlos Abreu', moto: 'Suzuki roja · N552390', ini: 'CA' }
  ];
  function read(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function stages(o) { return o.mode === 'pickup' ? PICKUP : DELIVERY; }
  function status(o, now) {
    const st = stages(o);
    const el = Math.max(0, ((now || Date.now()) - o.at) / 1000);
    let i = 0; st.forEach((s, j) => { if (el >= s.t) i = j; });
    const cur = st[i], nxt = st[i + 1];
    const p = nxt ? Math.min(1, (el - cur.t) / (nxt.t - cur.t)) : 1;
    return { i, stage: cur, stages: st, part: p, done: !nxt, total: (i + p) / (st.length - 1) };
  }
  function rider(o) { let h = 0; String(o.no).split('').forEach((c) => { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return RIDERS[h % RIDERS.length]; }
  function orders() { return read('pz_orders', []).slice().sort((a, b) => b.at - a.at); }
  function find(no) { no = String(no || '').trim().toUpperCase(); if (no && !/^PZ-/.test(no)) no = 'PZ-' + no; return orders().find((o) => o.no === no) || null; }
  function active() { return orders().find((o) => !status(o).done && Date.now() - o.at < 86400000) || null; }
  window.PZOrders = { stages, status, rider, orders, find, active };
})();
