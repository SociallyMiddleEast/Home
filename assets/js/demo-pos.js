/* Demo — Restaurant POS (sample data only) */
(function () {
  var MENU = [{"id": "i0", "name": "Hummus", "price": 5, "cat": "Starters", "color": "#34E1C4"}, {"id": "i1", "name": "Fattoush", "price": 6, "cat": "Starters", "color": "#34E1C4"}, {"id": "i2", "name": "Halloumi fries", "price": 7, "cat": "Starters", "color": "#34E1C4"}, {"id": "i3", "name": "Soup of the day", "price": 5, "cat": "Starters", "color": "#34E1C4"}, {"id": "i4", "name": "Grilled chicken", "price": 14, "cat": "Mains", "color": "#FFB547"}, {"id": "i5", "name": "Beef burger", "price": 12, "cat": "Mains", "color": "#FFB547"}, {"id": "i6", "name": "Pasta Alfredo", "price": 13, "cat": "Mains", "color": "#FFB547"}, {"id": "i7", "name": "Shish tawook plate", "price": 11, "cat": "Mains", "color": "#FFB547"}, {"id": "i8", "name": "Lemonade", "price": 3, "cat": "Drinks", "color": "#6EA8FF"}, {"id": "i9", "name": "Fresh orange juice", "price": 4, "cat": "Drinks", "color": "#6EA8FF"}, {"id": "i10", "name": "Espresso", "price": 2.5, "cat": "Drinks", "color": "#6EA8FF"}, {"id": "i11", "name": "Soft drink", "price": 2, "cat": "Drinks", "color": "#6EA8FF"}, {"id": "i12", "name": "Chocolate cake", "price": 6, "cat": "Desserts", "color": "#FF7A9A"}, {"id": "i13", "name": "Cheesecake", "price": 6, "cat": "Desserts", "color": "#FF7A9A"}, {"id": "i14", "name": "Knefeh", "price": 5, "cat": "Desserts", "color": "#FF7A9A"}], CATS = ['All'].concat(["Starters", "Mains", "Drinks", "Desserts"]), TABLES = ["T1", "T2", "T3", "T4", "T5", "T6", "Takeaway"];
  var S = { cat: 'All', table: 'T4', lines: {}, view: 'order', sent: false, orderNo: 1001, receipt: null };
  var app = document.getElementById('pos-app');
  var byId = {}; MENU.forEach(function (m) { byId[m.id] = m; });
  function money(n) { return '$' + n.toFixed(2); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pill(on) {
    return 'min-height:44px;padding:0 16px;border-radius:999px;font:600 14px Inter,sans-serif;cursor:pointer;' +
      (on ? 'background:#34E1C4;color:#04120F;border:1px solid #34E1C4;box-shadow:0 8px 20px rgba(52,225,196,0.3);' : 'background:var(--surface);color:var(--text-2);border:1px solid var(--line-3);');
  }
  function lines() {
    return Object.keys(S.lines).map(function (id) { var m = byId[id]; return { id: id, name: m.name, qty: S.lines[id], price: m.price }; });
  }
  function totals(ls) { var sub = ls.reduce(function (a, l) { return a + l.price * l.qty; }, 0); var vat = Math.round(sub * 11) / 100; return { sub: sub, vat: vat, total: sub + vat }; }
  function tableText() { return S.table === 'Takeaway' ? 'Takeaway' : 'Table ' + S.table.slice(1); }
  var QB = 'width:32px;height:32px;border-radius:10px;border:1px solid var(--line-3);background:var(--surface);color:var(--text);font-size:18px;cursor:pointer';

  function render() {
    var ls = lines(), t = totals(ls), empty = ls.length === 0;
    var h = '';
    h += '<div style="display:flex;flex-direction:column;gap:20px">';
    h += '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px"><div style="display:flex;align-items:center;gap:14px"><span aria-hidden="true" style="width:48px;height:48px;border-radius:14px;background:linear-gradient(145deg,#FFB547,#C98A2B);display:flex;align-items:center;justify-content:center;font:700 20px \'Space Grotesk\',sans-serif;color:#1A1003">DB</span><div style="display:flex;flex-direction:column;gap:2px"><span style="font:700 24px \'Space Grotesk\',sans-serif">Demo Bistro</span><span style="font-size:13px;color:var(--muted-2)">Restaurant POS · Cashier: Demo user</span></div></div>';
    h += '<div role="group" aria-label="Table" style="display:flex;flex-wrap:wrap;gap:8px">' + TABLES.map(function (x) { return '<button type="button" class="chip-btn" data-table="' + x + '" aria-pressed="' + (S.table === x) + '" style="' + pill(S.table === x) + '">' + x + '</button>'; }).join('') + '</div></div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start">';
    h += '<div style="flex:999 1 560px;min-width:0;display:flex;flex-direction:column;gap:16px">';
    h += '<div role="group" aria-label="Menu categories" style="display:flex;flex-wrap:wrap;gap:8px">' + CATS.map(function (c) { return '<button type="button" class="chip-btn" data-cat="' + c + '" aria-pressed="' + (S.cat === c) + '" style="' + pill(S.cat === c) + '">' + c + '</button>'; }).join('') + '</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px">';
    MENU.filter(function (m) { return S.cat === 'All' || m.cat === S.cat; }).forEach(function (m) {
      var q = S.lines[m.id] || 0;
      h += '<button type="button" class="pos-item" data-add="' + m.id + '" aria-label="Add ' + esc(m.name) + ', ' + money(m.price) + '" style="position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:10px;min-height:128px;padding:16px;border-radius:18px;border:1px solid var(--line-3);background:var(--surface);color:var(--text);text-align:left;cursor:pointer;font-family:Inter,sans-serif">' +
        '<span style="width:36px;height:6px;border-radius:3px;background:' + m.color + ';box-shadow:0 0 12px ' + m.color + '"></span>' +
        '<span style="font:600 16px \'Space Grotesk\',sans-serif;line-height:1.25;flex-grow:1">' + esc(m.name) + '</span>' +
        '<span style="font-size:15px;color:var(--muted)">' + money(m.price) + '</span>' +
        (q ? '<span class="pop-in" style="position:absolute;top:12px;right:12px;min-width:28px;height:28px;padding:0 8px;border-radius:999px;background:#34E1C4;color:#04120F;font:700 13px Inter,sans-serif;display:flex;align-items:center;justify-content:center">' + q + '</span>' : '') +
        '</button>';
    });
    h += '</div></div>';
    h += '<aside id="order" aria-label="Current order" style="flex:1 1 340px;min-width:0;position:sticky;top:16px;border-radius:24px;border:1px solid var(--line-3);background:var(--surface);box-shadow:0 24px 60px var(--card-shadow);padding:22px;display:flex;flex-direction:column;gap:16px">';
    if (S.view === 'order') {
      h += '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px"><h2 style="margin:0;font:700 22px \'Space Grotesk\',sans-serif">Order #' + S.orderNo + '</h2><span style="font-size:14px;color:var(--muted-2)">' + tableText() + '</span></div>';
      if (empty) h += '<div style="padding:34px 12px;border-radius:16px;border:1px dashed var(--line-4);text-align:center;color:var(--muted-2);font-size:15px">Tap items on the menu to start an order.</div>';
      h += '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px">' + ls.map(function (l) {
        return '<li style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:var(--bg-2)"><span style="flex:1;min-width:0;font-weight:500">' + esc(l.name) + '</span>' +
          '<button type="button" class="qty-btn" data-dec="' + l.id + '" aria-label="Remove one ' + esc(l.name) + '" style="' + QB + '">−</button><span style="min-width:22px;text-align:center;font-weight:600">' + l.qty + '</span>' +
          '<button type="button" class="qty-btn" data-inc="' + l.id + '" aria-label="Add one ' + esc(l.name) + '" style="' + QB + '">+</button><span style="min-width:64px;text-align:right;font-variant-numeric:tabular-nums">' + money(l.price * l.qty) + '</span></li>';
      }).join('') + '</ul>';
      h += '<div style="display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid var(--line-3);font-variant-numeric:tabular-nums"><div style="display:flex;justify-content:space-between;color:var(--muted)"><span>Subtotal</span><span>' + money(t.sub) + '</span></div><div style="display:flex;justify-content:space-between;color:var(--muted)"><span>VAT (11%)</span><span>' + money(t.vat) + '</span></div><div style="display:flex;justify-content:space-between;font:700 24px \'Space Grotesk\',sans-serif"><span>Total</span><span>' + money(t.total) + '</span></div></div>';
      if (S.sent) h += '<div class="pop-in" role="status" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:rgba(52,225,196,0.12);border:1px solid rgba(52,225,196,0.45);color:var(--accent-text);font-weight:600"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>Sent to kitchen</div>';
      h += '<div style="display:flex;flex-wrap:wrap;gap:12px"><button type="button" class="btn-ring" data-act="kitchen"' + (empty ? ' disabled' : '') + ' style="flex:1 1 140px;justify-content:center">Send to kitchen</button><button type="button" class="btn-3d" data-act="pay"' + (empty ? ' disabled' : '') + ' style="flex:1 1 140px;justify-content:center">Pay ' + money(t.total) + '</button></div>';
    } else if (S.view === 'pay') {
      var tile = 'display:flex;flex-direction:column;align-items:center;gap:10px;padding:22px 12px;border-radius:18px;border:1px solid var(--line-3);background:var(--surface);color:var(--text);cursor:pointer;font:600 16px Inter,sans-serif';
      h += '<div class="pop-in" style="display:flex;flex-direction:column;gap:18px"><h2 style="margin:0;font:700 22px \'Space Grotesk\',sans-serif">Take payment</h2><div style="padding:22px;border-radius:18px;background:var(--bg-2);text-align:center"><span style="display:block;font-size:14px;color:var(--muted-2)">Amount due</span><span style="display:block;font:700 44px \'Space Grotesk\',sans-serif">' + money(t.total) + '</span></div>' +
        '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px"><button type="button" class="pos-item" data-act="cash" style="' + tile + '"><svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#34E1C4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>Cash</button><button type="button" class="pos-item" data-act="card" style="' + tile + '"><svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FFB547" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>Card</button></div>' +
        '<button type="button" data-act="back" style="align-self:flex-start;min-height:44px;padding:0 4px;border:0;background:none;color:var(--accent-text);font:600 15px Inter,sans-serif;cursor:pointer">← Back to order</button></div>';
    } else {
      var r = S.receipt;
      h += '<div style="display:flex;align-items:center;gap:12px"><span class="check-spin" aria-hidden="true" style="width:44px;height:44px;border-radius:50%;background:#34E1C4;display:flex;align-items:center;justify-content:center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#04120F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg></span><h2 style="margin:0;font:700 22px \'Space Grotesk\',sans-serif">Paid by ' + r.by + '</h2></div>';
      h += '<div class="receipt-print" style="background:#FBFCFE;color:#0B1220;border-radius:6px 6px 0 0;box-shadow:0 20px 40px rgba(0,0,0,0.3);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px"><div style="padding:20px 18px;display:flex;flex-direction:column;gap:6px"><span style="text-align:center;font-weight:700;font-size:15px">DEMO BISTRO</span><span style="text-align:center;color:#4A5A70">Order #' + r.no + ' · ' + r.table + '</span><span style="border-top:1px dashed #8592A6;margin:6px 0"></span>' +
        r.lines.map(function (l) { return '<span style="display:flex;justify-content:space-between;gap:10px"><span>' + l.qty + ' × ' + esc(l.name) + '</span><span>' + money(l.price * l.qty) + '</span></span>'; }).join('') +
        '<span style="border-top:1px dashed #8592A6;margin:6px 0"></span><span style="display:flex;justify-content:space-between"><span>Subtotal</span><span>' + money(r.sub) + '</span></span><span style="display:flex;justify-content:space-between"><span>VAT 11%</span><span>' + money(r.vat) + '</span></span><span style="display:flex;justify-content:space-between;font-weight:700;font-size:15px"><span>TOTAL</span><span>' + money(r.total) + '</span></span><span style="text-align:center;color:#4A5A70;margin-top:8px">Thank you! — sample receipt</span></div></div>';
      h += '<button type="button" class="btn-3d" data-act="new" style="justify-content:center">New order <span class="arrow" aria-hidden="true">→</span></button>';
    }
    h += '</aside></div></div>';
    if (!empty && S.view === 'order') {
      var n = ls.reduce(function (a, l) { return a + l.qty; }, 0);
      h += '<a href="#order" class="mobile-bar pop-in" style="position:fixed;left:12px;right:12px;bottom:12px;z-index:50;align-items:center;justify-content:space-between;gap:12px;min-height:56px;padding:0 20px;border-radius:16px;background:#34E1C4;color:#04120F;font:700 16px \'Space Grotesk\',sans-serif;text-decoration:none;box-shadow:0 14px 34px rgba(0,0,0,0.35)"><span>Order · ' + n + (n === 1 ? ' item' : ' items') + '</span><span>View ' + money(t.total) + ' →</span></a>';
    }
    app.innerHTML = h;
  }
  function setQty(id, q) { if (q <= 0) delete S.lines[id]; else S.lines[id] = q; S.sent = false; render(); }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    var d = b.dataset;
    if (d.table) { S.table = d.table; render(); }
    else if (d.cat) { S.cat = d.cat; render(); }
    else if (d.add) setQty(d.add, (S.lines[d.add] || 0) + 1);
    else if (d.inc) setQty(d.inc, S.lines[d.inc] + 1);
    else if (d.dec) setQty(d.dec, S.lines[d.dec] - 1);
    else if (d.act === 'kitchen') { S.sent = true; render(); }
    else if (d.act === 'pay') { S.view = 'pay'; render(); }
    else if (d.act === 'back') { S.view = 'order'; render(); }
    else if (d.act === 'cash' || d.act === 'card') {
      var ls = lines(), t = totals(ls);
      S.receipt = { no: S.orderNo, table: tableText(), lines: ls, sub: t.sub, vat: t.vat, total: t.total, by: d.act };
      S.view = 'receipt'; render();
    } else if (d.act === 'new') { S.view = 'order'; S.lines = {}; S.sent = false; S.orderNo++; S.receipt = null; render(); }
  });
  render();
})();
