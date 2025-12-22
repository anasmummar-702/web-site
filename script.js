const SUPABASE_URL = 'https://zxpttznsgulnhxmdijot.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cHR0em5zZ3Vsbmh4bWRpam90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjQ2MTgsImV4cCI6MjA4MDQ0MDYxOH0.8yB-oDUer9_fwptcf_wzC8xeW7v9LR6ZIQX_xKDJCwg';

let sb = null;
if (typeof supabase !== 'undefined') {
    const { createClient } = supabase;
    sb = createClient(SUPABASE_URL, SUPABASE_KEY);
} else { console.error('CRITICAL ERROR: Supabase SDK is missing.'); }

let cart = JSON.parse(localStorage.getItem('royal_cart')) || [];
let currentAdminOrders = [];

// --- UTILS ---
function showRoyalToast(title, message, isError = false) {
    let toast = document.querySelector('.cart-toast');
    if (toast) toast.remove();
    toast = document.createElement('div');
    toast.className = `cart-toast ${isError ? 'error' : ''}`;
    toast.innerHTML = `<div class="toast-strip"></div><div class="toast-body"><div class="toast-title">${title}</div><div class="toast-msg">${message}</div></div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
}
function showRoyalConfirm(message) { return confirm(message); }

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.main-navigation');
    if (mobileToggle && nav) {
        mobileToggle.addEventListener('click', (e) => { e.stopPropagation(); nav.classList.toggle('open'); });
        document.addEventListener('click', (e) => { 
            if (nav.classList.contains('open') && !nav.contains(e.target) && !mobileToggle.contains(e.target)) nav.classList.remove('open'); 
        });
    }

    if(document.querySelector('.cart-count')) updateCartCount();
    if (!sb) console.error("Database connection missing");
    
    const path = window.location.pathname;
    if (path.includes('admin')) initAdmin();
    else if (path.includes('product')) initProductDetail();
    else if (path.includes('cart')) initCartPage();
    else if (path.includes('index') || path === '/' || path.endsWith('/')) initHomePage();
    else initListingPage();
});

// --- ADMIN LOGIC ---
const ADMIN_PASSWORD = 'royal.soman';
const ADMIN_SESSION_KEY = 'royal_admin_logged_in'; 

function initAdmin() {
    if (localStorage.getItem(ADMIN_SESSION_KEY) === 'true') {
        document.getElementById('admin-login-screen').style.display = 'none';
        document.getElementById('admin-dashboard-content').style.display = 'block';
        document.getElementById('admin-logout-btn').style.display = 'inline-block';
        loadAdminOrders();
        loadAdminProducts();
    }
    
    document.getElementById('admin-login-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (document.getElementById('admin-password').value === ADMIN_PASSWORD) {
            localStorage.setItem(ADMIN_SESSION_KEY, 'true');
            location.reload();
        } else {
            document.getElementById('login-error-message').innerText = "Incorrect Password";
        }
    });

    document.getElementById('product-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-product-btn');
        btn.disabled = true; btn.innerText = "Saving...";

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
                         const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop()}`;
                         const { error } = await sb.storage.from('products').upload(fileName, file);
                         if (error) throw error;
                         const { data } = sb.storage.from('products').getPublicUrl(fileName);
                         imageUrls.push(data.publicUrl);
                    }
                }
                if(imageUrls.length === 0) throw new Error(`Variant "${varName}" needs at least one image.`);
                if(!mainImage) mainImage = imageUrls[0];

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
                if(sizesData.length === 0) throw new Error(`Variant "${varName}" needs sizes.`);
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
            let error;
            if (id) error = (await sb.from('products').update(payload).eq('id', id)).error;
            else error = (await sb.from('products').insert([payload])).error;
            if(error) throw error;
            
            showRoyalToast("Success", "Product Saved!");
            switchAdminTab('products-list-section');
            loadAdminProducts();
        } catch (err) { alert("Error: " + err.message); } 
        finally { btn.disabled = false; btn.innerText = "Save Product"; }
    });
}

