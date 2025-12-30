const SUPABASE_URL = 'https://zxpttznsgulnhxmdijot.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cHR0em5zZ3Vsbmh4bWRpam90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjQ2MTgsImV4cCI6MjA4MDQ0MDYxOH0.8yB-oDUer9_fwptcf_wzC8xeW7v9LR6ZIQX_xKDJCwg';

let sb = null;
let cart = [];
let currentAdminOrders = [];

window.addEventListener('load', () => {
    if (typeof supabase !== 'undefined') {
        const { createClient } = supabase;
        sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    } 

    try {
        const savedCart = localStorage.getItem('royal_cart');
        if (savedCart) cart = JSON.parse(savedCart);
        if (document.querySelector('.cart-count')) updateCartCount();
    } catch (e) {}

    const path = window.location.pathname;
    if (path.includes('admin')) initAdmin();
    else if (path.includes('product')) initProductDetail();
    else if (path.includes('cart')) initCartPage();
    else if (path.includes('thankyou')) initThankYouPage();
    else if (path.includes('index') || path === '/' || path.endsWith('/')) initHomePage();
    else initListingPage();
});

document.addEventListener('DOMContentLoaded', () => {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.main-navigation');
    if (mobileToggle && nav) {
        mobileToggle.addEventListener('click', (e) => { e.stopPropagation(); nav.classList.toggle('open'); });
        document.addEventListener('click', (e) => { 
            if (nav.classList.contains('open') && !nav.contains(e.target) && !mobileToggle.contains(e.target)) nav.classList.remove('open'); 
        });
    }
});

function escapeHtml(text) {
    if (!text) return text;
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showRoyalToast(title, message, isError = false) {
    let toast = document.createElement('div');
    toast.className = `cart-toast ${isError ? 'error' : ''}`;
    toast.innerHTML = `<div class="toast-strip"></div><div class="toast-body"><div class="toast-title">${title}</div><div class="toast-msg">${message}</div></div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
}

function updateCartCount() {
    const els = document.querySelectorAll('.cart-count');
    const total = cart.reduce((acc, item) => acc + item.qty, 0);
    els.forEach(el => el.innerText = total);
}

function saveCart() {
    localStorage.setItem('royal_cart', JSON.stringify(cart));
    updateCartCount();
}

function addToCart(id, name, price, img, maxStock, qty, size, variantName) {
    const cartItemId = `${id}-${variantName}-${size}`; 
    const existing = cart.find(item => item.cartItemId === cartItemId);
    const currentQty = existing ? existing.qty : 0;
    
    if (currentQty + qty > maxStock) {
        return showRoyalToast('Stock Limitation', `Only ${maxStock} units available.`, true);
    }
    
    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({ 
            cartItemId, id, name: `${name} (${variantName} - ${size})`, 
            price: Number(price), img, qty, maxStock: Number(maxStock), 
            size, variant: variantName 
        });
    }
    saveCart();
    showRoyalToast('Added to Bag', `${name} added.`, false);
}

function initThankYouPage() {
    const p = new URLSearchParams(window.location.search);
    const oid = p.get('orderId'); 
    const amt = p.get('totalAmount');
    
    const msgEl = document.getElementById('thankyou-message');
    const detEl = document.getElementById('order-details');

    if (!msgEl) return;

    if (oid) {
        msgEl.innerHTML = `<h2>Thank You!</h2><p>Order Placed Successfully.</p>`;
        if(detEl) detEl.innerHTML = `<p><strong>Order ID:</strong> #${escapeHtml(oid)}</p><p><strong>Total:</strong> ₹${escapeHtml(amt)}</p><p>Your order will be shipped shortly.</p>`;
    } else {
        msgEl.innerHTML = `<h2>Order Not Found</h2>`;
    }
}

