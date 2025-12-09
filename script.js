const SUPABASE_URL = 'https://zxpttznsgulnhxmdijot.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cHR0em5zZ3Vsbmh4bWRpam90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjQ2MTgsImV4cCI6MjA4MDQ0MDYxOH0.8yB-oDUer9_fwptcf_wzC8xeW7v9LR6ZIQX_xKDJCwg';

let sb = null;

if (typeof supabase !== 'undefined') {
    const { createClient } = supabase;
    sb = createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error('CRITICAL ERROR: Supabase SDK is missing.');
}

let cart = JSON.parse(localStorage.getItem('royal_cart')) || [];
let currentProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!sb) {
        document.body.innerHTML = '<div style="padding:50px;text-align:center;"><h1>System Error</h1><p>Database connection missing.</p></div>';
        return;
    }

    injectQuickViewModal();
    injectStockAlertModal(); 
    injectCustomAlertSystem();

    await validateCartStock(); 
    updateCartCount();
    
    const path = window.location.pathname;
    
    if (path.includes('admin.html')) {
        initAdmin();
    } else if (path.includes('product.html')) {
        initProductDetail();
    } else if (path.includes('cart.html')) {
        initCartPage();
    } else if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
        initHomePage();
    } else {
        initListingPage();
    }

    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.main-navigation');
    if(mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
        });
    }
});

function injectCustomAlertSystem() {
    const html = `
    <div id="royal-alert" class="modal-overlay">
        <div class="modal-content" style="text-align:center; max-width:400px;">
            <i id="royal-alert-icon" class="fas fa-exclamation-circle" style="font-size:3rem; margin-bottom:15px; display:block;"></i>
            <h3 id="royal-alert-title" style="margin-bottom:10px;">Notice</h3>
            <p id="royal-alert-msg" style="color:#666; margin-bottom:20px;"></p>
            <button class="btn btn-primary" onclick="closeRoyalAlert()">Okay</button>
        </div>
    </div>
    <div id="royal-confirm" class="modal-overlay">
        <div class="modal-content" style="text-align:center; max-width:400px;">
            <i class="fas fa-question-circle" style="font-size:3rem; color:var(--color-accent); margin-bottom:15px; display:block;"></i>
            <h3 style="margin-bottom:10px;">Are you sure?</h3>
            <p id="royal-confirm-msg" style="color:#666; margin-bottom:20px;"></p>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button id="btn-confirm-no" class="btn btn-outline-dark">Cancel</button>
                <button id="btn-confirm-yes" class="btn btn-primary">Yes, Proceed</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function showRoyalAlert(title, message, type = 'warning') {
    const overlay = document.getElementById('royal-alert');
    const icon = document.getElementById('royal-alert-icon');
    
    document.getElementById('royal-alert-title').innerText = title;
    document.getElementById('royal-alert-msg').innerText = message;
    
    icon.className = 'fas';
    if(type === 'error') { icon.classList.add('fa-times-circle'); icon.style.color = 'var(--color-error)'; }
    else if(type === 'success') { icon.classList.add('fa-check-circle'); icon.style.color = 'var(--color-success)'; }
    else { icon.classList.add('fa-exclamation-circle'); icon.style.color = '#f39c12'; }

    overlay.classList.add('open');
}

function closeRoyalAlert() {
    document.getElementById('royal-alert').classList.remove('open');
}

function showRoyalConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('royal-confirm');
        document.getElementById('royal-confirm-msg').innerText = message;
        overlay.classList.add('open');

        const btnYes = document.getElementById('btn-confirm-yes');
        const btnNo = document.getElementById('btn-confirm-no');

        const newBtnYes = btnYes.cloneNode(true);
        const newBtnNo = btnNo.cloneNode(true);
        btnYes.parentNode.replaceChild(newBtnYes, btnYes);
        btnNo.parentNode.replaceChild(newBtnNo, btnNo);

        newBtnYes.addEventListener('click', () => {
            overlay.classList.remove('open');
            resolve(true);
        });

        newBtnNo.addEventListener('click', () => {
            overlay.classList.remove('open');
            resolve(false);
        });
    });
}

function showRoyalToast(title, message, isError = false) {
    let toast = document.querySelector('.cart-toast');
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.className = `cart-toast ${isError ? 'error' : ''}`;
    toast.innerHTML = `
        <div class="toast-strip"></div>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            <div class="toast-msg">${message}</div>
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); 
    }, 3000);
}