// --- ORDER SEARCH FIX ---
window.filterOrdersLocal = () => {
    const term = document.getElementById('order-search-input').value.toLowerCase().trim();
    const grid = document.getElementById('admin-orders-grid');
    
    if(!term) {
        // Show all stored orders
        if(currentAdminOrders.length > 0) fetchAndRenderItems(currentAdminOrders);
        else grid.innerHTML = '<div class="empty-state">No orders.</div>';
        return;
    }
    
    const filtered = currentAdminOrders.filter(o => 
        String(o.id).includes(term) || 
        (o.customer_name && o.customer_name.toLowerCase().includes(term)) ||
        (o.customer_phone && String(o.customer_phone).includes(term)) ||
        (o.address && o.address.toLowerCase().includes(term))
    );
    
    if(filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state">No matches found.</div>';
    } else {
        fetchAndRenderItems(filtered);
    }
}

async function loadAdminOrders() {
    const grid = document.getElementById('admin-orders-grid');
    grid.innerHTML = '<div class="empty-state">Loading...</div>';

    // Fetch latest 200 orders to enable client-side search
    const { data: orders } = await sb.from('orders').select('*').order('created_at', { ascending: false }).limit(200);

    if(!orders || orders.length === 0) { 
        grid.innerHTML = '<div class="empty-state">No orders found.</div>'; 
        currentAdminOrders = [];
        return; 
    }
    
    currentAdminOrders = orders; // Store for local search
    fetchAndRenderItems(orders);
}

async function fetchAndRenderItems(ordersToRender) {
    // Optimization: Only fetch items for the orders we are about to show
    const ids = ordersToRender.map(o => o.id);
    const { data: items } = await sb.from('order_items').select('*').in('order_id', ids);
    
    const html = ordersToRender.map(o => {
        const orderItems = items.filter(i => i.order_id === o.id).map(i => 
            `<div class="order-item-row"><span>${i.product_name} x ${i.quantity}</span><span>₹${i.subtotal}</span></div>`
        ).join('');
        
        return `<div class="order-card">
            <div class="order-header"><strong>#${o.id}</strong> <span>${new Date(o.created_at).toLocaleDateString()}</span></div>
            <div class="order-body">
                <div class="order-info">
                    <p><i class="fas fa-user"></i> <strong>${o.customer_name}</strong></p>
                    <p><i class="fas fa-phone"></i> ${o.customer_phone || '-'}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${o.address}</p>
                    <small>Code: ${o.post_code || '-'}</small>
                </div>
                <div class="order-items-list">${orderItems}
                    <div style="text-align:right; font-weight:bold; margin-top:10px; font-size:1.1rem;">₹${o.total_amount}</div>
                    <div style="text-align:right; margin-top:5px;"><span class="status-badge ${o.status==='Pending'?'status-pending':'status-paid'}">${o.status}</span></div>
                </div>
            </div>
        </div>`;
    }).join('');
    
    document.getElementById('admin-orders-grid').innerHTML = html;
}

