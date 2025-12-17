const SUPABASE_URL = 'https://zxpttznsgulnhxmdijot.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cHR0em5zZ3Vsbmh4bWRpam90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjQ2MTgsImV4cCI6MjA4MDQ0MDYxOH0.8yB-oDUer9_fwptcf_wzC8xeW7v9LR6ZIQX_xKDJCwg';

let sb = null;
let dbError = false; // New flag for database error

if (typeof supabase !== 'undefined') {
    const { createClient } = supabase;
    sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    // Simple check to see if we can talk to the DB (will be refined later)
    // For now, assume it's set up correctly based on previous setup
} else {
    console.error('CRITICAL ERROR: Supabase SDK is missing.');
    dbError = true;
}

// --- MOCK DATA FOR ERROR STATE (RESTORES PAGE CONTENT) ---
let MOCK_PRODUCTS = [
    { id: 20, name: "Luxury Silk Dress", category: "ladies", image_url: "https://via.placeholder.com/300x400?text=Mock+Dress", description: "Elegant silk dress.", price: 4999, stock_quantity: 50, variants: { S: { price: 4500, stock: 10 }, M: { price: 4999, stock: 20 }, L: { price: 5500, stock: 10 }, XL: { price: 5999, stock: 10 } } },
    { id: 21, name: "Kids' Royal Jumpsuit", category: "kids", image_url: "https://via.placeholder.com/300x400?text=Mock+Kids", description: "Cute kids jumpsuit.", price: 1999, stock_quantity: 15, variants: { S: { price: 1999, stock: 5 }, M: { price: 1999, stock: 5 }, L: { price: 1999, stock: 5 }, XL: { price: 1999, stock: 0 } } },
    { id: 22, name: "Premium Leather Shoes", category: "shoes", image_url: "https://via.placeholder.com/300x400?text=Mock+Shoes", description: "High-quality footwear.", price: 6999, stock_quantity: 0, variants: { S: { price: 6999, stock: 0 }, M: { price: 6999, stock: 0 }, L: { price: 6999, stock: 0 }, XL: { price: 6999, stock: 0 } } },
    { id: 23, name: "Diamond Stud Earrings", category: "cosmetics", image_url: "https://via.placeholder.com/300x400?text=Mock+Jewelry", description: "Sparkling earrings.", price: 2999, stock_quantity: 10, variants: { S: { price: 2999, stock: 10 }, M: { price: 2999, stock: 0 }, L: { price: 2999, stock: 0 }, XL: { price: 2999, stock: 0 } } }
];

const MOCK_ORDERS = [
    { id: 20, customer_name: "abcd", customer_email: "somanpazhunnana@yahoo.com", customer_phone: "917025323999", address: "abcd", post_code: "680001", total_amount: 5498, payment_method: "COD", status: "Pending", created_at: "2025-12-16T20:55:38.000Z" },
    { id: 19, customer_name: "Test Customer", customer_email: "test@user.com", customer_phone: "+911234567890", address: "456 Mock Ave", post_code: "680002", total_amount: 1999, payment_method: "Online", status: "Paid", created_at: "2025-12-15T10:00:00.000Z" }
];

const MOCK_ORDER_ITEMS = [
    { id: 100, order_id: 20, product_id: 20, product_name: "Luxury Silk Dress (M)", quantity: 1, price: 4999, subtotal: 4999 },
    { id: 101, order_id: 20, product_id: 23, product_name: "Diamond Stud Earrings (S)", quantity: 1, price: 499, subtotal: 499 },
    { id: 102, order_id: 19, product_id: 21, product_name: "Kids' Royal Jumpsuit (S)", quantity: 1, price: 1999, subtotal: 1999 }
];

// Load mock products from local storage if available for persistence
if (dbError) {
    const persistedMockProducts = localStorage.getItem('mock_products');
    if (persistedMockProducts) {
        MOCK_PRODUCTS = JSON.parse(persistedMockProducts);
    }
}
// --- END MOCK DATA ---

let cart = JSON.parse(localStorage.getItem('royal_cart')) || [];
let currentProducts = [];
let detailedAdminOrders = []; 
let productImgMap = {}; 

// Data structure for phone number validation (ONLY INDIA)
const phoneLimits = [
    { code: "+91", numberLength: 10, country: "India", flag: "🇮🇳" }, 
    { code: "default", numberLength: 12, country: "Other", flag: "🌍" } 
];

function getPhoneLimit(code) {
    return phoneLimits.find(l => l.code === code) || phoneLimits.find(l => l.code === 'default');
}


document.addEventListener('DOMContentLoaded', async () => {
    
    // --- UI SETUP (Run this FIRST so the menu works immediately) ---
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.main-navigation');

    if (mobileToggle && nav) {
        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            nav.classList.toggle('open');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (nav.classList.contains('open') && !nav.contains(e.target) && !mobileToggle.contains(e.target)) {
                nav.classList.remove('open');
            }
        });
    }

    injectQuickViewModal();
    injectStockAlertModal(); 
    injectCustomAlertSystem();
    updateCartCount(); // Update badge immediately from local storage

    // --- DB CHECKS (Run this SECOND) ---
    if (dbError || !sb) {
        console.error("Database connection missing or failed. Using mock data.");
    } else {
        // Perform network checks without blocking the UI
        validateCartStock(); 
    }

    // --- PAGE SPECIFIC INIT ---
    const path = window.location.pathname;

    if (path.includes('admin')) {
        initAdmin();
    } else if (path.includes('product')) {
        initProductDetail();
    } else if (path.includes('cart')) {
        initCartPage();
        initCheckoutFormLogic(); // Custom logic for the checkout form
    } else if (path.includes('index') || path === '/' || path.endsWith('/')) {
        initHomePage();
    } else {
        initListingPage();
    }
});

