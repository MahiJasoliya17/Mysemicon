(function () {
  const SVG_FAVICON_URL = "/assets/favicon.svg?v=svg_tab_m1";
  const SVG_DATA_URI = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMTAgNSAxMzUgMTE1IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMTcuNTkwMSA4OC4zODY3VjIxLjkyMTZDMTcuNTkwMSAxMy44NjUyIDIxLjYwNSA5LjgzNzA2IDI5LjYzNDggOS44MzcwNkgzNi42NjA4QzQwLjAwNjYgOS44MzcwNiA0My4wMTc4IDExLjUxNTUgNDUuNjk0NCAxNC44NzIzTDc3LjgxMzYgNDguMTA0OUwxMDkuOTMzIDE0Ljg3MjNDMTEyLjYwOSAxMS41MTU1IDExNS42MjEgOS44MzcwNiAxMTguOTY2IDkuODM3MDZIMTI1Ljk5MkMxMzQuMDIyIDkuODM3MDYgMTM4LjAzNyAxMy44NjUyIDEzOC4wMzcgMjEuOTIxNlYxMTQuNTdIMTE1Ljk1NVY0MC4wNDg1TDc3LjgxMzYgNzguMzE2M0wzOS42NzIgNDAuMDQ4NVY4OC4zODY3SDE3LjU5MDFaTTIxLjYwNSA4NC4zNTg2VjIxLjkyMTZDMjEuNjA1IDE2LjU1MDcgMjQuMjgxNiAxMy44NjUyIDI5LjYzNDggMTMuODY1MkgzNi42NjA4QzM4LjY2ODMgMTMuODY1MiA0MC42NzU3IDE1LjIwOCA0Mi42ODMyIDE3Ljg5MzRMNzcuODEzNiA1NC4xNDcxTDExMi45NDQgMTcuODkzNEMxMTQuOTUxIDE1LjIwOCAxMTYuOTU5IDEzLjg2NTIgMTE4Ljk2NiAxMy44NjUySDEyNS45OTJDMTMxLjM0NiAxMy44NjUyIDEzNC4wMjIgMTYuNTUwNyAxMzQuMDIyIDIxLjkyMTZWMTEwLjU0MkgxMTkuOTdWMjkuOTc4TDc3LjgxMzYgNzIuMjc0TDM1LjY1NzEgMjkuOTc4Vjg0LjM1ODZIMjEuNjA1WiIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPHBhdGggZD0iTTIxLjQ2OTMgOTYuMjAzN0gzNi4wMDJDMzguNjY4NyA5Ni4yMDM3IDQwLjAwMiA5Ny41MzcgNDAuMDAyIDEwMC4yMDRWMTEwLjU0MkM0MC4wMDIgMTEzLjIwOCAzOC42Njg3IDExNC41NDIgMzYuMDAyIDExNC41NDJIMjEuNDY5M0MxOC44MDI2IDExNC41NDIgMTcuNDY5MyAxMTMuMjA4IDE3LjQ2OTMgMTEwLjU0MlYxMDAuMjA0QzE3LjQ2OTMgOTcuNTM3IDE4LjgwMjYgOTYuMjAzNyAyMS40NjkzIDk2LjIwMzdaTTIyLjQ2OTMgMTAwLjIwNEgzNS4wMDJDMzUuNjY4NyAxMDAuMjA0IDM2LjAwMiAxMDAuNTM3IDM2LjAwMiAxMDEuMjA0VjEwOS41NDJDMzYuMDAyIDExMC4yMDggMzUuNjY4NyAxMTAuNTQyIDM1LjAwMiAxMTAuNTQySDIyLjQ2OTNDMjEuODAyNiAxMTAuNTQyIDIxLjQ2OTMgMTEwLjIwOCAyMS40NjkzIDEwOS41NDJWMTAxLjIwNEMyMS40NjkzIDEwMC41MzcgMjEuODAyNiAxMDAuMjA0IDIyLjQ2OTMgMTAwLjIwNFoiIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPg==";
  function enforceFavicon() {
    let svgLink = document.querySelector("link[type='image/svg+xml']");
    if (!svgLink) {
      svgLink = document.createElement("link");
      svgLink.rel = "icon";
      svgLink.type = "image/svg+xml";
      document.head.prepend(svgLink);
    }
    svgLink.href = SVG_FAVICON_URL;

    const shortcut = document.querySelector("link[rel='shortcut icon']");
    if (shortcut) {
      shortcut.href = SVG_FAVICON_URL;
      shortcut.type = "image/svg+xml";
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforceFavicon);
  } else {
    enforceFavicon();
  }
})();

