// --- CONFIGURATION ---
const SUPABASE_URL = 'https://zxpttznsgulnhxmdijot.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cHR0em5zZ3Vsbmh4bWRpam90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjQ2MTgsImV4cCI6MjA4MDQ0MDYxOH0.8yB-oDUer9_fwptcf_wzC8xeW7v9LR6ZIQX_xKDJCwg';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- GLOBAL STATE ---
let cart = JSON.parse(localStorage.getItem('royal_cart')) || [];

document.addEventListener('DOMContentLoaded', async () => {
    updateCartCount();
    
    const path = window.location.pathname;
    
    if (path.includes('admin.html')) {
        initAdmin();
    } else if (path.includes('product.html')) {
        initProductDetail();
    } else if (path.includes('cart.html')) {
        initCartPage();
    } else if (path.includes('index.html') || path === '/') {
        initHomePage();
    } else {
        // Category pages
        initListingPage();
    }

    // Mobile Menu
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.main-navigation');
    if(mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            nav.style.display = nav.style.display === 'block' ? 'none' : 'block';
        });
    }
});

// =======================
// 1. HOME PAGE LOGIC
// =======================
async function initHomePage() {
    const container = document.getElementById('product-container');
    const tabButtons = document.querySelectorAll('.tab-btn');

    // Load initial category (Ladies)
    loadCategoryToContainer('ladies', container);

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.getAttribute('data-target');
            loadCategoryToContainer(target, container);
        });
    });
}

async function loadCategoryToContainer(category, container) {
    container.innerHTML = '<p class="text-center" style="width:100%">Loading...</p>';
    const { data: products, error } = await sb
        .from('products')
        .select('*')
        .eq('category', category)
        .limit(4); // Only show 4 items on home page

    if (error || !products) {
        container.innerHTML = '<p>Error loading products.</p>';
        return;
    }
    renderProducts(products, container);
}

// =======================
// 2. CATEGORY LISTING PAGES
// =======================
async function initListingPage() {
    const container = document.querySelector('.product-grid');
    if (!container) return;

    let category = null;
    if (window.location.pathname.includes('ladies')) category = 'ladies';
    else if (window.location.pathname.includes('kids')) category = 'kids';
    else if (window.location.pathname.includes('shoes')) category = 'shoes';
    else if (window.location.pathname.includes('cosmetics')) category = 'cosmetics';
    else if (window.location.pathname.includes('accessories')) category = 'accessories';

    if (category) {
        const { data: products } = await sb.from('products').select('*').eq('category', category);
        renderProducts(products || [], container);
    }
}

