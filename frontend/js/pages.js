/* Cart, checkout, account, order tracking, services, blogs and the static / enquiry pages. */
(function () {
  'use strict';
  const { esc, img, $, $$, money, num } = MS;
  const S = MS.SITE;
  const crumb = (...c) => `<div class="crumbs"><a href="/">Home</a>${c.map((x) => `<span aria-hidden="true">/</span>${x[1] ? `<a href="${x[1]}">${esc(x[0])}</a>` : `<span>${esc(x[0])}</span>`}`).join('')}</div>`;
  const page = (view, title, html, desc) => { MS.setTitle(title, desc); view.innerHTML = `<div class="wrap pg">${html}</div>`; };
  const ph = (kick, title, sub) => `<div class="ph"><div><p class="kick">${esc(kick)}</p><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div></div>`;
  const field = (name, label, o = {}) => `<div class="fld${o.full ? ' full' : ''}"><label for="f-${name}">${esc(label)}${o.req ? ' *' : ''}</label>${o.type === 'textarea' ? `<textarea id="f-${name}" name="${name}" ${o.req ? 'required' : ''} placeholder="${esc(o.ph || '')}"></textarea>` : o.type === 'select' ? `<select id="f-${name}" name="${name}">${o.opts.map((x) => `<option>${esc(x)}</option>`).join('')}</select>` : `<input id="f-${name}" name="${name}" type="${o.type || 'text'}" ${o.req ? 'required' : ''} placeholder="${esc(o.ph || '')}" value="${esc(o.val || '')}" autocomplete="${o.ac || 'off'}">`}</div>`;
  const dec = (s) => { const x = document.createElement('textarea'); x.innerHTML = s || ''; return x.value; };
  const formData = (f) => Object.fromEntries(new FormData(f).entries());

  /* ---------- online payment (Razorpay Checkout) ---------- */
  const loadRzp = () => (window.Razorpay ? Promise.resolve() : new Promise((res, rej) => {
    const t = document.createElement('script'); t.src = 'https://checkout.razorpay.com/v1/checkout.js'; t.onload = res;
    t.onerror = () => rej(new Error('Could not load the payment window. Check your connection and try again.')); document.head.appendChild(t);
  }));
    /** Opens the payment window for `order` using the gateway order `gw`; resolves with the server-verified order. */
  MS.pay = async (order, gw) => {
    if (gw && gw.demo) {
      return new Promise((resolve, reject) => {
        const modal = document.createElement('div');
        modal.id = 'demo-pay-modal';
        modal.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:999999;background:rgba(15,23,42,0.7);backdrop-filter:blur(3px);padding:16px;box-sizing:border-box;';
        modal.innerHTML = `
          <div style="max-width:440px;width:100%;background:#ffffff;border-radius:14px;padding:24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);border:1px solid #e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;border-bottom:1px solid #f1f5f9;padding-bottom:14px">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:22px;display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:#f5f3ff;border-radius:8px">⚡</span>
                <div>
                  <h3 style="margin:0;font-size:16px;font-weight:700;color:#1e1b4b">Razorpay [DEMO / TEST]</h3>
                  <p style="margin:2px 0 0;font-size:12px;color:#6b7280">Online Payment Simulator</p>
                </div>
              </div>
              <span style="background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;text-transform:uppercase">Active</span>
            </div>
            <div style="background:#f8fafc;padding:12px 14px;border-radius:8px;margin-bottom:16px;font-size:13px;border:1px solid #e2e8f0">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="color:#64748b">Order ID:</span>
                <b style="color:#0f172a">${esc(order.order_id)}</b>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:baseline">
                <span style="color:#64748b">Amount to Pay:</span>
                <b style="color:#059669;font-size:17px;font-weight:800">${money(order.total)}</b>
              </div>
            </div>
            <p style="font-size:13px;color:#475569;margin:0 0 16px;line-height:1.45">Simulate successful online payment via <b>UPI / Card / NetBanking</b> to test the order completion flow.</p>
            <div style="display:flex;gap:10px">
              <button type="button" id="demo-pay-ok" style="flex:1;background:#2a1f38;color:#ffffff;padding:11px 16px;border-radius:8px;font-weight:700;font-size:14px;border:none;cursor:pointer;box-shadow:0 2px 6px rgba(42,31,56,0.25)">Simulate Payment Success</button>
              <button type="button" id="demo-pay-cancel" style="padding:11px 16px;border-radius:8px;border:1px solid #cbd5e1;background:#ffffff;cursor:pointer;font-weight:600;font-size:14px;color:#64748b">Cancel</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('#demo-pay-ok').onclick = async () => {
          const btn = modal.querySelector('#demo-pay-ok');
          btn.textContent = 'Verifying payment…';
          btn.disabled = true;
          try {
            const res = await MS.api('/payment/verify', {
              method: 'POST',
              body: {
                order_id: order.order_id,
                razorpay_order_id: gw.order_id,
                razorpay_payment_id: 'pay_demo_' + Date.now(),
                razorpay_signature: 'demo'
              }
            });
            modal.remove();
            resolve(res);
          } catch (e) {
            modal.remove();
            reject(e);
          }
        };
        modal.querySelector('#demo-pay-cancel').onclick = () => {
          modal.remove();
          reject(new Error('The payment window was closed. Your order is saved and waiting for payment.'));
        };
      });
    }
    await loadRzp();
    return new Promise((resolve, reject) => {
      const c = order.customer || {};
      let done = false;
      const rz = new window.Razorpay({
        key: gw.key, amount: gw.amount, currency: gw.currency, order_id: gw.order_id, name: 'MySemicon', description: 'Order ' + order.order_id,
        prefill: { name: c.name, email: c.email, contact: c.phone }, theme: { color: '#2a1f38' },
        handler: async (r) => { done = true; try { resolve(await MS.api('/payment/verify', { method: 'POST', body: { order_id: order.order_id, ...r } })); } catch (e) { reject(e); } },
        modal: { ondismiss: () => { if (!done) reject(new Error('The payment window was closed. Your order is saved and waiting for payment.')); } },
      });
      rz.open();                                   // a failed attempt is shown inside the window, where the customer can retry
    });
  };
  /** Pay again for a saved order that is still unpaid. */
  MS.payOrder = async (order) => {
    const gw = await MS.api('/payment/retry', { method: 'POST', body: { order_id: order.order_id, contact: (order.customer && (order.customer.email || order.customer.phone)) || '' } });
    return MS.pay(order, gw);
  };
  const unpaid = (o) => o.status === 'Awaiting payment' || o.status === 'Payment failed';

  /* ---------- cart ---------- */
  async function quote() { return MS.api('/cart/quote', { method: 'POST', body: { items: MS.cart.items().map((i) => ({ id: i.id, qty: i.qty })) } }); }
  MS.route(/^\/cart$/, async (m, view) => {
    MS.setTitle('Cart');
    const draw = async () => {
      if (!MS.cart.items().length) {
        view.innerHTML = `<div class="wrap pg">${crumb(['Cart'])}<div class="ms-empty"><h2>Your cart is empty</h2><p>Add some parts and they will show up here.</p><a class="btnx" href="/shop/">Start shopping</a></div></div>`; return;
      }
      const q = await quote();
      MS.remember(q.items);
      const left = Math.max(0, q.free_shipping_above - q.subtotal);
      view.innerHTML = `<div class="wrap pg">${crumb(['Cart'])}${ph('Cart', 'Shopping cart', `${MS.cart.count()} item${MS.cart.count() > 1 ? 's' : ''} in your cart`)}
        <div class="ct"><div class="ct-lines">${q.items.map((l) => `<div class="ct-line" data-id="${l.id}">
          <a href="/product/${l.slug}/">${img(l.image, l.name)}</a>
          <div><h3><a href="/product/${l.slug}/">${esc(l.name)}</a></h3><small>SKU ${esc(l.sku)} · ${money(l.unit)} each${l.unit < l.price ? ' (bulk price applied)' : ''}</small><br>${l.in_stock ? '' : '<small style="color:var(--red)">Out of stock</small><br>'}<button class="rm" type="button" data-rm="${l.id}">Remove</button></div>
          <div class="qty"><button type="button" data-d="-1" aria-label="Decrease">−</button><input type="number" min="1" value="${l.qty}" aria-label="Quantity"><button type="button" data-d="1" aria-label="Increase">+</button></div>
          <div class="lt">${money(l.line_total)}</div></div>`).join('')}</div>
          <aside class="sum"><h2>Order summary</h2>
            ${left > 0 ? `<p class="note2">Add ${money(left)} more for free shipping</p>` : '<p class="note2">🎉 You get free shipping</p>'}
            <div class="ship-bar"><i style="width:${Math.min(100, q.subtotal / q.free_shipping_above * 100)}%"></i></div>
            <div class="r"><span>Subtotal</span><b>${money(q.subtotal)}</b></div><div class="r"><span>GST included</span><span>${money(q.gst_included)}</span></div>
            <div class="r"><span>Shipping</span><span>${q.shipping ? money(q.shipping) : 'Free'}</span></div><div class="r t"><span>Total</span><span>${money(q.total)}</span></div>
            <a class="btnx" href="/checkout/">Proceed to checkout</a><p class="note2" style="margin-top:12px;text-align:center"><a href="/shop/" style="text-decoration:underline">Continue shopping</a></p></aside></div></div>`;
    };
    await draw();
    view.addEventListener('click', async (e) => {
      const rm = e.target.closest('[data-rm]'), d = e.target.closest('[data-d]');
      if (rm) { MS.cart.remove(rm.dataset.rm); await draw(); }
      if (d) { const id = d.closest('.ct-line').dataset.id; const cur = MS.cart.items().find((i) => i.id === id); MS.cart.setQty(id, cur.qty + +d.dataset.d); await draw(); }
    });
    view.addEventListener('change', async (e) => {
      if (e.target.matches('.ct-line input')) { MS.cart.setQty(e.target.closest('.ct-line').dataset.id, parseInt(e.target.value, 10) || 1); await draw(); }
    });
  });

  /* ---------- checkout ---------- */
  MS.route(/^\/checkout$/, async (m, view) => {
    MS.setTitle('Checkout');
    if (!MS.cart.items().length) { view.innerHTML = `<div class="wrap pg">${crumb(['Cart', '/cart/'], ['Checkout'])}<div class="ms-empty"><h2>Your cart is empty</h2><a class="btnx" href="/shop/">Start shopping</a></div></div>`; return; }
    const q = await quote();
    const u = MS.S.user || {};
    const pay = await MS.api('/payment/config').catch(() => ({ online: false, cod: true, cod_max: 0 }));
    const codOk = pay.cod && q.total <= pay.cod_max;
    view.innerHTML = `<div class="wrap pg">${crumb(['Cart', '/cart/'], ['Checkout'])}${ph('Checkout', 'Delivery & payment')}
      <form id="co" class="ct" novalidate><div><div class="form"><h2>Shipping details</h2><div class="fgrid">
        ${field('name', 'Full name', { req: 1, val: u.name, ac: 'name' })}${field('phone', 'Mobile number', { req: 1, type: 'tel', val: u.phone, ac: 'tel', ph: '10-digit mobile' })}
        ${field('email', 'Email', { type: 'email', val: u.email, ac: 'email', full: 1 })}${field('address', 'Address', { req: 1, full: 1, ac: 'street-address' })}
        ${field('city', 'City', { req: 1, ac: 'address-level2' })}${field('state', 'State', { req: 1, ac: 'address-level1' })}${field('pincode', 'Pincode', { req: 1, ph: '6 digits', ac: 'postal-code' })}${field('gstin', 'GSTIN (optional, for business invoice)')}
      </div></div>
      <div class="form" style="margin-top:18px"><h2>Payment method</h2>
        ${pay.online ? `<label class="pay-opt"><input type="radio" name="payment" value="online" checked><div><b>Pay online</b><span>UPI, credit / debit cards, net banking and wallets, secured by Razorpay.</span></div></label>`
          : `<label class="pay-opt off"><input type="radio" disabled><div><b>Pay online</b><span>Not available right now.</span></div></label>`}
        ${codOk ? `<label class="pay-opt"><input type="radio" name="payment" value="cod"${pay.online ? '' : ' checked'}><div><b>Cash on delivery</b><span>Pay in cash when the parcel arrives.</span></div></label>`
          : `<label class="pay-opt off"><input type="radio" disabled><div><b>Cash on delivery</b><span>${pay.cod ? `Available for orders up to ${money(pay.cod_max)}.` : 'Not available right now.'}</span></div></label>`}</div>
        <div id="co-err"></div></div>
      <aside class="sum"><h2>Your order</h2>${q.items.map((l) => `<div class="r"><span>${esc(l.name.slice(0, 38))}${l.name.length > 38 ? '…' : ''} × ${l.qty}</span><span>${money(l.line_total)}</span></div>`).join('')}
        <div class="r" style="border-top:1px solid var(--border);margin-top:6px"><span>Subtotal</span><b>${money(q.subtotal)}</b></div><div class="r"><span>Shipping</span><span>${q.shipping ? money(q.shipping) : 'Free'}</span></div><div class="r t"><span>Total</span><span>${money(q.total)}</span></div>
        <button class="btnx" type="submit" id="place">Place order</button><p class="note2" style="margin-top:10px">Prices include GST. By ordering you accept the <a href="/terms-of-service/" style="text-decoration:underline">terms</a>.</p></aside></form></div>`;
    const mode = () => (($('#co input[name=payment]:checked') || {}).value || '');
    const label = () => { $('#place').textContent = mode() === 'online' ? `Pay ${money(q.total)}` : 'Place order'; };
    $$('#co input[name=payment]').forEach((r) => r.addEventListener('change', label));
    label();
    if (!pay.online && !codOk) { $('#co-err').innerHTML = '<div class="msg err">Checkout is temporarily unavailable. Please try again later or contact us.</div>'; $('#place').disabled = true; }
    $('#co').addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = formData(e.target), err = $('#co-err');
      if (!d.payment) { err.innerHTML = '<div class="msg err">Choose a payment method.</div>'; return; }
      if (!/^[6-9]\d{9}$/.test(d.phone.replace(/\D/g, '').slice(-10))) { err.innerHTML = '<div class="msg err">Enter a valid 10-digit mobile number.</div>'; return; }
      if (!/^[1-9]\d{5}$/.test(d.pincode)) { err.innerHTML = '<div class="msg err">Enter a valid 6-digit pincode.</div>'; return; }
      const btn = $('#place'); btn.disabled = true; btn.textContent = 'Placing order…'; err.innerHTML = '';
      let o;
      try {
        o = await MS.api('/checkout', { method: 'POST', body: { ...d, items: MS.cart.items().map((i) => ({ id: i.id, qty: i.qty })) } });
      } catch (x) { err.innerHTML = `<div class="msg err">${esc(x.message)}</div>`; btn.disabled = false; label(); return; }
      const gw = o.gateway; delete o.gateway;
      MS.cart.clear();                                           // the saved order now holds these items
      sessionStorage.setItem('ms_last_order', JSON.stringify(o));
      if (gw) {
        btn.textContent = 'Opening payment…';
        try { o = await MS.pay(o, gw); sessionStorage.setItem('ms_last_order', JSON.stringify(o)); } catch (x) { sessionStorage.setItem('ms_pay_msg', x.message); }
      }
      MS.go('/order-confirmation/?id=' + o.order_id);
    });
  });
  MS.route(/^\/order-confirmation$/, (m, view) => {
    let o = null; try { o = JSON.parse(sessionStorage.getItem('ms_last_order')); } catch (e) { /* none */ }
    if (!o) return MS.go('/order-tracking/', true);
    let mail = false;
    MS.api('/payment/config').then((c) => { mail = c.mail; draw(); }).catch(() => {});
    const draw = () => {
      MS.setTitle(unpaid(o) ? 'Payment pending' : 'Order placed');
      view.innerHTML = `<div class="wrap pg ot-page">${crumb(['Order ' + (unpaid(o) ? 'pending' : 'placed')])}${MS.orderUI.confirmation(o, { mail, msg: sessionStorage.getItem('ms_pay_msg') || '' })}</div>`;
      const b = $('#ot-pay', view);
      if (b) b.addEventListener('click', async () => {
        b.disabled = true; b.textContent = 'Opening payment…';
        try { o = await MS.payOrder(o); sessionStorage.setItem('ms_last_order', JSON.stringify(o)); sessionStorage.removeItem('ms_pay_msg'); }
        catch (x) { sessionStorage.setItem('ms_pay_msg', x.message); }
        draw();
      });
    };
    draw();
  });

  /* ---------- account ---------- */
  MS.route(/^\/login$/, (m, view) => {
    if (MS.token()) return MS.go('/my-account/', true);
    let mode = 'login';
    const draw = () => {
      page(view, mode === 'login' ? 'Sign in' : 'Create account', `<div class="narrow"><div class="ph"><div><p class="kick">Account</p><h1>${mode === 'login' ? 'Sign in' : 'Create your account'}</h1></div></div>
        <form class="form" id="auth"><div class="fgrid">${mode === 'register' ? field('name', 'Full name', { req: 1, full: 1, ac: 'name' }) + field('phone', 'Mobile', { type: 'tel', full: 1, ac: 'tel' }) : ''}${field('email', 'Email', { type: 'email', req: 1, full: 1, ac: 'email' })}${field('password', 'Password', { type: 'password', req: 1, full: 1, ac: mode === 'login' ? 'current-password' : 'new-password', ph: mode === 'register' ? 'At least 6 characters' : '' })}</div><div id="auth-err"></div><button class="btnx" type="submit" style="width:100%;margin-top:14px">${mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <p style="text-align:center;margin:14px 0 0">${mode === 'login' ? 'New here? <a href="#" id="sw" style="text-decoration:underline;font-weight:600">Create an account</a>' : 'Already registered? <a href="#" id="sw" style="text-decoration:underline;font-weight:600">Sign in</a>'}</p></form></div>`);
      $('#sw').addEventListener('click', (e) => { e.preventDefault(); mode = mode === 'login' ? 'register' : 'login'; draw(); });
      $('#auth').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const r = await MS.api('/auth/' + mode, { method: 'POST', body: formData(e.target) });
          MS.store.set('ms_token', r.token); await MS.refreshAccount(); MS.toast('Welcome, ' + (r.user.name || r.user.email)); MS.go('/my-account/');
        } catch (x) { $('#auth-err').innerHTML = `<div class="msg err">${esc(x.message)}</div>`; }
      });
    };
    draw();
  });
  const accountNav = (cur) => `<div class="alpha">${[['/my-account/', 'Dashboard'], ['/my-account/orders/', 'Orders'], ['/my-account/wishlist/', 'Wishlist']].map(([h, l]) => `<a href="${h}"><button type="button" class="${cur === h ? 'on' : ''}" style="padding:0 16px">${l}</button></a>`).join('')}<button type="button" id="logout" style="padding:0 16px">Sign out</button></div>`;
  const needLogin = (view) => { if (!MS.token()) { MS.go('/login/', true); return true; } return false; };
  const bindLogout = () => $('#logout').addEventListener('click', async () => { try { await MS.api('/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ } MS.store.del('ms_token'); MS.S.user = null; MS.refreshAccount(); MS.go('/'); });
  MS.route(/^\/my-account$/, async (m, view) => {
    if (needLogin(view)) return; await MS.refreshAccount(); const u = MS.S.user || {};
    page(view, 'My account', `${crumb(['My account'])}${ph('Account', `Hello, ${u.name || 'there'}`, esc(u.email || ''))}${accountNav('/my-account/')}<div class="two"><a class="side-card" href="/my-account/orders/"><h3>Orders</h3><p style="margin:0">View and track your orders.</p></a><a class="side-card" href="/my-account/wishlist/"><h3>Wishlist (${MS.wish.items().length})</h3><p style="margin:0">Parts you saved for later.</p></a></div>`);
    bindLogout();
  });
  MS.route(/^\/my-account\/orders$/, async (m, view) => {
    if (needLogin(view)) return;
    const orders = await MS.api('/my/orders');
    page(view, 'My orders', `${crumb(['My account', '/my-account/'], ['Orders'])}${ph('Account', 'My orders', `${orders.length} order${orders.length === 1 ? '' : 's'}`)}${accountNav('/my-account/orders/')}<div class="ol-page" id="ol-root"></div>`);
    if (orders.length) MS.orderUI.list(orders, $('#ol-root', view));
    else $('#ol-root', view).innerHTML = '<div class="ol-none"><b>No orders yet</b><p>When you place an order it will show up here.</p><a class="ot-go" href="/shop/">Start shopping</a></div>';
    bindLogout();
  });
  MS.route(/^\/my-account\/wishlist$/, (m, view) => {
    const items = MS.wish.items(); MS.remember(items);
    page(view, 'Wishlist', `${crumb(['Wishlist'])}${ph('Saved', 'My wishlist', `${items.length} saved part${items.length === 1 ? '' : 's'}`)}${items.length ? `<div class="grid">${items.map((p) => MS.productCard({ qty: 0, discount: 0, has_tiers: false, ...p })).join('')}</div>` : '<div class="ms-empty"><h2>Your wishlist is empty</h2><p>Tap the heart on any product to save it.</p><a class="btnx" href="/shop/">Browse products</a></div>'}`);
    view.addEventListener('click', (e) => { const b = e.target.closest('[data-act=wish]'); if (b) setTimeout(MS.render, 50); });
  });

  /* ---------- services ---------- */
  const SV_ICONS = {
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

    const SRV_ITEMS = [
    {
      slug: 'industrial-3d-printing',
      name: 'Industrial 3D Print Services',
      kicker: 'HIGH-PRECISION GRADE',
      badge: 'SLA / SLM / SLS / MJF',
      lead: 'Resin & Metal Parts',
      desc: 'High-precision SLA resin, SLM metal, SLS & MJF nylon 3D printing with instant online quoting and micron-level accuracy.',
      accent: '#7c3aed',
      accentTop: '#a78bfa',
      bgTint: '#fbf8fe',
      shapeBg: '#ede9fe',
      textColor: '#5b21b6',
      img: '/assets/mirror/a02d156b22_UFeT4Cbo5Zr1f4xFCoXo9WKwUvnYVpBfLs74kzft.png',
      alt: 'Industrial 3D Print Services'
    },
    {
      slug: '3d-printing-service1',
      name: 'Online FDM 3D Printing Service',
      kicker: 'RAPID PROTOTYPING',
      badge: 'PLA / ABS / PETG / TPU',
      lead: 'Rapid FDM Prototyping',
      desc: 'Cost-effective functional prototyping and production parts in PLA, ABS, PETG, and TPU with fast pan-India delivery.',
      accent: '#059669',
      accentTop: '#34d399',
      bgTint: '#f4fbf7',
      shapeBg: '#d1fae5',
      textColor: '#065f46',
      img: '/assets/mirror/43647efc35_WLJyO7np3zlC3EsKGfGsWZZxZo5IPz4RF8tzGmDI.webp',
      alt: 'Online FDM 3D Printing Service'
    },
    {
      slug: 'metal-laser-cutting',
      name: 'Metal Laser Cutting & Bending',
      kicker: 'INDUSTRIAL FABRICATION',
      badge: 'SS, MS & Aluminum',
      lead: 'Sheet Metal CNC Cutting',
      desc: 'High-power CNC fiber laser cutting up to 12mm thickness with CNC press-brake bending, countersinking, and powder coating.',
      accent: '#475569',
      accentTop: '#94a3b8',
      bgTint: '#f8fafc',
      shapeBg: '#e2e8f0',
      textColor: '#1e293b',
      img: '/assets/mirror/2bc3ac6805_tOnbSJXDBRS65L2eIq4rb8dGxxRk1hLZOEahe3L5.webp',
      alt: 'Metal Laser Cutting'
    },
    {
      slug: 'custom-battery-pack',
      name: 'Customized Lithium-Ion Battery Pack',
      kicker: 'ENERGY STORAGE SOLUTIONS',
      badge: 'Smart BMS Protected',
      lead: 'Precision Lithium Packs',
      desc: 'Custom-engineered Li-ion and LiFePO4 battery packs built with matched grade-A cells, nickel spot welding, and intelligent BMS.',
      accent: '#e11d48',
      accentTop: '#fb7185',
      bgTint: '#fdf2f4',
      shapeBg: '#ffe4e6',
      textColor: '#9f1239',
      img: '/assets/mirror/b936b1ccef_QOHrojKLJqpFc8PcD5VSDmtJBKYC4A0RyWRw2uZa.webp',
      alt: 'Customized Lithium ion Battery Pack'
    },
    {
      slug: 'online-laser-cutting-service',
      name: 'Non-Metal Laser Cutting Service',
      kicker: 'PRECISION CNC CUTTING',
      badge: 'Acrylic, Wood & MDF',
      lead: 'Clean-Edge Laser Cutting',
      desc: 'Optically smooth edge laser cutting and engraving for acrylic, Delrin, MDF, wood, and engineering plastics from DXF drawings.',
      accent: '#0284c7',
      accentTop: '#38bdf8',
      bgTint: '#f2f8fe',
      shapeBg: '#dbeafe',
      textColor: '#1e40af',
      img: '/assets/mirror/d64a0c18c9_m2Vnr6BlwS92ktRzltHb1AkGq2sOLNqX7LQfVH4d.webp',
      alt: 'Non-Metal Laser Cutting Service'
    },
    {
      slug: 'online-pcb-manufacturing-service',
      name: 'PCB Manufacturing Service',
      kicker: 'ELECTRONICS PROTOTYPING',
      badge: '1–4 Layers FR4',
      lead: 'Instant Gerber & Assembly',
      desc: 'Fast-turnaround high-density FR4 PCB fabrication with instant Gerber preview, solder mask color options, and full SMD assembly.',
      accent: '#d97706',
      accentTop: '#fbbf24',
      bgTint: '#fefcf6',
      shapeBg: '#faedd2',
      textColor: '#92400e',
      img: '/assets/mirror/f534fdda71_tvwF6GzORzHYqaXPZgKhLc8koz0jZQxocOUa9Wab.webp',
      alt: 'PCB Manufacturing Service'
    }
  ];

  const SRV_PROCESSES = [
    { badge: 'SLA', tag: 'RESIN', bcls: 'srv-p-purple', title: 'SLA (Resin)', desc: 'Resin cured by laser. The smoothest surface and finest detail — visual models, fine features, tight tolerances.', count: '12 materials', tech: 'sla' },
    { badge: 'MJF', tag: 'NYLON', bcls: 'srv-p-orange', title: 'MJF (Nylon)', desc: 'Nylon powder fused with an infrared lamp. Consistent and fine-edged — the usual choice for functional parts.', count: '4 materials', tech: 'mjf' },
    { badge: 'SLM', tag: 'METAL', bcls: 'srv-p-navy', title: 'SLM (Metal)', desc: 'Metal powder fully melted by laser, giving dense metal parts for real load or heat.', count: '2 materials', tech: 'slm' },
    { badge: 'SLS', tag: 'NYLON', bcls: 'srv-p-orange', title: 'SLS (Nylon)', desc: 'Laser-sintered nylon, tough and matt. Needs no supports, so geometry other processes can\'t attempt.', count: '4 materials', tech: 'sls' },
    { badge: 'WJP', tag: 'RESIN', bcls: 'srv-p-purple', title: 'WJP (Resin)', desc: 'Resin jetted and cured layer by layer, capable of full colour within a single part.', count: '2 materials', tech: 'wjp' },
    { badge: 'BJ', tag: 'METAL', bcls: 'srv-p-orange', title: 'BJ (Metal)', desc: 'Binder printed into metal powder, then sintered. More economical than SLM for larger metal parts.', count: '1 material', tech: 'bj' }
  ];

  MS.route(/^\/(?:services|robu-services)$/, (m, view) => {
    MS.setTitle('Our Services | ' + S.name);
    page(view, 'Our Services', `
      <div class="srv-hero-banner">
        <div class="wrap">
          <h1>Our Services</h1>
          <div class="srv-hero-crumbs"><a href="/">Home</a> <span>&rarr;</span> <span>Our Services</span></div>
        </div>
      </div>
      <div class="wrap pg srv-page">
        <div class="srv-grid">
          ${MS.renderServiceCards()}
        </div>

        <div class="srv-ind-section">
          <div class="srv-ind-header">
            <div class="srv-ind-accent"></div>
            <h2>Industrial 3D printing &mdash; 6 processes, one quote form</h2>
            <p>Resin, nylon and metal, priced online from your model. Pick the process on the same page.</p>
          </div>
          <div class="srv-proc-grid">
            ${SRV_PROCESSES.map((p) => `
              <div class="srv-proc-card">
                <div class="srv-proc-tags">
                  <span class="srv-proc-pill ${p.bcls}">${p.badge}</span>
                  <span class="srv-proc-sub">${p.tag}</span>
                </div>
                <h4>${esc(p.title)}</h4>
                <p class="srv-proc-desc">${esc(p.desc)}</p>
                <div class="srv-proc-foot">
                  <span class="srv-mat-badge">${esc(p.count)}</span>
                  <a class="srv-quote-link" href="/product/industrial-3d-printing/?tech=${p.tech}">Quote &rsaquo;</a>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `);
  });

  MS.views.service = async (slug, view) => {
    MS.go('/product/' + slug + '/');
  };
  MS.route(/^\/(3d-printing-service1|industrial-3d-printing|online-laser-cutting-service|metal-laser-cutting|custom-battery-pack|online-pcb-manufacturing-service)$/, (m) => {
    MS.go('/product/' + m[1] + '/');
  });

  function bindEnquiry(sel, out, kind) {
    $(sel).addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const r = await MS.api('/enquiry', { method: 'POST', body: { kind, ...formData(e.target) } });
        $(out).innerHTML = `<div class="msg ok">Thanks! Your request is recorded. Reference <b>${esc(r.reference)}</b>. We will contact you shortly.</div>`; e.target.reset();
      } catch (x) { $(out).innerHTML = `<div class="msg err">${esc(x.message)}</div>`; }
    });
  }

  /* ---------- BOM tool ---------- */
  MS.route(/^\/bom-tool$/, (m, view) => {
    page(view, 'BOM Tool', `${crumb(['BOM Tool'])}${ph('Tools', 'BOM tool', 'Paste your bill of materials, one part per line as "part name or SKU, quantity". We match each line to an in-stock product and add them all to your cart.')}
      <div class="form"><div class="fld"><label for="bom">Bill of materials</label><textarea id="bom" style="min-height:160px" placeholder="ESP32 DevKit, 2&#10;10k resistor 0805, 100&#10;LM7805, 5"></textarea></div><button class="btnx" id="bom-go" type="button" style="margin-top:12px">Match parts</button></div><div id="bom-out" class="sec2"></div>`);
    $('#bom-go').addEventListener('click', async () => {
      const lines = $('#bom').value.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 60);
      if (!lines.length) return;
      const out = $('#bom-out'); out.innerHTML = '<div class="sk" style="height:120px"></div>';
      const rows = await Promise.all(lines.map(async (l) => {
        const mm = l.match(/^(.*?)[,;\t ]+(\d+)\s*$/); const q = mm ? mm[1].trim() : l; const qty = mm ? +mm[2] : 1;
        const r = await MS.api('/shop?limit=1&in_stock=true&q=' + encodeURIComponent(q)).catch(() => ({ items: [] }));
        return { q, qty, p: r.items[0] };
      }));
      MS.remember(rows.filter((r) => r.p).map((r) => r.p));
      const ok = rows.filter((r) => r.p);
      out.innerHTML = `<div class="cmp"><table><thead><tr><th>Your line</th><th>Matched product</th><th>Qty</th><th>Price</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.q)}</td><td>${r.p ? `<a href="/product/${r.p.slug}/">${esc(r.p.name)}</a>` : '<span style="color:var(--red)">No in-stock match</span>'}</td><td>${r.qty}</td><td>${r.p ? money(r.p.price * r.qty) : '—'}</td></tr>`).join('')}</tbody></table></div>${ok.length ? `<p style="margin-top:14px"><button class="btnx" id="bom-add" type="button">Add ${ok.length} matched part${ok.length > 1 ? 's' : ''} to cart</button></p>` : ''}`;
      const add = $('#bom-add'); if (add) add.addEventListener('click', () => { ok.forEach((r) => MS.cart.add(r.p, r.qty)); MS.go('/cart/'); });
    });
  });

  /* ---------- blogs ---------- */
  const blogList = (tutorial) => async (m, view) => {
    const page_ = +MS.q().get('page') || 1, q = MS.q().get('search') || '';
    const d = await MS.api(`/blogs?page=${page_}&limit=12&q=${encodeURIComponent(q)}`);
    const t = tutorial ? 'Tutorials' : 'Blogs';
    const href = tutorial ? '/category/tutorials/' : '/category/blogs/';
    page(view, t, `${crumb([t])}${ph(t === 'Blogs' ? 'Journal' : 'Learn', t, `${num(d.total)} articles on boards, sensors, drones, 3D printing and more.`)}
      <form id="bs" style="margin-bottom:18px"><input class="fsearch" name="q" value="${esc(q)}" placeholder="Search articles" aria-label="Search articles" style="margin:0"></form>
      <div class="blog-grid">${d.items.map((b) => `<a class="post" href="/${b.slug}/"><div class="im">${img(b.banner_url, b.title)}</div><div class="b"><h3>${esc(b.title)}</h3><p>${esc(dec(b.description))}</p><span class="by">${MS.fmtDate(b.created_at)} · ${esc(b.created_by || S.name)} · ${num(b.view_count)} views</span></div></a>`).join('')}</div>
      ${d.pages > 1 ? `<nav class="ms-pager">${page_ > 1 ? `<a href="${href}?page=${page_ - 1}${q ? '&search=' + encodeURIComponent(q) : ''}">← Prev</a>` : ''}<span aria-current="page">${page_} / ${d.pages}</span>${page_ < d.pages ? `<a href="${href}?page=${page_ + 1}${q ? '&search=' + encodeURIComponent(q) : ''}">Next →</a>` : ''}</nav>` : ''}`);
    $('#bs').addEventListener('submit', (e) => { e.preventDefault(); MS.go(href + '?search=' + encodeURIComponent(e.target.q.value.trim())); });
  };
  MS.route(/^\/(?:category\/)?blogs$/, blogList(false));
  MS.route(/^\/(?:category\/)?tutorials$/, blogList(true));
  MS.views.post = async (slug, view) => {
    const b = await MS.api('/blogs/' + encodeURIComponent(slug));
    page(view, b.title, `${crumb(['Blogs', '/category/blogs/'], [b.title])}<div class="article"><article><h1 style="font:800 clamp(26px,3.2vw,40px)/1.1 'Bricolage Grotesque',sans-serif;letter-spacing:-.02em;margin:0 0 10px">${esc(b.title)}</h1><p class="meta" style="color:var(--muted);font:500 13px 'JetBrains Mono',monospace">${MS.fmtDate(b.created_at)} · ${esc(b.created_by || S.name)} · ${num(b.view_count)} views</p>${b.banner_url ? img(b.banner_url, b.title, 'hero-img') : ''}<div class="prose">${MS.clean(b.html)}</div></article>
      <aside><div class="side-card"><h3>Latest posts</h3>${b.related.map((r) => `<a href="/${r.slug}/">${esc(r.title)}</a>`).join('')}</div><div class="side-card"><h3>Shop the parts</h3><a href="/shop/">Browse all products</a><a href="/featured-brands/">Shop by brand</a></div></aside></div>`, b.description);
  };

  /* ---------- static content ---------- */
  const para = (...t) => t.map((x) => `<p>${x}</p>`).join('');
  const STATIC = {
    '/forum': ['Forum', 'Community', `${para('Ask questions, share builds and help other makers. Our community forum is opening soon. Meanwhile, browse our <a href="/category/blogs/">articles and tutorials</a>, or ask the engineer desk through the <a href="/contact-us/">contact form</a>.')}`],
  };
  Object.entries(STATIC).forEach(([path, [title, kick, body]]) => MS.route(new RegExp('^' + path + '$'), (m, view) => {
    page(view, title, `${crumb([title])}${ph(kick, title)}<div class="prose static" style="max-width:80ch">${body}</div>`);
  }));
  MS.route(/^\/faq$/, async (m, view) => {
    const qa = await MS.api('/faqs');   // the questions published on the source store (data/faqs.json)
    page(view, 'FAQ', `${crumb(['FAQ'])}${ph('Help', 'Frequently asked questions')}<div class="faq" style="max-width:80ch">${qa.map((f) => `<details><summary>${esc(f.q)}</summary><div class="prose">${MS.clean(f.a)}</div></details>`).join('')}</div>`);
  });
})();
