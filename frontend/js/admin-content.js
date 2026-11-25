/* MySemicon admin: content & pages, service options, settings, admin users, activity log, system, account */
(function () {
  'use strict';
  const A = window.A, { $, $$, esc } = A;

  /* ---------- content ---------- */
  const TABS = [['pages', 'Pages'], ['faqs', 'FAQs'], ['hero', 'Home slider'], ['blogs', 'Blog posts'], ['jobs', 'Careers'], ['videos', 'Videos']];
  A.views.content = async (p, v) => {
    const tab = p[0] || 'pages';
    v.innerHTML = `<div class="tabs">${TABS.map(([k, l]) => `<a href="#/content/${k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</div><div id="ct"></div>`;
    const box = $('#ct');
    if (tab === 'pages') return pages(p[1], box);
    if (tab === 'faqs') return faqs(box);
    if (tab === 'hero') return hero(box);
    if (tab === 'blogs') return blogs(p[1], box);
    return jsonEditor(tab, box, tab === 'jobs' ? 'Open positions shown on the Careers page. Keep it as a list of objects; each needs job_title.' : 'Videos shown on the Videos page.');
  };

  const preview = (html) => A.modal({ title: 'Preview', wide: true, body: `<iframe sandbox style="width:100%;height:60vh;border:1px solid var(--line);border-radius:8px" srcdoc="${esc('<base target="_blank"><style>body{font:15px/1.6 system-ui;padding:16px;color:#17121c}img{max-width:100%}</style>' + html)}"></iframe>`, actions: [{ label: 'Close', cls: 'pri', onClick: (c) => c() }] });

  async function pages(slug, box) {
    if (slug) {
      const d = await A.api('/content/pages/' + encodeURIComponent(slug));
      box.innerHTML = `<p><a href="#/content/pages">&larr; All pages</a></p><div class="card"><h3>${esc(slug)}</h3>
        <div class="fld"><label for="pt">Page title</label><input id="pt" value="${esc(d.title)}" style="width:100%"></div>
        <div class="fld"><label for="ph">Content (HTML)</label><textarea id="ph" rows="22">${esc(d.html)}</textarea></div>
        <div class="bar"><button class="btn pri" id="ps">Save page</button><button class="btn" id="pv">Preview</button><a class="btn" href="/${esc(slug)}/" target="_blank" rel="noopener">View on site</a>${A.admin.role === 'owner' ? '<button class="btn bad" id="pd">Delete</button>' : ''}</div></div>`;
      $('#pv').onclick = () => preview($('#ph').value);
      $('#ps').onclick = (e) => A.busy(e.target, async () => { try { await A.api('/content/pages/' + encodeURIComponent(slug), { method: 'PUT', body: { title: $('#pt').value, html: $('#ph').value } }); A.toast('Page saved'); } catch (x) { A.toast(x.message, true); } });
      if ($('#pd')) $('#pd').onclick = async () => { if (await A.confirm('Delete this page permanently?', 'Delete', 'bad')) { await A.api('/content/pages/' + encodeURIComponent(slug), { method: 'DELETE' }); A.go('#/content/pages'); } };
      return;
    }
    const d = await A.api('/content/pages');
    box.innerHTML = `<div class="bar"><button class="btn pri" id="np">+ New page</button></div><div class="wrap-x"><table class="tbl"><thead><tr><th>Page</th><th>Address</th><th class="r">Size</th><th></th></tr></thead><tbody>${d.items.map((x) => `<tr><td>${esc(x.title)}</td><td class="mono mute">/${esc(x.slug)}</td><td class="r mute">${A.num(x.size)} chars</td><td class="r"><a class="btn sm" href="#/content/pages/${esc(x.slug)}">Edit</a></td></tr>`).join('')}</tbody></table></div>`;
    $('#np').onclick = async () => { const s = await A.prompt('New page', 'Page address (lowercase letters, numbers, dashes)'); if (!s) return; try { await A.api('/content/pages/' + encodeURIComponent(s.trim()), { method: 'PUT', body: { title: s.trim(), html: '<p>New page</p>' } }); A.go('#/content/pages/' + s.trim()); } catch (x) { A.toast(x.message, true); } };
  }

  async function faqs(box) {
    const items = (await A.api('/content/faqs')).items;
    const draw = () => {
      box.innerHTML = `<div class="note">These appear on the FAQ page. Answers can contain basic HTML.</div>${items.map((f, i) => `<div class="card"><div class="fld"><label>Question ${i + 1}</label><input data-q="${i}" value="${esc(f.q)}" style="width:100%"></div><div class="fld"><label>Answer</label><textarea data-a="${i}" rows="4">${esc(f.a)}</textarea></div>
        <div class="bar"><button class="btn sm" data-up="${i}" ${i ? '' : 'disabled'}>↑</button><button class="btn sm" data-dn="${i}" ${i < items.length - 1 ? '' : 'disabled'}>↓</button><button class="btn sm bad" data-rm="${i}">Remove</button></div></div>`).join('')}
        <div class="bar mt"><button class="btn" id="fa">+ Add question</button><button class="btn pri" id="fs">Save FAQs</button></div>`;
      $$('[data-q]', box).forEach((el) => el.oninput = () => { items[+el.dataset.q].q = el.value; }); $$('[data-a]', box).forEach((el) => el.oninput = () => { items[+el.dataset.a].a = el.value; });
      $$('[data-up]', box).forEach((b) => b.onclick = () => { const i = +b.dataset.up; [items[i - 1], items[i]] = [items[i], items[i - 1]]; draw(); });
      $$('[data-dn]', box).forEach((b) => b.onclick = () => { const i = +b.dataset.dn; [items[i + 1], items[i]] = [items[i], items[i + 1]]; draw(); });
      $$('[data-rm]', box).forEach((b) => b.onclick = () => { items.splice(+b.dataset.rm, 1); draw(); });
      $('#fa').onclick = () => { items.push({ q: '', a: '' }); draw(); };
      $('#fs').onclick = (e) => A.busy(e.target, async () => { try { const r = await A.api('/content/faqs', { method: 'PUT', body: { items } }); A.toast('Saved ' + r.count + ' questions'); } catch (x) { A.toast(x.message, true); } });
    };
    draw();
  }

  async function hero(box) {
    const items = (await A.api('/content/hero')).items;
    const draw = () => {
      box.innerHTML = `<div class="note">The slides shown at the top of the home page, in this order. Banner images work best at about 970 × 250.</div>${items.map((s, i) => `<div class="slide"><img src="${esc(s.image)}" alt="">
        <div><div class="fld"><label>Title (used as the image description)</label><input data-t="${i}" value="${esc(s.title)}" style="width:100%"></div><div class="fld"><label>Link when clicked</label><input data-l="${i}" value="${esc(s.link)}" style="width:100%" placeholder="/product-category/…"></div>
        <label class="btn sm">Replace image<input type="file" data-f="${i}" accept="image/*" hidden></label></div>
        <div style="display:flex;flex-direction:column;gap:6px"><button class="btn sm" data-up="${i}" ${i ? '' : 'disabled'}>↑</button><button class="btn sm" data-dn="${i}" ${i < items.length - 1 ? '' : 'disabled'}>↓</button><button class="btn sm bad" data-rm="${i}">×</button></div></div>`).join('')}
        <div class="bar mt"><label class="btn">+ Add slide (upload image)<input type="file" id="hn" accept="image/*" hidden></label><button class="btn pri" id="hs">Save slides</button><button class="btn" id="hc">Delete unused slide images</button></div>`;
      $$('[data-t]', box).forEach((el) => el.oninput = () => { items[+el.dataset.t].title = el.value; }); $$('[data-l]', box).forEach((el) => el.oninput = () => { items[+el.dataset.l].link = el.value; });
      $$('[data-up]', box).forEach((b) => b.onclick = () => { const i = +b.dataset.up; [items[i - 1], items[i]] = [items[i], items[i - 1]]; draw(); });
      $$('[data-dn]', box).forEach((b) => b.onclick = () => { const i = +b.dataset.dn; [items[i + 1], items[i]] = [items[i], items[i + 1]]; draw(); });
      $$('[data-rm]', box).forEach((b) => b.onclick = () => { items.splice(+b.dataset.rm, 1); draw(); });
      const up = async (file) => { const fd = new FormData(); fd.append('file', file); return (await A.api('/uploads/image', { method: 'POST', form: fd })).url; };
      $$('[data-f]', box).forEach((el) => el.onchange = async () => { if (el.files[0]) try { items[+el.dataset.f].image = await up(el.files[0]); draw(); } catch (x) { A.toast(x.message, true); } });
      $('#hn').onchange = async (e) => { if (e.target.files[0]) try { items.push({ title: '', link: '/', image: await up(e.target.files[0]) }); draw(); } catch (x) { A.toast(x.message, true); } };
      $('#hs').onclick = (e) => A.busy(e.target, async () => { try { const r = await A.api('/content/hero', { method: 'PUT', body: { items } }); A.toast('Saved ' + r.count + ' slides'); } catch (x) { A.toast(x.message, true); } });
      $('#hc').onclick = async () => { if (await A.confirm('Permanently delete slide image files that no saved slide uses? Save your slides first.', 'Delete files', 'bad')) { const r = await A.api('/content/hero/cleanup', { method: 'POST' }); A.toast(r.removed.length + ' unused images deleted'); } };
    };
    draw();
  }

  async function blogs(slug, box) {
    if (slug) {
      const isNew = slug === 'new';
      const d = isNew ? { slug: '', title: '', description: '', banner_url: '', html: '', kinds: ['blog'] } : await A.api('/content/blogs/' + encodeURIComponent(slug));
      box.innerHTML = `<p><a href="#/content/blogs">&larr; All posts</a></p><div class="card"><h3>${isNew ? 'New post' : 'Edit post'}</h3>
        <div class="row2"><div class="fld"><label for="bs">Address (lowercase, dashes)</label><input id="bs" value="${esc(d.slug)}" ${isNew ? '' : 'disabled'}></div><div class="fld"><label for="bk">Type</label><select id="bk">${A.opts(['blog', 'tutorial'], (d.kinds || ['blog'])[0])}</select></div></div>
        <div class="fld"><label for="bt">Title</label><input id="bt" value="${esc(d.title)}" style="width:100%"></div><div class="fld"><label for="bd">Short description</label><textarea id="bd" rows="3">${esc(d.description)}</textarea></div>
        <div class="fld"><label for="bb">Banner image address</label><div class="bar" style="margin:0"><input id="bb" class="grow" value="${esc(d.banner_url)}"><label class="btn">Upload<input type="file" id="bu" accept="image/*" hidden></label></div></div>
        <div class="fld"><label for="bh">Article (HTML)</label><textarea id="bh" rows="20">${esc(d.html)}</textarea></div>
        <div class="bar"><button class="btn pri" id="bsv">Save post</button><button class="btn" id="bpv">Preview</button>${isNew ? '' : `<a class="btn" href="/${esc(d.slug)}/" target="_blank" rel="noopener">View on site</a><button class="btn bad" id="bdl">Delete</button>`}</div></div>`;
      $('#bpv').onclick = () => preview($('#bh').value);
      $('#bu').onchange = async (e) => { if (e.target.files[0]) { const fd = new FormData(); fd.append('file', e.target.files[0]); try { $('#bb').value = (await A.api('/uploads/image', { method: 'POST', form: fd })).url; } catch (x) { A.toast(x.message, true); } } };
      $('#bsv').onclick = (e) => A.busy(e.target, async () => { const s = isNew ? $('#bs').value.trim() : d.slug; try { await A.api('/content/blogs/' + encodeURIComponent(s), { method: 'PUT', body: { title: $('#bt').value, description: $('#bd').value, banner_url: $('#bb').value, html: $('#bh').value, kind: $('#bk').value } }); A.toast('Post saved'); if (isNew) A.go('#/content/blogs/' + s); } catch (x) { A.toast(x.message, true); } });
      if ($('#bdl')) $('#bdl').onclick = async () => { if (await A.confirm('Delete this post permanently?', 'Delete', 'bad')) { await A.api('/content/blogs/' + encodeURIComponent(d.slug), { method: 'DELETE' }); A.go('#/content/blogs'); } };
      return;
    }
    const st = { q: '', page: 1 };
    box.innerHTML = `<div class="bar"><input class="grow" id="q" placeholder="Search posts"><a class="btn pri" href="#/content/blogs/new">+ New post</a></div><div id="list"></div>`;
    const load = async () => {
      const d = await A.api('/content/blogs?' + A.qs({ ...st, limit: 25 }));
      $('#list').innerHTML = `<div class="wrap-x"><table class="tbl"><thead><tr><th>Title</th><th>Type</th><th>Published</th><th class="r">Views</th><th></th></tr></thead><tbody>${d.items.map((b) => `<tr><td>${esc(b.title)}</td><td><span class="badge">${esc((b.kinds || ['blog'])[0])}</span></td><td class="mute">${esc((b.created_at || '').slice(0, 10))}</td><td class="r">${A.num(b.view_count)}</td><td class="r"><a class="btn sm" href="#/content/blogs/${esc(b.slug)}">Edit</a></td></tr>`).join('')}</tbody></table></div>${A.pager(d)}`;
      A.bindPager($('#list'), (n) => { st.page = n; load(); });
    };
    $('#q').oninput = A.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); });
    await load();
  }

  async function jsonEditor(name, box, help) {
    const d = await A.api('/content/json/' + name);
    box.innerHTML = `<div class="note">${esc(help)} A mistake here can break the page, so the editor checks the format before saving and keeps a backup copy (.bak) of the previous version.</div>
      <textarea id="js" rows="26">${esc(JSON.stringify(d.data, null, 2))}</textarea><div class="bar mt"><button class="btn pri" id="jv">Check &amp; save</button><span class="err" id="je"></span></div>`;
    $('#jv').onclick = (e) => A.busy(e.target, async () => {
      let data; try { data = JSON.parse($('#js').value); } catch (x) { $('#je').textContent = 'Not valid JSON: ' + x.message; return; }
      $('#je').textContent = '';
      try { await A.api('/content/json/' + name, { method: 'PUT', body: { data } }); A.toast('Saved'); } catch (x) { $('#je').textContent = x.message; }
    });
  }

  /* ---------- service options ---------- */
  A.views.services = async (p, v) => {
    v.innerHTML = `<div class="note">The choices offered on the service pages (printer quality, materials, PCB options, accepted file types). Customer quote requests arrive under <a href="#/enquiries">Enquiries &amp; quotes</a>.</div><div id="ct"></div>`;
    await jsonEditor('service_options', $('#ct'), 'Edit option names, colours and accepted file types.');
  };

  /* ---------- settings ---------- */
  A.views.settings = async (p, v) => {
    const s = await A.api('/settings');
    const f = (k, l, t = 'text', h = '') => `<div class="fld"><label for="s-${k}">${l}</label><input id="s-${k}" type="${t}" value="${esc(s[k])}" ${t === 'number' ? 'min="0" step="1"' : ''} style="width:100%">${h ? `<small>${h}</small>` : ''}</div>`;
    v.innerHTML = `<div class="grid three"><div class="card"><h3>Contact details</h3><p class="mute">Shown in the site header, footer, contact page and job applications.</p>${f('phone', 'Phone')}${f('phone2', 'Second phone')}${f('email', 'Email', 'email')}${f('hours', 'Opening hours')}<div class="fld"><label for="s-address">Address</label><textarea id="s-address" rows="3" style="font-family:var(--sans)">${esc(s.address)}</textarea></div></div>
      <div class="card"><h3>Invoice details</h3><p class="mute">Printed on every tax invoice.</p>${f('company_name', 'Business name')}${f('gstin', 'GSTIN', 'text', 'Your 15-character GST number.')}${f('state', 'State', 'text', 'Used to split GST into CGST+SGST (same state) or IGST.')}</div>
      <div class="card"><h3>Shipping</h3>${f('free_shipping_above', 'Free shipping above (₹)', 'number', 'Orders at or above this total ship free.')}${f('shipping_fee', 'Shipping fee below that (₹)', 'number')}</div></div>
      <div class="bar mt"><button class="btn pri" id="ss">Save settings</button><span class="err" id="se"></span></div>`;
    $('#ss').onclick = (e) => A.busy(e.target, async () => {
      const body = { phone: $('#s-phone').value, phone2: $('#s-phone2').value, email: $('#s-email').value, hours: $('#s-hours').value, address: $('#s-address').value, free_shipping_above: $('#s-free_shipping_above').value, shipping_fee: $('#s-shipping_fee').value, company_name: $('#s-company_name').value, gstin: $('#s-gstin').value, state: $('#s-state').value };
      try { await A.api('/settings', { method: 'PUT', body }); A.toast('Saved. Visitors see the new details on their next page load.'); $('#se').textContent = ''; } catch (x) { $('#se').textContent = x.message; }
    });
  };

  /* ---------- admin users ---------- */
  A.views.admins = async (p, v) => {
    const d = await A.api('/admins');
    v.innerHTML = `<div class="bar"><button class="btn pri" id="na">+ Add admin</button></div>
      <p class="mute"><b>Owner</b>: everything. <b>Manager</b>: catalogue, content, orders, enquiries, customers. <b>Support</b>: orders, enquiries, customer list.</p>
      <div class="wrap-x"><table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last sign-in</th><th>Status</th><th></th></tr></thead><tbody>${d.items.map((a) => `<tr><td>${esc(a.name)}</td><td>${esc(a.email)}</td>
        <td><select data-role="${a.id}">${A.opts(d.roles, a.role)}</select></td><td class="mute">${esc(a.last_login || 'never')}</td><td>${a.active ? '<span class="badge ok">Active</span>' : '<span class="badge bad">Disabled</span>'}</td>
        <td class="r"><button class="btn sm" data-act="${a.id}" data-v="${a.active ? 0 : 1}">${a.active ? 'Disable' : 'Enable'}</button> <button class="btn sm" data-pw="${a.id}">Reset password</button></td></tr>`).join('')}</tbody></table></div>`;
    $('#na').onclick = () => A.modal({ title: 'Add admin', body: `<div class="fld"><label for="an">Name</label><input id="an" style="width:100%"></div><div class="fld"><label for="ae">Email</label><input id="ae" type="email" style="width:100%"></div><div class="row2"><div class="fld"><label for="ar">Role</label><select id="ar">${A.opts(d.roles, 'manager')}</select></div><div class="fld"><label for="ap">Password</label><input id="ap" type="password" autocomplete="new-password"></div></div><small>Password: at least 10 characters with letters and numbers.</small><div class="err" id="ae2"></div>`,
      actions: [{ label: 'Cancel', onClick: (c) => c() }, { label: 'Create', cls: 'pri', onClick: async (c) => { try { await A.api('/admins', { method: 'POST', body: { name: $('#an').value, email: $('#ae').value, role: $('#ar').value, password: $('#ap').value } }); c(); A.toast('Admin created'); A.go('#/admins'); } catch (x) { $('#ae2').textContent = x.message; } } }] });
    $$('[data-role]', v).forEach((s) => s.onchange = async () => { try { await A.api('/admins/' + s.dataset.role, { method: 'PATCH', body: { role: s.value } }); A.toast('Role updated'); } catch (x) { A.toast(x.message, true); A.go('#/admins'); } });
    $$('[data-act]', v).forEach((b) => b.onclick = async () => { try { await A.api('/admins/' + b.dataset.act, { method: 'PATCH', body: { active: !!+b.dataset.v } }); A.toast('Updated'); A.go('#/admins'); } catch (x) { A.toast(x.message, true); } });
    $$('[data-pw]', v).forEach((b) => b.onclick = async () => { const pw = await A.prompt('Set a new password', 'New password (min 10 characters, letters and numbers)', '', 'password'); if (pw) try { await A.api('/admins/' + b.dataset.pw, { method: 'PATCH', body: { password: pw } }); A.toast('Password changed'); } catch (x) { A.toast(x.message, true); } });
  };

  /* ---------- activity log ---------- */
  A.views.audit = async (p, v) => {
    const st = { q: '', page: 1 };
    v.innerHTML = `<div class="bar"><input class="grow" id="q" placeholder="Search by admin, action or item"></div><div id="list"></div>`;
    const load = async () => {
      const d = await A.api('/audit?' + A.qs({ ...st, limit: 50 }));
      $('#list').innerHTML = `<div class="wrap-x"><table class="tbl"><thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Item</th><th>Details</th></tr></thead><tbody>${d.items.map((r) => `<tr><td class="mute mono">${esc(r.created)}</td><td>${esc(r.admin)}</td><td>${esc(r.action)}</td><td class="mono">${esc(r.target)}</td><td class="mute" style="max-width:420px;word-break:break-word">${esc((r.detail || '').slice(0, 200))}</td></tr>`).join('')}</tbody></table></div>${A.pager(d)}`;
      A.bindPager($('#list'), (n) => { st.page = n; load(); });
    };
    $('#q').oninput = A.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); });
    await load();
  };

  /* ---------- system ---------- */
  A.views.system = async (p, v) => {
    const [s, f] = await Promise.all([A.api('/system'), A.api('/files')]);
    const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
    v.innerHTML = `<div class="grid two"><div class="card"><h3>Server</h3><dl class="kvl"><dt>Time</dt><dd>${esc(s.server_time)}</dd><dt>Uptime</dt><dd>${s.uptime_minutes} minutes</dd>${Object.entries(s.databases).map(([k, n]) => `<dt>${esc(k)}</dt><dd>${mb(n)}</dd>`).join('')}<dt>Customer uploads</dt><dd>${s.uploads} files</dd></dl>
        <div class="bar mt"><button class="btn" id="cc">Clear site cache</button><button class="btn pri" id="bk">Back up now</button></div><small class="mute">A backup copies the orders/customers/admin database and all editable content files into <span class="mono">data/backups/</span>. The product catalogue itself is large; back that file up separately.</small></div>
      <div class="card"><h3>Recent backups</h3>${s.backups.length ? s.backups.map((b) => `<div class="mono">${esc(b)}</div>`).join('') : '<div class="mute">No backups yet.</div>'}</div></div>
      <div class="card mt"><h3>Customer uploads (service quotes)</h3>${f.items.length ? `<div class="wrap-x"><table class="tbl"><thead><tr><th>File</th><th class="r">Size</th><th>Date</th><th></th></tr></thead><tbody>${f.items.slice(0, 100).map((x) => `<tr><td class="mono">${esc(x.name)}</td><td class="r">${mb(x.size)}</td><td class="mute">${esc(x.modified)}</td><td class="r"><button class="btn sm" data-dl="${esc(x.name)}">Download</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No files uploaded yet.</div>'}</div>`;
    $('#cc').onclick = async () => { await A.api('/system/clear-cache', { method: 'POST' }); A.toast('Cache cleared'); };
    $('#bk').onclick = (e) => A.busy(e.target, async () => { const r = await A.api('/system/backup', { method: 'POST' }); A.toast('Backup saved: ' + r.folder); A.go('#/system'); });
    $$('[data-dl]', v).forEach((b) => b.onclick = () => A.download('/files/' + encodeURIComponent(b.dataset.dl), b.dataset.dl));
  };

  /* ---------- my account ---------- */
  A.views.account = async (p, v) => {
    v.innerHTML = `<div class="grid two"><div class="card"><h3>Signed in as</h3><dl class="kvl"><dt>Name</dt><dd>${esc(A.admin.name)}</dd><dt>Email</dt><dd>${esc(A.admin.email)}</dd><dt>Role</dt><dd>${esc(A.admin.role)}</dd><dt>Previous sign-in</dt><dd>${esc(A.admin.last_login || '—')}</dd></dl></div>
      <div class="card"><h3>Change password</h3><div class="fld"><label for="cp">Current password</label><input id="cp" type="password" autocomplete="current-password"></div><div class="fld"><label for="np">New password</label><input id="np" type="password" autocomplete="new-password"><small>At least 10 characters, with letters and numbers.</small></div>
        <button class="btn pri" id="cs">Change password</button><div class="err" id="ce"></div></div></div>`;
    $('#cs').onclick = (e) => A.busy(e.target, async () => { try { await A.api('/password', { method: 'POST', body: { current: $('#cp').value, new: $('#np').value } }); A.toast('Password changed'); $('#cp').value = ''; $('#np').value = ''; $('#ce').textContent = ''; } catch (x) { $('#ce').textContent = x.message; } });
  };
})();
