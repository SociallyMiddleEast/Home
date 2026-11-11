# Socially Middle East — Website

Static website (plain HTML, CSS and JavaScript — no build step, no dependencies).

## Pages

- `index.html` — Home
- `demo-pos.html` — Demo — Restaurant POS
- `demo-shop.html` — Demo — Online store
- `pos.html` — POS System
- `erp.html` — ERP
- `web-development.html` — Web Development
- `ecommerce.html` — E-commerce
- `hardware-pos-terminals.html` — POS terminals
- `hardware-pcs-tablets.html` — PCs & tablets
- `hardware-printers.html` — Printers
- `hardware-drawers-scanners.html` — Drawers & scanners
- `hardware-servers-storage.html` — Servers & storage
- `software.html` — Software
- `hardware.html` — Hardware
- `demos.html` — Live demos
- `customers.html` — Our customers
- `contact.html` — Contact us
- `news.html` — News
- `SociallyAdmin/index.html` — Admin (login required)

## Structure

```
index.html                 Home page
pos.html, erp.html, …      Software product pages
hardware-*.html            Hardware category pages
assets/css/styles.css      All animations, 3D effects and button styles
assets/js/main.js          Light/dark mode, draggable hero cube, hardware tabs, contact form
```

## Admin — /SociallyAdmin

Open `SociallyAdmin/` on the live site (e.g. `https://sociallymiddleeast.github.io/Home/SociallyAdmin/`).

- **First visit:** a one-time setup asks for a GitHub fine-grained access key (repository: this repo only;
  permission: *Contents — Read and write*), plus the admin username and password you choose.
- The key is saved in `content/admin-auth.json`, **encrypted** with your username + password
  (PBKDF2-SHA256, 600,000 rounds → AES-256-GCM). The password itself is never stored.
- After that, sign in with the username and password to manage **News**, **Customers**, **Site text & contact**
  and **Images**. Each save is a commit to this repo; GitHub Pages publishes it in about a minute.
- Content lives in `content/site.json`, `content/news.json`, `content/customers.json`; uploads go to `assets/uploads/`.
- Forgot the password? Delete `content/admin-auth.json` in GitHub and run the setup again with a new key.
- When the GitHub key expires, use **Settings → Replace GitHub key** in the admin.

## Light and dark mode

The switch in the header flips the theme and remembers the choice in the browser. First-time visitors get the theme
their device is set to. All colours are CSS variables at the top of `assets/css/styles.css`
(`[data-theme=dark]` and `[data-theme=light]`).

## Customers

The Customers section is in `index.html` (`id="customers"`). Each customer card has a monogram tile — swap it for an
`<img src="assets/img/customer-logo.png" alt="Customer name">` when you have their logo.

## Run locally

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

## Publish on GitHub Pages

1. Push these files to the root of the repository.
2. In the repo: **Settings → Pages → Build and deployment → Deploy from a branch**, choose `main` and `/ (root)`.
3. The site will be live at `https://<account>.github.io/<repo>/`.

## To fill in

- POS licence prices: `[PRICE]` in `pos.html`

## Contact form

The form in `index.html` posts to [FormSubmit](https://formsubmit.co), which emails each enquiry to
`miguelfaraj@outlook.com` (visitors see `info@sociallymiddleeast.com`).

1. After the site is live, submit the form once from the live URL.
2. FormSubmit emails an activation link to miguelfaraj@outlook.com — click it. Enquiries sent before that are delivered after activation.
3. The activation email also contains a random alias. Replace `miguelfaraj@outlook.com` in the form's `action` in `index.html`
   with that alias so the address no longer appears in the page source.
- The `EN | ع` switch is a placeholder for the Arabic version.
