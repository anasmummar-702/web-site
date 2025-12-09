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
        document.body.innerHTML = '<div style="padding:50px;text-align:center;color:red;"><h1>System Error</h1><p>Database connection missing.</p></div>';
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
            nav.style.display = nav.style.display === 'block' ? 'none' : 'block';
        });
    }
});

function injectCustomAlertSystem() {
    const html = `
    <div id="royal-alert" class="custom-alert-overlay">
        <div class="custom-alert-box">
            <i id="royal-alert-icon" class="fas fa-exclamation-circle alert-icon warning"></i>
            <h3 id="royal-alert-title" class="alert-title">Notice</h3>
            <p id="royal-alert-msg" class="alert-message"></p>
            <button class="btn btn-primary" onclick="closeRoyalAlert()">Okay</button>
        </div>
    </div>
    <div id="royal-confirm" class="custom-alert-overlay">
        <div class="custom-alert-box">
            <i class="fas fa-question-circle alert-icon warning" style="color:var(--primary-blue)"></i>
            <h3 class="alert-title">Are you sure?</h3>
            <p id="royal-confirm-msg" class="alert-message"></p>
            <div class="confirm-actions">
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
    
    icon.className = 'fas alert-icon';
    if(type === 'error') { icon.classList.add('fa-times-circle', 'error'); }
    else if(type === 'success') { icon.classList.add('fa-check-circle', 'success'); }
    else { icon.classList.add('fa-exclamation-circle', 'warning'); }

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
        <div class="toast-content">
            <div class="toast-header">
                <span class="toast-title">${title}</span>
                <span style="cursor:pointer" onclick="this.closest('.cart-toast').remove()">&times;</span>
            </div>
            <div class="toast-msg">${message}</div>
            ${!isError && !window.location.pathname.includes('cart.html') ? '<a href="cart.html" class="btn btn-sm btn-outline-dark" style="width:100%; text-align:center;">View Cart</a>' : ''}
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); 
    }, 4000);
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
            showRoyalToast('Limit Reached', `You already have ${inCartQty} in cart. Only ${remainingAllowed} more available.`, true);
        } else if (val < 1) {
            this.value = 1;
        }
    });

    return remainingAllowed;
}

function injectQuickViewModal() {
    const modalHTML = `
    <div class="modal-overlay" id="quick-view-modal">
        <div class="modal-content product-modal">
            <span class="close-modal" onclick="closeQuickView()">&times;</span>
            <div class="modal-grid">
                <div class="modal-image-col">
                    <img id="qv-img" src="" alt="Product">
                </div>
                <div class="modal-details-col">
                    <h3 id="qv-title" class="qv-title"></h3>
                    <div id="qv-price" class="qv-price"></div>
                    <p id="qv-stock" class="qv-stock"></p>
                    <div class="qv-options">
                        <label class="qv-label">Size</label>
                        <select id="qv-size" class="qv-select">
                            <option value="S">Small</option>
                            <option value="M" selected>Medium</option>
                            <option value="L">Large</option>
                            <option value="XL">Extra Large</option>
                        </select>
                        <label class="qv-label">Quantity</label>
                        <input type="number" id="qv-qty" class="qv-select" value="1" min="1">
                    </div>
                    <button id="qv-add-btn" class="btn btn-primary" style="width:100%">Add to Bag</button>
                    <a id="qv-link" href="#" style="display:block; text-align:center; margin-top:15px; font-size:0.8rem; text-decoration:underline;">View Full Details</a>
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
            <h3 style="color:var(--text-black); margin-bottom:15px; font-family:var(--font-heading);">Cart Update</h3>
            <p>Some items in your cart have been updated due to real-time availability changes:</p>
            <ul id="stock-alert-list" class="alert-list" style="text-align:left;"></ul>
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
            let removedCount = totalReserved - available;

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
            
            changes.push(`Stock for "<strong>${dbItem.name}</strong>" decreased. Your cart was adjusted.`);
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
            .gt('stock_quantity', 0); 

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
        const btnDisabled = isOutOfStock ? 'disabled style="background:#ccc; cursor:not-allowed"' : '';
        const badge = isOutOfStock ? '<div style="position:absolute;top:10px;right:10px;background:red;color:white;padding:5px;font-size:0.7rem">OUT OF STOCK</div>' : '';
        const action = isOutOfStock ? '' : `onclick="openQuickView(${p.id})"`;

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image">
                ${badge}
                <a href="product.html?id=${p.id}"><img src="${p.image_url}" alt="${p.name}"></a>
                <div class="hover-actions">
                    <button class="action-btn" ${btnDisabled} ${action}>
                        <i class="fas fa-shopping-bag"></i>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <div class="category-tag">${p.category}</div>
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
        stockEl.innerText = `In Stock: ${product.stock_quantity}`;
        stockEl.style.color = 'green';
        
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
            addBtn.innerText = "Limit Reached in Cart";
            addBtn.onclick = null;
        }

    } else {
        stockEl.innerText = "Out of Stock";
        stockEl.style.color = 'red';
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
            stockEl.innerText = `In Stock: ${product.stock_quantity}`;
            stockEl.style.color = 'green';
            
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
            stockEl.innerText = "Out of Stock";
            stockEl.style.color = 'red';
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
        showRoyalAlert('Stock Limitation', `Sorry, only ${maxStock} units available. You already have ${existingTotal} in your cart.`, 'error');
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
    showRoyalToast('Success', `Added ${qty} x ${name} (${size}) to bag`, false);
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
    
    if (cart.length === 0) {
        container.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:40px;">Your shopping bag is empty.</td></tr>';
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
    const confirmed = await showRoyalConfirm("Remove this item from your bag?");
    if(confirmed) {
        cart.splice(index, 1);
        saveCart();
        initCartPage();
        showRoyalToast("Removed", "Item removed from bag.");
    }
}

window.openCheckout = () => {
    if(cart.length === 0) return showRoyalAlert('Empty Cart', "Please add items to your cart first.");
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
        submitBtn.innerText = "Place Order";
        submitBtn.disabled = false;
        return;
    }

    closeCheckout();
    showRoyalAlert("Order Success", `Thank you! Your Order ID is #${data.order_id}`, 'success');
    
    cart = [];
    saveCart();
    initCartPage();
    
    submitBtn.innerText = "Place Order";
    submitBtn.disabled = false;
}

function initAdmin() {
    loadAdminProducts();
    loadAdminOrders();

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

window.deleteProduct = async (id) => {
    const yes = await showRoyalConfirm('Delete this product?');
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
        document.querySelector('.admin-tabs button[data-target="products-section"]').click();
        window.scrollTo(0,0);
    }
}

window.viewOrderItems = async (orderId) => {
    const { data: items } = await sb.from('order_items').select('*').eq('order_id', orderId);
    let msg = ``;
    items.forEach(i => {
        msg += `${i.product_name} x ${i.quantity} = ₹${i.subtotal}\n`;
    });
    showRoyalAlert(`Order #${orderId} Items`, msg, 'info');
}