// --- ADMIN UI HELPERS ---
window.handleAdminLogout = () => { if(confirm("Logout?")) { localStorage.removeItem(ADMIN_SESSION_KEY); location.reload(); } }
window.switchAdminTab = (targetId) => {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    document.getElementById(targetId).style.display = 'block';
    
    if(targetId === 'orders-section') document.querySelectorAll('.nav-tab')[0].classList.add('active');
    if(targetId === 'products-list-section') document.querySelectorAll('.nav-tab')[1].classList.add('active');
    if(targetId === 'product-add-section') document.querySelectorAll('.nav-tab')[2].classList.add('active');
    window.scrollTo(0,0);
};
window.addVariantBlock = (data = null) => {
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
window.addSizeRow = (tbody, s='', p='', st='') => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input type="text" class="var-size" value="${s}" placeholder="Size"></td><td><input type="number" class="var-price" value="${p}" placeholder="₹"></td><td><input type="number" class="var-stock" value="${st}" placeholder="Qty"></td><td><button type="button" class="btn-icon delete" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button></td>`;
    tbody.appendChild(tr);
};
window.applyPresetToRow = (selectEl) => {
    const tbody = selectEl.closest('.size-manager').querySelector('tbody');
    const preset = selectEl.value;
    if(!preset || !confirm("Fill with preset?")) return;
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
window.resetProductForm = () => {
    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('form-heading').innerText = "Add New Product";
    document.getElementById('variants-container').innerHTML = '';
    addVariantBlock(); 
};
window.editProduct = async (id) => {
    const { data: p } = await sb.from('products').select('*').eq('id', id).single();
    if(!p) return;
    resetProductForm();
    document.getElementById('form-heading').innerText = "Edit Product";
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-category').value = p.category;
    document.getElementById('prod-desc').value = p.description;
    document.getElementById('variants-container').innerHTML = '';
    
    if(Array.isArray(p.variants)) {
        p.variants.forEach(v => addVariantBlock(v));
    } else {
        // Legacy conversion
        let sizes = [];
        if(p.variants && p.variants.options) sizes = p.variants.options;
        else if(p.variants) for(let k in p.variants) { if(k!=='gallery') sizes.push({size:k, ...p.variants[k]}) };
        if(sizes.length === 0) sizes.push({size:"Standard", price: p.price, stock: p.stock_quantity});
        addVariantBlock({ name: "Default", images: [p.image_url], sizes: sizes });
    }
    switchAdminTab('product-add-section');
};
window.deleteProduct = async (id) => { if(confirm("Delete product?")) { await sb.from('products').delete().eq('id', id); loadAdminProducts(); } }
async function loadAdminProducts() {
    const tbody = document.getElementById('admin-products-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
    const { data: products } = await sb.from('products').select('*').order('id', { ascending: false });
    if (!products || products.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="text-center">Inventory is empty.</td></tr>'; return; }
    tbody.innerHTML = products.map(p => `<tr><td data-label="Item"><div class="admin-product-item"><img src="${p.image_url}" class="admin-product-thumb"><strong>${p.name}</strong></div></td><td data-label="Category">${p.category}</td><td data-label="Stock">${p.stock_quantity} units</td><td data-label="Actions" style="text-align:right;"><button class="btn-icon" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button><button class="btn-icon" onclick="deleteProduct(${p.id})"><i class="fas fa-trash-alt"></i></button></td></tr>`).join('');
}

// --- STANDARD FUNCTIONS ---
function updateCartCount() { document.querySelectorAll('.cart-count').forEach(el => el.innerText = cart.reduce((acc, item) => acc + item.qty, 0)); }
function saveCart() { localStorage.setItem('royal_cart', JSON.stringify(cart)); updateCartCount(); }
function addToCart(id, name, price, img, maxStock, qty, size, variantName) {
    const cartItemId = `${id}-${variantName}-${size}`; 
    const existing = cart.find(item => item.cartItemId === cartItemId);
    if ((existing ? existing.qty : 0) + qty > maxStock) return showRoyalToast('Stock Limitation', `Only ${maxStock} units available.`, true);
    if (existing) existing.qty += qty;
    else cart.push({ cartItemId, id, name: `${name} (${variantName} - ${size})`, price: Number(price), img, qty, maxStock: Number(maxStock), size, variant: variantName });
    saveCart();
    showRoyalToast('Added to Bag', `${name} added.`, false);
}
async function initHomePage() {
    const container = document.getElementById('home-products-grid');
    if (!container) return;
    const { data: products } = await sb.from('products').select('*').order('id', {ascending: false}).limit(8);
    if (products && products.length > 0) renderProducts(products, container);
}
async function initListingPage() {
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
        const { data: products } = await sb.from('products').select('*').eq('category', category).order('id', {ascending: false}); 
        if (products && products.length > 0) renderProducts(products, container);
        else container.innerHTML = '<p style="grid-column:1/-1;text-align:center;">No items found.</p>';
    }
}
function renderProducts(products, container) {
    container.innerHTML = products.map(p => `<div class="product-card"><div class="product-image-wrapper"><a href="product.html?id=${p.id}"><img src="${p.image_url}" alt="${p.name}"></a></div><div class="product-details"><h4 class="product-title"><a href="product.html?id=${p.id}">${p.name}</a></h4><div class="product-price">From ₹${p.price}</div></div></div>`).join('');
}
async function initProductDetail() {
    const id = new URLSearchParams(window.location.search).get('id');
    const { data: p } = await sb.from('products').select('*').eq('id', id).single();
    if(!p) return;
    document.getElementById('detail-title').innerText = p.name;
    document.getElementById('detail-desc').innerText = p.description;
    document.getElementById('breadcrumb-name').innerText = p.name;
    document.getElementById('detail-cat-tag').innerText = p.category;
    
    let variants = Array.isArray(p.variants) ? p.variants : [{ name: "Standard", images: [p.image_url], sizes: p.variants?.options || [{size:"Standard", price: p.price, stock: p.stock_quantity}] }];
    
    const container = document.getElementById('variant-buttons-container');
    const group = document.getElementById('variant-selector-group');
    if(variants.length>0) { group.style.display='block'; container.innerHTML=''; variants.forEach((v,i)=>{ const b=document.createElement('button'); b.className='variant-btn btn btn-sm btn-outline-dark'; b.innerText=v.name; b.onclick=()=>selectVariant(i); container.appendChild(b); }); selectVariant(0); }
    
    function selectVariant(idx) {
        document.querySelectorAll('.variant-btn').forEach((b,i)=>b.classList.toggle('active', i===idx));
        const v = variants[idx];
        document.getElementById('detail-img').src = v.images[0];
        const thumbs = document.getElementById('gallery-thumbs'); thumbs.innerHTML='';
        v.images.forEach(u=>{ const i=document.createElement('img'); i.src=u; i.className='thumb-item'; i.onclick=()=>document.getElementById('detail-img').src=u; thumbs.appendChild(i); });
        
        const sel = document.getElementById('detail-size'); sel.innerHTML='<option value="">Select Size</option>'; sel.disabled=false;
        const btn = document.getElementById('add-to-cart-btn'); btn.disabled=true; btn.innerText="Select Size";
        document.getElementById('detail-price').innerText = ""; document.getElementById('stock-indicator').innerText = "";
        
        if(v.sizes && v.sizes.length>0) v.sizes.forEach(s=> { const o=document.createElement('option'); o.value=s.size; o.innerText=s.size; o.dataset.p=s.price; o.dataset.s=s.stock; sel.appendChild(o); });
        else { sel.innerHTML='<option>Unavailable</option>'; sel.disabled=true; }
        
        sel.onchange = () => {
            const o = sel.options[sel.selectedIndex];
            if(!o.value) return;
            document.getElementById('detail-price').innerText = `₹${o.dataset.p}`;
            const s = parseInt(o.dataset.s);
            const stockEl = document.getElementById('stock-indicator');
            if(s>0) { stockEl.innerText=`In Stock (${s})`; stockEl.className='stock-status in'; btn.disabled=false; btn.innerText="Add to Bag"; btn.onclick=()=>addToCart(p.id, p.name, o.dataset.p, v.images[0], s, parseInt(document.getElementById('detail-qty').value), o.value, v.name); }
            else { stockEl.innerText="Out of Stock"; stockEl.className='stock-status out'; btn.disabled=true; btn.innerText="Sold Out"; }
        }
    }
}