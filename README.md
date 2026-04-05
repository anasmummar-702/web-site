# 👑 Royal Collections — Modern Boutique E-Commerce

A full-stack e-commerce web application for a fashion boutique, featuring product listings, shopping cart, Razorpay payment integration, and a complete admin dashboard — all built with vanilla HTML/CSS/JavaScript and powered by Supabase.

---

## 🛍️ Live Features

- **Multi-category storefront** — Ladies, Kids, Footwear, Jewelry, Innerwears
- **Dynamic product listings** — Fetched in real-time from Supabase
- **Product detail page** — Variants, sizes, stock-aware quantity selection
- **Shopping cart** — Persistent via `localStorage`, supports multiple variants/sizes
- **Checkout flow** — Customer info form with address and phone validation
- **Dual payment support** — Razorpay (online) + Cash on Delivery (COD)
- **Secure payment verification** — Server-side HMAC signature validation via Supabase Edge Function
- **Order confirmation page** — Thank-you page with order summary
- **Admin dashboard** — Login-protected portal to manage products and orders
- **Responsive design** — Mobile-first layout with hamburger navigation

---

## 🗂️ Project Structure

```
ansui-royal/
├── index.html            # Homepage with latest arrivals
├── ladies.html           # Ladies category listing
├── kids.html             # Kids category listing
├── shoes.html            # Footwear category listing
├── cosmetics.html        # Jewelry category listing
├── innerwears.html       # Innerwears category listing
├── product.html          # Individual product detail page
├── cart.html             # Shopping cart & checkout
├── thankyou.html         # Order confirmation
├── admin.html            # Admin dashboard (login-protected)
├── contact.html          # Contact page
├── privacy.html          # Privacy policy
├── terms.html            # Terms & conditions
├── shipping.html         # Shipping policy
├── returns.html          # Returns policy
├── cancellations.html    # Cancellation policy
├── style.css             # Global stylesheet (CSS variables + responsive)
├── script.js             # All frontend logic (cart, Supabase, Razorpay)
├── home_image/
│   └── royal_collections.jpg
└── supabase/
    └── functions/
        └── checkout/
            └── index.ts  # Edge Function — order creation & payment verification
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Database & Auth | [Supabase](https://supabase.com) (PostgreSQL) |
| Backend Logic | Supabase Edge Functions (Deno / TypeScript) |
| Payments | [Razorpay](https://razorpay.com) |
| Fonts | Google Fonts — Cinzel, Montserrat |
| Icons | Font Awesome 6 |

---

## ⚙️ Setup & Installation

### Prerequisites
- A [Supabase](https://supabase.com) account and project
- A [Razorpay](https://razorpay.com) account (test keys for development)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for deploying Edge Functions)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ansui-royal.git
cd ansui-royal
```

### 2. Configure Environment Variables

Create a `.env` file (never commit this) with your credentials:

```env
DB_URL=https://your-project.supabase.co
DB_ADMIN_KEY=your_supabase_service_role_key
RZP_ID=rzp_test_yourRazorpayKeyId
RZP_SECRET=your_razorpay_secret
```

Set the same variables as secrets in your Supabase Edge Function:

```bash
supabase secrets set DB_URL=https://your-project.supabase.co
supabase secrets set DB_ADMIN_KEY=your_service_role_key
supabase secrets set RZP_ID=rzp_test_yourId
supabase secrets set RZP_SECRET=your_secret
```

### 3. Update Frontend Credentials

In `script.js`, replace the placeholder values with your own Supabase public (anon) credentials:

```js
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your_supabase_anon_key';
```

### 4. Set Up the Supabase Database

Create the following tables in your Supabase project:

- `products` — `id`, `name`, `category`, `price`, `stock_quantity`, `variants` (JSONB), `images` (array), `description`, `created_at`
- `orders` — `id`, `customer_name`, `customer_email`, `customer_phone`, `address`, `post_code`, `total_amount`, `payment_method`, `razorpay_order_id`, `status`, `cart_snapshot` (JSONB), `created_at`

Also create a stored procedure `confirm_order(p_order_id, p_payment_id, p_signature)` to atomically update stock and order status.

### 5. Deploy the Edge Function

```bash
supabase functions deploy checkout
```

### 6. Open in Browser

Simply open `index.html` in your browser or serve with any static file server:

```bash
npx serve .
```

---

## 💳 Payment Flow

```
Customer Checkout
      │
      ▼
Edge Function: create_order
  ├── Validates cart & stock (server-side)
  ├── COD → inserts order, deducts stock, done
  └── Online → creates Razorpay order, returns order ID
      │
      ▼
Razorpay Payment Modal (client-side)
      │
      ▼
Edge Function: verify_payment
  └── HMAC signature verified → confirms order & deducts stock
```

---

## 🔐 Security Notes

> **⚠️ Before pushing to GitHub, make sure you have:**

- [ ] Added `.env` to `.gitignore`
- [ ] Removed hardcoded Supabase keys from `script.js` — use environment config or a config file that is gitignored
- [ ] Rotated any keys that were previously exposed in public commits
- [ ] Enabled Row Level Security (RLS) on your Supabase tables
- [ ] Restricted the admin dashboard route with proper Supabase Auth roles

---

## 🚀 Deployment

This is a static site and can be hosted on:

- **GitHub Pages** — Free, works out of the box for static HTML
- **Vercel** — Drag and drop deploy, custom domain support
- **Netlify** — Easy CI/CD from GitHub with form support

For the Edge Functions, they are hosted and run on Supabase's infrastructure automatically after `supabase functions deploy`.

---

## 📄 Pages Overview

| Page | Description |
|---|---|
| `index.html` | Homepage — hero banner + latest arrivals |
| `ladies.html` / `kids.html` etc. | Category product grids |
| `product.html` | Product detail — variants, sizes, add to cart |
| `cart.html` | Cart review + full checkout form |
| `thankyou.html` | Order success confirmation |
| `admin.html` | Admin login + product & order management |
| `contact.html` | Contact information |
| `privacy.html` | Privacy policy |
| `terms.html` | Terms & conditions |
| `shipping.html` | Shipping information |
| `returns.html` | Returns policy |
| `cancellations.html` | Cancellation policy |

---

## 📝 .gitignore Recommendations

Add the following to your `.gitignore`:

```
.env
*.zip
node_modules/
supabase/.temp/
```

---

## 📬 Contact

Built by **Ansui Royal** — for queries, reach out via the [Contact Page](contact.html).

---
---

## 🔗 Live Demo
Check out the live store here: [Royal Collections Live](https://royalcollections.netlify.app/)

---
*Royal Collections — Elegance is an Attitude.*