// New function for checkout form specific logic
function initCheckoutFormLogic() {
    const postCodeInput = document.getElementById('cust-postcode');
    const codeSelect = document.getElementById('country-code-select');
    const numberInput = document.getElementById('cust-phone-number');

    // 1. Post Code Validation 
    if (postCodeInput) {
        postCodeInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, ''); 
            if (this.value.length > 6) {
                this.value = this.value.slice(0, 6);
                showRoyalToast("Input Limit", "Post code allows only 6 digits.", true);
            }
        });
    }

    // 2. Country Code Slicer/Selector and Number Validation (India only)
    if (codeSelect && numberInput) {
        const indiaLimit = getPhoneLimit('+91');

        // Populate the dropdown with only the India option (Flag, Code, Country)
        codeSelect.innerHTML = `<option value="${indiaLimit.code}">${indiaLimit.flag} ${indiaLimit.code} (${indiaLimit.country})</option>`;
        
        // Disable the select since only one option exists
        codeSelect.disabled = true;

        // Set the number input max length and enforce digits only
        numberInput.maxLength = indiaLimit.numberLength;

        numberInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, ''); // Ensure only digits
            if (this.value.length > indiaLimit.numberLength) {
                this.value = this.value.slice(0, indiaLimit.numberLength);
                showRoyalToast("Number Limit", `Phone number is limited to ${indiaLimit.numberLength} digits for India.`, true);
            }
        });
    }
}


