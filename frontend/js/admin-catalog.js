/* MySemicon admin: products, categories, brands */
(function () {
  'use strict';
  const A = window.A, { $, $$, esc } = A;
  let catCache = null;
  const categories = async () => { if (!catCache) catCache = (await A.api('/categories')).items; return catCache; };

  /* ---------- products list ---------- */
  A.views.products = async (p, v) => {
    if (p[0]) return editor(p[0] === 'new' ? null : decodeURIComponent(p[0]), v);
    const st = { q: '', category: '', brand: '', stock: '', sort: 'new', archived: '', page: 1 };
    let showAll = false;
    const cats = await categories();
    v.innerHTML = `<div class="bar"><input class="grow" id="q" placeholder="Search name, SKU or address"><select id="c" style="max-width:240px"><option value="">All categories</option>${cats.map((c) => `<option value="${esc(c.slug)}">${'— '.repeat(c.depth || 0)}${esc(c.name)} (${c.total})</option>`).join('')}</select>
        <input id="b" placeholder="Brand address" style="width:150px" title="brand slug, e.g. arduino"><select id="s"><option value="">Any stock</option><option value="in">In stock</option><option value="low">Low stock (≤5)</option><option value="out">Out of stock</option></select>
        <select id="o"><option value="new">Newest</option><option value="name">Name</option><option value="price_asc">Price ↑</option><option value="price_desc">Price ↓</option><option value="stock">Stock ↑</option></select></div>
      <div class="bar"><a class="btn pri" href="#/products/new">+ New product</a><button class="btn" id="imp">Import prices &amp; stock (CSV)</button><button class="btn" id="exp">Export CSV</button><label class="btn"><input type="checkbox" id="arch"> Show archived</label></div><div id="list"></div>`;
    const pickCat = (slug) => { st.category = slug; st.page = 1; showAll = !slug && showAll; $('#c').value = slug; load(); };
    const load = async () => {
      // nothing chosen yet: list the categories first, products appear once one is picked
      if (!st.category && !st.q && !st.brand && !st.stock && !st.archived && !showAll) {
        const roots = cats.filter((c) => !c.parent && c.total > 0).sort((a, b) => b.total - a.total);
        $('#list').innerHTML = `<div class="catpick-head"><b>${A.num(roots.length)} categories</b><span class="mute">Pick a category to manage its products.</span><button class="btn sm" id="allp" type="button">Show all products</button></div>
          <div class="catpick">${roots.map((c) => `<button type="button" class="catpick-card" data-cat="${esc(c.slug)}"><b>${esc(c.name)}</b><span class="mute">${A.num(c.total)} products</span></button>`).join('')}</div>`;
        $$('[data-cat]', $('#list')).forEach((b) => b.onclick = () => pickCat(b.dataset.cat));
        $('#allp').onclick = () => { showAll = true; load(); };
        return;
      }
      const d = await A.api('/products?' + A.qs({ ...st, limit: 25 }));
      $('#list').innerHTML = d.items.length ? `<div class="wrap-x"><table class="tbl"><thead><tr><th></th><th>Product</th><th>Brand</th><th class="r">Price</th><th>Stock</th><th></th></tr></thead><tbody>
        ${d.items.map((x) => `<tr><td style="width:54px">${x.img ? `<img class="thumb" src="${esc(x.img)}" alt="" loading="lazy">` : ''}</td><td>${esc(x.name)}<br><span class="mono mute">${esc(x.sku)}</span> ${x.locked ? '<span class="badge gold" title="Edited in admin: the live price sync leaves it alone">manual</span>' : ''}</td><td>${esc(x.brand || x.brand_name || '')}</td>
          <td class="r">${A.money(x.price)}</td><td>${x.in_stock ? `<span class="badge ok">${A.num(x.qty)} in stock</span>` : '<span class="badge bad">Out</span>'}</td>
          <td class="r">${x.archived ? `<button class="btn sm" data-restore="${esc(x.id)}">Restore</button>` : `<a class="btn sm" href="#/products/${esc(x.id)}">Edit</a> <a class="btn sm" href="/product/${esc(x.slug)}/" target="_blank" rel="noopener">View</a>`}</td></tr>`).join('')}</tbody></table></div>${A.pager(d)}` : '<div class="empty">No products match.</div>';
      A.bindPager($('#list'), (n) => { st.page = n; load(); });
      const cur = cats.find((c) => c.slug === st.category);
      $('#list').insertAdjacentHTML('afterbegin', `<div class="catpick-head"><button class="btn sm" id="bk" type="button">← All categories</button><b>${esc(cur ? cur.name : 'Products')}</b></div>`);
      $('#bk').onclick = () => { st.q = ''; st.brand = ''; st.stock = ''; st.archived = ''; st.page = 1; showAll = false; $('#q').value = ''; $('#b').value = ''; $('#s').value = ''; $('#arch').checked = false; pickCat(''); };
      $$('[data-restore]', $('#list')).forEach((b) => b.onclick = async () => { await A.api('/products/' + b.dataset.restore + '/restore', { method: 'POST' }); A.toast('Restored to the shop'); load(); });
    };
    $('#q').oninput = A.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); });
    $('#c').onchange = (e) => { st.category = e.target.value; st.page = 1; showAll = !st.category && showAll; load(); };
    $('#b').oninput = A.debounce((e) => { st.brand = e.target.value.trim(); st.page = 1; load(); });
    $('#s').onchange = (e) => { st.stock = e.target.value; st.page = 1; load(); };
    $('#o').onchange = (e) => { st.sort = e.target.value; st.page = 1; load(); };
    $('#arch').onchange = (e) => { st.archived = e.target.checked ? 1 : ''; st.page = 1; load(); };
    $('#exp').onclick = () => A.download('/products/export.csv?' + A.qs({ q: st.q, category: st.category, brand: st.brand, stock: st.stock }), 'products.csv');
    $('#imp').onclick = () => importCsv(load);
    await load();
  };

  /* ---------- CSV import (price / MRP / quantity / stock) ---------- */
  function parseCsv(text) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; }
      else cur += c;
    }
    row.push(cur); if (row.some((x) => x !== '')) rows.push(row);
    return rows;
  }
  function importCsv(reload) {
    A.modal({ title: 'Import prices & stock', body: `<p>Upload a CSV with a header row. Match rows by <b>id</b> or <b>sku</b>. Optional columns: <b>price</b>, <b>mrp</b>, <b>qty</b>, <b>in_stock</b> (yes/no). Use <i>Export CSV</i> as a template.</p><input type="file" id="cf" accept=".csv,text/csv"><div id="cp" class="mt"></div>`,
      actions: [{ label: 'Cancel', onClick: (c) => c() }, { label: 'Import', cls: 'pri', onClick: async (c, b) => {
        const f = $('#cf').files[0]; if (!f) return A.toast('Choose a CSV file first', true);
        const rows = parseCsv(await f.text()); if (rows.length < 2) return A.toast('The file has no data rows', true);
        const head = rows[0].map((h) => h.trim().toLowerCase()); const ix = (n) => head.indexOf(n);
        if (ix('id') < 0 && ix('sku') < 0) return A.toast('The file needs an id or sku column', true);
        const data = rows.slice(1).map((r) => ({ id: r[ix('id')] || '', sku: r[ix('sku')] || '', price: ix('price') >= 0 ? r[ix('price')] : '', mrp: ix('mrp') >= 0 ? r[ix('mrp')] : '', qty: ix('qty') >= 0 ? r[ix('qty')] : '', in_stock: ix('in_stock') >= 0 ? r[ix('in_stock')] : '' }));
        if (!(await A.confirm(`Update ${data.length} rows? Changed products are protected from the live price sync.`, 'Import'))) return;
        await A.busy(b, async () => {
          let done = 0; const errs = [];
          for (let i = 0; i < data.length; i += 1000) { const r = await A.api('/products/bulk', { method: 'POST', body: { rows: data.slice(i, i + 1000) } }); done += r.updated; errs.push(...r.errors); }
          c(); A.modal({ title: 'Import finished', body: `<p><b>${done}</b> products updated${errs.length ? `, <b>${errs.length}</b> problems:` : '.'}</p>${errs.length ? `<pre style="white-space:pre-wrap;max-height:240px;overflow:auto">${esc(errs.join('\n'))}</pre>` : ''}`, actions: [{ label: 'Done', cls: 'pri', onClick: (cc) => { cc(); reload(); } }] });
        });
      } }] });
  }

  /* ---------- product editor ---------- */
  async function editor(id, v) {
    const cats = await categories();
    const isNew = id === null;
    const P = isNew ? { name: '', sku: '', brand_name: '', regular_price: '', final_price: '', available_quantity: 0, in_stock: true, country_of_origin: 'India', short_description: '', description: '', specs: {}, categories: [], images: [], tiers: [], attachments: [] } : await A.api('/products/' + encodeURIComponent(id));
    const sel = P.categories.map((c) => c.slug);
    const specs = Object.entries(P.specs || {});
    const images = [...(P.images || [])];
    const tiers = (P.tiers || []).map((t) => ({ from_qty: t.from_qty, to_qty: t.to_qty ?? '', price: t.price }));
    v.innerHTML = `<p><a href="#/products">&larr; All products</a></p>
      ${P.archived ? '<div class="note">This product is archived and hidden from the shop. Restore it from the product list to edit.</div>' : ''}
      ${P.locked ? `<div class="note">Edited in the admin panel, so the live price sync from the source store leaves it alone. <button class="btn sm" id="unlock">Resume live sync</button></div>` : ''}
      <div class="card"><h3>${isNew ? 'New product' : 'Basics'}</h3>
        <div class="fld"><label for="f-name">Name *</label><input id="f-name" value="${esc(P.name)}" maxlength="300"></div>
        <div class="row3"><div class="fld"><label for="f-sku">SKU</label><input id="f-sku" value="${esc(P.sku)}" placeholder="auto if empty"></div><div class="fld"><label for="f-brand">Brand</label><input id="f-brand" value="${esc(P.brand_name)}"></div><div class="fld"><label for="f-country">Country of origin</label><input id="f-country" value="${esc(P.country_of_origin)}"></div></div></div>
      <div class="card"><h3>Price & stock</h3>
        <div class="row4"><div class="fld"><label for="f-price">Selling price (₹, incl. GST) *</label><input id="f-price" type="number" min="0" step="0.01" value="${esc(P.final_price)}"></div><div class="fld"><label for="f-mrp">MRP (₹)</label><input id="f-mrp" type="number" min="0" step="0.01" value="${esc(P.regular_price)}"></div>
          <div class="fld"><label for="f-qty">Quantity in stock</label><input id="f-qty" type="number" min="0" step="1" value="${esc(P.available_quantity)}"></div><div class="fld"><label>&nbsp;</label><label style="display:flex;gap:8px;align-items:center;font:inherit;text-transform:none;letter-spacing:0"><input type="checkbox" id="f-stock" ${P.in_stock ? 'checked' : ''}> Available to buy</label></div></div>
        <div class="lbl">Bulk pricing (optional)</div><div id="tiers" class="mt"></div><button class="btn sm" id="addtier">+ Add price break</button></div>
      <div class="card"><h3>Categories *</h3><div class="chips" id="cats"></div><input id="catpick" list="catlist" placeholder="Type to find a category, then pick it" style="width:100%;max-width:520px"><datalist id="catlist">${cats.map((c) => `<option value="${esc(c.name)} [${esc(c.slug)}]"></option>`).join('')}</datalist></div>
      <div class="card"><h3>Descriptions</h3><div class="fld"><label for="f-sd">Short description (HTML)</label><textarea id="f-sd" rows="4">${esc(P.short_description)}</textarea></div><div class="fld"><label for="f-desc">Full description (HTML)</label><textarea id="f-desc" rows="10">${esc(P.description)}</textarea><small>Basic HTML is supported. It is shown exactly as written on the product page.</small></div></div>
      <div class="card"><h3>Specifications</h3><div id="specs"></div><button class="btn sm" id="addspec">+ Add specification</button></div>
      <div class="card"><h3>Images</h3><div class="imgs" id="imgs"></div><div class="bar mt"><input id="imgurl" class="grow" placeholder="Paste an image address (https://…)"><button class="btn" id="addimg">Add</button><label class="btn">Upload image<input type="file" id="imgup" accept="image/*" hidden></label></div><small class="mute">The first image is the main photo. JPG, PNG, WEBP or GIF, up to 5 MB.</small></div>
      ${(P.attachments || []).length ? `<div class="card"><h3>Datasheets</h3>${P.attachments.map((a) => `<div><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.title || a.url)}</a></div>`).join('')}</div>` : ''}
      <div class="bar mt" style="position:sticky;bottom:0;background:var(--ivory);padding:12px 0"><button class="btn pri" id="save" ${P.archived ? 'disabled' : ''}>${isNew ? 'Create product' : 'Save changes'}</button>
        ${isNew ? '' : `<a class="btn" href="/product/${esc(P.slug)}/" target="_blank" rel="noopener">View on site</a>${P.archived ? `<button class="btn" id="restore">Restore</button>` : `<button class="btn bad" id="archive">Archive (hide from shop)</button>`}`}<span class="err" id="ferr"></span></div>`;

    const drawTiers = () => { $('#tiers').innerHTML = tiers.map((t, i) => `<div class="tier"><input data-t="${i}" data-k="from_qty" type="number" min="1" placeholder="From qty" value="${esc(t.from_qty)}"><input data-t="${i}" data-k="to_qty" type="number" min="1" placeholder="To qty (blank = and above)" value="${esc(t.to_qty)}"><input data-t="${i}" data-k="price" type="number" min="0" step="0.01" placeholder="Price each ₹" value="${esc(t.price)}"><button class="btn sm bad" data-rt="${i}">×</button></div>`).join('');
      $$('[data-t]', $('#tiers')).forEach((el) => el.oninput = () => { tiers[+el.dataset.t][el.dataset.k] = el.value; }); $$('[data-rt]', $('#tiers')).forEach((b) => b.onclick = () => { tiers.splice(+b.dataset.rt, 1); drawTiers(); }); };
    const drawCats = () => { $('#cats').innerHTML = sel.map((s, i) => { const c = cats.find((x) => x.slug === s); return `<span class="chip">${esc(c ? c.name : s)}<button data-rc="${i}" aria-label="Remove">×</button></span>`; }).join('') || '<span class="mute">None chosen</span>'; $$('[data-rc]', $('#cats')).forEach((b) => b.onclick = () => { sel.splice(+b.dataset.rc, 1); drawCats(); }); };
    const drawSpecs = () => { $('#specs').innerHTML = specs.map((s, i) => `<div class="kv"><input data-s="${i}" data-k="0" placeholder="Name" value="${esc(s[0])}"><input data-s="${i}" data-k="1" placeholder="Value" value="${esc(s[1])}"><button class="btn sm bad" data-rs="${i}">×</button></div>`).join('');
      $$('[data-s]', $('#specs')).forEach((el) => el.oninput = () => { specs[+el.dataset.s][+el.dataset.k] = el.value; }); $$('[data-rs]', $('#specs')).forEach((b) => b.onclick = () => { specs.splice(+b.dataset.rs, 1); drawSpecs(); }); };
    const drawImgs = () => { $('#imgs').innerHTML = images.map((u, i) => `<div class="im"><img src="${esc(u)}" alt="" loading="lazy"><div class="mono mute" style="font-size:11px;word-break:break-all">${esc(u.slice(-38))}</div><div class="acts"><button class="btn sm" data-up="${i}" ${i ? '' : 'disabled'}>↑</button><button class="btn sm" data-dn="${i}" ${i < images.length - 1 ? '' : 'disabled'}>↓</button><button class="btn sm bad" data-ri="${i}">Remove</button></div></div>`).join('') || '<span class="mute">No images</span>';
      $$('[data-up]', $('#imgs')).forEach((b) => b.onclick = () => { const i = +b.dataset.up; [images[i - 1], images[i]] = [images[i], images[i - 1]]; drawImgs(); }); $$('[data-dn]', $('#imgs')).forEach((b) => b.onclick = () => { const i = +b.dataset.dn; [images[i + 1], images[i]] = [images[i], images[i + 1]]; drawImgs(); }); $$('[data-ri]', $('#imgs')).forEach((b) => b.onclick = () => { images.splice(+b.dataset.ri, 1); drawImgs(); }); };
    drawTiers(); drawCats(); drawSpecs(); drawImgs();
    $('#addtier').onclick = () => { tiers.push({ from_qty: '', to_qty: '', price: '' }); drawTiers(); };
    $('#addspec').onclick = () => { specs.push(['', '']); drawSpecs(); };
    $('#addimg').onclick = () => { const u = $('#imgurl').value.trim(); if (u) { images.push(u); $('#imgurl').value = ''; drawImgs(); } };
    $('#imgup').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const fd = new FormData(); fd.append('file', f); try { const r = await A.api('/uploads/image', { method: 'POST', form: fd }); images.push(r.url); drawImgs(); A.toast('Image uploaded'); } catch (x) { A.toast(x.message, true); } e.target.value = ''; };
    $('#catpick').onchange = (e) => { const m = /\[([^\]]+)\]$/.exec(e.target.value); if (m && cats.find((c) => c.slug === m[1]) && !sel.includes(m[1])) { sel.push(m[1]); drawCats(); } e.target.value = ''; };
    if ($('#unlock')) $('#unlock').onclick = async () => { await A.api('/products/' + encodeURIComponent(id) + '/unlock', { method: 'POST' }); A.toast('Live price sync resumes for this product'); editor(id, v); };
    if ($('#archive')) $('#archive').onclick = async () => { if (await A.confirm('Hide this product from the shop? You can restore it later.', 'Archive', 'bad')) { await A.api('/products/' + encodeURIComponent(id) + '/archive', { method: 'POST' }); A.toast('Archived'); A.go('#/products'); } };
    if ($('#restore')) $('#restore').onclick = async () => { await A.api('/products/' + encodeURIComponent(id) + '/restore', { method: 'POST' }); A.toast('Restored'); editor(id, v); };
    $('#save').onclick = (e) => A.busy(e.target, async () => {
      $('#ferr').textContent = '';
      const body = { name: $('#f-name').value, sku: $('#f-sku').value, brand_name: $('#f-brand').value, country_of_origin: $('#f-country').value, final_price: $('#f-price').value,
        regular_price: $('#f-mrp').value || $('#f-price').value, available_quantity: $('#f-qty').value || 0, in_stock: $('#f-stock').checked, short_description: $('#f-sd').value, description: $('#f-desc').value,
        specs: Object.fromEntries(specs.filter((s) => s[0].trim())), images, categories: sel,
        tiers: tiers.filter((t) => t.from_qty !== '' && t.price !== '').map((t) => ({ from_qty: +t.from_qty, to_qty: t.to_qty === '' ? null : +t.to_qty, price: +t.price })) };
      try {
        if (isNew) { const r = await A.api('/products', { method: 'POST', body }); A.toast('Product created'); A.go('#/products/' + r.id); }
        else { await A.api('/products/' + encodeURIComponent(id), { method: 'PATCH', body }); A.toast('Saved. The change is live on the shop.'); }
      } catch (x) { $('#ferr').textContent = x.message; A.toast(x.message, true); }
    });
  }

  /* ---------- categories ---------- */
  A.views.categories = async (p, v) => {
    catCache = null; const all = await categories();
    v.innerHTML = `<div class="bar"><input class="grow" id="q" placeholder="Filter categories"></div><p class="mute">Renaming a category changes its display name everywhere. Products keep their category links.</p><div id="list"></div>`;
    const draw = () => { const q = $('#q').value.toLowerCase(); const rows = all.filter((c) => !q || c.name.toLowerCase().includes(q) || c.slug.includes(q)).slice(0, 400);
      $('#list').innerHTML = `<div class="wrap-x"><table class="tbl"><thead><tr><th>Category</th><th>Address</th><th class="r">Products</th><th></th></tr></thead><tbody>${rows.map((c) => `<tr><td style="padding-left:${12 + (c.depth || 0) * 18}px">${esc(c.name)}</td><td class="mono mute">${esc(c.slug)}</td><td class="r">${A.num(c.total)}</td><td class="r"><button class="btn sm" data-rn="${esc(c.slug)}">Rename</button> <a class="btn sm" href="/product-category/${esc(c.slug)}/" target="_blank" rel="noopener">View</a></td></tr>`).join('')}</tbody></table></div>${all.length > 400 && !q ? '<p class="mute">Showing the first 400. Use the filter to find others.</p>' : ''}`;
      $$('[data-rn]', $('#list')).forEach((b) => b.onclick = async () => { const c = all.find((x) => x.slug === b.dataset.rn); const n = await A.prompt('Rename category', 'Display name', c.name); if (n && n.trim()) { try { await A.api('/categories/' + encodeURIComponent(c.slug), { method: 'PATCH', body: { name: n.trim() } }); c.name = n.trim(); A.toast('Renamed'); draw(); } catch (x) { A.toast(x.message, true); } } }); };
    $('#q').oninput = A.debounce(draw); draw();
  };

  /* ---------- brands ---------- */
  A.views.brands = async (p, v) => {
    const st = { q: '', page: 1 };
    v.innerHTML = `<div class="bar"><input class="grow" id="q" placeholder="Search brands"></div><div id="list"></div>`;
    const load = async () => {
      const d = await A.api('/brands?' + A.qs({ ...st, limit: 50 }));
      $('#list').innerHTML = `<div class="wrap-x"><table class="tbl"><thead><tr><th>Brand</th><th>Address</th><th class="r">Products</th><th></th></tr></thead><tbody>${d.items.map((b) => `<tr><td>${esc(b.name)}</td><td class="mono mute">${esc(b.slug)}</td><td class="r">${A.num(b.total)}</td><td class="r"><button class="btn sm" data-bn="${esc(b.slug)}" data-nm="${esc(b.name)}">Rename</button> <a class="btn sm" href="/brand/${esc(b.slug)}/" target="_blank" rel="noopener">View</a></td></tr>`).join('')}</tbody></table></div>${A.pager(d)}`;
      A.bindPager($('#list'), (n) => { st.page = n; load(); });
      $$('[data-bn]', $('#list')).forEach((b) => b.onclick = async () => { const n = await A.prompt('Rename brand', 'Brand name (updates every product of this brand)', b.dataset.nm); if (n && n.trim()) { try { await A.api('/brands/' + encodeURIComponent(b.dataset.bn), { method: 'PATCH', body: { name: n.trim() } }); A.toast('Renamed'); load(); } catch (x) { A.toast(x.message, true); } } });
    };
    $('#q').oninput = A.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); });
    await load();
  };

  /* ---------- inventory (quick stock and price control) ---------- */
  A.views.inventory = async (p, v) => {
    const st = { show: 'low', q: '', threshold: 5, page: 1 };
    v.innerHTML = `<div id="sum" class="grid kpis"></div><div id="tabs"></div><div class="bar"><input class="grow" id="q" placeholder="Search name or SKU"><label class="mute">Low stock means at or below <input id="th" type="number" min="0" value="5" style="width:70px"></label></div><div id="list"></div>`;
    const load = async () => {
      const d = await A.api('/inventory?' + A.qs({ ...st, limit: 25 }));
      const s = d.summary;
      $('#sum').innerHTML = [['Products', s.products], ['In stock', s.in_stock], ['Low stock', s.low], ['Out of stock', s.out]].map(([l, n]) => `<div class="kpi ${l === 'Low stock' && n ? 'warn' : l === 'Out of stock' && n ? 'bad' : ''}"><small>${l}</small><b>${A.num(n)}</b></div>`).join('');
      $('#tabs').innerHTML = A.pill([['low', 'Low stock', s.low], ['out', 'Out of stock', s.out], ['in', 'In stock', s.in_stock], ['all', 'All', s.products]], st.show, 'data-s');
      $$('[data-s]', $('#tabs')).forEach((b) => b.onclick = () => { st.show = b.dataset.s; st.page = 1; load(); });
      $('#list').innerHTML = d.items.length ? `<div class="wrap-x"><table class="tbl"><thead><tr><th></th><th>Product</th><th style="width:130px">Price (₹)</th><th style="width:110px">Quantity</th><th>Available</th><th></th></tr></thead><tbody>
        ${d.items.map((x) => `<tr data-id="${esc(x.id)}"><td style="width:54px"><img class="thumb" src="${esc(x.img)}" alt="" loading="lazy"></td><td>${esc(x.name)}<br><span class="mono mute">${esc(x.sku)}</span> ${x.locked ? '<span class="badge gold">manual</span>' : ''} <a class="mute" href="#/products/${esc(x.id)}">edit all fields</a></td>
        <td><input class="ip" type="number" min="0" step="0.01" value="${esc(x.price)}" style="width:120px"></td><td><input class="iq" type="number" min="0" step="1" value="${esc(x.qty)}" style="width:100px"></td>
        <td><input class="is" type="checkbox" ${x.in_stock ? 'checked' : ''}></td><td class="r"><button class="btn sm pri sv" disabled>Save</button></td></tr>`).join('')}</tbody></table></div>${A.pager(d)}` : '<div class="empty">Nothing in this list.</div>';
      A.bindPager($('#list'), (n) => { st.page = n; load(); });
      $$('tr[data-id]', $('#list')).forEach((tr) => {
        const o = { p: tr.querySelector('.ip').value, q: tr.querySelector('.iq').value, s: tr.querySelector('.is').checked };
        const changed = () => { tr.querySelector('.sv').disabled = tr.querySelector('.ip').value === o.p && tr.querySelector('.iq').value === o.q && tr.querySelector('.is').checked === o.s; };
        tr.querySelector('.ip').oninput = changed;
        tr.querySelector('.iq').oninput = () => { tr.querySelector('.is').checked = +tr.querySelector('.iq').value > 0; changed(); };
        tr.querySelector('.is').onchange = changed;
        tr.querySelector('.sv').onclick = (e) => A.busy(e.target, async () => {
          const body = {};
          if (tr.querySelector('.ip').value !== o.p) body.final_price = tr.querySelector('.ip').value;
          if (tr.querySelector('.iq').value !== o.q) body.available_quantity = tr.querySelector('.iq').value;
          body.in_stock = tr.querySelector('.is').checked;
          try { await A.api('/products/' + encodeURIComponent(tr.dataset.id), { method: 'PATCH', body }); A.toast('Saved. Live on the shop now.'); A.refreshCounts(); load(); } catch (x) { A.toast(x.message, true); }
        });
      });
    };
    $('#q').oninput = A.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); });
    $('#th').oninput = A.debounce((e) => { st.threshold = +e.target.value || 0; st.page = 1; load(); });
    await load();
  };
})();