(function () {
  const WHITE_M_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADUElEQVR4nO1WzWtTQRCffUnakoOmzWcj6IuICN56DrRNG9MvKS2K6Rf0Ej35HwjiwYt48uAHHkREsAe9lYqHeAg9CT2JCKIEjwYVI0ilSVZ+z53XzUte29dU8NDf5e3Ozs78ZnZ29hEd4n/B0NBQSDajmM/nj/t8PhJCeLbHexYWFkyH3Xfw1aQ8ODjodG4jHo8b0AGRvTru6uqyxlLK2252s9ls2N7EQt1QMpn0sTwWi+2ZBOtIKZ9g7+LiYsqpo8xeciVgGJY/gmNeC4VCYicSiDwQCLC9O9gzPz9vYs5y3V+hUDizYwYYiUTCJoFxOxJw7vf72dZD6M7OziYx7+npabGpzJ1vIaCl78bc3NwJNh6NRm0SkUjEIsEOHc4fKbXHmAeDQUuOTMCmFwL3Mc9kMr0cMRyzXn9/v01C22NFDoAwOx8dHe1T4rueMiAVhoeHe7ku9EwwCaW/oh8T20EAWuHf9EJgRYmslOZyuQiTQDGyvmmafj3ycDgsuIAnJydjshm3vBB4wUUppfyMMXoFHwd6g8N4U+RaX3k6MzOTVOPrnjNgqGiklJ8wHx8fj/KedDp9hPchK9z5xsbGIkpc0gpwfwRIFRoKinXggPfBOBoWO0d3U2pv+IYsLS2d7IhAd3e3JdMLcGJiws4EQ4v8lX7/tbegLQGDdkG9XrfOvVKpNEzTtFra6urql+np6QTrTE1NxdfW1ipYEkKcQ9YajQbtGXKXIwB4bWBgIKhfUa0WrMj59eT223EG9EyAzMbGxq90On0UsmKx+K1UKv0goud65C5dvS0MfQLWinnz66FQq9Ws9fX19erIyEifEr8WQlxA5Fj34ryFwObmJm1tbWFYdtuAdVzPYrH4PZVKBYQQGcw9nbkGvz6RUqKQfhPRsZ02wRkiLpfLNZ7vF371/UBEP4noLG4QEX0konuKlGtNIHKse017CwEhxGm3NMKRGzqJvKkGpJRv6/W6s70/0K/hv4Khvki9E5fRZjnVBwA/6sb5N2Vo42d4UdSrcg2CYDCI9ksHhK8IRjvSvz81tI18Lpe7qjrgFQiq1WodfDohYT+TRBez2az1p4xJoVB4bytJKV86C8DZir2CW/Hy8vKpdrbxSu47qkPQAeIP1h6C8mkbMLAAAAAASUVORK5CYII=";
  function enforceFavicon() {
    const links = document.querySelectorAll("link[rel*='icon']");
    links.forEach((l) => { l.href = WHITE_M_URI; });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforceFavicon);
  } else {
    enforceFavicon();
  }
})();

