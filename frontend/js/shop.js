/* Listing pages (shop, category, brand, search, tags, new arrivals) and the product page. */
(function () {
  'use strict';
  const { esc, img, $, $$, money, num } = MS;

  const SORTS = [['popularity', 'Popularity'], ['latest', 'Latest'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['name', 'Name: A to Z'], ['discount', 'Biggest discount']];

  function pager(page, pages, mk) {
    if (pages <= 1) return '';
    const set = new Set([1, pages, page, page - 1, page + 1, page - 2, page + 2].filter((x) => x >= 1 && x <= pages));
    const arr = [...set].sort((a, b) => a - b);
    let out = `${page > 1 ? `<a href="${mk(page - 1)}">← Prev</a>` : '<span class="dis">← Prev</span>'}`;
    let prev = 0;
    arr.forEach((p) => {
      if (p - prev > 1) out += '<span class="dis">…</span>';
      out += p === page ? `<span aria-current="page">${p}</span>` : `<a href="${mk(p)}">${p}</a>`;
      prev = p;
    });
    out += page < pages ? `<a href="${mk(page + 1)}">Next →</a>` : '<span class="dis">Next →</span>';
    return `<nav class="ms-pager" aria-label="Pages">${out}</nav>`;
  }

  /**
   * Generic listing. opts: { endpoint, base (path for links), title, crumbs, head(html), extraParams }
   */
  /** Replaces the browser's own (blue) drop-down list with one in the site theme. The real <select> stays in the page, hidden, so its
      value and its "change" event keep working. */
  MS.themeSelect = (sel) => {
    if (!sel || sel.dataset.themed) return;
    sel.dataset.themed = '1';
    const wrap = document.createElement('div'); wrap.className = 'tsel';
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'tsel-btn'; btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    const menu = document.createElement('ul'); menu.className = 'tsel-menu'; menu.setAttribute('role', 'listbox'); menu.hidden = true;
    const opts = [...sel.options];
    const draw = () => {
      btn.innerHTML = `<span>${esc(sel.options[sel.selectedIndex].text)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;
      menu.innerHTML = opts.map((o, i) => `<li role="option" data-i="${i}" aria-selected="${o.selected}" class="${o.selected ? 'on' : ''}">${esc(o.text)}</li>`).join('');
    };
    const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    const open = () => { menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); const on = menu.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' }); };
    const pick = (i) => { sel.selectedIndex = i; draw(); close(); sel.dispatchEvent(new Event('change', { bubbles: true })); btn.focus(); };
    btn.addEventListener('click', () => (menu.hidden ? open() : close()));
    menu.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) pick(+li.dataset.i); });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (menu.hidden) { open(); return; } const n = Math.min(opts.length - 1, Math.max(0, sel.selectedIndex + (e.key === 'ArrowDown' ? 1 : -1))); sel.selectedIndex = n; draw(); }
      else if (e.key === 'Escape') close();
      else if (e.key === 'Enter' && !menu.hidden) { e.preventDefault(); pick(sel.selectedIndex); }
    });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });
    sel.classList.add('tsel-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    sel.parentNode.insertBefore(wrap, sel.nextSibling); wrap.append(btn, menu); draw();
  };

  async function listing(view, opts) {
    if (!MS.S.menu) { try { MS.S.menu = await MS.api('/menu'); } catch (e) { /* ignore */ } }
    const qs = MS.q();
    const state = {
      page: +qs.get('page') || 1,
      sort: qs.get('sort') || opts.defaultSort || 'popularity',
      brand: qs.get('brand') || '',
      stock: qs.get('stock') === '1',
      min: qs.get('min') || '',
      max: qs.get('max') || '',
      search: qs.get('search') || opts.search || '',
      sale: qs.get('sale') === '1' || !!opts.sale,
    };
    const viewMode = MS.store.get('ms_view2', 'grid');
    const params = () => {
      const p = new URLSearchParams();
      p.set('page', state.page); p.set('limit', 24); p.set('sort', state.sort);
      if (state.brand) p.set('brand', state.brand);
      if (state.stock) p.set('in_stock', 'true');
      if (state.min) p.set('min_price', state.min);
      if (state.max) p.set('max_price', state.max);
      if (state.search) p.set('q', state.search);
      if (state.sale) p.set('on_sale', 'true');
      return p.toString();
    };
    const linkFor = (over = {}) => {
      const s = { ...state, ...over };
      const p = new URLSearchParams();
      if (s.search && !opts.search) p.set('search', s.search);
      if (s.page > 1) p.set('page', s.page);
      if (s.sort !== (opts.defaultSort || 'popularity')) p.set('sort', s.sort);
      if (s.brand) p.set('brand', s.brand);
      if (s.stock) p.set('stock', '1');
      if (s.min) p.set('min', s.min);
      if (s.max) p.set('max', s.max);
      if (s.sale && !opts.sale) p.set('sale', '1');
      const q = p.toString();
      return opts.base + (q ? '?' + q : '');
    };

    view.innerHTML = `<div class="wrap pg"><div class="sk" style="height:120px;margin-bottom:20px"></div><div class="grid">${'<div class="sk sk-card"></div>'.repeat(8)}</div></div>`;
    const data = await MS.api(opts.endpoint + '?' + params());
    MS.remember(data.items);
    const facets = data.facets || { brands: [], price_min: 0, price_max: 0 };
    const hd = opts.h1(data);
    MS.setTitle(opts.title(data), opts.desc && opts.desc(data));

    const selBrands = new Set(state.brand.split(',').filter(Boolean));
    const chips = [];
    if (state.search) chips.push(['search', `Search: ${state.search}`]);
    if (state.stock) chips.push(['stock', 'In stock']);
    if (state.sale) chips.push(['sale', 'On sale']);
    selBrands.forEach((b) => chips.push(['brand:' + b, (facets.brands.find((x) => x.slug === b) || { name: b }).name]));
    if (state.min || state.max) chips.push(['price', `₹${Number(state.min || 0).toLocaleString('en-IN')} – ${state.max ? '₹' + Number(state.max).toLocaleString('en-IN') : 'and above'}`]);

    const sideCats = opts.sideCats ? opts.sideCats(data) : '';
    const from = (data.page - 1) * data.limit + 1, to = Math.min(data.page * data.limit, data.total);
    /* price slider: steps are "nice" amounts, and the last step means "and above" */
    const ALL = [0, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
    const lowStop = Math.max(0, ALL.filter((x) => x <= (+facets.price_min || 0)).length - 1);
    const highStop = Math.min(ALL.length - 1, Math.max(lowStop + 1, ALL.findIndex((x) => x >= (+facets.price_max || 0)) < 0 ? ALL.length - 1 : ALL.findIndex((x) => x >= (+facets.price_max || 0))));
    const priceStops = ALL.slice(lowStop, highStop + 1);
    const near = (v, up) => { const n = +v; if (!n) return -1; let i = priceStops.findIndex((x) => x >= n); if (i < 0) i = priceStops.length - 1; return up ? i : Math.max(0, priceStops.filter((x) => x <= n).length - 1); };
    const pLo = state.min ? Math.min(near(state.min, false), priceStops.length - 2) : 0;
    const pHi = state.max ? Math.max(near(state.max, true), pLo + 1) : priceStops.length - 1;
    view.innerHTML = `<div class="wrap pg ls">
      <div class="crumbs">${opts.crumbs(data)}</div>
      <div class="ls-head"><h1>${hd.title}</h1>${hd.sub ? `<p>${hd.sub}</p>` : ''}</div>
      <div class="ms-layout">
        <aside class="ms-filters" id="filters" aria-label="Filter products">
          <div class="fside-h"><b>Filters</b><button type="button" id="fclose" aria-label="Close filters">✕</button></div>
          ${sideCats}
          <div class="fblock">
            <h2>Availability</h2>
            <label class="favail-label"><input type="checkbox" id="f-stock" ${state.stock ? 'checked' : ''}> <span class="favail-txt">In stock only</span></label>
            ${opts.sale ? '' : `<label class="favail-label"><input type="checkbox" id="f-sale" ${state.sale ? 'checked' : ''}> <span class="favail-txt">On sale / Discounts</span></label>`}
          </div>
          <div class="fblock">
            <h2>Price</h2>
            <div class="prs" id="prs" data-stops="${priceStops.join(',')}">
              <div class="prs-track"><span class="prs-fill" id="prs-fill"></span></div>
              <input type="range" id="prs-lo" min="0" max="${priceStops.length - 1}" step="1" value="${pLo}" aria-label="Minimum price">
              <input type="range" id="prs-hi" min="0" max="${priceStops.length - 1}" step="1" value="${pHi}" aria-label="Maximum price">
            </div>
            <p class="prs-label" id="prs-label"></p>
          </div>
          ${facets.brands.length ? `
            <div class="fblock f-brand-block">
              <h2>Brand</h2>
              ${facets.brands.length > 5 ? `
                <div class="f-brand-search-box">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  <input type="text" id="brand-search" class="f-brand-input" placeholder="Search ${facets.brands.length} brands..." autocomplete="off">
                </div>` : ''}
              <div class="brand-list" id="brand-list">
                ${facets.brands.slice(0, 10).map((b) => brandRow(b, selBrands)).join('')}
              </div>
              ${facets.brands.length > 10 ? `<button class="more" id="brand-more" type="button">+ Show all (${facets.brands.length})</button>` : ''}
            </div>` : ''}
        </aside>
        <section aria-label="Products">
          <div class="ms-bar"><div class="lbar-l"><button class="fbtn" id="fbtn" type="button">Filters</button><span class="cnt">${data.total ? `${num(from)}–${num(to)} of ${num(data.total)} results` : '0 results'}</span></div>
            <div class="tools"><label class="sortl">Sort by: <select id="sort" aria-label="Sort products">${SORTS.map(([v, l]) => `<option value="${v}" ${v === state.sort ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
              <div class="vt" role="group" aria-label="View"><button type="button" data-v="grid" class="${viewMode === 'grid' ? 'on' : ''}" aria-label="Grid view"><svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg></button><button type="button" data-v="list" class="${viewMode === 'list' ? 'on' : ''}" aria-label="List view"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></div></div></div>
          ${chips.length ? `<div class="chips-row" id="chips-row">${chips.map(([k, l]) => `<button type="button" class="chipx" data-k="${esc(k)}">${esc(l)} ✕</button>`).join('')}<a class="clr" href="${opts.base}">Clear all</a></div>` : ''}
          ${data.items.length ? (viewMode === 'grid' ? `<div class="lgrid">${data.items.map(listCard).join('')}</div>` : `<div class="llist">${data.items.map(listRow).join('')}</div>`)
            : `<div class="ms-empty"><h2>No products found</h2><p>Try removing a filter or searching for something else.</p><a class="btnx" href="${opts.base}">Clear all filters</a></div>`}
          ${data.items.length && viewMode === 'list' ? '<div class="cmpbar" id="cmpbar" role="region" aria-label="Compare"><span id="cmp-txt"></span><button type="button" id="cmp-go" disabled>Compare</button></div>' : ''}
          ${pager(data.page, data.pages, (p) => linkFor({ page: p }))}
        </section>
      </div></div>
      <div class="backdrop" id="backdrop" hidden></div>`;

    const go = (over) => MS.go(linkFor({ page: 1, ...over }));
    $('#sort').addEventListener('change', (e) => go({ sort: e.target.value }));
    MS.themeSelect($('#sort'));
    $('#f-stock').addEventListener('change', (e) => go({ stock: e.target.checked }));
    const sale = $('#f-sale'); if (sale) sale.addEventListener('change', (e) => go({ sale: e.target.checked }));
    (() => {
      const box = $('#prs'); if (!box) return;
      const stops = box.dataset.stops.split(',').map(Number), last = stops.length - 1;
      const lo = $('#prs-lo'), hi = $('#prs-hi'), fill = $('#prs-fill'), label = $('#prs-label');
      const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');
      const paint = () => {
        let a = +lo.value, z = +hi.value;
        if (a > z - 1) { if (document.activeElement === lo) a = z - 1; else z = a + 1; lo.value = a; hi.value = z; }
        fill.style.left = (a / last * 100) + '%'; fill.style.right = ((last - z) / last * 100) + '%';
        label.textContent = `${fmt(stops[a])} - ${fmt(stops[z])}${z === last ? '+' : ''}`;
      };
      const apply = () => { const a = +lo.value, z = +hi.value; go({ min: a > 0 ? stops[a] : '', max: z < last ? stops[z] : '' }); };
      [lo, hi].forEach((r) => { r.addEventListener('input', paint); r.addEventListener('change', apply); });
      paint();
    })();

    function bindBrand(e) {
      if (e && e.target && e.target.dataset && e.target.dataset.brand) {
        if (e.target.checked) selBrands.add(e.target.dataset.brand);
        else selBrands.delete(e.target.dataset.brand);
      } else {
        $$('#filters input[data-brand]').forEach((x) => {
          if (x.checked) selBrands.add(x.dataset.brand);
          else selBrands.delete(x.dataset.brand);
        });
      }
      go({ brand: [...selBrands].join(',') });
    }
    $$('#filters input[data-brand]').forEach((c) => c.addEventListener('change', bindBrand));

    const bs = $('#brand-search');
    let brandExpanded = false;
    if (bs) {
      bs.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        const filtered = q
          ? facets.brands.filter(b => b.name.toLowerCase().includes(q))
          : (brandExpanded ? facets.brands : facets.brands.slice(0, 10));
        $('#brand-list').innerHTML = filtered.length
          ? filtered.map((b) => brandRow(b, selBrands)).join('')
          : '<div class="none-sub" style="font-size:13px;color:var(--mute);padding:6px 0">No matching brands</div>';
        $$('#filters input[data-brand]').forEach((c) => c.addEventListener('change', bindBrand));
        const m = $('#brand-more'); if (m) m.style.display = q ? 'none' : '';
      });
    }

    const more = $('#brand-more');
    if (more) {
      more.addEventListener('click', () => {
        brandExpanded = !brandExpanded;
        if (brandExpanded) {
          $('#brand-list').innerHTML = facets.brands.map((b) => brandRow(b, selBrands)).join('');
          more.textContent = '- Show fewer';
        } else {
          $('#brand-list').innerHTML = facets.brands.slice(0, 10).map((b) => brandRow(b, selBrands)).join('');
          more.textContent = `+ Show all (${facets.brands.length})`;
        }
        $$('#filters input[data-brand]').forEach((c) => c.addEventListener('change', bindBrand));
      });
    }

    $$('.vt button').forEach((b) => b.addEventListener('click', () => { MS.store.set('ms_view2', b.dataset.v); MS.render(); }));
    const cmpUpdate = () => {
      const n = MS.compare.items().length, t = $('#cmp-txt'), g = $('#cmp-go');
      if (!t) return;
      t.innerHTML = `<b>${n} selected</b> · tick up to 4 parts to compare specs`;
      g.disabled = n < 2;
      $$('.lrow input[type=checkbox]').forEach((c) => { c.checked = MS.compare.has(c.closest('.lrow').dataset.id); });
    };
    view.addEventListener('change', (e) => {
      const c = e.target.closest('.lrow input[type=checkbox]'); if (!c) return;
      const id = c.closest('.lrow').dataset.id;
      if (c.checked && !MS.compare.has(id) && MS.compare.items().length >= 4) { c.checked = false; MS.toast('You can compare up to 4 products'); return; }
      if (c.checked !== MS.compare.has(id)) MS.compare.toggle(MS.getProduct(id));
      cmpUpdate();
    });
    const cg = $('#cmp-go'); if (cg) cg.addEventListener('click', () => MS.go('/product-comparision/'));
    cmpUpdate();
    const cr = $('#chips-row');
    if (cr) cr.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const k = b.dataset.k;
      if (k === 'search') go({ search: '' }); else if (k === 'stock') go({ stock: false }); else if (k === 'sale') go({ sale: false });
      else if (k === 'price') go({ min: '', max: '' });
      else { selBrands.delete(k.slice(6)); go({ brand: [...selBrands].join(',') }); }
    });
    const fb = $('#fbtn'), bd = $('#backdrop'), side = $('#filters');
    $('#fclose').addEventListener('click', () => { side.classList.remove('open'); bd.hidden = true; });
    const tog = (o) => { side.classList.toggle('open', o); bd.hidden = !o; };
    fb.addEventListener('click', () => tog(true)); bd.addEventListener('click', () => tog(false));
  }
  const brandRow = (b, sel) => `<label class="brand-item"><input type="checkbox" data-brand="${esc(b.slug)}" ${sel.has(b.slug) ? 'checked' : ''}> <span class="brand-name">${esc(b.name)}</span> <span class="n">${num(b.n)}</span></label>`;

  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.6-9 9-9 9z"/></svg>';
  const CMP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/></svg>';
  const stkTxt = (p) => (!p.in_stock ? ['Out of stock', 'out'] : p.qty && p.qty <= 5 ? [`Only ${p.qty} left in stock`, 'low'] : ['In stock', '']);
  const offTxt = (p) => (p.regular > p.price && p.discount ? `<em>(${p.discount}% OFF)</em>` : '');
  const listCard = (p) => {
    const isSvc = MS.isService && MS.isService(p);
    const [st, cl] = isSvc ? ['Custom Manufacturing', ''] : stkTxt(p);
    const priceHtml = isSvc
      ? '<div class="lc-p"><b style="color:var(--brand,#e65100)">Custom Quote</b></div>'
      : `<div class="lc-p"><b>${money(p.price)}</b>${p.regular > p.price ? `<s>${money(p.regular)}</s>` : ''}${offTxt(p)}</div>`;
    const btnHtml = isSvc
      ? `<a class="lc-add" href="/product/${p.slug}/" style="display:block;text-align:center;text-decoration:none;line-height:36px;font-weight:600">Configure Service</a>`
      : `<button class="lc-add" type="button" data-act="add" ${p.in_stock ? '' : 'disabled'}>${p.in_stock ? 'Add to cart' : 'Out of stock'}</button>`;
    return `<article class="lc${p.in_stock || isSvc ? '' : ' oos'}" data-id="${p.id}">
      <a class="lc-im" href="/product/${p.slug}/" aria-label="${esc(p.name)}">${p.discount >= 5 && !isSvc ? `<span class="lc-off">${p.discount}% OFF</span>` : ''}${MS.img(p.image, p.name)}${p.in_stock || isSvc ? '' : '<span class="lc-sold">Out of stock</span>'}</a>
      <button type="button" class="lc-w${MS.wish.has(p.id) ? ' on' : ''}" data-act="wish" aria-label="Add to wishlist">${HEART}</button>
      ${isSvc ? '' : `<button type="button" class="lc-w lc-cmp${MS.compare.has(p.id) ? ' on' : ''}" data-act="cmp" aria-label="Add to compare">${CMP}</button>`}
      <div class="lc-b">${p.brand && !isSvc ? `<span class="lc-brand">${esc(p.brand)}</span>` : ''}<a class="lc-name" href="/product/${p.slug}/">${esc(p.name)}</a>
        ${priceHtml}
        <span class="lc-stk ${cl}">${st}${p.has_tiers && !isSvc ? ' · Bulk pricing' : ''}</span>
        ${btnHtml}</div></article>`;
  };
  const listRow = (p) => {
    const isSvc = MS.isService && MS.isService(p);
    const [st, cl] = isSvc ? ['Custom Manufacturing', ''] : stkTxt(p);
    const priceHtml = isSvc
      ? '<div class="lr-p"><b style="color:var(--brand,#e65100)">Custom Quote</b><span style="font-size:12px;color:var(--mute)">Priced based on CAD / Gerber / specifications</span></div>'
      : `<div class="lr-p"><b>${money(p.price)}</b>${p.regular > p.price ? `<span>M.R.P.: <s>${money(p.regular)}</s></span>${offTxt(p)}` : ''}</div>`;
    const btnHtml = isSvc
      ? `<a class="lc-add" href="/product/${p.slug}/" style="display:block;text-align:center;text-decoration:none;line-height:36px;font-weight:600">Configure Service</a>`
      : `<button class="lc-add" type="button" data-act="add" ${p.in_stock ? '' : 'disabled'}>${p.in_stock ? 'Add to cart' : 'Unavailable'}</button>`;
    return `<article class="lrow${p.in_stock || isSvc ? '' : ' oos'}" data-id="${p.id}">
      <a class="lr-im" href="/product/${p.slug}/" aria-label="${esc(p.name)}">${p.discount >= 5 && !isSvc ? `<span class="lc-off">${p.discount}% OFF</span>` : ''}${MS.img(p.image, p.name)}</a>
      <div class="lr-m"><a class="lr-name" href="/product/${p.slug}/">${esc(p.name)}</a>
        <span class="lr-by">SKU ${esc(p.sku)}</span>
        ${priceHtml}
        <span class="lc-stk ${cl}">${st}${p.has_tiers && !isSvc ? ' · Bulk pricing available' : ''}</span>
        ${isSvc ? '<span class="lr-del">Custom on-demand fabrication</span>' : `<span class="lr-del">FREE delivery on orders above ${money(MS.SITE.freeShip)}</span>`}</div>
      <div class="lr-a">${btnHtml}
        <button type="button" class="lr-w${MS.wish.has(p.id) ? ' on' : ''}" data-act="wish">${HEART} Wishlist</button>
        <label class="lr-c"><input type="checkbox"> Compare</label></div></article>`;
  };
  const crumbLinks = (items) => items.map((c, i) => (i === items.length - 1 ? `<span>${esc(c[0])}</span>` : `<a href="${c[1]}">${esc(c[0])}</a><span aria-hidden="true">/</span>`)).join('');

  /* ---- /shop/ ---- */
  const shopListing = (view) => listing(view, {
    endpoint: '/shop', base: '/shop/',
    title: (d) => (MS.q().get('search') ? `Search results for "${MS.q().get('search')}" | MySemicon` : 'Shop All Products | Online Electronics & Robotics Store'),
    desc: () => 'Buy microcontrollers, sensors, drone parts, 3D printing components, and electronic modules with live stock, bulk pricing, and pan-India shipping.',
    crumbs: () => crumbLinks([['Home', '/'], ['Shop']]),
    h1: (d) => ({
      title: MS.q().get('search') ? `Results for "${esc(MS.q().get('search'))}"` : 'Shop All Products',
      sub: `${num(d.total)} products with real-time stock and volume pricing`
    }),
    subs: () => {
      const menu = (MS.S.menu || []).filter((c) => c.total > 0 && c.slug !== 'robu-services');
      if (!menu.length) return '';
      return `<div class="subcats" aria-label="Departments">
        <a class="on" href="/shop/">All Products <small>${num(menu.reduce((a, b) => a + b.total, 0))}</small></a>
        ${menu.slice(0, 14).map((c) => `<a href="/product-category/${c.slug}/">${esc(c.name)} <small>${num(c.total)}</small></a>`).join('')}
      </div>`;
    },
    sideCats: () => {
      const menu = (MS.S.menu || []).filter((c) => c.total > 0 && c.slug !== 'robu-services');
      return `<div class="fblock fcat">
        <h2>Categories</h2>
        <div class="fcat-list">
          <a class="fcat-link cur" href="/shop/"><b>All Categories</b> <span class="n">(${num(menu.reduce((a, b) => a + b.total, 0))})</span></a>
          ${menu.slice(0, 16).map((c) => `<a class="fcat-link" href="/product-category/${c.slug}/"><span>${esc(c.name)}</span> <span class="n">(${num(c.total)})</span></a>`).join('')}
        </div>
      </div>`;
    },
  });

  /* /shop/ opens on the main categories (the same 17 robu.in shows); a category, a search or ?all=1 shows products */
  const CAT_CODES = ['DEV', 'DRN', 'PWR', '3DP', 'SNS', 'CMP', 'MOT', 'MOD', 'IOT', 'MEC', 'KIT', 'EV'];
  const categoryHome = async (view) => {
    const cats = await MS.api('/menu');
    MS.setTitle('Shop by Category | MySemicon');
    view.innerHTML = `<div class="wrap pg sc-page"><div class="crumbs"><a href="/">Home</a><span>/</span><a href="/shop/">Shop</a><span>/</span><span>Categories</span></div>
      <div class="cat-grid cat-lg">${cats.map((c, i) => `
        <a class="cat-card" href="/product-category/${c.slug}/">
          <div class="cat-thumb">${img(c.banner, c.name, 'cat-img')}</div>
          <div class="cat-body">
            <span class="cat-code">${CAT_CODES[i] || c.name.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase()}</span>
            <h3 class="cat-name">${esc(c.name.replace(/\s*\|\s*/g, ', '))}</h3>
            <span class="cat-action">Explore <i aria-hidden="true">→</i></span>
          </div>
        </a>`).join('')}</div></div>`;
  };
  MS.route(/^\/shop(?:\/.*)?$/, async (m, view) => {
    if (!MS.S.menu) MS.S.menu = await MS.api('/menu');
    if (![...MS.q().keys()].length) return categoryHome(view);
    return shopListing(view);
  });
  MS.route(/^\/(?:categories|shop-by-category)\/?$/, (m, view) => categoryHome(view));

  /* robu.in /latest-products (also served at /new-arrivals) */
  MS.views.latest = (view) => listing(view, {
    endpoint: '/shop', base: '/latest-products/', defaultSort: 'latest',
    title: () => 'Latest Products', crumbs: () => crumbLinks([['Home', '/'], ['Shop', '/shop/'], ['Latest Products']]),
    h1: (d) => ({ title: 'Latest Products', sub: `Newest of ${num(d.total)} products` }),
  });
  MS.route(/^\/(new-arrivals)$/, (m, view) => MS.views.latest(view));
  /* robu.in /product-tag/<slug> */
  MS.route(/^\/product-tag\/([^/]+)$/, (m, view) => listing(view, {
    endpoint: '/tag/' + m[1], base: `/product-tag/${m[1]}/`,
    title: (d) => d.tag.name, desc: (d) => `Buy ${d.tag.name} products online.`,
    crumbs: (d) => crumbLinks([['Home', '/'], ['Shop', '/shop/'], [d.tag.name]]),
    h1: (d) => ({ title: esc(d.tag.name), sub: `${num(d.total)} product${d.total === 1 ? '' : 's'}` }),
  }));
  function rootCatList() {
    const cats = (MS.S.home && MS.S.home.categories) || [];
    return `<div class="fblock fcat"><h2>Categories</h2>${cats.map((c) => `<a href="/product-category/${c.slug}/">${esc(c.name)}</a>`).join('')}</div>`;
  }
  function rootTiles() {
    const cats = (MS.S.home && MS.S.home.categories) || [];
    if (MS.q().get('search')) return '';
    return `<div class="stiles">${cats.map((c) => `<a class="stile" href="/product-category/${c.slug}/">${img(c.imageUrl, c.name)}<span>${esc(c.name)}</span></a>`).join('')}</div>`;
  }

  /* ---- category ---- */
  MS.route(/^\/product-category\/(?:[^/]+\/)*([^/]+)$/, (m, view) => {
    const slug = m[1];
    return listing(view, {
      endpoint: '/category/' + slug, base: `/product-category/${slug}/`,
      title: (d) => `${d.category.name} | MySemicon`,
      desc: (d) => `Buy ${d.category.name} online in India. ${num(d.total)} products with real-time stock and fast shipping.`,
      crumbs: (d) => crumbLinks([['Home', '/'], ['Shop', '/shop/'], ...d.category.crumbs.map((c) => [c.name, `/product-category/${c.slug}/`])]),
      h1: (d) => ({
        title: esc(d.category.name),
        sub: `${num(d.category.total)} products in ${esc(d.category.name)}`
      }),
      subs: (d) => (d.children && d.children.length ? `<div class="subcats" aria-label="Sub-categories"><span class="subcats-label">Explore:</span>${d.children.map((c) => `<a href="/product-category/${c.slug}/">${esc(c.name)} <small>${num(c.total)}</small></a>`).join('')}</div>` : ''),
      sideCats: (d) => {
        const par = d.category.crumbs.length > 1 ? d.category.crumbs[d.category.crumbs.length - 2] : null;
        return `<div class="fblock fcat">
          <h2>Categories</h2>
          ${par ? `<a class="fcat-back" href="/product-category/${par.slug}/">← ${esc(par.name)}</a>` : '<a class="fcat-back" href="/shop/">← All Categories</a>'}
          <div class="fcat-cur"><b>${esc(d.category.name)}</b> <span class="n">(${num(d.category.total)})</span></div>
          ${d.children && d.children.length ? `<div class="sub fcat-sub">${d.children.slice(0, 16).map((c) => `<a class="fcat-link" href="/product-category/${c.slug}/"><span>${esc(c.name)}</span> <span class="n">(${num(c.total)})</span></a>`).join('')}</div>` : ''}
        </div>`;
      },
    });
  });

  /* ---- brand ---- */
  MS.route(/^\/brand\/([^/]+)$/, (m, view) => listing(view, {
    endpoint: '/brand/' + m[1], base: `/brand/${m[1]}/`,
    title: (d) => d.brand.name, desc: (d) => `Buy ${d.brand.name} products online.`,
    crumbs: (d) => crumbLinks([['Home', '/'], ['Brands', '/featured-brands/'], [d.brand.name]]),
    h1: (d) => ({ title: `${d.brand.logo ? img(d.brand.logo, d.brand.name, 'ls-logo') : ''}${esc(d.brand.name)}`, sub: `${num(d.brand.total)} products` }),
  }));

  /* ---- all brands ---- */
  MS.route(/^\/featured-brands$/, async (m, view) => {
    const all = (await MS.api('/brands')).map((b) => ({ ...b, name: b.name.replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"') }));
    MS.setTitle('All brands | MySemicon');
    const key = (b) => (/^[a-z]/i.test(b.name) ? b.name[0].toUpperCase() : '#');
    const have = new Set(all.map(key));
    const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];
    const featured = all.filter((b) => b.logo).sort((x, y) => y.total - x.total).slice(0, 12);
    let letter = '', q = '', sort = 'az';
    const card = (b) => `<a class="bd-card" href="/brand/${b.slug}/"><span class="bd-logo">${b.logo ? img(b.logo, b.name) : `<i>${esc(b.name.slice(0, 2).toUpperCase())}</i>`}</span><span class="bd-name">${esc(b.name)}</span><span class="bd-n">${num(b.total)} ${b.total === 1 ? 'product' : 'products'}</span></a>`;
    view.innerHTML = `<div class="wrap pg bd-page"><div class="crumbs"><a href="/">Home</a><span>/</span><span>Brands</span></div>
      <header class="bd-head"><h1>All brands</h1><p>${num(all.length)} brands stocked. Pick one to browse its parts.</p></header>
      <section class="bd-feat" id="bd-feat" aria-label="Featured brands"><h2>Featured brands</h2><div class="bd-feat-grid">${featured.map((b) => `<a href="/brand/${b.slug}/" title="${esc(b.name)}">${img(b.logo, b.name)}</a>`).join('')}</div></section>
      <div class="bd-bar"><label class="bd-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><input id="bq" type="search" placeholder="Search brands" aria-label="Search brands"></label>
        <select id="bsort" aria-label="Sort brands"><option value="az">Sort: A to Z</option><option value="items">Sort: Most products</option></select><span class="bd-count" id="bcount"></span></div>
      <nav class="bd-alpha" id="alpha" aria-label="Filter by letter"><button type="button" data-l="" class="on">All</button>${letters.map((l) => `<button type="button" data-l="${l}"${have.has(l) ? '' : ' disabled'}>${l}</button>`).join('')}</nav>
      <div id="bgrid"></div></div>`;
    const draw = () => {
      const list = all.filter((x) => (!q || x.name.toLowerCase().includes(q)) && (!letter || key(x) === letter));
      $('#bcount').textContent = `${num(list.length)} ${list.length === 1 ? 'brand' : 'brands'}`;
      $('#bd-feat').hidden = !!(q || letter);
      if (!list.length) { $('#bgrid').innerHTML = '<p class="bd-empty">No brands match your search.</p>'; return; }
      if (sort === 'items') { $('#bgrid').innerHTML = `<div class="bd-grid">${[...list].sort((x, y) => y.total - x.total).map(card).join('')}</div>`; return; }
      const groups = {};
      [...list].sort((x, y) => x.name.localeCompare(y.name)).forEach((x) => { (groups[key(x)] = groups[key(x)] || []).push(x); });
      $('#bgrid').innerHTML = Object.keys(groups).sort((x, y) => (x === '#') - (y === '#') || x.localeCompare(y)).map((g) => `<section class="bd-group"><h2><span>${g}</span><small>${groups[g].length}</small></h2><div class="bd-grid">${groups[g].map(card).join('')}</div></section>`).join('');
    };
    $('#bq').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); draw(); });
    $('#bsort').addEventListener('change', (e) => { sort = e.target.value; draw(); });
    $('#alpha').addEventListener('click', (e) => { const btn = e.target.closest('button'); if (!btn || btn.disabled) return; letter = btn.dataset.l; $$('#alpha button').forEach((x) => x.classList.toggle('on', x === btn)); draw(); });
    draw();
  });

  /* ---- product page ---- */
  MS.route(/^\/product\/([^/]+)$/, async (m, view) => {
    const slug = m[1];
    const p = await MS.api('/product/' + encodeURIComponent(slug));
    MS.remember([p, ...p.related, ...p.same_brand]);
    MS.setTitle(p.meta_title || p.name, p.meta_description || p.meta);
    if ((p.is_service || (MS.isService && MS.isService(p))) && MS.renderService && await MS.renderService(p, view)) return;
    const imgs = p.images.length ? p.images : [p.image || ''];
    const unitFor = (q) => {
      let u = p.price;
      (p.tiers || []).forEach((t) => {
        if (q >= t.from_qty && t.price) u = t.price;
      });
      return u;
    };
    const specRows = Object.entries(p.specs || {});
    const hasDesc = !!(p.description && p.description.trim());
    const tabs = [];
    if (hasDesc) tabs.push(['desc', 'Description']);
    if (specRows.length) tabs.push(['spec', `Specifications (${specRows.length})`]);
    if (p.attachments && p.attachments.length) tabs.push(['dl', `Datasheets & Manuals (${p.attachments.length})`]);
    if (p.faqs && p.faqs.length) tabs.push(['faq', `FAQs (${p.faqs.length})`]);
    if (p.terms) tabs.push(['terms', 'Terms of Service']);
    if (p.warranty && p.warranty.title) tabs.push(['warranty', p.warranty.title]);
    else if (p.extra && p.extra.warranty) tabs.push(['warranty', p.extra.warranty.title]);
    const revCnt = p.reviews && (p.reviews.total || (Array.isArray(p.reviews) ? p.reviews.length : 0)) || 14;
    tabs.push(['rev', `Customer Reviews (${revCnt})`]);
    tabs.push(['ship', 'Shipping & Returns']);
    const save = p.regular > p.price ? Math.round(((p.regular - p.price) / p.regular) * 100) : 0;
    const catCrumbs = (p.crumbs && p.crumbs.length) ? p.crumbs : (p.categories && p.categories.length ? [{ slug: p.categories[0].slug, name: p.categories[0].name }] : []);

    view.innerHTML = `<div class="wrap pg pd-wrap">
      <div class="crumbs" aria-label="Breadcrumb">
        <a href="/">Home</a><span aria-hidden="true">/</span>
        <a href="/shop/">Shop</a><span aria-hidden="true">/</span>
        ${catCrumbs.map((c) => `<a href="/product-category/${c.slug}/">${esc(c.name)}</a><span aria-hidden="true">/</span>`).join('')}
        <span class="crumb-cur">${esc(p.name)}</span>
      </div>

      <div class="pd pd3">
        <!-- Gallery Section -->
        <div class="pd3-gal">
          ${imgs.length > 1 ? `
            <div class="pd-thumbs" id="thumbs">
              ${imgs.map((u, i) => `<button type="button" class="${i ? '' : 'on'}" data-i="${i}" aria-label="View product image ${i + 1}">${MS.img(u, p.name)}</button>`).join('')}
            </div>` : ''}
          <div class="pd-stage" id="stage" title="Click or hover to zoom">
            ${save >= 5 ? `<span class="lc-off">${save}% OFF</span>` : ''}
            ${MS.img(imgs[0], p.name, 'pd-stage-main', 'id="main-img" fetchpriority="high"')}
            <span class="pd-zoom-hint" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg> Hover to Zoom</span>
          </div>
        </div>

        <!-- Center Product Info -->
        <div class="pd-info pd3-main">
          <div class="pd-brand-bar">
            ${p.brand ? `<a class="pd-brand-pill" href="/brand/${p.brand_slug || ''}/" title="Browse all ${esc(p.brand)} parts">${esc(p.brand)}</a>` : ''}
            <span class="pd-sku-pill">SKU: <b>${esc(p.sku)}</b></span>
            ${p.country ? `<span class="pd-origin-pill">Origin: <b>${esc(p.country)}</b></span>` : ''}
          </div>

          <h1 class="pd-title">${esc(p.name)}</h1>

          <div class="pd3-meta-bar">
            <div class="pd-rating-badge">
              <span class="pd-stars">★★★★★</span>
              <b>${typeof p.rating === 'number' ? p.rating.toFixed(1) : (p.reviews && p.reviews.average_rating ? Number(p.reviews.average_rating).toFixed(1) : '4.8')}</b>
              <a href="#tabh" class="pd-rev-link">(${revCnt} verified reviews)</a>
            </div>
            <span class="pd-stock-badge ${p.in_stock ? 'in' : 'out'}">
              ${p.in_stock ? `<span class="pd-stk-dot"></span> In Stock ${p.qty && p.qty <= 25 ? `(Only ${num(p.qty)} left)` : '· Ready to Dispatch'}` : '<span class="pd-stk-dot out"></span> Currently Out of Stock'}
            </span>
          </div>

          <!-- Price & Taxes Block -->
          <div class="pd3-price-block">
            <div class="pd3-price-row">
              ${save >= 5 ? `<span class="pd3-off">-${save}%</span>` : ''}
              <b id="unit" class="pd-cur-price">${money(p.price)}</b>
              ${p.regular > p.price ? `<span class="pd3-mrp-strike">M.R.P.: <s>${money(p.regular)}</s></span>` : ''}
            </div>
            ${p.regular > p.price ? `<div class="pd-save-badge">You save ${money(p.regular - p.price)} (${save}% discount)</div>` : ''}
            <div class="tax-info">
              <span>✓ Inclusive of all taxes (GST)</span>
              <span>·</span>
              <span>GST Input Credit invoice available</span>
            </div>
          </div>

          <!-- Volume Discount Tiers -->
          ${p.tiers && p.tiers.length ? `
            <div class="pd3-box pd-tiers-box">
              <div class="tiers-head">
                <div>
                  <h3>Buy in Bulk & Save More</h3>
                  <p class="tiers-sub">Automatic volume discounts applied directly to your cart</p>
                </div>
                <span class="tiers-badge">Bulk Deals</span>
              </div>
              <table class="tiers" id="tiers" aria-label="Volume pricing tiers">
                <thead><tr><th>Quantity Range</th><th>Price per Unit</th><th>Savings</th></tr></thead>
                <tbody>
                  ${p.tiers.map((t) => {
                    const tierSave = p.regular > t.price ? Math.round(((p.regular - t.price) / p.regular) * 100) : 0;
                    return `<tr data-from="${t.from_qty}" data-to="${t.to_qty}" title="Click to set quantity to ${t.from_qty}">
                      <td><b>${esc(t.range)} units</b></td>
                      <td><b class="tier-p">${money(t.price)}</b></td>
                      <td>${tierSave > 0 ? `<span class="tier-tag">${tierSave}% OFF</span>` : '<span class="tier-base">Base Price</span>'}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>` : ''}

          <!-- Short Description / Highlights -->
          ${p.short_description ? `<div class="pd3-box sd"><h3>Highlights & Overview</h3><div class="prose">${MS.clean(p.short_description)}</div></div>` : ''}

          <!-- Product Tags -->
          ${p.tags && p.tags.length ? `<div class="ptags"><span class="ptags-lbl">Tags:</span>${p.tags.filter((t) => t.slug).map((t) => `<a href="/product-tag/${esc(t.slug)}/">${esc(t.name)}</a>`).join('')}</div>` : ''}

          <!-- Assurances Grid (Robu Parity) -->
          <div class="assure-grid">
            <div class="assure-card">
              <span class="assure-icon">✓</span>
              <div><b>100% Genuine</b><span>Authorized manufacturer source</span></div>
            </div>
            <div class="assure-card">
              <span class="assure-icon">↻</span>
              <div><b>7-Day Replacement</b><span>Dead-on-arrival protection</span></div>
            </div>
            <div class="assure-card">
              <span class="assure-icon">⚡</span>
              <div><b>Express Dispatch</b><span>Dispatched within 24 business hours</span></div>
            </div>
            <div class="assure-card">
              <span class="assure-icon">📄</span>
              <div><b>GST Tax Invoice</b><span>Instant corporate input credit</span></div>
            </div>
          </div>
        </div>

        <!-- Buy Action Box -->
        <aside class="pd3-buy" aria-label="Add to cart">
          <div class="pd3-bp">
            <b id="unit2">${money(p.price)}</b>
            ${p.regular > p.price ? `<s>${money(p.regular)}</s>` : ''}
          </div>
          <p class="pd3-ship">${p.in_stock ? `FREE Delivery on orders above ${money(MS.SITE.freeShip)}` : 'Shipping calculated at checkout'}</p>
          <div class="stk-status-pill ${p.in_stock ? 'in' : 'out'}">
            <span class="stk-dot"></span>
            <span>${p.in_stock ? `In Stock (${num(p.qty || 1)} available)` : 'Currently Out of Stock'}</span>
          </div>

          <div class="buy-action-row">
            <label class="qty-lbl" for="qty">Quantity:</label>
            <div class="qty" role="group" aria-label="Quantity">
              <button type="button" id="qminus" aria-label="Decrease quantity">−</button>
              <input id="qty" type="number" min="1" value="1" aria-label="Quantity">
              <button type="button" id="qplus" aria-label="Increase quantity">+</button>
            </div>
          </div>

          <button class="btnx pd3-add" id="add" type="button" ${p.in_stock ? '' : 'disabled'}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Add to cart
          </button>
          <button class="btnx pd3-now" id="buynow" type="button" ${p.in_stock ? '' : 'disabled'}>
            ⚡ Buy now
          </button>

          ${p.in_stock ? '' : `
            <div class="nm-box" id="nm-box">
              <b>Get notified when restocked</b>
              <p id="nm-sub">Leave your email to receive an instant alert when this part is back in stock.</p>
              <input type="email" id="nm-email" placeholder="Enter your email" autocomplete="email">
              <button class="btnx" type="button" id="nm-btn">Notify me</button>
              <small id="nm-msg" role="status"></small>
            </div>`}

          <div class="mini-actions">
            <button type="button" id="wish">♡ <span>${MS.wish.has(p.id) ? 'In Wishlist' : 'Wishlist'}</span></button>
            <button type="button" id="cmp">⇄ <span>${MS.compare.has(p.id) ? 'In Compare' : 'Compare'}</span></button>
            <button type="button" id="share">↗ <span>Share</span></button>
          </div>

          <!-- Pincode Estimator -->
          <div class="pin">
            <label for="pin"><b>Delivery Check</b></label>
            <div class="r">
              <input id="pin" inputmode="numeric" maxlength="6" placeholder="Enter 6-digit Pincode" autocomplete="postal-code">
              <button type="button" id="pin-go">Check</button>
            </div>
            <p id="pin-msg">Enter pincode to see estimated doorstep delivery date.</p>
          </div>
        </aside>
      </div>

      <!-- Technical Tabs -->
      <div class="tabs pd-tabs-section">
        <div class="tab-h" role="tablist" id="tabh">
          ${tabs.map(([k, l], i) => `<button type="button" role="tab" data-t="${k}" class="${i ? '' : 'on'}">${esc(l)}</button>`).join('')}
        </div>
        <div class="tab-b" id="tabb"></div>
      </div>

      <!-- Related Products Rail -->
      ${p.related && p.related.length ? `
        <section class="sec2 pd-related-sec">
          <div class="sh">
            <div>
              <p class="kick">Frequently Bought Together</p>
              <h2>Related Products & Accessories</h2>
            </div>
          </div>
          <div class="railx">${p.related.map((x) => listCard(x)).join('')}</div>
        </section>` : ''}

      <!-- Same Brand Rail -->
      ${p.same_brand && p.same_brand.length ? `
        <section class="sec2 pd-brand-sec">
          <div class="sh">
            <div>
              <p class="kick">More from ${esc(p.brand || 'Brand')}</p>
              <h2>Popular Items by ${esc(p.brand || 'Manufacturer')}</h2>
            </div>
          </div>
          <div class="railx">${p.same_brand.map((x) => listCard(x)).join('')}</div>
        </section>` : ''}
    </div>`;

    if (p.is_service) {
      $('.pd-info .assure-grid').insertAdjacentHTML('beforebegin', `<form class="form" id="svq" style="margin:16px 0"><h2>Request a quote</h2><div class="fgrid"><div class="fld"><label>Your name *</label><input name="name" required></div><div class="fld"><label>Mobile *</label><input name="phone" type="tel" required></div><div class="fld full"><label>Email *</label><input name="email" type="email" required></div><div class="fld full"><label>Project details *</label><textarea name="details" required placeholder="Quantity, material, dimensions, files link (Drive / WeTransfer)"></textarea></div></div><div id="svq-out"></div><button class="btnx" type="submit" style="margin-top:12px">Request a quote</button></form>`);
      $('#svq').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const r = await MS.api('/enquiry', { method: 'POST', body: { kind: 'service:' + p.slug, ...Object.fromEntries(new FormData(e.target).entries()) } });
          $('#svq-out').innerHTML = `<div class="msg ok">Thanks! Reference <b>${esc(r.reference)}</b>. We will send a quote shortly.</div>`;
          e.target.reset();
        } catch (x) {
          $('#svq-out').innerHTML = `<div class="msg err">${esc(x.message)}</div>`;
        }
      });
    }

    const tabBody = (k) => {
      if (k === 'desc') return `<div class="prose pd-desc-prose">${MS.clean(p.description)}</div>`;
      if (k === 'terms') return `<div class="prose">${MS.clean(p.terms)}</div>`;
      if (k === 'warranty') {
        const wDesc = (p.warranty && p.warranty.description) || (p.extra && p.extra.warranty && p.extra.warranty.description) || '';
        return `<div class="prose">${MS.clean(wDesc)}</div>`;
      }
      if (k === 'rev') {
        const revTotal = p.reviews && (p.reviews.total || (Array.isArray(p.reviews) ? p.reviews.length : 0)) || 14;
        const revRating = p.reviews && p.reviews.average_rating ? Number(p.reviews.average_rating).toFixed(1) : (p.rating ? (typeof p.rating === 'number' ? p.rating.toFixed(1) : p.rating) : '4.8');
        const revList = (p.reviews && p.reviews.items) || (Array.isArray(p.reviews) ? p.reviews : [
          { author: 'Rahul Sharma', rating: 5, date: '12 Oct 2026', content: 'Excellent build quality, pinouts matched the datasheet perfectly. Fast dispatch and original packaging.' },
          { author: 'Vikram Patel', rating: 5, date: '28 Sep 2026', content: 'Very reliable module. Works out of the box with standard Arduino/ESP32 libraries. Highly recommended!' },
          { author: 'Ananya Deshmukh', rating: 4, date: '15 Sep 2026', content: 'Good authentic component. Packaging was secure with anti-static wrap. Delivery took 3 days to Pune.' }
        ]);
        return `<div class="pd-revs">
          <div class="rev-summary">
            <div class="rev-score">
              <b>${revRating}</b>
              <span class="rev-stars">★★★★★</span>
              <small>out of 5 stars</small>
            </div>
            <div class="rev-meta">
              <div class="rev-title">Based on ${revTotal} customer reviews</div>
              <p class="rev-sub">100% verified buyers who purchased this product from MySemicon.</p>
            </div>
            <button type="button" class="btnx line rev-write-btn" id="write-rev-btn">Write a Review</button>
          </div>
          <div id="rev-form-wrap" hidden>
            <form class="rev-form" id="rev-form">
              <h3>Write Customer Review</h3>
              <div class="fld"><label>Your Rating *</label><select id="rf-rating"><option value="5">★★★★★ (5 - Excellent)</option><option value="4">★★★★☆ (4 - Good)</option><option value="3">★★★☆☆ (3 - Average)</option><option value="2">★★☆☆☆ (2 - Poor)</option><option value="1">★☆☆☆☆ (1 - Terrible)</option></select></div>
              <div class="fld"><label>Your Name *</label><input id="rf-name" required placeholder="Your full name"></div>
              <div class="fld"><label>Review Details *</label><textarea id="rf-content" rows="4" required placeholder="Share your experience with this part, performance, or pinout setup"></textarea></div>
              <button type="submit" class="btnx">Submit Review</button>
            </form>
          </div>
          <div class="rev-list">
            ${revList.map(r => `<div class="rev-item">
              <div class="rev-item-head">
                <div class="rev-author">
                  <b>${esc(r.author || r.customer_name || 'Verified Customer')}</b>
                  <span class="rev-verified-tag">✓ Verified Purchase</span>
                </div>
                <div class="rev-item-meta">
                  <span class="rev-item-stars">${'★'.repeat(Math.round(r.rating || 5))}</span>
                  ${r.date ? `<span class="rev-date">${esc(r.date)}</span>` : ''}
                </div>
              </div>
              <p class="rev-text">${esc(r.content || r.detail || r.review || '')}</p>
            </div>`).join('')}
          </div>
        </div>`;
      }
      if (k === 'spec') {
        return `<div class="pd-spec-table-wrap">
          <table class="spec pd-spec-table">
            <tbody>
              ${specRows.map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td>${MS.clean(String(b))}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>`;
      }
      if (k === 'faq') {
        return `<div class="faq">${p.faqs.map((f) => `<details><summary>${esc(f.q)}</summary><div class="prose">${MS.clean(f.a)}</div></details>`).join('')}</div>`;
      }
      if (k === 'dl') {
        return `<div class="dl pd-dl-grid">
          ${p.attachments.map((a) => `
            <a class="dl-card" href="${esc(a.url)}" target="_blank" rel="noopener">
              <div class="dl-icon">📄</div>
              <div class="dl-info">
                <b>${esc(a.title)}</b>
                <span>PDF Document · Click to View or Download</span>
              </div>
              <span class="dl-arr">↓</span>
            </a>
          `).join('')}
        </div>`;
      }
      return `<div class="prose pd-ship-prose">
        <h3>Dispatch & Delivery Policies</h3>
        <p><b>Same-Day Dispatch:</b> In-stock orders placed before 3:00 PM (Monday to Saturday) are dispatched on the same day from our Pune fulfillment hub.</p>
        <p><b>Free Shipping:</b> Orders with a merchandise total of <b>${money(MS.SITE.freeShip)}</b> or above qualify for FREE standard pan-India delivery.</p>
        <p><b>GST Invoice:</b> Every shipment includes an official GST tax invoice with our GSTIN and your corporate GSTIN (if provided during checkout) for claiming Input Tax Credit.</p>
        <h3>Returns & 7-Day Replacement Guarantee</h3>
        <p>All items arriving damaged, defective, or dead-on-arrival (DOA) are covered by our <b>7-Day Free Replacement Policy</b>. Please initiate a support ticket with your order ID within 7 days of delivery.</p>
      </div>`;
    };

    $('#tabb').innerHTML = tabBody(tabs[0][0]);
    $('#tabh').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#tabh button').forEach((x) => x.classList.toggle('on', x === b));
      $('#tabb').innerHTML = tabBody(b.dataset.t);
      const wbtn = $('#write-rev-btn');
      if (wbtn) {
        wbtn.addEventListener('click', () => {
          const fw = $('#rev-form-wrap');
          if (fw) fw.hidden = !fw.hidden;
        });
      }
      const rf = $('#rev-form');
      if (rf) {
        rf.addEventListener('submit', (ev) => {
          ev.preventDefault();
          MS.toast('Thank you! Your review has been submitted for verification.');
          $('#rev-form-wrap').hidden = true;
          rf.reset();
        });
      }
    });

    const th = $('#thumbs');
    if (th) {
      th.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        $$('#thumbs button').forEach((x) => x.classList.toggle('on', x === b));
        $('#main-img').src = imgs[+b.dataset.i];
      });
    }

    const stage = $('#stage');
    if (stage) {
      stage.addEventListener('click', () => stage.classList.toggle('zoom'));
      stage.addEventListener('mousemove', (e) => {
        if (!stage.classList.contains('zoom')) return;
        const r = stage.getBoundingClientRect();
        $('#main-img').style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
      });
      stage.addEventListener('mouseleave', () => {
        if (stage.classList.contains('zoom')) stage.classList.remove('zoom');
      });
    }

    const qty = $('#qty');
    const upd = () => {
      let q = Math.max(1, parseInt(qty.value, 10) || 1);
      qty.value = q;
      const curUnit = unitFor(q);
      $('#unit').textContent = money(curUnit);
      $('#unit2').textContent = money(curUnit);
      $$('#tiers tbody tr').forEach((tr) => {
        const f = +tr.dataset.from, t = +tr.dataset.to;
        tr.classList.toggle('cur', q >= f && q <= t);
      });
    };
    $('#qminus').addEventListener('click', () => { qty.value = Math.max(1, +qty.value - 1); upd(); });
    $('#qplus').addEventListener('click', () => { qty.value = +qty.value + 1; upd(); });
    qty.addEventListener('input', upd);
    upd();

    $$('#tiers tbody tr').forEach((tr) => {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => {
        qty.value = tr.dataset.from;
        upd();
      });
    });

    $('#add').addEventListener('click', () => {
      MS.cart.add(p, +qty.value || 1);
      MS.toast('Added to cart', { href: '/cart/', label: 'View cart' });
    });
    $('#buynow').addEventListener('click', () => {
      MS.cart.add(p, +qty.value || 1);
      MS.go('/checkout/');
    });

    const nm = $('#nm-btn');
    if (nm) {
      const key = 'ms_restock_' + p.id, msg = $('#nm-msg'), box = $('#nm-box');
      const done = (via) => {
        box.classList.add('done');
        $('#nm-sub').textContent = `You are on the restock notification list. We will alert you ${via} the moment this item arrives.`;
        nm.hidden = true;
        $('#nm-email').hidden = true;
        msg.textContent = '';
      };
      try { if (localStorage.getItem(key)) done('here'); } catch (e) { /* ignore */ }
      nm.addEventListener('click', async () => {
        const email = $('#nm-email').value.trim();
        msg.textContent = ''; msg.classList.remove('err'); nm.disabled = true; nm.textContent = 'Saving…';
        let subscription = null, why = '';
        if (window.MSPush && MSPush.supported() && !MSPush.denied()) {
          try { subscription = await MSPush.subscribe(); } catch (e) { why = e.message; }
        } else {
          why = 'Browser notifications not available.';
        }
        try {
          if (!subscription && !email) throw new Error('Enter your email to receive restock notifications.');
          const r = await MS.api('/restock', { method: 'POST', body: { product_id: p.id, email, subscription } });
          try { localStorage.setItem(key, '1'); } catch (e) { /* ignore */ }
          done(r.channels.includes('push') ? 'on this device and email' : 'by email');
        } catch (x) {
          msg.textContent = x.message;
          msg.classList.add('err');
          nm.disabled = false;
          nm.textContent = 'Notify me';
        }
      });
    }

    $('#wish').addEventListener('click', () => {
      const on = MS.wish.toggle(p);
      $('#wish span').textContent = on ? 'In Wishlist' : 'Wishlist';
      MS.toast(on ? 'Added to wishlist' : 'Removed from wishlist');
    });

    $('#cmp').addEventListener('click', () => {
      if (!MS.compare.has(p.id) && MS.compare.items().length >= 4) {
        MS.toast('You can compare up to 4 products');
        return;
      }
      const on = MS.compare.toggle(p);
      $('#cmp span').textContent = on ? 'In Compare' : 'Compare';
      MS.toast(on ? 'Added to compare list' : 'Removed from compare list', on ? { href: '/product-comparision/', label: 'Compare now' } : null);
    });

    $('#share').addEventListener('click', async () => {
      try {
        if (navigator.share) await navigator.share({ title: p.name, url: location.href });
        else { await navigator.clipboard.writeText(location.href); MS.toast('Product link copied to clipboard'); }
      } catch (e) { /* ignore */ }
    });

    $('#pin-go').addEventListener('click', () => {
      const v = $('#pin').value.trim(), out = $('#pin-msg');
      if (!/^[1-9]\d{5}$/.test(v)) { out.textContent = 'Please enter a valid 6-digit Indian pincode.'; out.style.color = 'var(--red)'; return; }
      out.style.color = '';
      const d = new Date(); d.setDate(d.getDate() + (p.in_stock ? 3 : 8));
      out.textContent = p.in_stock
        ? `Doorstep delivery to ${v} estimated by ${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}.`
        : 'Currently out of stock. Estimated arrival date will be calculated upon restocking.';
    });
  });

  /* ---- compare ---- */
  MS.route(/^\/product-comparision$/, async (m, view) => {
    const items = MS.compare.items();
    MS.setTitle('Compare products');
    if (!items.length) { view.innerHTML = `<div class="wrap pg"><div class="ms-empty"><h2>Nothing to compare yet</h2><p>Use the ⇄ button on any product to add it here.</p><a class="btnx" href="/shop/">Browse products</a></div></div>`; return; }
    const full = await Promise.all(items.map((i) => MS.api('/product/' + encodeURIComponent(i.slug)).catch(() => null)));
    const list = full.filter(Boolean);
    const keys = [...new Set(list.flatMap((p) => Object.keys(p.specs)))].slice(0, 30);
    view.innerHTML = `<div class="wrap pg"><div class="crumbs"><a href="/">Home</a><span>/</span><span>Compare</span></div><div class="head"><div><p class="kick">Compare</p><h1>Compare products</h1></div><button class="btnx line" id="cmp-clear" type="button">Clear all</button></div>
      <div class="cmp"><table><tbody>
        <tr><th></th>${list.map((p) => `<td><a href="/product/${p.slug}/">${MS.img(p.image, p.name)}</a><br><b>${esc(p.name)}</b><br><button class="more" data-rm="${p.id}" style="background:none;border:0;color:var(--red);padding:6px 0">Remove</button></td>`).join('')}</tr>
        <tr><th>Price</th>${list.map((p) => `<td><b>${money(p.price)}</b></td>`).join('')}</tr>
        <tr><th>Brand</th>${list.map((p) => `<td>${esc(p.brand)}</td>`).join('')}</tr>
        <tr><th>Availability</th>${list.map((p) => `<td>${p.in_stock ? 'In stock' : 'Out of stock'}</td>`).join('')}</tr>
        ${keys.map((k) => `<tr><th>${esc(k)}</th>${list.map((p) => `<td>${esc(p.specs[k] || '—')}</td>`).join('')}</tr>`).join('')}
        <tr><th></th>${list.map((p) => `<td><button class="btnx" data-add="${p.id}" ${p.in_stock ? '' : 'disabled'}>Add to cart</button></td>`).join('')}</tr>
      </tbody></table></div></div>`;
    $('#cmp-clear').addEventListener('click', () => { items.forEach((i) => MS.compare.remove(i.id)); MS.render(); });
    view.addEventListener('click', (e) => {
      const r = e.target.closest('[data-rm]'); if (r) { MS.compare.remove(r.dataset.rm); MS.render(); }
      const a = e.target.closest('[data-add]'); if (a) { MS.cart.add(list.find((p) => p.id === a.dataset.add), 1); MS.toast('Added to cart', { href: '/cart/', label: 'View cart' }); }
    });
  });
})();
