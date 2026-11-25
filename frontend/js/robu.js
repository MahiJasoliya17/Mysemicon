/* Pages whose URLs, content and sections follow robu.in: B2B, latest products, ATL kits, careers, videos,
   About / policies / payment options / investor relations, contact, seller form, order tracking.
   Loaded before pages.js so these routes win. Page text comes from /api/page/<slug> (data/pages.json). */
(function () {
  'use strict';
  const { esc, img, $, $$ } = MS;
  const S = MS.SITE;
  const crumb = (...c) => `<div class="crumbs"><a href="/">Home</a>${c.map((x) => `<span aria-hidden="true">/</span>${x[1] ? `<a href="${x[1]}">${esc(x[0])}</a>` : `<span>${esc(x[0])}</span>`}`).join('')}</div>`;
  const head = (kick, title, sub) => `<div class="ph"><div><p class="kick">${esc(kick)}</p><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div></div>`;
  const page = (view, title, html) => { MS.setTitle(title); view.innerHTML = `<div class="wrap pg">${html}</div>`; };
  const fld = (name, label, o = {}) => `<div class="fld${o.full ? ' full' : ''}"><label for="r-${name}">${esc(label)}${o.req ? ' *' : ''}</label>${
    o.type === 'textarea' ? `<textarea id="r-${name}" name="${name}" ${o.req ? 'required' : ''} placeholder="${esc(o.ph || '')}"></textarea>`
      : o.type === 'select' ? `<select id="r-${name}" name="${name}" ${o.req ? 'required' : ''}><option value="">Select</option>${o.opts.map((x) => `<option>${esc(x)}</option>`).join('')}</select>`
        : `<input id="r-${name}" name="${name}" type="${o.type || 'text'}" ${o.req ? 'required' : ''} placeholder="${esc(o.ph || '')}" value="${esc(o.val || '')}" autocomplete="${o.ac || 'off'}">`}</div>`;
  const formData = (f) => Object.fromEntries(new FormData(f).entries());
  const bind = (sel, out, kind) => $(sel).addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const r = await MS.api('/enquiry', { method: 'POST', body: { kind, ...formData(e.target) } });
      $(out).innerHTML = `<div class="msg ok">Thank you! Your request is recorded. Reference <b>${esc(r.reference)}</b>. We will get back to you shortly.</div>`; e.target.reset();
    } catch (x) { $(out).innerHTML = `<div class="msg err">${esc(x.message)}</div>`; }
  });
  const form = (id, title, fields, kind, btn = 'Submit') => `<form class="form" id="${id}"><h2>${esc(title)}</h2><div class="fgrid">${fields.map((f) => fld(f[0], f[1], f[2] || {})).join('')}</div><div id="${id}-out"></div><button class="btnx" type="submit" style="margin-top:14px">${btn}</button></form>`;

  /* ---------- text pages (About, policies, payment options, investor relations, ...) ---------- */
  const TEXT = {
    'about-us': ['About Us', 'about-us'], 'privacy-policy': ['Privacy Policy', 'privacy-policy'], 'terms-of-service': ['Terms of Service', 'terms-of-service'],
    'refund-policy': ['Shipping & Refund Policy', 'refund-policy'], 'shipping-refund': ['Shipping & Refund Policy', 'refund-policy'],
    'e-waste-collection-points': ['E-Waste Collection Points', 'e-waste-collection-points'], 'e-waste': ['E-Waste Collection Points', 'e-waste-collection-points'],
    'payment-options': ['Payment Options', 'payment-options'], 'pcb-manufacturing-capabilities': ['PCB Manufacturing Capabilities', 'pcb-manufacturing-capabilities'], 'investor-relations': ['Investor Relations', 'investor-relations'],
    'macfos-limited-csr': ['MACFOS Limited CSR', 'macfos-limited-csr'], 'faq': ['Frequently Asked Questions', 'faq'],
  };
  MS.route(new RegExp('^\\/(' + Object.keys(TEXT).join('|') + ')$'), async (m, view) => {
    const [title, slug] = TEXT[m[1]];
    const p = await MS.api('/page/' + slug);
    page(view, title, `${crumb([title])}${head(slug === 'about-us' ? 'Our story' : 'Information', title)}<div class="prose static" style="max-width:96ch">${MS.clean(p.html)}</div>`);
  });

  /* ---------- Bulk enquiry: robu.in/businesstobusiness ---------- */
  MS.route(/^\/(businesstobusiness|bulk-enquiry|robu-b2b)$/, async (m, view) => {
    const p = await MS.api('/page/businesstobusiness');
    page(view, 'Bulk Enquiry', `${crumb(['Bulk Enquiry'])}${head('Business to Business', 'Bulk Enquiry')}${MS.clean(p.html)}`);
  });

  /* ---------- ATL kits enquiry: robu.in/atal ---------- */
  MS.route(/^\/(atal|kit-enquiry)$/, async (m, view) => {
    const p = await MS.api('/page/atal');
    page(view, 'ATL Kits Enquiry', `${crumb(['ATL Kits Enquiry'])}${head('Atal Tinkering Lab', 'ATL Kits Enquiry')}<div class="prose static" style="max-width:96ch">${MS.clean(p.html)}</div>
      <div style="max-width:860px;margin:36px 0 0">${form('atl', 'ATL kit enquiry', [['school', 'School / institution', { req: 1 }], ['name', 'Contact person', { req: 1 }], ['email', 'Email', { type: 'email', req: 1 }], ['phone', 'Mobile', { type: 'tel', req: 1 }], ['city', 'City / State'], ['details', 'Requirements', { type: 'textarea', full: 1, ph: 'Kits, quantities, budget, timeline' }]], 'atl', 'Submit enquiry')}</div>`);
    bind('#atl', '#atl-out', 'atl');
  });

  /* ---------- Latest products: robu.in/latest-products ---------- */
  MS.route(/^\/latest-products$/, (m, view) => MS.views.latest(view));

  /* ---------- Careers & Job Openings (matching robu.in) ---------- */

  // Main Careers directory page
  async function renderCareersList(view) {
    const [p, jobs] = await Promise.all([MS.api('/page/careers'), MS.api('/jobs')]);
    const depts = ['All', ...new Set(jobs.map((j) => j.department).filter(Boolean))];
    let activeDept = 'All';
    let searchQuery = '';
    let selectedType = 'All';

    const getFilteredJobs = () => {
      return jobs.filter((j) => {
        const matchDept = (activeDept === 'All') || (j.department === activeDept);
        const matchType = (selectedType === 'All') || (j.types || []).includes(selectedType);
        const q = searchQuery.toLowerCase().trim();
        const matchQuery = !q || (
          (j.job_title || '').toLowerCase().includes(q) ||
          (j.department || '').toLowerCase().includes(q) ||
          (j.short_description || '').toLowerCase().includes(q) ||
          (j.experience || '').toLowerCase().includes(q) ||
          (j.locations || []).some((l) => l.toLowerCase().includes(q))
        );
        return matchDept && matchType && matchQuery;
      });
    };

    const drawJobs = () => {
      const filtered = getFilteredJobs();
      const listEl = $('#career-jobs-list', view);
      const countEl = $('#career-jobs-count', view);
      if (countEl) countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'opening' : 'openings'}`;
      if (!listEl) return;

      if (!filtered.length) {
        listEl.innerHTML = `
          <div class="cr-nf" style="grid-column:1/-1;margin:0;max-width:none">
            <h2>No matching openings found</h2>
            <p>Try adjusting your search or choosing a different department.</p>
            <button class="btnx line" type="button" id="reset-filters-btn">Reset All Filters</button>
          </div>
        `;
        const rBtn = $('#reset-filters-btn', listEl);
        if (rBtn) {
          rBtn.addEventListener('click', () => {
            activeDept = 'All';
            searchQuery = '';
            selectedType = 'All';
            const sInput = $('#career-search', view);
            if (sInput) sInput.value = '';
            const tSel = $('#career-type-sel', view);
            if (tSel) tSel.value = 'All';
            const dSel = $('#career-dept-sel', view);
            if (dSel) dSel.value = 'All';
            drawJobs();
          });
        }
        return;
      }

      listEl.innerHTML = filtered.map((j) => {
        let exp = j.experience || '1-3';
        const expMatch = exp.match(/\d+\s*(?:-\s*\d+)?/);
        if (expMatch && !exp.toLowerCase().includes('fresher')) {
          exp = expMatch[0].replace(/\s+/g, '');
        } else if (exp.toLowerCase().includes('fresher')) {
          exp = '0-1';
        }
        const pos = (j.types && j.types[0]) ? (j.types[0].toLowerCase().includes('full') ? 'Full time' : j.types[0]) : 'Full time';
        const loc = (j.locations && j.locations.length) ? j.locations.join(', ') : 'Surat, Gujarat';
        const vac = j.vacancies || 1;
        const dept = (j.department || 'Generative AI').toUpperCase();

        return `
        <article class="jc" data-slug="${esc(j.slug)}">
          <span class="jc-dept">${esc(dept)}</span>
          <h3><a href="/opening/${esc(j.slug)}">${esc(j.job_title)}</a></h3>
          <dl class="jc-rows">
            <div><dt>Years of experience</dt><dd>${esc(exp)}</dd></div>
            <div><dt>Openings</dt><dd>${esc(vac)}</dd></div>
            <div><dt>Position</dt><dd>${esc(pos)}</dd></div>
            <div><dt>Location</dt><dd>${esc(loc)}</dd></div>
          </dl>
          <div class="jc-foot">
            <a class="jc-go" href="/opening/${esc(j.slug)}">View role <span aria-hidden="true">&rarr;</span></a>
          </div>
        </article>
      `;
      }).join('');
    };

    const html = `
      <section class="cr-hero">
        <div class="cr-hero-copy">
          <span class="cr-kick">Careers at MySemicon</span>
          <h1>Whats there in MySemicon <span>for you?</span></h1>
          <p>Real ownership, real learning and a team that moves fast. Find a role that fits where you want to grow.</p>
          <div class="cr-hero-cta"><a class="sor-btn-primary" href="#openings">See open roles <svg class="sor-svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a></div>
        </div>
        <div class="cr-hero-stats"><div><b>${jobs.length}</b><small>open roles</small></div><div><b>${depts.length - 1}</b><small>departments</small></div><div><b>Pune</b><small>on-site hub</small></div></div>
      </section>

            <section class="cr-openings" id="openings">
        <div class="sor-head" style="text-align:left;margin:0 0 22px"><span class="sor-kick">Wish to be a part of our team?</span><h2 class="sor-title" style="margin-bottom:0">Current openings <span id="career-jobs-count" class="cr-count">${jobs.length} openings</span></h2></div>
        <div class="cr-bar">
          <label class="cr-search"><svg class="sor-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><input type="text" id="career-search" placeholder="Search by role, department or location"></label>
          <select id="career-dept-sel" aria-label="Department">${depts.map((d) => `<option value="${esc(d)}">${esc(d === 'All' ? 'All departments' : d)}</option>`).join('')}</select>
          <select id="career-type-sel" aria-label="Job type"><option value="All">All job types</option><option value="Full Time">Full Time</option><option value="Part Time">Part Time</option><option value="Internship">Internship</option></select>
        </div>
        <div class="jobs" id="career-jobs-list"></div>
      </section>
    `;

    page(view, 'Careers | MySemicon', html);
    drawJobs();

    const sInput = $('#career-search', view);
    if (sInput) {
      sInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        drawJobs();
      });
    }

    const dSel = $('#career-dept-sel', view);
    if (dSel) {
      dSel.addEventListener('change', (e) => {
        activeDept = e.target.value;
        drawJobs();
      });
    }

    const tSel = $('#career-type-sel', view);
    if (tSel) {
      tSel.addEventListener('change', (e) => {
        selectedType = e.target.value;
        drawJobs();
      });
    }
  }

  // Individual Job Opening detail page
  async function renderJobDetail(slug, view) {
    let job = null;
    let allJobs = [];
    try {
      [job, allJobs] = await Promise.all([
        MS.api('/jobs/' + encodeURIComponent(slug)),
        MS.api('/jobs')
      ]);
    } catch (e) {
      if (slug === 'general-talent-pool') {
        job = {
          slug: 'general-talent-pool',
          job_title: 'General Application (Talent Pool)',
          department: 'All Departments',
          locations: ['Pune'],
          types: ['Full Time', 'Part Time', 'Internship'],
          experience: 'Any Experience Level',
          education: 'Any Qualification',
          vacancies: 5,
          salary_range: 'As per role & experience',
          posted_on: 'Recently',
          short_description: 'Submit your resume to our general talent pool for future openings across R&D, Logistics, Procurement, Quality, and Sales.',
          overview: 'MySemicon is constantly expanding. Even if there is no active job posting that matches your exact profile right now, we are always eager to connect with ambitious, passionate candidates who love robotics, electronics, and e-commerce.',
          responsibilities: [
            'Collaborate with multidisciplinary teams across hardware testing, warehousing, supply chain, and customer success.',
            'Drive high-speed execution aligned with company Objectives and Key Results (OKRs).',
            'Bring proactive problem-solving to technical or operational challenges.'
          ],
          requirements: [
            'Passion for technology, electronics, robotics, or e-commerce operations.',
            'Willingness to learn rapidly and work collaboratively on-site at our Pune hub.',
            'Strong dedication, ownership, and integrity.'
          ],
          benefits: [
            'Competitive salary, statutory benefits, and merit-based career progression.',
            'Access to cutting-edge electronic components and maker community.',
            'Friendly, high-energy work culture.'
          ]
        };
      }
    }

    if (!job) {
      page(view, 'Opening Not Found', `
        ${crumb(['Careers', '/careers'], ['Opening Not Found'])}
        <div class="cr-nf">
          <h2>Job opening not found</h2>
          <p>The position you are looking for may have been filled or the link has expired.</p>
          <a class="jd-apply-btn" href="/careers">← Browse all current openings</a>
        </div>
      `);
      return;
    }

    const related = (allJobs || []).filter((j) => j.slug !== job.slug).slice(0, 4);

    const html = `
      ${crumb(['Careers', '/careers'], [job.job_title])}

      <header class="jd-hero">
        <a class="jd-back" href="/careers">← All openings</a>
        <div class="jd-hero-row">
          <div>
            <span class="jd-dept">${esc(job.department || 'MySemicon')}</span>
            <h1>${esc(job.job_title)}</h1>
            <div class="jd-chips">
              <span>${(job.locations || ['Pune']).map(esc).join(', ')}</span>
              <span>${(job.types || ['Full Time']).map(esc).join(', ')}</span>
              ${job.experience ? `<span>${esc(job.experience)}</span>` : ''}
              ${job.vacancies ? `<span>${esc(job.vacancies)} ${job.vacancies === 1 ? 'opening' : 'openings'}</span>` : ''}
              ${job.posted_on ? `<span>Posted ${esc(job.posted_on)}</span>` : ''}
            </div>
          </div>
          <div class="jd-hero-cta"><a class="jd-apply-btn" href="#apply" id="jump-apply-btn">Apply now <span aria-hidden="true">↓</span></a><button class="jd-share" type="button" id="share-job-btn">Share</button></div>
        </div>
      </header>

      <!-- 2-Column Responsive Layout -->
      <div class="jd-grid">
        <!-- Main Column -->
        <main>
          <section class="jd-card"><h3>About the role</h3><p>${esc(job.overview || job.short_description || '')}</p></section>
          ${(job.responsibilities && job.responsibilities.length) ? `<section class="jd-card"><h3>Key responsibilities</h3><ul class="jd-list">${job.responsibilities.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></section>` : ''}
          ${(job.requirements && job.requirements.length) ? `<section class="jd-card"><h3>Requirements and qualifications</h3><ul class="jd-list">${job.requirements.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></section>` : ''}
          ${(job.benefits && job.benefits.length) ? `<section class="jd-card"><h3>What we offer</h3><ul class="jd-list">${job.benefits.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></section>` : ''}

          <!-- Quick Apply Form Card -->
          <div id="apply" style="margin-top:16px">
            <form id="job-apply-form" class="form">
              <h2>Apply For This Job</h2>
              <div id="job-app-feedback"></div>
              <input type="hidden" name="job_slug" value="${esc(job.slug)}">
              <input type="hidden" name="job_title" value="${esc(job.job_title)}">
              <div class="fgrid">
                <div class="fld"><label for="app-fname">First Name <span class="req">*</span></label><input type="text" id="app-fname" name="first_name" required placeholder="First Name" autocomplete="given-name"></div>
                <div class="fld"><label for="app-lname">Last Name <span class="req">*</span></label><input type="text" id="app-lname" name="last_name" required placeholder="Last Name" autocomplete="family-name"></div>
                <div class="fld"><label for="app-email">Email ID <span class="req">*</span></label><input type="email" id="app-email" name="email" required placeholder="Email ID" autocomplete="email"></div>
                <div class="fld"><label for="app-phone">Mobile / Contact Number <span class="req">*</span></label><input type="tel" id="app-phone" name="phone" required placeholder="Mobile / Contact Number" autocomplete="tel"></div>
                <div class="fld full"><label for="app-file">Attach Resume <span class="req">*</span></label><input type="file" id="app-file" name="file" accept=".pdf,.doc,.docx" required><small class="app-hint">Accepted formats: PDF, DOC, DOCX</small></div>
              </div>
              <button type="submit" class="btnx" id="app-submit-btn">Send Message</button>
            </form>
          </div>
        </main>

        <!-- Sidebar -->
        <aside class="jd-side">
          <div class="jd-sum">
            <h4>Job overview</h4>
            <dl class="jc-rows">
              <div><dt>Department</dt><dd>${esc(job.department || 'General')}</dd></div>
              <div><dt>Role type</dt><dd>${esc((job.types || []).join(', ') || 'Full Time')}</dd></div>
              <div><dt>Location</dt><dd>${esc((job.locations || []).join(', ') || 'Pune')}</dd></div>
              <div><dt>Experience</dt><dd>${esc(job.experience || 'Entry Level')}</dd></div>
              <div><dt>Education</dt><dd>${esc(job.education || 'Graduate')}</dd></div>
              <div><dt>Openings</dt><dd>${esc(job.vacancies || 1)}</dd></div>
              <div><dt>Salary</dt><dd>${esc(job.salary_range || 'Competitive')}</dd></div>
              <div><dt>Posted</dt><dd>${esc(job.posted_on || 'Recently')}</dd></div>
            </dl>
            <a class="jd-apply-btn jd-block" href="#apply">Apply for this role <span aria-hidden="true">→</span></a>
          </div>
          ${related.length ? `<div class="jd-sum"><h4>Other open positions</h4><div class="jd-more">${related.map((r) => `<a href="/opening/${esc(r.slug)}"><b>${esc(r.job_title)}</b><small>${esc(r.department || 'Open')} · ${esc((r.locations || [])[0] || 'Pune')}</small></a>`).join('')}</div></div>` : ''}
          <div class="jd-sum">
            <h4>Have questions?</h4>
            <p class="jd-q">Need more information about this role or our hiring timeline? Contact our talent team.</p>
            <p class="jd-q"><a class="jd-mail" href="mailto:support@robu.in">support@robu.in</a><br><a href="tel:${S.phone.replace(/[^\d+]/g, '')}">${esc(S.phone)}</a></p>
            <small>Monday – Saturday: 9:30 AM to 6:30 PM</small>
          </div>
        </aside>
      </div>
    `;

    page(view, `${job.job_title} | Careers at MySemicon`, html);

    if (window.location.hash === '#apply' || window.location.hash === '#apply-box') {
      setTimeout(() => {
        const el = $('#apply', view);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }

    const shareBtn = $('#share-job-btn', view);
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const url = window.location.origin + '/opening/' + encodeURIComponent(job.slug);
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(() => {
            shareBtn.textContent = 'Copied Link!';
            setTimeout(() => { shareBtn.textContent = 'Share'; }, 2000);
          });
        }
      });
    }

    const formEl = $('#job-apply-form', view);
    const feedback = $('#job-app-feedback', view);
    const submitBtn = $('#app-submit-btn', view);

    if (formEl) {
      formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        feedback.innerHTML = '';
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Sending...';

        try {
          const fd = new FormData(formEl);
          const res = await fetch('/api/jobs/apply', {
            method: 'POST',
            body: fd
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.detail || 'Could not submit application. Please verify details.');
          }

          formEl.style.display = 'none';
          feedback.innerHTML = `
            <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:14px;padding:24px;text-align:center">
              <div style="font-size:28px;color:#16a34a;margin-bottom:8px">✓</div>
              <h3 style="font:800 20px 'Bricolage Grotesque',sans-serif;color:#166534;margin:0 0 8px">Application Submitted Successfully!</h3>
              <div style="display:inline-block;padding:4px 14px;background:#dcfce7;border-radius:20px;font-weight:700;font-size:13px;color:#15803d;margin-bottom:12px">Reference ID: ${esc(data.reference)}</div>
              <p style="font-size:14px;color:#166534;line-height:1.6;margin:0 0 16px">Thank you for your interest in joining MySemicon! Our talent acquisition team has received your application and resume. We will review your profile and reach out within 2 business days.</p>
              <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
                <a href="/careers" class="btnx">Browse More Openings</a>
                <a href="/" class="btnx line">Back to Home</a>
              </div>
            </div>
          `;
          MS.toast('Application submitted successfully! Ref: ' + data.reference);
        } catch (err) {
          feedback.innerHTML = `<div class="msg err" style="margin-bottom:16px">${esc(err.message)}</div>`;
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Send Message';
        }
      });
    }
  }

  /* ---------- Careers Routes ---------- */
  MS.route(/^\/(careers|career)$/, (m, view) => renderCareersList(view));
  MS.route(/^\/(opening|careers|career)\/([a-zA-Z0-9_-]+)$/, (m, view) => renderJobDetail(m[2], view));


  /* ---------- Videos ---------- */
  MS.route(/^\/videos$/, async (m, view) => {
    const tabs = await MS.api('/videos');
    let cur = 0;
    const draw = () => {
      $('#vtabs').innerHTML = tabs.map((t, i) => `<button type="button" class="${i === cur ? 'on' : ''}" data-i="${i}">${esc(t.name)} <span>${t.videos.length}</span></button>`).join('');
      $('#vgrid2').innerHTML = tabs[cur].videos.map((v) => `<a class="vid vid2" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener"><div class="shot">${img('https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg', v.title)}<span class="play" aria-hidden="true"></span>${v.duration ? `<span class="dur">${esc(v.duration)}</span>` : ''}</div><h3>${esc(v.title)}</h3><p>${esc(v.desc).slice(0, 140)}${v.desc.length > 140 ? '…' : ''}</p></a>`).join('');
    };
    page(view, 'Videos', `${crumb(['Videos'])}${head('Watch', 'Videos', 'Product explainers, unboxings, project builds and two-minute tutorials.')}<div class="alpha vtabs" id="vtabs"></div><div class="vgrid2" id="vgrid2"></div>
      <p style="margin-top:22px"><a class="btnx line" href="https://www.youtube.com/@RobuInlabs" target="_blank" rel="noopener">More on YouTube →</a></p>`);
    draw();
    $('#vtabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; cur = +b.dataset.i; draw(); });
  });

  /* ---------- Contact us: robu.in/contact ---------- */
  MS.route(/^\/(contact|contact-us)$/, (m, view) => {
    page(view, 'Contact Us', `${crumb(['Contact Us'])}${head('Get in touch', 'Contact Us')}
      <div class="two"><div>${form('cu', 'Send message', [['name', 'Your name', { req: 1, ac: 'name' }], ['email', 'Email', { type: 'email', req: 1, ac: 'email' }], ['subject', 'Subject', { full: 1 }], ['message', 'Message', { type: 'textarea', full: 1, req: 1 }]], 'contact', 'Send message')}</div>
      <aside class="side-card contact-card"><h3>Contact information</h3>
        <p>Best way to contact us is through our support channel. Visit the link below and submit a ticket.<br><a href="mailto:${esc(S.email)}">${esc(S.email)}</a></p>
        <p><b>Technical and Sales Queries:</b></p>
        <p><b>📞 <a href="tel:${S.phone.replace(/[^\d+]/g, '')}">${esc(S.phone)}</a></b><br><b>📞 <a href="tel:${S.phone2.replace(/[^\d+]/g, '')}">${esc(S.phone2)}</a></b></p>
        <p>All days*: ${esc(S.hours)}<br><small>*Except public holidays</small></p><p>✉️ <a href="mailto:${esc(S.email)}">${esc(S.email)}</a></p>
        <p>📍 ${esc(S.address)}</p></aside></div>`);
    bind('#cu', '#cu-out', 'contact');
  });

  /* ---------- Sell on MySemicon: same sections and wording as robu.in/seller-form ---------- */
  MS.route(/^\/(seller-form|sell-on-mysemicon|sell-on-robu)$/, (m, view) => {
    MS.setTitle('Sell on MySemicon | Seller Onboarding');
    const ic = (d) => `<svg class="sor-svg" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
    const arrow = '<svg class="sor-svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    const why = [
      [ic('<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>'), 'Fast Onboarding', 'Submit your request online and go live in days — not weeks. Our team guides you through every step with a clear, document-light process.'],
      [ic('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'), 'Growing Seller Network', 'Join a curated community of verified Indian electronics suppliers and manufacturers — quality over quantity, always.'],
      [ic('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'), 'Dedicated Seller Support', 'Every seller gets a named category executive. No ticketing black holes — real people, real accountability, real response times.'],
      [ic('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'), 'High-Demand Technical Buyers', 'Reach engineers, hobbyists, students, and R&D teams who buy components regularly — not casual shoppers. High intent, low returns.']
    ];
    const steps = [
      [ic('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>'), 'Submit Request'],
      [ic('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'), 'Seller Review'],
      [ic('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'), 'T&C Shared'],
      [ic('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>'), 'Submit Docs'],
      [ic('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>'), 'Account Created'],
      [ic('<path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/>'), 'List Products'],
      [ic('<path d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6"/>'), 'Start Selling']
    ];
    const perks = [
      [ic('<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M17 11l2 2 4-4"/>'), 'Dedicated Category Executive', 'Your named point of contact who knows your product category and proactively helps you win orders.'],
      [ic('<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>'), 'Listing Optimization Support', 'We help you write better titles, descriptions, and specs so your products rank higher and convert better.'],
      [ic('<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>'), 'Faster Go-To-Market', 'Skip the months-long listing process. Our streamlined workflow gets your catalogue live in days.'],
      [ic('<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>'), 'Targeted Engineering Audience', 'Over a lakh engineers, makers, and students visit MySemicon monthly. This is your audience — and they\'re ready to buy.']
    ];
    const head = (kick, title, sub) => `<div class="sor-head"><span class="sor-kick">${kick}</span><h2 class="sor-title">${title}</h2><p class="sor-sub">${sub}</p></div>`;
    const FIELDS = [
          ['company', 'Company Name', { req: 1 }],
          ['country', 'Country Based Enterprises', { type: 'select', req: 1, opts: ['India', 'International'] }],
          ['website', 'Company Website URL', { req: 1, ph: 'https://example.com' }],
          ['address', 'Company Address', { req: 1, full: 1, ph: 'Full registered business address, City, State, Pincode' }],
          ['btype', 'Business Type', { type: 'select', req: 1, opts: ['Brand Owner', 'Manufacturer', 'Distributor', 'Authorized Reseller', 'Trader / Wholesaler'] }],
          ['gst', 'GST Number Available', { type: 'select', req: 1, opts: ['Yes', 'No'] }],
          ['gstin', 'GSTIN / Tax Identification Number', { ph: 'e.g. 27AAAAA0000A1Z5' }],
          ['name', 'Contact Person Name', { req: 1, ac: 'name', ph: 'Full name' }],
          ['title', 'Job Title / Designation', { req: 1, ph: 'e.g. Sales Manager, Director, Founder' }],
          ['phone', 'Mobile / Contact Number', { type: 'tel', req: 1, ac: 'tel', ph: '10-digit mobile number' }],
          ['email', 'Email Address', { type: 'email', req: 1, ac: 'email', ph: 'business email address' }],
          ['category', 'Primary Product Category', { type: 'select', req: 1, full: 1, opts: [
            'Sensors, Modules & IoT',
            'Development Boards, Microcontrollers & Programmers',
            'Drone, Quadcopter & RC Components',
            '3D Printing, Filament & CNC Machines',
            'Motors, Steppers, Servos & Drivers',
            'Batteries, BMS, Chargers & Power Supplies',
            'Robotics Kits, Chassis & Mechanical Hardware',
            'Soldering, Tools & Test Equipment',
            'Electronic Components (Semiconductors, Passives, Relays)',
            'Other Hardware & Accessories'
          ] }],
          ['brands', 'Brand Name(s) Represented / Manufactured', { req: 1, full: 1, ph: 'Brands you manufacture, own, or distribute' }],
          ['catalog', 'Products Catalog Link / Line Card URL', { req: 1, full: 1, ph: 'Provide website URL, Google Drive / Dropbox link, or PDF catalog link' }],
          ['notes', 'Additional Details / Commercial Terms', { type: 'textarea', full: 1, ph: 'Mention any details regarding MOQ, stock availability, dispatch turnaround time, warranty terms, or pricing.' }]
        ];
    const pick = (...n) => FIELDS.filter((f) => n.includes(f[0]));
    const WSTEPS = [
      ['Company', 'Company details', 'Tell us who you are.', pick('company', 'country', 'website', 'address', 'btype')],
      ['Business', 'Business and products', 'What you sell and your tax details.', pick('gst', 'gstin', 'category', 'brands', 'catalog', 'notes')],
      ['Contact', 'Contact person', 'Who should our category team speak to?', pick('name', 'title', 'phone', 'email')]
    ];
    const wizardShell = `<div class="sor-modal" id="sor-modal" hidden role="dialog" aria-modal="true" aria-labelledby="sor-wt"><div class="sor-wiz">
      <button type="button" class="sor-x" data-close aria-label="Close">\u00d7</button>
      <div class="sor-prog">${WSTEPS.map((st, i) => `<div class="sor-pg" data-pg="${i}"><span class="sor-pg-dot">${i + 1}</span><span class="sor-pg-lbl">${st[0]}</span></div>`).join('<i class="sor-pg-bar"></i>')}</div>
      <form id="sf" novalidate>
        ${WSTEPS.map((st, i) => `<section class="sor-pane" data-pane="${i}" hidden><h2${i === 0 ? ' id="sor-wt"' : ''}>${st[1]}</h2><p class="sor-pane-sub">Step ${i + 1} of 3 \u2014 ${st[2]}</p><div class="fgrid">${st[3].map((f) => fld(f[0], f[1], f[2] || {})).join('')}</div></section>`).join('')}
        <div id="sf-out"></div>
        <div class="sor-wiz-nav"><button type="button" class="sor-back" data-back>\u2190 Back</button><button type="button" class="sor-next" data-next>Next \u2192</button><button type="submit" class="sor-submit" hidden>Submit Sell Request</button></div>
      </form>
      <div class="sor-done" hidden></div></div></div>`;
    view.innerHTML = `<div class="wrap pg sor-page">
      <section class="sor-hero">
        <nav class="sor-subnav" aria-label="Sell on MySemicon sections"><button type="button" class="sor-subnav-link" data-go="sor-why">Why MySemicon</button><button type="button" class="sor-subnav-link" data-go="sor-how">How It Works</button><button type="button" class="sor-subnav-link" data-go="sor-benefits">Benefits</button><button type="button" class="sor-subnav-cta" data-go="seller-app-form">Start Selling →</button></nav>
        <div class="sor-hero-grid">
          <div class="sor-hero-copy">
            <div class="sor-hero-badge"><span class="sor-hero-dot"></span>Seller Program \u2014 Open for Applications</div>
            <h1 class="sor-hero-h1">Sell to India's Most <span>Tech-Savvy</span> Buyers</h1>
            <p class="sor-hero-sub">Join MySemicon's seller network and reach thousands of engineers, makers, and hardware professionals actively sourcing components and electronics online.</p>
            <div class="sor-hero-ctas"><button type="button" class="sor-btn-primary" data-open="seller">Start Selling on MySemicon ${arrow}</button><button type="button" class="sor-btn-secondary" data-go="sor-how">See how it works ${arrow}</button></div>
            <div class="sor-hero-trust"><span>Takes less than 5 minutes</span><span>No upfront cost</span><span>GSTIN required</span></div>
          </div>
          <aside class="sor-hero-card" aria-label="Seller onboarding at a glance">
            <div class="sor-hc-top"><span class="sor-hc-title">Seller onboarding</span><span class="sor-hc-live"><i></i>Open</span></div>
            <div class="sor-hc-stats"><div><b>3\u20135</b><small>business days to onboard</small></div><div><b>1 lakh+</b><small>engineers visit monthly</small></div><div><b>7</b><small>simple steps to first sale</small></div></div>
            <ol class="sor-hc-list"><li><span>1</span>Submit your request online</li><li><span>2</span>Category team reviews your catalogue</li><li><span>3</span>Share documents and go live</li></ol>
            <button type="button" class="sor-hc-btn" data-open="seller">Submit Sell Request ${arrow}</button>
          </aside>
        </div>
      </section>

      <section class="sor-section" id="sor-why">${head('Why MySemicon', 'The smarter way to sell electronics in India', 'We\'ve built a platform specifically for the technical hardware niche — not a general marketplace, but a community your customers already trust.')}
        <div class="sor-grid">${why.map(([i, t, d]) => `<div class="sor-card"><div class="sor-ico">${i}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></section>

      <section class="sor-section" id="sor-how">${head('Process', 'From application to first sale', 'A clear, structured journey with no surprises. Most sellers complete onboarding within 3–5 business days.')}
        <div class="sor-steps">${steps.map(([i, t], n) => `<div class="sor-step"><div class="sor-step-circle">${i}</div><div class="sor-step-num">Step ${n + 1}</div><div class="sor-step-name">${t}</div></div>`).join('')}</div></section>

      <section class="sor-section" id="sor-benefits">${head('Seller Benefits', 'Everything you need to grow faster', 'We don\'t just give you a listing page — we give you the tools and support to actually move inventory.')}
        <div class="sor-grid">${perks.map(([i, t, d]) => `<div class="sor-card"><div class="sor-ico">${i}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></section>

      <section class="sor-cta">
        <h2 class="sor-cta-title">Start Selling to India's Fastest<br>Growing Tech Community</h2>
        <p class="sor-cta-sub">Join hundreds of verified sellers already growing with MySemicon. Takes less than 5 minutes to apply.</p>
        <button type="button" class="sor-btn-white" data-open="seller">Submit Sell Request ${arrow}</button>
        <div class="sor-cta-trust"><span>${ic('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>')}Secure &amp; confidential onboarding</span><span>${ic('<circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>')}No upfront cost to join</span><span>${ic('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>')}Dedicated support team</span></div>
      </section>

      ${wizardShell}
    </div>`;
    $$('[data-go]', view).forEach((b) => b.addEventListener('click', () => { const t = document.getElementById(b.dataset.go); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    const modal = $('#sor-modal', view), panes = $$('.sor-pane', modal), form = $('#sf', modal);
    let cur = 0;
    const show = (n) => {
      cur = n;
      panes.forEach((p, i) => { p.hidden = i !== n; });
      $$('.sor-pg', modal).forEach((el, i) => { el.classList.toggle('on', i === n); el.classList.toggle('done', i < n); });
      $$('.sor-pg-bar', modal).forEach((el, i) => el.classList.toggle('done', i < n));
      $('[data-back]', modal).style.visibility = n ? 'visible' : 'hidden';
      $('[data-next]', modal).hidden = n === panes.length - 1;
      $('.sor-submit', modal).hidden = n !== panes.length - 1;
      $('#sf-out', modal).innerHTML = '';
      const first = panes[n].querySelector('input,select,textarea'); if (first) first.focus({ preventScroll: true });
      $('.sor-wiz', modal).scrollTop = 0;
    };
    const gstSync = () => { const g = $('#r-gstin', modal); if (g) g.required = $('#r-gst', modal).value === 'Yes'; };
    $('#r-gst', modal).addEventListener('change', gstSync);
    const valid = (n) => {
      gstSync();
      for (const el of $$('input,select,textarea', panes[n])) { if (!el.checkValidity()) { el.reportValidity(); return false; } }
      return true;
    };
    const open = () => { modal.hidden = false; document.body.style.overflow = 'hidden'; $('.sor-done', modal).hidden = true; form.hidden = false; $('.sor-prog', modal).hidden = false; show(0); };
    const close = () => { modal.hidden = true; document.body.style.overflow = ''; };
    $$('[data-open]', view).forEach((b) => b.addEventListener('click', open));
    $$('[data-close]', modal).forEach((b) => b.addEventListener('click', close));
    modal.addEventListener('mousedown', (e) => { if (e.target === modal) close(); });
    const onKey = (e) => { if (e.key === 'Escape' && !modal.hidden) close(); };
    document.addEventListener('keydown', onKey);
    MS.onLeave(() => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; });
    $('[data-next]', modal).addEventListener('click', () => { if (valid(cur)) show(cur + 1); });
    $('[data-back]', modal).addEventListener('click', () => show(cur - 1));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!valid(cur)) return;
      for (let i = 0; i < panes.length; i++) if (!valid(i)) { show(i); valid(i); return; }
      const btn = $('.sor-submit', modal); btn.disabled = true; btn.textContent = 'Submitting\u2026';
      try {
        const r = await MS.api('/enquiry', { method: 'POST', body: { kind: 'seller', ...formData(form) } });
        form.hidden = true; $('.sor-prog', modal).hidden = true;
        const done = $('.sor-done', modal); done.hidden = false;
        done.innerHTML = `<div class="sor-ok">\u2713</div><h2>Request submitted</h2><p>Thank you! Your seller request is recorded. Reference <b>${esc(r.reference)}</b>. Our category team will review it and get back to you within 2 business days.</p><button type="button" class="sor-next" data-close>Close</button>`;
        $('[data-close]', done).addEventListener('click', close); form.reset();
      } catch (x) { $('#sf-out', modal).innerHTML = `<div class="msg err">${esc(x.message)}</div>`; }
      btn.disabled = false; btn.textContent = 'Submit Sell Request';
    });
  });
})();