function initCartPage() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px;">Your Shopping Bag is empty.</td></tr>';
        if(document.getElementById('sub-total')) document.getElementById('sub-total').innerText = '₹0';
        if(document.getElementById('cart-total')) document.getElementById('cart-total').innerText = '₹0';
        return;
    }

    container.innerHTML = cart.map((item, i) => `
        <tr>
            <td data-label="Product">
                <div style="display:flex; align-items:center; gap:15px; text-align:left;">
                    <img src="${item.img}" style="width:60px; height:80px; object-fit:cover; border-radius:4px;">
                    <div>
                        <div style="font-weight:600; color:var(--color-primary);">${escapeHtml(item.name)}</div>
                        <small style="color:var(--color-secondary);">Size: ${escapeHtml(item.size)}</small>
                    </div>
                </div>
            </td>
            <td data-label="Price">₹${item.price}</td>
            <td data-label="Qty">
                <div style="display:flex; align-items:center; gap:5px;">
                    <button class="btn-icon" onclick="updateCartQty(${i}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="btn-icon" onclick="updateCartQty(${i}, 1)">+</button>
                </div>
            </td>
            <td data-label="Total">₹${item.price * item.qty}</td>
            <td style="text-align:right;">
                <button class="btn-icon" onclick="removeFromCart(${i})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    if(document.getElementById('sub-total')) document.getElementById('sub-total').innerText = `₹${total}`;
    if(document.getElementById('cart-total')) document.getElementById('cart-total').innerText = `₹${total}`;
}

window.updateCartQty = function(i, change) {
    const item = cart[i];
    const newQty = item.qty + change;
    if (newQty < 1) return;
    if (newQty > item.maxStock) return alert(`Only ${item.maxStock} units available.`);
    item.qty = newQty;
    saveCart();
    initCartPage();
};

window.removeFromCart = function(i) {
    if(confirm("Remove this item?")) {
        cart.splice(i, 1);
        saveCart();
        initCartPage();
    }
};

window.openCheckout = function() {
    if(cart.length === 0) return alert("Your bag is empty.");
    document.getElementById('checkout-modal').style.display = 'flex';
};

window.closeCheckout = function() {
    document.getElementById('checkout-modal').style.display = 'none';
};

window.handlePhoneInput = function(el) {
    el.value = el.value.replace(/\D/g, '');
    if(el.value.length > 10) el.value = el.value.slice(0, 10);
};

window.submitOrder = async function(e) {
    e.preventDefault();
    if(!sb) return alert("Still connecting to server. Please wait 2 seconds and click again.");

    const btn = document.getElementById('checkout-btn');
    const originalText = btn.innerText;
    
    const phoneInput = document.getElementById('cust-phone-number');
    if(phoneInput.value.length !== 10) return showRoyalToast("Error", "Valid 10-digit phone required.", true);

    const countryCode = document.getElementById('country-code-select').value.replace('+','');
    const orderInfo = {
        name: document.getElementById('cust-name').value,
        email: document.getElementById('cust-email').value,
        phone: countryCode + phoneInput.value, 
        address: `${document.getElementById('cust-address').value} ${document.getElementById('cust-near-address').value || ''}`,
        postcode: document.getElementById('cust-postcode').value,
        payment_method: document.getElementById('payment-method').value
    };

    btn.disabled = true; btn.innerText = "Securing Order...";

    try {
        const { data: createData, error: createError } = await sb.functions.invoke('checkout', {
            body: { action: 'create_order', cartItems: cart, customerInfo: orderInfo }
        });

        if (createError || !createData) throw new Error(createError?.message || "Server connection failed");
        
        if (orderInfo.payment_method === 'COD') {
            cart = []; saveCart(); window.closeCheckout();
            window.location.href = `thankyou.html?orderId=${createData.orderId}&totalAmount=${createData.total}`;
            return;
        }

        const options = {
            "key": createData.key,
            "amount": createData.amount,
            "currency": "INR",
            "name": "Royal Collections",
            "description": "Secure Payment",
            "order_id": createData.rzpOrderId, 
            "handler": async function (response) {
                btn.innerText = "Verifying...";
                const { data: verifyData, error: verifyError } = await sb.functions.invoke('checkout', {
                    body: { 
                        action: 'verify_payment', 
                        paymentData: {
                            rzpOrderId: response.razorpay_order_id,
                            rzpPaymentId: response.razorpay_payment_id,
                            rzpSignature: response.razorpay_signature,
                            dbOrderId: createData.dbOrderId
                        },
                        cartItems: cart 
                    }
                });
                
                if (verifyError || !verifyData.success) {
                    alert("Payment Verification Failed. Please contact support.");
                } else {
                    cart = []; saveCart(); window.closeCheckout();
                    window.location.href = `thankyou.html?orderId=${createData.dbOrderId}&totalAmount=${createData.amount/100}`;
                }
            },
            "prefill": { "name": orderInfo.name, "email": orderInfo.email, "contact": orderInfo.phone },
            "theme": { "color": "#121212" },
            "modal": { ondismiss: () => { btn.disabled = false; btn.innerText = originalText; } }
        };
        
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response){ alert(response.error.description); btn.disabled = false; btn.innerText = originalText; });
        rzp.open();

    } catch (err) {
        console.error(err);
        alert("Order Error: " + err.message);
        btn.disabled = false; btn.innerText = originalText;
    }
};

async function initHomePage() {
    if(!sb) return;
    const container = document.getElementById('home-products-grid');
    if (!container) return;
    try {
        const { data: products } = await sb.from('products').select('*').order('id', {ascending: false}).limit(8);
        if (products && products.length > 0) renderProducts(products, container);
    } catch(e) { console.error(e); }
}

async function initListingPage() {
    if(!sb) return;
    const container = document.querySelector('.product-grid');
    if (!container) return;
    let category = null;
    const p = window.location.pathname;
    if (p.includes('ladies')) category='ladies';
    else if (p.includes('kids')) category='kids';
    else if (p.includes('shoes')) category='shoes';
    else if (p.includes('cosmetics')) category='cosmetics';
    else if (p.includes('innerwears')) category='innerwears';
    
    if (category) {
        try {
            const { data: products } = await sb.from('products').select('*').eq('category', category).order('id', {ascending: false}); 
            if (products && products.length > 0) renderProducts(products, container);
            else container.innerHTML = '<p style="grid-column:1/-1;text-align:center;">No items found.</p>';
        } catch(e) { console.error(e); }
    }
}

function renderProducts(products, container) {
    if(!Array.isArray(products)) return;
    container.innerHTML = products.map(p => `<div class="product-card"><div class="product-image-wrapper"><a href="product.html?id=${p.id}"><img src="${p.image_url}" alt="${escapeHtml(p.name)}"></a></div><div class="product-details"><h4 class="product-title"><a href="product.html?id=${p.id}">${escapeHtml(p.name)}</a></h4><div class="product-price">From ₹${p.price}</div></div></div>`).join('');
}

async function initProductDetail() {
    if(!sb) return;
    const id = new URLSearchParams(window.location.search).get('id');
    if(!id) return;
    
    try {
        const { data: p } = await sb.from('products').select('*').eq('id', id).single();
        if(!p) return;
        
        document.getElementById('detail-title').innerText = p.name;
        document.getElementById('detail-desc').innerText = p.description;
        document.getElementById('breadcrumb-name').innerText = p.name;
        document.getElementById('detail-cat-tag').innerText = p.category;
        
        let variants = Array.isArray(p.variants) ? p.variants : [{ name: "Standard", images: [p.image_url], sizes: p.variants?.options || [{size:"Standard", price: p.price, stock: p.stock_quantity}] }];
        
        const container = document.getElementById('variant-buttons-container');
        const group = document.getElementById('variant-selector-group');
        
        if(variants.length > 0) { 
            group.style.display='block'; 
            container.innerHTML=''; 
            variants.forEach((v,i)=>{ 
                const b=document.createElement('button'); 
                b.className='variant-btn btn btn-sm btn-outline-dark'; 
                b.innerText=v.name; 
                b.onclick=()=>selectVariant(i); 
                container.appendChild(b); 
            }); 
            selectVariant(0); 
        }
        
        function selectVariant(idx) {
            document.querySelectorAll('.variant-btn').forEach((b,i)=>b.classList.toggle('active', i===idx));
            const v = variants[idx];
            document.getElementById('detail-img').src = v.images[0];
            
            const thumbs = document.getElementById('gallery-thumbs'); 
            thumbs.innerHTML='';
            v.images.forEach(u=>{ 
                const i=document.createElement('img'); 
                i.src=u; 
                i.className='thumb-item'; 
                i.onclick=()=>document.getElementById('detail-img').src=u; 
                thumbs.appendChild(i); 
            });
            
            const sel = document.getElementById('detail-size'); 
            sel.innerHTML='<option value="">Select Size</option>'; 
            sel.disabled=false;
            
            const btn = document.getElementById('add-to-cart-btn'); 
            btn.disabled=true; 
            btn.innerText="Select Size";
            
            if(document.getElementById('detail-price')) document.getElementById('detail-price').innerText = ""; 
            if(document.getElementById('stock-indicator')) document.getElementById('stock-indicator').innerText = "";
            
            if(v.sizes && v.sizes.length>0) {
                v.sizes.forEach(s=> { 
                    const o=document.createElement('option'); 
                    o.value=s.size; 
                    o.innerText=s.size; 
                    o.dataset.p=s.price; 
                    o.dataset.s=s.stock; 
                    sel.appendChild(o); 
                });
            } else { 
                sel.innerHTML='<option>Unavailable</option>'; 
                sel.disabled=true; 
            }
            
            sel.onchange = () => {
                const o = sel.options[sel.selectedIndex];
                if(!o.value) return;
                document.getElementById('detail-price').innerText = `₹${o.dataset.p}`;
                const s = parseInt(o.dataset.s);
                const stockEl = document.getElementById('stock-indicator');
                if(s>0) { 
                    stockEl.innerText=`In Stock (${s})`; 
                    stockEl.className='stock-status in'; 
                    btn.disabled=false; 
                    btn.innerText="Add to Bag"; 
                    btn.onclick=()=>addToCart(p.id, p.name, o.dataset.p, v.images[0], s, parseInt(document.getElementById('detail-qty').value), o.value, v.name); 
                } else { 
                    stockEl.innerText="Out of Stock"; 
                    stockEl.className='stock-status out'; 
                    btn.disabled=true; 
                    btn.innerText="Sold Out"; 
                }
            }
        }
    } catch(e) { console.error("Detail Error", e); }
}

async function initAdmin() {
    if(!sb) return;
    try {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
            const loginScreen = document.getElementById('admin-login-screen');
            if(loginScreen) loginScreen.style.display = 'none';
            document.getElementById('admin-dashboard-content').style.display = 'block';
            document.getElementById('admin-logout-btn').style.display = 'inline-block';
            loadAdminOrders();
            loadAdminProducts();
        } else {
            const loginScreen = document.getElementById('admin-login-screen');
            if(loginScreen) loginScreen.style.display = 'flex';
            document.getElementById('admin-dashboard-content').style.display = 'none';
        }
        
        sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') location.reload(); });
        
        document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;
            const btn = document.getElementById('admin-login-btn');
            btn.disabled=true; btn.innerText="Signing in...";
            const { error } = await sb.auth.signInWithPassword({ email, password });
            if (error) {
                document.getElementById('login-error-message').innerText = "Invalid Credentials";
                btn.disabled=false; btn.innerText="Sign In";
            }
        });
        
        document.getElementById('product-form')?.addEventListener('submit', handleProductSave);
    } catch(e) { console.error("Admin Init Error:", e); }
}

async function handleProductSave(e) {
    e.preventDefault();
    const btn = document.getElementById('save-product-btn');
    btn.disabled = true; btn.innerText = "Processing...";
    try {
        const variantBlocks = document.querySelectorAll('.variant-block');
        if(variantBlocks.length === 0) throw new Error("At least one variant is required.");
        
        let variantsData = [];
        let totalStock = 0;
        let prices = [];
        let mainImage = "";
        
        for (let block of variantBlocks) {
            const varName = block.querySelector('.variant-name-input').value;
            const fileInput = block.querySelector('.variant-image-input');
            const existingJson = block.querySelector('.existing-images-json').value;
            
            let imageUrls = existingJson ? JSON.parse(existingJson) : [];
            
            if (fileInput.files.length > 0) {
                for(let file of fileInput.files) {
                    let uploadFile = file;
                    try { if (typeof imageCompression !== 'undefined') uploadFile = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: false }); } catch (err) {}
                    
                    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
                    await sb.storage.from('products').upload(fileName, uploadFile);
                    const { data } = sb.storage.from('products').getPublicUrl(fileName);
                    imageUrls.push(data.publicUrl);
                }
            }
            
            if(imageUrls.length === 0 && !existingJson) throw new Error(`Variant "${varName}" needs at least one image.`);
            if(!mainImage && imageUrls.length > 0) mainImage = imageUrls[0];
            
            const sizeRows = block.querySelectorAll('tbody tr');
            let sizesData = [];
            sizeRows.forEach(row => {
                const s = row.querySelector('.var-size').value;
                const p = row.querySelector('.var-price').value;
                const st = row.querySelector('.var-stock').value;
                if(s && p && st) {
                    sizesData.push({ size: s, price: Number(p), stock: Number(st) });
                    totalStock += Number(st);
                    prices.push(Number(p));
                }
            });
            variantsData.push({ name: varName, images: imageUrls, sizes: sizesData });
        }
        
        const payload = {
            name: document.getElementById('prod-name').value,
            category: document.getElementById('prod-category').value,
            description: document.getElementById('prod-desc').value,
            image_url: mainImage, 
            price: Math.min(...prices),
            stock_quantity: totalStock,
            variants: variantsData
        };
        
        const id = document.getElementById('prod-id').value;
        if (id) await sb.from('products').update(payload).eq('id', id);
        else await sb.from('products').insert([payload]);
        
        showRoyalToast("Success", "Product Saved!");
        switchAdminTab('products-list-section');
        loadAdminProducts();
    } catch (err) { alert(err.message); } 
    finally { btn.disabled = false; btn.innerText = "Save Product"; }
}

async function loadAdminOrders() {
    if(!sb) return;
    const grid = document.getElementById('admin-orders-grid');
    if(!grid) return;
    grid.innerHTML = '<div class="empty-state">Loading...</div>';
    const { data: orders, error } = await sb.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) { grid.innerHTML = `<div class="empty-state">Error: ${error.message}</div>`; return; }
    if(!orders || orders.length === 0) { grid.innerHTML = '<div class="empty-state">No orders found.</div>'; currentAdminOrders = []; return; }
    currentAdminOrders = orders;
    renderOrderItems(orders);
}

async function renderOrderItems(orders) {
    const ids = orders.map(o => o.id);
    const { data: items } = await sb.from('order_items').select('*').in('order_id', ids);
    const html = orders.map(o => {
        const orderItems = items.filter(i => i.order_id === o.id).map(i => `<div class="order-item-row"><span>${escapeHtml(i.product_name)} x ${i.quantity}</span><span>₹${i.subtotal}</span></div>`).join('');
        return `<div class="order-card"><div class="order-header"><strong>#${o.id}</strong> <span>${new Date(o.created_at).toLocaleString()}</span></div><div class="order-body"><div class="order-info"><p><i class="fas fa-user"></i> <strong>${escapeHtml(o.customer_name)}</strong></p><p><i class="fas fa-phone"></i> ${escapeHtml(o.customer_phone || '-')}</p><p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(o.address)}</p><small>${escapeHtml(o.post_code || '-')}</small><p><small>Method: ${escapeHtml(o.payment_method)}</small></p></div><div class="order-items-list">${orderItems}<div style="text-align:right; font-weight:bold; margin-top:10px; font-size:1.1rem;">₹${o.total_amount}</div><div style="text-align:right; margin-top:5px;"><span class="status-badge ${o.status==='Pending'?'status-pending':'status-paid'}">${escapeHtml(o.status)}</span></div></div></div></div>`;
    }).join('');
    document.getElementById('admin-orders-grid').innerHTML = html;
}