function restrictInputToStock(inputElement, productId, totalStock) {
    const inCartQty = cart
        .filter(item => item.id === productId)
        .reduce((sum, item) => sum + item.qty, 0);

    const remainingAllowed = Math.max(0, totalStock - inCartQty);

    inputElement.max = remainingAllowed;
    inputElement.min = 1;
    inputElement.value = 1;

    if (remainingAllowed === 0) {
        inputElement.disabled = true;
        inputElement.value = 0;
    } else {
        inputElement.disabled = false;
    }

    inputElement.addEventListener('input', function() {
        let val = parseInt(this.value);
        if (isNaN(val)) return;

        if (val > remainingAllowed) {
            this.value = remainingAllowed;
            showRoyalToast('Limit Reached', `Only ${remainingAllowed} more available.`, true);
        } else if (val < 1) {
            this.value = 1;
        }
    });

    return remainingAllowed;
}

function injectQuickViewModal() {
    const modalHTML = `
    <div class="modal-overlay" id="quick-view-modal">
        <div class="modal-content" style="max-width:800px;">
            <span class="close-modal" onclick="closeQuickView()">&times;</span>
            <div class="qv-grid">
                <div class="qv-img-wrap">
                    <img id="qv-img" src="" alt="Product">
                </div>
                <div style="display:flex; flex-direction:column; justify-content:center;">
                    <h3 id="qv-title" style="font-family:var(--font-heading); font-size:1.8rem; line-height:1.2; margin-bottom:10px;"></h3>
                    <div id="qv-price" style="font-size:1.4rem; color:var(--color-accent); font-weight:600; margin-bottom:15px;"></div>
                    <p id="qv-stock" style="margin-bottom:20px; font-size:0.9rem; font-weight:600;"></p>
                    <div class="control-group">
                        <label class="control-label">Size</label>
                        <select id="qv-size" class="select-input">
                            <option value="S">Small</option>
                            <option value="M" selected>Medium</option>
                            <option value="L">Large</option>
                            <option value="XL">Extra Large</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Quantity</label>
                        <input type="number" id="qv-qty" class="qty-input" value="1" min="1">
                    </div>
                    <button id="qv-add-btn" class="btn btn-primary" style="width:100%">Add to Bag</button>
                    <a id="qv-link" href="#" style="display:block; text-align:center; margin-top:15px; font-size:0.8rem; text-decoration:underline; color:#666;">View Full Details</a>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function injectStockAlertModal() {
    const alertHTML = `
    <div class="modal-overlay" id="stock-alert-modal">
        <div class="modal-content" style="max-width:400px; text-align:center;">
            <span class="close-modal" onclick="document.getElementById('stock-alert-modal').classList.remove('open')">&times;</span>
            <h3 style="margin-bottom:15px; font-family:var(--font-heading);">Cart Update</h3>
            <p style="margin-bottom:15px;">Availability for some items in your cart has changed:</p>
            <ul id="stock-alert-list" style="text-align:left; background:#fff3cd; padding:15px; border-radius:4px; font-size:0.9rem; list-style:inside;"></ul>
            <button class="btn btn-primary" onclick="document.getElementById('stock-alert-modal').classList.remove('open')" style="margin-top:20px; width:100%;">Understood</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', alertHTML);
}

async function validateCartStock() {
    if (cart.length === 0) return;

    const ids = [...new Set(cart.map(item => item.id))];
    const { data: dbProducts } = await sb.from('products').select('id, stock_quantity, name').in('id', ids);

    if (!dbProducts) return;

    let changes = [];
    let cartUpdated = false;

    dbProducts.forEach(dbItem => {
        const cartItemsForProduct = cart.filter(c => c.id === dbItem.id);
        let totalReserved = cartItemsForProduct.reduce((sum, c) => sum + c.qty, 0);

        if (totalReserved > dbItem.stock_quantity) {
            let available = dbItem.stock_quantity;
            for (let i = cartItemsForProduct.length - 1; i >= 0; i--) {
                const item = cartItemsForProduct[i];
                if (available === 0) {
                    item.qty = 0; 
                } else if (item.qty > available) {
                    item.qty = available;
                    available = 0;
                } else {
                    available -= item.qty;
                }
                item.maxStock = dbItem.stock_quantity; 
            }
            changes.push(`Stock for "<strong>${dbItem.name}</strong>" decreased.`);
            cartUpdated = true;
        } else {
            cartItemsForProduct.forEach(item => {
                if(item.maxStock !== dbItem.stock_quantity) {
                    item.maxStock = dbItem.stock_quantity;
                    cartUpdated = true;
                }
            });
        }
    });

    cart.forEach(item => {
        if (!dbProducts.find(p => p.id === item.id)) {
            changes.push(`"<strong>${item.name}</strong>" is no longer available.`);
            item.qty = 0;
            cartUpdated = true;
        }
    });

    if (cartUpdated) {
        cart = cart.filter(item => item.qty > 0);
        saveCart();
        if (changes.length > 0) {
            const list = document.getElementById('stock-alert-list');
            list.innerHTML = changes.map(c => `<li>${c}</li>`).join('');
            document.getElementById('stock-alert-modal').classList.add('open');
        }
    }
}