// =======================
// 3. RENDER FUNCTION (Shared)
// =======================
function renderProducts(products, container) {
    container.innerHTML = '';
    products.forEach(p => {
        const isOutOfStock = p.stock_quantity <= 0;
        const btnDisabled = isOutOfStock ? 'disabled style="background:#ccc; cursor:not-allowed"' : '';
        const badge = isOutOfStock ? '<div style="position:absolute;top:10px;right:10px;background:red;color:white;padding:5px;font-size:0.7rem">OUT OF STOCK</div>' : '';
        
        // Pass the current stock to the add function to validate logic later
        const cartAction = isOutOfStock ? '' : `onclick="addToCart(${p.id}, '${p.name}', ${p.price}, '${p.image_url}', ${p.stock_quantity})"`;

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image">
                ${badge}
                <a href="product.html?id=${p.id}"><img src="${p.image_url}" alt="${p.name}"></a>
                <div class="hover-actions">
                    <button class="action-btn" ${btnDisabled} ${cartAction}>
                        <i class="fas fa-shopping-bag"></i>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <div class="category-tag">${p.category}</div>
                <h4 class="product-title"><a href="product.html?id=${p.id}">${p.name}</a></h4>
                <div class="product-price">₹${p.price}</div>
                <div style="font-size:0.8rem; color:${p.stock_quantity < 5 ? 'red' : 'green'}">
                    ${isOutOfStock ? 'Sold Out' : `Stock: ${p.stock_quantity}`}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// =======================
// 4. PRODUCT DETAIL
// =======================
async function initProductDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if(!id) return;

    const { data: product } = await sb.from('products').select('*').eq('id', id).single();
    
    if(product) {
        document.getElementById('detail-img').src = product.image_url;
        document.getElementById('detail-title').innerText = product.name;
        document.getElementById('detail-price').innerText = `₹${product.price}`;
        document.getElementById('detail-desc').innerText = product.description || 'No description available.';
        
        const btn = document.getElementById('add-to-cart-btn');
        const stockDisplay = document.createElement('p');
        
        if (product.stock_quantity > 0) {
            stockDisplay.innerText = `In Stock: ${product.stock_quantity}`;
            stockDisplay.style.color = 'green';
            btn.onclick = () => addToCart(product.id, product.name, product.price, product.image_url, product.stock_quantity);
        } else {
            stockDisplay.innerText = "Out of Stock";
            stockDisplay.style.color = 'red';
            btn.innerText = "Sold Out";
            btn.disabled = true;
            btn.style.background = "#ccc";
            btn.style.border = "none";
        }
        
        document.querySelector('.detail-info').insertBefore(stockDisplay, btn);
    }
}

// =======================
// 5. CART LOGIC (With Stock Check)
// =======================
function addToCart(id, name, price, img, maxStock) {
    const existing = cart.find(item => item.id === id);
    
    if (existing) {
        if (existing.qty + 1 > maxStock) {
            alert(`Sorry, only ${maxStock} units available in stock.`);
            return;
        }
        existing.qty++;
    } else {
        // If adding new item, check if at least 1 exists (redundant but safe)
        if (maxStock < 1) {
            alert("Out of stock!");
            return;
        }
        cart.push({ id, name, price, img, qty: 1, maxStock }); 
    }
    
    saveCart();
    showToast(`Added ${name} to cart`);
}

function saveCart() {
    localStorage.setItem('royal_cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const count = cart.reduce((acc, item) => acc + item.qty, 0);
    document.querySelectorAll('.cart-count').forEach(el => el.innerText = count);
}

function showToast(message) {
    let toast = document.querySelector('.cart-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'cart-toast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `
        <div class="cart-toast-header">
            <span><i class="fas fa-check-circle"></i> Success</span>
            <span style="cursor:pointer" onclick="document.querySelector('.cart-toast').classList.remove('show')">&times;</span>
        </div>
        <div style="margin:10px 0">${message}</div>
        <a href="cart.html" class="btn btn-primary" style="width:100%; text-align:center; padding: 8px;">View Cart</a>
    `;
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// =======================
// 6. CART PAGE
// =======================
function initCartPage() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-total');
    
    if (cart.length === 0) {
        container.innerHTML = '<tr><td colspan="6" class="text-center">Your cart is empty.</td></tr>';
        totalEl.innerText = '₹0';
        return;
    }

    let total = 0;
    container.innerHTML = cart.map((item, index) => {
        total += item.price * item.qty;
        return `
            <tr>
                <td><img src="${item.img}" class="cart-item-img"></td>
                <td>${item.name}</td>
                <td>₹${item.price}</td>
                <td>
                    <button class="qty-btn" onclick="updateQty(${index}, -1)">-</button>
                    <span style="margin:0 10px">${item.qty}</span>
                    <button class="qty-btn" onclick="updateQty(${index}, 1)">+</button>
                    <br><small style="color:grey">Max: ${item.maxStock}</small>
                </td>
                <td>₹${item.price * item.qty}</td>
                <td><button onclick="removeFromCart(${index})" style="color:red;border:none;background:none;cursor:pointer"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
    }).join('');
    
    totalEl.innerText = `₹${total}`;
    
    const displayTotal = document.getElementById('display-total-amount');
    if(displayTotal) displayTotal.innerText = `Total: ₹${total}`;
}

function updateQty(index, change) {
    const item = cart[index];
    const newQty = item.qty + change;
    
    if (newQty > item.maxStock) {
        alert(`Cannot add more. Only ${item.maxStock} in stock.`);
        return;
    }
    
    if (newQty > 0) {
        item.qty = newQty;
    }
    saveCart();
    initCartPage();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    initCartPage();
}

// =======================
// 7. CHECKOUT & ORDER PROCESSING
// =======================
window.openCheckout = () => {
    if(cart.length === 0) return alert("Cart is empty");
    document.getElementById('checkout-modal').classList.add('open');
}

window.closeCheckout = () => {
    document.getElementById('checkout-modal').classList.remove('open');
}

window.submitOrder = async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('cust-name').value;
    const email = document.getElementById('cust-email').value;
    const address = document.getElementById('cust-address').value;
    const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const payment = document.getElementById('payment-method').value;

    const submitBtn = document.querySelector('#checkout-form button');
    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;

    // Use RPC function to securely process order and deduct stock
    const { data, error } = await sb.rpc('process_order', {
        order_details: {
            customer_name: name,
            customer_email: email,
            address: address,
            total_amount: total,
            payment_method: payment
        },
        cart_items: cart
    });

    if (error) {
        alert("Order failed: " + error.message);
        submitBtn.innerText = "Place Order";
        submitBtn.disabled = false;
        return;
    }

    alert(`Order Placed Successfully! ID: #${data.order_id}`);
    cart = [];
    saveCart();
    closeCheckout();
    initCartPage();
    
    submitBtn.innerText = "Place Order";
    submitBtn.disabled = false;
}

// =======================
// 8. ADMIN DASHBOARD
// =======================
function initAdmin() {
    loadAdminProducts();
    loadAdminOrders();

    // Tab Switching
    const tabs = document.querySelectorAll('.admin-tab-btn');
    const sections = document.querySelectorAll('.admin-section');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
        });
    });

    // Product Form
    const form = document.getElementById('product-form');
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('prod-id').value;
            
            const payload = {
                name: document.getElementById('prod-name').value,
                price: document.getElementById('prod-price').value,
                category: document.getElementById('prod-category').value,
                stock_quantity: document.getElementById('prod-stock').value, // NEW
                image_url: document.getElementById('prod-image').value,
                description: document.getElementById('prod-desc').value
            };

            let error;
            if (id) error = (await sb.from('products').update(payload).eq('id', id)).error;
            else error = (await sb.from('products').insert([payload])).error;

            if (error) alert('Error: ' + error.message);
            else {
                form.reset();
                document.getElementById('prod-id').value = '';
                loadAdminProducts();
                alert('Product Saved');
            }
        });
    }
}