window.filterOrdersLocal = function() {
    let term = document.getElementById('order-search-input').value.toLowerCase().trim();
    const grid = document.getElementById('admin-orders-grid');
    if(!term) { if(currentAdminOrders.length > 0) renderOrderItems(currentAdminOrders); return; }
    let idTerm = term.startsWith('#') ? term.substring(1) : term;
    let filtered = currentAdminOrders.filter(o => String(o.id).includes(idTerm) || (o.customer_name && o.customer_name.toLowerCase().includes(term)) || (o.customer_phone && String(o.customer_phone).includes(term)));
    filtered.sort((a, b) => a.id - b.id);
    if(filtered.length === 0) grid.innerHTML = '<div class="empty-state">No matches found.</div>';
    else renderOrderItems(filtered);
};

window.handleAdminLogout = async function() { if(confirm("Logout?")) await sb.auth.signOut(); };

window.switchAdminTab = function(targetId) {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    document.getElementById(targetId).style.display = 'block';
    if(targetId === 'orders-section') document.querySelectorAll('.nav-tab')[0].classList.add('active');
    if(targetId === 'products-list-section') document.querySelectorAll('.nav-tab')[1].classList.add('active');
    if(targetId === 'product-add-section') document.querySelectorAll('.nav-tab')[2].classList.add('active');
    window.scrollTo(0,0);
};

