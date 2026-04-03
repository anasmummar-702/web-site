<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Royal Collections — Project Overview</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --ink: #0d0d0d;
    --paper: #faf9f6;
    --gold: #b8973e;
    --gold-light: #e8d9a8;
    --muted: #6b6560;
    --rule: #e0dcd4;
    --tag-bg: #f0ece3;
    --accent: #1a3a5c;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--paper);
    color: var(--ink);
    line-height: 1.7;
  }

  /* ── COVER ── */
  .cover {
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: var(--ink);
    color: #fff;
    text-align: center;
    padding: 60px 40px;
    position: relative;
    overflow: hidden;
  }

  .cover::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 80% 60% at 50% 20%, rgba(184,151,62,.18) 0%, transparent 70%),
                radial-gradient(ellipse 40% 40% at 80% 80%, rgba(26,58,92,.4) 0%, transparent 60%);
  }

  .cover-inner { position: relative; max-width: 800px; }

  .cover-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 0.72rem;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 28px;
  }

  .cover h1 {
    font-family: 'Playfair Display', serif;
    font-size: clamp(3rem, 8vw, 6rem);
    font-weight: 700;
    line-height: 1.05;
    margin-bottom: 10px;
  }

  .cover-sub {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: clamp(1.1rem, 2.5vw, 1.5rem);
    color: var(--gold-light);
    margin-bottom: 36px;
  }

  .cover-desc {
    font-size: 1rem;
    color: rgba(255,255,255,0.65);
    max-width: 520px;
    margin: 0 auto 50px;
    line-height: 1.8;
  }

  .cover-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
  }

  .chip {
    font-size: 0.75rem;
    font-weight: 500;
    padding: 6px 14px;
    border: 1px solid rgba(184,151,62,.5);
    color: var(--gold-light);
    letter-spacing: .5px;
    border-radius: 2px;
  }

  /* ── LAYOUT ── */
  .doc { max-width: 960px; margin: 0 auto; padding: 80px 40px; }

  /* Section title */
  .section-label {
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .section-label::after { content: ''; flex: 1; height: 1px; background: var(--gold-light); }

  .section-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(1.6rem, 3vw, 2.4rem);
    font-weight: 700;
    margin-bottom: 32px;
    line-height: 1.2;
  }

  .section { margin-bottom: 80px; }

  /* ── SUMMARY BOX ── */
  .summary-box {
    background: var(--ink);
    color: #fff;
    padding: 48px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 40px;
    margin-bottom: 80px;
  }

  @media (max-width: 640px) { .summary-box { grid-template-columns: 1fr; } }

  .stat-num {
    font-family: 'Playfair Display', serif;
    font-size: 2.8rem;
    color: var(--gold);
    line-height: 1;
    margin-bottom: 6px;
  }
  .stat-label { font-size: 0.8rem; color: rgba(255,255,255,0.55); letter-spacing: .5px; text-transform: uppercase; }

  /* ── STACK TABLE ── */
  .stack-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1px;
    background: var(--rule);
    border: 1px solid var(--rule);
    margin-bottom: 48px;
  }

  .stack-cell {
    background: var(--paper);
    padding: 28px 32px;
  }

  .stack-layer {
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 8px;
  }

  .stack-tech {
    font-weight: 600;
    font-size: 1.05rem;
    margin-bottom: 6px;
  }

  .stack-detail { font-size: 0.85rem; color: var(--muted); line-height: 1.6; }

  /* ── FEATURES ── */
  .feature-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }

  .feature-card {
    border: 1px solid var(--rule);
    padding: 28px;
    position: relative;
  }

  .feature-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 3px; height: 100%;
    background: var(--gold);
  }

  .feature-icon {
    font-size: 1.4rem;
    margin-bottom: 12px;
  }

  .feature-title {
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 8px;
  }

  .feature-desc { font-size: 0.85rem; color: var(--muted); line-height: 1.65; }

  /* ── ARCHITECTURE ── */
  .arch-diagram {
    background: var(--ink);
    color: #fff;
    padding: 48px;
    font-family: 'DM Mono', monospace;
    font-size: 0.8rem;
    line-height: 2;
    overflow-x: auto;
  }

  .arch-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .arch-box {
    padding: 6px 14px;
    border: 1px solid;
    white-space: nowrap;
    font-size: 0.72rem;
    letter-spacing: .5px;
  }
  .arch-box.frontend  { border-color: var(--gold); color: var(--gold); }
  .arch-box.backend   { border-color: #7ec8e3; color: #7ec8e3; }
  .arch-box.db        { border-color: #a8e6cf; color: #a8e6cf; }
  .arch-box.storage   { border-color: #ffd3b6; color: #ffd3b6; }
  .arch-box.payment   { border-color: #d4a5f5; color: #d4a5f5; }
  .arch-box.auth      { border-color: #ff8b94; color: #ff8b94; }
  .arch-arrow { color: rgba(255,255,255,.35); }

  /* ── PAGE MANIFEST ── */
  .page-table { width: 100%; border-collapse: collapse; }
  .page-table th {
    text-align: left;
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    padding: 0 16px 14px 0;
    border-bottom: 1px solid var(--rule);
  }
  .page-table td {
    padding: 16px 16px 16px 0;
    border-bottom: 1px solid var(--rule);
    font-size: 0.9rem;
    vertical-align: top;
  }
  .page-table code {
    font-family: 'DM Mono', monospace;
    font-size: 0.78rem;
    background: var(--tag-bg);
    padding: 2px 7px;
    color: var(--accent);
  }

  /* ── FLOW STEPS ── */
  .flow { display: flex; flex-direction: column; gap: 0; }

  .flow-step {
    display: grid;
    grid-template-columns: 60px 1fr;
    gap: 24px;
    padding-bottom: 32px;
    position: relative;
  }

  .flow-step:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 29px; top: 44px; bottom: 0;
    width: 2px;
    background: var(--rule);
  }

  .flow-num {
    width: 44px; height: 44px;
    border: 2px solid var(--gold);
    color: var(--gold);
    font-family: 'DM Mono', monospace;
    font-size: 0.8rem;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    font-weight: 500;
    background: var(--paper);
    position: relative;
    z-index: 1;
  }

  .flow-body { padding-top: 8px; }
  .flow-title { font-weight: 600; margin-bottom: 6px; }
  .flow-desc { font-size: 0.87rem; color: var(--muted); }

  /* ── HIGHLIGHT ── */
  .highlight-box {
    border-left: 3px solid var(--gold);
    background: var(--tag-bg);
    padding: 24px 28px;
    margin: 32px 0;
  }
  .highlight-box p { font-size: 0.92rem; color: var(--ink); line-height: 1.8; }
  strong { font-weight: 600; }

  /* ── SECURITY SECTION ── */
  .security-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
  .security-item {
    padding: 20px;
    border: 1px solid var(--rule);
    background: #fff;
  }
  .security-check { color: var(--gold); font-weight: 700; margin-bottom: 6px; font-size: 0.9rem; }
  .security-text { font-size: 0.82rem; color: var(--muted); }

  /* ── FOOTER ── */
  footer {
    border-top: 1px solid var(--rule);
    padding: 40px;
    text-align: center;
    font-size: 0.8rem;
    color: var(--muted);
    font-family: 'DM Mono', monospace;
  }

  /* Responsive */
  @media (max-width: 600px) {
    .doc { padding: 48px 20px; }
    .summary-box { padding: 28px; }
    .arch-diagram { padding: 24px; }
  }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-inner">
    <p class="cover-eyebrow">Full-Stack E-Commerce — Project Brief</p>
    <h1>Royal Collections</h1>
    <p class="cover-sub">A Modern Boutique Shopping Platform</p>
    <p class="cover-desc">
      A complete, production-ready e-commerce web application built for an Indian fashion boutique — featuring real-time inventory, dual payment support, and a secure admin dashboard.
    </p>
    <div class="cover-chips">
      <span class="chip">HTML5 / CSS3 / JavaScript</span>
      <span class="chip">Supabase (PostgreSQL)</span>
      <span class="chip">Deno Edge Functions</span>
      <span class="chip">Razorpay Payments</span>
      <span class="chip">Supabase Auth</span>
      <span class="chip">HMAC-SHA256 Security</span>
    </div>
  </div>
</div>

<div class="doc">

  <!-- AT A GLANCE -->
  <div class="summary-box">
    <div>
      <div class="stat-num">15+</div>
      <div class="stat-label">HTML Pages</div>
    </div>
    <div>
      <div class="stat-num">5</div>
      <div class="stat-label">Product Categories</div>
    </div>
    <div>
      <div class="stat-num">2</div>
      <div class="stat-label">Payment Modes</div>
    </div>
  </div>

  <!-- PROJECT OVERVIEW -->
  <div class="section">
    <p class="section-label">01 — Overview</p>
    <h2 class="section-title">What is Royal Collections?</h2>
    <p style="font-size:1rem; color: var(--muted); margin-bottom: 20px; max-width: 700px; line-height: 1.9;">
      Royal Collections is a fully functional e-commerce storefront for a fashion boutique targeting the Indian market. It was built entirely from scratch without any frontend frameworks — relying on vanilla HTML, CSS, and JavaScript while integrating a cloud backend through Supabase.
    </p>
    <div class="highlight-box">
      <p>
        The store sells across <strong>five categories</strong> — Ladies wear, Kids clothing, Footwear, Jewelry/Cosmetics, and Innerwear — with full support for <strong>product variants</strong> (color, style), <strong>size selection</strong>, <strong>real-time stock tracking</strong>, and <strong>online + cash-on-delivery checkout</strong>.
      </p>
    </div>
  </div>

  <!-- TECH STACK -->
  <div class="section">
    <p class="section-label">02 — Technology</p>
    <h2 class="section-title">Technical Stack</h2>
    <div class="stack-grid">
      <div class="stack-cell">
        <p class="stack-layer">Frontend</p>
        <p class="stack-tech">HTML5 / CSS3 / Vanilla JS</p>
        <p class="stack-detail">No framework dependencies. Responsive design with CSS variables, custom animations, and mobile-first layout. Google Fonts (Cinzel, Montserrat) + Font Awesome icons.</p>
      </div>
      <div class="stack-cell">
        <p class="stack-layer">Backend-as-a-Service</p>
        <p class="stack-tech">Supabase</p>
        <p class="stack-detail">PostgreSQL database, Supabase Auth for admin login, Supabase Storage for product images, and Supabase JS SDK for all client queries.</p>
      </div>
      <div class="stack-cell">
        <p class="stack-layer">Serverless Functions</p>
        <p class="stack-tech">Deno / TypeScript (Edge)</p>
        <p class="stack-detail">A single secure Edge Function handles the entire checkout lifecycle: order creation, stock verification, Razorpay order creation, payment signature verification, and webhook handling.</p>
      </div>
      <div class="stack-cell">
        <p class="stack-layer">Payment Gateway</p>
        <p class="stack-tech">Razorpay</p>
        <p class="stack-detail">Supports online card/UPI payments via Razorpay and Cash-on-Delivery. Payment integrity is verified server-side using HMAC-SHA256 cryptographic signatures.</p>
      </div>
      <div class="stack-cell">
        <p class="stack-layer">Image Handling</p>
        <p class="stack-tech">Browser Image Compression</p>
        <p class="stack-detail">Product images are compressed client-side (max 0.5 MB, 1280px) before being uploaded to Supabase Storage, ensuring fast page loads.</p>
      </div>
      <div class="stack-cell">
        <p class="stack-layer">State & Persistence</p>
        <p class="stack-tech">localStorage + Supabase DB</p>
        <p class="stack-detail">Cart is persisted in localStorage for seamless browsing sessions. All orders, products, and inventory are persisted in Supabase's PostgreSQL database.</p>
      </div>
    </div>
  </div>

  <!-- ARCHITECTURE -->
  <div class="section">
    <p class="section-label">03 — Architecture</p>
    <h2 class="section-title">System Architecture</h2>
    <div class="arch-diagram">
      <div style="color: rgba(255,255,255,.4); margin-bottom:20px; font-size:.7rem; letter-spacing:2px;">CLIENT ─────────────────────────────────────────</div>
      <div class="arch-row">
        <span class="arch-box frontend">Browser / User</span>
        <span class="arch-arrow">──▶</span>
        <span class="arch-box frontend">Static HTML Pages</span>
        <span class="arch-arrow">──▶</span>
        <span class="arch-box frontend">script.js (SPA logic)</span>
      </div>
      <br>
      <div style="color: rgba(255,255,255,.4); margin-bottom:20px; font-size:.7rem; letter-spacing:2px;">SUPABASE CLOUD ──────────────────────────────────</div>
      <div class="arch-row">
        <span class="arch-box backend">Supabase JS SDK</span>
        <span class="arch-arrow">──▶</span>
        <span class="arch-box db">PostgreSQL DB</span>
        <span class="arch-arrow">  products / orders / order_items</span>
      </div>
      <div class="arch-row" style="margin-top:8px;">
        <span class="arch-box backend">Supabase SDK</span>
        <span class="arch-arrow">──▶</span>
        <span class="arch-box auth">Supabase Auth</span>
        <span class="arch-arrow">  Admin login (email/password)</span>
      </div>
      <div class="arch-row" style="margin-top:8px;">
        <span class="arch-box backend">Supabase SDK</span>
        <span class="arch-arrow">──▶</span>
        <span class="arch-box storage">Supabase Storage</span>
        <span class="arch-arrow">  Product images (CDN-served)</span>
      </div>
      <br>
      <div style="color: rgba(255,255,255,.4); margin-bottom:20px; font-size:.7rem; letter-spacing:2px;">EDGE FUNCTION (Deno) ────────────────────────────</div>
      <div class="arch-row">
        <span class="arch-box backend">checkout/index.ts</span>
        <span class="arch-arrow">──▶</span>
        <span class="arch-box payment">Razorpay API</span>
        <span class="arch-arrow">  create order, verify payment</span>
      </div>
      <div class="arch-row" style="margin-top:8px;">
        <span class="arch-box backend">checkout/index.ts</span>
        <span class="arch-arrow">──▶</span>
        <span class="arch-box db">DB RPC: confirm_order</span>
        <span class="arch-arrow">  atomic stock decrement</span>
      </div>
    </div>
  </div>

  <!-- PAGE MANIFEST -->
  <div class="section">
    <p class="section-label">04 — Pages</p>
    <h2 class="section-title">Page Structure</h2>
    <table class="page-table">
      <thead>
        <tr>
          <th>File</th>
          <th>Purpose</th>
          <th>Key Functionality</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>index.html</code></td>
          <td>Home / Landing</td>
          <td>Latest 8 products dynamically loaded from Supabase, newsletter section, hero banner</td>
        </tr>
        <tr>
          <td><code>ladies / kids / shoes / cosmetics / innerwears .html</code></td>
          <td>Category Listings</td>
          <td>Filtered product grids pulled per category from database, dynamic rendering</td>
        </tr>
        <tr>
          <td><code>product.html</code></td>
          <td>Product Detail</td>
          <td>Variant selection (color/style), image gallery, size picker with live price &amp; stock display, add-to-cart</td>
        </tr>
        <tr>
          <td><code>cart.html</code></td>
          <td>Shopping Bag</td>
          <td>Cart summary table, quantity controls, checkout modal with customer info form</td>
        </tr>
        <tr>
          <td><code>admin.html</code></td>
          <td>Admin Dashboard</td>
          <td>Auth-gated: Order management, product CRUD, image upload, size presets, inventory view</td>
        </tr>
        <tr>
          <td><code>thankyou.html</code></td>
          <td>Order Confirmation</td>
          <td>Displays order ID and total from URL params after successful checkout</td>
        </tr>
        <tr>
          <td>Policy pages</td>
          <td>Legal / Info</td>
          <td>Shipping, cancellations, returns, privacy, terms, contact</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- CHECKOUT FLOW -->
  <div class="section">
    <p class="section-label">05 — Core Flow</p>
    <h2 class="section-title">Checkout & Payment Flow</h2>
    <div class="flow">
      <div class="flow-step">
        <div class="flow-num">01</div>
        <div class="flow-body">
          <p class="flow-title">Cart & Checkout Modal</p>
          <p class="flow-desc">Customer fills name, email, 10-digit phone (with country code selector), address, postcode, and selects COD or Online payment. Client validates the phone length before submission.</p>
        </div>
      </div>
      <div class="flow-step">
        <div class="flow-num">02</div>
        <div class="flow-body">
          <p class="flow-title">Edge Function: create_order</p>
          <p class="flow-desc">Cart is sent to the Supabase Edge Function. Server-side re-validates every item's price and stock against the database (preventing client-side tampering). Order record is inserted into PostgreSQL.</p>
        </div>
      </div>
      <div class="flow-step">
        <div class="flow-num">03a</div>
        <div class="flow-body">
          <p class="flow-title">COD Path</p>
          <p class="flow-desc">A DB RPC (<code>confirm_order</code>) atomically decrements stock for each variant/size combination. If stock is insufficient, the order is rolled back. Customer is redirected to the Thank You page.</p>
        </div>
      </div>
      <div class="flow-step">
        <div class="flow-num">03b</div>
        <div class="flow-body">
          <p class="flow-title">Online Payment Path (Razorpay)</p>
          <p class="flow-desc">The edge function creates a Razorpay order and returns the key + amount to the client. Razorpay's JS SDK opens a payment modal. On success, Razorpay returns a payment signature.</p>
        </div>
      </div>
      <div class="flow-step">
        <div class="flow-num">04</div>
        <div class="flow-body">
          <p class="flow-title">Edge Function: verify_payment</p>
          <p class="flow-desc">The server recomputes the expected HMAC-SHA256 signature using the Razorpay secret and compares it with the client-submitted signature. Only on match is <code>confirm_order</code> called to decrement stock and mark the order paid.</p>
        </div>
      </div>
      <div class="flow-step">
        <div class="flow-num">05</div>
        <div class="flow-body">
          <p class="flow-title">Webhook Fallback</p>
          <p class="flow-desc">A Razorpay webhook listener in the same edge function handles <code>order.paid</code> events, providing a server-driven confirmation path even if the browser closes before verification completes.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- KEY FEATURES -->
  <div class="section">
    <p class="section-label">06 — Features</p>
    <h2 class="section-title">Key Features</h2>
    <div class="feature-list">
      <div class="feature-card">
        <div class="feature-icon">🗂️</div>
        <p class="feature-title">Product Variants System</p>
        <p class="feature-desc">Each product supports multiple variants (e.g. colour/print) with independent image galleries and per-size pricing and stock levels stored as JSONB in PostgreSQL.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📦</div>
        <p class="feature-title">Atomic Inventory Management</p>
        <p class="feature-desc">Stock decrements happen inside a PostgreSQL RPC function — ensuring that concurrent orders never oversell an item, even under race conditions.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔐</div>
        <p class="feature-title">Auth-Gated Admin Dashboard</p>
        <p class="feature-desc">Admin panel is protected by Supabase Auth. Session is checked on load; unauthenticated users see only the login screen. Product CRUD and order viewing are admin-only.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📐</div>
        <p class="feature-title">Size Preset System</p>
        <p class="feature-desc">Admin can select from preset size charts (Ladies S–5XL, Jeans 28–40, Kids 0–36, Footwear 5–9, Bra 30–42, Innerwear cm) to auto-populate the size table with one click.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🖼️</div>
        <p class="feature-title">Client-Side Image Compression</p>
        <p class="feature-desc">Before upload, product images are compressed to ≤0.5 MB and ≤1280 px using the browser-image-compression library, reducing storage and CDN costs automatically.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔔</div>
        <p class="feature-title">Toast Notification System</p>
        <p class="feature-desc">A lightweight, custom-built toast component provides non-blocking feedback for cart additions, errors, and save confirmations without any external notification library.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📱</div>
        <p class="feature-title">Fully Responsive Design</p>
        <p class="feature-desc">Hamburger navigation, fluid product grids, responsive cart table, and mobile-friendly checkout modal — all built with pure CSS without Bootstrap or Tailwind.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔎</div>
        <p class="feature-title">Admin Order Search</p>
        <p class="feature-desc">Orders can be searched client-side by Order ID, customer name, or phone number. Results are filtered and re-rendered instantly from the cached order list.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🌏</div>
        <p class="feature-title">International Phone Support</p>
        <p class="feature-desc">Checkout form includes a country code selector, storing the full international phone number in the database for multi-region order management.</p>
      </div>
    </div>
  </div>

  <!-- SECURITY -->
  <div class="section">
    <p class="section-label">07 — Security</p>
    <h2 class="section-title">Security Considerations</h2>
    <div class="security-list">
      <div class="security-item">
        <p class="security-check">✦ Server-Side Price Validation</p>
        <p class="security-text">All prices and stock are re-read from the database on the server — client-side cart values are never trusted for order amounts.</p>
      </div>
      <div class="security-item">
        <p class="security-check">✦ HMAC-SHA256 Payment Verification</p>
        <p class="security-text">Razorpay payment signatures are recomputed server-side using the secret key and compared cryptographically before any stock is decremented.</p>
      </div>
      <div class="security-item">
        <p class="security-check">✦ Webhook Signature Verification</p>
        <p class="security-text">Incoming Razorpay webhooks are authenticated by verifying their X-Razorpay-Signature header before processing any events.</p>
      </div>
      <div class="security-item">
        <p class="security-check">✦ XSS Protection</p>
        <p class="security-text">A custom <code>escapeHtml()</code> utility sanitizes all dynamic content inserted into the DOM, preventing cross-site scripting attacks.</p>
      </div>
      <div class="security-item">
        <p class="security-check">✦ Auth-Gated Admin</p>
        <p class="security-text">The admin dashboard checks for an active Supabase Auth session on load, and the auth state listener triggers a reload on sign-in or sign-out.</p>
      </div>
      <div class="security-item">
        <p class="security-check">✦ Secrets in Environment Variables</p>
        <p class="security-text">Razorpay key/secret and Supabase service-role key are stored as Deno environment variables — never exposed to the client browser.</p>
      </div>
    </div>
  </div>

  <!-- HIGHLIGHTS -->
  <div class="section">
    <p class="section-label">08 — Takeaways</p>
    <h2 class="section-title">What This Project Demonstrates</h2>
    <div class="highlight-box">
      <p><strong>Full-stack ownership:</strong> Designed and built every layer — UI, client logic, backend edge function, database schema, and third-party payment integration — independently.</p>
    </div>
    <div class="highlight-box">
      <p><strong>No-framework discipline:</strong> Delivered a rich, dynamic SPA experience using only vanilla JavaScript, proving core language proficiency without framework dependencies.</p>
    </div>
    <div class="highlight-box">
      <p><strong>Real-world backend patterns:</strong> Implemented atomic database transactions via PostgreSQL RPC, environment-variable secret management, and HMAC cryptographic verification — patterns used in production systems.</p>
    </div>
    <div class="highlight-box">
      <p><strong>Production thinking:</strong> Includes XSS sanitization, server-side price validation, webhook fallback, client-side image compression, and a full suite of legal/policy pages — details that reflect real deployment readiness.</p>
    </div>
  </div>

</div>

<footer>
  Royal Collections — Project Documentation &nbsp;·&nbsp; Built with HTML · CSS · JavaScript · Supabase · Razorpay
</footer>

</body>
</html>
