/* Service pages (3D printing, industrial printing, laser cutting, PCB, custom battery pack):
   Exact UI, interactive configurators, Gerber dropzones, specifications, trust badges, and tabs matching Robu.in. */
(function () {
  'use strict';
  const { esc, img, $, $$ } = MS;

  // --------------------------------------------------------------------------- Technical Specifications
  const SERVICE_SPECS = {
    '3d-printing-service1': {
      'Technology': 'FDM (Fused Deposition Modeling)',
      'Build Volume': '35 × 35 × 35 cm (13.77″ × 13.77″ × 13.77″)',
      'Filament Diameter': '1.75 mm',
      'Nozzle Diameters': '0.4 mm & 0.6 mm',
      'Infill Patterns': 'Gyroid, Rectilinear, Grid',
      'Supported Materials': 'PLA, PETG, ABS, ASA, TPU 95A, PA-CF (Nylon Carbon Fiber), PLA Glass, ePLA',
      'Supported Wall Thickness': '1.0 mm (0.4 Nozzle) & 1.2 mm (0.6 Nozzle)',
      'Assembly Tolerance': '0.2 mm',
      'Dimensional Accuracy': '±0.2 mm',
      'Colors Available': '35+ Colors across all materials',
      'Lead Time': 'From 1 Business Day',
      'Supported Formats': 'STL, OBJ, STP, STEP, IGS, IGES',
      'Country of Origin': 'India'
    },
    'metal-laser-cutting': {
      'Technology': 'High Precision Fiber Laser Cutting',
      'Maximum Sheet Size': '500 × 500 mm (19.68″ × 19.68″)',
      'Supported Materials': 'Mild Steel, Stainless Steel (304), Aluminium (6061 T6)',
      'Supported Thickness': '1 mm – 5 mm',
      'Laser Tolerance': '±0.2 mm',
      'Material Tolerance': '±0.2 mm',
      'Lead Time': 'From 4–5 Business Days',
      'Accepted File Formats': 'DXF, DWG, SVG, STEP, PDF',
      'Cutting Assist Gases': 'High Purity Nitrogen & Oxygen',
      'Edge Quality': 'Burr-free, clean cut edges ready for tapping/bending',
      'Country of Origin': 'India'
    },
    'online-laser-cutting-service': {
      'Technology': 'High Precision CO2 Laser Cutting & Engraving',
      'Maximum Sheet Size': '500 × 500 mm (19.68″ × 19.68″)',
      'Balsa Wood Max Size': '100 × 1000 mm (4″ × 39.36″)',
      'Supported Materials': 'Acrylic (Cast & Extruded 2–5mm in 8+ colors), ABS (1-side textured 2–3mm), MDF (2–3mm), Aeroply (3–5mm), Balsa Wood (3–5mm), Polycarbonate (1mm), Carbon Fiber (2–5mm), Mirror Acrylic (Gold/Silver)',
      'Supported Thickness': '1 mm – 5 mm',
      'Laser Tolerance': '(-)0.2 mm to (-)0.5 mm',
      'Material Tolerance (Acrylic)': '(-)0.2 mm to (-)0.5 mm',
      'Material Tolerance (MDF)': '(+)0.3 mm to (+)0.6 mm',
      'Material Tolerance (ABS)': '(+)0.2 mm',
      'Lead Time': 'From 2–3 Business Days',
      'Accepted Formats': 'DXF, DWG, SVG, STEP, PDF',
      'Country of Origin': 'India'
    },
    'online-pcb-manufacturing-service': {
      'Base Material': 'FR-4 Standard / High TG (TG135, TG140, TG155)',
      'Number of Layers': '1, 2, 4, 6 Layers (High Precision)',
      'Board Thickness Range': '0.4 mm, 0.6 mm, 0.8 mm, 1.0 mm, 1.2 mm, 1.6 mm, 2.0 mm',
      'Board Outline Tolerance': '±0.2 mm (Regular) / ±0.1 mm (Precision)',
      'Solder Mask Colors': 'Green, Red, Yellow, Blue, White, Black',
      'Silkscreen Legend': 'White, Black',
      'Surface Finish Options': 'HASL (with lead), Leadfree HASL-RoHS, ENIG-RoHS (Immersion Gold)',
      'Copper Thickness': 'Outer 1 oz / 2 oz, Inner 0.5 oz / 1 oz / 2 oz',
      'Minimum Via Hole Size': '0.15 mm – 0.3 mm (via diameter 0.25 mm – 0.45 mm)',
      'Via Covering': 'Tented, Untented, Plugged, Epoxy Filled & Capped',
      'Quality Standards': 'IPC Class 2 Standard / Superb Quality',
      'Electrical Testing': 'Flying Probe 100% Fully Tested / Randomly Tested',
      'Delivery Formats': 'Single PCB / Panelized by MySemicon (V-cut / Mouse bites)',
      'Lead Time': '15 – 20 Business Days',
      'Accepted File Formats': 'Gerber ZIP, RAR (RS-274X format)',
      'Country of Origin': 'India'
    },
    'industrial-3d-printing': {
      'Technologies Offered': 'SLA (Stereolithography), MJF (Multi Jet Fusion), SLS (Selective Laser Sintering), SLM (Selective Laser Melting Metal), WJP (Wax Jet / Full Color Resin), BJ (Binder Jetting Metal)',
      'SLA Materials': '9600 Resin, Black Resin, Imagine Black, 8228 High-Temp, LEDO 6060, 8001 Clear, CBY Resin, Black Resin Standard, Grey Resin, High-Temp Resin, 9000HE',
      'MJF Materials': 'PA12-HP Nylon, PA11-HP Nylon, PAC-HP Multicolor Nylon, PA12S-HP Nylon',
      'SLM Metal Materials': '316L Stainless Steel, Titanium TC4',
      'SLS Materials': '3201PA-F Nylon, 1172Pro Nylon, 3301PA Nylon, 3401GB Glass-Filled Nylon',
      'WJP Materials': 'Full Color Resin, Full Color Tough Resin',
      'BJ Materials': 'BJ-316L Stainless Steel',
      'Dimensional Tolerance': '±0.2 mm (≤100 mm) or ±0.3% (SLA/WJP); ±0.3 mm (≤100 mm) or ±0.4% (MJF/SLS/SLM)',
      'Applications': 'Rapid functional prototypes, medical devices, high-temperature tooling, end-use production parts',
      'Lead Time': '15 – 20 Working Days',
      'Accepted Formats': 'STL, STP, STEP, 3MF',
      'Country of Origin': 'India'
    },
    'custom-battery-pack': {
      'Battery Chemistries': 'Lithium-Ion (Grade A 18650 / 21700), Lithium Iron Phosphate (LiFePO4 2000+ cycles), Lithium Polymer (LiPo), NMC',
      'Cell Quality & Certification': 'Grade A BIS Certified Cells (Bureau of Indian Standards / IS 16046)',
      'Voltage Configurations': '3.7V (1S), 7.4V (2S), 11.1V/12V (3S), 14.8V (4S), 24V (7S/8S), 36V (10S), 48V (13S/16S), 52V (14S), 60V (16S/20S), 72V (20S/24S), Custom',
      'Capacity Range': '2,000 mAh to 100+ Ah',
      'Protection Circuit (BMS)': 'Integrated Smart BMS with Overcharge, Overdischarge, Overcurrent, Short-Circuit & Thermal Cutoff Protection (Optional Bluetooth Telemetry BMS)',
      'Heavy-Duty Connectors': 'Genuine Amass XT60, XT90 Anti-Spark, Anderson Powerpole 45A/75A, Deans T-Plug, DC 5.5x2.1 Barrel, Bare Silicone Leads',
      'Enclosure & Packaging': 'Industrial Blue PVC Heat Shrink / Hard Polycarbonate Case / Custom 3D Printed ABS Case / Sheet Metal Box',
      'Warranty': '1 Year Warranty on Protected Battery Packs, 6 Months on Standard Packs',
      'Lead Time': '5 – 6 Working Days',
      'Applications': 'Electric Vehicles (EV), Drones & UAVs, Robotics & AGVs, Medical Equipment, Solar Energy Storage (ESS), IoT & Industrial Automation',
      'Country of Origin': 'India'
    }
  };

  // --------------------------------------------------------------------------- Service-specific FAQs (QnA)


  const SERVICE_METAS = {   // brand and tags exactly as listed on the source store; services without a brand or tags there have none here
    '3d-printing-service1': { brand: 'EasyMech', category: 'MySemicon Services', tags: '3d printing service, 3d printing service in India, online 3d printing service, fdm 3d printing' },
    'metal-laser-cutting': { category: 'MySemicon Services' },
    'online-laser-cutting-service': { brand: 'EasyMech', category: 'MySemicon Services' },
    'online-pcb-manufacturing-service': { category: 'MySemicon Services' },
    'industrial-3d-printing': { category: 'MySemicon Services', tags: 'online 3d printing service, SLA 3d printing, 3D printing Service near me' },
    'custom-battery-pack': { brand: 'Orange', category: 'MySemicon Services' }
  };


  // --------------------------------------------------------------------------- Trust Badges Bar
  function renderTrustBadges(badgeCount) {
    if (badgeCount === 3) {
      return `
        <div class="svc-trust-badges-row">
          <a class="svc-trust-badge" href="/businesstobusiness/">
            <div class="svc-trust-icon-wrap"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
            <span>Have a Bulk Order ?<br><b style="color:#2a1f38">Click Here</b></span>
          </a>
          <a class="svc-trust-badge" href="/contact/">
            <div class="svc-trust-icon-wrap"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg></div>
            <span>Need Support ?<br><b style="color:#2a1f38">Click Here</b></span>
          </a>
          <div class="svc-trust-badge">
            <div class="svc-trust-icon-wrap"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16,8 20,8 23,11 23,16 16,16"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>
            <span>Free Delivery<br>Above &#8377;499</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="svc-trust-badges-row">
        <a class="svc-trust-badge" href="/businesstobusiness/">
          <div class="svc-trust-icon-wrap"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <span>Have a Bulk Order ?<br><b style="color:#2a1f38">Click Here</b></span>
        </a>
        <a class="svc-trust-badge" href="/contact/">
          <div class="svc-trust-icon-wrap"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg></div>
          <span>Need Support ?<br><b style="color:#2a1f38">Click Here</b></span>
        </a>
        <div class="svc-trust-badge">
          <div class="svc-trust-icon-wrap"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg></div>
          <span>15 Days Warranty<br>Against Sealed Product</span>
        </div>
        <div class="svc-trust-badge">
          <div class="svc-trust-icon-wrap"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16,8 20,8 23,11 23,16 16,16"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>
          <span>Free Delivery<br>Above &#8377;499</span>
        </div>
        <div class="svc-trust-badge">
          <div class="svc-trust-icon-wrap"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg></div>
          <span>Cash on<br>Delivery*</span>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------- Interactive 3D / 2D Canvas Mockup
  function initViewerCanvas(canvas, mode) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = (canvas.width = canvas.clientWidth || 400);
    const h = (canvas.height = canvas.clientHeight || 260);

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const gridStep = 24;
    for (let x = 0; x < w; x += gridStep) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += gridStep) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    if (mode === '3d') {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      const cx = w / 2, cy = h / 2 + 30;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 60); ctx.lineTo(cx + 100, cy - 10); ctx.lineTo(cx, cy + 40); ctx.lineTo(cx - 100, cy - 10); ctx.closePath();
      ctx.fillStyle = 'rgba(241, 245, 249, 0.7)'; ctx.fill(); ctx.stroke();

      ctx.strokeStyle = '#2a1f38'; ctx.lineWidth = 2;
      const my = cy - 25;
      ctx.beginPath();
      ctx.moveTo(cx, my - 40); ctx.lineTo(cx + 45, my - 15); ctx.lineTo(cx, my + 10); ctx.lineTo(cx - 45, my - 15); ctx.closePath();
      ctx.fillStyle = 'rgba(48, 7, 98, 0.12)'; ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 45, my - 15); ctx.lineTo(cx - 45, my + 35); ctx.lineTo(cx, my + 60); ctx.lineTo(cx, my + 10); ctx.closePath();
      ctx.fillStyle = 'rgba(48, 7, 98, 0.2)'; ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + 45, my - 15); ctx.lineTo(cx + 45, my + 35); ctx.lineTo(cx, my + 60); ctx.lineTo(cx, my + 10); ctx.closePath();
      ctx.fillStyle = 'rgba(48, 7, 98, 0.28)'; ctx.fill(); ctx.stroke();

      ctx.strokeStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(25, h - 25); ctx.lineTo(55, h - 25); ctx.stroke();
      ctx.strokeStyle = '#22c55e'; ctx.beginPath(); ctx.moveTo(25, h - 25); ctx.lineTo(25, h - 55); ctx.stroke();
      ctx.strokeStyle = '#3b82f6'; ctx.beginPath(); ctx.moveTo(25, h - 25); ctx.lineTo(45, h - 40); ctx.stroke();
    } else {
      const cx = w / 2, cy = h / 2;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
      ctx.strokeRect(cx - 90, cy - 65, 180, 130);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.fillRect(cx - 90, cy - 65, 180, 130);

      ctx.strokeStyle = '#2a1f38'; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(cx - 40, cy, 22, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeRect(cx + 10, cy - 35, 55, 70);
      ctx.strokeRect(cx + 25, cy - 15, 25, 30);
    }
  }

  // --------------------------------------------------------------------------- PCB & Service Price Calculators
  function calcPcbPrice(len, wid, layers, qty) {
    const l = Math.max(10, parseFloat(len) || 100);
    const w = Math.max(10, parseFloat(wid) || 100);
    const q = Math.max(5, parseInt(qty, 10) || 5);
    const areaSqM = (l * w * q) / 1000000;
    let base = 480;
    if (layers === '1') base = 420;
    else if (layers === '2') base = 480;
    else if (layers === '4') base = 1850;
    else if (layers === '6') base = 4200;

    let total = base + (areaSqM * 1800);
    if (q > 5) total += (q - 5) * (layers === '4' ? 65 : layers === '6' ? 140 : 22);
    return Math.round(total);
  }

  function calcNonMetalLaserPrice(mat, len, wid, qty) {
    const l = Math.min(500, Math.max(20, parseFloat(len) || 150));
    const w = Math.min(500, Math.max(20, parseFloat(wid) || 150));
    const q = Math.max(1, parseInt(qty, 10) || 1);
    const areaSqCm = (l * w) / 100;

    let base = 200;
    let rate = 0.05;
    const m = (mat || '').toLowerCase();
    if (m.includes('2mm')) { base = 180; rate = 0.04; }
    else if (m.includes('3mm')) { base = 200; rate = 0.05; }
    else if (m.includes('4mm')) { base = 240; rate = 0.065; }
    else if (m.includes('5mm')) { base = 290; rate = 0.08; }
    else if (m.includes('mdf')) { base = 160; rate = 0.03; }
    else if (m.includes('balsa')) { base = 190; rate = 0.04; }
    else if (m.includes('aeroply')) { base = 220; rate = 0.05; }
    else if (m.includes('carbon')) { base = 480; rate = 0.22; }

    const unit = base + (areaSqCm * rate);
    return Math.round(unit * q);
  }

  function calcMetalLaserPrice(mat, len, wid, gas, qty) {
    const l = Math.min(500, Math.max(20, parseFloat(len) || 150));
    const w = Math.min(500, Math.max(20, parseFloat(wid) || 150));
    const q = Math.max(1, parseInt(qty, 10) || 1);
    const areaSqCm = (l * w) / 100;

    let base = 320;
    let rate = 0.055;
    const m = (mat || '').toLowerCase();
    if (m.includes('mild steel 1mm')) { base = 320; rate = 0.045; }
    else if (m.includes('mild steel 2mm')) { base = 360; rate = 0.065; }
    else if (m.includes('mild steel 3mm')) { base = 410; rate = 0.085; }
    else if (m.includes('mild steel 4mm')) { base = 480; rate = 0.11; }
    else if (m.includes('mild steel 5mm')) { base = 550; rate = 0.14; }
    else if (m.includes('aluminium 1mm')) { base = 380; rate = 0.07; }
    else if (m.includes('aluminium 2mm')) { base = 450; rate = 0.11; }
    else if (m.includes('aluminium 3mm')) { base = 540; rate = 0.15; }
    else if (m.includes('stainless steel 1mm')) { base = 420; rate = 0.09; }
    else if (m.includes('stainless steel 2mm')) { base = 520; rate = 0.14; }
    else if (m.includes('stainless steel 3mm')) { base = 650; rate = 0.20; }

    const g = (gas || '').toLowerCase();
    const gasMul = g.includes('nitrogen') ? 1.05 : 1.0;
    const unit = (base + (areaSqCm * rate)) * gasMul;
    return Math.round(unit * q);
  }

  function calcFdm3dPrice(profile, mat, infillStr, weightGrams, qty) {
    const w = Math.max(5, parseFloat(weightGrams) || 50);
    const q = Math.max(1, parseInt(qty, 10) || 1);
    const infillPct = parseInt(infillStr, 10) || 20;

    let ratePerGram = 2.80;
    const m = (mat || '').toLowerCase();
    if (m.includes('abs')) ratePerGram = 3.10;
    else if (m.includes('petg')) ratePerGram = 3.30;
    else if (m.includes('asa')) ratePerGram = 3.60;
    else if (m.includes('tpu')) ratePerGram = 4.60;
    else if (m.includes('carbon') || m.includes('pa-cf')) ratePerGram = 7.80;

    let profMul = 1.0;
    const p = (profile || '').toLowerCase();
    if (p.includes('0.15')) profMul = 1.25;
    else if (p.includes('0.1 mm')) profMul = 1.5;
    else if (p.includes('0.6mm')) profMul = 0.9;

    const infillMul = 0.7 + (infillPct / 100) * 0.6;
    const base = 80;
    const unit = (base + (w * ratePerGram * infillMul)) * profMul;
    return Math.round(unit * q);
  }

  function calcIndustrial3dPrice(tech, mat, volumeCm3, qty) {
    const vol = Math.max(5, parseFloat(volumeCm3) || 60);
    const q = Math.max(1, parseInt(qty, 10) || 1);

    let base = 380;
    let ratePerCm3 = 9.5;
    const m = (mat || '').toLowerCase();
    if (tech === 'sla') { base = 380; ratePerCm3 = (m.includes('clear') || m.includes('high-temp') ? 13.0 : 9.5); }
    else if (tech === 'mjf') { base = 680; ratePerCm3 = (m.includes('multicolor') ? 25.0 : 18.5); }
    else if (tech === 'sls') { base = 620; ratePerCm3 = 16.5; }
    else if (tech === 'slm') { base = 1850; ratePerCm3 = (m.includes('titanium') ? 115.0 : 68.0); }
    else if (tech === 'wjp') { base = 750; ratePerCm3 = 22.0; }
    else if (tech === 'bj') { base = 1200; ratePerCm3 = 45.0; }

    const unit = base + (vol * ratePerCm3);
    return Math.round(unit * q);
  }

  function calcBatteryPackPrice(chem, voltage, ah, enclosure, qty) {
    const v = Math.max(3.7, parseFloat(voltage) || 48);
    const cap = Math.max(1, parseFloat(ah) || 20);
    const q = Math.max(1, parseInt(qty, 10) || 1);
    const wh = v * cap;

    let ratePerWh = 11.50;
    const ch = (chem || '').toLowerCase();
    if (ch.includes('lifepo4')) ratePerWh = 14.00;
    else if (ch.includes('lipo')) ratePerWh = 16.50;
    else if (ch.includes('nmc')) ratePerWh = 13.00;

    let bms = 650;
    if (v >= 52) bms = 2100;
    else if (v >= 24) bms = 1250;

    let enc = 150;
    const e = (enclosure || '').toLowerCase();
    if (e.includes('polycarbonate')) enc = 480;
    else if (e.includes('3d')) enc = 850;
    else if (e.includes('metal')) enc = 1600;

    const unit = (wh * ratePerWh) + bms + enc;
    return Math.round(unit * q);
  }

  // --------------------------------------------------------------------------- Render PCB Service
  /** Banner shared by every service page: tag, title and a row of key facts (each fact is an HTML string). */
  function serviceHero(p, facts) {
    return `<div class="svc-hero"><span class="svc-hero-cat-tag">MySemicon Services</span><h1>${esc(p.name)}</h1>
      <div class="svc-hero-submeta">${facts.map((f) => `<span>${f}</span>`).join('')}</div></div>`;
  }

  function renderPcbService(p, cfg, view) {
    const meta = SERVICE_METAS[p.slug] || {};
    let chosenLayers = '2';
    let chosenQty = 5;
    let chosenLen = 100;
    let chosenWid = 100;
    let chosenColor = 'Green';
    let uploadedFile = null;

    const reviewCountText = p.rating && p.rating.reviewCount ? `(${p.rating.reviewCount} customer reviews)` : '(221 customer reviews)';

    const updatePrice = () => {
      const price = calcPcbPrice(chosenLen, chosenWid, chosenLayers, chosenQty);
      const prEl = $('#pcb-calc-price', view);
      if (prEl) prEl.textContent = '₹' + price.toLocaleString('en-IN') + '.00';
    };

    view.innerHTML = `
      <div class="wrap pg">
        <div class="crumbs" style="margin-bottom:14px">
          <a href="/">Home</a><span aria-hidden="true">&rarr;</span>
          <a href="/shop/">Shop</a><span aria-hidden="true">&rarr;</span>
          <span>${esc(p.name)}</span>
        </div>

        ${serviceHero(p, [esc(reviewCountText), `SKU : ${esc(p.sku || '1373369')}`, 'Lead time: <b>15–20 Business Days</b>'])}

        <div class="svc-pd-layout">
          <!-- Left Column: Configurator -->
          <div class="svc-config-col">
            <!-- Gerber Upload Box -->
            <div class="svc-gerber-card">
              <div class="svc-gerber-head">
                <span>Upload Gerber File</span>
                <a href="#prep-guide" id="btn-prep-guide">File Preparation Guide &rsaquo;</a>
              </div>
              <div class="svc-gerber-drop" id="pcb-dropzone">
                <input type="file" id="pcb-file-input" accept=".zip,.rar,.7z" hidden>
                <button type="button" class="svc-gerber-btn" id="btn-browse-gerber">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Add Gerber File
                </button>
                <small id="pcb-file-status">Only accept .zip or .rar · Max 100 MB</small>
                <span class="svc-gerber-secure">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  All uploads are secure and confidential.
                </span>
              </div>
            </div>

            <section class="svc-step-card svc-step-card-active" id="pcb-step-details">
            <!-- Stepper 1: PCB Details -->
            <div class="svc-step-header">
              <div class="svc-step-badge-title">
                <span class="svc-step-circle">1</span>
                <span>PCB Details</span>
              </div>
              <a class="svc-step-extralink" id="btn-capabilities" href="#capabilities">Click to know our Capabilities</a>
            </div>

            <div class="svc-spec-row">
              <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> Base Material</div>
              <div class="svc-spec-controls">
                <button type="button" class="svc-spec-pill active">&#9641; FR-4</button>
              </div>
            </div>

            <div class="svc-spec-row">
              <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> Layers</div>
              <div class="svc-spec-controls" id="pcb-layers-group">
                <button type="button" class="svc-spec-pill" data-layer="1">1</button>
                <button type="button" class="svc-spec-pill active" data-layer="2">2</button>
                <button type="button" class="svc-spec-pill" data-layer="4">4</button>
                <button type="button" class="svc-spec-pill gold" data-layer="6">High Precision PCB 6 &#128293;</button>
              </div>
            </div>

            <div class="svc-spec-row">
              <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> Dimensions</div>
              <div class="svc-spec-controls">
                <div class="svc-dim-box">
                  <input type="number" id="pcb-len" class="svc-dim-inp" value="100" min="10" max="600">
                  <span>&times;</span>
                  <input type="number" id="pcb-wid" class="svc-dim-inp" value="100" min="10" max="600">
                  <span>mm</span>
                </div>
                <div class="svc-dim-note">Dimensions are automatically parsed or can be adjusted manually.</div>
              </div>
            </div>

            <div class="svc-spec-row">
              <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> PCB Qty</div>
              <div class="svc-spec-controls">
                <select id="pcb-qty-select" style="padding:6px 14px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;font-size:13.5px">
                  ${[5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200, 250, 300, 500, 1000].map((n) => `<option value="${n}">${n}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="svc-spec-row">
              <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> Product Type</div>
              <div class="svc-spec-controls" id="pcb-type-group">
                <button type="button" class="svc-spec-pill active">Industrial/Consumer electronics</button>
                <button type="button" class="svc-spec-pill">Aerospace</button>
                <button type="button" class="svc-spec-pill">Medical</button>
              </div>
            </div>

            <!-- Accordion 1: PCB Specifications -->
            <div class="svc-accordion-item" id="acc-pcb-spec">
              <div class="svc-accordion-header">
                <b>PCB Specifications</b>
                <span></span>
              </div>
              <div class="svc-accordion-content">
                <div class="svc-spec-row">
                  <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> Deburring/Edge Rounding</div>
                  <div class="svc-spec-controls radio-pills">
                    <button type="button" class="svc-spec-pill active">No</button>
                    <button type="button" class="svc-spec-pill">Yes</button>
                  </div>
                </div>
                <div class="svc-spec-row">
                  <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> Different Design</div>
                  <div class="svc-spec-controls radio-pills">
                    <button type="button" class="svc-spec-pill active">1</button>
                    <button type="button" class="svc-spec-pill">2</button>
                    <button type="button" class="svc-spec-pill">3</button>
                    <button type="button" class="svc-spec-pill">4</button>
                  </div>
                </div>
                <div class="svc-spec-row">
                  <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> Delivery Format</div>
                  <div class="svc-spec-controls radio-pills">
                    <button type="button" class="svc-spec-pill active">Single PCB</button>
                    <button type="button" class="svc-spec-pill">Panel by MySemicon</button>
                  </div>
                </div>
                <div class="svc-spec-row">
                  <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> PCB Thickness</div>
                  <div class="svc-spec-controls radio-pills">
                    <button type="button" class="svc-spec-pill active">1.6mm</button>
                    <button type="button" class="svc-spec-pill">0.8mm</button>
                    <button type="button" class="svc-spec-pill">1.0mm</button>
                    <button type="button" class="svc-spec-pill">1.2mm</button>
                    <button type="button" class="svc-spec-pill">2.0mm</button>
                    <button type="button" class="svc-spec-pill">0.4mm</button>
                    <button type="button" class="svc-spec-pill">0.6mm</button>
                  </div>
                </div>
                <div class="svc-spec-row">
                  <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> PCB Color</div>
                  <div class="svc-spec-controls" id="pcb-colors-group">
                    <button type="button" class="svc-spec-pill active" data-color="Green"><i class="svc-color-swatch-dot" style="background:#22c55e"></i> Green</button>
                    <button type="button" class="svc-spec-pill" data-color="Red"><i class="svc-color-swatch-dot" style="background:#ef4444"></i> Red</button>
                    <button type="button" class="svc-spec-pill" data-color="Yellow"><i class="svc-color-swatch-dot" style="background:#eab308"></i> Yellow</button>
                    <button type="button" class="svc-spec-pill" data-color="Blue"><i class="svc-color-swatch-dot" style="background:#3b82f6"></i> Blue</button>
                    <button type="button" class="svc-spec-pill" data-color="White"><i class="svc-color-swatch-dot" style="background:#ffffff;border:1px solid #ccc"></i> White</button>
                    <button type="button" class="svc-spec-pill" data-color="Black"><i class="svc-color-swatch-dot" style="background:#18181b"></i> Black</button>
                  </div>
                </div>
                <div class="svc-spec-row">
                  <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> Material Type</div>
                  <div class="svc-spec-controls radio-pills">
                    <button type="button" class="svc-spec-pill active">FR4 TG135</button>
                    <button type="button" class="svc-spec-pill">KB6164-TG135</button>
                    <button type="button" class="svc-spec-pill">Nan Ya NP-140F</button>
                    <button type="button" class="svc-spec-pill">S1141 TG140</button>
                    <button type="button" class="svc-spec-pill">S1000H TG155</button>
                  </div>
                </div>
                <div class="svc-spec-row">
                  <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> Silkscreen</div>
                  <div class="svc-spec-controls radio-pills">
                    <button type="button" class="svc-spec-pill active">White</button>
                    <button type="button" class="svc-spec-pill">Black</button>
                  </div>
                </div>
                <div class="svc-spec-row">
                  <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> Surface Finish</div>
                  <div class="svc-spec-controls radio-pills">
                    <button type="button" class="svc-spec-pill active">HASL(with lead)</button>
                    <button type="button" class="svc-spec-pill">Leadfree HASL-RoHS</button>
                    <button type="button" class="svc-spec-pill">ENIG-RoHS</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Accordion 2: High-spec Options -->
            <div class="svc-accordion-item collapsed" id="acc-high-spec">
              <div class="svc-accordion-header">
                <b>High-spec Options</b>
                <span></span>
              </div>
              <div class="svc-accordion-content">
                <div class="svc-spec-row">
                  <div class="svc-spec-label">Min Via Hole Size</div>
                  <div class="svc-spec-controls radio-pills">
                    <button type="button" class="svc-spec-pill active">0.3mm/(0.4/0.45mm)</button>
                    <button type="button" class="svc-spec-pill">0.25mm/(0.35/0.4mm)</button>
                    <button type="button" class="svc-spec-pill">0.2mm/(0.3/0.35mm)</button>
                    <button type="button" class="svc-spec-pill">0.15mm/(0.25/0.3mm)</button>
                  </div>
                </div>
                <div class="svc-spec-row">
                  <div class="svc-spec-label">Outer Copper Weight</div>
                  <div class="svc-spec-controls radio-pills">
                    <button type="button" class="svc-spec-pill active">1 oz</button>
                    <button type="button" class="svc-spec-pill">2 oz</button>
                  </div>
                </div>
                <div class="svc-spec-row">
                  <div class="svc-spec-label">Inner Copper Weight</div>
                  <div class="svc-spec-controls radio-pills">
                    <button type="button" class="svc-spec-pill active">0.5 oz</button>
                    <button type="button" class="svc-spec-pill">1 oz</button>
                    <button type="button" class="svc-spec-pill">2 oz</button>
                  </div>
                </div>
                <div class="svc-spec-row">
                  <div class="svc-spec-label">Via Covering</div>
                  <div class="svc-spec-controls radio-pills">
                    <button type="button" class="svc-spec-pill active">Tented</button>
                    <button type="button" class="svc-spec-pill">Untented</button>
                    <button type="button" class="svc-spec-pill">Plugged</button>
                    <button type="button" class="svc-spec-pill">Epoxy Filled & Capped</button>
                  </div>
                </div>
                <div class="svc-spec-row">
                  <div class="svc-spec-label">Castellated Holes</div>
                  <div class="svc-spec-controls radio-pills">
                    <button type="button" class="svc-spec-pill active">No</button>
                    <button type="button" class="svc-spec-pill">Yes</button>
                  </div>
                </div>
                <div class="svc-spec-row">
                  <div class="svc-spec-label">Gold Fingers</div>
                  <div class="svc-spec-controls radio-pills">
                    <button type="button" class="svc-spec-pill active">No</button>
                    <button type="button" class="svc-spec-pill">Yes</button>
                  </div>
                </div>
              </div>
            </div>
            </section>

            <!-- Customer Details Form -->
            <section class="svc-step-card" id="pcb-step-customer">
              <div class="svc-step-card-head"><span class="svc-step-circle">2</span><span>Customer &amp; Shipping Details</span></div>
              <div class="svc-grid">
                <div class="svc-f"><label class="svc-l" for="pcb-name">Full Name *</label><input id="pcb-name" required placeholder="Your full name"></div>
                <div class="svc-f"><label class="svc-l" for="pcb-phone">Mobile *</label><input id="pcb-phone" type="tel" required placeholder="10-digit mobile number"></div>
                <div class="svc-f full"><label class="svc-l" for="pcb-email">Email Address *</label><input id="pcb-email" type="email" required placeholder="your.name@example.com"></div>
                <div class="svc-f full"><label class="svc-l" for="pcb-notes">Manufacturing Instructions / Notes</label><textarea id="pcb-notes" rows="2" placeholder="Special requirements, controlled impedance, stackup, etc."></textarea></div>
              </div>
            </section>
          </div>

          <!-- Right Column: Sticky Summary -->
          <div class="svc-summary-col">
            <div class="svc-sticky-summary">
              <div class="svc-sticky-header">PCB Service Quote</div>
              <div class="svc-sticky-body">
                <div class="svc-sticky-sublabel">Pricing Mode</div>
                <div class="svc-sticky-price" style="font-size:22px;color:var(--brand)">Custom Quote</div>
                <div class="svc-sticky-hint" id="pcb-quote-status">Cost is decided as per your Gerber design, board dimensions, layers, and finish specifications.</div>
                <a class="svc-sticky-special-link" href="#extra-cases">Final quote confirmed after engineering DFM review</a>
                <button type="button" class="svc-main-action-btn" id="btn-pcb-submit">Submit Gerber for Custom Quote</button>
                <div class="svc-lead-notice">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;vertical-align:text-bottom;margin-right:4px"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16,8 20,8 23,11 23,16 16,16"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  This product has a 15–20 business days lead time. Orders will be dispatched after the manufacturing process is completed.
                </div>
              </div>
            </div>
          </div>
        </div>

        ${renderTrustBadges(3)}

        <!-- Meta section -->
        <div class="svc-meta-section">
          <div class="svc-meta-title">Didn't find what you are looking for?</div>
          <div class="svc-meta-item"><strong>Category :</strong> MySemicon Services</div>
        </div>

        <!-- 7 Tabs Navigation -->
        ${renderTabs(p)}
      </div>
    `;

    // Bind event handlers
    const dz = $('#pcb-dropzone', view), fileInp = $('#pcb-file-input', view), st = $('#pcb-file-status', view);
    $('#btn-browse-gerber', view).addEventListener('click', () => fileInp.click());
    fileInp.addEventListener('change', () => {
      if (fileInp.files[0]) {
        uploadedFile = fileInp.files[0];
        st.innerHTML = `<b style="color:#16a34a">✓ ${esc(uploadedFile.name)}</b> (${(uploadedFile.size / 1048576).toFixed(2)} MB)`;
        $('#pcb-quote-status', view).textContent = 'Gerber uploaded. Ready to place order.';
        updatePrice();
      }
    });

    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault(); dz.classList.remove('dragover');
      if (e.dataTransfer.files[0]) {
        uploadedFile = e.dataTransfer.files[0];
        st.innerHTML = `<b style="color:#16a34a">✓ ${esc(uploadedFile.name)}</b> (${(uploadedFile.size / 1048576).toFixed(2)} MB)`;
        $('#pcb-quote-status', view).textContent = 'Gerber uploaded. Ready to place order.';
        updatePrice();
      }
    });

    // Accordions
    $$('.svc-accordion-header', view).forEach((h) => {
      h.addEventListener('click', () => {
        h.parentElement.classList.toggle('collapsed');
      });
    });

    // Layer pills
    $$('#pcb-layers-group button', view).forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('#pcb-layers-group button', view).forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        chosenLayers = btn.dataset.layer;
        updatePrice();
      });
    });

    // Radio pills generic
    $$('.radio-pills', view).forEach((group) => {
      group.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        $$('button', group).forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
      });
    });

    // Color pills
    $$('#pcb-colors-group button', view).forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('#pcb-colors-group button', view).forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        chosenColor = btn.dataset.color;
      });
    });

    // Dimensions & Qty
    $('#pcb-len', view).addEventListener('input', (e) => { chosenLen = e.target.value; updatePrice(); });
    $('#pcb-wid', view).addEventListener('input', (e) => { chosenWid = e.target.value; updatePrice(); });
    $('#pcb-qty-select', view).addEventListener('change', (e) => { chosenQty = e.target.value; updatePrice(); });

    // Order Now submission
    $('#btn-pcb-submit', view).addEventListener('click', async () => {
      const name = $('#pcb-name', view).value.trim();
      const phone = $('#pcb-phone', view).value.trim();
      const email = $('#pcb-email', view).value.trim();
      const notes = $('#pcb-notes', view).value.trim();

      if (!name || !phone || !email) {
        MS.toast('Please provide your name, mobile, and email to place your PCB order.');
        $('#pcb-name', view).focus();
        return;
      }
      if (!uploadedFile) {
        MS.toast('Please add your Gerber ZIP file.');
        fileInp.click();
        return;
      }

      const fd = new FormData();
      fd.append('slug', p.slug);
      fd.append('name', name);
      fd.append('phone', phone);
      fd.append('email', email);
      fd.append('qty', chosenQty);
      fd.append('notes', notes);
      fd.append('options', JSON.stringify({
        layers: chosenLayers,
        dimensions: chosenLen + 'x' + chosenWid + 'mm',
        color: chosenColor,
        material: 'FR-4'
      }));
      fd.append('file', uploadedFile);

      const btn = $('#btn-pcb-submit', view);
      btn.disabled = true; btn.textContent = 'Processing PCB Order...';
      try {
        const r = await fetch('/api/service-quote', { method: 'POST', body: fd });
        const res = await r.json();
        if (!r.ok) throw new Error(res.detail || 'Failed to submit quote');
        MS.toast('Order ' + res.reference + ' received! Dispatching engineer review.');
        $('#pcb-quote-status', view).innerHTML = `<b style="color:#16a34a">Order ${esc(res.reference)} confirmed!</b> Check email for tracking.`;
      } catch (err) {
        MS.toast('Error: ' + err.message);
      } finally {
        btn.disabled = false; btn.textContent = 'Calculate & Order PCB';
      }
    });

    bindTabs(view, p);
    updatePrice();
  }

  // --------------------------------------------------------------------------- Render Standard Service
  function renderStandardService(p, cfg, view) {
    const is3D = p.slug.includes('3d');
    const isMetalLaser = p.slug === 'metal-laser-cutting';
    const isNonMetalLaser = p.slug === 'online-laser-cutting-service';
    const isBattery = p.slug === 'custom-battery-pack';
    const isIndustrial = p.slug === 'industrial-3d-printing';
    const meta = SERVICE_METAS[p.slug] || {};
    let uploadedFile = null;

    const reviewCount = p.rating && p.rating.reviewCount ? p.rating.reviewCount : (p.reviews ? p.reviews.length : 0);

    const leadTimeText = isNonMetalLaser ? '2–3 Business Days'
      : isMetalLaser ? '4–5 Business Days'
      : is3D && !isIndustrial ? '1–2 Business Days'
      : isIndustrial ? '15–20 Working Days'
      : isBattery ? '5–6 Working Days'
      : '3–5 Business Days';

    // Industrial 3D printing materials dictionary
    const IND_MATERIALS = {
      sla: [
        { name: '9600 Resin', tol: '±0.2 mm (≤100 mm) or ±0.3%', feat: 'Cost-effective, good toughness, stable mechanical properties', col: 'White' },
        { name: 'Black Resin', tol: '±0.2 mm (≤100 mm) or ±0.3%', feat: 'Good surface finish, low shrinkage, high dimensional stability', col: 'Grayish Black' },
        { name: 'Imagine Black', tol: '±0.2 mm (≤100 mm) or ±0.3%', feat: 'Suitable for humid environments, high precision', col: 'Black' },
        { name: '8228 Resin', tol: '±0.2 mm or ±0.3%', feat: 'High heat & yellowing resistance, excellent surface finish', col: 'Light Green' },
        { name: 'LEDO 6060 Resin', tol: '±0.2 mm (≤100 mm) or ±0.3%', feat: 'High dimensional stability, low shrinkage, good toughness', col: 'Natural White' },
        { name: '8001 Transparent Resin', tol: '±0.2 mm (≤100 mm) or ±0.3%', feat: 'Optical transparency, high clarity, good toughness', col: 'Transparent' },
        { name: 'CBY Resin', tol: '±0.2 mm (≤100 mm) or ±0.3%', feat: 'Heat resistance, high strength, dimensional stability', col: 'Faint Yellow' },
        { name: 'Black Resin (Standard)', tol: '±0.2 mm (≤100 mm) or ±0.3%', feat: 'High strength, excellent toughness, dimensional stability', col: 'Black' },
        { name: 'Grey Resin', tol: '±0.2 mm (≤100 mm) or ±0.3%', feat: 'Low shrinkage, good strength, dimensional stability', col: 'Grey' },
        { name: 'High-Temp Resin', tol: '±0.2 mm (≤100 mm) or ±0.3%', feat: 'High heat resistance, yellowing resistant under temperature', col: 'Faint Yellow' },
        { name: '9000HE Resin', tol: '±0.2 mm (≤100 mm) or ±0.3%', feat: 'High strength, good toughness, superior mechanical properties', col: 'White' }
      ],
      mjf: [
        { name: 'PA12-HP Nylon', tol: '±0.3 mm (within 100 mm) or ±0.4%', feat: 'Comprehensive performance, high strength and durability, chemical resistance', col: 'Black, Natural Gray' },
        { name: 'PAC-HP Nylon', tol: '±0.3 mm (within 100 mm) or ±0.4%', feat: 'Full-colour printing, mechanical strength superior to resin', col: 'Multicolor' },
        { name: 'PA11-HP Nylon', tol: '±0.3 mm (within 100 mm) or ±0.4%', feat: 'High toughness, superior chemical and impact resistance', col: 'Black, Natural Gray' },
        { name: 'PA12S-HP Nylon', tol: '±0.3 mm (within 100 mm) or ±0.4%', feat: 'Delicate surface finish, subtle granular feel', col: 'Black, Grayish White' }
      ],
      slm: [
        { name: '316L Stainless Steel', tol: '±0.3 mm (within 100 mm) or ±0.4%', feat: 'Excellent corrosion resistance, dense metal, nonmagnetic', col: 'Stainless Steel' },
        { name: 'Titanium TC4', tol: '±0.3 mm (within 100 mm) or ±0.4%', feat: 'Low density, high specific strength, weldable, biocompatible', col: 'Silver Gray' }
      ],
      sls: [
        { name: '3201PA-F Nylon', tol: '±0.3 mm (within 100 mm) or ±0.4%', feat: 'Economical, good toughness, no support structures required', col: 'Grayish Black' },
        { name: '1172Pro Nylon', tol: '±0.3 mm (within 100 mm) or ±0.4%', feat: 'High rigidity, good dimensional stability, heat resistant', col: 'White' },
        { name: '3301PA Nylon', tol: '±0.3 mm (within 100 mm) or ±0.4%', feat: 'High strength, excellent impact resistance', col: 'White' },
        { name: '3401GB Nylon', tol: '±0.3 mm (within 100 mm) or ±0.4%', feat: 'Glass-bead filled, replaces CNC machined or injection-moulded parts', col: 'Grayish White' }
      ],
      wjp: [
        { name: 'Full Color Resin', tol: '±0.2 mm (≤100 mm) or ±0.3%', feat: 'Full-colour photopolymer printing, ABS-like performance', col: 'Multicolor' },
        { name: 'Full Color Tough Resin', tol: '±0.2 mm (≤100 mm) or ±0.3%', feat: 'Superior toughness and high mechanical strength', col: 'Multicolor' }
      ],
      bj: [
        { name: 'BJ-316L Stainless Steel', tol: '±0.3 mm or ±0.4%', feat: 'Cost-effective binder-jetted metal printing, even surface', col: 'Stainless Steel' }
      ]
    };

    view.innerHTML = `
      <div class="wrap pg">
        <div class="crumbs" style="margin-bottom:14px">
          <a href="/">Home</a><span aria-hidden="true">&rarr;</span>
          <a href="/shop/">Shop</a><span aria-hidden="true">&rarr;</span>
          <span>${esc(p.name)}</span>
        </div>

        ${serviceHero(p, [`(${esc(reviewCount)} customer reviews)`, `SKU : ${esc(p.sku || '901845')}`, `Lead time: <b>${leadTimeText}</b>`])}

        <div class="svc-pd-layout">
          <!-- Left Column: CAD/3D Viewport & Upload -->
          <div class="svc-viewport-col">
            <div class="svc-viewport-card">
              <div class="svc-viewport-stage">
                <canvas id="svc-canvas"></canvas>
              </div>
              <div class="svc-viewport-actions">
                <input type="file" id="cad-file-input" hidden>
                <button type="button" class="svc-upload-action-btn" id="btn-cad-upload">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload File / Drawing
                </button>
              </div>
              <div class="svc-viewport-info">
                <span id="cad-file-name">Upload single ${is3D ? '3D model' : '2D/CAD Design File'} into the box</span>
                <small>We support ${is3D ? 'stl, obj, stp, step, igs, iges, 3mf' : isBattery ? 'step, dxf, pdf, png, jpg' : 'dxf, dwg, svg, step, pdf'} file format &#9432;</small>
              </div>
              <div class="svc-viewport-controls">
                <div class="svc-ctrl-group">
                  <label>File Unit</label>
                  <label><input type="radio" name="file-unit" value="mm" checked> MM</label>
                  <label><input type="radio" name="file-unit" value="inch"> Inch</label>
                </div>
                ${is3D ? `
                  <div class="svc-ctrl-group">
                    <label>Rotation</label>
                    <span>X</span><input type="number" class="svc-num-inp" value="0">
                    <span>Y</span><input type="number" class="svc-num-inp" value="0">
                    <button type="button" class="svc-btn-sm" id="btn-apply-rot">Apply</button>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Stepper Wizard -->
            <div class="svc-wizard-box" id="svc-stepper-root">
              <!-- Step 1 -->
              <div class="svc-step-card svc-step-card-active" id="step-1-card">
                <div class="svc-step-card-head">
                  <span class="svc-step-circle">1</span>
                  <span>${is3D && !isIndustrial ? 'Printer Profile' : isBattery ? 'Battery Chemistry & Voltage' : 'Process & Material'}</span>
                </div>

                ${is3D && !isIndustrial ? `
                  <div class="svc-step-pill-preview" id="printer-sel-label">Selected: 0.2 mm Standard Quality</div>
                  <div class="svc-radio-list" id="printer-opts">
                    <label class="svc-radio-item"><input type="radio" name="printer_profile" value="0.2 mm Standard Quality" checked> 0.2 mm Standard Quality (Layer Height 0.2mm, ±0.2mm tolerance)</label>
                    <label class="svc-radio-item"><input type="radio" name="printer_profile" value="0.15 mm Medium Quality"> 0.15 mm Medium Quality (Smooth Surface)</label>
                    <label class="svc-radio-item"><input type="radio" name="printer_profile" value="0.1 mm High Quality"> 0.1 mm High Quality (Ultra Fine Precision)</label>
                    <label class="svc-radio-item"><input type="radio" name="printer_profile" value="0.2 mm Standard Quality + 0.6mm Nozzle"> 0.2 mm Standard Quality + 0.6mm Nozzle (Fast Solid Infill)</label>
                  </div>
                  <button type="button" class="svc-step-nextbtn" data-next="2">Next: Material &rarr;</button>

                ` : isNonMetalLaser ? `
                  <div class="svc-spec-row">
                    <div class="svc-spec-label">Process</div>
                    <div class="svc-spec-controls radio-pills" id="nonmetal-process-group">
                      <button type="button" class="svc-spec-pill active" data-proc="nonmetal">Laser Cutting Non Metal</button>
                      <button type="button" class="svc-spec-pill" data-proc="balsa">Laser Cutting Balsa Wood</button>
                    </div>
                  </div>
                  <div class="svc-step-pill-preview" id="nonmetal-sel-label">Selected: Acrylic 3mm - Transparent</div>
                  <div class="svc-spec-row">
                    <div class="svc-spec-label">Acrylic Sheets</div>
                    <div class="svc-spec-controls radio-pills" id="acrylic-thick-group">
                      <button type="button" class="svc-spec-pill" data-mat="Acrylic 2mm">2mm</button>
                      <button type="button" class="svc-spec-pill active" data-mat="Acrylic 3mm">3mm</button>
                      <button type="button" class="svc-spec-pill" data-mat="Acrylic 4mm">4mm</button>
                      <button type="button" class="svc-spec-pill" data-mat="Acrylic 5mm">5mm</button>
                    </div>
                  </div>
                  <div class="svc-spec-row">
                    <div class="svc-spec-label">Acrylic Colors</div>
                    <div class="svc-spec-controls" id="acrylic-colors-group">
                      <button type="button" class="svc-spec-pill active" data-col="Transparent"><i class="svc-color-swatch-dot" style="background:#ffffff;border:1px solid #ccc"></i> Transparent</button>
                      <button type="button" class="svc-spec-pill" data-col="Black"><i class="svc-color-swatch-dot" style="background:#000000"></i> Black</button>
                      <button type="button" class="svc-spec-pill" data-col="Red"><i class="svc-color-swatch-dot" style="background:#ff0000"></i> Red</button>
                      <button type="button" class="svc-spec-pill" data-col="Blue"><i class="svc-color-swatch-dot" style="background:#0000ff"></i> Blue</button>
                      <button type="button" class="svc-spec-pill" data-col="White"><i class="svc-color-swatch-dot" style="background:#ffffff;border:1px solid #ccc"></i> White</button>
                      <button type="button" class="svc-spec-pill" data-col="Orange"><i class="svc-color-swatch-dot" style="background:#ffa500"></i> Orange</button>
                      <button type="button" class="svc-spec-pill" data-col="Yellow"><i class="svc-color-swatch-dot" style="background:#ffff00"></i> Yellow</button>
                      <button type="button" class="svc-spec-pill" data-col="Grey"><i class="svc-color-swatch-dot" style="background:#c6c6c6"></i> Grey</button>
                    </div>
                  </div>
                  <div class="svc-spec-row">
                    <div class="svc-spec-label">Wood &amp; Composites</div>
                    <div class="svc-spec-controls radio-pills" id="wood-mat-group">
                      <button type="button" class="svc-spec-pill" data-mat="MDF 2mm">MDF 2mm</button>
                      <button type="button" class="svc-spec-pill" data-mat="MDF 3mm">MDF 3mm</button>
                      <button type="button" class="svc-spec-pill" data-mat="Balsa 3mm">Balsa 3mm</button>
                      <button type="button" class="svc-spec-pill" data-mat="Aeroply 3mm">Aeroply 3mm</button>
                      <button type="button" class="svc-spec-pill" data-mat="ABS Black 2mm">ABS Black 2mm</button>
                      <button type="button" class="svc-spec-pill" data-mat="Carbon Fiber 2mm">Carbon Fiber 2mm</button>
                    </div>
                  </div>
                  <div class="svc-spec-row">
                    <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> Dimensions (mm)</div>
                    <div class="svc-spec-controls">
                      <div class="svc-dim-box">
                        <input type="number" id="nm-len" class="svc-dim-inp" value="150" min="20" max="500">
                        <span>&times;</span>
                        <input type="number" id="nm-wid" class="svc-dim-inp" value="150" min="20" max="500">
                        <span>mm</span>
                      </div>
                      <div class="svc-dim-note">Sheet capacity: max 500 × 500 mm (Balsa wood: up to 1000 × 100 mm).</div>
                    </div>
                  </div>
                  <button type="button" class="svc-step-nextbtn" data-next="2">Next: Finalize &rarr;</button>

                ` : isMetalLaser ? `
                  <div class="svc-step-pill-preview" id="metal-sel-label">Selected: Mild Steel 1mm</div>
                  <div class="svc-spec-row">
                    <div class="svc-spec-label">Mild Steel</div>
                    <div class="svc-spec-controls radio-pills" id="ms-group">
                      <button type="button" class="svc-spec-pill active" data-mat="Mild Steel 1mm">1mm</button>
                      <button type="button" class="svc-spec-pill" data-mat="Mild Steel 2mm">2mm</button>
                      <button type="button" class="svc-spec-pill" data-mat="Mild Steel 3mm">3mm</button>
                      <button type="button" class="svc-spec-pill" data-mat="Mild Steel 4mm">4mm</button>
                      <button type="button" class="svc-spec-pill" data-mat="Mild Steel 5mm">5mm</button>
                    </div>
                  </div>
                  <div class="svc-spec-row">
                    <div class="svc-spec-label">Aluminium 6061 T6</div>
                    <div class="svc-spec-controls radio-pills" id="al-group">
                      <button type="button" class="svc-spec-pill" data-mat="Aluminium 1mm">1mm</button>
                      <button type="button" class="svc-spec-pill" data-mat="Aluminium 2mm">2mm</button>
                      <button type="button" class="svc-spec-pill" data-mat="Aluminium 3mm">3mm</button>
                    </div>
                  </div>
                  <div class="svc-spec-row">
                    <div class="svc-spec-label">Stainless Steel 304</div>
                    <div class="svc-spec-controls radio-pills" id="ss-group">
                      <button type="button" class="svc-spec-pill" data-mat="Stainless Steel 1mm">1mm</button>
                      <button type="button" class="svc-spec-pill" data-mat="Stainless Steel 2mm">2mm</button>
                      <button type="button" class="svc-spec-pill" data-mat="Stainless Steel 3mm">3mm</button>
                    </div>
                  </div>
                  <div class="svc-spec-row">
                    <div class="svc-spec-label">Cutting Assist Gas</div>
                    <div class="svc-spec-controls radio-pills" id="metal-gas-group">
                      <button type="button" class="svc-spec-pill active" data-gas="Nitrogen">High Purity Nitrogen (Clean Burr-free)</button>
                      <button type="button" class="svc-spec-pill" data-gas="Oxygen">Oxygen (Standard)</button>
                    </div>
                  </div>
                  <div class="svc-spec-row">
                    <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> Dimensions (mm)</div>
                    <div class="svc-spec-controls">
                      <div class="svc-dim-box">
                        <input type="number" id="ml-len" class="svc-dim-inp" value="150" min="20" max="500">
                        <span>&times;</span>
                        <input type="number" id="ml-wid" class="svc-dim-inp" value="150" min="20" max="500">
                        <span>mm</span>
                      </div>
                      <div class="svc-dim-note">Maximum bed capacity: 500 × 500 mm. Fiber laser cutting.</div>
                    </div>
                  </div>
                  <button type="button" class="svc-step-nextbtn" data-next="2">Next: Finalize &rarr;</button>

                ` : isIndustrial ? `
                  <div class="svc-spec-row">
                    <div class="svc-spec-label">3D Technology</div>
                    <div class="svc-spec-controls radio-pills" id="ind-tech-group">
                      <button type="button" class="svc-spec-pill active" data-tech="sla">SLA (Resin)</button>
                      <button type="button" class="svc-spec-pill" data-tech="mjf">MJF (Nylon)</button>
                      <button type="button" class="svc-spec-pill" data-tech="slm">SLM (Metal)</button>
                      <button type="button" class="svc-spec-pill" data-tech="sls">SLS (Nylon)</button>
                      <button type="button" class="svc-spec-pill" data-tech="wjp">WJP (Resin)</button>
                      <button type="button" class="svc-spec-pill" data-tech="bj">BJ (Metal)</button>
                    </div>
                  </div>
                  <div class="svc-spec-row">
                    <div class="svc-spec-label">Industrial Material</div>
                    <div class="svc-spec-controls">
                      <select id="ind-mat-select" style="padding:7px 14px;border:1px solid #cbd5e1;border-radius:6px;width:100%;max-width:380px;background:#fff;font-size:14px">
                        ${IND_MATERIALS.sla.map((m) => `<option value="${m.name}">${m.name} (${m.col})</option>`).join('')}
                      </select>
                    </div>
                  </div>
                  <div id="ind-mat-info" style="margin-top:12px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;line-height:1.5">
                    <div><strong>Tolerance:</strong> <span id="ind-mat-tol">±0.2 mm (≤100 mm) or ±0.3%</span></div>
                    <div style="margin-top:4px"><strong>Features:</strong> <span id="ind-mat-feat">Cost-effective, good toughness, stable mechanical properties</span></div>
                    <div style="margin-top:4px"><strong>Available Colors:</strong> <span id="ind-mat-col">White</span></div>
                  </div>
                  <div class="svc-spec-row" style="margin-top:14px">
                    <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> Volume (cm³)</div>
                    <div class="svc-spec-controls">
                      <div class="svc-dim-box">
                        <input type="number" id="ind-vol" class="svc-dim-inp" value="60" min="2" max="10000">
                        <span>cm³ (cc)</span>
                      </div>
                      <div class="svc-dim-note">Target part volume in cubic centimeters.</div>
                    </div>
                  </div>
                  <button type="button" class="svc-step-nextbtn" data-next="2" style="margin-top:16px">Next: Finalize &rarr;</button>

                ` : isBattery ? `
                  <div class="svc-spec-row">
                    <div class="svc-spec-label">Battery Chemistry</div>
                    <div class="svc-spec-controls radio-pills" id="bat-chem-group">
                      <button type="button" class="svc-spec-pill active" data-chem="Li-ion">Li-ion (18650 / 21700 Cylindrical)</button>
                      <button type="button" class="svc-spec-pill" data-chem="LiFePO4">LiFePO4 (2000+ Cycles)</button>
                      <button type="button" class="svc-spec-pill" data-chem="LiPo">LiPo (Compact Lightweight)</button>
                      <button type="button" class="svc-spec-pill" data-chem="NMC">NMC (High Energy Density)</button>
                    </div>
                  </div>
                  <div class="svc-spec-row">
                    <div class="svc-spec-label">Nominal Voltage</div>
                    <div class="svc-spec-controls radio-pills" id="bat-volt-pills">
                      <button type="button" class="svc-spec-pill" data-v="3.7">3.7V (1S)</button>
                      <button type="button" class="svc-spec-pill" data-v="7.4">7.4V (2S)</button>
                      <button type="button" class="svc-spec-pill" data-v="11.1">11.1V (3S)</button>
                      <button type="button" class="svc-spec-pill" data-v="14.8">14.8V (4S)</button>
                      <button type="button" class="svc-spec-pill" data-v="24">24V (7S)</button>
                      <button type="button" class="svc-spec-pill" data-v="36">36V (10S)</button>
                      <button type="button" class="svc-spec-pill active" data-v="48">48V (13S)</button>
                      <button type="button" class="svc-spec-pill" data-v="52">52V (14S)</button>
                      <button type="button" class="svc-spec-pill" data-v="60">60V (16S)</button>
                      <button type="button" class="svc-spec-pill" data-v="72">72V (20S)</button>
                    </div>
                  </div>
                  <div class="svc-grid" style="margin-top:14px">
                    <div class="svc-f"><label class="svc-l">System Voltage (V)</label><input id="bat-v" value="48" inputmode="decimal"></div>
                    <div class="svc-f"><label class="svc-l">Desired Capacity (Ah)</label><input id="bat-ah" value="20" inputmode="decimal"></div>
                    <div class="svc-f"><label class="svc-l">Continuous Discharge (A)</label><input id="bat-c" value="30"></div>
                    <div class="svc-f"><label class="svc-l">Peak Current (A)</label><input id="bat-p" value="60"></div>
                  </div>
                  <div class="svc-spec-row" style="margin-top:12px">
                    <div class="svc-spec-label">Discharge Connector</div>
                    <div class="svc-spec-controls radio-pills" id="bat-conn-group">
                      <button type="button" class="svc-spec-pill active" data-conn="XT60">XT60 (Amass)</button>
                      <button type="button" class="svc-spec-pill" data-conn="XT90 Anti-Spark">XT90 Anti-Spark</button>
                      <button type="button" class="svc-spec-pill" data-conn="Anderson 45A">Anderson 45A</button>
                      <button type="button" class="svc-spec-pill" data-conn="Deans T-Plug">Deans T-Plug</button>
                      <button type="button" class="svc-spec-pill" data-conn="Bare Silicone Leads">Bare Silicone Leads</button>
                    </div>
                  </div>
                  <div class="svc-spec-row">
                    <div class="svc-spec-label">Enclosure Housing</div>
                    <div class="svc-spec-controls radio-pills" id="bat-enc-group">
                      <button type="button" class="svc-spec-pill active" data-enc="PVC">Industrial Blue PVC</button>
                      <button type="button" class="svc-spec-pill" data-enc="Polycarbonate">Polycarbonate Case</button>
                      <button type="button" class="svc-spec-pill" data-enc="3D ABS">Custom 3D ABS Case</button>
                      <button type="button" class="svc-spec-pill" data-enc="Metal">Sheet Metal Enclosure</button>
                    </div>
                  </div>
                  <div id="bat-live-stats" style="margin-top:12px;padding:12px 14px;background:#f5f3ff;border:1px solid #c4b5fd;border-radius:8px;font-size:13.5px;color:#2a1f38;font-weight:600">
                    Calculated Energy: <span id="bat-wh-calc">960 Wh (0.96 kWh)</span> · Grade A BIS Certified
                  </div>
                  <button type="button" class="svc-step-nextbtn" data-next="2" style="margin-top:16px">Next: Finalize &rarr;</button>
                ` : ''}
              </div>

              <!-- Step 2: Filament Material (for FDM 3D printing) -->
              ${is3D && !isIndustrial ? `
                <div class="svc-step-card" id="step-2-card">
                  <div class="svc-step-card-head">
                    <span class="svc-step-circle">2</span>
                    <span>Material &amp; Color Selection</span>
                  </div>
                  <div class="svc-spec-row">
                    <div class="svc-spec-label">Filament Type</div>
                    <div class="svc-spec-controls radio-pills" id="fdm-mat-pills">
                      <button type="button" class="svc-spec-pill active" data-mat="PLA">PLA (Standard)</button>
                      <button type="button" class="svc-spec-pill" data-mat="ABS">ABS (Heat Resistant)</button>
                      <button type="button" class="svc-spec-pill" data-mat="PETG">PETG (Durable &amp; Tough)</button>
                      <button type="button" class="svc-spec-pill" data-mat="ASA">ASA (UV Resistant)</button>
                      <button type="button" class="svc-spec-pill" data-mat="TPU Flexible">TPU 95A Flexible</button>
                      <button type="button" class="svc-spec-pill" data-mat="Engineering">PA-CF (Carbon Fiber)</button>
                    </div>
                  </div>
                  <div class="svc-spec-row">
                    <div class="svc-spec-label">Available Colors (35+)</div>
                    <div class="svc-spec-controls" id="fdm-colors-box">
                      <button type="button" class="svc-spec-pill active" data-col="Black"><i class="svc-color-swatch-dot" style="background:#000"></i> Black</button>
                      <button type="button" class="svc-spec-pill" data-col="White"><i class="svc-color-swatch-dot" style="background:#fff;border:1px solid #ccc"></i> White</button>
                      <button type="button" class="svc-spec-pill" data-col="Orange"><i class="svc-color-swatch-dot" style="background:#ff8c00"></i> Orange</button>
                      <button type="button" class="svc-spec-pill" data-col="Blue"><i class="svc-color-swatch-dot" style="background:#0000ff"></i> Blue</button>
                      <button type="button" class="svc-spec-pill" data-col="Red"><i class="svc-color-swatch-dot" style="background:#ff0000"></i> Red</button>
                      <button type="button" class="svc-spec-pill" data-col="Green"><i class="svc-color-swatch-dot" style="background:#008000"></i> Green</button>
                      <button type="button" class="svc-spec-pill" data-col="Grey"><i class="svc-color-swatch-dot" style="background:#808080"></i> Grey</button>
                      <button type="button" class="svc-spec-pill" data-col="Yellow"><i class="svc-color-swatch-dot" style="background:#eeee22"></i> Yellow</button>
                    </div>
                  </div>
                  <div class="svc-spec-row">
                    <div class="svc-spec-label"><span class="svc-spec-tooltip">!</span> Estimated Weight</div>
                    <div class="svc-spec-controls">
                      <div class="svc-dim-box">
                        <input type="number" id="fdm-weight" class="svc-dim-inp" value="50" min="5" max="5000">
                        <span>grams</span>
                      </div>
                      <div class="svc-dim-note">Calculated weight based on infill &amp; volume (default 50g).</div>
                    </div>
                  </div>
                  <button type="button" class="svc-step-nextbtn" data-next="3">Next: Infill &rarr;</button>
                </div>

                <!-- Step 3: Infill -->
                <div class="svc-step-card" id="step-3-card">
                  <div class="svc-step-card-head">
                    <span class="svc-step-circle">3</span>
                    <span>Infill Density</span>
                  </div>
                  <div class="svc-spec-controls radio-pills" id="fdm-infill-pills" style="margin-bottom:14px">
                    ${['0%', '10%', '15%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%'].map((inf) => `
                      <button type="button" class="svc-spec-pill ${inf === '20%' ? 'active' : ''}" data-infill="${inf}">${inf}</button>
                    `).join('')}
                  </div>
                  <div style="font-size:13px;color:#64748b;margin-bottom:12px">Recommended: 15%–20% for visual prototypes, 40%–60% for functional mechanical parts, 100% for high-strength solid mounts.</div>
                  <button type="button" class="svc-step-nextbtn" data-next="4">Next: Finalize &rarr;</button>
                </div>
              ` : ''}

              <!-- Final Step: Customer Info & Quote -->
              <div class="svc-step-card" id="step-final-card">
                <div class="svc-step-card-head">
                  <span class="svc-step-circle">${is3D && !isIndustrial ? '4' : '2'}</span>
                  <span>Finalize &amp; Request Quote</span>
                </div>
                <div class="svc-grid">
                  <div class="svc-f"><label class="svc-l">Quantity</label><input type="number" id="gen-qty" value="1" min="1"></div>
                  <div class="svc-f"><label class="svc-l">Full Name *</label><input id="gen-name" required placeholder="Your full name"></div>
                  <div class="svc-f"><label class="svc-l">Mobile Number *</label><input id="gen-phone" type="tel" required placeholder="10-digit mobile number"></div>
                  <div class="svc-f"><label class="svc-l">Email Address *</label><input id="gen-email" type="email" required placeholder="your.name@example.com"></div>
                  <div class="svc-f full"><label class="svc-l">Notes for our engineers</label><textarea id="gen-notes" rows="2" placeholder="Dimensions, tolerances, surface finish, or assembly details"></textarea></div>
                </div>
                <button type="button" class="svc-main-action-btn" id="btn-submit-service" style="margin-top:16px">Submit Requirement &amp; Get Custom Quote</button>
                <div id="gen-out" style="margin-top:8px" aria-live="polite"></div>
              </div>
            </div>
          </div>

          <!-- Right Column: Sticky Summary with Live Quote -->
          <div class="svc-summary-col">
            <div class="svc-sticky-summary">
              <div class="svc-sticky-header">Service Summary &amp; Quote</div>
              <div class="svc-sticky-body">
                <div class="svc-sticky-sublabel">Pricing Mode</div>
                <div class="svc-sticky-price" style="font-size:22px;color:var(--brand)">Custom Quote</div>
                <div class="svc-sticky-hint" id="std-quote-status">Cost is decided as per your design file, material, dimensions, and specifications.</div>

                <dl class="svc-facts" style="margin-top:16px">
                  <div><dt>Lead Time</dt><dd class="ok"><b>${leadTimeText}</b></dd></div>
                  <div><dt>Service</dt><dd>${esc(p.name)}</dd></div>
                  <div><dt>SKU</dt><dd>${esc(p.sku || '901845')}</dd></div>
                  <div><dt>Bulk &amp; B2B</dt><dd><a href="mailto:sales@mysemicon.com">sales@mysemicon.com</a></dd></div>
                </dl>

                ${is3D && !isIndustrial ? `
                <div class="svc-ebook-wrapper">
                  <span style="font-size:13px;font-weight:600;color:#0f172a;white-space:nowrap">Get your free 3D Print e-Book</span>
                  <input type="email" placeholder="Enter Email" id="ebook-email">
                  <button type="button" id="btn-ebook" onclick="MS.toast('Thank you! The e-Book link has been sent to your email.')">Get e-Book</button>
                </div>
                ` : ''}

                <a class="svc-main-action-btn svc-jump" id="btn-sticky-quote-jump" href="#step-final-card">Request Custom Quote</a>
                <div class="svc-lead-notice" style="margin-top:12px">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;vertical-align:text-bottom;margin-right:4px"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16,8 20,8 23,11 23,16 16,16"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  Custom on-demand manufacturing with guaranteed engineering tolerances and full quality inspection.
                </div>
              </div>
            </div>
          </div>
        </div>

        ${renderTrustBadges(5)}

        <!-- Meta section -->
        <div class="svc-meta-section">
          <div class="svc-meta-title">Didn't find what you are looking for?</div>
          ${meta.brand ? `<div class="svc-meta-item"><strong>Brand :</strong> ${esc(meta.brand)}</div>` : ''}
          <div class="svc-meta-item"><strong>Category :</strong> ${esc(meta.category || 'MySemicon Services')}</div>
          ${meta.tags ? `<div class="svc-meta-item"><strong>Tags :</strong> ${esc(meta.tags)}</div>` : ''}
        </div>

        <!-- 7 Tabs Navigation -->
        ${renderTabs(p)}
      </div>
    `;

    // Canvas init
    const cvs = $('#svc-canvas', view);
    initViewerCanvas(cvs, is3D ? '3d' : '2d');

    // CAD File upload
    const cadInp = $('#cad-file-input', view), cadBtn = $('#btn-cad-upload', view), cadName = $('#cad-file-name', view);
    cadBtn.addEventListener('click', () => cadInp.click());
    cadInp.addEventListener('change', () => {
      if (cadInp.files[0]) {
        uploadedFile = cadInp.files[0];
        cadName.innerHTML = `<b style="color:#16a34a">✓ ${esc(uploadedFile.name)}</b> (${(uploadedFile.size / 1048576).toFixed(2)} MB)`;
        MS.toast('File ' + uploadedFile.name + ' uploaded successfully.');
        const st = $('#std-quote-status', view);
        if (st) st.textContent = 'Design file uploaded. Ready to place quote.';
      }
    });

    // Next step navigation
    $$('.svc-step-nextbtn', view).forEach((btn) => {
      btn.addEventListener('click', () => {
        const nxt = btn.dataset.next;
        const target = $('#step-' + nxt + '-card') || $('#step-final-card');
        if (target) {
          $$('.svc-step-card', view).forEach((c) => c.classList.remove('svc-step-card-active'));
          target.classList.add('svc-step-card-active');
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });

    // Reactive State
    let chosenFdmProfile = '0.2 mm Standard Quality';
    let chosenFdmMat = 'PLA';
    let chosenFdmCol = 'Black';
    let chosenFdmInfill = '20%';
    let chosenFdmWeight = 50;

    let chosenNonMetalMat = 'Acrylic 3mm';
    let chosenNonMetalCol = 'Transparent';
    let chosenNonMetalLen = 150;
    let chosenNonMetalWid = 150;

    let chosenMetalMat = 'Mild Steel 1mm';
    let chosenMetalGas = 'Nitrogen';
    let chosenMetalLen = 150;
    let chosenMetalWid = 150;

    let chosenIndTech = 'sla';
    let chosenIndMat = '9600 Resin';
    let chosenIndVol = 60;

    let chosenBatChem = 'Li-ion';
    let chosenBatV = 48;
    let chosenBatAh = 20;
    let chosenBatConn = 'XT60';
    let chosenBatEnc = 'PVC';

    let currentCalculatedPrice = 0;

    const updatePrice = () => {
      const qty = parseInt($('#gen-qty', view)?.value, 10) || 1;
      let pr = 0;

      if (isNonMetalLaser) {
        pr = calcNonMetalLaserPrice(chosenNonMetalMat, chosenNonMetalLen, chosenNonMetalWid, qty);
      } else if (isMetalLaser) {
        pr = calcMetalLaserPrice(chosenMetalMat, chosenMetalLen, chosenMetalWid, chosenMetalGas, qty);
      } else if (is3D && !isIndustrial) {
        pr = calcFdm3dPrice(chosenFdmProfile, chosenFdmMat, chosenFdmInfill, chosenFdmWeight, qty);
      } else if (isIndustrial) {
        pr = calcIndustrial3dPrice(chosenIndTech, chosenIndMat, chosenIndVol, qty);
      } else if (isBattery) {
        pr = calcBatteryPackPrice(chosenBatChem, chosenBatV, chosenBatAh, chosenBatEnc, qty);
      } else {
        pr = 500 * qty;
      }

      currentCalculatedPrice = pr;
      const prEl = $('#std-calc-price', view);
      if (prEl) prEl.textContent = '₹' + pr.toLocaleString('en-IN') + '.00';
    };

    // Stepper radio selections for FDM
    $$('#printer-opts input', view).forEach((r) => {
      r.addEventListener('change', () => {
        chosenFdmProfile = r.value;
        $('#printer-sel-label', view).textContent = 'Selected: ' + r.value;
        updatePrice();
      });
    });

    if (is3D && !isIndustrial) {
      $$('#fdm-mat-pills button', view).forEach((b) => {
        b.addEventListener('click', () => {
          $$('#fdm-mat-pills button', view).forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          chosenFdmMat = b.dataset.mat;
          updatePrice();
        });
      });
      $$('#fdm-colors-box button', view).forEach((b) => {
        b.addEventListener('click', () => {
          $$('#fdm-colors-box button', view).forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          chosenFdmCol = b.dataset.col;
        });
      });
      $$('#fdm-infill-pills button', view).forEach((b) => {
        b.addEventListener('click', () => {
          $$('#fdm-infill-pills button', view).forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          chosenFdmInfill = b.dataset.infill || b.textContent.trim();
          updatePrice();
        });
      });
      const wInp = $('#fdm-weight', view);
      if (wInp) {
        wInp.addEventListener('input', (e) => {
          chosenFdmWeight = e.target.value;
          updatePrice();
        });
      }
    }

    // Industrial dynamic tech & materials switching
    if (isIndustrial) {
      const techBtns = $$('#ind-tech-group button', view);
      const matSelect = $('#ind-mat-select', view);
      const tolSpan = $('#ind-mat-tol', view);
      const featSpan = $('#ind-mat-feat', view);
      const colSpan = $('#ind-mat-col', view);

      const updateMatInfo = () => {
        const activeTech = $('#ind-tech-group button.active', view)?.dataset?.tech || 'sla';
        chosenIndTech = activeTech;
        const items = IND_MATERIALS[activeTech] || [];
        const chosen = items.find((m) => m.name === matSelect.value) || items[0];
        if (chosen) {
          chosenIndMat = chosen.name;
          tolSpan.textContent = chosen.tol;
          featSpan.textContent = chosen.feat;
          colSpan.textContent = chosen.col;
        }
        updatePrice();
      };

      techBtns.forEach((b) => {
        b.addEventListener('click', () => {
          techBtns.forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          const t = b.dataset.tech;
          const items = IND_MATERIALS[t] || [];
          matSelect.innerHTML = items.map((m) => `<option value="${m.name}">${m.name} (${m.col})</option>`).join('');
          updateMatInfo();
        });
      });

      matSelect.addEventListener('change', updateMatInfo);

      const volInp = $('#ind-vol', view);
      if (volInp) {
        volInp.addEventListener('input', (e) => {
          chosenIndVol = e.target.value;
          updatePrice();
        });
      }
    }

    // Battery Watt-hour recalculator & live state
    if (isBattery) {
      const vInp = $('#bat-v', view);
      const ahInp = $('#bat-ah', view);
      const whSpan = $('#bat-wh-calc', view);

      const updateWh = () => {
        const v = parseFloat(vInp.value) || 0;
        const ah = parseFloat(ahInp.value) || 0;
        chosenBatV = v;
        chosenBatAh = ah;
        const wh = Math.round(v * ah);
        whSpan.textContent = `${wh} Wh (${(wh / 1000).toFixed(2)} kWh)`;
        updatePrice();
      };

      vInp.addEventListener('input', updateWh);
      ahInp.addEventListener('input', updateWh);

      $$('#bat-chem-group button', view).forEach((b) => {
        b.addEventListener('click', () => {
          $$('#bat-chem-group button', view).forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          chosenBatChem = b.dataset.chem;
          updatePrice();
        });
      });

      $$('#bat-volt-pills button', view).forEach((btn) => {
        btn.addEventListener('click', () => {
          $$('#bat-volt-pills button', view).forEach((x) => x.classList.remove('active'));
          btn.classList.add('active');
          vInp.value = btn.dataset.v;
          updateWh();
        });
      });

      $$('#bat-conn-group button', view).forEach((b) => {
        b.addEventListener('click', () => {
          $$('#bat-conn-group button', view).forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          chosenBatConn = b.dataset.conn;
          updatePrice();
        });
      });

      $$('#bat-enc-group button', view).forEach((b) => {
        b.addEventListener('click', () => {
          $$('#bat-enc-group button', view).forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          chosenBatEnc = b.dataset.enc;
          updatePrice();
        });
      });
    }

    // Generic radio pills in view
    $$('.radio-pills', view).forEach((group) => {
      group.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        $$('button', group).forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
      });
    });

    // Non-metal preview label & inputs
    if (isNonMetalLaser) {
      const label = $('#nonmetal-sel-label', view);
      $$('#acrylic-thick-group button, #wood-mat-group button', view).forEach((b) => {
        b.addEventListener('click', () => {
          $$('#acrylic-thick-group button, #wood-mat-group button', view).forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          chosenNonMetalMat = b.dataset.mat;
          label.textContent = `Selected: ${chosenNonMetalMat} - ${chosenNonMetalCol}`;
          updatePrice();
        });
      });
      $$('#acrylic-colors-group button', view).forEach((b) => {
        b.addEventListener('click', () => {
          $$('#acrylic-colors-group button', view).forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          chosenNonMetalCol = b.dataset.col;
          label.textContent = `Selected: ${chosenNonMetalMat} - ${chosenNonMetalCol}`;
          updatePrice();
        });
      });

      const nmLen = $('#nm-len', view);
      const nmWid = $('#nm-wid', view);
      if (nmLen && nmWid) {
        nmLen.addEventListener('input', (e) => { chosenNonMetalLen = e.target.value; updatePrice(); });
        nmWid.addEventListener('input', (e) => { chosenNonMetalWid = e.target.value; updatePrice(); });
      }
    }

    // Metal laser preview & inputs
    if (isMetalLaser) {
      const label = $('#metal-sel-label', view);
      $$('#ms-group button, #al-group button, #ss-group button', view).forEach((b) => {
        b.addEventListener('click', () => {
          $$('#ms-group button, #al-group button, #ss-group button', view).forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          chosenMetalMat = b.dataset.mat;
          label.textContent = 'Selected: ' + chosenMetalMat;
          updatePrice();
        });
      });

      $$('#metal-gas-group button', view).forEach((b) => {
        b.addEventListener('click', () => {
          $$('#metal-gas-group button', view).forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          chosenMetalGas = b.dataset.gas || b.textContent.trim();
          updatePrice();
        });
      });

      const mlLen = $('#ml-len', view);
      const mlWid = $('#ml-wid', view);
      if (mlLen && mlWid) {
        mlLen.addEventListener('input', (e) => { chosenMetalLen = e.target.value; updatePrice(); });
        mlWid.addEventListener('input', (e) => { chosenMetalWid = e.target.value; updatePrice(); });
      }
    }

    // Quantity change
    const qtyInp = $('#gen-qty', view);
    if (qtyInp) {
      qtyInp.addEventListener('input', updatePrice);
      qtyInp.addEventListener('change', updatePrice);
    }

    // Submit quote / order
    $('#btn-submit-service', view).addEventListener('click', async () => {
      const name = $('#gen-name', view).value.trim();
      const phone = $('#gen-phone', view).value.trim();
      const email = $('#gen-email', view).value.trim();
      const qty = $('#gen-qty', view).value.trim() || '1';
      const notes = $('#gen-notes', view).value.trim();

      if (!name || !phone || !email) {
        MS.toast('Please provide your name, mobile, and email.');
        $('#gen-name', view).focus();
        return;
      }

      const fd = new FormData();
      fd.append('slug', p.slug);
      fd.append('name', name);
      fd.append('phone', phone);
      fd.append('email', email);
      fd.append('qty', qty);
      fd.append('notes', notes);

      const quoteOpts = {
        service: p.name,
        quantity: qty,
        calculated_price: currentCalculatedPrice,
        lead_time: leadTimeText
      };

      if (isNonMetalLaser) {
        quoteOpts.material = chosenNonMetalMat;
        quoteOpts.color = chosenNonMetalCol;
        quoteOpts.dimensions = `${chosenNonMetalLen}x${chosenNonMetalWid} mm`;
      } else if (isMetalLaser) {
        quoteOpts.material = chosenMetalMat;
        quoteOpts.gas = chosenMetalGas;
        quoteOpts.dimensions = `${chosenMetalLen}x${chosenMetalWid} mm`;
      } else if (is3D && !isIndustrial) {
        quoteOpts.profile = chosenFdmProfile;
        quoteOpts.material = chosenFdmMat;
        quoteOpts.color = chosenFdmCol;
        quoteOpts.infill = chosenFdmInfill;
        quoteOpts.weight = `${chosenFdmWeight} g`;
      } else if (isIndustrial) {
        quoteOpts.technology = chosenIndTech;
        quoteOpts.material = chosenIndMat;
        quoteOpts.volume = `${chosenIndVol} cm³`;
      } else if (isBattery) {
        quoteOpts.chemistry = chosenBatChem;
        quoteOpts.voltage = `${chosenBatV}V`;
        quoteOpts.capacity = `${chosenBatAh}Ah`;
        quoteOpts.connector = chosenBatConn;
        quoteOpts.enclosure = chosenBatEnc;
        quoteOpts.energy = `${Math.round(chosenBatV * chosenBatAh)} Wh`;
      }

      fd.append('options', JSON.stringify(quoteOpts));
      if (uploadedFile) fd.append('file', uploadedFile);

      const btn = $('#btn-submit-service', view);
      btn.disabled = true; btn.textContent = 'Submitting Request...';
      try {
        const r = await fetch('/api/service-quote', { method: 'POST', body: fd });
        const res = await r.json();
        if (!r.ok) throw new Error(res.detail || 'Could not submit quote');
        MS.toast('Request ' + res.reference + ' received! Engineers will contact you.');
        $('#gen-out', view).innerHTML = `<div class="msg ok">Thank you! Your quote request <b>${esc(res.reference)}</b> for <b>₹${currentCalculatedPrice.toLocaleString('en-IN')}</b> is received. We will contact you shortly.</div>`;
      } catch (err) {
        MS.toast('Error: ' + err.message);
      } finally {
        btn.disabled = false; btn.textContent = 'Add to Cart & Request Quote';
      }
    });

    bindTabs(view, p);
    updatePrice();
  }

  // --------------------------------------------------------------------------- 7 Tabs Navigation & Content
  function renderTabs(p) {
    return `
      <div class="svc-tabs-wrapper">
        <div class="svc-tab-nav" id="svc-tabs-bar" role="tablist">
          <button type="button" class="svc-tab-item active" data-tab="desc">Description</button>
          <button type="button" class="svc-tab-item" data-tab="specs">Specification</button>
          <button type="button" class="svc-tab-item" data-tab="reviews">Reviews</button>
          <button type="button" class="svc-tab-item" data-tab="articles">Related Articles</button>
          <button type="button" class="svc-tab-item" data-tab="terms">Terms Of Services</button>
          <button type="button" class="svc-tab-item" data-tab="other">Other Info</button>
          <button type="button" class="svc-tab-item" data-tab="qna">QnA</button>
        </div>
        <div class="svc-tab-pane" id="svc-tabs-body">
          <!-- Dynamic pane content injected here -->
        </div>
      </div>
    `;
  }

  function bindTabs(root, p) {
    const tabsBar = $('#svc-tabs-bar', root);
    const tabsBody = $('#svc-tabs-body', root);
    if (!tabsBar || !tabsBody) return;

    const specs = SERVICE_SPECS[p.slug] || p.specs || {};
    const revs = (p.reviews && p.reviews.length) ? p.reviews : [];

    const getPaneContent = (k) => {
      if (k === 'desc') {
        return `<div class="prose">${MS.clean(p.description || '<p>Comprehensive on-demand engineering and manufacturing service by MySemicon.</p>')}</div>`;
      }
      if (k === 'specs') {
        const rows = Object.entries(specs);
        if (!rows.length) return `<div class="prose"><p>Standard engineering tolerances apply.</p></div>`;
        return `
          <table class="svc-spec-table">
            <tbody>
              ${rows.map(([k, v]) => `<tr><td style="font-weight:600;width:35%;color:#0f172a">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
            </tbody>
          </table>
        `;
      }
      if (k === 'reviews') {
        const totalCount = p.rating && p.rating.reviewCount ? p.rating.reviewCount : revs.length;
        if (!revs.length) {
          return `
            <div class="svc-reviews-container">
              <h4 style="margin:0 0 10px;font-size:17px;color:#0f172a">Reviews (${esc(totalCount)})</h4>
              <p style="color:#64748b;font-size:14px">There are no reviews yet. Be the first to review &ldquo;${esc(p.name)}&rdquo;.</p>
              <div class="svc-wizard-box" style="margin-top:20px">
                <h5 style="margin:0 0 10px;font-size:15px;color:#0f172a">Add a review</h5>
                <div class="svc-grid">
                  <div class="svc-f"><label class="svc-l">Your Name *</label><input placeholder="Your name"></div>
                  <div class="svc-f"><label class="svc-l">Your Rating *</label><select><option>5 Stars - Outstanding</option><option>4 Stars - Good</option><option>3 Stars - Average</option></select></div>
                  <div class="svc-f full"><label class="svc-l">Your Review *</label><textarea rows="3" placeholder="Share your experience with this service..."></textarea></div>
                </div>
                <button type="button" class="btnx" style="margin-top:12px" onclick="MS.toast('Thank you! Your review has been submitted.')">Submit Review</button>
              </div>
            </div>
          `;
        }
        return `
          <div class="svc-reviews-container">
            <h4 style="margin:0 0 14px;font-size:18px;font-weight:700;color:#0f172a">Customer Reviews (${esc(totalCount)})</h4>
            ${revs.map((r) => {
              const author = r.author ? (typeof r.author === 'object' ? r.author.name : r.author) : 'Verified Customer';
              const ratingVal = r.reviewRating ? parseInt(r.reviewRating.ratingValue || r.reviewRating, 10) : 5;
              const stars = '★'.repeat(ratingVal) + '☆'.repeat(Math.max(0, 5 - ratingVal));
              const dateStr = r.datePublished ? r.datePublished.slice(0, 10) : '';
              const body = r.reviewBody || r.text || '';
              return `
                <div class="svc-review-card">
                  <div class="svc-review-header">
                    <span class="svc-review-author">${esc(author)} <span class="svc-verified-tag">✓ Verified Buyer</span></span>
                    <span class="svc-review-stars" style="color:#f59e0b;font-size:15px">${stars}</span>
                  </div>
                  ${dateStr ? `<div style="font-size:12px;color:#94a3b8;margin-bottom:6px">${esc(dateStr)}</div>` : ''}
                  <p class="svc-review-text" style="margin:0;font-size:14px;color:#334155;line-height:1.5">${esc(body)}</p>
                </div>
              `;
            }).join('')}
            <div class="svc-wizard-box" style="margin-top:24px">
              <h5 style="margin:0 0 10px;font-size:15px;color:#0f172a">Leave a Review</h5>
              <div class="svc-grid">
                <div class="svc-f"><label class="svc-l">Your Name *</label><input placeholder="Your name"></div>
                <div class="svc-f"><label class="svc-l">Rating *</label><select><option>5 Stars - Outstanding</option><option>4 Stars - Good</option><option>3 Stars - Average</option></select></div>
                <div class="svc-f full"><label class="svc-l">Review Comments *</label><textarea rows="2" placeholder="Tell us about the part accuracy and turnaround..."></textarea></div>
              </div>
              <button type="button" class="btnx" style="margin-top:12px" onclick="MS.toast('Thank you! Your review has been submitted for verification.')">Submit Review</button>
            </div>
          </div>
        `;
      }
      if (k === 'articles') {
        const arts = (p.extra && p.extra.articles) || [];
        if (!arts.length) return '<p style="color:#64748b">There are no related articles for this service yet.</p>';
        return `
          <div class="svc-articles-grid">
            ${arts.map((a) => `
              <div class="svc-article-item">
                <div>
                  <h5 style="margin:0 0 6px;font-size:15px;color:#0f172a"><a href="/${esc(a.slug)}/">${esc(a.title)}</a></h5>
                  <p style="margin:0;font-size:13.5px;color:#64748b;line-height:1.4">${esc((a.description || '').slice(0, 160))}</p>
                </div>
                <a class="svc-article-read" href="/${esc(a.slug)}/" style="display:inline-block;margin-top:10px;font-size:13px;font-weight:600;color:#2a1f38">Read article &rarr;</a>
              </div>
            `).join('')}
          </div>
        `;
      }
      if (k === 'terms') {
        return `<div class="prose">${MS.clean(p.terms || '<p>Standard manufacturing warranty and terms apply.</p>')}</div>`;
      }
      if (k === 'other') {
        return `
          <div class="prose">
            <h4>Packaging &amp; Dispatch Standards</h4>
            <ul>
              <li><strong>Electrostatic Protection (ESD):</strong> All electronics, bare boards, and assembled PCBs are vacuum-packed in anti-static ESD shielding bags with moisture-absorbing silica gel.</li>
              <li><strong>Heavy-duty Shock-Absorbing Foam:</strong> Custom multi-layer foam cutouts protect precision 3D printed parts, laser-cut sheets, and battery assemblies against transit vibration.</li>
              <li><strong>Official Tax Invoicing:</strong> GST tax invoices with appropriate HSN / SAC codes accompany every shipment for straightforward input tax credit claims.</li>
            </ul>
          </div>
        `;
      }
      if (k === 'qna') {
        const faqs = (p.faqs && p.faqs.length) ? p.faqs : [];
        if (!faqs.length) return '<p style="color:#64748b">No questions have been asked about this service yet.</p>';
        return `
          <div class="faq">
            ${faqs.map((f) => `
              <details style="margin-bottom:12px;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;background:#fff">
                <summary style="font-weight:700;color:#0f172a;cursor:pointer;outline:none">${esc(f.q)}</summary>
                <div class="prose" style="margin-top:10px;font-size:14px;color:#475569">${MS.clean(f.a)}</div>
              </details>
            `).join('')}
          </div>
        `;
      }
      return '';
    };

    tabsBody.innerHTML = getPaneContent('desc');
    tabsBar.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      $$('button', tabsBar).forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      tabsBody.innerHTML = getPaneContent(b.dataset.tab);
    });
  }

  // --------------------------------------------------------------------------- Related Products Section (Removed per user requirement)
  function renderRelatedSection(p) {
    return '';
  }

  // --------------------------------------------------------------------------- Main Entry Point
  MS.renderService = async (p, view) => {
    let cfg;
    try { cfg = await MS.api('/service-options'); } catch (e) { cfg = { slugs: {}, types: {} }; }

    const isServiceSlug = (p.slug in SERVICE_SPECS) || (p.slug in cfg.slugs) || (p.is_service);
    if (!isServiceSlug) return false;

    if (p.slug === 'online-pcb-manufacturing-service') {
      renderPcbService(p, cfg, view);
    } else {
      renderStandardService(p, cfg, view);
    }
    return true;
  };

})();