function injectCustomAlertSystem() {
    const html = `<div id="royal-alert" class="modal-overlay"> <div class="modal-content" style="text-align:center; max-width:400px;"> <i id="royal-alert-icon" class="fas fa-exclamation-circle" style="font-size:3rem; margin-bottom:15px; display:block;"></i> <h3 id="royal-alert-title" style="margin-bottom:10px;">Notice</h3> <p id="royal-alert-msg" style="color:#666; margin-bottom:20px;"></p> <button class="btn btn-primary" onclick="closeRoyalAlert()">Okay</button> </div> </div> <div id="royal-confirm" class="modal-overlay"> <div class="modal-content" style="text-align:center; max-width:400px;"> <i class="fas fa-question-circle" style="font-size:3rem; color:var(--color-accent); margin-bottom:15px; display:block;"></i> <h3 style="margin-bottom:10px;">Are you sure?</h3> <p id="royal-confirm-msg" style="color:#666; margin-bottom:20px;"></p> <div style="display:flex; gap:10px; justify-content:center;"> <button id="btn-confirm-no" class="btn btn-outline-dark">Cancel</button> <button id="btn-confirm-yes" class="btn btn-primary">Yes, Proceed</button> </div> </div> </div>`;
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

function restrictInputToStock(inputElement, productId, totalStock, size) {
    const inCartQty = cart
    .filter(item => item.id === productId && item.size === size)
    .reduce((sum, item) => sum + item.qty, 0);
    
    const remainingAllowed = Math.max(0, totalStock - inCartQty);
    
    inputElement.max = remainingAllowed;
    inputElement.min = 1;
    inputElement.value = remainingAllowed > 0 ? 1 : 0;
    
    if (remainingAllowed === 0) {
        inputElement.disabled = true;
    } else {
        inputElement.disabled = false;
    }
    
    inputElement.oninput = function() {
        let val = parseInt(this.value);
        if (isNaN(val)) return;
    
        if (val > remainingAllowed) {
            this.value = remainingAllowed;
            showRoyalToast('Limit Reached', `Only ${remainingAllowed} available in ${size}.`, true);
        } else if (val < 1 && remainingAllowed > 0) {
            this.value = 1;
        }
    };
    
    return remainingAllowed;
}

function injectQuickViewModal() {
    const modalHTML = `<div class="modal-overlay" id="quick-view-modal"> <div class="modal-content" style="max-width:800px;"> <span class="close-modal" onclick="closeQuickView()">&times;</span> <div class="qv-grid"> <div class="qv-img-wrap"> <img id="qv-img" src="" alt="Product"> </div> <div style="display:flex; flex-direction:column; justify-content:center;"> <h3 id="qv-title" style="font-family:var(--font-heading); font-size:1.8rem; line-height:1.2; margin-bottom:10px;"></h3> <div id="qv-price" style="font-size:1.4rem; color:var(--color-accent); font-weight:600; margin-bottom:15px;"></div> <p id="qv-stock" style="margin-bottom:20px; font-size:0.9rem; font-weight:600;"></p> <div class="control-group"> <label class="control-label">Size</label> <select id="qv-size" class="select-input"> <option value="S">Small</option>
                            <option value="M" selected>Medium</option>
                            <option value="L">Large</option>
                            <option value="XL">Extra Large</option>
                        </select> </div> <div class="control-group"> <label class="control-label">Quantity</label> <input type="number" id="qv-qty" class="qty-input" value="1" min="1"> </div> <button id="qv-add-btn" class="btn btn-primary" style="width:100%">Add to Bag</button> <a id="qv-link" href="#" style="display:block; text-align:center; margin-top:15px; font-size:0.8rem; text-decoration:underline; color:#666;">View Full Details</a> </div> </div> </div> </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function injectStockAlertModal() {
    const alertHTML = `<div class="modal-overlay" id="stock-alert-modal"> <div class="modal-content" style="max-width:400px; text-align:center;"> <span class="close-modal" onclick="document.getElementById('stock-alert-modal').classList.remove('open')">&times;</span> <h3 style="margin-bottom:15px; font-family:var(--font-heading);">Cart Update</h3> <p style="margin-bottom:15px;">Availability for some items in your cart has changed:</p> <ul id="stock-alert-list" style="text-align:left; background:#fff3cd; padding:15px; border-radius:4px; font-size:0.9rem; list-style:inside;"></ul> <button class="btn btn-primary" onclick="document.getElementById('stock-alert-modal').classList.remove('open')" style="margin-top:20px; width:100%;">Understood</button> </div> </div>`;
    document.body.insertAdjacentHTML('beforeend', alertHTML);
}

async function validateCartStock() {
    if (cart.length === 0) return;
    
    // Fallback to avoid breaking on DB error
    if (dbError || !sb) return; 

    const ids = [...new Set(cart.map(item => item.id))];
    const { data: dbProducts } = await sb.from('products').select('*').in('id', ids);
    
    if (!dbProducts) return;
    
    let changes = [];
    let cartUpdated = false;
    
    dbProducts.forEach(dbItem => {
        const sizesInCart = [...new Set(cart.filter(c => c.id === dbItem.id).map(c => c.size))];
        
        sizesInCart.forEach(size => {
            const cartItemsForVariant = cart.filter(c => c.id === dbItem.id && c.size === size);
            
            let variantStock = 0;
            if (dbItem.variants && dbItem.variants[size]) {
                variantStock = parseInt(dbItem.variants[size].stock);
            } else if (!dbItem.variants) {
                variantStock = Math.floor(dbItem.stock_quantity / 4); 
            }
    
            let totalReserved = cartItemsForVariant.reduce((sum, c) => sum + c.qty, 0);
    
            if (totalReserved > variantStock) {
                let available = variantStock;
                for (let i = cartItemsForVariant.length - 1; i >= 0; i--) {
                    const item = cartItemsForVariant[i];
                    if (available === 0) {
                        item.qty = 0; 
                    } else if (item.qty > available) {
                        item.qty = available;
                        available = 0;
                    } else {
                        available -= item.qty;
                    }
                    item.maxStock = variantStock; 
                }
                changes.push(`Stock for "<strong>${dbItem.name} (${size})</strong>" adjusted to ${variantStock}.`);
                cartUpdated = true;
            } else {
                cartItemsForVariant.forEach(item => {
                    if(item.maxStock !== variantStock) {
                        item.maxStock = variantStock;
                        cartUpdated = true;
                    }
                });
            }
        });
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

async function initHomePage() {
    const container = document.getElementById('home-products-grid');
    if (!container) return;
    
    let products = MOCK_PRODUCTS.slice(0, 8); // Fallback to mock data
    
    if (!dbError && sb) {
        const { data: dbProducts } = await sb.from('products')
            .select('*')
            .order('id', {ascending: false})
            .limit(8);
        if (dbProducts) products = dbProducts;
    }
    
    if (products && products.length > 0) {
        renderProducts(products, container);
    } else {
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;">Our latest collection is arriving soon.</p>';
    }
}

async function initListingPage() {
    const container = document.querySelector('.product-grid');
    if (!container) return;
    
    let category = null;
    if (window.location.pathname.includes('ladies')) category = 'ladies';
    else if (window.location.pathname.includes('kids')) category = 'kids';
    else if (window.location.pathname.includes('shoes')) category = 'shoes';
    else if (window.location.pathname.includes('cosmetics')) category = 'cosmetics';
    else if (window.location.pathname.includes('innerwears')) category = 'innerwears';
    
    let products = MOCK_PRODUCTS.filter(p => p.category === category); // Fallback to mock data
    
    if (category && !dbError && sb) {
        const { data: dbProducts } = await sb.from('products')
            .select('*')
            .eq('category', category)
            .order('id', {ascending: false}); 
        if (dbProducts) products = dbProducts;
    }
    
    if (products && products.length > 0) {
        renderProducts(products, container);
    } else {
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;">No products found in this category.</p>';
    }
}

function renderProducts(products, container) {
    currentProducts = products;
    container.innerHTML = '';
    
    products.forEach(p => {
        let totalStock = p.stock_quantity;
        let minPrice = p.price;
        let maxPrice = p.price;
    
        if(p.variants) {
            totalStock = Object.values(p.variants).reduce((sum, v) => sum + Number(v.stock), 0);
            const prices = Object.values(p.variants).map(v => Number(v.price));
            minPrice = Math.min(...prices);
            maxPrice = Math.max(...prices);
        }
    
        const isOutOfStock = totalStock <= 0;
        const badge = isOutOfStock ? '<div class="product-badge" style="background:var(--color-error);color:#fff;">Sold Out</div>' : '';
        
        let priceDisplay = `₹${minPrice}`;
        if (minPrice !== maxPrice) {
            priceDisplay = `From ₹${minPrice}`;
        }
    
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
                <div class="product-price">${priceDisplay}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

let currentQuickViewProduct = null;
window.openQuickView = (id) => {
    const product = currentProducts.find(p => p.id === id);
    if (!product) return;
    currentQuickViewProduct = product;
    
    document.getElementById('qv-img').src = product.image_url;
    document.getElementById('qv-title').innerText = product.name;
    document.getElementById('qv-link').href = `product.html?id=${product.id}`;
    
    const sizeSelect = document.getElementById('qv-size');
    const qtyInput = document.getElementById('qv-qty');
    const btn = document.getElementById('qv-add-btn');
    
    sizeSelect.value = 'M';
    
    function updateQuickViewUI() {
        const size = sizeSelect.value;
        let variantStock = 0;
        let variantPrice = product.price;
    
        if (product.variants && product.variants[size]) {
            variantStock = product.variants[size].stock;
            variantPrice = product.variants[size].price;
        } else {
            variantStock = Math.floor(product.stock_quantity / 4); 
        }
    
        document.getElementById('qv-price').innerText = `₹${variantPrice}`;
        const stockEl = document.getElementById('qv-stock');
    
        if (variantStock > 0) {
            // FIX: Use template literal for correct stock display on product page
            stockEl.innerText = `In Stock (${variantStock} units)`;
            stockEl.className = 'stock-status in';
            
            const remaining = restrictInputToStock(qtyInput, product.id, variantStock, size);
    
            if(remaining > 0) {
                btn.disabled = false;
                btn.innerText = "Add to Bag";
                btn.onclick = () => {
                    const qty = parseInt(qtyInput.value);
                    addToCart(product.id, product.name, variantPrice, product.image_url, variantStock, qty, size);
                    closeQuickView();
                };
            } else {
                btn.disabled = true;
                btn.innerText = "Max Limit in Cart";
                btn.onclick = null;
            }
        } else {
            stockEl.innerText = "Out of Stock";
            stockEl.style.color = 'var(--color-error)';
            btn.disabled = true;
            btn.innerText = "Sold Out";
            qtyInput.disabled = true;
            qtyInput.value = 0;
        }
    }
    
    sizeSelect.onchange = updateQuickViewUI;
    updateQuickViewUI(); 
    
    document.getElementById('quick-view-modal').classList.add('open');
}

window.closeQuickView = () => {
    document.getElementById('quick-view-modal').classList.remove('open');
}

async function initProductDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if(!id) return;
    
    let product = MOCK_PRODUCTS.find(p => p.id === parseInt(id)); // Fallback to mock data
    
    if(!dbError && sb) {
        const { data: dbProduct } = await sb.from('products').select('*').eq('id', id).single();
        if (dbProduct) product = dbProduct;
    }

    if(product) {
        document.getElementById('detail-img').src = product.image_url;
        document.getElementById('detail-title').innerText = product.name;
        document.getElementById('detail-desc').innerText = product.description || 'No description available.';
        document.getElementById('breadcrumb-category').innerText = product.category;
        document.getElementById('breadcrumb-name').innerText = product.name;
        document.getElementById('detail-cat-tag').innerText = product.category;
        
        const sizeSelect = document.getElementById('detail-size');
        const qtyInput = document.getElementById('detail-qty');
        const btn = document.getElementById('add-to-cart-btn');
        const priceEl = document.getElementById('detail-price');
        const stockEl = document.getElementById('stock-indicator');
    
        function updateDetailUI() {
            const size = sizeSelect.value;
            let variantStock = 0;
            let variantPrice = product.price;
    
            if (product.variants && product.variants[size]) {
                variantStock = parseInt(product.variants[size].stock);
                variantPrice = parseInt(product.variants[size].price);
            } else {
                variantStock = Math.floor(product.stock_quantity / 4);
            }
    
            priceEl.innerText = `₹${variantPrice}`;
    
            if (variantStock > 0) {
                // FIX: Use template literal for correct stock display on product page
                stockEl.innerText = `In Stock (${variantStock} units)`;
                stockEl.className = 'stock-status in';
                
                const remaining = restrictInputToStock(qtyInput, product.id, variantStock, size);
    
                if (remaining > 0) {
                    btn.disabled = false;
                    btn.innerText = "Add to Bag";
                    btn.onclick = () => {
                        const qty = parseInt(qtyInput.value);
                        addToCart(product.id, product.name, variantPrice, product.image_url, variantStock, qty, size);
                        
                        const newRemaining = restrictInputToStock(qtyInput, product.id, variantStock, size);
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
                qtyInput.value = 0;
            }
        }
    
        sizeSelect.addEventListener('change', updateDetailUI);
        updateDetailUI();
    }
}

function addToCart(id, name, price, img, maxStock, qty = 1, size = 'M') {
    const cartItemId = `${id}-${size}`;
    
    const existingTotal = cart
        .filter(item => item.id === id && item.size === size)
        .reduce((sum, item) => sum + item.qty, 0);
        
    if ((existingTotal + qty) > maxStock) {
        showRoyalAlert('Stock Limitation', `Sorry, only ${maxStock} units available for size ${size}.`, 'error');
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
            price: Number(price), 
            img, 
            qty, 
            maxStock: Number(maxStock),
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
                <td class="cart-item-product-cell">
                    <div class="cart-item-flex">
                        <img src="${item.img}" class="cart-thumb">
                        <div class="cart-item-details">
                            <h4>${item.name}</h4>
                            <span>ID: ${item.cartItemId}</span>
                        </div>
                    </div>
                    <!-- BEGIN MOBILE ONLY DETAILS (as per screenshot) -->
                    <div class="cart-item-mobile-details">
                        <div class="mobile-detail-row">
                            <span class="detail-label">PRICE</span>
                            <span class="detail-value">₹${item.price}</span>
                        </div>
                        <div class="mobile-detail-row">
                            <span class="detail-label">QUANTITY</span>
                            <div class="detail-value qty-controls-mobile">
                                <button class="btn btn-sm btn-outline-dark" onclick="updateQty(${index}, -1)">-</button>
                                <span>${item.qty}</span>
                                <button class="btn btn-sm btn-outline-dark" onclick="updateQty(${index}, 1)">+</button>
                            </div>
                        </div>
                        <div class="mobile-detail-row total-row">
                            <span class="detail-label">TOTAL</span>
                            <span class="detail-value" style="font-weight:600;">₹${item.price * item.qty}</span>
                        </div>
                        <!-- Trash icon moved to a separate row aligned right -->
                        <div class="mobile-detail-action-row">
                            <button onclick="removeFromCart(${index})" class="mobile-trash-btn" style="color:#e74c3c; border:none; background:none; cursor:pointer; font-size:1.1rem; padding:0;">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                    <!-- END MOBILE ONLY DETAILS -->
                </td>
                <td data-label="Price" class="desktop-only-cell">₹${item.price}</td>
                <td data-label="Quantity" class="desktop-only-cell">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button class="btn btn-sm btn-outline-dark" onclick="updateQty(${index}, -1)">-</button>
                        <span>${item.qty}</span>
                        <button class="btn btn-sm btn-outline-dark" onclick="updateQty(${index}, 1)">+</button>
                    </div>
                </td>
                <td data-label="Total" class="desktop-only-cell" style="font-weight:600;">₹${item.price * item.qty}</td>
                <td data-label="" class="desktop-only-cell trash-cell-desktop">
                    <button onclick="removeFromCart(${index})" style="color:#e74c3c; border:none; background:none; cursor:pointer; font-size:1.1rem;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    totalEl.innerText = `₹${total}`;
    if(subTotalEl) subTotalEl.innerText = `₹${total}`;
}

function updateQty(index, change) {
    const item = cart[index];
    
    if (change > 0) {
        if (item.qty >= item.maxStock) {
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
    const phoneCode = document.getElementById('country-code-select').value;
    const phoneNumber = document.getElementById('cust-phone-number').value;
    const address = document.getElementById('cust-address').value;
    const nearAddress = document.getElementById('cust-near-address').value;
    const postCode = document.getElementById('cust-postcode').value; 
    const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const payment = document.getElementById('payment-method').value;

    const submitBtn = document.querySelector('#checkout-form button');
    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;

    if (dbError || !sb) {
        showRoyalAlert("Order Failed", "Database connection failed. Please try again later.", 'error');
        submitBtn.innerText = "Complete Order";
        submitBtn.disabled = false;
        return;
    }
    
    // Final Phone number validation check
    const limit = getPhoneLimit(phoneCode);
    if (phoneNumber.length === 0 || phoneNumber.length !== limit.numberLength) {
        showRoyalAlert("Validation Error", `${limit.country} phone number must be exactly ${limit.numberLength} digits.`, 'error');
        submitBtn.innerText = "Complete Order";
        submitBtn.disabled = false;
        return;
    }

    // Combine address and nearby address to ensure all data is saved.
    const finalAddress = nearAddress ? `${address} (Near: ${nearAddress})` : address;

    // 1. Create Order
    const { data: orderData, error: orderError } = await sb
        .from('orders')
        .insert([{
            customer_name: name,
            customer_email: email,
            customer_phone: `${phoneCode}${phoneNumber}`,
            address: finalAddress,
            post_code: postCode, 
            total_amount: total,
            payment_method: payment,
            status: 'Pending'
        }])
        .select()
        .single();

    if (orderError) {
        showRoyalAlert("Order Failed", orderError.message, 'error');
        submitBtn.innerText = "Complete Order";
        submitBtn.disabled = false;
        return;
    }

    const orderId = orderData.id;

    // 2. Process Items
    for (const item of cart) {
        await sb.from('order_items').insert([{
            order_id: orderId,
            product_id: item.id,
            product_name: item.name, 
            quantity: item.qty,
            price: item.price,
            subtotal: item.price * item.qty
        }]);

        // Update Stock
        const { data: product } = await sb.from('products').select('*').eq('id', item.id).single();
        if (product) {
            let updatePayload = {};
            if (product.variants && product.variants[item.size]) {
                let currentStock = parseInt(product.variants[item.size].stock);
                product.variants[item.size].stock = Math.max(0, currentStock - item.qty);
                const totalStock = Object.values(product.variants).reduce((sum, v) => sum + Number(v.stock), 0);
                updatePayload = { variants: product.variants, stock_quantity: totalStock };
            } else {
                updatePayload = { stock_quantity: Math.max(0, product.stock_quantity - item.qty) };
            }
            if (Object.keys(updatePayload).length > 0) {
                await sb.from('products').update(updatePayload).eq('id', item.id);
            }
        }
    }

    closeCheckout();
    showRoyalAlert("Order Success", `Thank you! Your Order ID is #${orderId}`, 'success');

    cart = [];
    saveCart();
    initCartPage();

    submitBtn.innerText = "Complete Order";
    submitBtn.disabled = false;
}

// --- ADMIN AUTHENTICATION AND INIT (Client-side Password Check) ---
const ADMIN_PASSWORD = 'royal.soman';
const ADMIN_SESSION_KEY = 'royal_admin_logged_in'; // Simple flag in local storage

function checkAdminLocalAuth() {
    // If the DB is broken, allow direct access if the user has a "remembered" session, 
    // or if the DB works, proceed with the previous login status.
    const isLoggedIn = localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    if (isLoggedIn) {
        showAdminDashboard();
    } else {
        showAdminLogin();
    }
}

function showAdminDashboard() {
    document.getElementById('admin-login-screen').style.display = 'none';
    document.getElementById('admin-dashboard-content').style.display = 'block';
    document.getElementById('admin-logout-btn').style.display = 'inline-block';
    loadAdminOrders();
    loadAdminProducts();
}

function showAdminLogin() {
    document.getElementById('admin-login-screen').style.display = 'flex';
    document.getElementById('admin-dashboard-content').style.display = 'none';
    document.getElementById('admin-logout-btn').style.display = 'none';
    document.getElementById('login-error-message').innerText = '';
}

async function handleAdminLogin(e) {
    e.preventDefault();
    
    const password = document.getElementById('admin-password').value;
    const btn = document.getElementById('admin-login-btn');
    const errorMsgEl = document.getElementById('login-error-message');
    
    btn.disabled = true;
    btn.innerText = "Checking...";
    errorMsgEl.innerText = '';

    // Hardcoded password check (client-side only for this app)
    if (password === ADMIN_PASSWORD) {
        localStorage.setItem(ADMIN_SESSION_KEY, 'true');
        showRoyalToast("Success", "Welcome to the Admin Dashboard!", false);
        showAdminDashboard();
    } else {
        errorMsgEl.innerText = "Invalid password. Try again.";
        showRoyalAlert("Login Failed", "Invalid password. Try again.", 'error');
        // Clear password field for security
        document.getElementById('admin-password').value = '';
    }

    btn.disabled = false;
    btn.innerText = "Log In";
}

window.handleAdminLogout = async () => {
    const confirmLogout = await showRoyalConfirm("Are you sure you want to log out?");
    if (confirmLogout) {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        showRoyalToast("Logged Out", "You have been securely logged out.", false);
        showAdminLogin();
    }
}

function initAdmin() {
    // 1. Initial Auth Check
    checkAdminLocalAuth();

    // 2. Set up Login Form Listener
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }
    
    // 3. Set up Tab Navigation
    const tabs = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.admin-section');
    const searchContainer = document.getElementById('order-search-container'); 
    const searchInput = document.getElementById('order-search-input'); 
    
    // Function to handle showing/hiding search bar and content on tab click
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.style.display = 'none');
            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.target);
            target.style.display = 'block';

            // Show/Hide search bar based on tab
            if (tab.dataset.target === 'orders-section') {
                searchContainer.style.display = 'block';
                // Re-apply search/render orders in case of existing filter
                handleOrderSearch(null, false); 
            } else {
                searchContainer.style.display = 'none';
            }
        });
    });

    // Set initial search bar visibility based on active tab
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.dataset.target === 'orders-section' && searchContainer) {
        searchContainer.style.display = 'block';
    } else if (searchContainer) {
        searchContainer.style.display = 'none';
    }
    
    // 4. Set up Order Search Bar Listeners
    const clearBtn = document.getElementById('clear-search-btn');

    if (searchInput && clearBtn) {
        // Only filters the grid on input
        searchInput.addEventListener('input', (e) => handleOrderSearch(e, false)); 
        
        // Triggers modal pop-up on Enter keydown
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submission if applicable
                handleOrderSearch(e, true);
            }
        }); 

        clearBtn.addEventListener('click', clearOrderSearch);
        
        window.clearOrderSearch = () => {
            searchInput.value = '';
            handleOrderSearch(null, false);
        };
    }

    // 5. Set up Product Form Listener (CRITICAL FIX HERE)
    const form = document.getElementById('product-form');
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent the form from submitting normally and reloading the page
            
            const id = document.getElementById('prod-id').value;
            const saveBtn = document.getElementById('save-product-btn');
            
            saveBtn.disabled = true;
            saveBtn.innerText = "Saving...";
            
            const prodName = document.getElementById('prod-name').value;
            
            // Collect form data
            const variants = {
                'S': { price: document.getElementById('price-S').value, stock: document.getElementById('stock-S').value },
                'M': { price: document.getElementById('price-M').value, stock: document.getElementById('stock-M').value },
                'L': { price: document.getElementById('price-L').value, stock: document.getElementById('stock-L').value },
                'XL': { price: document.getElementById('price-XL').value, stock: document.getElementById('stock-XL').value }
            };
            const prices = Object.values(variants).map(v => Number(v.price));
            const totalStock = Object.values(variants).reduce((a,b) => a+Number(b.stock), 0);
            const minPrice = Math.min(...prices);
            const imageUrl = document.getElementById('prod-image-url').value;
            const fileInput = document.getElementById('prod-image-file');

            // Basic Validation Check
            if (!prodName || !minPrice || totalStock === undefined || totalStock === null || (!imageUrl && !fileInput.files.length)) {
                showRoyalAlert("Missing Fields", "Please fill out all required fields (Name, Category, Prices, Stocks, Image).", 'error');
                saveBtn.disabled = false;
                saveBtn.innerText = "Save Product";
                return;
            }

            // CRITICAL FIX: Gracefully handle DB failure for ADD/EDIT
            if (dbError || !sb) {
                // MOCK SUCCESS and PERSIST
                const payload = {
                    id: id ? parseInt(id) : Math.max(0, ...MOCK_PRODUCTS.map(p => p.id)) + 1, // Safely generate new ID
                    name: prodName,
                    category: document.getElementById('prod-category').value,
                    image_url: imageUrl || "https://via.placeholder.com/300x400?text=Mock+Product",
                    description: document.getElementById('prod-desc').value,
                    variants: variants,
                    price: minPrice, 
                    stock_quantity: totalStock 
                };

                if (id) {
                    const index = MOCK_PRODUCTS.findIndex(p => p.id === parseInt(id));
                    if (index > -1) {
                        MOCK_PRODUCTS[index] = payload;
                    }
                    showRoyalToast("Success", `Product "${prodName}" updated successfully (Client-side Mock).`);
                } else {
                    MOCK_PRODUCTS.unshift(payload); // Add new product to top
                    showRoyalToast("Success", `Product "${prodName}" added successfully (Client-side Mock).`);
                }

                // Persist mock data
                localStorage.setItem('mock_products', JSON.stringify(MOCK_PRODUCTS));

                form.reset();
                document.getElementById('prod-id').value = '';
                loadAdminProducts(); // Reloads product list
                
                // Ensure Products tab remains active
                document.querySelector('.tab-btn[data-target="products-section"]').click(); 
                
                saveBtn.disabled = false;
                saveBtn.innerText = "Save Product";
                // Show a warning about the DB connection
                setTimeout(() => {
                    showRoyalAlert("Database Warning", "Product changes were only saved locally because the Supabase connection failed. They will disappear if you clear your browser data.", 'warning');
                }, 1000);
                return;
            }

            // ORIGINAL DB LOGIC (only runs if !dbError)
            try {
                let finalImageUrl = imageUrl;
                
                // Image handling logic
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}.${fileExt}`;
                    
                    // Supabase Storage upload
                    const { error: uploadError } = await sb.storage.from('products').upload(fileName, file);
                    if (uploadError) throw uploadError;
                    
                    const { data: { publicUrl } } = sb.storage.from('products').getPublicUrl(fileName);
                    finalImageUrl = publicUrl;
                }

                if (!finalImageUrl) throw new Error("Please provide an Image URL or upload a file.");
                
                const payload = {
                    name: prodName,
                    category: document.getElementById('prod-category').value,
                    image_url: finalImageUrl,
                    description: document.getElementById('prod-desc').value,
                    variants: variants,
                    price: minPrice, 
                    stock_quantity: totalStock 
                };

                let error;
                if (id) error = (await sb.from('products').update(payload).eq('id', id)).error;
                else error = (await sb.from('products').insert([payload])).error;

                if (error) throw error;

                form.reset();
                document.getElementById('prod-id').value = '';
                loadAdminProducts();
                document.querySelector('.tab-btn[data-target="products-section"]').click(); // Keep tab active
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
    const tbody = document.getElementById('admin-products-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading products...</td></tr>';

    let products = MOCK_PRODUCTS; // Fallback to mock data

    if (!dbError && sb) {
        const { data: dbProducts } = await sb.from('products').select('*').order('id', { ascending: false });
        if (dbProducts) products = dbProducts;
    }

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No products found.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => {
        let variantHtml = '';
        let variantCount = 0;
        
        // Use variants object if it exists and is not empty
        if (p.variants && Object.keys(p.variants).length > 0) {
            variantCount = Object.keys(p.variants).length;
            
            // Build the variants list HTML
            const variantsOrder = ['L', 'M', 'S', 'XL']; // Order them like in the image for aesthetics
            
            variantHtml = `<div class="admin-variant-list">`;
            variantsOrder.forEach(size => {
                const variant = p.variants[size];
                // Check for null/undefined before accessing properties
                if (variant && variant.price !== undefined && variant.stock !== undefined) {
                    variantHtml += `
                        <div class="admin-variant-item">
                            <span class="size">${size}:</span>
                            <span class="price">₹${variant.price}</span>
                            <span class="stock">Stock: ${variant.stock}</span>
                        </div>
                    `;
                }
            });
            variantHtml += `</div>`;
        } else if (p.stock_quantity !== undefined) {
            // Fallback for single variant/legacy products (display single price/stock)
            variantCount = 1;
            variantHtml = `
                <div class="admin-variant-list">
                    <div class="admin-variant-item">
                        <span class="size">Default:</span>
                        <span class="price">₹${p.price}</span>
                        <span class="stock">Stock: ${p.stock_quantity}</span>
                    </div>
                </div>
            `;
        } else {
            variantHtml = `${variantCount} Variants`; // Default fallback text
        }

        return `
            <tr>
                <td>
                    <div class="admin-product-item">
                        <img src="${p.image_url}" alt="${p.name}" class="admin-product-thumb">
                        <a href="product.html?id=${p.id}" target="_blank">${p.name}</a>
                    </div>
                </td>
                <td>${p.category}</td>
                <td>${variantHtml}</td>
                <td class="action-btns">
                    <button class="btn btn-primary btn-sm" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-outline-dark btn-sm" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}


