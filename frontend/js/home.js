/* Home page in the magenta design: hero (copy + 7-slide product stage, 3 s), 7-banner offers carousel,
   service row, bento categories, deal + featured cards, services, videos, blogs, tutorials, brands. */
(function () {
  'use strict';
  const { esc, img, $, $$ } = MS;
  const HERO_MS = 3000;
  const BLURB = 'Microcontrollers, single-board computers and wireless boards, with pinouts on every page.';

  /** Generic auto-advancing rotator: calls show(i) every HERO_MS; pauses on hover/focus/hidden tab. */
  function rotator(root, n, show, extraPause) {
    let i = 0, timer = null, paused = false;
    const go = (k) => { i = (k + n) % n; show(i); schedule(); };
    const schedule = () => { clearTimeout(timer); if (!paused && n > 1) timer = setTimeout(() => go(i + 1), HERO_MS); };
    (extraPause || [root]).forEach(() => {});   // no hover/focus pause: the slides always advance every HERO_MS
    const vis = () => { if (document.hidden) clearTimeout(timer); else if (!paused) go(i); };
    document.addEventListener('visibilitychange', vis);
    MS.onLeave(() => { clearTimeout(timer); document.removeEventListener('visibilitychange', vis); });
    go(0);
    return { go, cur: () => i };
  }

  /* ---------- offers: banner carousel ---------- */
  function bannerHTML(h) {
    const slides = h.slides || [];
    const link = (u) => { try { const x = new URL(u, location.origin); return x.hostname.endsWith('robu.in') ? x.pathname : u; } catch (e) { return u; } };
    return `<section class="promo" aria-roledescription="carousel" aria-label="Offers"><div class="hero" id="banners">
      <div class="hero-frame" id="hero-frame">
        ${slides.map((s, i) => `<a class="hero-slide${i ? '' : ' on'}" style="--bg:url('${esc(s.image)}')" href="${esc(link(s.link))}" aria-label="${i + 1} of ${slides.length}: ${esc(s.title)}" ${/^https?:/.test(link(s.link)) ? 'target="_blank" rel="noopener"' : ''}><img src="${esc(s.image)}" alt="${esc(s.title)}" decoding="async"${i ? '' : ' fetchpriority="high"'}></a>`).join('')}
        <div class="hero-dots" role="tablist" aria-label="Choose slide">${slides.map((s, i) => `<button type="button" role="tab" aria-label="Slide ${i + 1}" class="${i ? '' : 'on'}"><span class="glow-dot"></span></button>`).join('')}</div>
      </div></div></section>`;
  }
  function initBanners() {
    const frame = $('#hero-frame'); if (!frame) return;
    const root = $('#banners'), slides = $$('.hero-slide', frame), dots = $$('.hero-dots button', frame);
    const imgs = slides.map((a) => a.querySelector('img'));
    let cur = 0;
    // every banner is shown whole and edge to edge: the frame takes the height of the current image at the current width
    const fit = (animate) => {
      const im = imgs[cur];
      if (!im || !im.naturalWidth) return;
      if (!animate) frame.style.transition = 'none';
      frame.style.height = Math.round(frame.clientWidth * im.naturalHeight / im.naturalWidth) + 'px';
      if (!animate) { void frame.offsetWidth; frame.style.transition = ''; }
    };
    imgs.forEach((im, k) => { const ready = () => { if (k === cur) fit(false); }; im.complete ? ready() : im.addEventListener('load', ready, { once: true }); });
    const onResize = () => fit(false);
    window.addEventListener('resize', onResize);
    MS.onLeave(() => window.removeEventListener('resize', onResize));
    const r = rotator(root, slides.length, (i) => {
      cur = i;
      slides.forEach((s, j) => { s.classList.toggle('on', j === i); s.tabIndex = j === i ? 0 : -1; });
      dots.forEach((d, j) => { d.classList.toggle('on', j === i); d.setAttribute('aria-selected', j === i); });
      fit(true);
    }, [frame]);
    dots.forEach((d, j) => d.addEventListener('click', () => { r.go(j); d.blur(); }));
    frame.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') r.go(r.cur() - 1); if (e.key === 'ArrowRight') r.go(r.cur() + 1); });
    let sx = null;
    frame.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    frame.addEventListener('touchend', (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) r.go(r.cur() + (dx < 0 ? 1 : -1)); sx = null; });
  }

  const CODES = ['DEV', 'DRN', 'PWR', '3DP', 'SNS', 'CMP', 'MOT', 'MOD', 'IOT', 'MEC', 'KIT', 'EV'];
  const TILE = ['big g1', 'g2', 'g3', 'g4', 'light', 'g1', 'g2', 'light', 'g3', 'g4', 'light', 'g1'];
  const sectionHead = (kick, title, href, label = 'View all') => `<div class="sh"><div><p class="kick">${kick}</p><h2>${title}</h2></div>${href ? `<a class="link" href="${href}">${label}</a>` : ''}</div>`;
  const fmtDate = (s) => { const d = new Date(String(s).replace(' ', 'T')); return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
  MS.fmtDate = fmtDate;

  /* Featured product cards matching user reference structure */
  function featuredHTML(items) {
    if (!items || !items.length) return '<div class="none" style="padding:32px;text-align:center">No featured products found.</div>';
    MS.remember(items);
    return items.map((p) => {
      const reg = p.regular || p.price;
      const cur = p.price;
      const pct = (reg > cur) ? Math.round(((reg - cur) / reg) * 100) : (p.discount || 0);
      return `<article class="feat-card" data-id="${p.id}">
        <a class="feat-stage" href="/product/${p.slug}/" aria-label="${esc(p.name)}">
          ${img(p.image, p.name, 'feat-stage-img')}
        </a>
        <div class="feat-meta">
          <h4 class="feat-title"><a href="/product/${p.slug}/" title="${esc(p.name)}">${esc(p.name)}</a></h4>
          <div class="feat-price-row">
            <span class="feat-cur-price">${MS.money(cur)}</span>
            ${reg > cur ? `<span class="feat-reg-price">${MS.money(reg)}</span>` : ''}
            ${pct > 0 ? `<span class="feat-disc-pct">(${pct}% OFF)</span>` : ''}
          </div>
        </div>
      </article>`;
    }).join('');
  }

  /** Featured product horizontal track rotator: advances 1 item every 7.5s, pauses on touchpad scroll */
  function initFeaturedRotator() {
    const track = $('#fx');
    if (!track) return;
    let timer = null;
    const INTERVAL = 7500; // 7.5 seconds (7 to 8 seconds)

    const getStep = () => {
      const card = track.querySelector('.feat-card');
      if (!card) return 240;
      const gap = parseFloat(window.getComputedStyle(track).gap) || 18;
      return card.offsetWidth + gap;
    };

    const next = () => {
      if (!track || document.hidden) return;
      const step = getStep();
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= maxScroll - 15) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: step, behavior: 'smooth' });
      }
    };

    const startTimer = () => {
      clearInterval(timer);
      timer = setInterval(next, INTERVAL);
    };

    let isUserScrolling = null;
    track.addEventListener('scroll', () => {
      clearInterval(timer);
      clearTimeout(isUserScrolling);
      isUserScrolling = setTimeout(startTimer, INTERVAL);
    }, { passive: true });

    startTimer();
    MS.onLeave(() => {
      clearInterval(timer);
      clearTimeout(isUserScrolling);
    });
  }

    const HERO_SVC_LINKS = {
    'PCB Manufacturing': '/product/online-pcb-manufacturing-service/',
    '3D Printing': '/product/3d-printing-service1/',
    'Laser Cutting': '/product/online-laser-cutting-service/',
    'Custom Battery Pack': '/product/custom-battery-pack/'
  };

      const ED_SERVICES = [
    {
      slug: 'online-pcb-manufacturing-service',
      title: 'PCB Manufacturing',
      kicker: 'ELECTRONICS PROTOTYPING',
      badge: '1–4 Layers FR4',
      headLight: 'Instant Gerber &',
      headBold: 'PCB Assembly',
      accentColor: '#d97706',
      accentTop: '#fbbf24',
      bgTint: '#fefcf6',
      shapeBg: '#faedd2',
      textColor: '#92400e',
      img: '/assets/mirror/f534fdda71_tvwF6GzORzHYqaXPZgKhLc8koz0jZQxocOUa9Wab.webp',
      alt: 'PCB Manufacturing Service'
    },
    {
      slug: '3d-printing-service1',
      title: '3D Printing Service',
      kicker: 'RAPID PROTOTYPING',
      badge: 'PLA / ABS / TPU',
      headLight: 'Rapid FDM',
      headBold: '3D Printing',
      accentColor: '#059669',
      accentTop: '#34d399',
      bgTint: '#f4fbf7',
      shapeBg: '#d1fae5',
      textColor: '#065f46',
      img: '/assets/mirror/43647efc35_WLJyO7np3zlC3EsKGfGsWZZxZo5IPz4RF8tzGmDI.webp',
      alt: 'Online FDM 3D Printing Service'
    },
    {
      slug: 'industrial-3d-printing',
      title: 'Industrial 3D Printing',
      kicker: 'HIGH-PRECISION GRADE',
      badge: 'Resin & Metal Parts',
      headLight: 'SLA & Metal',
      headBold: 'Additive Parts',
      accentColor: '#7c3aed',
      accentTop: '#a78bfa',
      bgTint: '#fbf8fe',
      shapeBg: '#ede9fe',
      textColor: '#5b21b6',
      img: '/assets/mirror/a02d156b22_UFeT4Cbo5Zr1f4xFCoXo9WKwUvnYVpBfLs74kzft.png',
      alt: 'Industrial 3D Print Services'
    },
    {
      slug: 'online-laser-cutting-service',
      title: 'Laser Cutting',
      kicker: 'PRECISION CNC CUTTING',
      badge: 'Acrylic, Wood & DXF',
      headLight: 'Clean-Edge',
      headBold: 'Laser Cutting',
      accentColor: '#0284c7',
      accentTop: '#38bdf8',
      bgTint: '#f2f8fe',
      shapeBg: '#dbeafe',
      textColor: '#1e40af',
      img: '/assets/mirror/d64a0c18c9_m2Vnr6BlwS92ktRzltHb1AkGq2sOLNqX7LQfVH4d.webp',
      alt: 'Non-Metal Laser Cutting Service'
    },
    {
      slug: 'metal-laser-cutting',
      title: 'Sheet Metal Cutting',
      kicker: 'INDUSTRIAL FABRICATION',
      badge: 'SS, MS & Aluminum',
      headLight: 'Sheet Metal',
      headBold: 'Laser & Bending',
      accentColor: '#475569',
      accentTop: '#94a3b8',
      bgTint: '#f8fafc',
      shapeBg: '#e2e8f0',
      textColor: '#1e293b',
      img: '/assets/mirror/2bc3ac6805_tOnbSJXDBRS65L2eIq4rb8dGxxRk1hLZOEahe3L5.webp',
      alt: 'Metal Laser Cutting & Bending'
    },
    {
      slug: 'custom-battery-pack',
      title: 'Custom Battery Packs',
      kicker: 'CUSTOM ENERGY STORAGE',
      badge: 'Smart BMS Protected',
      headLight: 'Precision Spot-Welded',
      headBold: 'Lithium Packs',
      accentColor: '#e11d48',
      accentTop: '#fb7185',
      bgTint: '#fdf2f4',
      shapeBg: '#ffe4e6',
      textColor: '#9f1239',
      img: '/assets/mirror/b936b1ccef_QOHrojKLJqpFc8PcD5VSDmtJBKYC4A0RyWRw2uZa.webp',
      alt: 'Customized Lithium-Ion Battery Pack'
    }
  ];

  /** "Our videos": each tile plays a muted 4-second loop of its YouTube video while it is on screen (the tile still links to the full video). */
  function initVideoPreviews() {
    const tiles = $$('.vgrid .big-v');
    if (!tiles.length || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const idOf = (href) => { try { return new URL(href).searchParams.get('v') || ''; } catch (e) { return ''; } };
    const start = (tile) => {
      if (tile.querySelector('.vprev')) return;
      const id = idOf(tile.getAttribute('href'));
      if (!id) return;
      const box = document.createElement('div');
      box.className = 'vprev';
      box.innerHTML = `<iframe title="" tabindex="-1" aria-hidden="true" allow="autoplay; encrypted-media" loading="lazy"
        src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&start=0&end=4&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1"></iframe>`;
      tile.insertBefore(box, tile.firstElementChild.nextSibling);
      const frame = box.firstElementChild;
      // show the preview only once YouTube reports it is playing (state 1), so an embed error is never visible
      const onMsg = (ev) => {
        if (ev.source !== frame.contentWindow) return;
        let d = ev.data; try { d = typeof d === 'string' ? JSON.parse(d) : d; } catch (e) { return; }
        if (d && d.event === 'onStateChange' && d.info === 1) box.classList.add('on');
        if (d && d.event === 'onError') box.remove();
      };
      window.addEventListener('message', onMsg);
      box._off = () => window.removeEventListener('message', onMsg);
      frame.addEventListener('load', () => frame.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*'), { once: true });
    };
    const stop = (tile) => { const b = tile.querySelector('.vprev'); if (b) { if (b._off) b._off(); b.remove(); } };
    const io = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? start(e.target) : stop(e.target))), { threshold: 0.6 });
    tiles.forEach((t) => io.observe(t));
    MS.onLeave(() => io.disconnect());
  }

    const DASHBOARD_SERVICES = [
    { slug: 'online-pcb-manufacturing-service', title: 'PCB Manufacturing', iconKey: 'pcb' },
    { slug: '3d-printing-service1', title: '3D Printing', iconKey: 'fdm' },
    { slug: 'industrial-3d-printing', title: 'Industrial 3D Printing', iconKey: 'ind3d' },
    { slug: 'online-laser-cutting-service', title: 'Laser Cutting', iconKey: 'nonmetal' },
    { slug: 'metal-laser-cutting', title: 'Sheet Metal Cutting', iconKey: 'metalLaser' },
    { slug: 'custom-battery-pack', title: 'Battery Packs', iconKey: 'battery' }
  ];

  MS.route(/^\/$/, async (m, view) => {
    const h = MS.S.home || (MS.S.home = await MS.api('/home'));
    const feat = await MS.api('/featured?limit=11');
    MS.remember(feat);
    const chips = h.categories.slice(0, 5);
    const shortV = h.short_videos.videos, vids = h.videos.videos;
    const svcCopy = ['Prototype and small-batch boards from your Gerber files.', 'Printing in common materials, with post-processing on request.', 'Enclosures, panels and brackets cut from your DXF drawing.', 'Acrylic, wood and card cut to your drawing, with clean edges.', 'Matched cells, BMS wiring and labelled packs built to order.', 'Larger parts and batch runs on industrial printers.'];
    const svcChip = ['3D print', 'Laser', 'Power', 'Industrial', 'Laser', 'PCB'];
    view.innerHTML = `${bannerHTML(h)}

            
    <!-- 1. Quick Services Strip: Matching reference image exactly -->
    <div class="wrap" style="padding-top:14px;padding-bottom:6px">
      <div class="hsvc">
        ${(h.hero_services || []).map((s, i) => `
          <a href="${esc(HERO_SVC_LINKS[s.title] || s.link || '/services')}" title="${esc(s.title)}">
            <div><small>Service 0${i + 1}</small><b>${esc(s.title)}</b></div>
            <span class="ic">${img(s.image, s.title)}</span>
          </a>`).join('')}
      </div>
    </div>

    <!-- 2. Featured Products: Single Row Carousel matching reference image -->
    <section class="sec wrap feat" aria-labelledby="feat-h" style="padding-top:36px">
      <div class="sh"><div><p class="kick">Top picks</p><h2 id="feat-h">Featured Products</h2></div>
        <div class="feat-tools"><div class="chips" id="feat-chips" role="group" aria-label="Filter featured products"><button type="button" aria-pressed="true" data-c="">All</button>${chips.map((c) => `<button type="button" aria-pressed="false" data-c="${c.slug}">${esc(c.name.split(/[ ,|]/)[0])}</button>`).join('')}</div><a class="link" href="/shop/">View all</a></div></div>
      <div class="feat-track-wrap">
        <div class="feat-track" id="fx">${featuredHTML(feat)}</div>
      </div>
    </section>

    <!-- 3. Categories: Uniform Professional Grid -->
    <section class="sec wrap cat-sec" aria-labelledby="cat-h" style="padding-top:44px">
      <div class="sh"><div><p class="kick">Browse catalog</p><h2 id="cat-h">Shop by Category</h2></div>
        <a class="link" href="/shop/">View all categories</a></div>
      <div class="cat-grid">${h.categories.map((c, i) => `
        <a class="cat-card" href="/product-category/${c.slug}/">
          <div class="cat-thumb">${img(c.imageUrl, c.name, 'cat-img')}</div>
          <div class="cat-body">
            <span class="cat-code">${CODES[i] || 'CAT'}</span>
            <h3 class="cat-name">${esc(c.name.replace(/\s*\|\s*/g, ', '))}</h3>
            <span class="cat-action">Explore <i aria-hidden="true">→</i></span>
          </div>
        </a>`).join('')}</div>
    </section>

            <!-- 4. Manufacturing & Prototyping Services: Image 3 Structure -->
    <section class="sec wrap svc-ed-sec" aria-labelledby="svc-h" style="padding-top:44px;padding-bottom:56px">
      <div class="sh">
        <div>
          <p class="kick">Engineering On-Demand</p>
          <h2 id="svc-h">Manufacturing &amp; Prototyping Services</h2>
          <p>Instant online quotation, engineering file review, precision in-house fabrication, and pan-India doorstep delivery.</p>
        </div>
        <div class="svc-header-actions">
          <a class="link" href="/services/">View all services <span aria-hidden="true">&rarr;</span></a>
          <div class="svc-nav-arrows">
            <button id="svc-prev" class="svc-nav-btn" aria-label="Previous service" title="Previous">&lsaquo;</button>
            <button id="svc-next" class="svc-nav-btn" aria-label="Next service" title="Next">&rsaquo;</button>
          </div>
        </div>
      </div>
      <div id="svc-track" class="srv-cat-grid">
        ${DASHBOARD_SERVICES.map((s) => `
          <a class="srv-cat-card" href="/product/${s.slug}/" title="${esc(s.title)}">
            <div class="srv-cat-thumb">
              ${MS.SV_ICONS[s.iconKey]}
            </div>
            <div class="srv-cat-label">
              <span>${esc(s.title)}</span>
              <svg class="srv-cat-arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </a>
        `).join('')}
      </div>
    </section>

            

    <section class="sec wrap" aria-labelledby="sv-h"><div class="sh"><div><p class="kick">Two-minute tutorials</p><h2 id="sv-h">Our short videos</h2></div><a class="pill-btn" href="https://www.youtube.com/${esc(h.short_videos.channelName)}" target="_blank" rel="noopener">View all</a></div>
      <div class="reel">${shortV.slice(0, 4).map((v) => `<a class="vid" href="${esc(v.video_url)}" target="_blank" rel="noopener"><div class="shot">${img(v.thumbnail_url, v.title)}<span class="play" aria-hidden="true"></span><span class="dur">2:00</span></div><h3>${esc(v.title.replace(/\s*\|\s*(Robu|MySemicon).*$/i, ''))}</h3><span class="meta"><span>TUTORIAL</span><b>Watch ↗</b></span></a>`).join('')}</div></section>

    <section class="sec wrap" aria-labelledby="ov-h" style="padding-top:0"><div class="sh"><div><p class="kick">Videos</p><h2 id="ov-h">Our videos</h2></div><a class="pill-btn" href="/videos/">View all</a></div>
      <div class="vgrid">${vids.map((v) => `<a class="big-v" href="${esc(v.video_url)}" target="_blank" rel="noopener">${img(v.thumbnail_url, v.title)}<div class="txt"><div class="row"><span class="tag">Video</span><span class="play2" aria-hidden="true"></span></div><h3>${esc(v.title)}</h3></div></a>`).join('')}</div></section>

    <section class="sec wrap" aria-labelledby="blog-h" style="padding-top:0">${sectionHead('Blogs', '<span id="blog-h">Build notes</span>', '/category/blogs/')}
      <div class="notes">${h.blogs.slice(0, 3).map((b, i) => `<a class="note${i === 0 ? ' lead' : ''}" href="/${b.slug}/"><div class="media"><span class="chip">${i === 0 ? 'Guide' : 'Blog'}</span>${img(b.banner_url, b.title)}</div><div class="body"><p class="kick" style="margin:0">${fmtDate(b.created_at)}</p><h3>${esc(b.title)}</h3><div class="by">${b.created_by && b.created_by.name ? `<span>By ${esc(b.created_by.name)}</span>` : ''}<span>${MS.num(b.view_count)} views</span></div></div></a>`).join('')}</div></section>

    <section class="sec wrap" aria-labelledby="tut-h" style="padding-top:0">${sectionHead('Learn', '<span id="tut-h">Tutorials</span>', '/category/tutorials/')}
      <div class="tut"><a class="tut-lead" href="/${h.tutorials[0].slug}/">${img(h.tutorials[0].banner_url, '', '', 'style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"')}<div class="txt"><p class="kick">Featured tutorial</p><h3>${esc(h.tutorials[0].title)}</h3></div></a>
        <div class="steps">${h.tutorials.slice(1).map((t) => `<a class="step" href="/${t.slug}/"><span class="th">${img(t.banner_url, '', '', 'style="width:100%;height:100%;object-fit:cover"')}</span><div><b>${esc(t.title)}</b><span>${fmtDate(t.created_at).toUpperCase()}</span></div><span class="arr" aria-hidden="true">→</span></a>`).join('')}</div></div></section>

    <section class="trust" aria-label="Store highlights"><div class="wrap"><div class="tb2">${h.shipping.map((s) => `<article class="tb2-it"><span class="tb2-ico" aria-hidden="true">${img(s.image, '', '', 'style="width:28px;height:28px;object-fit:contain"')}</span><h3>${s.title.replace(/<br\s*\/?>/gi, ' ')}</h3></article>`).join('')}</div></div></section>

    ${MS.brandRail(h, 'Partners', 'Our featured brands')}

    <section class="wrap" aria-labelledby="news-h" style="padding-bottom:64px"><div class="nl3">
      <div class="nl-copy"><span class="nl-badge">Newsletter</span><h2 id="news-h">Get the good stuff<br>before everyone else</h2><p>New arrivals, restocks, bulk-price alerts and build notes, in one short email a week.</p>
        <ul class="nl-perks"><li><b>01</b><span>New arrivals and restocks</span></li><li><b>02</b><span>Offers and bulk-price alerts</span></li><li><b>03</b><span>Build notes and tutorials</span></li></ul></div>
      <form id="news-form" class="nl-form"><h3>Join the list</h3><p class="nl-sub">Free. One email a week. Unsubscribe any time.</p>
        <div class="nl-f"><label for="nm">First name</label><input id="nm" name="name" type="text" placeholder="Your name" autocomplete="given-name"></div>
        <div class="nl-f"><label for="em">Email address</label><input id="em" name="email" type="email" placeholder="you@example.com" autocomplete="email" required></div>
        <button type="submit">Subscribe <span aria-hidden="true">→</span></button>
        <small>We respect your inbox and never share your email.</small></form></div></section>`;

    
  /** Horizontal scroll track for 6 manufacturing service cards */
  function initServicesTrack() {
    const track = $('#svc-track') || $('.srv-cat-grid');
    if (!track) return;
    const prev = $('#svc-prev');
    const next = $('#svc-next');
    const getStep = () => {
      const card = track.querySelector('.srv-cat-card') || track.querySelector('.svc-ed-card');
      if (!card) return 380;
      const gap = parseFloat(window.getComputedStyle(track).gap) || 26;
      return card.offsetWidth + gap;
    };
    if (prev) {
      prev.addEventListener('click', (e) => {
        e.preventDefault();
        track.scrollBy({ left: -getStep(), behavior: 'smooth' });
      });
    }
    if (next) {
      next.addEventListener('click', (e) => {
        e.preventDefault();
        const step = getStep();
        const maxScroll = track.scrollWidth - track.clientWidth;
        if (track.scrollLeft >= maxScroll - 15) {
          track.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          track.scrollBy({ left: step, behavior: 'smooth' });
        }
      });
    }
  }

    MS.setTitle('');
    initBanners();
    initVideoPreviews();
    initFeaturedRotator();
    initServicesTrack();
    $('#feat-chips').addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#feat-chips button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      const items = await MS.api('/featured?limit=11' + (b.dataset.c ? '&cat=' + b.dataset.c : ''));
      MS.remember(items);
      $('#fx').innerHTML = featuredHTML(items);
      $('#fx').scrollTo({ left: 0, behavior: 'smooth' });
    });
    $('#news-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      await MS.api('/enquiry', { method: 'POST', body: { kind: 'newsletter', name: f.name.value, email: f.email.value } });
      f.reset(); MS.toast('Thanks for subscribing!');
    });
  });

  /** Marquee of featured brands (design: "Our featured brands"), shared by home, listing and product pages. */
  MS.brandRail = (h, kick, title) => `<section class="brands-x wrap" aria-labelledby="brand-h"><div class="bx-head"><div><p class="kick">${kick}</p><h2 id="brand-h">${title}</h2></div><a class="link" href="/featured-brands/">View all brands</a></div>
    <div class="bx-rail"><div class="bx-track">${[0, 1].map((k) => `<div class="bx-set"${k ? ' aria-hidden="true"' : ''}>${h.brands.map((b) => `<a class="bx-chip" href="/brand/${b.brand_slug}/"${k ? ' tabindex="-1"' : ''}>${img(b.brand_image, '', 'bx-logo')}<span class="bx-name">${esc(b.brand_name)}</span></a>`).join('')}</div>`).join('')}</div></div></section>`;
})();