/* MySemicon storefront - core: config, helpers, stores, router, header/footer chrome. */
(function () {
  'use strict';
  const MS = (window.MS = { routes: [], views: {}, S: {} });

  MS.SITE = {
    name: 'MySemicon',
    phone: '1800 266 6123',           // store contact details; edit them in the admin panel (Store settings)
    phone2: '020 68197600',
    email: 'support@mysemicon.com',
    hours: '9:15 AM to 6:15 PM',
    address: 'Magazine Chowk, Swaraj Colony, Shri Ganesh Colony, Dighi, Pune, Maharashtra 411015',
    freeShip: 499,
  };

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  MS.$ = $; MS.$$ = $$;
  MS.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const esc = MS.esc;
  MS.money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: Number(n) % 1 ? 2 : 0 });
  MS.num = (n) => Number(n || 0).toLocaleString('en-IN');
  MS.PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#f0edf2"/><path d="M36 78l16-20 12 14 8-9 14 15z" fill="#cbc5cf"/><circle cx="46" cy="44" r="8" fill="#cbc5cf"/></svg>');
  MS.img = (src, alt = '', cls = '', extra = '') => `<img ${cls ? `class="${cls}" ` : ''}src="${esc(src || MS.PLACEHOLDER)}" alt="${esc(alt)}" loading="lazy" decoding="async" ${extra}>`;
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && !t.dataset.fb) { t.dataset.fb = 1; t.src = MS.PLACEHOLDER; }
  }, true);

  MS.SV_ICONS = {
    ind3d: `<svg viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="22" y="16" width="56" height="68" rx="6" />
      <line x1="22" y1="36" x2="78" y2="36" />
      <line x1="50" y1="20" x2="50" y2="32" />
      <rect x="36" y="44" width="28" height="28" rx="2" stroke-dasharray="2 3" />
      <circle cx="50" cy="58" r="7" />
      <circle cx="50" cy="76" r="2.5" fill="#fff" />
    </svg>`,
    fdm: `<svg viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="18" y="24" width="64" height="52" rx="4" />
      <line x1="28" y1="24" x2="28" y2="76" />
      <line x1="72" y1="24" x2="72" y2="76" />
      <line x1="28" y1="46" x2="72" y2="46" />
      <rect x="44" y="42" width="12" height="10" rx="1" />
      <polygon points="50,52 46,58 54,58" />
      <polygon points="50,62 38,74 62,74" />
      <rect x="22" y="76" width="56" height="8" rx="2" />
      <circle cx="68" cy="80" r="1.8" fill="#fff" />
    </svg>`,
    metalLaser: `<svg viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="22" y1="22" x2="78" y2="22" />
      <path d="M34 22 L34 32 L44 46 L44 54 L48 60 L52 60 L56 54 L56 46 L66 32 L66 22" />
      <line x1="38" y1="28" x2="62" y2="28" />
      <line x1="50" y1="60" x2="50" y2="72" stroke-width="3" />
      <path d="M50 72 L32 86 L50 82 L68 86 Z" fill="none" />
      <path d="M42 66 L36 68 M58 66 L64 68 M40 76 L32 78 M60 76 L68 78" />
    </svg>`,
    battery: `<svg viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 24 L48 24 L40 46 L54 46 L50 56" />
      <circle cx="48" cy="24" r="3.5" />
      <circle cx="40" cy="46" r="3.5" />
      <circle cx="50" cy="56" r="2.5" fill="#fff" />
      <rect x="24" y="58" width="28" height="26" rx="3" />
      <rect x="34" y="54" width="8" height="4" rx="1" />
      <path d="M38 64 L34 72 L42 72 L38 80" stroke-width="2" />
      <rect x="58" y="58" width="28" height="26" rx="3" />
      <rect x="68" y="54" width="8" height="4" rx="1" />
      <path d="M72 64 L68 72 L76 72 L72 80" stroke-width="2" />
      <circle cx="28" cy="90" r="3" /><circle cx="39" cy="90" r="3" /><circle cx="50" cy="90" r="3" /><circle cx="61" cy="90" r="3" /><circle cx="72" cy="90" r="3" />
    </svg>`,
    nonmetal: `<svg viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="42" y="24" width="16" height="34" rx="2" />
      <polygon points="50,58 44,66 56,66" />
      <line x1="50" y1="66" x2="50" y2="76" stroke-width="3" />
      <polygon points="50,76 34,84 66,84" />
      <line x1="24" y1="84" x2="76" y2="84" />
    </svg>`,
    pcb: `<svg viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="18" y="20" width="64" height="60" rx="4" />
      <rect x="38" y="40" width="24" height="20" rx="2" stroke-width="2" />
      <line x1="38" y1="45" x2="32" y2="45" /><line x1="38" y1="50" x2="30" y2="50" /><line x1="38" y1="55" x2="32" y2="55" />
      <line x1="62" y1="45" x2="68" y2="45" /><line x1="62" y1="50" x2="70" y2="50" /><line x1="62" y1="55" x2="68" y2="55" />
      <path d="M26 30 H44 V36" /><circle cx="26" cy="30" r="2" fill="#fff" />
      <path d="M74 30 H56 V36" /><circle cx="74" cy="30" r="2" fill="#fff" />
      <path d="M30 68 V72 H46" /><circle cx="30" cy="68" r="2" fill="#fff" />
      <path d="M70 68 V72 H54" /><circle cx="70" cy="68" r="2" fill="#fff" />
      <line x1="24" y1="80" x2="24" y2="76" /><line x1="28" y1="80" x2="28" y2="76" /><line x1="32" y1="80" x2="32" y2="76" />
      <line x1="68" y1="80" x2="68" y2="76" /><line x1="72" y1="80" x2="72" y2="76" /><line x1="76" y1="80" x2="76" y2="76" />
    </svg>`
  };

  MS.SIX_SERVICES = [
    { title: 'MySemicon Industrial Print Services', slug: 'industrial-3d-printing', iconKey: 'ind3d' },
    { title: 'MySemicon Online FDM 3D Printing Service', slug: '3d-printing-service1', iconKey: 'fdm' },
    { title: 'MySemicon Metal Laser Cutting', slug: 'metal-laser-cutting', iconKey: 'metalLaser' },
    { title: 'MySemicon Customized Lithium ion Battery Pack', slug: 'custom-battery-pack', iconKey: 'battery' },
    { title: 'MySemicon Non-Metal Laser Cutting Service', slug: 'online-laser-cutting-service', iconKey: 'nonmetal' },
    { title: 'MySemicon PCB Manufacturing Service', slug: 'online-pcb-manufacturing-service', iconKey: 'pcb' }
  ];

  MS.renderServiceCards = () => MS.SIX_SERVICES.map((s) => `
    <div class="srv-card">
      <div class="srv-card-info">
        <h3>${esc(s.title)}</h3>
        <a class="btnx srv-order-btn" href="/product/${s.slug}/">Order Now</a>
      </div>
      <div class="srv-card-iconbox">${MS.SV_ICONS[s.iconKey]}</div>
    </div>
  `).join('');

  MS.clean = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html || '';
    t.content.querySelectorAll('script,style,object,embed,form,link,meta').forEach((n) => n.remove());
    t.content.querySelectorAll('*').forEach((el) => {
      [...el.attributes].forEach((a) => {
        if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name);
        if (a.name === 'style' && /expression|url\(/i.test(a.value)) el.removeAttribute('style');
      });
      if (el.tagName === 'A' && el.getAttribute('target') === '_blank') el.setAttribute('rel', 'noopener noreferrer');
    });
    t.content.querySelectorAll('img').forEach((i) => { i.loading = 'lazy'; });
    return t.innerHTML;
  };

  MS.api = async (path, opts = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    const tok = MS.token();
    if (tok) headers.Authorization = 'Bearer ' + tok;
    const r = await fetch('/api' + path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    let data = null;
    try { data = await r.json(); } catch (e) { /* empty */ }
    if (!r.ok) { const err = new Error((data && data.detail) || 'Request failed'); err.status = r.status; throw err; }
    return data;
  };

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  MS.store = store;
  MS.token = () => store.get('ms_token', '');

  let toastT;
  MS.toast = (msg, link) => {
    const t = $('#toast');
    t.innerHTML = esc(msg) + (link ? `<a href="${link.href}">${esc(link.label)}</a>` : '');
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), 3200);
  };

  /* ---------- cart / wishlist / compare ---------- */
  const snap = (p) => ({ id: p.id, name: p.name, slug: p.slug, image: p.image, price: p.price, regular: p.regular, in_stock: p.in_stock, brand: p.brand, sku: p.sku });
  MS.cart = {
    items: () => store.get('ms_cart', []),
    save(items) { store.set('ms_cart', items); MS.updateCounts(); },
    add(p, qty = 1) {
      const items = MS.cart.items();
      const l = items.find((i) => i.id === p.id);
      if (l) l.qty += qty; else items.push({ ...snap(p), qty });
      MS.cart.save(items);
    },
    setQty(id, qty) {
      const items = MS.cart.items().map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i));
      MS.cart.save(items);
    },
    remove(id) { MS.cart.save(MS.cart.items().filter((i) => i.id !== id)); },
    clear() { MS.cart.save([]); },
    count: () => MS.cart.items().reduce((a, i) => a + i.qty, 0),
  };
  const listStore = (key) => ({
    items: () => store.get(key, []),
    has: (id) => store.get(key, []).some((i) => i.id === id),
    toggle(p) {
      let items = store.get(key, []);
      const had = items.some((i) => i.id === p.id);
      items = had ? items.filter((i) => i.id !== p.id) : [...items, snap(p)];
      store.set(key, items);
      MS.updateCounts();
      return !had;
    },
    remove(id) { store.set(key, store.get(key, []).filter((i) => i.id !== id)); MS.updateCounts(); },
  });
  MS.wish = listStore('ms_wish');
  MS.compare = listStore('ms_compare');
  MS.updateCounts = () => {
    $('#cart-count').textContent = MS.cart.count();
    const cc = MS.compare.items().length, ce = $('#cmp-count');
    if (ce) { ce.hidden = !cc; ce.textContent = cc; }
    const w = MS.wish.items().length;
    const wc = $('#wish-count');
    wc.hidden = !w; wc.textContent = w;
  };

  /* ---------- router ---------- */
  MS.route = (re, fn) => MS.routes.push([re, fn]);
  MS.cleanups = [];
  MS.onLeave = (fn) => MS.cleanups.push(fn);
  MS.q = () => new URLSearchParams(location.search);
  MS.go = (url, replace) => {
    if (replace) history.replaceState({}, '', url); else history.pushState({}, '', url);
    MS.render();
  };
  MS.setTitle = (t, desc) => {
    document.title = t ? `${t} | ${MS.SITE.name}` : `${MS.SITE.name} | Online Electronics Components & Robotics Store in India`;
    if (desc) { const m = $('meta[name=description]'); if (m) m.content = desc; }
  };
  MS.notFound = (msg) => {
    MS.setTitle('Page not found');
    $('#view').innerHTML = `<div class="wrap pg"><div class="ms-empty"><p class="kick">404</p><h2>${esc(msg || 'This page does not exist')}</h2><p>The link may be old, or the item may no longer be listed.</p><a class="btnx" href="/shop/">Browse the shop</a></div></div>`;
  };
  MS.render = async () => {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    MS.cleanups.splice(0).forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
    closeMega();
    /* the "MySemicon Services" category is the same as the Services page: never show the duplicate listing */
    if (/^\/(?:product-category\/(?:[^/]+\/)*robu-services|(?:shop|categories|shop-by-category)\/robu-services)\/?$/.test(decodeURI(location.pathname))) history.replaceState({}, '', '/services/');
    const path = decodeURI(location.pathname).replace(/\/+$/, '') || '/';
    const view = $('#view');
    markNav(path);
    for (const [re, fn] of MS.routes) {
      const m = path.match(re);
      if (m) {
        view.innerHTML = '<div class="wrap pg"><div class="sk" style="height:320px"></div></div>';
        try { await fn(m, view); } catch (e) {
          if (e.status === 404) MS.notFound(); else view.innerHTML = `<div class="wrap pg"><div class="ms-empty"><h2>Something went wrong</h2><p>${esc(e.message)}</p><a class="btnx" href="/">Back home</a></div></div>`;
          console.error(e);
        }
        window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
        return;
      }
    }
    // fallback: single-segment slug may be a blog post
    if (/^\/[^/]+$/.test(path)) { try { await MS.views.post(path.slice(1), view); return; } catch (e) { /* fall through */ } }
    MS.notFound();
  };
  function markNav(path) {
    const map = { '/': 'home', '/shop': 'shop', '/services': 'services', '/forum': 'forum', '/businesstobusiness': 'bulk', '/bulk-enquiry': 'bulk', '/latest-products': 'new', '/new-arrivals': 'new', '/atal': 'kit', '/kit-enquiry': 'kit', '/category/blogs': 'blogs', '/category/tutorials': 'blogs', '/videos': 'blogs', '/bom-tool': 'bom', '/careers': 'careers', '/seller-form': 'sell' };
    $$('.nav2 a[data-nav]').forEach((a) => a.removeAttribute('aria-current'));
    const key = map[path] || (path.startsWith('/product-category') || path.startsWith('/product/') || path.startsWith('/brand/') ? 'shop' : (path.startsWith('/services') || path.startsWith('/service') ? 'services' : (path.startsWith('/careers') || path.startsWith('/career') || path.startsWith('/opening') ? 'careers' : (path.startsWith('/seller-form') || path.startsWith('/sell-on') ? 'sell' : null))));
    if (key) { const a = $(`.nav2 a[data-nav=${key}]`); if (a) a.setAttribute('aria-current', 'page'); }
  }
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    let href = a.getAttribute('href');
    if (href && /^\/product-category\/(?:[^/]+\/)*robu-services\/?$/.test(href)) href = '/services/';
    if (!href || href[0] !== '/' || href.startsWith('//') || href.startsWith('/media/') || href.startsWith('/assets/')) return;
    e.preventDefault();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (href === location.pathname + location.search) { window.scrollTo({ top: 0 }); return; }
    MS.go(href);
  });
  window.addEventListener('popstate', () => MS.render());

  /* ---------- header: mega menu, search ---------- */
  const DEPT_ICONS = {
    'microcontroller-development-board': '<svg viewBox="0 0 24 24" class="m-ico"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>',
    'drone-parts': '<svg viewBox="0 0 24 24" class="m-ico"><circle cx="12" cy="12" r="3"/><path d="M12 9V3M12 15v6M9 12H3M15 12h6M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
    'batteries': '<svg viewBox="0 0 24 24" class="m-ico"><rect x="2" y="6" width="18" height="12" rx="2"/><path d="M22 10v4M6 10v4M10 10v4M14 10v4"/></svg>',
    '3d-printer-parts': '<svg viewBox="0 0 24 24" class="m-ico"><path d="M6 18h12M6 14h12M6 10h12M3 21h18a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1zM12 3v5"/></svg>',
    'sensor-modules': '<svg viewBox="0 0 24 24" class="m-ico"><path d="M2 12h3l3-8 4 16 3-8h7"/><circle cx="12" cy="12" r="2"/></svg>',
    'electronic-components': '<svg viewBox="0 0 24 24" class="m-ico"><rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="7" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="17" cy="12" r="1.5"/></svg>',
    'dc-motors': '<svg viewBox="0 0 24 24" class="m-ico"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/><circle cx="12" cy="12" r="2"/></svg>',
    'electronic-modules': '<svg viewBox="0 0 24 24" class="m-ico"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    'iot-and-wireless': '<svg viewBox="0 0 24 24" class="m-ico"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>',
    'mechanical-parts-and-tools': '<svg viewBox="0 0 24 24" class="m-ico"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    'learning-and-robotic-kits': '<svg viewBox="0 0 24 24" class="m-ico"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="8" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/><path d="M12 7v4M9 3h6M9 7h6"/></svg>',
    'ebike-parts': '<svg viewBox="0 0 24 24" class="m-ico"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M9 17h6M12 17V8l4-4M16 4h4"/></svg>',
    'best-prices': '<svg viewBox="0 0 24 24" class="m-ico"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    'smartelex': '<svg viewBox="0 0 24 24" class="m-ico"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    'simplifly-drone-parts': '<svg viewBox="0 0 24 24" class="m-ico"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
    'refurbished-and-partial-working': '<svg viewBox="0 0 24 24" class="m-ico"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>',
    'robu-services': '<svg viewBox="0 0 24 24" class="m-ico"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
  };

  let megaData = null, megaOpen = false;
  async function loadMenu() { if (!megaData) megaData = await MS.api('/menu'); return megaData; }
  
  function closeMega() {
    megaOpen = false;
    const m = $('#mega'); if (m) m.hidden = true;
    const s = $('#scrim'); if (s) s.hidden = true;
    const b = $('#allcat'); if (b) b.setAttribute('aria-expanded', 'false');
  }

  async function openMega() {
    const data = await loadMenu();
    megaOpen = true;
    $('#sg').hidden = true;
    $('#mega').hidden = false;
    const scrim = $('#scrim'); if (scrim) scrim.hidden = false;
    $('#allcat').setAttribute('aria-expanded', 'true');
    const inner = $('#mega-in');
    
    if (!inner.dataset.ready) {
      inner.dataset.ready = 1;
      inner.innerHTML = `
        <div class="mega-roots" id="mega-roots">
          ${data.map((c, i) => `
            <button type="button" data-i="${i}" class="${i ? '' : 'on'}">
              <span class="m-root-l">
                <span class="m-root-ico">${DEPT_ICONS[c.slug] || '<svg viewBox="0 0 24 24" class="m-ico"><circle cx="12" cy="12" r="8"/></svg>'}</span>
                <span class="m-root-name">${esc(c.name)}</span>
              </span>
              <span class="m-root-r">
                <small>${MS.num(c.total)}</small>
                <svg class="m-arr" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
              </span>
            </button>
          `).join('')}
        </div>
        <div class="mega-pane" id="mega-pane"></div>
      `;

      const pane = (i) => {
        const c = data[i];
        if (!c) return;
        const icon = DEPT_ICONS[c.slug] || '<svg viewBox="0 0 24 24" class="m-ico"><circle cx="12" cy="12" r="8"/></svg>';

        let contentHtml = '';
        if (c.slug === 'robu-services') {
          contentHtml = `
            <div class="mega-svc-grid">
              <a class="mega-svc-card" href="/product/online-pcb-manufacturing-service/">
                <div class="msc-ico">PCB</div>
                <div class="msc-txt">
                  <h4>PCB Manufacturing Service</h4>
                  <p>Instant Gerber quote, 1-6 layers, FR4, Aluminum, pan-India delivery.</p>
                  <span class="msc-btn">Configure PCB &rsaquo;</span>
                </div>
              </a>
              <a class="mega-svc-card" href="/product/3d-printing-service1/">
                <div class="msc-ico">3DP</div>
                <div class="msc-txt">
                  <h4>3D Printing Service</h4>
                  <p>FDM, SLA Resin, SLS Nylon & Metal SLM engineering prototyping.</p>
                  <span class="msc-btn">Upload 3D Model &rsaquo;</span>
                </div>
              </a>
              <a class="mega-svc-card" href="/product/online-laser-cutting-service/">
                <div class="msc-ico">LSR</div>
                <div class="msc-txt">
                  <h4>Laser Cutting Service</h4>
                  <p>Precision Acrylic, MDF, Wood & Sheet Metal fabrication.</p>
                  <span class="msc-btn">Order Laser Cut &rsaquo;</span>
                </div>
              </a>
              <a class="mega-svc-card" href="/product/custom-battery-pack/">
                <div class="msc-ico">BAT</div>
                <div class="msc-txt">
                  <h4>Custom Battery Pack Service</h4>
                  <p>12V, 24V, 48V Li-ion & LiFePO4 packs with smart BMS assembly.</p>
                  <span class="msc-btn">Build Battery Pack &rsaquo;</span>
                </div>
              </a>
            </div>
          `;
        } else {
          contentHtml = `
            <div class="mega-cols">
              ${c.children.map((k) => `
                <div class="mega-col">
                  <a class="mega-col-title" href="/product-category/${k.slug}/">
                    <span class="m-dot"></span>${esc(k.name)}
                  </a>
                  ${k.children && k.children.length ? `
                    <ul>
                      ${k.children.slice(0, 8).map((g) => `
                        <li><a href="/product-category/${g.slug}/">${esc(g.name)}</a></li>
                      `).join('')}
                      ${k.children.length > 8 ? `
                        <li><a class="mega-more" href="/product-category/${k.slug}/">+ View all ${k.children.length}</a></li>
                      ` : ''}
                    </ul>
                  ` : ''}
                </div>
              `).join('') || '<p style="color:var(--mute);padding:18px 0">Browse all parts in this category.</p>'}
            </div>
          `;
        }

        $('#mega-pane').innerHTML = `
          <div class="mega-pane-head">
            <div class="mega-pane-info">
              <span class="mega-pane-ico">${icon}</span>
              <div>
                <h3>${esc(c.name)}</h3>
                <span class="mega-pane-badge">${MS.num(c.total)} Products Available</span>
              </div>
            </div>
            <a class="mega-shop-all" href="/product-category/${c.slug}/">
              Shop All ${esc(c.name)} <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
          ${contentHtml}
        `;
      };

      pane(0);
      $$('#mega-roots button').forEach((b) => b.addEventListener('mouseenter', () => {
        $$('#mega-roots button').forEach((x) => x.classList.toggle('on', x === b));
        pane(+b.dataset.i);
      }));
      $$('#mega-roots button').forEach((b) => b.addEventListener('click', () => {
        $$('#mega-roots button').forEach((x) => x.classList.toggle('on', x === b));
        pane(+b.dataset.i);
      }));
    }
  }

  function initChrome() {
    $('#ann-phone').textContent = MS.SITE.phone;
    $('#ann-phone').href = 'tel:' + MS.SITE.phone.replace(/[^\d+]/g, '');
    $('#allcat').addEventListener('click', (e) => { e.stopPropagation(); megaOpen ? closeMega() : openMega(); });
    
    const scrim = $('#scrim');
    if (scrim) scrim.addEventListener('click', closeMega);

    document.addEventListener('click', (e) => {
      if (megaOpen && !e.target.closest('#mega') && !e.target.closest('#allcat')) closeMega();
      if (!e.target.closest('#search-form')) { $('#sg').hidden = true; }
      const dd = $('#s-dd'); if (dd && dd.open && !e.target.closest('#s-dd')) dd.open = false;
      if (e.target.closest('#mega a')) closeMega();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeMega(); $('#sg').hidden = true; }
    });

    // search with category dropdown + live suggestions
    let selCat = '';
    const menu = $('#s-menu') || document.createElement('div');
    const fillSelect = () => {
      const cats = (MS.S.home && MS.S.home.categories) || [];
      menu.innerHTML = `<a href="#" data-c="" aria-current="true">All categories</a>` + cats.map((c) => `<a href="#" data-c="${c.slug}">${esc(c.name)}</a>`).join('');
    };
    menu.addEventListener('click', (e) => {
      const a = e.target.closest('a'); if (!a) return;
      e.preventDefault();
      selCat = a.dataset.c;
      $$('#s-menu a').forEach((x) => x.toggleAttribute('aria-current', x === a));
      $('#hq').focus();
    });
    MS.fillSearchSelect = fillSelect;

    const sg = $('#sg'); let t, idx = -1;
    const form = $('#search-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = $('#hq').value.trim();
      sg.hidden = true;
      if (!q && !selCat) return;
      MS.go((selCat ? `/product-category/${selCat}/` : '/shop/') + (q ? '?search=' + encodeURIComponent(q) : ''));
    });

    $('#hq').addEventListener('input', () => {
      clearTimeout(t);
      const q = $('#hq').value.trim();
      if (q.length < 2) { sg.hidden = true; return; }
      t = setTimeout(async () => {
        try {
          const r = await MS.api('/suggest?q=' + encodeURIComponent(q));
          idx = -1;

          let catsHtml = '';
          if (r.categories && r.categories.length) {
            catsHtml = `
              <div class="sg-sec">
                <div class="sg-head">Matching Categories</div>
                <div class="sg-cats">
                  ${r.categories.map((c) => `
                    <a href="/product-category/${c.slug}/">
                      <svg viewBox="0 0 24 24" width="14" height="14" class="sg-ico"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                      <span class="t">${esc(c.name)}</span>
                      <span class="pill">${MS.num(c.total)} items</span>
                    </a>
                  `).join('')}
                </div>
              </div>
            `;
          }

          let brandsHtml = '';
          if (r.brands && r.brands.length) {
            brandsHtml = `
              <div class="sg-sec">
                <div class="sg-head">Brands</div>
                <div class="sg-brands">
                  ${r.brands.map((b) => `
                    <a href="/brand/${b.slug}/">
                      <span class="sg-brand-tag">Brand</span>
                      <span class="t">${esc(b.name)}</span>
                      <span class="pill">${MS.num(b.total)} parts</span>
                    </a>
                  `).join('')}
                </div>
              </div>
            `;
          }

          let prodsHtml = '';
          if (r.products && r.products.length) {
            prodsHtml = `
              <div class="sg-sec">
                <div class="sg-head">Products</div>
                <div class="sg-prods">
                  ${r.products.map((p) => `
                    <a class="sg-p-card" href="/product/${p.slug}/">
                      ${MS.img(p.image, '', 'sg-im')}
                      <div class="sg-p-info">
                        <span class="t">${esc(p.name)}</span>
                        <div class="sg-p-meta">
                          <span class="p">${MS.money(p.price)}</span>
                          ${p.in_stock ? '<span class="sg-stk in">In Stock</span>' : '<span class="sg-stk out">Out of stock</span>'}
                        </div>
                      </div>
                    </a>
                  `).join('')}
                </div>
              </div>
            `;
          }

          if (catsHtml || brandsHtml || prodsHtml) {
            sg.innerHTML = `
              ${catsHtml}
              ${brandsHtml}
              ${prodsHtml}
              <div class="sg-foot">
                <a class="sg-all-link" href="/shop/?search=${encodeURIComponent(q)}">
                  See all results for <b>"${esc(q)}"</b> &rarr;
                </a>
              </div>
            `;
            sg.hidden = false;
          } else {
            sg.innerHTML = `<div class="none" style="padding:16px 20px;color:var(--mute);font-size:13.5px">No matching results for "${esc(q)}". Try searching generic keywords like <i>resistor</i>, <i>arduino</i>, or <i>sensor</i>.</div>`;
            sg.hidden = false;
          }
        } catch (e) { sg.hidden = true; }
      }, 180);
    });

    $('#hq').addEventListener('keydown', (e) => {
      const items = $$('#sg a');
      if (sg.hidden || !items.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((a, i) => a.classList.toggle('on', i === idx));
      } else if (e.key === 'Enter' && idx >= 0) {
        e.preventDefault();
        items[idx].click();
        sg.hidden = true;
      }
    });
        // Ensure dropdown closes immediately on mouse leave and on click
    $$('.dd').forEach((dd) => {
      dd.addEventListener('mouseleave', () => {
        if (document.activeElement && dd.contains(document.activeElement)) {
          document.activeElement.blur();
        }
      });
      dd.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => {
          a.blur();
          if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        });
      });
    });
    MS.refreshAccount();
    MS.updateCounts();
    renderFooter();
  }
  MS.refreshAccount = async () => {
    const link = $('#acct-link'), label = $('#acct-label');
    if (!MS.token()) { link.href = '/login/'; label.textContent = 'Account'; return; }
    try {
      const u = await MS.api('/auth/me');
      MS.S.user = u; link.href = '/my-account/'; label.textContent = (u.name || u.email).split(' ')[0].slice(0, 10);
    } catch (e) { if (e.status === 401) { store.del('ms_token'); link.href = '/login/'; label.textContent = 'Account'; } }
  };

  const fixUrl = (u) => {
    if (/forum\.robu\.in/.test(u)) return '/forum/';
    if (/support\.robu\.in.*Knowledgebase/i.test(u)) return '/faq/';
    if (/^https?:/.test(u)) return u;
    if (!u || u === '#') return '#';
    return u.replace(/\/?$/, '/');
  };
  function renderFooter() {
    const S = MS.SITE, site = MS.S.site || {};
    const fm = (site.menus && site.menus['Footer Menu']) || [
      { title: 'Information', children_recursive: [{ title: 'Track Your Order', url: '/order-tracking' }, { title: 'Videos', url: '/videos' }, { title: 'FAQ', url: '/faq' }, { title: 'Careers', url: '/careers' }] },
      { title: 'My Account', children_recursive: [{ title: 'Cart', url: '/cart' }, { title: 'Checkout', url: '/checkout' }, { title: 'My Account', url: '/my-account' }, { title: 'Payment Options', url: '/payment-options' }] },
      { title: 'Services', children_recursive: [{ title: 'About Us', url: '/about-us' }, { title: 'Contact Us', url: '/contact' }, { title: 'MySemicon B2B', url: '/businesstobusiness' }] },
      { title: 'Policies', children_recursive: [{ title: 'Investor Relations', url: '/investor-relations' }, { title: 'Macfos Csr', url: '/macfos-limited-csr' }, { title: 'Privacy Policy', url: '/privacy-policy' }, { title: 'Terms of Service', url: '/terms-of-service' }, { title: 'Shipping & Refund', url: '/refund-policy' }, { title: 'E-Waste Collection', url: '/e-waste-collection-points' }] }];
    const brand = (t) => String(t).replace(/\bRobu\b/gi, 'MySemicon');
    const pays = (site.pay_images || []).map((u) => `<img src="${esc(u)}" alt="" loading="lazy">`).join('');
    const tel = (n) => 'tel:' + n.replace(/[^\d+]/g, '');
    $('#footer').innerHTML = `<div class="wrap"><div class="ft-news">
      <div class="ft-news-t"><h3>Subscribe to our Newsletter</h3><p>to get promotional offers &amp; discounts</p></div>
      <form class="ft-news-f" id="ft-news-form" novalidate>
        <input name="name" type="text" placeholder="First Name" aria-label="First name" autocomplete="given-name">
        <input name="email" type="email" placeholder="Email Id" aria-label="Email address" autocomplete="email" required>
        <button type="submit">Subscribe</button>
      </form></div>
    <div class="fcols">
      <div class="ft-brand"><a class="ft-logo" href="/" aria-label="MySemicon home"><img class="logo logo-light" src="/assets/logo.svg" alt="MySemicon" width="190" height="38"></a>
        <p class="ft-tag">Parts, modules and tools for makers, students and engineers. GST invoice on every order.</p>
        <div class="gotq"><b>Got Questions?</b><span>Call us between ${esc(S.hours)}</span><span>All days, except public holidays</span><span><a href="${tel(S.phone)}">${esc(S.phone)}</a> · <a href="${tel(S.phone2)}">${esc(S.phone2)}</a></span></div></div>
      ${fm.map((col) => `<div><h4>${esc(brand(col.title))}</h4><ul>${(col.children_recursive || []).map((l) => `<li><a href="${esc(fixUrl(l.url))}">${esc(brand(l.title))}</a></li>`).join('')}</ul></div>`).join('')}
    </div>
    <div class="legal"><span class="ft-copy">© ${new Date().getFullYear()} MySemicon is a registered trademark of MACFOS LIMITED - All Rights Reserved</span><div class="ft-right"><span class="soc"><a href="#" aria-label="Facebook">f</a><a href="#" aria-label="X">x</a><a href="#" aria-label="LinkedIn">in</a><a href="#" aria-label="Instagram">ig</a><a href="#" aria-label="YouTube">yt</a></span>${pays ? `<div class="pay pay-img" aria-label="Payment methods">${pays}</div>` : '<div class="pay" aria-label="Payment methods"><span>UPI</span><span>VISA</span><span>MASTERCARD</span><span>RUPAY</span><span>AMEX</span><span>NET BANKING</span></div>'}<a class="totop" href="#" onclick="window.scrollTo({top:0,behavior:'smooth'});return false">Back to top ↑</a></div></div></div>`;
    const nf = $('#ft-news-form');
    if (nf) nf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = nf.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { MS.toast('Please enter a valid email address'); nf.email.focus(); return; }
      try {
        await MS.api('/enquiry', { method: 'POST', body: { kind: 'newsletter', name: nf.name.value, email } });
        nf.reset(); MS.toast('Thanks for subscribing!');
      } catch (err) { MS.toast('Could not subscribe, please try again'); }
    });
  }
  MS.renderFooter = renderFooter;

  /* ---------- shared product card ---------- */
  const HEART = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
  const CMP = '<svg viewBox="0 0 24 24"><path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/></svg>';
  const SERVICE_SLUGS = new Set([
    'online-pcb-manufacturing-service',
    'pcb-manufacturing-service',
    'online-laser-cutting-service',
    'metal-laser-cutting',
    '3d-printing-service1',
    'online-fdm-3d-printing-service',
    'industrial-3d-printing',
    'industrial-3d-print-services',
    'custom-battery-pack',
    'customized-battery-pack',
    '3d-printer-assembly-service'
  ]);
  MS.isService = (p) => {
    if (!p) return false;
    if (p.is_service) return true;
    if (p.type === 'service') return true;
    const s = String(p.slug || '').replace(/^\/+|\/+$/g, '');
    if (SERVICE_SLUGS.has(s)) return true;
    const n = String(p.name || '').toLowerCase();
    if (n.includes('manufacturing service') || n.includes('laser cutting') || n.includes('3d print') || n.includes('battery pack service')) return true;
    return false;
  };
  MS.productCard = (p, list) => {
    const isSvc = MS.isService(p);
    const stock = isSvc ? '<span class="pc-stk" style="color:var(--mute,#64748b)">Custom Manufacturing</span>' : (!p.in_stock ? '<span class="pc-stk out">Out of stock</span>' : (p.qty && p.qty <= 5 ? `<span class="pc-stk low">Only ${p.qty} left</span>` : '<span class="pc-stk">In stock</span>'));
    const priceHtml = isSvc
      ? '<div class="pc-price"><b style="color:var(--brand,#e65100)">Custom Quote</b></div>'
      : `<div class="pc-price"><b>${MS.money(p.price)}</b>${p.regular > p.price ? `<s>${MS.money(p.regular)}</s>` : ''}${p.has_tiers ? '<em>Bulk pricing</em>' : ''}</div>`;
    const btnHtml = isSvc
      ? `<a class="add" href="/product/${esc(p.slug)}/" style="display:block;text-align:center;text-decoration:none;line-height:36px;font-weight:600">Configure Service</a>`
      : `<button class="add" type="button" data-act="add" ${p.in_stock ? '' : 'disabled'}>${p.in_stock ? 'Add to cart' : 'Out of stock'}</button>`;

    return `<article class="pc${p.in_stock || isSvc ? '' : ' oos'}${list ? ' list' : ''}" data-id="${p.id}">
      <a class="pc-im" href="/product/${p.slug}/" aria-label="${esc(p.name)}">${p.discount && !isSvc ? `<span class="pc-tag">-${p.discount}%</span>` : ''}${p.in_stock || isSvc ? '' : '<span class="pc-oos">Sold out</span>'}${MS.img(p.image, p.name)}</a>
      <div class="pc-act"><button type="button" class="${MS.wish.has(p.id) ? 'on' : ''}" data-act="wish" aria-label="Add to wishlist">${HEART}</button><button type="button" class="${MS.compare.has(p.id) ? 'on' : ''}" data-act="cmp" aria-label="Add to compare">${CMP}</button></div>
      <div class="pc-body"><div><h3><a href="/product/${p.slug}/">${esc(p.name)}</a></h3></div>
      ${priceHtml}
      ${stock}
      ${btnHtml}</div></article>`;
  };
  // one delegated handler for every product card on the page
  const registry = new Map();
  MS.remember = (items) => items.forEach((p) => registry.set(p.id, p));
  MS.getProduct = (id) => registry.get(id);
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    const holder = b && b.closest('[data-id]');
    if (!b || !holder) return;
    const id = holder.dataset.id;
    const p = registry.get(id);
    if (!p) return;
    if (b.dataset.act === 'add') { MS.cart.add(p, 1); MS.toast('Added to cart', { href: '/cart/', label: 'View cart' }); }
    if (b.dataset.act === 'wish') { const on = MS.wish.toggle(p); b.classList.toggle('on', on); MS.toast(on ? 'Added to wishlist' : 'Removed from wishlist'); }
    if (b.dataset.act === 'cmp') {
      if (!MS.compare.has(id) && MS.compare.items().length >= 4) { MS.toast('You can compare up to 4 products'); return; }
      const on = MS.compare.toggle(p); b.classList.toggle('on', on);
      MS.toast(on ? 'Added to compare' : 'Removed from compare', on ? { href: '/product-comparision/', label: 'Compare now' } : null);
    }
  });
  MS.grid = (items, cls = '') => { MS.remember(items); return `<div class="grid ${cls}">${items.map((p) => MS.productCard(p)).join('')}</div>`; };

  /* ---------- boot ---------- */
    function ensureZeroScrollbars() {
    if (!document.getElementById('ms-zero-scrollbars')) {
      const st = document.createElement('style');
      st.id = 'ms-zero-scrollbars';
      st.textContent = `
        html, body, *, *::before, *::after { scrollbar-width: none !important; -ms-overflow-style: none !important; }
        ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
        ::-webkit-scrollbar-button { display: none !important; width: 0 !important; height: 0 !important; }
        ::-webkit-scrollbar-thumb { display: none !important; }
        ::-webkit-scrollbar-track { display: none !important; }
      `;
      document.head.appendChild(st);
    }
  }

  MS.boot = async () => {
    ensureZeroScrollbars();
    try { Object.assign(MS.SITE, await MS.api('/settings')); } catch (e) { /* keep the built-in defaults */ }
    initChrome();
    try { MS.S.home = await MS.api('/home'); MS.fillSearchSelect(); } catch (e) { console.error(e); }
    try { MS.S.site = await MS.api('/site'); renderFooter(); } catch (e) { console.error(e); }
    MS.render();
  };
})();
