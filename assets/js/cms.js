/* Socially Middle East — renders editable content (managed in /SociallyAdmin) */
(function () {
  var V = '?v=' + Date.now();   // always read the latest saved content
  function get(path) {
    return fetch('content/' + path + V, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { u = String(u || '').trim(); return /^(https?:\/\/|\/|\.\/|\.\.\/|assets\/|mailto:|tel:)/i.test(u) || /^[\w.-]+\.(png|jpe?g|webp|gif|svg|html)$/i.test(u) ? u : ''; }
  function pick(o, path) { return path.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function fmtDate(d) { var p = String(d || '').split('-'); return p.length === 3 ? (+p[2]) + ' ' + MONTHS[+p[1] - 1] + ' ' + p[0] : esc(d); }

  // Tiny, safe formatting: **bold**, *italic*, [link](url), "## heading", "- list", blank line = new paragraph
  function rich(text) {
    var blocks = String(text || '').replace(/\r/g, '').split(/\n{2,}/);
    function inline(s) {
      return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) { var su = safeUrl(u.replace(/&amp;/g, '&')); return su ? '<a href="' + esc(su) + '">' + t + '</a>' : t; });
    }
    return blocks.map(function (b) {
      b = b.trim(); if (!b) return '';
      if (/^##\s+/.test(b)) return '<h3 style="margin:28px 0 8px;font-family:\'Space Grotesk\',sans-serif;font-size:26px">' + inline(b.replace(/^##\s+/, '')) + '</h3>';
      var lines = b.split('\n');
      if (lines.every(function (l) { return /^\s*-\s+/.test(l); }))
        return '<ul style="margin:0 0 16px;padding-left:22px;display:flex;flex-direction:column;gap:6px">' + lines.map(function (l) { return '<li>' + inline(l.replace(/^\s*-\s+/, '')) + '</li>'; }).join('') + '</ul>';
      return '<p style="margin:0 0 16px">' + lines.map(inline).join('<br>') + '</p>';
    }).join('');
  }
  window.SociallyRich = rich;

  // ---------- site text & contact ----------
  get('site.json').then(function (site) {
    document.querySelectorAll('[data-cms]').forEach(function (el) {
      var v = pick(site, el.getAttribute('data-cms'));
      if (typeof v === 'string' && v.trim()) el.textContent = v;
    });
    document.querySelectorAll('[data-cms-rich]').forEach(function (el) {
      var v = pick(site, el.getAttribute('data-cms-rich'));
      if (typeof v === 'string' && v.trim()) el.innerHTML = rich(v);
    });
    var c = site.contact || {};
    if (c.phone) document.querySelectorAll('[data-cms-tel]').forEach(function (a) { a.textContent = c.phone; a.setAttribute('href', 'tel:' + c.phone.replace(/[^\d+]/g, '')); });
    if (c.email) document.querySelectorAll('[data-cms-email]').forEach(function (a) { a.textContent = c.email; a.setAttribute('href', 'mailto:' + c.email); });
  }).catch(function () {});

  // ---------- customers ----------
  var cust = document.querySelectorAll('[data-cms-customers]');
  if (cust.length) get('customers.json').then(function (list) {
    var html = (list || []).filter(function (c) { return c && c.name && c.visible !== false; }).map(function (c) {
      var logo = safeUrl(c.logo);
      var mark = logo
        ? '<span class="lift" style="width:76px;height:76px;border-radius:20px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 16px 34px rgba(0,0,0,0.3)"><img src="' + esc(logo) + '" alt="" style="max-width:84%;max-height:84%;object-fit:contain"></span>'
        : '<span class="lift" style="width:76px;height:76px;border-radius:20px;background:' + esc(c.color || 'linear-gradient(145deg, #34E1C4, #1BA892)') + ';display:flex;align-items:center;justify-content:center;font:700 26px \'Space Grotesk\', sans-serif;color:#04120F;box-shadow:0 16px 34px rgba(0,0,0,0.3)">' + esc(c.initials || c.name.split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase()) + '</span>';
      var url = safeUrl(c.url);
      var tag = url ? 'a' : 'div', attrs = url ? ' href="' + esc(url) + '" target="_blank" rel="noopener"' : '';
      return '<' + tag + attrs + ' class="card" style="text-decoration:none;color:var(--text);display:flex;flex-direction:column;justify-content:space-between;gap:32px;min-height:230px;padding:28px;border-radius:22px;border:1px solid var(--line-2);background:linear-gradient(160deg, var(--surface-2), var(--bg-2))">' + mark +
        '<div style="display:flex;flex-direction:column;gap:6px"><h3 style="margin:0;font-family:\'Space Grotesk\', sans-serif;font-size:24px;letter-spacing:-0.01em">' + esc(c.name) + '</h3><span style="font-size:14px;color:var(--muted-2)">' + esc(c.label || 'Customer') + '</span></div></' + tag + '>';
    }).join('');
    cust.forEach(function (box) {
      var keep = box.querySelector('[data-cms-keep]');
      box.innerHTML = html; if (keep) box.appendChild(keep);
    });
  }).catch(function () {});

  // ---------- news ----------
  function card(n) {
    var img = safeUrl(n.image);
    return '<a class="card" href="news.html?id=' + encodeURIComponent(n.id) + '" style="text-decoration:none;color:var(--text);display:flex;flex-direction:column;gap:14px;padding:16px;border-radius:22px;border:1px solid var(--line-2);background:var(--surface)">' +
      (img ? '<div style="height:200px;border-radius:16px;background:var(--bg-2) center/cover no-repeat url(\'' + esc(img) + '\')"></div>'
           : '<div style="height:200px;border-radius:16px;background:radial-gradient(circle at 30% 20%,rgba(255,255,255,0.25),transparent 55%),linear-gradient(135deg,#1BA892,#2F5FB3);display:flex;align-items:flex-end;padding:18px"><span style="font:700 22px \'Space Grotesk\',sans-serif;color:#fff">News</span></div>') +
      '<div style="display:flex;flex-direction:column;gap:8px;padding:0 6px 8px"><span style="font-size:13px;color:var(--muted-2)">' + fmtDate(n.date) + '</span>' +
      '<span style="font:600 22px \'Space Grotesk\',sans-serif;line-height:1.25">' + esc(n.title) + '</span>' +
      '<span style="color:var(--muted);line-height:1.55">' + esc(n.summary || '') + '</span>' +
      '<span class="more" style="display:inline-flex;align-items:center;gap:6px;color:var(--accent-text);font-weight:600;margin-top:6px">Read more <span aria-hidden="true">→</span></span></div></a>';
  }
  var latest = document.querySelectorAll('[data-cms-news-latest]'), listEl = document.querySelector('[data-cms-news-list]'), postEl = document.querySelector('[data-cms-news-post]');
  if (latest.length || listEl || postEl) get('news.json').then(function (all) {
    var news = (all || []).filter(function (n) { return n && n.title && n.published !== false; }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    latest.forEach(function (box) {
      var sec = box.closest('section');
      if (!news.length) { if (sec) sec.style.display = 'none'; return; }
      if (sec) sec.style.display = 'flex';
      box.innerHTML = news.slice(0, 3).map(card).join('');
    });
    var id = new URLSearchParams(location.search).get('id');
    if (postEl && id) {
      var n = news.filter(function (x) { return x.id === id; })[0];
      if (listEl) listEl.style.display = 'none';
      if (!n) { postEl.innerHTML = '<p style="color:var(--muted)">This article could not be found. <a href="news.html">See all news</a></p>'; return; }
      document.title = n.title + ' — Socially Middle East';
      var img = safeUrl(n.image);
      postEl.innerHTML = '<a href="news.html" style="color:var(--accent-text);text-decoration:none;font-weight:600">← All news</a>' +
        '<span style="display:block;margin-top:26px;font-size:15px;color:var(--muted-2)">' + fmtDate(n.date) + '</span>' +
        '<h1 style="margin:10px 0 24px;font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:clamp(34px,5vw,56px);line-height:1.05;letter-spacing:-0.02em">' + esc(n.title) + '</h1>' +
        (img ? '<img src="' + esc(img) + '" alt="" style="display:block;width:100%;max-height:520px;object-fit:cover;border-radius:24px;margin-bottom:30px">' : '') +
        '<div style="font-size:18px;line-height:1.75;color:var(--text-2)">' + rich(n.body) + '</div>';
      postEl.style.display = '';
      var crumb = document.querySelector('[data-cms-news-crumb]'); if (crumb) crumb.style.display = 'none';
      return;
    }
    if (listEl) listEl.innerHTML = news.length ? news.map(card).join('') : '<p style="color:var(--muted)">No news yet — check back soon.</p>';
  }).catch(function () { if (listEl) listEl.innerHTML = '<p style="color:var(--muted)">News could not be loaded right now.</p>'; });
})();