window.addVariantBlock = function(data = null) {
    const container = document.getElementById('variants-container');
    const template = document.getElementById('variant-block-template');
    const clone = template.content.cloneNode(true);
    if(data) {
        clone.querySelector('.variant-name-input').value = data.name;
        clone.querySelector('.existing-images-json').value = JSON.stringify(data.images);
        const preview = clone.querySelector('.variant-img-preview');
        data.images.forEach(url => preview.innerHTML += `<img src="${url}">`);
        const tbody = clone.querySelector('tbody');
        data.sizes.forEach(s => addSizeRow(tbody, s.size, s.price, s.stock));
    } else { addSizeRow(clone.querySelector('tbody')); }
    container.appendChild(clone);
};

window.addSizeRow = function(tbody, s='', p='', st='') {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input type="text" class="var-size" value="${s}" placeholder="Size"></td><td><input type="number" class="var-price" value="${p}" placeholder="₹"></td><td><input type="number" class="var-stock" value="${st}" placeholder="Qty"></td><td><button type="button" class="btn-icon delete" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button></td>`;
    tbody.appendChild(tr);
};

window.applyPresetToRow = function(selectEl) {
    const tbody = selectEl.closest('.size-manager').querySelector('tbody');
    const preset = selectEl.value;
    if(!preset) return;
    tbody.innerHTML = '';
    let sizes = [];
    switch(preset) {
        case 'ladies_standard': sizes = ['S','M','L','XL','XXL','3XL','4XL','5XL']; break;
        case 'jeans': for(let i=28; i<=40; i+=2) sizes.push(i.toString()); break;
        case 'kids': [0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36].forEach(s => sizes.push(s.toString())); break;
        case 'footwear': for(let i=5; i<=9; i++) sizes.push(i.toString()); break;
        case 'bra': for(let i=30; i<=42; i+=2) sizes.push(i.toString()); break;
        case 'inner_other': [50,55,60,65,70,75,80,85,90,95,100,105,110].forEach(s => sizes.push(s.toString())); break;
    }
    sizes.forEach(s => addSizeRow(tbody, s));
    selectEl.value = "";
};

window.resetProductForm = function() { 
    document.getElementById('product-form').reset(); 
    document.getElementById('prod-id').value = ''; 
    document.getElementById('variants-container').innerHTML = ''; 
    addVariantBlock(); 
};

window.editProduct = async function(id) {
    const { data: p } = await sb.from('products').select('*').eq('id', id).single();
    if(!p) return;
    resetProductForm();
    document.getElementById('form-heading').innerText = "Edit Product";
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-category').value = p.category;
    document.getElementById('prod-desc').value = p.description;
    document.getElementById('variants-container').innerHTML = '';
    if(Array.isArray(p.variants)) p.variants.forEach(v => addVariantBlock(v));
    else {
        let sizes = [];
        if(p.variants && p.variants.options) sizes = p.variants.options;
        else if(p.variants) for(let k in p.variants) { if(k!=='gallery') sizes.push({size:k, ...p.variants[k]}) };
        addVariantBlock({ name: "Default", images: [p.image_url], sizes: sizes });
    }
    switchAdminTab('product-add-section');
};

window.deleteProduct = async function(id) { 
    if(confirm("Delete product?")) { 
        await sb.from('products').delete().eq('id', id); 
        loadAdminProducts(); 
    } 
};

window.loadAdminProducts = loadAdminProducts;