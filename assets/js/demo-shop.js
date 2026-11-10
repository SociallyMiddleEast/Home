/* Demo — Online Store (sample data only) */
(function () {
  var P = [{"id": "p1", "name": "Wireless headphones", "price": 59, "cat": "Electronics", "icon": "headphones", "c1": "#34E1C4", "c2": "#138F7C"}, {"id": "p2", "name": "Smart watch", "price": 89, "cat": "Electronics", "icon": "watch", "c1": "#6EA8FF", "c2": "#2F5FB3"}, {"id": "p3", "name": "Bluetooth speaker", "price": 45, "cat": "Electronics", "icon": "speaker", "c1": "#FFB547", "c2": "#C98A2B"}, {"id": "p4", "name": "Ceramic mug set", "price": 18, "cat": "Home", "icon": "mug", "c1": "#FF7A9A", "c2": "#B8405C"}, {"id": "p5", "name": "Desk lamp", "price": 32, "cat": "Home", "icon": "lamp", "c1": "#FFB547", "c2": "#A8671A"}, {"id": "p6", "name": "Throw pillow", "price": 15, "cat": "Home", "icon": "pillow", "c1": "#B794FF", "c2": "#6B4BC2"}, {"id": "p7", "name": "Leather wallet", "price": 25, "cat": "Accessories", "icon": "wallet", "c1": "#E0A374", "c2": "#8A5530"}, {"id": "p8", "name": "Sunglasses", "price": 29, "cat": "Accessories", "icon": "glasses", "c1": "#34E1C4", "c2": "#1B7F70"}, {"id": "p9", "name": "Everyday backpack", "price": 49, "cat": "Accessories", "icon": "bag", "c1": "#6EA8FF", "c2": "#2A4E8F"}], ICONS = {"headphones": "<path d=\"M4 14v-2a8 8 0 0 1 16 0v2\"/><rect x=\"3\" y=\"14\" width=\"4\" height=\"6\" rx=\"1.5\"/><rect x=\"17\" y=\"14\" width=\"4\" height=\"6\" rx=\"1.5\"/>", "watch": "<rect x=\"7\" y=\"6\" width=\"10\" height=\"12\" rx=\"3\"/><path d=\"M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 10v2l1.5 1\"/>", "speaker": "<rect x=\"6\" y=\"3\" width=\"12\" height=\"18\" rx=\"3\"/><circle cx=\"12\" cy=\"14\" r=\"3\"/><circle cx=\"12\" cy=\"7.5\" r=\"1\"/>", "mug": "<path d=\"M5 8h11v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z\"/><path d=\"M16 10h2a2 2 0 0 1 0 4h-2\"/>", "lamp": "<path d=\"M8 3h8l3 7H5l3-7Z\"/><path d=\"M12 10v8M8 21h8\"/>", "pillow": "<path d=\"M5 6c3 1 11 1 14 0 1 4 1 8 0 12-3-1-11-1-14 0-1-4-1-8 0-12Z\"/>", "wallet": "<rect x=\"3\" y=\"6\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M16 12h5M3 9h14\"/>", "glasses": "<circle cx=\"7\" cy=\"14\" r=\"3.5\"/><circle cx=\"17\" cy=\"14\" r=\"3.5\"/><path d=\"M10.5 14h3M3.5 14 5 8M20.5 14 19 8\"/>", "bag": "<path d=\"M6 8a6 6 0 0 1 12 0v12H6Z\"/><path d=\"M9 4.5V3h6v1.5M9 13h6\"/>"}, CATS = ['All', 'Electronics', 'Home', 'Accessories'];
  var S = { cat: 'All', q: '', cart: {}, step: 'cart', mode: 'delivery', orderNo: 2041, done: null, bump: 0 };
  var app = document.getElementById('shop-app');
  var byId = {}; P.forEach(function (p) { byId[p.id] = p; });
  function money(n) { return '$' + n.toFixed(2); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pill(on) {
    return 'min-height:44px;padding:0 16px;border-radius:999px;font:600 14px Inter,sans-serif;cursor:pointer;' +
      (on ? 'background:#34E1C4;color:#04120F;border:1px solid #34E1C4;box-shadow:0 8px 20px rgba(52,225,196,0.3);' : 'background:var(--surface);color:var(--text-2);border:1px solid var(--line-3);');
  }
  var QB = 'width:32px;height:32px;border-radius:10px;border:1px solid var(--line-3);background:var(--surface);color:var(--text);font-size:18px;cursor:pointer';
  var INPUT = 'min-height:46px;padding:0 14px;border-radius:12px;border:1px solid var(--line-3);background:var(--bg);color:var(--text);font:16px Inter,sans-serif';

  // static frame (header, banner, layout) is built once so the search box keeps focus
  app.innerHTML =
    '<div style="display:flex;flex-direction:column;gap:24px">' +
    '<header style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px"><div style="display:flex;align-items:center;gap:14px"><span aria-hidden="true" style="width:48px;height:48px;border-radius:14px;background:linear-gradient(145deg,#6EA8FF,#2F5FB3);display:flex;align-items:center;justify-content:center;font:700 20px \'Space Grotesk\',sans-serif;color:#FFFFFF">DS</span><span style="font:700 24px \'Space Grotesk\',sans-serif">Demo Store</span></div>' +
    '<label style="flex:1 1 260px;max-width:460px;display:flex;align-items:center;gap:10px;min-height:48px;padding:0 16px;border-radius:14px;border:1px solid var(--line-3);background:var(--surface)"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--muted-2)"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Search products</span><input id="shop-search" type="search" placeholder="Search products" style="flex:1;min-width:0;border:0;outline:none;background:transparent;color:var(--text);font:16px Inter,sans-serif"></label>' +
    '<a href="#cart" id="cart-link" aria-label="Cart, 0 items" style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:14px;border:1px solid var(--line-3);background:var(--surface);color:var(--text)"><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.2"/><circle cx="17" cy="20" r="1.2"/></svg><span id="cart-badge"></span></a></header>' +
    '<div style="position:relative;overflow:hidden;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px;padding:28px 32px;border-radius:24px;background:linear-gradient(120deg,#2F5FB3,#34E1C4);color:#FFFFFF"><div style="display:flex;flex-direction:column;gap:8px;max-width:560px"><span style="font:700 clamp(24px,3vw,34px) \'Space Grotesk\',sans-serif;letter-spacing:-0.01em">Free delivery on orders over $50</span><span style="font-size:16px;opacity:0.92">Add a few items, open the cart and go through checkout.</span></div><span aria-hidden="true" class="float" style="width:90px;height:90px;border-radius:24px;background:rgba(255,255,255,0.22);border:1px solid rgba(255,255,255,0.5);transform:rotate(-12deg);display:flex;align-items:center;justify-content:center"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h12v10H2zM14 10h4l4 4v2h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg></span></div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start"><div id="shop-main" style="flex:999 1 560px;min-width:0;display:flex;flex-direction:column;gap:18px"></div>' +
    '<aside id="cart" aria-label="Cart" style="flex:1 1 340px;min-width:0;position:sticky;top:16px;border-radius:24px;border:1px solid var(--line-3);background:var(--surface);box-shadow:0 24px 60px var(--card-shadow);padding:22px;display:flex;flex-direction:column;gap:16px"></aside></div></div>';
  var main = document.getElementById('shop-main'), cartEl = document.getElementById('cart');

  function lines() { return Object.keys(S.cart).map(function (id) { var p = byId[id]; return { id: id, name: p.name, qty: S.cart[id], price: p.price, c1: p.c1 }; }); }
  function sums(ls) { var sub = ls.reduce(function (a, l) { return a + l.qty * l.price; }, 0); var fee = (S.mode === 'pickup' || sub >= 50 || sub === 0) ? 0 : 3; return { count: ls.reduce(function (a, l) { return a + l.qty; }, 0), sub: sub, fee: fee, total: sub + fee }; }

  function renderMain() {
    var q = S.q.trim().toLowerCase();
    var shown = P.filter(function (p) { return (S.cat === 'All' || p.cat === S.cat) && (!q || p.name.toLowerCase().indexOf(q) >= 0); });
    var h = '<div role="group" aria-label="Categories" style="display:flex;flex-wrap:wrap;gap:8px">' + CATS.map(function (c) { return '<button type="button" class="chip-btn" data-cat="' + c + '" aria-pressed="' + (S.cat === c) + '" style="' + pill(S.cat === c) + '">' + c + '</button>'; }).join('') + '</div>';
    if (!shown.length) h += '<div style="padding:40px;border-radius:18px;border:1px dashed var(--line-4);text-align:center;color:var(--muted-2)">No products match your search.</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px">' + shown.map(function (p) {
      var n = S.cart[p.id] || 0;
      return '<div class="card" style="display:flex;flex-direction:column;gap:14px;padding:16px;border-radius:22px;border:1px solid var(--line-2);background:var(--surface)">' +
        '<div style="height:170px;border-radius:16px;display:flex;align-items:center;justify-content:center;transform-style:preserve-3d;background:radial-gradient(circle at 30% 20%,rgba(255,255,255,0.35),transparent 55%),linear-gradient(145deg,' + p.c1 + ',' + p.c2 + ')"><span class="lift" style="display:flex;width:86px;height:86px;border-radius:26px;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.45);align-items:center;justify-content:center;box-shadow:0 18px 30px rgba(0,0,0,0.25)"><svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[p.icon] + '</svg></span></div>' +
        '<div style="display:flex;flex-direction:column;gap:4px"><span style="font-size:13px;color:var(--muted-2)">' + p.cat + '</span><span style="font:600 18px \'Space Grotesk\',sans-serif">' + esc(p.name) + '</span><span style="font:700 20px \'Space Grotesk\',sans-serif;color:var(--accent-text)">' + money(p.price) + '</span></div>' +
        '<button type="button" class="btn-3d" data-add="' + p.id + '" aria-label="Add ' + esc(p.name) + ' to cart" style="min-height:46px;justify-content:center;font-size:15px">' + (n ? 'In cart (' + n + ') · Add another' : 'Add to cart') + '</button></div>';
    }).join('') + '</div>';
    main.innerHTML = h;
  }

  function renderCart() {
    var ls = lines(), t = sums(ls), empty = !ls.length, h = '';
    var badge = document.getElementById('cart-badge');
    document.getElementById('cart-link').setAttribute('aria-label', 'Cart, ' + t.count + ' items');
    badge.outerHTML = '<span id="cart-badge"' + (t.count ? ' class="' + (S.bump % 2 ? 'bump-a' : 'bump-b') + '" style="position:absolute;top:-8px;right:-8px;min-width:24px;height:24px;padding:0 6px;border-radius:999px;background:#FFB547;color:#1A1003;font:700 12px Inter,sans-serif;display:flex;align-items:center;justify-content:center"' : '') + '>' + (t.count || '') + '</span>';
    if (S.step === 'cart') {
      h += '<h2 style="margin:0;font:700 22px \'Space Grotesk\',sans-serif">Your cart</h2>';
      if (empty) h += '<div style="padding:34px 12px;border-radius:16px;border:1px dashed var(--line-4);text-align:center;color:var(--muted-2)">Your cart is empty.</div>';
      h += '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px">' + ls.map(function (l) {
        return '<li style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:var(--bg-2)"><span style="width:12px;height:12px;border-radius:4px;flex-shrink:0;background:' + l.c1 + '"></span><span style="flex:1;min-width:0;font-weight:500">' + esc(l.name) + '</span><button type="button" class="qty-btn" data-dec="' + l.id + '" aria-label="Remove one ' + esc(l.name) + '" style="' + QB + '">−</button><span style="min-width:20px;text-align:center;font-weight:600">' + l.qty + '</span><button type="button" class="qty-btn" data-inc="' + l.id + '" aria-label="Add one ' + esc(l.name) + '" style="' + QB + '">+</button></li>';
      }).join('') + '</ul>';
      h += '<div style="display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid var(--line-3);font-variant-numeric:tabular-nums"><div style="display:flex;justify-content:space-between;color:var(--muted)"><span>Subtotal</span><span>' + money(t.sub) + '</span></div><div style="display:flex;justify-content:space-between;color:var(--muted)"><span>Delivery</span><span>' + (t.fee ? money(t.fee) : 'Free') + '</span></div><div style="display:flex;justify-content:space-between;font:700 24px \'Space Grotesk\',sans-serif"><span>Total</span><span>' + money(t.total) + '</span></div></div>';
      h += '<button type="button" class="btn-3d" data-act="checkout"' + (empty ? ' disabled' : '') + ' style="justify-content:center">Checkout <span class="arrow" aria-hidden="true">→</span></button>';
    } else if (S.step === 'checkout') {
      h += '<div class="pop-in" style="display:flex;flex-direction:column;gap:14px"><h2 style="margin:0;font:700 22px \'Space Grotesk\',sans-serif">Checkout</h2>' +
        '<div role="group" aria-label="Delivery method" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"><button type="button" class="chip-btn" data-mode="delivery" aria-pressed="' + (S.mode === 'delivery') + '" style="' + pill(S.mode === 'delivery') + '">Delivery</button><button type="button" class="chip-btn" data-mode="pickup" aria-pressed="' + (S.mode === 'pickup') + '" style="' + pill(S.mode === 'pickup') + '">Pick up in store</button></div>' +
        '<label style="display:flex;flex-direction:column;gap:6px;font-size:14px;color:var(--text-2)">Full name<input type="text" value="Demo Customer" style="' + INPUT + '"></label>' +
        '<label style="display:flex;flex-direction:column;gap:6px;font-size:14px;color:var(--text-2)">Phone<input type="tel" value="+961 00 000 000" style="' + INPUT + '"></label>' +
        (S.mode === 'delivery' ? '<label style="display:flex;flex-direction:column;gap:6px;font-size:14px;color:var(--text-2)">Delivery address<textarea rows="2" style="padding:10px 14px;border-radius:12px;border:1px solid var(--line-3);background:var(--bg);color:var(--text);font:16px Inter,sans-serif;resize:vertical">Sample street, Building 1</textarea></label>' : '') +
        '<div style="display:flex;justify-content:space-between;font:700 22px \'Space Grotesk\',sans-serif;padding-top:6px"><span>Total</span><span>' + money(t.total) + '</span></div>' +
        '<button type="button" class="btn-3d" data-act="place" style="justify-content:center">Place order <span class="arrow" aria-hidden="true">→</span></button>' +
        '<button type="button" data-act="back" style="align-self:flex-start;min-height:44px;padding:0 4px;border:0;background:none;color:var(--accent-text);font:600 15px Inter,sans-serif;cursor:pointer">← Back to cart</button></div>';
    } else {
      h += '<div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:16px 0;text-align:center"><span class="check-spin" aria-hidden="true" style="width:84px;height:84px;border-radius:26px;background:linear-gradient(145deg,#34E1C4,#138F7C);display:flex;align-items:center;justify-content:center;box-shadow:0 18px 40px rgba(52,225,196,0.4)"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#04120F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg></span>' +
        '<h2 style="margin:0;font:700 24px \'Space Grotesk\',sans-serif">Order ' + S.done.no + ' confirmed</h2><p style="margin:0;color:var(--muted);line-height:1.6">' + S.done.text + '</p><p style="margin:0;font-size:14px;color:var(--muted-2)">In your store, this order would now appear in your POS and stock would update automatically.</p>' +
        '<button type="button" class="btn-3d" data-act="again" style="justify-content:center">Continue shopping</button></div>';
    }
    cartEl.innerHTML = h;
  }
  function render() { renderMain(); renderCart(); }
  function setQty(id, n, bump) { if (n <= 0) delete S.cart[id]; else S.cart[id] = n; if (bump) S.bump++; render(); }

  document.getElementById('shop-search').addEventListener('input', function (e) { S.q = e.target.value; renderMain(); });
  app.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    var d = b.dataset;
    if (d.cat) { S.cat = d.cat; renderMain(); }
    else if (d.add) setQty(d.add, (S.cart[d.add] || 0) + 1, true);
    else if (d.inc) setQty(d.inc, S.cart[d.inc] + 1);
    else if (d.dec) setQty(d.dec, S.cart[d.dec] - 1);
    else if (d.mode) { S.mode = d.mode; renderCart(); }
    else if (d.act === 'checkout') { S.step = 'checkout'; renderCart(); }
    else if (d.act === 'back') { S.step = 'cart'; renderCart(); }
    else if (d.act === 'place') {
      var t = sums(lines());
      S.done = { no: '#SM-' + S.orderNo, text: t.count + (t.count === 1 ? ' item' : ' items') + ' · ' + money(t.total) + ' · ' + (S.mode === 'pickup' ? 'Ready for pick up' : 'Out for delivery soon') };
      S.orderNo++; S.cart = {}; S.step = 'done'; render();
    } else if (d.act === 'again') { S.step = 'cart'; S.done = null; render(); }
  });
  render();
})();