async function initHomePage() { }

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
        const { data: products } = await sb.from('products')
            .select('*')
            .eq('category', category)
            .gt('stock_quantity', 0)
            .order('id', {ascending: false}); 

        if (products && products.length > 0) {
            renderProducts(products, container);
        } else {
            container.innerHTML = '<p style="grid-column:1/-1;text-align:center;">No products found in this category.</p>';
        }
    }
}

function renderProducts(products, container) {
    currentProducts = products;
    container.innerHTML = '';
    
    products.forEach(p => {
        const isOutOfStock = p.stock_quantity <= 0;
        const badge = isOutOfStock ? '<div class="product-badge" style="background:var(--color-error);color:#fff;">Sold Out</div>' : '';
        const action = isOutOfStock ? '' : `onclick="openQuickView(${p.id})"`;

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image-wrapper">
                ${badge}
                <a href="product.html?id=${p.id}"><img src="${p.image_url}" alt="${p.name}"></a>
                <div class="product-actions">
                    ${!isOutOfStock ? `<button class="action-btn" onclick="openQuickView(${p.id})"><i class="fas fa-eye"></i></button>` : ''}
                    <a href="product.html?id=${p.id}" class="action-btn"><i class="fas fa-link"></i></a>
                </div>
            </div>
            <div class="product-details">
                <h4 class="product-title"><a href="product.html?id=${p.id}">${p.name}</a></h4>
                <div class="product-price">₹${p.price}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

window.openQuickView = (id) => {
    const product = currentProducts.find(p => p.id === id);
    if (!product) return;

    document.getElementById('qv-img').src = product.image_url;
    document.getElementById('qv-title').innerText = product.name;
    document.getElementById('qv-price').innerText = `₹${product.price}`;
    document.getElementById('qv-link').href = `product.html?id=${product.id}`;
    
    const stockEl = document.getElementById('qv-stock');
    const addBtn = document.getElementById('qv-add-btn');
    const qtyInput = document.getElementById('qv-qty');
    
    if(product.stock_quantity > 0) {
        stockEl.innerText = `In Stock (${product.stock_quantity} available)`;
        stockEl.style.color = 'var(--color-success)';
        
        const remaining = restrictInputToStock(qtyInput, product.id, product.stock_quantity);

        if(remaining > 0) {
            addBtn.disabled = false;
            addBtn.innerText = "Add to Bag";
            addBtn.onclick = () => {
                const qty = parseInt(qtyInput.value);
                const size = document.getElementById('qv-size').value;
                addToCart(product.id, product.name, product.price, product.image_url, product.stock_quantity, qty, size);
                closeQuickView();
            };
        } else {
            addBtn.disabled = true;
            addBtn.innerText = "Max Limit in Cart";
            addBtn.onclick = null;
        }

    } else {
        stockEl.innerText = "Out of Stock";
        stockEl.style.color = 'var(--color-error)';
        addBtn.disabled = true;
        addBtn.innerText = "Sold Out";
    }

    document.getElementById('quick-view-modal').classList.add('open');
}

window.closeQuickView = () => {
    document.getElementById('quick-view-modal').classList.remove('open');
}

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
        document.getElementById('breadcrumb-category').innerText = product.category;
        document.getElementById('breadcrumb-name').innerText = product.name;
        document.getElementById('detail-cat-tag').innerText = product.category;
        
        const btn = document.getElementById('add-to-cart-btn');
        const stockEl = document.getElementById('stock-indicator');
        const qtyInput = document.getElementById('detail-qty');
        
        if (product.stock_quantity > 0) {
            stockEl.innerText = `In Stock (${product.stock_quantity} units)`;
            stockEl.className = 'stock-status in';
            
            const remaining = restrictInputToStock(qtyInput, product.id, product.stock_quantity);

            if (remaining > 0) {
                btn.disabled = false;
                btn.innerText = "Add to Bag";
                btn.onclick = () => {
                    const qty = parseInt(qtyInput.value);
                    const size = document.getElementById('detail-size').value;
                    addToCart(product.id, product.name, product.price, product.image_url, product.stock_quantity, qty, size);
                    
                    const newRemaining = restrictInputToStock(qtyInput, product.id, product.stock_quantity);
                    if (newRemaining <= 0) {
                        btn.disabled = true;
                        btn.innerText = "Limit Reached";
                    }
                };
            } else {
                btn.disabled = true;
                btn.innerText = "Limit Reached in Cart";
                qtyInput.disabled = true;
            }

        } else {
            stockEl.innerText = "Currently Out of Stock";
            stockEl.className = 'stock-status out';
            btn.innerText = "Sold Out";
            btn.disabled = true;
            qtyInput.disabled = true;
        }
    }
}

function addToCart(id, name, price, img, maxStock, qty = 1, size = 'M') {
    const cartItemId = `${id}-${size}`;
    
    const existingTotal = cart
        .filter(item => item.id === id)
        .reduce((sum, item) => sum + item.qty, 0);
        
    if ((existingTotal + qty) > maxStock) {
        showRoyalAlert('Stock Limitation', `Sorry, only ${maxStock} units available.`, 'error');
        return;
    }

    const existing = cart.find(item => item.cartItemId === cartItemId);
    
    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({ 
            cartItemId, 
            id, 
            name: `${name} (${size})`, 
            price, 
            img, 
            qty, 
            maxStock,
            size 
        }); 
    }
    
    saveCart();
    showRoyalToast('Added to Bag', `${name} (${size}) added.`, false);
}

