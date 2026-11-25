/* Order pages in the style of Amazon / Flipkart / Myntra: tracking with live updates, the order list cards and the pieces the
   confirmation page shares (status headline, progress, items, address, price details, bill link). Exposed as MS.orderUI. */
(function () {
  'use strict';
  const { esc, img, $, $$, money } = MS;
  const FLOW = ['Confirmed', 'Packed', 'Shipped', 'Delivered'];
  const FINAL = ['Delivered', 'Cancelled', 'Returned'];
  const UNPAID = ['Awaiting payment', 'Payment failed'];
  const stepAt = (st) => (st === 'Out for delivery' ? 2 : FLOW.indexOf(st));
  const parse = (s) => new Date(String(s || '').replace(' ', 'T'));
  const dShort = (d) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const dLong = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const tTime = (d) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const stamp = (o, st) => { const h = (o.history || []).find((x) => x.status === st); return h ? parse(h.at) : null; };
  const eta = (o) => { const d = parse(o.created); d.setDate(d.getDate() + 5); return d; };
  const contactOf = (o) => (o.customer && (o.customer.email || o.customer.phone)) || '';
  const units = (o) => (o.items || []).reduce((n, l) => n + (+l.qty || 0), 0);

  /** What the customer sees first: a plain-language status line and a colour tone. */
  const headline = (o) => {
    const s = o.status;
    if (s === 'Delivered') { const d = stamp(o, 'Delivered'); return { tone: 'ok', title: d ? `Delivered ${dShort(d)}` : 'Delivered', sub: 'Your package was delivered. We hope you enjoy it.' }; }
    if (s === 'Cancelled') return { tone: 'bad', title: 'Cancelled', sub: 'This order was cancelled. If you paid online, the refund goes back to the original payment method.' };
    if (s === 'Returned') return { tone: 'bad', title: 'Returned', sub: 'We received this return. Any refund is sent to the original payment method.' };
    if (UNPAID.includes(s)) return { tone: 'warn', title: 'Payment pending', sub: 'We will start packing as soon as the payment is received.' };
    if (s === 'Out for delivery') return { tone: 'go', title: 'Out for delivery', sub: 'Your package will reach you today.' };
    return { tone: 'go', title: `Arriving by ${dShort(eta(o))}`, sub: s === 'Shipped' ? 'Your package is on its way.' : s === 'Packed' ? 'Packed and ready to ship.' : 'We are getting your order ready.' };
  };

  const stepper = (o) => {
    if (['Cancelled', 'Returned'].includes(o.status) || UNPAID.includes(o.status)) return '';
    const idx = stepAt(o.status);
    return `<ol class="ot-steps" aria-label="Order progress">${FLOW.map((x, i) => {
      const done = i < idx || (i === idx && o.status === 'Delivered'), cur = i === idx && !done;
      const at = x === 'Confirmed' ? (stamp(o, 'Confirmed') || parse(o.created)) : stamp(o, x === 'Delivered' ? 'Delivered' : x);
      const sub = at && (done || cur) ? dShort(at) : (i === 3 ? 'by ' + dShort(eta(o)) : '');
      return `<li class="${done ? 'done' : cur ? 'cur' : ''}"${cur ? ' aria-current="step"' : ''}><span class="dot"></span><b>${i === 2 && o.status === 'Out for delivery' ? 'Out for delivery' : x}</b><small>${sub}</small></li>`;
    }).join('')}</ol>`;
  };

  const items = (o) => `<div class="ot-items">${(o.items || []).map((l) => `<div class="ot-item"><a class="ot-im" href="/product/${esc(l.slug)}/">${img(l.image, l.name)}</a>
    <div class="ot-in"><a class="ot-nm" href="/product/${esc(l.slug)}/">${esc(l.name)}</a><small>${l.brand ? esc(l.brand) + ' · ' : ''}Qty ${l.qty}</small><small>${money(l.unit)} each</small></div><b class="ot-pr">${money(l.line_total)}</b></div>`).join('')}</div>`;

  const address = (o) => { const c = o.customer || {}; return `<section class="ot-box"><h3>Delivery address</h3><b>${esc(c.name)}</b><p>${esc([c.address, c.city, c.state, c.pincode].filter(Boolean).join(', '))}</p><p class="mute">${esc(c.phone || '')}${c.email ? '<br>' + esc(c.email) : ''}</p></section>`; };

  const price = (o) => {
    const tone = o.payment_status === 'Paid' ? 'ok' : UNPAID.includes(o.status) ? 'bad' : 'warn';
    return `<section class="ot-box"><h3>Price details</h3><dl class="ot-price">
      <div><dt>Price (${units(o)} item${units(o) === 1 ? '' : 's'})</dt><dd>${money(o.subtotal)}</dd></div>
      <div><dt>Delivery charges</dt><dd>${o.shipping ? money(o.shipping) : '<span class="free">Free</span>'}</dd></div>
      <div class="tot"><dt>Total amount</dt><dd>${money(o.total)}</dd></div></dl>
      <p class="ot-gst">Includes ${money(o.gst_included)} GST</p>
      <div class="ot-paid"><span>${esc(o.payment_label || o.payment || '')}</span><b class="${tone}">${esc(o.payment_status || '')}</b></div></section>`;
  };

  const billUrl = (o) => `/api/invoice/${encodeURIComponent(o.order_id)}?contact=${encodeURIComponent(contactOf(o))}`;
  const hasBill = (o) => !UNPAID.includes(o.status);
  const actions = (o, tracking) => `<section class="ot-box ot-acts"><h3>Need something?</h3>
    ${hasBill(o) ? `<a class="ot-btn" href="${billUrl(o)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8"/></svg>Download invoice</a>` : ''}
    ${tracking ? '' : `<a class="ot-btn" href="/order-tracking/?id=${encodeURIComponent(o.order_id)}"><svg viewBox="0 0 24 24"><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.500 7 12 7 12zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>Track package</a>`}
    <a class="ot-btn" href="/contact-us/"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Get help with this order</a></section>`;

  const timeline = (o) => {
    const h = (o.history || []).slice().reverse();
    return h.length ? `<section class="ot-card"><h3 class="ot-h">Order updates</h3><ol class="ot-tl">${h.map((x) => { const d = parse(x.at); return `<li><b>${esc(x.status)}</b><span>${dShort(d)}, ${tTime(d)}</span>${x.note && x.note !== 'Order placed' ? `<em>${esc(x.note)}</em>` : ''}</li>`; }).join('')}</ol></section>` : '';
  };

  const idBlock = (o) => `<div class="ot-meta"><small>Order ID</small><b>${esc(o.order_id)}</b><small>Placed ${dLong(parse(o.created))}</small></div>`;

  /** Full order view: status, progress, items on the left; address, price, help on the right. */
  const detail = (o, o2 = {}) => {
    const h = headline(o), unpaid = UNPAID.includes(o.status);
    return `${o2.noHead ? '' : `<section class="ot-card ot-head ${h.tone}"><div><span class="ot-st">${h.title}</span><p>${h.sub}</p></div>${idBlock(o)}</section>`}
      <div class="ot-grid"><div class="ot-main"><section class="ot-card">${stepper(o)}
        ${unpaid ? `<div class="ot-pay"><div><b>${money(o.total)} to pay</b><small>Your items are reserved while the payment is pending.</small></div><button type="button" class="ot-go" id="ot-pay">Pay now</button></div>` : ''}
        ${items(o)}</section>${o2.noTimeline ? '' : timeline(o)}</div>
        <aside class="ot-side">${address(o)}${price(o)}${actions(o, o2.tracking)}</aside></div>`;
  };

  /** One order as a card in the "My orders" list (Amazon style header + status + items + buttons). */
  const card = (o) => {
    const h = headline(o), c = o.customer || {}, list = o.items || [];
    return `<article class="ol-card" data-id="${esc(o.order_id)}"><header><div><small>Order placed</small><b>${dLong(parse(o.created))}</b></div><div><small>Total</small><b>${money(o.total)}</b></div>
      <div class="ship"><small>Ship to</small><b>${esc(c.name)}</b></div><div class="id"><small>Order # ${esc(o.order_id)}</small><a href="/order-tracking/?id=${encodeURIComponent(o.order_id)}">View order details</a></div></header>
      <div class="ol-body"><div class="ol-info"><span class="ol-st ${h.tone}">${h.title}</span><p>${h.sub}</p>
        ${list.slice(0, 3).map((l) => `<a class="ol-line" href="/product/${esc(l.slug)}/">${img(l.image, l.name)}<span>${esc(l.name)}<small>Qty ${l.qty} · ${money(l.line_total)}</small></span></a>`).join('')}
        ${list.length > 3 ? `<p class="mute">+ ${list.length - 3} more item${list.length - 3 === 1 ? '' : 's'}</p>` : ''}</div>
        <div class="ol-acts"><a class="ot-go" href="/order-tracking/?id=${encodeURIComponent(o.order_id)}">${UNPAID.includes(o.status) ? 'Complete payment' : FINAL.includes(o.status) ? 'View order' : 'Track package'}</a>
        ${hasBill(o) ? `<a class="ot-btn" href="${billUrl(o)}" target="_blank" rel="noopener">Invoice</a>` : ''}<a class="ot-btn" href="/contact-us/">Get help</a></div></div></article>`;
  };

  /** "My orders": filter tabs + search over the cards. */
  const list = (orders, root) => {
    const tabs = [['all', 'All orders', () => true], ['active', 'In progress', (o) => !FINAL.includes(o.status)], ['done', 'Delivered', (o) => o.status === 'Delivered'], ['x', 'Cancelled & returned', (o) => ['Cancelled', 'Returned'].includes(o.status)]];
    let tab = 'all', q = '';
    root.innerHTML = `<div class="ol-bar"><div class="ol-tabs" role="tablist">${tabs.map(([k, l, f]) => `<button type="button" role="tab" data-t="${k}" class="${k === 'all' ? 'on' : ''}">${l}<i>${orders.filter(f).length}</i></button>`).join('')}</div>
      <label class="ol-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg><input type="search" id="ol-q" placeholder="Search by product or order number" aria-label="Search orders"></label></div><div id="ol-list"></div>`;
    const draw = () => {
      const f = tabs.find((t) => t[0] === tab)[2], needle = q.toLowerCase();
      const rows = orders.filter((o) => f(o) && (!needle || o.order_id.toLowerCase().includes(needle) || (o.items || []).some((l) => l.name.toLowerCase().includes(needle))));
      $('#ol-list', root).innerHTML = rows.length ? rows.map(card).join('') : '<div class="ol-none"><b>No orders here</b><p>Try another filter or search.</p></div>';
    };
    $$('.ol-tabs button', root).forEach((b) => b.addEventListener('click', () => { tab = b.dataset.t; $$('.ol-tabs button', root).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
    $('#ol-q', root).addEventListener('input', (e) => { q = e.target.value.trim(); draw(); });
    draw();
  };

  /** Order placed screen: big success banner (or pending-payment banner) on top of the same order view. */
  const confirmation = (o, ctx = {}) => {
    const first = esc((o.customer.name || '').split(' ')[0]), unpaid = UNPAID.includes(o.status);
    const hero = unpaid
      ? `<section class="oc-hero warn"><span class="oc-tick">!</span><div><h1>Payment pending, ${first}</h1><p>Order <b>${esc(o.order_id)}</b> is saved but not paid yet, so we have not started packing it.</p>${ctx.msg ? `<div class="msg err">${esc(ctx.msg)}</div>` : ''}</div></section>`
      : `<section class="oc-hero"><span class="oc-tick">&#10003;</span><div><h1>Order placed, thank you ${first}!</h1><p>${o.payment_status === 'Paid' ? 'Your payment was received. ' : ''}Order <b>${esc(o.order_id)}</b> will reach you by <b>${dShort(eta(o))}</b>.${ctx.mail && o.customer.email ? ` A confirmation email is on its way to <b>${esc(o.customer.email)}</b>.` : ''}</p></div></section>`;
    return `${hero}${detail(o, { noHead: true, noTimeline: true })}<p class="oc-links"><a class="ot-go" href="/order-tracking/?id=${encodeURIComponent(o.order_id)}">Track this order</a><a class="ot-btn" href="/shop/">Continue shopping</a></p>`;
  };

  MS.orderUI = { detail, card, list, confirmation, headline, billUrl, UNPAID, FINAL };

  /* ---------------- /order-tracking: look up (or open from My orders) and watch the order live ---------------- */
  const crumb = `<div class="crumbs"><a href="/">Home</a><span aria-hidden="true">/</span><span>Track order</span></div>`;
  MS.route(/^\/order-tracking$/, (m, view) => {
    MS.setTitle('Track your order | MySemicon');
    const id = MS.q().get('id') || '';
    view.innerHTML = `<div class="wrap pg ot-page">${crumb}
      <section class="ot-look" id="ot-look"><h1>Track your order</h1><p>Enter your order number and the email or mobile number you used. You will also find them in your confirmation email.</p>
        <form id="trk" novalidate><label>Order number<input id="r-order_id" name="order_id" value="${esc(id)}" placeholder="e.g. MS1234567890" autocomplete="off" required></label>
        <label>Email or mobile number<input id="r-contact" name="contact" placeholder="you@example.com or 9876543210" autocomplete="email" required></label>
        <div id="trk-err"></div><button class="ot-go" type="submit">Track order</button></form></section>
      <div id="trk-out"></div></div>`;
    let timer = null, es = null, last = '', ctx = null, current = null;
    const stop = () => { clearInterval(timer); timer = null; if (es) { es.close(); es = null; } };
    const sig = (o) => [o.status, o.payment_status, (o.history || []).length].join('|');
    const pad = (n) => String(n).padStart(2, '0');
    const seen = (w) => { const sn = $('#trk-seen'); if (sn) { const t = new Date(); sn.textContent = `(${w} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())})`; } };

    const render = (o) => {
      current = o;
      const out = $('#trk-out'); if (!out) return;
      $('#ot-look').hidden = true;
      const live = !FINAL.includes(o.status);
      out.innerHTML = `<div class="ot-top"><a class="ot-back" href="/my-account/orders/" ${MS.token() ? '' : 'hidden'}>&larr; My orders</a><button type="button" class="ot-link" id="ot-other">Track a different order</button></div>
        ${detail(o, { tracking: true })}
        <div class="trk-live">${live ? '<span class="dot"></span>Live: this page updates by itself <small id="trk-seen"></small>' : 'This order is complete.'}</div><div id="trk-follow"></div>`;
      $('#ot-other').addEventListener('click', () => { stop(); out.innerHTML = ''; $('#ot-look').hidden = false; last = ''; ctx = null; });
      const pay = $('#ot-pay', out);
      if (pay) pay.addEventListener('click', async () => {
        pay.disabled = true; pay.textContent = 'Opening payment…';
        try { await MS.payOrder(o); } catch (x) { out.insertAdjacentHTML('afterbegin', `<div class="msg err">${esc(x.message)}</div>`); }
        poll(true);
      });
      follow(o);
    };

    const follow = (o) => {
      const box = $('#trk-follow'); if (!box || FINAL.includes(o.status) || !(window.MSPush && MSPush.supported())) return;
      const k = 'ms_follow_' + o.order_id;
      let on = false; try { on = !!localStorage.getItem(k); } catch (e) { /* ignore */ }
      box.innerHTML = on ? '<p class="trk-follow ok">You will get a notification on this device for every update.</p>' : '<button type="button" class="ot-btn" id="trk-follow-btn">Notify me on this phone about updates</button><small id="trk-follow-msg"></small>';
      const bt = $('#trk-follow-btn', box);
      if (bt) bt.addEventListener('click', async () => {
        bt.disabled = true;
        try {
          const subscription = await MSPush.subscribe();
          await MS.api('/order-tracking/subscribe', { method: 'POST', body: { order_id: o.order_id, contact: ctx.contact, subscription } });
          try { localStorage.setItem(k, '1'); } catch (e) { /* ignore */ }
          follow(o);
        } catch (x) { $('#trk-follow-msg').textContent = x.message; bt.disabled = false; }
      });
    };

    const fetchOrder = (c) => MS.api(`/order-tracking?order_id=${encodeURIComponent(c.order_id)}&contact=${encodeURIComponent(c.contact)}`);
    const apply = (o) => {
      if (sig(o) === last) return;
      const changed = last !== '';
      last = sig(o); render(o);
      if (changed) MS.toast(`Order update: ${o.status}`);
      if (FINAL.includes(o.status)) stop();
    };
    const poll = async (force) => {
      if (!ctx || (document.hidden && !force)) return;
      try { apply(await fetchOrder(ctx)); seen('checked'); } catch (x) { /* keep the last view, try again later */ }
    };
    /* instant updates: the server sends the order the moment its status changes; slow polling stays as a safety net */
    const live = (c) => {
      if (!window.EventSource) return;
      es = new EventSource(`/api/order-tracking/stream?order_id=${encodeURIComponent(c.order_id)}&contact=${encodeURIComponent(c.contact)}`);
      es.onmessage = (ev) => { try { apply(JSON.parse(ev.data)); seen('updated'); } catch (e) { /* ignore a bad frame */ } };
    };
    const show = (o, c) => { stop(); ctx = c; last = sig(o); render(o); if (!FINAL.includes(o.status)) { live(c); timer = setInterval(poll, 20000); } };

    const onVis = () => { if (!document.hidden) poll(true); };
    document.addEventListener('visibilitychange', onVis);
    MS.onLeave(() => { stop(); document.removeEventListener('visibilitychange', onVis); });

    $('#trk').addEventListener('submit', async (e) => {
      e.preventDefault();
      const c = { order_id: $('#r-order_id').value.trim(), contact: $('#r-contact').value.trim() }, err = $('#trk-err');
      err.innerHTML = '';
      if (!c.order_id || !c.contact) { err.innerHTML = '<div class="msg err">Enter both the order number and your email or mobile number.</div>'; return; }
      try { show(await fetchOrder(c), c); } catch (x) { err.innerHTML = `<div class="msg err">${esc(x.message)}</div>`; }
    });

    /* signed-in customers coming from "My orders" skip the form */
    if (id && MS.token()) MS.api('/my/orders/' + encodeURIComponent(id)).then((o) => show(o, { order_id: o.order_id, contact: contactOf(o) })).catch(() => {});
  });
})();
