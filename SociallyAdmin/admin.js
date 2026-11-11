/* Socially Admin — edits the website's content files in its GitHub repository.
   Security model: the GitHub access key is stored ONLY as AES-GCM ciphertext in content/admin-auth.json,
   locked with a key derived (PBKDF2-SHA256, 600k rounds) from the admin username + password.
   The password itself is never stored anywhere. */
(function () {
  'use strict';
  var AUTH_PATH = 'content/admin-auth.json', SESSION_KEY = 'sme-admin-session';
  var enc = new TextEncoder(), dec = new TextDecoder();
  var CFG = null;                       // { token, owner, repo, branch } — only in memory / this tab
  var USER = null;                      // the password is never kept after sign-in
  var S = { site: null, news: null, customers: null };   // { data, sha }
  var main = document.getElementById('main');

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function show(id) { ['vLoading', 'vLogin', 'vSetup', 'vApp'].forEach(function (v) { $(v).classList.toggle('hide', v !== id); }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var toastT;
  function toast(msg, bad) { var t = $('toast'); t.textContent = msg; t.classList.toggle('bad', !!bad); t.classList.remove('hide'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.add('hide'); }, bad ? 7000 : 4200); }
  function b64(buf) { var s = '', b = new Uint8Array(buf); for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s) { return Uint8Array.from(atob(String(s).replace(/\s/g, '')), function (c) { return c.charCodeAt(0); }); }
  function slug(s) { return String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item'; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function busy(btn, on, label) { if (!btn) return; if (on) { btn.dataset.l = btn.innerHTML; btn.innerHTML = '<span class="spin"></span> ' + (label || 'Saving…'); btn.disabled = true; } else { btn.innerHTML = btn.dataset.l || btn.innerHTML; btn.disabled = false; } }
  function siteUrl(p) { return p && !/^(https?:)?\/\//.test(p) ? '../' + p : p; }

  // ---------- crypto ----------
  function deriveKey(user, pass, salt, iter) {
    return crypto.subtle.importKey('raw', enc.encode(String(user).trim().toLowerCase() + '\u0000' + pass), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) { return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); });
  }
  function seal(user, pass, obj) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iter = 600000;
    return deriveKey(user, pass, salt, iter).then(function (key) { return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(JSON.stringify(obj))); })
      .then(function (ct) { return { v: 1, kdf: 'PBKDF2-SHA256', iterations: iter, salt: b64(salt), iv: b64(iv), data: b64(ct), note: 'Locked admin key for /SociallyAdmin. It cannot be used without the admin username and password.' }; });
  }
  function unseal(user, pass, box) {
    return deriveKey(user, pass, unb64(box.salt), box.iterations || 600000)
      .then(function (key) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.data)); })
      .then(function (pt) { return JSON.parse(dec.decode(pt)); });
  }

  // ---------- GitHub ----------
  function gh(path, opt, cfg) {
    opt = opt || {}; cfg = cfg || CFG;
    var headers = { 'Authorization': 'Bearer ' + cfg.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (opt.body) headers['Content-Type'] = 'application/json';
    return fetch('https://api.github.com/repos/' + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo) + path, { method: opt.method || 'GET', headers: headers, body: opt.body, cache: 'no-store' })
      .then(function (r) {
        if (r.status === 404 && opt.allow404) return null;
        if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { var e = new Error(j.message || ('GitHub error ' + r.status)); e.status = r.status; throw e; });
        return r.status === 204 ? null : r.json();
      });
  }
  function encPath(p) { return p.split('/').map(encodeURIComponent).join('/'); }
  function readFile(p) { return gh('/contents/' + encPath(p) + '?ref=' + encodeURIComponent(CFG.branch), { allow404: true }); }
  function readJSON(p, fallback) {
    return readFile(p).then(function (f) { return f ? { data: JSON.parse(dec.decode(unb64(f.content))), sha: f.sha } : { data: fallback, sha: null }; });
  }
  function putFile(p, contentB64, message, sha, cfg) {
    var body = { message: message, content: contentB64, branch: (cfg || CFG).branch };
    if (sha) body.sha = sha;
    return gh('/contents/' + encPath(p), { method: 'PUT', body: JSON.stringify(body) }, cfg);
  }
  function saveJSON(key, path, message) {
    var st = S[key];
    return putFile(path, b64(enc.encode(JSON.stringify(st.data, null, 2) + '\n')), message, st.sha)
      .then(function (r) { st.sha = r.content.sha; toast('Saved. The live website updates in about a minute.'); })
      .catch(function (e) {
        if (e.status === 409 || e.status === 422) {
          return readJSON(path, st.data).then(function (fresh) { S[key] = fresh; toast('Someone else saved this at the same time. The latest version was reloaded — please make your change again.', true); route(); });
        }
        toast('Could not save: ' + e.message, true); throw e;
      });
  }
  function errText(e) {
    if (e.status === 401) return 'The GitHub access key is not valid or has expired. Create a new key and use Settings → Replace GitHub key.';
    if (e.status === 403) return 'The GitHub key does not have permission. It needs “Contents: Read and write” on the website repository.';
    if (e.status === 404) return 'Repository not found, or the key cannot see it. Check the account/repository names and the key’s repository access.';
    return e.message || String(e);
  }

  // ---------- images ----------
  function fileToUpload(file, maxW) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) return reject(new Error('Please choose an image file.'));
      var keep = /svg|gif/.test(file.type) || (file.size < 400 * 1024 && /png/.test(file.type));
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Could not read the file.')); };
      if (keep) { reader.onload = function () { resolve({ b64: reader.result.split(',')[1], ext: (file.name.split('.').pop() || 'png').toLowerCase() }); }; return reader.readAsDataURL(file); }
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, maxW / w);
          var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
          var png = /png|webp/.test(file.type);
          var ctx = c.getContext('2d'); if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
          ctx.drawImage(img, 0, 0, c.width, c.height);
          var type = png ? 'image/png' : 'image/jpeg';
          resolve({ b64: c.toDataURL(type, 0.86).split(',')[1], ext: png ? 'png' : 'jpg' });
        };
        img.onerror = function () { reject(new Error('This image could not be opened.')); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function uploadImage(file, maxW) {
    return fileToUpload(file, maxW || 1600).then(function (r) {
      if (r.b64.length > 1.4e6 * 4 / 3) throw new Error('Image is too large even after resizing (max ~1.4 MB).');
      var base = slug(file.name.replace(/\.[^.]+$/, ''));
      var path = 'assets/uploads/' + today() + '-' + base + '-' + Math.random().toString(36).slice(2, 6) + '.' + r.ext;
      return putFile(path, r.b64, 'Upload image ' + path).then(function () { return path; });
    });
  }
  function imageField(id, value, label, maxW) {
    return '<div class="f" style="display:flex;flex-direction:column;gap:8px"><span style="font-size:14px;color:var(--text-2);font-weight:500">' + label + '</span>' +
      '<div class="row"><div class="thumb" id="' + id + 'Prev" style="width:120px;height:80px;' + (value ? "background-image:url('" + esc(siteUrl(value)) + "')" : '') + '"></div>' +
      '<label class="btn" style="position:relative;overflow:hidden">Upload image<input type="file" accept="image/*" id="' + id + 'File" data-max="' + (maxW || 1600) + '" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>' +
      '<button type="button" class="btn" id="' + id + 'Clear"' + (value ? '' : ' disabled') + '>Remove</button></div>' +
      '<input type="hidden" id="' + id + '" value="' + esc(value || '') + '"><small class="muted" id="' + id + 'Msg"></small></div>';
  }
  function wireImageField(id) {
    $(id + 'File').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      $(id + 'Msg').innerHTML = '<span class="spin"></span> Uploading…';
      uploadImage(f, +e.target.dataset.max).then(function (path) {
        $(id).value = path; $(id + 'Prev').style.backgroundImage = "url('" + siteUrl(path) + "')"; $(id + 'Clear').disabled = false;
        $(id + 'Msg').textContent = 'Uploaded. Remember to save.';
      }).catch(function (err) { $(id + 'Msg').textContent = 'Upload failed: ' + errText(err); });
    });
    $(id + 'Clear').addEventListener('click', function () { $(id).value = ''; $(id + 'Prev').style.backgroundImage = ''; this.disabled = true; });
  }

  // ---------- views ----------
  var VIEW = 'dash', PARAM = null;
  function go(v, p) { VIEW = v; PARAM = p == null ? null : p; route(); window.scrollTo(0, 0); }
  function route() {
    document.querySelectorAll('.nav[data-view]').forEach(function (b) { b.setAttribute('aria-current', b.dataset.view === VIEW ? 'page' : 'false'); });
    ({ dash: vDash, news: vNews, newsEdit: vNewsEdit, customers: vCustomers, custEdit: vCustEdit, site: vSite, media: vMedia, settings: vSettings })[VIEW]();
  }
  document.querySelectorAll('.nav[data-view]').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.view); }); });

  function vDash() {
    var news = S.news.data, cust = S.customers.data;
    main.innerHTML = '<div class="top"><h1>Dashboard</h1><a class="btn" href="../index.html" target="_blank" rel="noopener">View website ↗</a></div>' +
      '<div class="ok">Signed in to <b>' + esc(CFG.owner + '/' + CFG.repo) + '</b>. Every save publishes to the live website in about a minute.</div>' +
      '<div class="grid">' +
      [['News articles', news.length, 'news', 'Write a new article'], ['Customers', cust.length, 'customers', 'Add a customer'], ['Site text & contact', 'Edit', 'site', 'Hero text, phone, email'], ['Images', 'Library', 'media', 'Upload & manage']].map(function (c) {
        return '<button class="box" data-go="' + c[2] + '" style="cursor:pointer;text-align:left;color:var(--text);font:inherit"><span class="muted small">' + c[0] + '</span><span style="font:700 34px \'Space Grotesk\',sans-serif">' + c[1] + '</span><span style="color:var(--accent-text);font-weight:600">' + c[3] + ' →</span></button>';
      }).join('') + '</div>' +
      '<div class="box"><h2 style="margin:0;font-size:22px">Recent changes</h2><div id="commits" class="muted small"><span class="spin"></span></div></div>';
    main.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.go); }); });
    gh('/commits?per_page=6&sha=' + encodeURIComponent(CFG.branch)).then(function (list) {
      $('commits').innerHTML = list.map(function (c) { return '<div class="item" style="padding:10px 14px"><div class="t"><span style="color:var(--text)">' + esc(c.commit.message.split('\n')[0]) + '</span><span>' + new Date(c.commit.author.date).toLocaleString() + '</span></div></div>'; }).join('');
    }).catch(function () { $('commits').textContent = 'Could not load recent changes.'; });
  }

  // ----- news -----
  function vNews() {
    var list = S.news.data.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    main.innerHTML = '<div class="top"><h1>News</h1><button class="btn-3d" id="newArt">+ New article</button></div>' +
      (list.length ? list.map(function (n) {
        return '<div class="item"><div class="thumb" style="' + (n.image ? "background-image:url('" + esc(siteUrl(n.image)) + "')" : 'background:linear-gradient(135deg,#1BA892,#2F5FB3)') + '"></div>' +
          '<div class="t"><b>' + esc(n.title) + '</b><span class="muted small">' + esc(n.date) + ' · <span class="pill ' + (n.published === false ? 'off">Draft' : 'on">Published') + '</span></span></div>' +
          '<a class="btn" href="../news.html?id=' + encodeURIComponent(n.id) + '" target="_blank" rel="noopener">View</a><button class="btn" data-edit="' + esc(n.id) + '">Edit</button><button class="btn danger" data-del="' + esc(n.id) + '">Delete</button></div>';
      }).join('') : '<div class="box muted">No articles yet.</div>');
    $('newArt').onclick = function () { go('newsEdit', ''); };
    main.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { go('newsEdit', b.dataset.edit); }; });
    main.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () {
        var n = S.news.data.filter(function (x) { return x.id === b.dataset.del; })[0];
        if (!n || !confirm('Delete “' + n.title + '”? This removes it from the website.')) return;
        var before = S.news.data; S.news.data = before.filter(function (x) { return x !== n; });
        busy(b, true, 'Deleting…');
        saveJSON('news', 'content/news.json', 'Delete news: ' + n.title).then(vNews).catch(function () { S.news.data = before; vNews(); });
      };
    });
  }
  function vNewsEdit() {
    var n = S.news.data.filter(function (x) { return x.id === PARAM; })[0] || { id: '', title: '', date: today(), summary: '', body: '', image: '', published: true };
    main.innerHTML = '<div class="top"><h1>' + (n.id ? 'Edit article' : 'New article') + '</h1><button class="btn" id="back">← All news</button></div>' +
      '<form class="box" id="artForm">' +
      '<label class="f">Title<input class="in" id="aTitle" required value="' + esc(n.title) + '"></label>' +
      '<div class="two"><label class="f">Date<input class="in" id="aDate" type="date" required value="' + esc(n.date) + '"></label>' +
      '<label class="f">Status<select class="in" id="aPub"><option value="1"' + (n.published !== false ? ' selected' : '') + '>Published — visible on the website</option><option value="0"' + (n.published === false ? ' selected' : '') + '>Draft — hidden</option></select></label></div>' +
      '<label class="f">Short summary<small>Shown on the news cards (1–2 sentences).</small><textarea class="in" id="aSum" style="min-height:80px">' + esc(n.summary) + '</textarea></label>' +
      imageField('aImg', n.image, 'Cover image', 1600) +
      '<div class="f" style="display:flex;flex-direction:column;gap:8px"><span style="font-size:14px;color:var(--text-2);font-weight:500">Article text</span>' +
      '<div class="tools"><button type="button" data-w="**|**">Bold</button><button type="button" data-w="*|*">Italic</button><button type="button" data-l="## ">Heading</button><button type="button" data-l="- ">List item</button><button type="button" id="tLink">Link</button></div>' +
      '<textarea class="in" id="aBody" style="min-height:260px">' + esc(n.body) + '</textarea>' +
      '<small class="muted">Leave an empty line between paragraphs.</small></div>' +
      '<div class="f" style="display:flex;flex-direction:column;gap:8px"><span style="font-size:14px;color:var(--text-2);font-weight:500">Preview</span><div class="preview" id="aPrev"></div></div>' +
      '<div class="row"><button class="btn-3d" id="aSave" type="submit">Save article</button><button class="btn" type="button" id="cancel">Cancel</button></div></form>';
    wireImageField('aImg');
    var ta = $('aBody');
    function prev() { $('aPrev').innerHTML = window.SociallyRich ? window.SociallyRich(ta.value) : esc(ta.value); }
    ta.addEventListener('input', prev); prev();
    function wrap(a, b) { var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value, sel = v.slice(s, e) || 'text'; ta.value = v.slice(0, s) + a + sel + b + v.slice(e); ta.focus(); ta.setSelectionRange(s + a.length, s + a.length + sel.length); prev(); }
    main.querySelectorAll('[data-w]').forEach(function (b) { b.onclick = function () { var p = b.dataset.w.split('|'); wrap(p[0], p[1]); }; });
    main.querySelectorAll('[data-l]').forEach(function (b) { b.onclick = function () { var s = ta.selectionStart, v = ta.value, ls = v.lastIndexOf('\n', s - 1) + 1; ta.value = v.slice(0, ls) + b.dataset.l + v.slice(ls); ta.focus(); prev(); }; });
    $('tLink').onclick = function () { var u = prompt('Link address (e.g. https://… or contact.html)'); if (u) wrap('[', '](' + u + ')'); };
    $('back').onclick = $('cancel').onclick = function () { go('news'); };
    $('artForm').onsubmit = function (e) {
      e.preventDefault();
      var title = $('aTitle').value.trim(); if (!title) return;
      var item = { id: n.id || (slug(title) + '-' + Date.now().toString(36).slice(-4)), title: title, date: $('aDate').value || today(),
        summary: $('aSum').value.trim(), body: ta.value, image: $('aImg').value, published: $('aPub').value === '1' };
      var before = S.news.data;
      S.news.data = n.id ? before.map(function (x) { return x.id === n.id ? item : x; }) : [item].concat(before);
      busy($('aSave'), true);
      saveJSON('news', 'content/news.json', (n.id ? 'Update' : 'Add') + ' news: ' + title).then(function () { go('news'); })
        .catch(function () { S.news.data = before; busy($('aSave'), false); });
    };
  }

  // ----- customers -----
  var COLORS = ['linear-gradient(145deg, #34E1C4, #1BA892)', 'linear-gradient(145deg, #FFB547, #C98A2B)', 'linear-gradient(145deg, #6EA8FF, #2F5FB3)',
    'linear-gradient(145deg, #FF7A9A, #B8405C)', 'linear-gradient(145deg, #B794FF, #6B4BC2)', 'linear-gradient(145deg, #34E1C4 0%, #34E1C4 50%, #FFB547 50%, #FFB547 100%)'];
  function initials(name) { return String(name).split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); }
  function vCustomers() {
    var list = S.customers.data;
    main.innerHTML = '<div class="top"><h1>Customers</h1><button class="btn-3d" id="newCust">+ Add customer</button></div>' +
      '<p class="muted" style="margin:0">Shown on the home page and the Customers page, in this order.</p>' +
      (list.length ? list.map(function (c, i) {
        var mark = c.logo ? '<div class="thumb" style="width:56px;height:56px;background-color:#fff;background-size:contain;background-image:url(\'' + esc(siteUrl(c.logo)) + '\')"></div>'
          : '<div class="thumb" style="width:56px;height:56px;display:flex;align-items:center;justify-content:center;font:700 18px \'Space Grotesk\',sans-serif;color:#04120F;background:' + esc(c.color || COLORS[0]) + '">' + esc(c.initials || initials(c.name)) + '</div>';
        return '<div class="item">' + mark + '<div class="t"><b>' + esc(c.name) + '</b><span class="muted small">' + esc(c.label || 'Customer') + ' · <span class="pill ' + (c.visible === false ? 'off">Hidden' : 'on">Visible') + '</span></span></div>' +
          '<button class="btn" data-up="' + i + '" aria-label="Move up"' + (i ? '' : ' disabled') + '>↑</button><button class="btn" data-down="' + i + '" aria-label="Move down"' + (i < list.length - 1 ? '' : ' disabled') + '>↓</button>' +
          '<button class="btn" data-edit="' + i + '">Edit</button><button class="btn danger" data-del="' + i + '">Delete</button></div>';
      }).join('') : '<div class="box muted">No customers yet.</div>');
    $('newCust').onclick = function () { go('custEdit', -1); };
    function move(i, d) {
      var before = list.slice(), a = list.slice(); var t = a[i]; a[i] = a[i + d]; a[i + d] = t; S.customers.data = a; vCustomers();
      saveJSON('customers', 'content/customers.json', 'Reorder customers').catch(function () { S.customers.data = before; vCustomers(); });
    }
    main.querySelectorAll('[data-up]').forEach(function (b) { b.onclick = function () { move(+b.dataset.up, -1); }; });
    main.querySelectorAll('[data-down]').forEach(function (b) { b.onclick = function () { move(+b.dataset.down, 1); }; });
    main.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { go('custEdit', +b.dataset.edit); }; });
    main.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.del, c = list[i]; if (!confirm('Remove “' + c.name + '” from the website?')) return;
        var before = list.slice(); S.customers.data = list.filter(function (_, k) { return k !== i; }); busy(b, true, 'Removing…');
        saveJSON('customers', 'content/customers.json', 'Remove customer: ' + c.name).then(vCustomers).catch(function () { S.customers.data = before; vCustomers(); });
      };
    });
  }
  function vCustEdit() {
    var i = PARAM, c = i >= 0 ? S.customers.data[i] : { name: '', label: 'Customer', initials: '', color: COLORS[0], logo: '', url: '', visible: true };
    var color = c.color || COLORS[0];
    main.innerHTML = '<div class="top"><h1>' + (i >= 0 ? 'Edit customer' : 'Add customer') + '</h1><button class="btn" id="back">← All customers</button></div>' +
      '<form class="box" id="cForm"><div class="two"><label class="f">Business name<input class="in" id="cName" required value="' + esc(c.name) + '"></label>' +
      '<label class="f">Label<small>e.g. Restaurant, Hotel, Retail</small><input class="in" id="cLabel" value="' + esc(c.label || 'Customer') + '"></label></div>' +
      imageField('cLogo', c.logo, 'Logo (optional — PNG with transparent background works best)', 600) +
      '<div class="f" style="display:flex;flex-direction:column;gap:8px"><span style="font-size:14px;color:var(--text-2);font-weight:500">Without a logo: initials and colour</span>' +
      '<div class="row"><input class="in" id="cInit" maxlength="3" style="width:110px" value="' + esc(c.initials || initials(c.name)) + '" aria-label="Initials">' +
      '<div class="swatches" role="group" aria-label="Colour">' + COLORS.map(function (g, k) { return '<button type="button" class="sw" data-c="' + k + '" aria-pressed="' + (g === color) + '" aria-label="Colour ' + (k + 1) + '" style="background:' + g + '"></button>'; }).join('') + '</div></div></div>' +
      '<div class="two"><label class="f">Website (optional)<input class="in" id="cUrl" placeholder="https://…" value="' + esc(c.url || '') + '"></label>' +
      '<label class="f">Show on website<select class="in" id="cVis"><option value="1"' + (c.visible !== false ? ' selected' : '') + '>Visible</option><option value="0"' + (c.visible === false ? ' selected' : '') + '>Hidden</option></select></label></div>' +
      '<div class="row"><button class="btn-3d" id="cSave" type="submit">Save customer</button><button class="btn" type="button" id="cancel">Cancel</button></div></form>';
    wireImageField('cLogo');
    $('cName').addEventListener('input', function () { if (!c.initials) $('cInit').value = initials(this.value); });
    main.querySelectorAll('.sw').forEach(function (b) { b.onclick = function () { color = COLORS[+b.dataset.c]; main.querySelectorAll('.sw').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }; });
    $('back').onclick = $('cancel').onclick = function () { go('customers'); };
    $('cForm').onsubmit = function (e) {
      e.preventDefault();
      var url = $('cUrl').value.trim(); if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
      var item = { name: $('cName').value.trim(), label: $('cLabel').value.trim() || 'Customer', initials: $('cInit').value.trim().toUpperCase() || initials($('cName').value),
        color: color, logo: $('cLogo').value, url: url, visible: $('cVis').value === '1' };
      if (!item.name) return;
      var before = S.customers.data.slice();
      S.customers.data = i >= 0 ? before.map(function (x, k) { return k === i ? item : x; }) : before.concat([item]);
      busy($('cSave'), true);
      saveJSON('customers', 'content/customers.json', (i >= 0 ? 'Update' : 'Add') + ' customer: ' + item.name).then(function () { go('customers'); })
        .catch(function () { S.customers.data = before; busy($('cSave'), false); });
    };
  }

  // ----- site text -----
  var FIELDS = [
    ['Home page — top section', [['hero.badge', 'Small badge above the headline'], ['hero.titleStart', 'Headline — first part'], ['hero.titleHighlight', 'Headline — highlighted words (teal)'], ['hero.titleEnd', 'Headline — last part'], ['hero.text', 'Paragraph under the headline', true]]],
    ['Contact details (used across the whole site)', [['contact.phone', 'Phone number'], ['contact.email', 'Email address shown on the site'], ['contact.locations', 'Locations']]],
    ['Customers section', [['customers.intro', 'Text next to the Customers heading']]],
    ['News section', [['news.title', 'Heading of the news section on the home page']]]];
  function getP(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function setP(o, p, v) { var ks = p.split('.'), last = ks.pop(); ks.forEach(function (k) { o = o[k] = o[k] || {}; }); o[last] = v; }
  function vSite() {
    var d = S.site.data;
    main.innerHTML = '<div class="top"><h1>Site text &amp; contact</h1><a class="btn" href="../index.html" target="_blank" rel="noopener">View website ↗</a></div>' +
      '<form id="sForm" style="display:flex;flex-direction:column;gap:20px">' + FIELDS.map(function (g) {
        return '<div class="box"><h2 style="margin:0;font-size:20px">' + g[0] + '</h2>' + g[1].map(function (f) {
          var v = getP(d, f[0]) || '';
          return '<label class="f">' + f[1] + (f[2] ? '<textarea class="in" data-k="' + f[0] + '">' + esc(v) + '</textarea>' : '<input class="in" data-k="' + f[0] + '" value="' + esc(v) + '">') + '</label>';
        }).join('') + '</div>';
      }).join('') +
      '<p class="muted small" style="margin:0">Note: contact-form messages are still delivered to the inbox set in the website code (FormSubmit). Changing the email here changes what visitors see.</p>' +
      '<div class="row"><button class="btn-3d" id="sSave" type="submit">Save changes</button></div></form>';
    $('sForm').onsubmit = function (e) {
      e.preventDefault();
      var before = JSON.parse(JSON.stringify(d));
      main.querySelectorAll('[data-k]').forEach(function (el) { setP(d, el.dataset.k, el.value); });
      busy($('sSave'), true);
      saveJSON('site', 'content/site.json', 'Update site text').then(function () { busy($('sSave'), false); }).catch(function () { S.site.data = before; busy($('sSave'), false); });
    };
  }

  // ----- media -----
  function vMedia() {
    main.innerHTML = '<div class="top"><h1>Images</h1><label class="btn-3d" style="position:relative;overflow:hidden">Upload image<input type="file" accept="image/*" id="mFile" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label></div>' +
      '<p class="muted" style="margin:0">Images used in news and customer logos. Large photos are resized automatically.</p><div id="mList" class="grid"><span class="spin"></span></div>';
    $('mFile').onchange = function (e) {
      var f = e.target.files[0]; if (!f) return; toast('Uploading…');
      uploadImage(f, 1600).then(function () { toast('Uploaded.'); vMedia(); }).catch(function (err) { toast('Upload failed: ' + errText(err), true); });
    };
    gh('/contents/assets/uploads?ref=' + encodeURIComponent(CFG.branch), { allow404: true }).then(function (list) {
      list = (list || []).filter(function (f) { return f.type === 'file' && /\.(png|jpe?g|gif|webp|svg)$/i.test(f.name); }).reverse();
      $('mList').innerHTML = list.length ? list.map(function (f) {
        return '<div class="media"><div class="img" style="background-image:url(\'' + esc(siteUrl(f.path)) + '\')"></div><span class="small" style="word-break:break-all">' + esc(f.name) + '</span>' +
          '<div class="row"><button class="btn" data-copy="' + esc(f.path) + '">Copy path</button><button class="btn danger" data-del="' + esc(f.path) + '" data-sha="' + f.sha + '">Delete</button></div></div>';
      }).join('') : '<div class="box muted">No images uploaded yet.</div>';
      main.querySelectorAll('[data-copy]').forEach(function (b) { b.onclick = function () { try { navigator.clipboard.writeText(b.dataset.copy); toast('Copied: ' + b.dataset.copy); } catch (e) { prompt('Image path', b.dataset.copy); } }; });
      main.querySelectorAll('[data-del]').forEach(function (b) {
        b.onclick = function () {
          var used = JSON.stringify(S.news.data).indexOf(b.dataset.del) >= 0 || JSON.stringify(S.customers.data).indexOf(b.dataset.del) >= 0;
          if (!confirm((used ? 'This image is used in an article or customer. ' : '') + 'Delete it permanently? This can’t be undone.')) return;
          busy(b, true, 'Deleting…');
          gh('/contents/' + encPath(b.dataset.del), { method: 'DELETE', body: JSON.stringify({ message: 'Delete image ' + b.dataset.del, sha: b.dataset.sha, branch: CFG.branch }) })
            .then(function () { toast('Deleted.'); vMedia(); }).catch(function (err) { toast('Could not delete: ' + errText(err), true); busy(b, false); });
        };
      });
    }).catch(function (err) { $('mList').innerHTML = '<div class="err">' + esc(errText(err)) + '</div>'; });
  }

  // ----- settings -----
  function vSettings() {
    main.innerHTML = '<div class="top"><h1>Settings</h1></div>' +
      '<form class="box" id="pForm"><h2 style="margin:0;font-size:20px">Change username or password</h2>' +
      '<label class="f">Current password<input class="in" type="password" id="pOld" autocomplete="current-password" required></label>' +
      '<label class="f">Username<input class="in" id="pUser" autocomplete="username" required value="' + esc(USER || '') + '"></label>' +
      '<div class="two"><label class="f">New password<input class="in" type="password" id="pNew" autocomplete="new-password" required minlength="10"></label>' +
      '<label class="f">Repeat new password<input class="in" type="password" id="pNew2" autocomplete="new-password" required></label></div>' +
      '<div class="row"><button class="btn-3d" id="pSave" type="submit">Update login</button></div></form>' +
      '<form class="box" id="kForm"><h2 style="margin:0;font-size:20px">Replace GitHub key</h2><p class="muted small" style="margin:0">Use this when the key expires (GitHub keys last up to a year).</p>' +
      '<label class="f">Your admin password<input class="in" type="password" id="kPass" autocomplete="current-password" required></label>' +
      '<label class="f">New GitHub access key<input class="in" type="password" id="kTok" autocomplete="off" required placeholder="github_pat_…"></label>' +
      '<div class="row"><button class="btn-3d" id="kSave" type="submit">Replace key</button></div></form>';
    // checks the current password by unlocking the stored lock with it
    function verify(pass) {
      return readFile(AUTH_PATH).then(function (f) {
        if (!f) throw new Error('The admin lock file is missing.');
        return unseal(USER, pass, JSON.parse(dec.decode(unb64(f.content)))).then(function () { return f.sha; }, function () { throw new Error('Your current password is not correct.'); });
      });
    }
    function relock(user, pass, cfg, sha, msg) {
      return seal(user, pass, cfg).then(function (box) { return putFile(AUTH_PATH, b64(enc.encode(JSON.stringify(box, null, 2) + '\n')), msg, sha, cfg); })
        .then(function () { CFG = cfg; USER = user; persist(); toast('Updated. Use these details next time you sign in.'); });
    }
    $('pForm').onsubmit = function (e) {
      e.preventDefault();
      if ($('pNew').value !== $('pNew2').value) return toast('The new passwords don’t match.', true);
      busy($('pSave'), true);
      verify($('pOld').value).then(function (sha) { return relock($('pUser').value.trim(), $('pNew').value, CFG, sha, 'Update admin login'); })
        .then(function () { e.target.reset(); $('pUser').value = USER; }).catch(function (err) { toast(err.status ? errText(err) : err.message, true); })
        .then(function () { busy($('pSave'), false); });
    };
    $('kForm').onsubmit = function (e) {
      e.preventDefault();
      var pass = $('kPass').value, cfg = { token: $('kTok').value.trim(), owner: CFG.owner, repo: CFG.repo, branch: CFG.branch };
      busy($('kSave'), true);
      verify(pass).then(function (sha) { return gh('', {}, cfg).then(function () { return relock(USER, pass, cfg, sha, 'Replace admin GitHub key'); }); })
        .then(function () { e.target.reset(); }).catch(function (err) { toast(err.status ? errText(err) : err.message, true); })
        .then(function () { busy($('kSave'), false); });
    };
  }

  // ---------- session ----------
  function persist() { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ cfg: CFG, user: USER })); } catch (e) {} }
  function loadAll() {
    return Promise.all([readJSON('content/site.json', {}), readJSON('content/news.json', []), readJSON('content/customers.json', [])])
      .then(function (r) { S.site = r[0]; S.news = r[1]; S.customers = r[2]; show('vApp'); go('dash'); });
  }
  function enter(cfg, user) {
    CFG = cfg; USER = user;
    return gh('').then(function (repo) { CFG.branch = CFG.branch || repo.default_branch; persist(); return loadAll(); });
  }
  $('logoutBtn').onclick = function () { try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {} CFG = USER = null; location.reload(); };
  $('themeBtn').onclick = function () { var r = document.documentElement, t = r.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; r.setAttribute('data-theme', t); try { localStorage.setItem('sme-theme', t); } catch (e) {} };

  // login
  var AUTH = null;
  $('loginForm').onsubmit = function (e) {
    e.preventDefault();
    var btn = $('loginBtn'), err = $('loginErr'); err.classList.add('hide'); busy(btn, true, 'Signing in…');
    unseal($('lUser').value, $('lPass').value, AUTH)
      .then(function (cfg) { $('lPass').value = ''; return enter(cfg, $('lUser').value.trim()); })
      .catch(function (ex) {
        busy(btn, false);
        err.textContent = ex && ex.status ? errText(ex) : 'Wrong username or password.';
        err.classList.remove('hide');
      });
  };

  // first-time setup
  function guessRepo() {
    var host = location.hostname, seg = location.pathname.split('/').filter(Boolean);
    var owner = /\.github\.io$/i.test(host) ? host.split('.')[0] : '';
    var repo = seg.length && seg[0] !== 'SociallyAdmin' ? seg[0] : (owner ? owner + '.github.io' : '');
    $('sOwner').value = owner; $('sRepo').value = repo;
  }
  $('setupForm').onsubmit = function (e) {
    e.preventDefault();
    var err = $('setupErr'); err.classList.add('hide');
    function fail(m) { err.textContent = m; err.classList.remove('hide'); busy($('setupBtn'), false); }
    if ($('sPass').value !== $('sPass2').value) return fail('The passwords don’t match.');
    if ($('sPass').value.length < 10) return fail('Use a password of at least 10 characters.');
    var cfg = { token: $('sToken').value.trim(), owner: $('sOwner').value.trim(), repo: $('sRepo').value.trim(), branch: '' };
    var user = $('sUser').value.trim(), pass = $('sPass').value;
    busy($('setupBtn'), true, 'Checking the key…');
    gh('', {}, cfg).then(function (repo) {
      cfg.branch = repo.default_branch;
      if (repo.permissions && repo.permissions.push === false) { var x = new Error(); x.status = 403; throw x; }
      $('setupBtn').innerHTML = '<span class="spin"></span> Locking the key…';
      return seal(user, pass, cfg);
    }).then(function (box) {
      CFG = cfg;
      return readFile(AUTH_PATH).then(function (f) {
        if (f) throw new Error('Admin access already exists for this site. Sign in instead, or delete content/admin-auth.json in GitHub to start over.');
        return putFile(AUTH_PATH, b64(enc.encode(JSON.stringify(box, null, 2) + '\n')), 'Set up Socially Admin', null, cfg);
      });
    }).then(function () { $('sToken').value = $('sPass').value = $('sPass2').value = ''; return enter(cfg, user); })
      .then(function () { toast('Admin access created. Next time, sign in with your username and password.'); })
      .catch(function (ex) { CFG = null; fail(ex.status ? errText(ex) : (ex.message || 'Setup failed.')); });
  };

  // ---------- start ----------
  (function start() {
    var saved = null; try { saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) {}
    if (saved && saved.cfg) return enter(saved.cfg, saved.user).catch(function () { try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {} location.reload(); });
    fetch('../' + AUTH_PATH + '?v=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      .then(function (box) {
        if (box && box.data) { AUTH = box; show('vLogin'); $('lUser').focus(); }
        else { guessRepo(); show('vSetup'); }
      });
  })();
})();