function saveCart() {
    localStorage.setItem('royal_cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const count = cart.reduce((acc, item) => acc + item.qty, 0);
    document.querySelectorAll('.cart-count').forEach(el => el.innerText = count);
}

function initCartPage() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-total');
    const subTotalEl = document.getElementById('sub-total');
    
    if (cart.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:#999;">Your shopping bag is currently empty.</td></tr>';
        totalEl.innerText = '₹0';
        if(subTotalEl) subTotalEl.innerText = '₹0';
        return;
    }

    let total = 0;
    container.innerHTML = cart.map((item, index) => {
        total += item.price * item.qty;
        return `
            <tr>
                <td>
                    <div class="cart-item-flex">
                        <img src="${item.img}" class="cart-thumb">
                        <div class="cart-item-details">
                            <h4>${item.name}</h4>
                            <span>ID: ${item.cartItemId}</span>
                        </div>
                    </div>
                </td>
                <td>₹${item.price}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button class="btn btn-sm btn-outline-dark" onclick="updateQty(${index}, -1)">-</button>
                        <span>${item.qty}</span>
                        <button class="btn btn-sm btn-outline-dark" onclick="updateQty(${index}, 1)">+</button>
                    </div>
                </td>
                <td>₹${item.price * item.qty}</td>
                <td><button onclick="removeFromCart(${index})" style="color:#999;border:none;background:none;cursor:pointer"><i class="fas fa-times"></i></button></td>
            </tr>
        `;
    }).join('');
    
    totalEl.innerText = `₹${total}`;
    if(subTotalEl) subTotalEl.innerText = `₹${total}`;
}

function updateQty(index, change) {
    const item = cart[index];
    
    if (change > 0) {
        const productTotalQty = cart
            .filter(c => c.id === item.id)
            .reduce((sum, c) => sum + c.qty, 0);
            
        if (productTotalQty >= item.maxStock) {
            showRoyalToast('Limit Reached', `Maximum stock reached for this item.`, true);
            return;
        }
    }

    const newQty = item.qty + change;
    if (newQty > 0) {
        item.qty = newQty;
    }
    saveCart();
    initCartPage();
}

async function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    initCartPage();
    showRoyalToast("Removed", "Item removed from bag.");
}

window.openCheckout = () => {
    if(cart.length === 0) return showRoyalAlert('Cart Empty', "Please add items to your cart first.");
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

    if (!sb) return showRoyalAlert("System Error", "Database not connected", 'error');

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
        showRoyalAlert("Order Failed", error.message, 'error');
        submitBtn.innerText = "Complete Order";
        submitBtn.disabled = false;
        return;
    }

    closeCheckout();
    showRoyalAlert("Order Success", `Thank you! Your Order ID is #${data.order_id}`, 'success');
    
    cart = [];
    saveCart();
    initCartPage();
    
    submitBtn.innerText = "Complete Order";
    submitBtn.disabled = false;
}