// --- Admin Order Search/Render Logic ---
function renderOrderCardHTML(o) {
    const items = o.items || [];
    const statusClass = o.status === 'Pending' ? 'status-pending' : 'status-paid';
    
    const itemsHtml = items.map(i => {
        let imgUrl = 'https://via.placeholder.com/40';
        if (productImgMap[i.product_name]) {
            imgUrl = productImgMap[i.product_name];
        } else {
            const baseName = i.product_name.replace(/\s\([a-zA-Z0-9]+\)$/, '');
            if (productImgMap[baseName]) {
                imgUrl = productImgMap[baseName];
            }
        }

        return `
        <div class="order-item-row">
            <img src="${imgUrl}" class="order-item-img">
            <span>${i.product_name} x ${i.quantity}</span>
            <span style="font-weight:600">₹${i.subtotal}</span>
        </div>
        `;
    }).join('');

    return `
    <div class="order-card-content">
        <div class="order-header" style="border-bottom: 1px solid var(--color-bg-secondary); padding-bottom: 15px; margin-bottom: 20px;">
            <span class="order-id" style="font-size: 1.2rem; font-family: var(--font-heading);">ORDER #${o.id}</span>
            <span class="order-date" style="font-size: 0.85rem; color:#666;">${new Date(o.created_at).toLocaleString()}</span>
        </div>
        <div class="order-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div class="order-info">
                <h5>CUSTOMER DETAILS</h5>
                <p><strong>${o.customer_name}</strong></p>
                <p style="color:#666; font-size:0.9rem;">${o.customer_email}</p>
                <p style="color:#666; font-size:0.9rem;">Phone: ${o.customer_phone || 'N/A'}</p>
                <h5 style="margin-top:15px;">SHIPPING ADDRESS</h5>
                <p style="color:#666; font-size:0.9rem;">${o.address}</p>
                <p style="color:#666; font-size:0.9rem;">Post Code: ${o.post_code || 'N/A'}</p>
                <h5 style="margin-top:15px;">PAYMENT</h5>
                <p>${o.payment_method}</p>
            </div>
            <div class="order-items-list">
                <h5 style="margin-bottom:15px;">ORDER ITEMS</h5>
                ${itemsHtml}
                <div class="order-total-row" style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px; display: flex; justify-content: space-between;">
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
}

function openOrderDetailModal(order) {
    const modal = document.getElementById('order-detail-modal');
    const content = document.getElementById('order-detail-content');
    content.innerHTML = renderOrderCardHTML(order);
    modal.classList.add('open');
}

function renderAdminOrders(ordersToRender) {
    const grid = document.getElementById('admin-orders-grid');
    if(!grid) return;

    if(!ordersToRender || ordersToRender.length === 0) {
        const searchTerm = document.getElementById('order-search-input')?.value.trim();
        if (searchTerm) {
             grid.innerHTML = '<p class="text-center">No orders matched your search criteria.</p>';
        } else {
            grid.innerHTML = '<p class="text-center">No orders found.</p>';
        }
        return;
    }

    grid.innerHTML = ordersToRender.map(o => {
        // Render a compact card for the grid
        const statusClass = o.status === 'Pending' ? 'status-pending' : 'status-paid';
        return `
            <div class="order-card" onclick="openOrderDetailModalById(${o.id})">
                <div class="order-header">
                    <span class="order-id">ORDER #${o.id}</span>
                    <span class="order-date">${new Date(o.created_at).toLocaleString()}</span>
                </div>
                <div class="order-body" style="grid-template-columns: 1fr;">
                    <div class="order-info">
                        <p style="margin-bottom: 5px;"><strong>${o.customer_name}</strong> - ${o.customer_email}</p>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:1.2rem; font-weight:700;">₹${o.total_amount}</span>
                            <span class="status-badge ${statusClass}">${o.status}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.openOrderDetailModalById = (id) => {
    const order = detailedAdminOrders.find(o => o.id === id);
    if(order) {
        openOrderDetailModal(order);
    } else {
        showRoyalAlert('Order Not Found', `Details for Order #${id} could not be loaded.`, 'error');
    }
}

function handleOrderSearch(e, isEnterKey) {
    const searchInput = document.getElementById('order-search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    const searchIcon = document.getElementById('search-icon-btn');
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    // Clean search term once for Order ID check (numerical only)
    const orderIdSearchTerm = searchTerm.replace('#', '').trim();
    
    // --- UI Logic: Show/Hide Clear Button ---
    if (searchTerm) {
        clearBtn.style.display = 'block';
        searchIcon.style.display = 'none';
    } else {
        clearBtn.style.display = 'none';
        searchIcon.style.display = 'block';
    }

    // --- Modal Popup Logic (Only on Enter Key) ---
    if (isEnterKey && orderIdSearchTerm) {
        const orderIdNum = parseInt(orderIdSearchTerm);
        const exactMatch = detailedAdminOrders.find(o => o.id === orderIdNum);

        if (exactMatch) {
            openOrderDetailModal(exactMatch);
            // Clear search after successful pop-up
            searchInput.value = '';
            clearBtn.style.display = 'none';
            searchIcon.style.display = 'block';
            // Then re-render all orders in the background grid
            renderAdminOrders(detailedAdminOrders); 
            return;
        } else {
            showRoyalAlert('Order Not Found', `Order ID #${orderIdSearchTerm} not found.`, 'warning');
        }
    }
    
    // --- Grid Filtering Logic (On every input or non-Enter key search) ---
    let ordersToRender = detailedAdminOrders;

    if (searchTerm) {
        ordersToRender = detailedAdminOrders.filter(o => {
            const orderId = String(o.id);
            const customerName = (o.customer_name || '').toLowerCase();
            const customerEmail = (o.customer_email || '').toLowerCase();
            const customerPhone = (o.customer_phone || '').toLowerCase();

            // 1. Search by Order ID (partial contains the number)
            if (orderIdSearchTerm && orderId.includes(orderIdSearchTerm)) return true;

            // 2. Search by Name, Email, Phone (using the full search term)
            if (customerName.includes(searchTerm)) return true;
            if (customerEmail.includes(searchTerm)) return true;
            if (customerPhone.includes(searchTerm)) return true;
            
            return false;
        });
    }

    renderAdminOrders(ordersToRender);
}
// --- END Admin Order Search/Render Logic ---

async function loadAdminOrders() {
    const grid = document.getElementById('admin-orders-grid');
    if(!grid) return;
    
    grid.innerHTML = '<p class="text-center">Loading orders...</p>';
    
    let orders = MOCK_ORDERS;
    let allItems = MOCK_ORDER_ITEMS;
    let allProducts = MOCK_PRODUCTS;

    // 1. Fetch products map (only once)
    if (Object.keys(productImgMap).length === 0) {
        if (!dbError && sb) {
            const { data: dbProducts } = await sb.from('products').select('name, image_url');
            if (dbProducts) allProducts = dbProducts;
        }
        allProducts.forEach(p => {
            productImgMap[p.name] = p.image_url;
            // Add variant names to the map as well for better mock coverage
            if (p.variants) {
                Object.keys(p.variants).forEach(size => {
                    productImgMap[`${p.name} (${size})`] = p.image_url;
                });
            }
        });
        
    }

    // 2. Fetch Orders & Items
    if (!dbError && sb) {
        const { data: dbOrders } = await sb.from('orders').select('*').order('created_at', { ascending: false });
        if (dbOrders) orders = dbOrders;
        
        const { data: dbAllItems } = await sb.from('order_items').select('*');
        if (dbAllItems) allItems = dbAllItems;
    }
    
    if(!orders || orders.length === 0) {
        detailedAdminOrders = [];
        grid.innerHTML = '<p class="text-center">No orders found.</p>';
        return;
    }
    
    const itemsMap = allItems ? allItems.reduce((acc, item) => {
        if (!acc[item.order_id]) acc[item.order_id] = [];
        acc[item.order_id].push(item);
        return acc;
    }, {}) : {};

    // 3. Combine and Store globally
    detailedAdminOrders = orders.map(o => ({
        ...o,
        items: itemsMap[o.id] || []
    }));

    // 4. Render all initially (or filtered if search term exists)
    handleOrderSearch(null, false);
}

window.deleteProduct = async (id) => {
    if (dbError || !sb) {
        const yes = await showRoyalConfirm('Permanently delete this product? (Client-side Mock)');
        if(yes) {
            MOCK_PRODUCTS = MOCK_PRODUCTS.filter(p => p.id !== id);
            localStorage.setItem('mock_products', JSON.stringify(MOCK_PRODUCTS));
            loadAdminProducts();
            showRoyalToast("Deleted", "Product removed (Client-side Mock).");
        }
        return;
    }
    
    const yes = await showRoyalConfirm('Permanently delete this product?');
    if(yes) {
        await sb.from('products').delete().eq('id', id);
        loadAdminProducts();
        showRoyalToast("Deleted", "Product removed.");
    }
}

window.editProduct = async (id) => {
    let p = MOCK_PRODUCTS.find(p => p.id === id); // Fallback to mock

    if (!dbError && sb) {
        const { data: dbProduct } = await sb.from('products').select('*').eq('id', id).single();
        if (dbProduct) p = dbProduct;
    }

    if(p) {
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-category').value = p.category;
        document.getElementById('prod-image-url').value = p.image_url;
        document.getElementById('prod-desc').value = p.description || '';
    
        if(p.variants) {
            ['S', 'M', 'L', 'XL'].forEach(size => {
                if(p.variants[size]) {
                    document.getElementById(`price-${size}`).value = p.variants[size].price;
                    document.getElementById(`stock-${size}`).value = p.variants[size].stock;
                }
            });
        } else {
            ['S', 'M', 'L', 'XL'].forEach(size => {
                document.getElementById(`price-${size}`).value = p.price;
                document.getElementById(`stock-${size}`).value = Math.floor(p.stock_quantity/4);
            });
        }
    
        document.querySelector('.tab-btn[data-target="products-section"]').click();
        window.scrollTo(0,0);
    }
}