/* MySemicon admin: core (sign-in, routing, helpers, charts, search, notifications) + dashboard, orders, enquiries, customers, reports.
   Other areas: admin-catalog.js (products, inventory, categories, brands) and admin-content.js (content, services, settings, admins, ...). */
(function () {
  'use strict';
  const A = (window.A = { views: {}, token: '', admin: null, counts: {} });
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  A.$ = $; A.$$ = $$;
  try { A.token = localStorage.getItem('ms_admin_token') || ''; } catch (e) { /* storage blocked */ }

  A.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const esc = A.esc;
  A.money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  A.money0 = (n) => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
  A.short = (n) => { n = Number(n || 0); return n >= 1e7 ? '₹' + (n / 1e7).toFixed(1) + 'Cr' : n >= 1e5 ? '₹' + (n / 1e5).toFixed(1) + 'L' : n >= 1e3 ? '₹' + (n / 1e3).toFixed(1) + 'k' : '₹' + Math.round(n); };
  A.num = (n) => Number(n || 0).toLocaleString('en-IN');
  A.debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  A.qs = (o) => Object.entries(o).filter(([, v]) => v !== '' && v != null && v !== false).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
  A.date = (s) => { const d = new Date(String(s).replace(' ', 'T')); return isNaN(d) ? esc(s) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
  A.csv = (name, rows) => { const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'; const b = new Blob([rows.map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); };

  /* ---------- API ---------- */
  A.api = async (path, opts = {}) => {
    const headers = {};
    if (A.token) headers.Authorization = 'Bearer ' + A.token;
    let body;
    if (opts.form) body = opts.form;
    else if (opts.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.body); }
    const r = await fetch('/api/admin' + path, { method: opts.method || 'GET', headers, body });
    if (r.status === 401 && !opts.noAuthRedirect) { A.signOut(true); throw new Error('Please sign in again'); }
    if (opts.blob) { if (!r.ok) throw new Error('Download failed'); return r.blob(); }
    let data = null;
    try { data = await r.json(); } catch (e) { /* empty */ }
    if (!r.ok) throw new Error((data && (typeof data.detail === 'string' ? data.detail : 'Check the form and try again')) || 'Request failed (' + r.status + ')');
    return data;
  };
  A.download = async (path, name) => {
    try { const b = await A.api(path, { blob: true }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
    catch (e) { A.toast(e.message, true); }
  };
  A.openHtml = async (path) => {   // fetches a page that needs the sign-in token (e.g. an invoice) and opens it in a new tab
    try { const b = await A.api(path, { blob: true }); const w = window.open(URL.createObjectURL(b), '_blank'); if (!w) A.toast('Please allow pop-ups to open the invoice', true); } catch (e) { A.toast(e.message, true); }
  };

  /* ---------- UI helpers ---------- */
  let toastT;
  A.toast = (msg, err) => { const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), err ? 5000 : 2600); };
  A.modal = ({ title, body, wide, actions = [] }) => {
    const m = $('#modal');
    m.innerHTML = `<div class="box${wide ? ' wide' : ''}" role="dialog" aria-modal="true"><h3>${esc(title)}</h3><div id="m-body">${body}</div><div class="acts" id="m-acts"></div></div>`;
    m.hidden = false;
    const close = () => { m.hidden = true; m.innerHTML = ''; document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    m.onclick = (e) => { if (e.target === m) close(); };
    actions.forEach((a) => { const b = document.createElement('button'); b.className = 'btn ' + (a.cls || ''); b.textContent = a.label; b.onclick = () => a.onClick(close, b); $('#m-acts').appendChild(b); });
    return close;
  };
  A.confirm = (msg, label = 'Confirm', cls = 'pri') => new Promise((res) => {
    A.modal({ title: 'Are you sure?', body: `<p>${esc(msg)}</p>`, actions: [{ label: 'Cancel', onClick: (c) => { c(); res(false); } }, { label, cls, onClick: (c) => { c(); res(true); } }] });
  });
  A.prompt = (title, label, value = '', type = 'text') => new Promise((res) => {
    A.modal({ title, body: `<div class="fld"><label for="pv">${esc(label)}</label><input id="pv" type="${type}" value="${esc(value)}" style="width:100%"></div>`,
      actions: [{ label: 'Cancel', onClick: (c) => { c(); res(null); } }, { label: 'Save', cls: 'pri', onClick: (c) => { const v = $('#pv').value; c(); res(v); } }] });
    setTimeout(() => $('#pv') && $('#pv').focus(), 30);
  });
  A.pager = (info) => {
    if (!info || info.pages <= 1) return info && info.total ? `<div class="pager"><span>${A.num(info.total)} total</span></div>` : '';
    return `<div class="pager"><span>Page ${info.page} of ${info.pages} · ${A.num(info.total)} total</span>
      <button class="btn sm" data-pg="${info.page - 1}" ${info.page <= 1 ? 'disabled' : ''}>&larr; Prev</button>
      <button class="btn sm" data-pg="${info.page + 1}" ${info.page >= info.pages ? 'disabled' : ''}>Next &rarr;</button></div>`;
  };
  A.bindPager = (root, go) => $$('[data-pg]', root).forEach((b) => b.addEventListener('click', () => go(+b.dataset.pg)));
  const TONE = { Confirmed: 'info', Packed: 'gold', Shipped: 'gold', 'Out for delivery': 'gold', Delivered: 'ok', Cancelled: 'bad', Returned: 'bad', new: 'warn', 'in progress': 'info', quoted: 'gold', closed: 'ok' };
  A.badge = (s) => `<span class="badge ${TONE[s] || ''}">${esc(s)}</span>`;
  A.opts = (list, cur) => list.map((x) => `<option value="${esc(x)}" ${x === cur ? 'selected' : ''}>${esc(x)}</option>`).join('');
  A.busy = async (btn, fn) => { const t = btn.textContent; btn.disabled = true; btn.textContent = 'Working…'; try { return await fn(); } finally { btn.disabled = false; btn.textContent = t; } };
  A.delta = (v) => v == null ? '<span class="delta flat">new</span>' : `<span class="delta ${v > 0 ? 'up' : v < 0 ? 'down' : 'flat'}">${v > 0 ? '▲' : v < 0 ? '▼' : '–'} ${Math.abs(v)}%</span>`;
  A.pill = (tabs, cur, attr = 'data-tab') => `<div class="pills">${tabs.map(([k, l, n]) => `<button class="pill ${k === cur ? 'on' : ''}" ${attr}="${esc(k)}">${esc(l)}${n != null ? ` <b>${A.num(n)}</b>` : ''}</button>`).join('')}</div>`;

  /* ---------- charts (inline SVG, no libraries) ---------- */
  A.areaChart = (box, series, { fmt = A.money, short = A.short } = {}) => {
    const W = Math.max(420, Math.round(box.clientWidth || 800)), H = 250, L = 58, R = 14, T = 14, B = 30;
    box.__redraw = () => A.areaChart(box, series, { fmt, short });
    const max = Math.max(1, ...series.map((s) => s.value));
    const nice = (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); const m = Math.ceil(max / p); return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; })();
    const x = (i) => L + (series.length > 1 ? i * (W - L - R) / (series.length - 1) : 0), y = (v) => T + (H - T - B) * (1 - v / nice);
    const line = series.map((s, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(s.value).toFixed(1)).join(' ');
    const grid = [0, .25, .5, .75, 1].map((f) => `<line x1="${L}" x2="${W - R}" y1="${y(nice * f)}" y2="${y(nice * f)}" stroke="#e9e3e8"/><text x="${L - 8}" y="${y(nice * f) + 4}" text-anchor="end" font-size="11" fill="#7a7083">${esc(short(nice * f))}</text>`).join('');
    const step = Math.ceil(series.length / 8);
    const xl = series.map((s, i) => (i % step === 0) ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#7a7083">${esc(s.label)}</text>` : '').join('');
    box.innerHTML = `<div class="chart"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Chart">
      <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1f38" stop-opacity=".28"/><stop offset="1" stop-color="#2a1f38" stop-opacity="0"/></linearGradient></defs>${grid}${xl}
      <path d="${line} L${x(series.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z" fill="url(#ag)"/><path d="${line}" fill="none" stroke="#2a1f38" stroke-width="2.2" vector-effect="non-scaling-stroke"/>
      ${series.map((s, i) => `<rect data-i="${i}" x="${x(i) - (W - L - R) / series.length / 2}" y="${T}" width="${(W - L - R) / series.length}" height="${H - T - B}" fill="transparent"/>`).join('')}
      <g id="hv" hidden><line id="hl" y1="${T}" y2="${H - B}" stroke="#b68d4c" stroke-dasharray="3 3"/><circle id="hc" r="4.5" fill="#fff" stroke="#2a1f38" stroke-width="2"/></g></svg><div class="tip" id="tip" hidden></div></div>`;
    const svg = $('svg', box), tip = $('#tip', box);
    svg.addEventListener('mousemove', (e) => {
      const r = e.target.closest('rect[data-i]'); if (!r) return; const i = +r.dataset.i, s = series[i];
      $('#hv', box).hidden = false; $('#hl', box).setAttribute('x1', x(i)); $('#hl', box).setAttribute('x2', x(i)); $('#hc', box).setAttribute('cx', x(i)); $('#hc', box).setAttribute('cy', y(s.value));
      tip.hidden = false; tip.innerHTML = `<b>${esc(s.full || s.label)}</b><br>${esc(fmt(s.value))}${s.extra ? '<br>' + esc(s.extra) : ''}`;
      tip.style.left = Math.min(x(i), W - 150) + 'px'; tip.style.top = '4px';
    });
    svg.addEventListener('mouseleave', () => { $('#hv', box).hidden = true; tip.hidden = true; });
  };
  const PALETTE = ['#2a1f38', '#b68d4c', '#3f2830', '#8e7aa3', '#c9b8a1', '#5e4b72'];
  let rzT; window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => $$('.chart').forEach((c) => c.parentElement && c.parentElement.__redraw && c.parentElement.__redraw()), 200); });
  A.donut = (box, parts) => {
    const tot = parts.reduce((s, p) => s + p.value, 0) || 1; let acc = 0; const r = 52, c = 2 * Math.PI * r;
    box.innerHTML = `<div class="donut"><svg viewBox="0 0 140 140" width="140" height="140"><g transform="rotate(-90 70 70)"><circle cx="70" cy="70" r="${r}" fill="none" stroke="#f3efe9" stroke-width="22"/>
      ${parts.map((p, i) => { const len = p.value / tot * c; const s = `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="22" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-acc}"><title>${esc(p.label)}: ${A.num(p.value)}</title></circle>`; acc += len; return s; }).join('')}</g>
      <text x="70" y="68" text-anchor="middle" font-size="20" font-weight="600" fill="#17121c">${A.num(tot)}</text><text x="70" y="86" text-anchor="middle" font-size="10" fill="#7a7083">orders</text></svg>
      <ul class="legend">${parts.map((p, i) => `<li><i style="background:${PALETTE[i % PALETTE.length]}"></i>${esc(p.label)} <b>${Math.round(p.value / tot * 100)}%</b></li>`).join('')}</ul></div>`;
  };
  A.hbars = (box, rows, fmt) => {
    const max = Math.max(1, ...rows.map((r) => r.value));
    box.innerHTML = rows.length ? rows.map((r) => `<div class="hbar"><span class="hl">${esc(r.label)}</span><span class="ht"><i style="width:${Math.max(2, r.value / max * 100)}%"></i></span><span class="hv">${esc(fmt(r.value))}</span></div>`).join('') : '<div class="mute">No data in this period</div>';
  };

  /* ---------- shell ---------- */
  const NAV = [
    ['Overview', [['dashboard', 'Dashboard', 'ANY'], ['reports', 'Reports', 'ANY']]],
    ['Sales', [['orders', 'Orders', 'ANY', 'ord'], ['enquiries', 'Enquiries & quotes', 'ANY', 'enq'], ['customers', 'Customers', 'ANY']]],
    ['Catalogue', [['products', 'Products', 'MGR'], ['inventory', 'Inventory', 'MGR', 'low'], ['categories', 'Categories', 'MGR'], ['brands', 'Brands', 'MGR']]],
    ['Website', [['content', 'Content & pages', 'MGR'], ['services', 'Service options', 'MGR']]],
    ['Administration', [['settings', 'Store settings', 'OWN'], ['admins', 'Admin users', 'OWN'], ['audit', 'Activity log', 'OWN'], ['system', 'System & backups', 'OWN']]],
    ['Account', [['account', 'My account', 'ANY']]],
  ];
  const ALLOW = { ANY: ['owner', 'manager', 'support'], MGR: ['owner', 'manager'], OWN: ['owner'] };
  A.can = (level) => !A.admin || ALLOW[level].includes(A.admin.role);
  A.titles = { dashboard: 'Dashboard', reports: 'Reports', orders: 'Orders', enquiries: 'Enquiries & quotes', customers: 'Customers', products: 'Products', inventory: 'Inventory', categories: 'Categories',
    brands: 'Brands', content: 'Content & pages', services: 'Service options', settings: 'Store settings', admins: 'Admin users', audit: 'Activity log', system: 'System & backups', account: 'My account' };

  function drawShell() {
    $('#side').innerHTML = `<div class="brand">MySemicon <small>Admin</small></div>` + NAV.map(([h, items]) => {
      const vis = items.filter((i) => A.can(i[2]));
      return vis.length ? `<h4>${h}</h4>` + vis.map((i) => `<a href="#/${i[0]}" data-r="${i[0]}">${i[1]}${i[3] ? `<span class="n" id="n-${i[3]}" hidden></span>` : ''}</a>`).join('') : '';
    }).join('') + `<h4>Site</h4><a href="/" target="_blank" rel="noopener">View storefront &nearr;</a>`;
    $('#who').innerHTML = `<div><b>${esc(A.admin.name || A.admin.email)}</b><small>${esc(A.admin.role)}</small></div><button class="btn sm" id="out">Sign out</button>`;
    $('#out').onclick = () => A.signOut();
    $('#menu').onclick = () => $('#side').classList.toggle('open');
    $('#side').onclick = (e) => { if (e.target.closest('a')) $('#side').classList.remove('open'); };
    bindSearch(); bindBell();
  }
  /* ---------- live updates: poll every 20 s, announce new orders / enquiries, refresh the open list ---------- */
  let seen = null;
  const beep = () => { try { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = .08; o.start(); o.stop(c.currentTime + .18); } catch (e) { /* sound is optional */ } };
  let flashT;
  const announce = (msg) => {
    A.toast(msg); beep();
    const base = document.title.replace(/^\(\d+\) /, ''); let n = 0; clearInterval(flashT);
    flashT = setInterval(() => { document.title = n++ % 2 ? base : '● ' + msg; if (n > 10 || !document.hidden) { clearInterval(flashT); document.title = base; } }, 1000);
    if (window.Notification && Notification.permission === 'granted' && document.hidden) { try { new Notification('MySemicon admin', { body: msg }); } catch (e) { /* ignore */ } }
  };
  A.startLive = () => {
    clearInterval(A.liveT);
    if (window.Notification && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) { /* ignore */ } }
    A.liveT = setInterval(async () => {
      if (!A.admin) return;
      await A.refreshCounts();
      const typing = document.activeElement && document.activeElement.matches('input,select,textarea');
      if (!typing && /^#\/?(dashboard|orders|enquiries)?$/.test(location.hash)) route();
    }, 20000);
  };
  A.refreshCounts = async () => {
    try {
      const b = await A.api('/badges');
      if (seen) {
        if (b.orders_new > seen.orders_new) announce(`New order received (${b.orders_new - seen.orders_new})`);
        else if (b.enquiries_new > seen.enquiries_new) announce(`New enquiry received (${b.enquiries_new - seen.enquiries_new})`);
      }
      seen = { orders_new: b.orders_new, enquiries_new: b.enquiries_new };
      A.counts = b;
      [['ord', b.orders_new], ['enq', b.enquiries_new], ['low', b.low_stock]].forEach(([k, n]) => { const el = $('#n-' + k); if (el) { el.textContent = A.num(n); el.hidden = !n; } });
      const total = b.notifications_unread || 0; const bc = $('#bellc'); if (bc) { bc.textContent = total; bc.hidden = !total; }
    } catch (e) { /* ignore */ }
  };
  function bindBell() {
    const m = $('#bellm');
    $('#bell').onclick = async (e) => {
      e.stopPropagation();
      if (!m.hidden) { m.hidden = true; return; }
      const b = A.counts || {};
      let list = { items: [], unread: 0 };
      try { list = await A.api('/notifications'); } catch (x) { /* show the counts anyway */ }
      const ago = (t) => { const s = Math.max(1, Math.round((Date.now() - new Date(String(t).replace(' ', 'T'))) / 60000)); return s < 60 ? s + ' min ago' : s < 1440 ? Math.round(s / 60) + ' h ago' : Math.round(s / 1440) + ' d ago'; };
      const todo = [[b.orders_new, 'new orders to confirm and pack', '#/orders'], [b.orders_to_ship, 'orders packed, ready to ship', '#/orders'], [b.enquiries_new, 'new enquiries and quote requests', '#/enquiries'], [b.low_stock, 'products low on stock', '#/inventory']]
        .filter((r) => r[0] && A.can(r[2] === '#/inventory' ? 'MGR' : 'ANY'));
      m.innerHTML = `<h4>Notifications${list.unread ? ` · ${list.unread} new` : ''}</h4>${list.items.length ? list.items.slice(0, 8).map((n) => `<a href="${esc(n.url.replace(/^\/admin/, '') || '#/')}" class="${n.is_read ? '' : 'unread'}"><b>${esc(n.title)}</b><span>${esc(n.body)}</span><small>${ago(n.created)}</small></a>`).join('') : '<p class="mute" style="margin:6px 10px">Nothing yet. New orders and enquiries will show up here.</p>'}
        ${todo.length ? `<h4>Needs your attention</h4>${todo.map(([n, t, h]) => `<a href="${h}"><b>${A.num(n)}</b> ${t}</a>`).join('')}` : ''}`;
      m.hidden = false;
      if (list.unread) { try { await A.api('/notifications/read', { method: 'POST', body: {} }); A.refreshCounts(); } catch (x) { /* ignore */ } }
    };
    document.addEventListener('click', (e) => { if (!e.target.closest('.bellw')) m.hidden = true; });
    m.onclick = () => { m.hidden = true; };
  }
  function bindSearch() {
    const inp = $('#gs'), box = $('#gsr');
    const run = A.debounce(async () => {
      const q = inp.value.trim(); if (q.length < 2) { box.hidden = true; return; }
      try {
        const r = await A.api('/search?q=' + encodeURIComponent(q));
        const sec = (t, items, href) => items.length ? `<h5>${t}</h5>` + items.map((i) => `<a href="${href(i)}"><b>${esc(i.label)}</b><span>${esc(i.sub)}</span></a>`).join('') : '';
        const html = sec('Orders', r.orders, (i) => '#/orders/' + encodeURIComponent(i.id)) + sec('Customers', r.customers, (i) => '#/customers/' + i.id) + sec('Products', r.products, (i) => '#/products/' + encodeURIComponent(i.id)) + sec('Enquiries', r.enquiries, () => '#/enquiries');
        box.innerHTML = html || '<div class="mute" style="padding:12px">No matches</div>'; box.hidden = false;
      } catch (e) { box.hidden = true; }
    }, 250);
    inp.oninput = run;
    inp.onkeydown = (e) => { if (e.key === 'Escape') { box.hidden = true; inp.blur(); } };
    box.onclick = () => { box.hidden = true; inp.value = ''; };
    document.addEventListener('click', (e) => { if (!e.target.closest('.gs')) box.hidden = true; });
  }

  async function route() {
    if (!A.admin) return;
    const parts = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/');
    const name = A.views[parts[0]] ? parts[0] : 'dashboard';
    const item = NAV.flatMap((s) => s[1]).find((i) => i[0] === name);
    const view = $('#view');
    if (item && !A.can(item[2])) { view.innerHTML = '<div class="empty">Your role does not have access to this area.</div>'; return; }
    $$('#side a[data-r]').forEach((a) => a.classList.toggle('on', a.dataset.r === name));
    $('#title').textContent = A.titles[name] || '';
    document.title = (A.titles[name] || 'Admin') + ' · MySemicon Admin';
    view.innerHTML = '<div class="empty">Loading…</div>';
    try { await A.views[name](parts.slice(1), view); } catch (e) { view.innerHTML = `<div class="empty err">${esc(e.message)}</div>`; }
    window.scrollTo(0, 0);
  }
  A.go = (h) => { if (location.hash === h) route(); else location.hash = h; };

  A.signOut = async (silent) => {
    clearInterval(A.liveT); seen = null;
    if (!silent) { try { await A.api('/logout', { method: 'POST', noAuthRedirect: true }); } catch (e) { /* ignore */ } }
    A.token = ''; A.admin = null;
    try { localStorage.removeItem('ms_admin_token'); } catch (e) { /* ignore */ }
    showLogin(silent ? 'Your session has ended. Please sign in again.' : '');
  };
  function showLogin(msg) {
    $('#app').hidden = true; $('#login').hidden = false;
    $('#login').innerHTML = `<form class="box" id="lf"><div class="logo"><img src="/assets/logo.svg" alt="MySemicon" width="190" height="38"></div><h2>Admin sign in</h2><p>Authorised staff only.</p>
      <div class="fld"><label for="le">Email</label><input id="le" type="email" required autocomplete="username"></div>
      <div class="fld"><label for="lp">Password</label><input id="lp" type="password" required autocomplete="current-password"></div>
      <div class="err" id="lerr">${esc(msg || '')}</div><button class="btn pri" style="width:100%;justify-content:center" type="submit">Sign in</button></form>`;
    $('#lf').onsubmit = async (e) => {
      e.preventDefault(); const btn = $('button', e.target);
      try {
        await A.busy(btn, async () => {
          const r = await A.api('/login', { method: 'POST', body: { email: $('#le').value, password: $('#lp').value }, noAuthRedirect: true });
          A.token = r.token; try { localStorage.setItem('ms_admin_token', r.token); } catch (x) { /* ignore */ }
          await start();
        });
      } catch (x) { $('#lerr').textContent = x.message; }
    };
  }
  async function start() {
    try { A.admin = await A.api('/me', { noAuthRedirect: true }); } catch (e) { showLogin(A.token ? 'Your session has ended. Please sign in again.' : ''); return; }
    $('#login').hidden = true; $('#app').hidden = false;
    drawShell(); A.refreshCounts(); route(); A.startLive();
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('load', () => { if (A.token) start(); else showLogin(''); });

  /* ---------- dashboard ---------- */
  /* ---------- notifications, e-mail and payment setup card (dashboard) ---------- */
  A.drawSystem = async (root) => {
    const el = $('#sys', root); if (!el) return;
    let m; try { m = await A.api('/mail/status'); } catch (e) { el.remove(); return; }
    const here = await (window.MSPush ? MSPush.current() : null);
    const chip = (on, t, extra) => `<span class="badge ${on ? 'ok' : 'bad'}">${t}: ${on ? 'on' : 'off'}${extra || ''}</span>`;
    const owner = A.admin.role === 'owner';
    el.innerHTML = `<div class="bar" style="margin:0"><h3 class="grow" style="margin:0">Notifications, e-mail &amp; payments</h3>${chip(!!here, 'Alerts on this device')} ${chip(m.enabled, 'E-mail')} ${chip(m.online_payments, 'Online payments')}</div>
      <div class="sys-grid">
        <div><b>Phone / browser alerts</b><p class="mute">${here ? 'This device gets a notification for every new order, enquiry and restock, even when this page is closed.' : 'Turn this on to get a notification on this phone or computer the moment an order arrives.'}</p>
          ${here ? '<button class="btn sm" id="ptest">Send test alert</button>' : '<button class="btn sm pri" id="pon">Enable on this device</button>'}
          <p class="mute" style="margin-top:6px">${A.num(m.push_devices)} device${m.push_devices === 1 ? '' : 's'} registered${m.waiting_restock ? ` · ${A.num(m.waiting_restock)} customer${m.waiting_restock === 1 ? '' : 's'} waiting for a restock` : ''}</p></div>
        <div><b>E-mail</b><p class="mute">${m.enabled ? `Order, shipping and form e-mails are sent. Store alerts go to <b>${esc(m.store_inbox)}</b>.` : 'Customers and the store get no e-mail yet. Add your mail account to switch it on.'}</p>
          ${owner ? `<button class="btn sm ${m.enabled ? '' : 'pri'}" id="mset">${m.enabled ? 'Edit settings' : 'Set up e-mail'}</button>` : ''} ${m.enabled ? '<button class="btn sm" id="mtest">Send test e-mail</button>' : ''}</div>
        <div><b>Online payments</b><p class="mute">${m.online_payments ? 'Customers can pay by UPI, cards and net banking (Razorpay).' : 'Only cash on delivery is offered. Add your Razorpay keys to accept online payments.'}</p>
          ${owner ? `<button class="btn sm ${m.online_payments ? '' : 'pri'}" id="pset">${m.online_payments ? 'Edit keys' : 'Set up payments'}</button>` : ''}</div></div>`;
    const on = $('#pon', el), te = $('#ptest', el), mt = $('#mtest', el);
    if (on) on.onclick = () => A.busy(on, async () => {
      try { const sub = await MSPush.subscribe(); await A.api('/push/subscribe', { method: 'POST', body: { subscription: sub } }); A.toast('Alerts are on for this device'); A.drawSystem(root); } catch (x) { A.toast(x.message, true); }
    });
    if (te) te.onclick = () => A.busy(te, async () => { try { const r = await A.api('/push/test', { method: 'POST', body: {} }); A.toast(r.delivered ? 'Test alert sent. Check your notifications.' : 'No alert could be delivered. Try enabling it again.', !r.delivered); } catch (x) { A.toast(x.message, true); } });
    if (mt) mt.onclick = () => A.busy(mt, async () => { try { const r = await A.api('/mail/test', { method: 'POST', body: {} }); A.toast('Test e-mail sent to ' + r.to); } catch (x) { A.toast(x.message, true); } });
    const field = (id, label, o = {}) => `<div class="fld"><label for="${id}">${label}</label><input id="${id}" type="${o.type || 'text'}" value="${esc(o.value || '')}" placeholder="${esc(o.ph || '')}" autocomplete="off"></div>`;
    const read = (ids) => Object.fromEntries(ids.map((k) => [k, ($('#i-' + k) || {}).value || '']));
    const save = async (body, close, msg) => { await A.api('/integrations', { method: 'POST', body }); A.toast(msg); close(); A.drawSystem(root); };
    $('#mset', el) && ($('#mset', el).onclick = async () => {
      const st = await A.api('/integrations'), v = (k) => st[k].value, ids = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'mail_from', 'notify_to', 'site_url'];
      A.modal({ title: 'E-mail settings', wide: true, body: `<p class="mute">Use the mail account you send from. For Gmail: host <b>smtp.gmail.com</b>, port <b>587</b>, your address as user, and an <b>app password</b> (not your normal password).</p>
        <div class="fgrid2">${field('i-smtp_host', 'SMTP host', { value: v('smtp_host'), ph: 'smtp.gmail.com' })}${field('i-smtp_port', 'Port', { value: v('smtp_port') || '587' })}${field('i-smtp_user', 'User name', { value: v('smtp_user') })}
        ${field('i-smtp_password', 'Password', { type: 'password', ph: st.smtp_password.set ? 'Saved (leave blank to keep)' : '' })}${field('i-mail_from', 'Send from (optional)', { value: v('mail_from'), ph: 'orders@yourstore.com' })}${field('i-notify_to', 'Store inbox for alerts', { value: v('notify_to'), ph: 'where new orders are e-mailed' })}
        ${field('i-site_url', 'Website address (for links in e-mails)', { value: v('site_url') === 'http://localhost:8000' ? '' : v('site_url'), ph: 'https://yourstore.com' })}</div>`,
        actions: [{ label: 'Switch e-mail off', onClick: (c, b) => A.busy(b, async () => { await save({ clear: 'email' }, c, 'E-mail is off'); }) }, { label: 'Cancel', onClick: (c) => c() },
          { label: 'Save & send test', cls: 'pri', onClick: (c, b) => A.busy(b, async () => { try { await A.api('/integrations', { method: 'POST', body: read(ids) }); const r = await A.api('/mail/test', { method: 'POST', body: {} }); A.toast('Saved. Test e-mail sent to ' + r.to); c(); A.drawSystem(root); } catch (x) { A.toast('Saved, but the test failed: ' + x.message, true); A.drawSystem(root); } }) }] });
    });
    $('#pset', el) && ($('#pset', el).onclick = async () => {
      const st = await A.api('/integrations'), ids = ['razorpay_key_id', 'razorpay_key_secret', 'razorpay_webhook_secret'];
      A.modal({ title: 'Online payments (Razorpay)', wide: true, body: `<p class="mute">Create the keys in your Razorpay dashboard: Settings, API Keys. Start with <b>test</b> keys (they begin with rzp_test_) and switch to live keys when you are ready.</p>
        <div class="fgrid2">${field('i-razorpay_key_id', 'Key ID', { value: st.razorpay_key_id.value, ph: 'rzp_test_…' })}${field('i-razorpay_key_secret', 'Key secret', { type: 'password', ph: st.razorpay_key_secret.set ? 'Saved (leave blank to keep)' : '' })}${field('i-razorpay_webhook_secret', 'Webhook secret', { type: 'password', ph: st.razorpay_webhook_secret.set ? 'Saved (leave blank to keep)' : '' })}</div>
        <p class="mute" style="margin-top:10px">In Razorpay: Settings, Webhooks, add <b>${esc(location.origin)}/api/payment/webhook</b> with events <b>payment.captured</b>, <b>payment.failed</b> and <b>order.paid</b>, and paste the secret you choose above. The site must be on https for this.</p>`,
        actions: [{ label: 'Switch payments off', onClick: (c, b) => A.busy(b, async () => { await save({ clear: 'payments' }, c, 'Online payments are off'); }) }, { label: 'Cancel', onClick: (c) => c() },
          { label: 'Save', cls: 'pri', onClick: (c, b) => A.busy(b, async () => { try { await save(read(ids), c, 'Payment keys saved'); } catch (x) { A.toast(x.message, true); } }) }] });
    });
  };

  A.views.dashboard = async (p, v) => {
    let days = +(sessionStorage.getItem('ms_days') || 30);
    const draw = async () => {
      const [d, b, rec] = await Promise.all([A.api('/analytics?days=' + days), A.api('/badges'), A.api('/orders?limit=7')]);
      A.counts = b;
      const k = (label, val, ch, sub) => `<div class="kpi"><small>${label}</small><b>${val}</b><div>${ch === undefined ? '' : A.delta(ch)} <span class="mute">${sub || 'vs previous ' + days + ' days'}</span></div></div>`;
      v.innerHTML = `<div class="bar"><div class="grow"><h2 style="font-size:24px">Welcome back, ${esc(A.admin.name || 'there')}</h2><span class="mute">Here is how the store is doing.</span></div>${A.pill([[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days']], days, 'data-days')}</div>
        <div class="grid kpis">${k('Revenue', A.money0(d.current.revenue), d.change.revenue)}${k('Orders', A.num(d.current.orders), d.change.orders)}${k('Average order', A.money0(d.current.aov), d.change.aov)}${k('Units sold', A.num(d.current.units), d.change.units)}
          ${k('New customers', A.num(d.customers.new), d.customers.change)}${k('Repeat buyers', A.num(d.customers.repeat), undefined, 'of ' + A.num(d.customers.buyers) + ' buyers')}</div>
        <div class="grid two-wide"><div class="card"><h3>Revenue</h3><div id="rev"></div></div>
          <div class="card"><h3>Needs attention</h3><div class="todo">
            <a href="#/orders"><b>${A.num(b.orders_new)}</b><span>new orders to confirm &amp; pack</span></a><a href="#/orders"><b>${A.num(b.orders_to_ship)}</b><span>packed, ready to ship</span></a>
            <a href="#/enquiries"><b>${A.num(b.enquiries_new)}</b><span>new enquiries &amp; quotes</span></a>${A.can('MGR') ? `<a href="#/inventory"><b>${A.num(b.low_stock)}</b><span>products low on stock</span></a>` : ''}</div></div></div>
        <div class="grid three mt"><div class="card"><h3>Orders by status</h3><div id="st"></div></div><div class="card"><h3>Payment methods</h3><div id="pay"></div></div><div class="card"><h3>Top cities</h3><div id="city"></div></div></div>
        <div class="grid two mt"><div class="card"><h3>Top products</h3>${d.top_products.length ? `<table class="tbl"><tbody>${d.top_products.slice(0, 6).map((x) => `<tr><td style="width:46px"><img class="thumb" src="${esc(x.image)}" alt="" loading="lazy"></td><td>${esc(x.name.slice(0, 54))}<br><span class="mono mute">${esc(x.sku)}</span></td><td class="r">${x.qty} sold</td><td class="r"><b>${A.money(x.revenue)}</b></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No sales in this period</div>'}</div>
          <div class="card"><h3>Sales by category</h3><div id="cat"></div></div></div>
        <div class="card mt" id="sys"></div>
        <div class="card mt"><div class="bar" style="margin:0 0 10px"><h3 class="grow" style="margin:0">Recent orders</h3><a class="btn sm" href="#/orders">View all</a></div><div class="wrap-x"><table class="tbl"><tbody>${rec.items.map((o) => `<tr><td><a class="mono" href="#/orders/${esc(o.order_id)}">${esc(o.order_id)}</a></td><td>${esc(o.name)}<br><span class="mute">${esc(o.city)}</span></td><td class="mute">${esc(o.summary)}</td><td>${A.badge(o.status)}</td><td class="r"><b>${A.money(o.total)}</b></td><td class="mute">${A.date(o.created)}</td></tr>`).join('')}</tbody></table></div></div>`;
      A.drawSystem(v);
      A.areaChart($('#rev'), d.daily.map((x) => ({ label: x.date.slice(5), full: A.date(x.date), value: x.revenue, extra: x.orders + ' orders' })));
      A.hbars($('#st'), Object.entries(d.status).sort((a, b2) => b2[1] - a[1]).map(([l, n]) => ({ label: l, value: n })), A.num);
      A.donut($('#pay'), d.payment.map((x) => ({ label: ({ cod: 'Cash on delivery', online: 'Online payment', upi: 'UPI', card: 'Card / net banking' })[x.method] || x.method, value: x.orders })));
      A.hbars($('#city'), d.cities.slice(0, 6).map((x) => ({ label: x.city, value: x.orders })), (n) => n + ' orders');
      A.hbars($('#cat'), d.categories.map((x) => ({ label: x.name, value: x.revenue })), A.short);
      $$('[data-days]', v).forEach((b2) => b2.onclick = () => { days = +b2.dataset.days; sessionStorage.setItem('ms_days', days); draw(); });
      A.refreshCounts();
    };
    await draw();
  };

  /* ---------- reports ---------- */
  A.views.reports = async (p, v) => {
    let days = +(sessionStorage.getItem('ms_rdays') || 30);
    const draw = async () => {
      const d = await A.api('/analytics?days=' + days);
      v.innerHTML = `<div class="bar"><div class="grow mute">Figures exclude cancelled and returned orders. Export any table as CSV.</div>${A.pill([[7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '12 months']], days, 'data-days')}</div>
        <div class="grid kpis"><div class="kpi"><small>Revenue</small><b>${A.money0(d.current.revenue)}</b><div>${A.delta(d.change.revenue)}</div></div><div class="kpi"><small>Orders</small><b>${A.num(d.current.orders)}</b><div>${A.delta(d.change.orders)}</div></div>
          <div class="kpi"><small>Average order</small><b>${A.money0(d.current.aov)}</b><div>${A.delta(d.change.aov)}</div></div><div class="kpi"><small>Units sold</small><b>${A.num(d.current.units)}</b><div>${A.delta(d.change.units)}</div></div></div>
        <div class="card"><h3>Sales by day</h3><div id="rv"></div></div>
        <div class="grid two mt"><div class="card"><div class="bar" style="margin:0 0 10px"><h3 class="grow" style="margin:0">Top products</h3><button class="btn sm" id="e1">Export CSV</button></div><table class="tbl"><thead><tr><th>Product</th><th class="r">Units</th><th class="r">Revenue</th></tr></thead><tbody>${d.top_products.map((x) => `<tr><td>${esc(x.name.slice(0, 60))}<br><span class="mono mute">${esc(x.sku)}</span></td><td class="r">${x.qty}</td><td class="r">${A.money(x.revenue)}</td></tr>`).join('') || '<tr><td colspan="3" class="mute">No sales</td></tr>'}</tbody></table></div>
          <div class="card"><div class="bar" style="margin:0 0 10px"><h3 class="grow" style="margin:0">Daily figures</h3><button class="btn sm" id="e2">Export CSV</button></div><div style="max-height:360px;overflow:auto"><table class="tbl"><thead><tr><th>Date</th><th class="r">Orders</th><th class="r">Revenue</th></tr></thead><tbody>${d.daily.slice().reverse().map((x) => `<tr><td>${A.date(x.date)}</td><td class="r">${x.orders}</td><td class="r">${A.money(x.revenue)}</td></tr>`).join('')}</tbody></table></div></div></div>
        <div class="grid three mt"><div class="card"><h3>By category</h3><div id="rc"></div></div><div class="card"><h3>By city</h3><table class="tbl"><tbody>${d.cities.map((x) => `<tr><td>${esc(x.city)}</td><td class="r">${x.orders}</td><td class="r">${A.money(x.revenue)}</td></tr>`).join('')}</tbody></table></div>
          <div class="card"><h3>By payment method</h3><table class="tbl"><tbody>${d.payment.map((x) => `<tr><td>${esc(({ cod: 'Cash on delivery', online: 'Online payment', upi: 'UPI', card: 'Card / net banking' })[x.method] || x.method)}</td><td class="r">${x.orders}</td><td class="r">${A.money(x.revenue)}</td></tr>`).join('')}</tbody></table></div></div>`;
      A.areaChart($('#rv'), d.daily.map((x) => ({ label: x.date.slice(5), full: A.date(x.date), value: x.revenue, extra: x.orders + ' orders' })));
      A.hbars($('#rc'), d.categories.map((x) => ({ label: x.name, value: x.revenue })), A.short);
      $('#e1').onclick = () => A.csv('top-products.csv', [['Product', 'SKU', 'Units', 'Revenue']].concat(d.top_products.map((x) => [x.name, x.sku, x.qty, x.revenue])));
      $('#e2').onclick = () => A.csv('daily-sales.csv', [['Date', 'Orders', 'Revenue']].concat(d.daily.map((x) => [x.date, x.orders, x.revenue])));
      $$('[data-days]', v).forEach((b) => b.onclick = () => { days = +b.dataset.days; sessionStorage.setItem('ms_rdays', days); draw(); });
    };
    await draw();
  };

  /* ---------- orders ---------- */
  A.views.orders = async (p, v) => {
    if (p[0]) return orderDetail(decodeURIComponent(p[0]), v);
    const st = { q: '', status: '', date_from: '', date_to: '', sort: 'new', page: 1 };
    const sel = new Set();
    v.innerHTML = `<div id="tabs"></div><div class="bar"><input class="grow" id="q" placeholder="Search order no., name, email, phone or product"><label class="mute">From <input type="date" id="df"></label><label class="mute">To <input type="date" id="dt"></label>
      <select id="so"><option value="new">Newest first</option><option value="old">Oldest first</option><option value="high">Highest value</option><option value="low">Lowest value</option></select><button class="btn" id="csv">Export CSV</button></div>
      <div class="bar" id="bulk" hidden><b id="bc"></b><select id="bs"></select><input id="bn" placeholder="Note (optional)" style="width:220px"><button class="btn pri" id="ba">Apply to selected</button></div><div id="list"></div>`;
    const load = async () => {
      const d = await A.api('/orders?' + A.qs({ ...st, limit: 25 }));
      const all = Object.values(d.counts).reduce((s, n) => s + n, 0);
      $('#tabs').innerHTML = A.pill([['', 'All', all]].concat(d.statuses.map((s) => [s, s, d.counts[s] || 0])), st.status, 'data-s');
      $$('[data-s]', $('#tabs')).forEach((b) => b.onclick = () => { st.status = b.dataset.s; st.page = 1; sel.clear(); load(); });
      if (!$('#bs').options.length) $('#bs').innerHTML = A.opts(d.statuses.filter((s) => s !== 'Confirmed'), 'Packed');
      $('#list').innerHTML = d.items.length ? `<div class="wrap-x"><table class="tbl"><thead><tr><th style="width:28px"><input type="checkbox" id="all"></th><th>Order</th><th>Customer</th><th>Items</th><th>Payment</th><th class="r">Total</th><th>Status</th><th></th></tr></thead><tbody>
        ${d.items.map((o) => `<tr><td><input type="checkbox" data-c="${esc(o.order_id)}" ${sel.has(o.order_id) ? 'checked' : ''}></td><td><a class="mono" href="#/orders/${esc(o.order_id)}">${esc(o.order_id)}</a><br><span class="mute">${A.date(o.created)}</span></td>
        <td>${esc(o.name)}<br><span class="mute">${esc(o.city)}${o.phone ? ' · ' + esc(o.phone) : ''}</span></td><td class="mute" style="max-width:260px"><span class="clamp2">${esc(o.summary)}</span>${o.units} unit${o.units === 1 ? '' : 's'}</td><td>${esc(o.payment.toUpperCase())}</td><td class="r"><b>${A.money(o.total)}</b></td>
        <td><select class="qstat" data-q="${esc(o.order_id)}" data-cur="${esc(o.status)}">${A.opts(d.statuses, o.status)}</select></td><td class="r"><button class="btn sm" data-inv="${esc(o.order_id)}">Invoice</button> <a class="btn sm" href="#/orders/${esc(o.order_id)}">Open</a></td></tr>`).join('')}</tbody></table></div>${A.pager(d)}` : '<div class="empty">No orders match these filters.</div>';
      A.bindPager($('#list'), (n) => { st.page = n; load(); });
      const upd = () => { $('#bulk').hidden = !sel.size; $('#bc').textContent = sel.size + ' selected'; };
      $$('[data-c]', $('#list')).forEach((c) => c.onchange = () => { c.checked ? sel.add(c.dataset.c) : sel.delete(c.dataset.c); upd(); });
      const all_ = $('#all'); if (all_) all_.onchange = () => { $$('[data-c]', $('#list')).forEach((c) => { c.checked = all_.checked; all_.checked ? sel.add(c.dataset.c) : sel.delete(c.dataset.c); }); upd(); };
      $$('[data-inv]', $('#list')).forEach((b) => b.onclick = () => A.openHtml('/orders/' + encodeURIComponent(b.dataset.inv) + '/invoice'));
      $$('.qstat', $('#list')).forEach((s) => s.onchange = async () => { try { await A.api('/orders/' + encodeURIComponent(s.dataset.q), { method: 'PATCH', body: { status: s.value } }); A.toast(s.dataset.q + ' is now ' + s.value); A.refreshCounts(); load(); } catch (x) { A.toast(x.message, true); s.value = s.dataset.cur; } });
      upd();
    };
    $('#q').oninput = A.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); });
    $('#df').onchange = (e) => { st.date_from = e.target.value; st.page = 1; load(); };
    $('#dt').onchange = (e) => { st.date_to = e.target.value; st.page = 1; load(); };
    $('#so').onchange = (e) => { st.sort = e.target.value; st.page = 1; load(); };
    $('#csv').onclick = () => A.download('/orders/export.csv?' + A.qs({ q: st.q, status: st.status, date_from: st.date_from, date_to: st.date_to }), 'orders.csv');
    $('#ba').onclick = (e) => A.busy(e.target, async () => { try { const r = await A.api('/orders/bulk', { method: 'POST', body: { ids: [...sel], status: $('#bs').value, note: $('#bn').value } }); A.toast(r.updated + ' orders updated'); sel.clear(); $('#bn').value = ''; A.refreshCounts(); load(); } catch (x) { A.toast(x.message, true); } });
    await load();
  };
  async function orderDetail(id, v) {
    const d = await A.api('/orders/' + encodeURIComponent(id)); const o = d.order; const c = o.customer || {};
    const addr = [c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ');
    v.innerHTML = `<p><a href="#/orders">&larr; All orders</a></p>
      <div class="bar"><h2 class="grow" style="font-size:26px">Order <span class="mono">${esc(o.order_id)}</span> ${A.badge(d.status)}</h2><button class="btn" id="inv">Print invoice</button><button class="btn" id="lab">Shipping label</button>${A.can('ANY') ? '' : ''}</div>
      <div class="grid two"><div class="card"><h3>Customer</h3>
        <dl class="kvl"><dt>Placed</dt><dd>${A.date(o.created)} <span class="mute">${esc((o.created || '').slice(11, 16))}</span></dd><dt>Name</dt><dd>${d.customer_id ? `<a href="#/customers/${d.customer_id}">${esc(c.name)}</a>` : esc(c.name) + ' <span class="badge">guest</span>'}</dd><dt>Email</dt><dd><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></dd><dt>Phone</dt><dd>${esc(c.phone)}</dd>
        <dt>Ship to</dt><dd>${esc(addr)}</dd><dt>GSTIN</dt><dd>${esc(c.gstin || '—')}</dd><dt>Payment</dt><dd>${esc(String(o.payment || '').toUpperCase())}${o.payment_ref ? ` <span class="mono mute">${esc(o.payment_ref)}</span>` : ''}</dd><dt>Invoice no.</dt><dd class="mono">${esc(d.invoice_no)}</dd></dl></div>
      <div class="card"><h3>Update status</h3><div class="fld"><label for="os">Status</label><select id="os">${A.opts(d.statuses, d.status)}</select></div>
        <div class="fld"><label for="on">Note (shown in the history)</label><input id="on" maxlength="500" placeholder="e.g. Courier name and tracking number"></div>
        <button class="btn pri" id="osave">Save status</button><div class="err" id="oerr"></div>
        <h3 class="mt" style="font-size:17px">History</h3><ul class="timeline">${(o.history || []).slice().reverse().map((h) => `<li><b>${esc(h.status)}</b> <span class="mute">· ${esc(h.at)} · ${esc(h.by)}</span>${h.note ? `<br>${esc(h.note)}` : ''}</li>`).join('')}<li><b>Order placed</b> <span class="mute">· ${esc(o.created)}</span><br>Status: Confirmed</li></ul></div></div>
      <div class="card mt"><h3>Items</h3><div class="wrap-x"><table class="tbl"><thead><tr><th></th><th>Product</th><th>SKU</th><th class="r">Qty</th><th class="r">Unit</th><th class="r">Total</th></tr></thead><tbody>
        ${(o.items || []).map((i) => `<tr><td style="width:50px"><img class="thumb" src="${esc(i.image)}" alt="" loading="lazy"></td><td>${A.can('MGR') ? `<a href="#/products/${esc(i.id)}">${esc(i.name)}</a>` : esc(i.name)}</td><td class="mono">${esc(i.sku)}</td><td class="r">${i.qty}</td><td class="r">${A.money(i.unit)}</td><td class="r">${A.money(i.line_total)}</td></tr>`).join('')}</tbody></table></div>
        <dl class="kvl mt" style="max-width:340px;margin-left:auto"><dt>Subtotal</dt><dd>${A.money(o.subtotal)}</dd><dt>GST included</dt><dd>${A.money(o.gst_included)}</dd><dt>Shipping</dt><dd>${o.shipping ? A.money(o.shipping) : 'Free'}</dd><dt>Total</dt><dd><b>${A.money(o.total)}</b></dd></dl></div>`;
    $('#inv').onclick = () => A.openHtml('/orders/' + encodeURIComponent(id) + '/invoice');
    $('#lab').onclick = () => { const w = window.open('', '_blank'); if (!w) { A.toast('Please allow pop-ups to print the label', true); return; } w.document.write(`<title>Label ${esc(o.order_id)}</title><body style="font:16px/1.5 system-ui;padding:24px;max-width:420px;border:2px solid #000;margin:20px"><b>SHIP TO</b><br><span style="font-size:22px;font-weight:700">${esc(c.name)}</span><br>${esc(c.address || '')}<br>${esc(c.city || '')}, ${esc(c.state || '')} <b>${esc(c.pincode || '')}</b><br>Phone: ${esc(c.phone || '')}<hr><b>Order</b> ${esc(o.order_id)} &middot; ${esc(String(o.payment || '').toUpperCase())}${o.payment === 'cod' ? ` &middot; <b>COLLECT ${esc(A.money(o.total))}</b>` : ''}<hr>${(o.items || []).map((i) => esc(i.qty + ' × ' + i.name.slice(0, 50))).join('<br>')}<p><button onclick="print()">Print</button></p></body>`); w.document.close(); };
    $('#osave').onclick = (e) => A.busy(e.target, async () => {
      try { await A.api('/orders/' + encodeURIComponent(id), { method: 'PATCH', body: { status: $('#os').value, note: $('#on').value } }); A.toast('Order updated'); A.refreshCounts(); orderDetail(id, v); }
      catch (x) { $('#oerr').textContent = x.message; }
    });
  }

  /* ---------- enquiries ---------- */
  A.views.enquiries = async (p, v) => {
    const st = { kind: '', status: '', q: '', page: 1 };
    v.innerHTML = `<div id="tabs"></div><div class="bar"><input class="grow" id="q" placeholder="Search name, email, reference, message…"><select id="k"><option value="">All types</option></select><button class="btn" id="csv">Export CSV</button></div><div id="list"></div>`;
    const load = async () => {
      const d = await A.api('/enquiries?' + A.qs({ ...st, limit: 25 }));
      if ($('#k').options.length === 1) $('#k').insertAdjacentHTML('beforeend', A.opts(d.kinds, ''));
      $('#tabs').innerHTML = A.pill([['', 'All']].concat(d.statuses.map((s) => [s, s])), st.status, 'data-s');
      $$('[data-s]', $('#tabs')).forEach((b) => b.onclick = () => { st.status = b.dataset.s; st.page = 1; load(); });
      $('#list').innerHTML = d.items.length ? `<div class="wrap-x"><table class="tbl"><thead><tr><th>Ref</th><th>Type</th><th>From</th><th>Received</th><th>Status</th><th></th></tr></thead><tbody>
        ${d.items.map((e) => `<tr><td class="mono">${esc(e.reference || '#' + e.id)}</td><td><span class="badge">${esc(e.kind)}</span></td><td>${esc(e.name || '—')}<br><span class="mute">${esc(e.email || e.phone)}</span></td><td class="mute">${A.date(e.created)}</td><td>${A.badge(e.status)}</td><td class="r"><button class="btn sm" data-e="${e.id}">Open</button></td></tr>`).join('')}</tbody></table></div>${A.pager(d)}` : '<div class="empty">No enquiries match.</div>';
      A.bindPager($('#list'), (n) => { st.page = n; load(); });
      $$('[data-e]', $('#list')).forEach((b) => b.onclick = () => openEnquiry(d.items.find((x) => x.id === +b.dataset.e), d.statuses, load));
    };
    $('#q').oninput = A.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); });
    $('#k').onchange = (e) => { st.kind = e.target.value; st.page = 1; load(); };
    $('#csv').onclick = () => A.download('/enquiries/export.csv?' + A.qs({ kind: st.kind, status: st.status }), 'enquiries.csv');
    await load();
  };
  function openEnquiry(e, statuses, reload) {
    const pl = e.payload || {};
    const skip = new Set(['kind', 'reference', 'file', 'demo']);
    const rows = Object.entries(pl).filter(([k]) => !skip.has(k)).map(([k, val]) => `<dt>${esc(k)}</dt><dd>${typeof val === 'object' ? `<pre style="margin:0;white-space:pre-wrap;font-size:12.5px">${esc(JSON.stringify(val, null, 1))}</pre>` : esc(val)}</dd>`).join('');
    A.modal({ title: (e.reference || 'Enquiry #' + e.id) + ' · ' + e.kind, wide: true,
      body: `<dl class="kvl">${rows}</dl>${e.file ? `<p class="mt"><button class="btn" id="dl">Download uploaded file (${esc(e.file)})</button></p>` : ''}
        <div class="row2 mt"><div class="fld"><label for="es">Status</label><select id="es">${A.opts(statuses, e.status)}</select></div><div class="fld"><label for="en">Internal note</label><input id="en" value="${esc(e.note)}"></div></div>
        ${e.email ? `<a class="btn" href="mailto:${esc(e.email)}?subject=${encodeURIComponent('Re: ' + (e.reference || e.kind))}">Reply by email</a>` : ''}`,
      actions: [{ label: 'Close', onClick: (c) => c() }, A.admin.role === 'owner' ? { label: 'Delete', cls: 'bad', onClick: async (c) => { if (await A.confirm('Delete this enquiry permanently?', 'Delete', 'bad')) { await A.api('/enquiries/' + e.id, { method: 'DELETE' }); c(); A.toast('Deleted'); reload(); A.refreshCounts(); } } } : null,
        { label: 'Save', cls: 'pri', onClick: async (c, b) => A.busy(b, async () => { try { await A.api('/enquiries/' + e.id, { method: 'PATCH', body: { status: $('#es').value, note: $('#en').value } }); c(); A.toast('Saved'); reload(); A.refreshCounts(); } catch (x) { A.toast(x.message, true); } }) }].filter(Boolean) });
    const dl = $('#dl'); if (dl) dl.onclick = () => A.download('/files/' + encodeURIComponent(e.file), e.file);
  }

  /* ---------- customers ---------- */
  A.views.customers = async (p, v) => {
    if (p[0]) return customerDetail(+p[0], v);
    const st = { q: '', sort: 'new', page: 1 };
    v.innerHTML = `<div class="bar"><input class="grow" id="q" placeholder="Search name, email or phone"><select id="so"><option value="new">Newest</option><option value="spent">Highest spend</option><option value="orders">Most orders</option><option value="name">Name</option></select>${A.can('MGR') ? '<button class="btn" id="csv">Export CSV</button>' : ''}</div><div id="list"></div>`;
    const load = async () => {
      const d = await A.api('/users?' + A.qs({ ...st, limit: 25 }));
      $('#list').innerHTML = d.items.length ? `<div class="wrap-x"><table class="tbl"><thead><tr><th>Customer</th><th>Phone</th><th>Joined</th><th class="r">Orders</th><th class="r">Total spent</th><th>Last order</th><th>Status</th><th></th></tr></thead><tbody>
        ${d.items.map((u) => `<tr><td><a href="#/customers/${u.id}"><b>${esc(u.name)}</b></a><br><span class="mute">${esc(u.email)}</span></td><td>${esc(u.phone)}</td><td class="mute">${A.date(u.created)}</td><td class="r">${u.orders}</td><td class="r">${A.money(u.spent)}</td><td class="mute">${u.last_order ? A.date(u.last_order) : '—'}</td><td>${u.disabled ? '<span class="badge bad">Disabled</span>' : '<span class="badge ok">Active</span>'}</td><td class="r"><a class="btn sm" href="#/customers/${u.id}">View</a></td></tr>`).join('')}</tbody></table></div>${A.pager(d)}` : '<div class="empty">No customers match.</div>';
      A.bindPager($('#list'), (n) => { st.page = n; load(); });
    };
    $('#q').oninput = A.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); });
    $('#so').onchange = (e) => { st.sort = e.target.value; st.page = 1; load(); };
    if ($('#csv')) $('#csv').onclick = () => A.download('/users/export.csv', 'customers.csv');
    await load();
  };
  async function customerDetail(id, v) {
    const u = await A.api('/users/' + id);
    v.innerHTML = `<p><a href="#/customers">&larr; All customers</a></p>
      <div class="bar"><h2 class="grow" style="font-size:26px">${esc(u.name)} ${u.disabled ? '<span class="badge bad">Disabled</span>' : '<span class="badge ok">Active</span>'}</h2>${A.can('MGR') ? `<button class="btn" id="tg">${u.disabled ? 'Enable account' : 'Disable account'}</button><button class="btn" id="rp">Reset password</button>` : ''}</div>
      <div class="grid kpis"><div class="kpi"><small>Orders</small><b>${u.order_count}</b></div><div class="kpi"><small>Total spent</small><b>${A.money(u.spent)}</b></div><div class="kpi"><small>Average order</small><b>${A.money(u.aov)}</b></div><div class="kpi"><small>Customer since</small><b style="font-size:20px">${A.date(u.created)}</b></div></div>
      <div class="grid two"><div class="card"><h3>Contact</h3><dl class="kvl"><dt>Email</dt><dd><a href="mailto:${esc(u.email)}">${esc(u.email)}</a></dd><dt>Phone</dt><dd>${esc(u.phone)}</dd><dt>Last address</dt><dd>${esc(u.address || '—')}</dd><dt>GSTIN</dt><dd>${esc(u.gstin || '—')}</dd></dl></div>
      <div class="card"><h3>Order history</h3>${u.orders.length ? `<table class="tbl"><tbody>${u.orders.map((o) => `<tr><td><a class="mono" href="#/orders/${esc(o.order_id)}">${esc(o.order_id)}</a><br><span class="mute">${A.date(o.created)}</span></td><td class="mute">${esc(o.summary)}</td><td>${A.badge(o.status)}</td><td class="r"><b>${A.money(o.total)}</b></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No orders yet</div>'}</div></div>`;
    if ($('#tg')) $('#tg').onclick = async () => { if (!u.disabled && !(await A.confirm('Disable this account? They will be signed out and unable to sign in.', 'Disable', 'bad'))) return; await A.api('/users/' + id, { method: 'PATCH', body: { disabled: !u.disabled } }); A.toast('Updated'); customerDetail(id, v); };
    if ($('#rp')) $('#rp').onclick = async () => { const pw = await A.prompt('Set a new password', 'New password (min 6 characters)', '', 'password'); if (!pw) return; try { await A.api('/users/' + id, { method: 'PATCH', body: { password: pw } }); A.toast('Password reset'); } catch (x) { A.toast(x.message, true); } };
  }
})();