function initAdmin() {
    loadAdminOrders();
    loadAdminProducts();

    const tabs = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.admin-section');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.style.display = 'none');
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).style.display = 'block';
        });
    });

    const form = document.getElementById('product-form');
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('prod-id').value;
            const saveBtn = document.getElementById('save-product-btn');
            
            saveBtn.disabled = true;
            saveBtn.innerText = "Saving...";

            try {
                let imageUrl = document.getElementById('prod-image-url').value;
                const fileInput = document.getElementById('prod-image-file');
                
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}.${fileExt}`;
                    
                    const { error: uploadError } = await sb.storage.from('products').upload(fileName, file);
                    if (uploadError) throw uploadError;
                    
                    const { data: { publicUrl } } = sb.storage.from('products').getPublicUrl(fileName);
                    imageUrl = publicUrl;
                }

                if (!imageUrl) throw new Error("Please provide an Image URL or upload a file.");

                const payload = {
                    name: document.getElementById('prod-name').value,
                    price: document.getElementById('prod-price').value,
                    category: document.getElementById('prod-category').value,
                    stock_quantity: document.getElementById('prod-stock').value,
                    image_url: imageUrl,
                    description: document.getElementById('prod-desc').value
                };

                let error;
                if (id) error = (await sb.from('products').update(payload).eq('id', id)).error;
                else error = (await sb.from('products').insert([payload])).error;

                if (error) throw error;

                form.reset();
                document.getElementById('prod-id').value = '';
                loadAdminProducts();
                showRoyalToast("Success", "Product Saved Successfully");
            } catch (err) {
                showRoyalAlert("Error", err.message, 'error');
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerText = "Save Product";
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
                <td style="display:flex; align-items:center; gap:10px;">
                    <img src="${p.image_url}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                    <div>${p.name}</div>
                </td>
                <td>₹${p.price}</td>
                <td>${p.stock_quantity}</td>
                <td>
                    <button class="btn btn-sm btn-outline-dark" onclick="editProduct(${p.id})">Edit</button>
                    <button class="btn btn-sm btn-outline-dark" style="color:red; border-color:red" onclick="deleteProduct(${p.id})">Del</button>
                </td>
            </tr>
        `).join('');
    }
}

async function loadAdminOrders() {
    const grid = document.getElementById('admin-orders-grid');
    if(!grid) return;

    grid.innerHTML = '<p class="text-center">Loading orders...</p>';

    const { data: orders } = await sb.from('orders').select('*').order('created_at', { ascending: false });
    
    if(!orders || orders.length === 0) {
        grid.innerHTML = '<p class="text-center">No orders found.</p>';
        return;
    }

    const { data: allItems } = await sb.from('order_items').select('*');

    grid.innerHTML = orders.map(o => {
        const items = allItems.filter(i => i.order_id === o.id);
        const statusClass = o.status === 'Pending' ? 'status-pending' : 'status-paid';
        
        const itemsHtml = items.map(i => `
            <div class="order-item-row">
                <span>${i.product_name} x ${i.quantity}</span>
                <span style="font-weight:600">₹${i.subtotal}</span>
            </div>
        `).join('');

        return `
        <div class="order-card">
            <div class="order-header">
                <span class="order-id">ORDER #${o.id}</span>
                <span class="order-date">${new Date(o.created_at).toLocaleString()}</span>
            </div>
            <div class="order-body">
                <div class="order-info">
                    <h5>Customer Details</h5>
                    <p><strong>${o.customer_name}</strong></p>
                    <p style="color:#666; font-size:0.9rem;">${o.customer_email}</p>
                    <h5 style="margin-top:15px;">Shipping Address</h5>
                    <p style="color:#666; font-size:0.9rem;">${o.address}</p>
                    <h5 style="margin-top:15px;">Payment</h5>
                    <p>${o.payment_method}</p>
                </div>
                <div class="order-items-list">
                    <h5 style="margin-bottom:15px;">Order Items</h5>
                    ${itemsHtml}
                    <div class="order-total-row">
                        <span>Total Amount:</span>
                        <span style="font-size:1.2rem; font-weight:700;">₹${o.total_amount}</span>
                    </div>
                     <div style="text-align:right; margin-top:10px;">
                        <span class="status-badge ${statusClass}">${o.status}</span>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

window.deleteProduct = async (id) => {
    const yes = await showRoyalConfirm('Permanently delete this product?');
    if(yes) { 
        await sb.from('products').delete().eq('id', id); 
        loadAdminProducts(); 
        showRoyalToast("Deleted", "Product removed.");
    }
}

window.editProduct = async (id) => {
    const { data: p } = await sb.from('products').select('*').eq('id', id).single();
    if(p) {
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-category').value = p.category;
        document.getElementById('prod-stock').value = p.stock_quantity;
        document.getElementById('prod-image-url').value = p.image_url;
        document.getElementById('prod-desc').value = p.description || '';
        document.querySelector('.tab-btn[data-target="products-section"]').click();
        window.scrollTo(0,0);
    }
}