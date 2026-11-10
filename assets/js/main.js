/* Socially Middle East — site interactions */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Light / dark mode
  var root = document.documentElement;
  document.querySelectorAll('.theme-toggle').forEach(function (b) {
    function label() {
      var t = root.getAttribute('data-theme');
      b.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
    label();
    b.addEventListener('click', function () {
      var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', t);
      try { localStorage.setItem('sme-theme', t); } catch (e) {}
      label();
    });
  });

  // Hero cube: auto-spins, and can be dragged with the mouse or a finger
  var stage = document.getElementById('cube-stage');
  var cube = document.getElementById('hero-cube');
  var C = { rx: -22, ry: -30, vx: 0, vy: 0, drag: false, x: 0, y: 0 };
  if (stage && cube) {
    var auto = reduce ? 0 : 0.3;
    C.vy = auto;
    (function loop() {
      if (!C.drag) {
        C.vx *= 0.94;
        C.vy = C.vy * 0.96 + auto * 0.04;
        C.rx += C.vx; C.ry += C.vy;
      }
      cube.style.transform = 'rotateX(' + C.rx.toFixed(2) + 'deg) rotateY(' + C.ry.toFixed(2) + 'deg)';
      requestAnimationFrame(loop);
    })();
    stage.addEventListener('pointerdown', function (e) {
      C.drag = true; C.x = e.clientX; C.y = e.clientY; C.vx = 0; C.vy = 0;
      stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
      stage.style.cursor = 'grabbing';
    });
    stage.addEventListener('pointermove', function (e) {
      if (!C.drag) return;
      var dx = e.clientX - C.x, dy = e.clientY - C.y;
      C.x = e.clientX; C.y = e.clientY;
      C.ry += dx * 0.5; C.rx -= dy * 0.5;
      C.vy = dx * 0.5; C.vx = -dy * 0.5;
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      stage.addEventListener(ev, function () { C.drag = false; stage.style.cursor = 'grab'; });
    });
  }

  // Hero: 3D scene leans toward the mouse
  var hero = document.getElementById('top');
  var scene = document.getElementById('hero-scene');
  if (hero && scene && !reduce) {
    hero.addEventListener('mousemove', function (e) {
      if (C.drag) return;
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      scene.style.transform = 'rotateX(' + (-y * 14).toFixed(1) + 'deg) rotateY(' + (x * 18).toFixed(1) + 'deg)';
    });
    hero.addEventListener('mouseleave', function () { scene.style.transform = 'rotateX(0deg) rotateY(0deg)'; });
  }

  // Home: hardware tabs morph the 3D device
  var HW = {
  "pos": {
    "label": "POS terminals",
    "w": 240,
    "h": 165,
    "d": 26,
    "front": "screen",
    "blurb": "Touchscreen terminals for counters, tables and kitchens — ready to run your POS from day one.",
    "items": [
      "All-in-one touchscreen terminals",
      "Customer-facing displays",
      "Kitchen display screens"
    ],
    "href": "hardware-pos-terminals.html"
  },
  "pc": {
    "label": "PCs & tablets",
    "w": 260,
    "h": 170,
    "d": 12,
    "front": "screen",
    "blurb": "Desktops, laptops and tablets for the office, the floor and order-taking on the move.",
    "items": [
      "Office desktops and laptops",
      "Tablets for waiters and sales staff",
      "Monitors and accessories"
    ],
    "href": "hardware-pcs-tablets.html"
  },
  "print": {
    "label": "Printers",
    "w": 160,
    "h": 125,
    "d": 170,
    "front": "printer",
    "blurb": "Receipt, kitchen and label printers that work directly with your POS and ERP.",
    "items": [
      "Thermal receipt printers",
      "Kitchen order printers",
      "Barcode and label printers"
    ],
    "href": "hardware-printers.html"
  },
  "drawer": {
    "label": "Drawers & scanners",
    "w": 250,
    "h": 72,
    "d": 220,
    "front": "drawer",
    "blurb": "The checkout essentials around every terminal.",
    "items": [
      "Cash drawers",
      "Barcode scanners",
      "Card payment terminal integration"
    ],
    "href": "hardware-drawers-scanners.html"
  },
  "server": {
    "label": "Servers & storage",
    "w": 190,
    "h": 260,
    "d": 210,
    "front": "server",
    "blurb": "On-site servers, storage and backup to keep your data safe and your systems running.",
    "items": [
      "Servers for ERP and POS back-office",
      "Network storage (NAS) and backup",
      "Networking and UPS"
    ],
    "href": "hardware-servers-storage.html"
  }
};
  var tabs = document.querySelectorAll('.tab[data-hw]');
  var cub = document.getElementById('hw-cuboid');
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function paintTabs(id) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-hw') === id;
      t.setAttribute('aria-pressed', on ? 'true' : 'false');
      t.style.background = on ? '#34E1C4' : 'var(--surface)';
      t.style.color = on ? '#04120F' : 'var(--text-2)';
      t.style.border = on ? '1px solid #34E1C4' : '1px solid var(--line-3)';
      t.style.boxShadow = on ? '0 8px 24px rgba(52,225,196,0.3)' : 'none';
    });
  }
  function select(id) {
    var c = HW[id]; if (!c || !cub) return;
    paintTabs(id);
    cub.style.setProperty('--w', c.w + 'px');
    cub.style.setProperty('--h', c.h + 'px');
    cub.style.setProperty('--d', c.d + 'px');
    cub.setAttribute('data-front', c.front);
    document.getElementById('hw-label').textContent = c.label;
    document.getElementById('hw-label-small').textContent = c.label;
    document.getElementById('hw-blurb').textContent = c.blurb;
    document.getElementById('hw-link').setAttribute('href', c.href);
    document.getElementById('hw-items').innerHTML = c.items.map(function (i) {
      return '<li style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:14px;border:1px solid var(--line);background:var(--glass)"><span aria-hidden="true" style="width:10px;height:10px;transform:rotate(45deg);background:#34E1C4;flex-shrink:0"></span><span>' + esc(i) + '</span></li>';
    }).join('');
  }
  if (tabs.length) {
    tabs.forEach(function (t) { t.addEventListener('click', function () { select(t.getAttribute('data-hw')); }); });
    paintTabs(tabs[0].getAttribute('data-hw'));
  }

  // Contact form: sent by FormSubmit to the inbox in the form's action
  var form = document.getElementById('contact-form');
  if (form && window.fetch) {
    var status = document.getElementById('form-status');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      status.style.color = '#8FF3E2';
      status.textContent = 'Sending…';
      fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
        method: 'POST', headers: { 'Accept': 'application/json' }, body: new FormData(form)
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || String(res.j.success) === 'false') throw new Error(res.j.message || 'Failed');
          status.textContent = 'Thanks — your request was sent. We’ll be in touch soon.';
          form.reset();
        })
        .catch(function () {
          status.style.color = '#FFB547';
          status.textContent = 'Sorry, that didn’t go through. Please email info@sociallymiddleeast.com or call +961 70 234 138.';
        })
        .then(function () { btn.disabled = false; });
    });
  }
})();