async function loadAdminProducts() {
    const { data: products } = await sb.from('products').select('*').order('id', { ascending: false });
    const tbody = document.getElementById('admin-products-body');
    if(tbody && products) {
        tbody.innerHTML = products.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>₹${p.price}</td>
                <td>Qty: ${p.stock_quantity}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editProduct(${p.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">Del</button>
                </td>
            </tr>
        `).join('');
    }
}

async function loadAdminOrders() {
    const { data: orders } = await sb.from('orders').select('*').order('created_at', { ascending: false });
    const tbody = document.getElementById('admin-orders-body');
    if(tbody && orders) {
        tbody.innerHTML = orders.map(o => `
            <tr>
                <td>#${o.id}</td>
                <td>${new Date(o.created_at).toLocaleDateString()}</td>
                <td>${o.customer_name}</td>
                <td>₹${o.total_amount}</td>
                <td>${o.status}</td>
                <td><button class="btn btn-sm btn-outline" style="color:black;border-color:#ccc" onclick="viewOrderItems(${o.id})">Items</button></td>
            </tr>
        `).join('');
    }
}

window.viewOrderItems = async (orderId) => {
    const { data: items } = await sb.from('order_items').select('*').eq('order_id', orderId);
    let msg = `Order #${orderId} Items:\n\n`;
    items.forEach(i => {
        msg += `- ${i.product_name} x ${i.quantity} = ₹${i.subtotal}\n`;
    });
    alert(msg);
}

window.deleteProduct = async (id) => {
    if(confirm('Delete?')) { await sb.from('products').delete().eq('id', id); loadAdminProducts(); }
}

window.editProduct = async (id) => {
    const { data: p } = await sb.from('products').select('*').eq('id', id).single();
    if(p) {
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-category').value = p.category;
        document.getElementById('prod-stock').value = p.stock_quantity; // Load stock
        document.getElementById('prod-image').value = p.image_url;
        document.getElementById('prod-desc').value = p.description || '';
        document.querySelector('.admin-tabs button[data-target="products-section"]').click();
        window.scrollTo(0,0);
    }
}