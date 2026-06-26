const SUPABASE_URL = 'https://zxpttznsgulnhxmdijot.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cHR0em5zZ3Vsbmh4bWRpam90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjQ2MTgsImV4cCI6MjA4MDQ0MDYxOH0.8yB-oDUer9_fwptcf_wzC8xeW7v9LR6ZIQX_xKDJCwg';

let sb = null;
let cart = [];
let currentAdminOrders = [];
let wishlist = [];
let notifications = [];
let currentNotificationsKey = 'royal_notifications';
let isUserLoggedIn = false;

window.addEventListener('load', () => {
    // Inject high-priority image cover and anchor constraint styles to completely bypass CSS caching
    try {
        const style = document.createElement('style');
        style.innerHTML = '.product-image-wrapper a { display: block !important; width: 100% !important; height: 100% !important; } .product-image-wrapper img { object-fit: cover !important; padding: 0 !important; width: 100% !important; height: 100% !important; }';
        document.head.appendChild(style);
    } catch(e) {}

    if (typeof supabase !== 'undefined') {
        const { createClient } = supabase;
        sb = createClient(SUPABASE_URL, SUPABASE_KEY);
        window.sb = sb; // Bind to window so it is accessible globally in production/hosted builds
        if (typeof initGlobalLoginIcon === 'function') {
            initGlobalLoginIcon();
        }
        try {
            sb.auth.onAuthStateChange((event, session) => {
                if (session && session.user) {
                    currentNotificationsKey = `royal_notifications_${session.user.id}`;
                    isUserLoggedIn = true;
                } else {
                    currentNotificationsKey = 'royal_notifications';
                    isUserLoggedIn = false;
                }
                loadNotifications();
                updateNotificationsCount();
                if (typeof updateGlobalLoginIcon === 'function') {
                    updateGlobalLoginIcon(session);
                }
                if (window.location.pathname.includes('notifications')) {
                    initNotificationsPage();
                }
            });
        } catch(e) {
            console.error("Auth state change subscription error:", e);
        }
    } 

    try {
        const savedCart = localStorage.getItem('royal_cart');
        if (savedCart) cart = JSON.parse(savedCart);
        if (document.querySelector('.cart-count')) updateCartCount();
        
        loadWishlist();
        loadNotifications();
        updateWishlistCount();
        updateNotificationsCount();
    } catch (e) {}

    const path = window.location.pathname;
    if (path.includes('admin')) initAdmin();
    else if (path.includes('product')) initProductDetail();
    else if (path.includes('cart')) initCartPage();
    else if (path.includes('thankyou')) initThankYouPage();
    else if (path.includes('wishlist')) initWishlistPage();
    else if (path.includes('notifications')) initNotificationsPage();
    else if (path.includes('index') || path === '/' || path.endsWith('/')) initHomePage();
    else initListingPage();

    try {
        if (typeof updateChatbotVisibility === 'function') {
            updateChatbotVisibility();
        }
    } catch(e) {}
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

    // Dynamically add mobile-only navigation links for Wishlist and Notifications
    const navList = document.querySelector('.nav-list');
    if (navList) {
        const path = window.location.pathname;
        
        const wishlistLi = document.createElement('li');
        wishlistLi.className = 'mobile-only-nav';
        const wishlistActive = path.includes('wishlist.html') ? 'class="active"' : '';
        wishlistLi.innerHTML = `<a href="wishlist.html" ${wishlistActive}>Wishlist</a>`;
        
        const notificationsLi = document.createElement('li');
        notificationsLi.className = 'mobile-only-nav';
        const notificationsActive = path.includes('notifications.html') ? 'class="active"' : '';
        notificationsLi.innerHTML = `<a href="notifications.html" ${notificationsActive}>Notifications</a>`;
        
        navList.appendChild(wishlistLi);
        navList.appendChild(notificationsLi);
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
    // Remove any existing toasts first
    document.querySelectorAll('.cart-toast').forEach(t => t.remove());

    const icon = isError ? 'fa-circle-xmark' : 'fa-circle-check';
    const iconColor = isError ? '#e74c3c' : '#27ae60';

    let toast = document.createElement('div');
    toast.className = `cart-toast ${isError ? 'error' : 'success'}`;
    toast.innerHTML = `
        <div class="toast-icon-col" style="background:${iconColor}">
            <i class="fas ${icon}"></i>
        </div>
        <div class="toast-body">
            <div class="toast-header-row">
                <span class="toast-title">${title}</span>
                <button class="toast-close" onclick="this.closest('.cart-toast').remove()">&times;</button>
            </div>
            <div class="toast-msg">${message}</div>
        </div>
        <div class="toast-progress"><div class="toast-progress-bar"></div></div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); }, 3500);
}

function showRoyalConfirm(title, message, onConfirm, onCancel = null) {
    // Remove any existing confirm modals first
    document.querySelectorAll('.royal-confirm-overlay').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'royal-confirm-overlay';
    
    let iconClass = 'fa-question-circle';
    let iconColor = 'var(--color-accent, #065184)';
    const lowerTitle = title.toLowerCase();
    const lowerMessage = message.toLowerCase();
    
    if (lowerTitle.includes('delete') || lowerMessage.includes('delete') || lowerTitle.includes('remove') || lowerMessage.includes('remove')) {
        iconClass = 'fa-trash-alt';
        iconColor = 'var(--color-error, #e74c3c)';
    } else if (lowerTitle.includes('logout') || lowerMessage.includes('logout') || lowerTitle.includes('log out') || lowerMessage.includes('log out')) {
        iconClass = 'fa-sign-out-alt';
        iconColor = 'var(--color-accent, #065184)';
    }

    overlay.innerHTML = `
        <div class="royal-confirm-card">
            <i class="fas ${iconClass} royal-confirm-icon" style="color: ${iconColor}"></i>
            <h3 class="royal-confirm-title">${title}</h3>
            <p class="royal-confirm-desc">${message}</p>
            <div class="royal-confirm-actions">
                <button class="btn-confirm-cancel">Cancel</button>
                <button class="btn-confirm-action" style="background: ${iconColor === 'var(--color-error, #e74c3c)' ? 'var(--color-error, #e74c3c)' : 'var(--color-primary, #121212)'}">Confirm</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => overlay.classList.add('show'), 10);

    const closeConfirm = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('.btn-confirm-cancel').addEventListener('click', () => {
        closeConfirm();
        if (onCancel) onCancel();
    });

    overlay.querySelector('.btn-confirm-action').addEventListener('click', () => {
        closeConfirm();
        if (onConfirm) onConfirm();
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeConfirm();
            if (onCancel) onCancel();
        }
    });
}

function showRoyalAlert(title, message, onOk = null) {
    document.querySelectorAll('.royal-confirm-overlay').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'royal-confirm-overlay';

    overlay.innerHTML = `
        <div class="royal-confirm-card">
            <i class="fas fa-info-circle royal-confirm-icon" style="color: var(--color-accent, #065184)"></i>
            <h3 class="royal-confirm-title">${title}</h3>
            <p class="royal-confirm-desc">${message}</p>
            <div class="royal-confirm-actions">
                <button class="btn-confirm-action" style="flex: 1; background: var(--color-primary, #121212)">OK</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('show'), 10);

    const closeAlert = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('.btn-confirm-action').addEventListener('click', () => {
        closeAlert();
        if (onOk) onOk();
    });
}

window.showRoyalConfirm = showRoyalConfirm;
window.showRoyalAlert = showRoyalAlert;
window.showRoyalToast = showRoyalToast;

function updateCartCount() {
    const els = document.querySelectorAll('.cart-count');
    const total = cart.reduce((acc, item) => acc + item.qty, 0);
    els.forEach(el => {
        el.innerText = total;
        el.style.display = total > 0 ? 'flex' : 'none';
    });
}

function saveCart() {
    localStorage.setItem('royal_cart', JSON.stringify(cart));
    updateCartCount();
}

async function addToCart(id, name, price, img, maxStock, qty, size, variantName) {
    if (!isUserLoggedIn) {
        // Double check session to avoid race conditions
        if (sb) {
            try {
                const { data: { session } } = await sb.auth.getSession();
                if (session && session.user) {
                    isUserLoggedIn = true;
                    currentNotificationsKey = `royal_notifications_${session.user.id}`;
                    loadNotifications();
                    updateNotificationsCount();
                }
            } catch(e) {}
        }
    }

    if (!isUserLoggedIn) {
        showRoyalConfirm(
            "Sign In Required",
            "Please sign in or sign up to add items to your bag and start shopping.",
            () => {
                localStorage.setItem('login_redirect', window.location.href);
                window.location.href = 'login.html';
            }
        );
        return false;
    }

    const cartItemId = `${id}-${variantName}-${size}`; 
    const existing = cart.find(item => item.cartItemId === cartItemId);
    const currentQty = existing ? existing.qty : 0;
    
    if (currentQty + qty > maxStock) {
        showRoyalToast('Stock Limitation', `Only ${maxStock} units available.`, true);
        return false;
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
    return true;
}

async function buyNowDirectly(productId) {
    let product = window.renderedProducts && window.renderedProducts[productId];
    if (!product) {
        if (typeof sb !== 'undefined' && sb) {
            try {
                const { data } = await sb.from('products').select('*').eq('id', productId).single();
                product = data;
            } catch(e) {
                console.error("Error fetching product on buy now:", e);
            }
        }
    }
    
    if (!product) {
        showRoyalToast("Error", "Product details could not be loaded.", true);
        return;
    }
    
    // Normalise variants and pick first available size
    let variants = Array.isArray(product.variants) 
        ? product.variants 
        : [{ 
            name: "Standard", 
            images: [product.image_url], 
            sizes: product.variants?.options || [{size:"Standard", price: product.price, stock: product.stock_quantity}] 
          }];
    
    let selectedVariant = variants[0];
    let selectedSizeObj = null;
    
    for (const v of variants) {
        if (v.sizes && Array.isArray(v.sizes)) {
            const availableSize = v.sizes.find(s => s.stock > 0);
            if (availableSize) {
                selectedVariant = v;
                selectedSizeObj = availableSize;
                break;
            }
        }
    }
    
    if (!selectedSizeObj && selectedVariant && selectedVariant.sizes && selectedVariant.sizes.length > 0) {
        selectedSizeObj = selectedVariant.sizes[0];
    }
    
    const finalPrice = selectedSizeObj ? selectedSizeObj.price : product.price;
    const finalStock = selectedSizeObj ? selectedSizeObj.stock : product.stock_quantity;
    const finalSize = selectedSizeObj ? selectedSizeObj.size : "Standard";
    const finalVariantName = selectedVariant ? selectedVariant.name : "Standard";
    const finalImage = (selectedVariant && selectedVariant.images && selectedVariant.images.length > 0) ? selectedVariant.images[0] : product.image_url;
    
    const added = await addToCart(product.id, product.name, finalPrice, finalImage, finalStock, 1, finalSize, finalVariantName);
    if (added) {
        window.location.href = 'cart.html';
    }
}

window.buyNowDirectly = buyNowDirectly;

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

async function initCartPage() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    if (!isUserLoggedIn) {
        // Double check session to avoidtiming race conditions on page load
        if (sb) {
            try {
                const { data: { session } } = await sb.auth.getSession();
                if (session && session.user) {
                    isUserLoggedIn = true;
                    currentNotificationsKey = `royal_notifications_${session.user.id}`;
                    loadNotifications();
                    updateNotificationsCount();
                }
            } catch(e) {}
        }
    }

    if (!isUserLoggedIn) {
        localStorage.setItem('login_redirect', window.location.href);
        window.location.href = 'login.html';
        return;
    }

    // Update heading with count
    const heading = document.getElementById('cart-page-heading');
    if (heading) heading.textContent = `My Cart (${cart.reduce((a, b) => a + b.qty, 0)})`;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-shopping-bag" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 20px; display: block;"></i>
                <p style="font-family: var(--font-body); font-size: 1rem; color: var(--color-secondary); margin-bottom: 25px;">Your shopping bag is empty.</p>
                <a href="index.html" class="btn btn-primary">Continue Shopping</a>
            </div>`;
        if (document.getElementById('original-subtotal')) document.getElementById('original-subtotal').innerText = '₹0.00';
        if (document.getElementById('sub-total')) document.getElementById('sub-total').innerText = '₹0.00';
        if (document.getElementById('shipping-fee')) document.getElementById('shipping-fee').innerText = '₹0.00';
        if (document.getElementById('savings-total')) document.getElementById('savings-total').innerText = '₹0.00';
        if (document.getElementById('cart-total')) document.getElementById('cart-total').innerText = '₹0.00';
        return;
    }

    container.innerHTML = cart.map((item, i) => `
        <div class="cart-item-row">
            <div class="cart-product-col">
                <img src="${item.img}" class="cart-product-thumb" alt="${escapeHtml(item.name)}">
                <div class="cart-product-info">
                    <div class="cart-product-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name.split('(')[0].trim())}</div>
                    <div class="cart-product-subtitle">Size: ${escapeHtml(item.size)} | Option: ${escapeHtml(item.variant || 'Standard')}</div>
                    <div class="cart-stock-dot-row" style="display: flex; align-items: center; gap: 5px; font-size: 0.78rem; color: #27ae60; font-weight: 500;">
                        <span class="stock-dot green-dot" style="width: 6px; height: 6px; border-radius: 50%; background: #27ae60; display: inline-block;"></span>
                        In Stock
                    </div>
                    <div class="cart-item-actions">
                        <button class="cart-action-link" onclick="moveCartItemToWishlist(${i})">
                            <i class="far fa-heart"></i> Move to Wishlist
                        </button>
                    </div>
                </div>
            </div>
            <div class="cart-price-col">₹${item.price.toFixed(2)}</div>
            <div class="cart-qty-col">
                <div class="cart-qty-control">
                    <button class="cart-qty-btn" onclick="updateCartQty(${i}, -1)">−</button>
                    <span class="cart-qty-num">${item.qty}</span>
                    <button class="cart-qty-btn" onclick="updateCartQty(${i}, 1)">+</button>
                </div>
            </div>
            <div class="cart-total-col">₹${(item.price * item.qty).toFixed(2)}</div>
            <div class="cart-remove-col">
                <button class="cart-remove-btn-red" onclick="removeFromCart(${i})" title="Remove Item">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `).join('');

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const originalSubtotal = cart.reduce((sum, item) => sum + ((item.price * 1.47) * item.qty), 0);
    const savings = originalSubtotal - subtotal;
    const shipping = 50.00;
    const total = subtotal + shipping;

    if (document.getElementById('original-subtotal')) document.getElementById('original-subtotal').innerText = `₹${originalSubtotal.toFixed(2)}`;
    if (document.getElementById('sub-total')) document.getElementById('sub-total').innerText = `₹${subtotal.toFixed(2)}`;
    if (document.getElementById('shipping-fee')) document.getElementById('shipping-fee').innerText = `₹${shipping.toFixed(2)}`;
    if (document.getElementById('savings-total')) document.getElementById('savings-total').innerText = `₹${savings.toFixed(2)}`;
    if (document.getElementById('cart-total')) document.getElementById('cart-total').innerText = `₹${total.toFixed(2)}`;
}


window.updateCartQty = function(i, change) {
    const item = cart[i];
    const newQty = item.qty + change;
    if (newQty < 1) return;
    if (newQty > item.maxStock) return showRoyalToast('Stock Limitation', `Only ${item.maxStock} units available.`, true);
    item.qty = newQty;
    saveCart();
    initCartPage();
};

window.removeFromCart = function(i) {
    showRoyalConfirm("Remove Item", "Are you sure you want to remove this item from your bag?", () => {
        cart.splice(i, 1);
        saveCart();
        initCartPage();
        showRoyalToast("Bag Updated", "Item removed successfully.", false);
    });
};

window.moveCartItemToWishlist = function(i) {
    const item = cart[i];
    loadWishlist();
    const already = wishlist.find(w => w.id === item.id);
    if (!already) {
        wishlist.push({ id: item.id, name: item.name, img: item.img, price: item.price });
        saveWishlist();
        updateWishlistCount();
    }
    cart.splice(i, 1);
    saveCart();
    initCartPage();
    showRoyalToast('Moved to Wishlist', `${item.name.split('(')[0].trim()} added to your wishlist.`);
};


window.openCheckout = async function() {
    if(cart.length === 0) return showRoyalToast("Empty Bag", "Your bag is empty.", true);
    
    if (!isUserLoggedIn) {
        // Double check session to avoid timing race conditions
        if (sb) {
            try {
                const { data: { session } } = await sb.auth.getSession();
                if (session && session.user) {
                    isUserLoggedIn = true;
                    currentNotificationsKey = `royal_notifications_${session.user.id}`;
                    loadNotifications();
                    updateNotificationsCount();
                }
            } catch(e) {}
        }
    }

    if (!isUserLoggedIn) {
        showRoyalConfirm(
            "Sign In Required",
            "Please sign in or sign up to proceed to checkout and place your order.",
            () => {
                localStorage.setItem('login_redirect', window.location.href);
                window.location.href = 'login.html';
            }
        );
        return;
    }

    // Autofill based on profile saved details
    if (typeof sb !== 'undefined' && sb) {
        try {
            const { data: { session } } = await sb.auth.getSession();
            if (session && session.user) {
                const user = session.user;
                const metadata = user.user_metadata || {};
                
                const custName = document.getElementById('cust-name');
                const custEmail = document.getElementById('cust-email');
                const custPhone = document.getElementById('cust-phone-number');
                const custAddress = document.getElementById('cust-address');
                
                if (custName && !custName.value && metadata.full_name) {
                    custName.value = metadata.full_name;
                }
                if (custEmail && user.email) {
                    custEmail.value = user.email;
                    custEmail.readOnly = true;
                }
                if (custPhone && !custPhone.value && metadata.phone) {
                    const cleanPhone = metadata.phone.replace(/\D/g, '');
                    custPhone.value = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;
                }
                if (custAddress && !custAddress.value && metadata.address) {
                    custAddress.value = metadata.address;
                }
                
                const custPostcode = document.getElementById('cust-postcode');
                if (custPostcode && !custPostcode.value) {
                    if (metadata.postcode) {
                        custPostcode.value = metadata.postcode;
                    } else if (metadata.pincode) {
                        custPostcode.value = metadata.pincode;
                    } else if (metadata.address) {
                        const pincodeMatch = metadata.address.match(/\b\d{6}\b/);
                        if (pincodeMatch) {
                            custPostcode.value = pincodeMatch[0];
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error autofilling checkout from session:", err);
        }
    }
    
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
    if(!sb) return showRoyalToast("Connecting", "Still connecting to server. Please wait a moment.", true);

    if (!isUserLoggedIn) {
        if (sb) {
            try {
                const { data: { session } } = await sb.auth.getSession();
                if (session && session.user) {
                    isUserLoggedIn = true;
                    currentNotificationsKey = `royal_notifications_${session.user.id}`;
                    loadNotifications();
                    updateNotificationsCount();
                }
            } catch(err) {}
        }
    }

    if (!isUserLoggedIn) {
        showRoyalConfirm(
            "Sign In Required",
            "Please sign in or sign up to place your order.",
            () => {
                localStorage.setItem('login_redirect', window.location.href);
                window.location.href = 'login.html';
            }
        );
        return;
    }

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
            addNotification('Order Placed Successfully', `Your Cash on Delivery order <strong style="color:var(--color-accent)">#${createData.dbOrderId}</strong> of <strong>₹${createData.amount / 100}</strong> has been secured successfully!`, 'order');
            cart = []; saveCart(); window.closeCheckout();
            window.location.href = `thankyou.html?orderId=${createData.dbOrderId}&totalAmount=${createData.amount / 100}`;
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
                    showRoyalToast("Verification Failed", "Payment Verification Failed. Please contact support.", true);
                } else {
                    addNotification('Order Paid Successfully', `Your payment for order <strong style="color:var(--color-accent)">#${createData.dbOrderId}</strong> has been verified, and your order of <strong>₹${createData.amount/100}</strong> is being processed.`, 'order');
                    cart = []; saveCart(); window.closeCheckout();
                    window.location.href = `thankyou.html?orderId=${createData.dbOrderId}&totalAmount=${createData.amount/100}`;
                }
            },
            "prefill": { "name": orderInfo.name, "email": orderInfo.email, "contact": orderInfo.phone },
            "theme": { "color": "#121212" },
            "modal": { ondismiss: () => { btn.disabled = false; btn.innerText = originalText; } }
        };
        
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response){ showRoyalToast("Payment Failed", response.error.description, true); btn.disabled = false; btn.innerText = originalText; });
        rzp.open();

    } catch (err) {
        console.error(err);
        showRoyalToast("Order Error", err.message, true);
        btn.disabled = false; btn.innerText = originalText;
    }
};

async function initHomePage() {
    if(!sb) return;
    const container = document.getElementById('home-products-grid');
    if (!container) return;
    
    // 1. Fetch and render Latest Arrivals
    try {
        const { data: products } = await sb.from('products')
            .select('*')
            .neq('category', 'innerwears')
            .order('id', {ascending: false})
            .limit(8);
            
        if (products && products.length > 0) {
            renderProducts(products, container, { isNew: true });
        }
    } catch(e) { console.error("Error loading latest arrivals:", e); }

    // 2. Render Recently Viewed items
    try {
        let recentIds = [];
        const saved = localStorage.getItem('royal_recently_viewed');
        if (saved) {
            recentIds = JSON.parse(saved);
        }

        if (recentIds && recentIds.length > 0) {
            const { data: recentProducts } = await sb.from('products')
                .select('*')
                .in('id', recentIds);

            if (recentProducts && recentProducts.length > 0) {
                // Keep the exact chronological order of recentIds
                const sortedRecent = recentIds
                    .map(id => recentProducts.find(p => Number(p.id) === Number(id)))
                    .filter(Boolean);

                const rvSection = document.getElementById('recently-viewed');
                const rvGrid = document.getElementById('recently-viewed-products-grid');
                if (rvSection && rvGrid && sortedRecent.length > 0) {
                    rvGrid.innerHTML = '';
                    rvSection.style.display = 'block';
                    renderProducts(sortedRecent, rvGrid);
                }
            }
        }
    } catch(e) { console.error("Error loading recently viewed products:", e); }

    // 3. Hero Carousel auto-motion controller
    const carousel = document.querySelector('.hero-carousel-wrapper');
    if (carousel) {
        const slides = carousel.querySelectorAll('.hero-slide');
        const indicators = carousel.querySelectorAll('.indicator');
        const prevBtn = carousel.querySelector('.carousel-control.prev');
        const nextBtn = carousel.querySelector('.carousel-control.next');
        let currentIdx = 0;
        let timer = null;

        function showSlide(idx) {
            slides.forEach((slide, i) => {
                slide.classList.toggle('active', i === idx);
            });
            indicators.forEach((indicator, i) => {
                indicator.classList.toggle('active', i === idx);
            });
            currentIdx = idx;
        }

        function nextSlide() {
            let nextIdx = (currentIdx + 1) % slides.length;
            showSlide(nextIdx);
        }

        function prevSlide() {
            let prevIdx = (currentIdx - 1 + slides.length) % slides.length;
            showSlide(prevIdx);
        }

        function startTimer() {
            stopTimer();
            timer = setInterval(nextSlide, 5000);
        }

        function stopTimer() {
            if (timer) clearInterval(timer);
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                prevNextClick(nextSlide);
            });
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                prevNextClick(prevSlide);
            });
        }

        function prevNextClick(action) {
            action();
            startTimer();
        }

        indicators.forEach((indicator, idx) => {
            indicator.addEventListener('click', (e) => {
                e.preventDefault();
                showSlide(idx);
                startTimer();
            });
        });

        // Start auto play
        startTimer();

        // Pause on hover
        carousel.addEventListener('mouseenter', stopTimer);
        carousel.addEventListener('mouseleave', startTimer);
    }
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

function renderProducts(products, container, options = {}) {
    if(!Array.isArray(products)) return;

    window.renderedProducts = window.renderedProducts || {};
    products.forEach(p => {
        window.renderedProducts[p.id] = p;
    });

    // Possible discount levels — varied and realistic
    const DISCOUNT_LEVELS = [10, 15, 20, 25, 30, 35, 40, 45, 50];

    container.innerHTML = products.map(p => {
        const isWish = isProductInWishlist(p.id);
        const heartClass = isWish ? 'fas fa-heart' : 'far fa-heart';
        const heartStyle = isWish ? 'color: var(--color-error);' : '';
        
        let badgeHtml = '';
        if (options.badgeText) {
            badgeHtml = `<span class="product-badge">${escapeHtml(options.badgeText)}</span>`;
        } else if (options.isBestseller) {
            badgeHtml = `<span class="product-badge bestseller">BEST SELLER</span>`;
        } else if (options.isNew) {
            badgeHtml = `<span class="product-badge new">NEW</span>`;
        }

        // Deterministically decide if this product gets an offer badge and what %
        // Uses product ID so the same product always shows the same result
        const seed = Number(p.id) || 0;
        const showOffer = (seed % 10) < 7; // ~70% of products get an offer badge
        const discountPct = showOffer ? DISCOUNT_LEVELS[seed % DISCOUNT_LEVELS.length] : 0;
        const multiplier = discountPct > 0 ? (100 / (100 - discountPct)) : 1;
        const origPrice = discountPct > 0 ? Math.round(p.price * multiplier) : 0;

        const offerBadgeHtml = showOffer
            ? `<span class="card-offer-badge">${discountPct}% OFF</span>`
            : '';
        const origPriceHtml = showOffer
            ? `<span class="card-price-orig">₹${origPrice}</span>`
            : '';
        const discountPctHtml = showOffer
            ? `<span class="card-discount-pct">${discountPct}% off</span>`
            : '';

        return `<div class="product-card">
            <div class="product-image-wrapper">
                ${badgeHtml}
                ${offerBadgeHtml}
                <a href="product.html?id=${p.id}">
                    <img src="${p.image_url}" alt="${escapeHtml(p.name)}">
                </a>
                <div class="product-actions">
                    <button class="action-btn" onclick="event.preventDefault(); toggleWishlist(${p.id}, '${escapeHtml(p.name)}', ${p.price}, '${p.image_url}');" title="Add to Wishlist">
                        <i id="heart-icon-${p.id}" class="${heartClass}" style="${heartStyle}"></i>
                    </button>
                </div>
            </div>
            <div class="product-details">
                <h4 class="product-title"><a href="product.html?id=${p.id}">${escapeHtml(p.name)}</a></h4>
                <div class="product-price-row">
                    <span class="card-price-current">₹${p.price}</span>
                    ${origPriceHtml}
                    ${discountPctHtml}
                </div>
                <a href="product.html?id=${p.id}" onclick="event.preventDefault(); buyNowDirectly(${p.id});" class="card-buy-now-btn">Buy Now</a>
            </div>
        </div>`;
    }).join('');
}

async function initProductDetail() {
    if(!sb) return;
    const id = new URLSearchParams(window.location.search).get('id');
    if(!id) return;
    
    try {
        const { data: p } = await sb.from('products').select('*').eq('id', id).single();
        if(!p) return;
        
        trackRecentlyViewed(p.id);
        
        // Defensive DOM updates
        const titleEl = document.getElementById('detail-title');
        if (titleEl) titleEl.innerText = p.name;
        
        const descEl = document.getElementById('detail-desc');
        if (descEl) descEl.innerText = p.description || '';
        
        const breadcrumbEl = document.getElementById('breadcrumb-name');
        if (breadcrumbEl) breadcrumbEl.innerText = p.name;
        
        const catEl = document.getElementById('detail-cat-tag');
        if (catEl) catEl.innerText = p.category ? p.category.toUpperCase() : 'LADIES';

        const breadcrumbCatEl = document.getElementById('breadcrumb-category');
        if (breadcrumbCatEl && p.category) {
            breadcrumbCatEl.innerText = p.category.charAt(0).toUpperCase() + p.category.slice(1);
            breadcrumbCatEl.href = `${p.category}.html`;
        }

        // Rating and reviews (mocked deterministically based on product ID)
        const seedRating = (Number(p.id) % 7) * 0.1 + 4.3; // rating between 4.3 and 4.9
        const ratingVal = seedRating.toFixed(1);
        const reviewsCount = (Number(p.id) * 3 + 17) % 250 + 24; // reviews count between 24 and 273

        const ratingNumEl = document.getElementById('detail-rating-number');
        if (ratingNumEl) ratingNumEl.innerText = ratingVal;

        const reviewsCountEl = document.getElementById('detail-reviews-count');
        if (reviewsCountEl) reviewsCountEl.innerText = `(${reviewsCount} reviews)`;

        // Attributes (tags) row
        const attributesRowEl = document.getElementById('detail-attributes-row');
        if (attributesRowEl) {
            let tags = [];
            const cat = p.category ? p.category.toLowerCase() : 'ladies';
            if (cat.includes('ladies')) {
                tags = ["100% Cotton", "Soft & Breathable", "Easy to Drape"];
            } else if (cat.includes('kids')) {
                tags = ["Pure Cotton", "Hypoallergenic", "Comfort Fit"];
            } else if (cat.includes('shoes')) {
                tags = ["Lightweight", "Durable Sole", "Premium Fit"];
            } else if (cat.includes('cosmetics') || cat.includes('jewelry')) {
                tags = ["Hypoallergenic", "Premium Polish", "Skin Friendly"];
            } else {
                tags = ["Luxury Collection", "Comfort Fit", "Breathable Material"];
            }
            attributesRowEl.innerHTML = tags.map(t => `<span>${t}</span>`).join('');
        }
        
        let variants = Array.isArray(p.variants) ? p.variants : [{ name: "Standard", images: [p.image_url], sizes: p.variants?.options || [{size:"Standard", price: p.price, stock: p.stock_quantity}] }];
        
        const imgGroup = document.getElementById('variant-selector-group');
        const imgContainer = document.getElementById('variant-buttons-container');
        const swatchGroup = null;
        const swatchContainer = null;
        
        // State tracking variables
        let selectedPrice = p.price;
        let selectedStock = p.stock_quantity;
        let selectedSize = "Standard";
        let selectedVariantName = "Standard";
        let selectedImage = p.image_url;

        function updateTotalPrice() {
            const qtyInput = document.getElementById('detail-qty');
            if(!qtyInput) return;
            
            let qty = parseInt(qtyInput.value) || 1;
            if(qty < 1) {
                qty = 1;
                qtyInput.value = 1;
            }
            if(qty > selectedStock) {
                qty = selectedStock;
                qtyInput.value = selectedStock;
                showRoyalToast('Stock Limitation', `Only ${selectedStock} units available.`, true);
            }
            
            const priceEl = document.getElementById('detail-price');
            if(priceEl) {
                priceEl.innerText = `₹${(selectedPrice * qty).toLocaleString()}`;
            }
            
            const origEl = document.getElementById('detail-price-orig');
            if(origEl) {
                const origPrice = Math.floor(selectedPrice * 1.47); // Approx 32% off
                origEl.innerText = `₹${(origPrice * qty).toLocaleString()}`;
            }

            // Keep Add to Bag button click handler updated with current qty
            const cartBtn = document.getElementById('add-to-cart-btn');
            const buyBtn = document.getElementById('btn-buy') || document.querySelector('.btn-buy-now') || document.querySelector('.btn-buy');
            const discountBadge = document.getElementById('detail-discount-badge');

            if (discountBadge) {
                discountBadge.innerText = "32% OFF";
                discountBadge.style.display = "inline-block";
            }

            if (selectedStock > 0) {
                if (cartBtn) {
                    cartBtn.disabled = false;
                    cartBtn.innerText = "Add to Bag";
                    cartBtn.onclick = () => addToCart(p.id, p.name, selectedPrice, selectedImage, selectedStock, qty, selectedSize, selectedVariantName);
                }
                if (buyBtn) {
                    buyBtn.disabled = false;
                    buyBtn.onclick = async () => {
                        const added = await addToCart(p.id, p.name, selectedPrice, selectedImage, selectedStock, qty, selectedSize, selectedVariantName);
                        if (added) {
                            window.location.href = 'cart.html';
                        }
                    };
                }
            } else {
                if (cartBtn) {
                    cartBtn.disabled = true;
                    cartBtn.innerText = "Out of Stock";
                }
                if (buyBtn) {
                    buyBtn.disabled = true;
                }
            }
        }

        // Bind Quantity events
        const qtyInput = document.getElementById('detail-qty');
        if (qtyInput) {
            qtyInput.addEventListener('change', updateTotalPrice);
            qtyInput.addEventListener('input', updateTotalPrice);
        }

        const minusBtn = document.getElementById('qty-minus-btn');
        const plusBtn = document.getElementById('qty-plus-btn');
        if (minusBtn && qtyInput) {
            minusBtn.onclick = () => {
                qtyInput.stepDown();
                updateTotalPrice();
            };
        }
        if (plusBtn && qtyInput) {
            plusBtn.onclick = () => {
                qtyInput.stepUp();
                updateTotalPrice();
            };
        }
        
        const hasRealVariants = variants.length > 1 || (variants.length === 1 && variants[0].name !== "Standard");
        if (hasRealVariants && imgGroup && imgContainer) {
            imgGroup.style.display = 'block';
            imgContainer.innerHTML = '';
            
            variants.forEach((v, i) => {
                const b = document.createElement('button');
                b.className = 'variant-btn';
                b.title = v.name;
                b.onclick = () => selectVariant(i);
                
                if (v.images && v.images.length > 0) {
                    const img = document.createElement('img');
                    img.src = v.images[0];
                    b.appendChild(img);
                } else if (v.hex) {
                    const swatchInner = document.createElement('span');
                    swatchInner.style.width = '100%';
                    swatchInner.style.height = '100%';
                    swatchInner.style.borderRadius = '50%';
                    swatchInner.style.backgroundColor = v.hex;
                    swatchInner.style.display = 'block';
                    b.appendChild(swatchInner);
                } else {
                    b.style.borderRadius = 'var(--radius-sm)';
                    b.style.width = 'auto';
                    b.style.height = 'auto';
                    b.style.padding = '8px 12px';
                    b.innerText = v.name;
                }
                imgContainer.appendChild(b);
            });
            
            selectVariant(0);
        } else {
            if (imgGroup) imgGroup.style.display = 'none';
            selectVariant(0);
        }
        
        function selectVariant(idx) {
            // Update active states for variant buttons
            const imageBtns = imgContainer ? imgContainer.querySelectorAll('.variant-btn') : [];
            imageBtns.forEach((b, i) => b.classList.toggle('active', i === idx));
            
            const v = variants[idx];
            selectedVariantName = v.name;
            
            // Dynamically show the selected variant name in the control label
            const labelEl = document.querySelector('#variant-selector-group .control-label');
            if (labelEl) {
                labelEl.innerText = `Select Option (Color/Style): ${v.name}`;
            }
            
            selectedImage = v.images && v.images.length > 0 ? v.images[0] : p.image_url;
            
            const detailImg = document.getElementById('detail-img');
            if (detailImg) detailImg.src = selectedImage;
            
            const dotsContainer = document.getElementById('carousel-dots-container');
            const thumbsContainer = document.getElementById('product-thumbnails-container');
            const prevBtn = document.getElementById('prev-img-btn');
            const nextBtn = document.getElementById('next-img-btn');
            
            let currentImages = v.images && v.images.length > 0 ? v.images : [selectedImage];
            let currentImgIdx = 0;

            function updateGalleryImage(newIdx) {
                currentImgIdx = newIdx;
                if (detailImg) detailImg.src = currentImages[currentImgIdx];
                
                // Update active states
                document.querySelectorAll('.carousel-dot').forEach((d, i) => {
                    d.classList.toggle('active', i === currentImgIdx);
                });
                document.querySelectorAll('.thumb-item').forEach((t, i) => {
                    t.classList.toggle('active', i === currentImgIdx);
                });
            }

            // Setup Arrows
            if (prevBtn && nextBtn) {
                if (currentImages.length > 1) {
                    prevBtn.style.display = 'flex';
                    nextBtn.style.display = 'flex';
                    prevBtn.onclick = (e) => {
                        e.stopPropagation();
                        let targetIdx = (currentImgIdx - 1 + currentImages.length) % currentImages.length;
                        updateGalleryImage(targetIdx);
                    };
                    nextBtn.onclick = (e) => {
                        e.stopPropagation();
                        let targetIdx = (currentImgIdx + 1) % currentImages.length;
                        updateGalleryImage(targetIdx);
                    };
                } else {
                    prevBtn.style.display = 'none';
                    nextBtn.style.display = 'none';
                }
            }

            // Setup Dots
            if (dotsContainer) {
                dotsContainer.innerHTML = '';
                if (currentImages.length > 1) {
                    dotsContainer.style.display = 'flex';
                    currentImages.forEach((u, i) => {
                        const dot = document.createElement('span');
                        dot.className = `carousel-dot ${i === 0 ? 'active' : ''}`;
                        dot.onclick = () => updateGalleryImage(i);
                        dotsContainer.appendChild(dot);
                    });
                } else {
                    dotsContainer.style.display = 'none';
                }
            }

            // Setup Thumbnails
            if (thumbsContainer) {
                thumbsContainer.innerHTML = '';
                if (currentImages.length > 1) {
                    thumbsContainer.style.display = 'flex';
                    currentImages.forEach((u, i) => {
                        const thumb = document.createElement('img');
                        thumb.className = `thumb-item ${i === 0 ? 'active' : ''}`;
                        thumb.src = u;
                        thumb.alt = `Thumbnail ${i + 1}`;
                        thumb.onclick = () => updateGalleryImage(i);
                        thumbsContainer.appendChild(thumb);
                    });
                } else {
                    thumbsContainer.style.display = 'none';
                }
            }
            
            const sizeContainer = document.getElementById('size-buttons-container');
            if(sizeContainer) sizeContainer.innerHTML='';
            
            const btn = document.getElementById('add-to-cart-btn'); 
            if (btn) btn.disabled=true; 
            
            const priceEl = document.getElementById('detail-price');
            const origEl = document.getElementById('detail-price-orig');
            const stockEl = document.getElementById('stock-indicator');
            
            if(priceEl) priceEl.innerText = ""; 
            if(origEl) origEl.innerText = "";
            if(stockEl) stockEl.innerText = "";
            
            if(v.sizes && v.sizes.length>0 && sizeContainer) {
                // Show default price and stock from the first size immediately
                const defaultSize = v.sizes[0];
                selectedPrice = defaultSize.price;
                selectedStock = defaultSize.stock;
                selectedSize = defaultSize.size;
                if (qtyInput) qtyInput.value = 1;
                updateTotalPrice();

                v.sizes.forEach(s=> { 
                    const b=document.createElement('button'); 
                    b.className='pill-size-btn';
                    b.innerText=s.size; 
                    if(s.stock <= 0) b.disabled = true;
                    
                    b.onclick = () => {
                        document.querySelectorAll('.pill-size-btn').forEach(x=>x.classList.remove('active'));
                        b.classList.add('active');
                        
                        selectedPrice = s.price;
                        selectedStock = s.stock;
                        selectedSize = s.size;
                        
                        if(qtyInput) {
                            let qty = parseInt(qtyInput.value) || 1;
                            if (qty > selectedStock) qtyInput.value = selectedStock;
                        }
                        
                        updateTotalPrice();
                        
                        if(stockEl) {
                            if(s.stock>0) { 
                                stockEl.innerHTML = `<span class="stock-dot green-dot"></span> In Stock (${s.stock})`; 
                                stockEl.style.color = '#27ae60'; 
                            } else { 
                                stockEl.innerHTML = `<span class="stock-dot red-dot"></span> Out of Stock`; 
                                stockEl.style.color = '#e74c3c'; 
                            }
                        }
                    };
                    sizeContainer.appendChild(b); 
                });
                
                // auto-select first available size
                const firstAvailable = sizeContainer.querySelector('.pill-size-btn:not([disabled])');
                if(firstAvailable) {
                    firstAvailable.click();
                } else {
                    // fallback to the first size button if all are disabled
                    const firstBtn = sizeContainer.querySelector('.pill-size-btn');
                    if (firstBtn) {
                        firstBtn.classList.add('active');
                        selectedPrice = defaultSize.price;
                        selectedStock = defaultSize.stock;
                        selectedSize = defaultSize.size;
                        updateTotalPrice();
                        if (stockEl) {
                            stockEl.innerHTML = `<span class="stock-dot red-dot"></span> Out of Stock`;
                            stockEl.style.color = '#e74c3c';
                        }
                    }
                }
            } else { 
                if(sizeContainer) sizeContainer.innerHTML='<span style="color:#e74c3c; font-size: 0.9rem;">Unavailable</span>'; 
                selectedPrice = p.price;
                selectedStock = p.stock_quantity;
                selectedSize = "Standard";
                updateTotalPrice();
                if (stockEl) {
                    if (p.stock_quantity > 0) {
                        stockEl.innerHTML = `<span class="stock-dot green-dot"></span> In Stock (${p.stock_quantity})`;
                        stockEl.style.color = '#27ae60';
                    } else {
                        stockEl.innerHTML = `<span class="stock-dot red-dot"></span> Out of Stock`;
                        stockEl.style.color = '#e74c3c';
                    }
                }
            }
        }
        
        const wishBtn = document.getElementById('add-to-wishlist-btn');
        if(wishBtn) {
            const active = isProductInWishlist(p.id);
            const heartIcon = wishBtn.querySelector('i');
            if (heartIcon) {
                heartIcon.className = active ? 'fas fa-heart' : 'far fa-heart';
                heartIcon.style.color = active ? 'var(--color-error)' : '';
            }
            wishBtn.onclick = () => toggleWishlist(p.id, p.name, p.price, p.image_url);
        }

        const shareBtn = document.getElementById('img-share-btn');
        if (shareBtn) {
            shareBtn.onclick = async () => {
                const shareData = {
                    title: p.name,
                    text: p.description || `Check out ${p.name} on Royal Collections!`,
                    url: window.location.href
                };
                if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                    try {
                        await navigator.share(shareData);
                    } catch (err) {
                        if (err.name !== 'AbortError') {
                            console.error('Error sharing:', err);
                        }
                    }
                } else {
                    try {
                        await navigator.clipboard.writeText(window.location.href);
                        showRoyalToast('Link Copied', 'Product link copied to your clipboard!', false);
                    } catch (err) {
                        showRoyalToast('Error', 'Could not copy link to clipboard.', true);
                    }
                }
            };
        }
        
        initProductComments(p);
    } catch(e) { console.error("Detail Error", e); }
}

// ==========================================================================
// PRODUCT DETAIL COMMENTS & REVIEWS SYSTEM
// ==========================================================================
function initProductComments(product) {
    const commentsContainer = document.getElementById('product-comments-list');
    const commentForm = document.getElementById('product-comment-form');
    const starsContainer = document.getElementById('rating-stars-input-container');
    const ratingInput = document.getElementById('comment-rating');
    
    if (!commentsContainer || !commentForm) return;

    const productId = product.id;

    // Setup Rating Stars Click Handler in Form
    if (starsContainer && ratingInput) {
        const stars = starsContainer.querySelectorAll('i');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const val = parseInt(star.getAttribute('data-value')) || 5;
                ratingInput.value = val;
                
                // Highlight active stars
                stars.forEach(s => {
                    const sVal = parseInt(s.getAttribute('data-value'));
                    if (sVal <= val) {
                        s.className = 'fas fa-star active';
                    } else {
                        s.className = 'far fa-star';
                    }
                });
            });
            
            // Set initial style (5 stars active)
            star.className = 'fas fa-star active';
        });
    }

    // Default Seed Comments based on Category
    function getSeedComments() {
        const cat = product.category ? product.category.toLowerCase() : 'ladies';
        let items = [];
        
        if (cat.includes('ladies')) {
            items = [
                { author: "Ananya R.", rating: 5, text: "The embroidery is absolutely stunning! The fabric is soft, breathable, and fits perfectly. Highly recommend this boutique piece.", created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString() },
                { author: "Meera Nair", rating: 4, text: "Very elegant design. Got so many compliments at a family gathering. Standard delivery was fast.", created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString() }
            ];
        } else if (cat.includes('kids')) {
            items = [
                { author: "Priya Mohan", rating: 5, text: "Extremely soft cotton, highly suited for my daughter's sensitive skin. The color has not faded at all after multiple washes.", created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
                { author: "Deepa S.", rating: 4, text: "Very cute dress. True to size and quality is premium. Will purchase again.", created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() }
            ];
        } else if (cat.includes('shoes')) {
            items = [
                { author: "Rahul V.", rating: 5, text: "Great fit and extremely comfortable cushioned sole. Wore them the entire evening without any pain.", created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString() },
                { author: "Sangeetha K.", rating: 4, text: "Very stylish footwear. The sole has excellent grip and the material looks premium.", created_at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString() }
            ];
        } else {
            items = [
                { author: "Lakshmi Prasad", rating: 5, text: "Exceptional quality! Looks very premium and packaging was elegant. Worth every rupee.", created_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString() },
                { author: "Arjun Dev", rating: 5, text: "Superb boutique collection. Clean finishes and highly elegant design. 5 stars!", created_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString() }
            ];
        }
        return items;
    }

    // Load comments
    async function loadComments() {
        let list = [];
        
        // 1. Try Loading from Supabase
        if (sb) {
            try {
                const { data, error } = await sb.from('product_comments')
                    .select('*')
                    .eq('product_id', productId)
                    .order('created_at', { ascending: false });
                
                if (!error && data) {
                    list = data;
                } else {
                    throw new Error("Supabase table not found or unavailable.");
                }
            } catch (err) {
                // 2. Fallback to LocalStorage
                const localData = localStorage.getItem(`product_comments_${productId}`);
                if (localData) {
                    list = JSON.parse(localData);
                }
            }
        } else {
            // No Supabase, load from LocalStorage directly
            const localData = localStorage.getItem(`product_comments_${productId}`);
            if (localData) {
                list = JSON.parse(localData);
            }
        }

        // Add seed comments if no user comments exist yet
        const seedComments = getSeedComments();
        const allComments = [...list, ...seedComments];

        renderComments(allComments);
        updateHeaderRatings(allComments);
    }

    // Render comments list in DOM
    function renderComments(items) {
        if (items.length === 0) {
            commentsContainer.innerHTML = `<p style="color: var(--color-secondary); font-style: italic; text-align: center; padding: 20px 0;">No reviews yet. Be the first to write one!</p>`;
            return;
        }

        commentsContainer.innerHTML = items.map(c => {
            const starsHtml = Array.from({ length: 5 }, (_, idx) => {
                return idx < c.rating ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
            }).join('');
            
            const dateStr = new Date(c.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            return `
                <div class="comment-item">
                    <div class="comment-header">
                        <span class="comment-author">${escapeHtml(c.author)}</span>
                        <span class="comment-date">${dateStr}</span>
                    </div>
                    <div class="comment-rating">${starsHtml}</div>
                    <p class="comment-text-content">${escapeHtml(c.text)}</p>
                </div>
            `;
        }).join('');
    }

    // Dynamically update the overall rating count and stars on the page header
    function updateHeaderRatings(items) {
        const ratingNumEl = document.getElementById('detail-rating-number');
        const reviewsCountEl = document.getElementById('detail-reviews-count');
        
        if (items.length > 0) {
            const sum = items.reduce((acc, curr) => acc + curr.rating, 0);
            const avg = (sum / items.length).toFixed(1);
            
            if (ratingNumEl) ratingNumEl.innerText = avg;
            if (reviewsCountEl) reviewsCountEl.innerText = `(${items.length} reviews)`;
        }
    }

    // Submit Review Handler
    commentForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const authorInput = document.getElementById('comment-author');
        const textInput = document.getElementById('comment-text');
        
        if (!authorInput || !textInput) return;

        const author = authorInput.value.trim();
        const text = textInput.value.trim();
        const rating = parseInt(ratingInput.value) || 5;
        const createdAt = new Date().toISOString();

        if (!author || !text) return;

        const newComment = {
            product_id: productId,
            author: author,
            text: text,
            rating: rating,
            created_at: createdAt
        };

        // Prepend comment in UI for immediate feedback
        let localList = [];
        const localData = localStorage.getItem(`product_comments_${productId}`);
        if (localData) {
            localList = JSON.parse(localData);
        }
        localList.unshift(newComment);
        localStorage.setItem(`product_comments_${productId}`, JSON.stringify(localList));

        // Attempt saving to Supabase in background
        if (sb) {
            try {
                await sb.from('product_comments').insert([newComment]);
            } catch (err) {
                console.warn("Could not save comment to database, saved locally instead.");
            }
        }

        // Reset form inputs
        authorInput.value = '';
        textInput.value = '';
        ratingInput.value = '5';
        if (starsContainer) {
            starsContainer.querySelectorAll('i').forEach(s => s.className = 'fas fa-star active');
        }

        // Reload to show new list
        loadComments();
        showRoyalToast('Review Published', 'Thank you! Your review has been successfully published.', false);
    };

    // Load initial comments
    loadComments();
}


function trackRecentlyViewed(id) {
    try {
        let list = [];
        const saved = localStorage.getItem('royal_recently_viewed');
        if (saved) {
            list = JSON.parse(saved);
        }
        // Remove if already exists (to push to front)
        list = list.filter(item => Number(item) !== Number(id));
        // Add to front
        list.unshift(Number(id));
        // Limit to 4 items
        if (list.length > 4) {
            list = list.slice(0, 4);
        }
        localStorage.setItem('royal_recently_viewed', JSON.stringify(list));
    } catch(e) {
        console.error("Error tracking recently viewed:", e);
    }
}

async function initAdmin() {
    // 1. Client-Side Non-Auth UI Setup (always runs, even if Supabase is offline/null)
    try {
        document.getElementById('product-form')?.addEventListener('submit', handleProductSave);
        
        const zone = document.getElementById('ai-drag-drop-zone');
        if (zone) {
            // Prevent window from redirecting when file is dropped anywhere on the page
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                document.body.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, false);
                zone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                zone.addEventListener(eventName, () => {
                    zone.style.borderColor = 'var(--color-primary)';
                    zone.style.background = '#f1f5f9';
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                zone.addEventListener(eventName, () => {
                    zone.style.borderColor = '#cbd5e1';
                    zone.style.background = '#f8fafc';
                });
            });

            zone.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                    if (typeof window.handleAiFabricUpload === 'function') {
                        window.handleAiFabricUpload({ files: files });
                    }
                }
            });
        }
    } catch (uiErr) {
        console.error("Admin UI Init Error:", uiErr);
    }

    // 2. Supabase Auth and Dashboard Setup
    if(!sb) {
        console.warn("Supabase client is not initialized. Skipping admin auth setup.");
        return;
    }
    
    try {
        const { data: { session } } = await sb.auth.getSession();
        let isAdminUser = false;
        if (session) {
            const { data: isAdmin, error: rpcErr } = await sb.rpc('is_admin');
            if (isAdmin && !rpcErr) {
                isAdminUser = true;
            } else {
                window.location.href = 'profile.html';
                return;
            }
        }

        if (isAdminUser) {
            const loginScreen = document.getElementById('admin-login-screen');
            if(loginScreen) loginScreen.style.display = 'none';
            document.getElementById('admin-dashboard-content').style.display = 'block';
            document.getElementById('admin-logout-btn').style.display = 'inline-block';
            if (typeof initRoyalChatbot === 'function') {
                initRoyalChatbot();
            }
            if (typeof updateChatbotVisibility === 'function') {
                updateChatbotVisibility();
            }
            loadAdminDashboard();
            loadAdminOrders();
            loadAdminProducts();
        } else {
            const loginScreen = document.getElementById('admin-login-screen');
            if(loginScreen) loginScreen.style.display = 'flex';
            document.getElementById('admin-dashboard-content').style.display = 'none';
            if (typeof updateChatbotVisibility === 'function') {
                updateChatbotVisibility();
            }
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
    } catch(e) { console.error("Admin Auth Init Error:", e); }
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
            const varHex = block.querySelector('.variant-hex-input')?.value || "";
            const fileInput = block.querySelector('.variant-image-input');
            const existingJson = block.querySelector('.existing-images-json').value;
            
            let imageUrls = existingJson ? JSON.parse(existingJson) : [];
            
            if (fileInput.files.length > 0) {
                for(let file of fileInput.files) {
                    let uploadFile = file;
                    try { if (typeof imageCompression !== 'undefined') uploadFile = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: false }); } catch (err) {}
                    
                    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
                    const { error: uploadError } = await sb.storage.from('products').upload(fileName, uploadFile);
                    if(uploadError) throw uploadError;
                    
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
            variantsData.push({ name: varName, hex: varHex, images: imageUrls, sizes: sizesData });
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
        const { error: dbError } = id 
            ? await sb.from('products').update(payload).eq('id', id)
            : await sb.from('products').insert([payload]);

        if(dbError) throw dbError;
        
        showRoyalToast("Success", "Product Saved!");
        switchAdminTab('products-list-section');
        loadAdminProducts();
    } catch (err) { showRoyalToast("Error", err.message, true); } 
    finally { btn.disabled = false; btn.innerText = "Save Product"; }
}

async function loadAdminOrders() {
    if(!sb) return;
    const grid = document.getElementById('admin-orders-grid');
    if(!grid) return;
    grid.innerHTML = '<div class="empty-state">Loading...</div>';
    const { data: orders, error } = await sb.from('orders').select('*').neq('status', 'Pending Payment').order('created_at', { ascending: false }).limit(200);
    if (error) { grid.innerHTML = `<div class="empty-state">Error: ${error.message}</div>`; return; }
    if(!orders || orders.length === 0) { grid.innerHTML = '<div class="empty-state">No orders found.</div>'; currentAdminOrders = []; return; }
    currentAdminOrders = orders;
    renderOrderItems(orders);
}

async function loadAdminProducts() {
    if(!sb) return;
    const tbody = document.getElementById('admin-products-body');
    if(!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading Inventory...</td></tr>';

    const { data: products, error } = await sb.from('products').select('*').order('id', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:var(--color-error); text-align:center;">Error loading products: ${error.message}</td></tr>`;
        return;
    }

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No products found. Click "Add New" to start.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr>
            <td>
                <div style="display:flex; align-items:center;">
                    <img src="${p.image_url || ''}" class="admin-product-thumb" alt="img">
                    <span style="font-weight:600;">${escapeHtml(p.name)}</span>
                </div>
            </td>
            <td>${escapeHtml(p.category)}</td>
            <td>${p.stock_quantity}</td>
            <td style="text-align: right;">
                <button class="btn-icon" onclick="editProduct(${p.id})" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn-icon delete" onclick="deleteProduct(${p.id})" title="Delete"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');
}

async function renderOrderItems(orders) {
    const ids = orders.map(o => o.id);
    const { data: items } = await sb.from('order_items').select('*').in('order_id', ids);
    const html = orders.map(o => {
        const snapshot = Array.isArray(o.cart_snapshot) ? o.cart_snapshot : [];
        let orderItems = '';
        
        if (snapshot.length > 0) {
            orderItems = snapshot.map(item => `
                <div class="order-item-row" style="display: flex; align-items: center; gap: 15px; padding: 10px 0; border-bottom: 1px dashed #eee; justify-content: flex-start;">
                    <img src="${item.img || 'assets/placeholder.png'}" style="width: 45px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #eee; flex-shrink: 0;" alt="${escapeHtml(item.name)}">
                    <div style="flex-grow: 1; text-align: left;">
                        <div style="font-weight: 600; font-size: 0.88rem; color: #121212; line-height: 1.3;">${escapeHtml(item.name.split('(')[0].trim())}</div>
                        <div style="font-size: 0.75rem; color: #666; margin-top: 2px;">
                            Size: ${escapeHtml(item.size)} | Option: ${escapeHtml(item.variant || 'Standard')}
                        </div>
                        <div style="font-size: 0.75rem; color: #666; margin-top: 3px;">
                            Qty: ${item.qty} × ₹${item.price}
                        </div>
                    </div>
                    <strong style="font-size: 0.88rem; color: #121212; flex-shrink: 0; margin-left: 10px;">₹${(item.price * item.qty).toLocaleString()}</strong>
                </div>
            `).join('');
        } else {
            // Fallback to order_items for legacy orders
            const matchedItems = items ? items.filter(i => i.order_id === o.id) : [];
            orderItems = matchedItems.map(i => `
                <div class="order-item-row" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #eee; font-size: 0.88rem; width: 100%;">
                    <span>${escapeHtml(i.product_name)} x ${i.quantity}</span>
                    <span>₹${i.subtotal}</span>
                </div>
            `).join('');
        }
        
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

window.handleAdminLogout = async function() {
    showRoyalConfirm("Log Out", "Are you sure you want to log out of the admin panel?", async () => {
        await sb.auth.signOut();
        window.location.href = 'index.html';
    });
};

window.switchAdminTab = function(targetId) {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    
    const targetSection = document.getElementById(targetId);
    if (targetSection) targetSection.style.display = 'block';
    
    const btn = document.querySelector(`.nav-tab[onclick*="${targetId}"]`);
    if (btn) btn.classList.add('active');
    
    window.scrollTo(0,0);
};

window.addVariantBlock = function(data = null) {
    const container = document.getElementById('variants-container');
    const template = document.getElementById('variant-block-template');
    const clone = template.content.cloneNode(true);
    
    const fileInput = clone.querySelector('.variant-image-input');
    const previewEl = clone.querySelector('.variant-color-preview');
    const hexInput = clone.querySelector('.variant-hex-input');
    const nameInput = clone.querySelector('.variant-name-input');
    
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                // Clear and render local previews immediately
                const previewImgEl = fileInput.closest('.variant-block')?.querySelector('.variant-img-preview');
                if (previewImgEl) {
                    previewImgEl.innerHTML = '';
                    Array.from(files).forEach(f => {
                        const url = URL.createObjectURL(f);
                        previewImgEl.innerHTML += `<img src="${url}">`;
                    });
                }
                
                // No auto-detection here. Use AI Fabric Analyzer for color detection.
            }
        });
    }

    if(data) {
        clone.querySelector('.variant-name-input').value = data.name || '';
        if (data.hex) {
            if (hexInput) hexInput.value = data.hex;
            if (previewEl) {
                previewEl.style.backgroundColor = data.hex;
                previewEl.style.display = 'block';
            }
        }
        if (data.images) {
            clone.querySelector('.existing-images-json').value = JSON.stringify(data.images);
            const preview = clone.querySelector('.variant-img-preview');
            data.images.forEach(url => preview.innerHTML += `<img src="${url}">`);
        }
        if (data.localFiles) {
            const preview = clone.querySelector('.variant-img-preview');
            data.localFiles.forEach(f => {
                const url = URL.createObjectURL(f);
                preview.innerHTML += `<img src="${url}">`;
            });
        }
        const tbody = clone.querySelector('tbody');
        if (data.sizes && data.sizes.length > 0) {
            data.sizes.forEach(s => addSizeRow(tbody, s.size, s.price, s.stock));
        } else {
            addSizeRow(tbody);
        }
    } else { addSizeRow(clone.querySelector('tbody')); }
    
    const localFilesToAssign = (data && data.localFiles) ? data.localFiles : null;
    
    container.appendChild(clone);
    
    if (localFilesToAssign && fileInput) {
        try {
            const dt = new DataTransfer();
            localFilesToAssign.forEach(f => dt.items.add(f));
            fileInput.files = dt.files;
        } catch (err) {
            console.error("DataTransfer error post-append:", err);
        }
    }
};


function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

const GAMMA_LOOKUP = new Float32Array(256);
for (let i = 0; i < 256; i++) {
    let val = i / 255;
    GAMMA_LOOKUP[i] = val > 0.04045 ? Math.pow((val + 0.055) / 1.055, 2.4) : val / 12.92;
}

function rgbToLab(r, g, b) {
    const rN = GAMMA_LOOKUP[r];
    const gN = GAMMA_LOOKUP[g];
    const bN = GAMMA_LOOKUP[b];

    let x = rN * 0.4124 + gN * 0.3576 + bN * 0.1805;
    let y = rN * 0.2126 + gN * 0.7152 + bN * 0.0722;
    let z = rN * 0.0193 + gN * 0.1192 + bN * 0.9505;

    x /= 0.95047;
    y /= 1.00000;
    z /= 1.08883;

    x = x > 0.008856 ? Math.cbrt(x) : (7.787 * x) + (16/116);
    y = y > 0.008856 ? Math.cbrt(y) : (7.787 * y) + (16/116);
    z = z > 0.008856 ? Math.cbrt(z) : (7.787 * z) + (16/116);

    const L = (116 * y) - 16;
    const a = 500 * (x - y);
    const b_val = 200 * (y - z);

    return { L, a, b: b_val };
}

const COLOR_SHADES = [
    { name: "Grey", hex: "#545454", r: 84, g: 84, b: 84, baseColor: "gray" },
    { name: "Grey", hex: "#C0C0C0", r: 192, g: 192, b: 192, baseColor: "gray" },
    { name: "grey", hex: "#BEBEBE", r: 190, g: 190, b: 190, baseColor: "gray" },
    { name: "LightGray", hex: "#D3D3D3", r: 211, g: 211, b: 211, baseColor: "gray" },
    { name: "LightSlateGrey", hex: "#778899", r: 119, g: 136, b: 153, baseColor: "blue" },
    { name: "SlateGray", hex: "#708090", r: 112, g: 128, b: 144, baseColor: "blue" },
    { name: "SlateGray1", hex: "#C6E2FF", r: 198, g: 226, b: 255, baseColor: "blue" },
    { name: "SlateGray2", hex: "#B9D3EE", r: 185, g: 211, b: 238, baseColor: "blue" },
    { name: "SlateGray3", hex: "#9FB6CD", r: 159, g: 182, b: 205, baseColor: "blue" },
    { name: "SlateGray4", hex: "#6C7B8B", r: 108, g: 123, b: 139, baseColor: "blue" },
    { name: "black", hex: "#000000", r: 0, g: 0, b: 0, baseColor: "black" },
    { name: "grey0", hex: "#000000", r: 0, g: 0, b: 0, baseColor: "black" },
    { name: "grey1", hex: "#030303", r: 3, g: 3, b: 3, baseColor: "black" },
    { name: "grey2", hex: "#050505", r: 5, g: 5, b: 5, baseColor: "black" },
    { name: "grey3", hex: "#080808", r: 8, g: 8, b: 8, baseColor: "black" },
    { name: "grey4", hex: "#0A0A0A", r: 10, g: 10, b: 10, baseColor: "black" },
    { name: "grey5", hex: "#0D0D0D", r: 13, g: 13, b: 13, baseColor: "black" },
    { name: "grey6", hex: "#0F0F0F", r: 15, g: 15, b: 15, baseColor: "black" },
    { name: "grey7", hex: "#121212", r: 18, g: 18, b: 18, baseColor: "black" },
    { name: "grey8", hex: "#141414", r: 20, g: 20, b: 20, baseColor: "black" },
    { name: "grey9", hex: "#171717", r: 23, g: 23, b: 23, baseColor: "black" },
    { name: "grey10", hex: "#1A1A1A", r: 26, g: 26, b: 26, baseColor: "black" },
    { name: "grey11", hex: "#1C1C1C", r: 28, g: 28, b: 28, baseColor: "black" },
    { name: "grey12", hex: "#1F1F1F", r: 31, g: 31, b: 31, baseColor: "gray" },
    { name: "grey13", hex: "#212121", r: 33, g: 33, b: 33, baseColor: "gray" },
    { name: "grey14", hex: "#242424", r: 36, g: 36, b: 36, baseColor: "gray" },
    { name: "grey15", hex: "#262626", r: 38, g: 38, b: 38, baseColor: "gray" },
    { name: "grey16", hex: "#292929", r: 41, g: 41, b: 41, baseColor: "gray" },
    { name: "grey17", hex: "#2B2B2B", r: 43, g: 43, b: 43, baseColor: "gray" },
    { name: "grey18", hex: "#2E2E2E", r: 46, g: 46, b: 46, baseColor: "gray" },
    { name: "grey19", hex: "#303030", r: 48, g: 48, b: 48, baseColor: "gray" },
    { name: "grey20", hex: "#333333", r: 51, g: 51, b: 51, baseColor: "gray" },
    { name: "grey21", hex: "#363636", r: 54, g: 54, b: 54, baseColor: "gray" },
    { name: "grey22", hex: "#383838", r: 56, g: 56, b: 56, baseColor: "gray" },
    { name: "grey23", hex: "#3B3B3B", r: 59, g: 59, b: 59, baseColor: "gray" },
    { name: "grey24", hex: "#3D3D3D", r: 61, g: 61, b: 61, baseColor: "gray" },
    { name: "grey25", hex: "#404040", r: 64, g: 64, b: 64, baseColor: "gray" },
    { name: "grey26", hex: "#424242", r: 66, g: 66, b: 66, baseColor: "gray" },
    { name: "grey27", hex: "#454545", r: 69, g: 69, b: 69, baseColor: "gray" },
    { name: "grey28", hex: "#474747", r: 71, g: 71, b: 71, baseColor: "gray" },
    { name: "grey29", hex: "#4A4A4A", r: 74, g: 74, b: 74, baseColor: "gray" },
    { name: "grey30", hex: "#4D4D4D", r: 77, g: 77, b: 77, baseColor: "gray" },
    { name: "grey31", hex: "#4F4F4F", r: 79, g: 79, b: 79, baseColor: "gray" },
    { name: "grey32", hex: "#525252", r: 82, g: 82, b: 82, baseColor: "gray" },
    { name: "grey33", hex: "#545454", r: 84, g: 84, b: 84, baseColor: "gray" },
    { name: "grey34", hex: "#575757", r: 87, g: 87, b: 87, baseColor: "gray" },
    { name: "grey35", hex: "#595959", r: 89, g: 89, b: 89, baseColor: "gray" },
    { name: "grey36", hex: "#5C5C5C", r: 92, g: 92, b: 92, baseColor: "gray" },
    { name: "grey37", hex: "#5E5E5E", r: 94, g: 94, b: 94, baseColor: "gray" },
    { name: "grey38", hex: "#616161", r: 97, g: 97, b: 97, baseColor: "gray" },
    { name: "grey39", hex: "#636363", r: 99, g: 99, b: 99, baseColor: "gray" },
    { name: "grey40", hex: "#666666", r: 102, g: 102, b: 102, baseColor: "gray" },
    { name: "grey41", hex: "#696969", r: 105, g: 105, b: 105, baseColor: "gray" },
    { name: "grey42", hex: "#6B6B6B", r: 107, g: 107, b: 107, baseColor: "gray" },
    { name: "grey43", hex: "#6E6E6E", r: 110, g: 110, b: 110, baseColor: "gray" },
    { name: "grey44", hex: "#707070", r: 112, g: 112, b: 112, baseColor: "gray" },
    { name: "grey45", hex: "#737373", r: 115, g: 115, b: 115, baseColor: "gray" },
    { name: "grey46", hex: "#757575", r: 117, g: 117, b: 117, baseColor: "gray" },
    { name: "grey47", hex: "#787878", r: 120, g: 120, b: 120, baseColor: "gray" },
    { name: "grey48", hex: "#7A7A7A", r: 122, g: 122, b: 122, baseColor: "gray" },
    { name: "grey49", hex: "#7D7D7D", r: 125, g: 125, b: 125, baseColor: "gray" },
    { name: "grey50", hex: "#7F7F7F", r: 127, g: 127, b: 127, baseColor: "gray" },
    { name: "grey51", hex: "#828282", r: 130, g: 130, b: 130, baseColor: "gray" },
    { name: "grey52", hex: "#858585", r: 133, g: 133, b: 133, baseColor: "gray" },
    { name: "grey53", hex: "#878787", r: 135, g: 135, b: 135, baseColor: "gray" },
    { name: "grey54", hex: "#8A8A8A", r: 138, g: 138, b: 138, baseColor: "gray" },
    { name: "grey55", hex: "#8C8C8C", r: 140, g: 140, b: 140, baseColor: "gray" },
    { name: "grey56", hex: "#8F8F8F", r: 143, g: 143, b: 143, baseColor: "gray" },
    { name: "grey57", hex: "#919191", r: 145, g: 145, b: 145, baseColor: "gray" },
    { name: "grey58", hex: "#949494", r: 148, g: 148, b: 148, baseColor: "gray" },
    { name: "grey59", hex: "#969696", r: 150, g: 150, b: 150, baseColor: "gray" },
    { name: "grey60", hex: "#999999", r: 153, g: 153, b: 153, baseColor: "gray" },
    { name: "grey61", hex: "#9C9C9C", r: 156, g: 156, b: 156, baseColor: "gray" },
    { name: "grey62", hex: "#9E9E9E", r: 158, g: 158, b: 158, baseColor: "gray" },
    { name: "grey63", hex: "#A1A1A1", r: 161, g: 161, b: 161, baseColor: "gray" },
    { name: "grey64", hex: "#A3A3A3", r: 163, g: 163, b: 163, baseColor: "gray" },
    { name: "grey65", hex: "#A6A6A6", r: 166, g: 166, b: 166, baseColor: "gray" },
    { name: "grey66", hex: "#A8A8A8", r: 168, g: 168, b: 168, baseColor: "gray" },
    { name: "grey67", hex: "#ABABAB", r: 171, g: 171, b: 171, baseColor: "gray" },
    { name: "grey68", hex: "#ADADAD", r: 173, g: 173, b: 173, baseColor: "gray" },
    { name: "grey69", hex: "#B0B0B0", r: 176, g: 176, b: 176, baseColor: "gray" },
    { name: "grey70", hex: "#B3B3B3", r: 179, g: 179, b: 179, baseColor: "gray" },
    { name: "grey71", hex: "#B5B5B5", r: 181, g: 181, b: 181, baseColor: "gray" },
    { name: "grey72", hex: "#B8B8B8", r: 184, g: 184, b: 184, baseColor: "gray" },
    { name: "grey73", hex: "#BABABA", r: 186, g: 186, b: 186, baseColor: "gray" },
    { name: "grey74", hex: "#BDBDBD", r: 189, g: 189, b: 189, baseColor: "gray" },
    { name: "grey75", hex: "#BFBFBF", r: 191, g: 191, b: 191, baseColor: "gray" },
    { name: "grey76", hex: "#C2C2C2", r: 194, g: 194, b: 194, baseColor: "gray" },
    { name: "grey77", hex: "#C4C4C4", r: 196, g: 196, b: 196, baseColor: "gray" },
    { name: "grey78", hex: "#C7C7C7", r: 199, g: 199, b: 199, baseColor: "gray" },
    { name: "grey79", hex: "#C9C9C9", r: 201, g: 201, b: 201, baseColor: "gray" },
    { name: "grey80", hex: "#CCCCCC", r: 204, g: 204, b: 204, baseColor: "gray" },
    { name: "grey81", hex: "#CFCFCF", r: 207, g: 207, b: 207, baseColor: "gray" },
    { name: "grey82", hex: "#D1D1D1", r: 209, g: 209, b: 209, baseColor: "gray" },
    { name: "grey83", hex: "#D4D4D4", r: 212, g: 212, b: 212, baseColor: "gray" },
    { name: "grey84", hex: "#D6D6D6", r: 214, g: 214, b: 214, baseColor: "gray" },
    { name: "grey85", hex: "#D9D9D9", r: 217, g: 217, b: 217, baseColor: "gray" },
    { name: "grey86", hex: "#DBDBDB", r: 219, g: 219, b: 219, baseColor: "gray" },
    { name: "grey87", hex: "#DEDEDE", r: 222, g: 222, b: 222, baseColor: "gray" },
    { name: "grey88", hex: "#E0E0E0", r: 224, g: 224, b: 224, baseColor: "gray" },
    { name: "grey89", hex: "#E3E3E3", r: 227, g: 227, b: 227, baseColor: "gray" },
    { name: "grey90", hex: "#E5E5E5", r: 229, g: 229, b: 229, baseColor: "gray" },
    { name: "grey91", hex: "#E8E8E8", r: 232, g: 232, b: 232, baseColor: "gray" },
    { name: "grey92", hex: "#EBEBEB", r: 235, g: 235, b: 235, baseColor: "gray" },
    { name: "grey93", hex: "#EDEDED", r: 237, g: 237, b: 237, baseColor: "white" },
    { name: "grey94", hex: "#F0F0F0", r: 240, g: 240, b: 240, baseColor: "white" },
    { name: "grey95", hex: "#F2F2F2", r: 242, g: 242, b: 242, baseColor: "white" },
    { name: "grey96", hex: "#F5F5F5", r: 245, g: 245, b: 245, baseColor: "white" },
    { name: "grey97", hex: "#F7F7F7", r: 247, g: 247, b: 247, baseColor: "white" },
    { name: "grey98", hex: "#FAFAFA", r: 250, g: 250, b: 250, baseColor: "white" },
    { name: "grey99", hex: "#FCFCFC", r: 252, g: 252, b: 252, baseColor: "white" },
    { name: "grey100", hex: "#FFFFFF", r: 255, g: 255, b: 255, baseColor: "white" },
    { name: "Dark Slate Grey", hex: "#2F4F4F", r: 47, g: 79, b: 79, baseColor: "teal" },
    { name: "Dim Grey", hex: "#545454", r: 84, g: 84, b: 84, baseColor: "gray" },
    { name: "Very Light Grey", hex: "#CDCDCD", r: 205, g: 205, b: 205, baseColor: "gray" },
    { name: "Free Speech Grey", hex: "#635688", r: 99, g: 86, b: 136, baseColor: "purple" },
    { name: "AliceBlue", hex: "#F0F8FF", r: 240, g: 248, b: 255, baseColor: "blue" },
    { name: "BlueViolet", hex: "#8A2BE2", r: 138, g: 43, b: 226, baseColor: "purple" },
    { name: "Cadet Blue", hex: "#5F9F9F", r: 95, g: 159, b: 159, baseColor: "teal" },
    { name: "CadetBlue", hex: "#5F9EA0", r: 95, g: 158, b: 160, baseColor: "teal" },
    { name: "CadetBlue", hex: "#5F9EA0", r: 95, g: 158, b: 160, baseColor: "teal" },
    { name: "CadetBlue1", hex: "#98F5FF", r: 152, g: 245, b: 255, baseColor: "teal" },
    { name: "CadetBlue2", hex: "#8EE5EE", r: 142, g: 229, b: 238, baseColor: "teal" },
    { name: "CadetBlue3", hex: "#7AC5CD", r: 122, g: 197, b: 205, baseColor: "teal" },
    { name: "CadetBlue4", hex: "#53868B", r: 83, g: 134, b: 139, baseColor: "teal" },
    { name: "Corn Flower Blue", hex: "#42426F", r: 66, g: 66, b: 111, baseColor: "blue" },
    { name: "CornflowerBlue", hex: "#6495ED", r: 100, g: 149, b: 237, baseColor: "blue" },
    { name: "DarkSlateBlue", hex: "#483D8B", r: 72, g: 61, b: 139, baseColor: "blue" },
    { name: "DarkTurquoise", hex: "#00CED1", r: 0, g: 206, b: 209, baseColor: "teal" },
    { name: "DeepSkyBlue", hex: "#00BFFF", r: 0, g: 191, b: 255, baseColor: "blue" },
    { name: "DeepSkyBlue1", hex: "#00BFFF", r: 0, g: 191, b: 255, baseColor: "blue" },
    { name: "DeepSkyBlue2", hex: "#00B2EE", r: 0, g: 178, b: 238, baseColor: "blue" },
    { name: "DeepSkyBlue3", hex: "#009ACD", r: 0, g: 154, b: 205, baseColor: "blue" },
    { name: "DeepSkyBlue4", hex: "#00688B", r: 0, g: 104, b: 139, baseColor: "blue" },
    { name: "DodgerBlue", hex: "#1E90FF", r: 30, g: 144, b: 255, baseColor: "blue" },
    { name: "DodgerBlue1", hex: "#1E90FF", r: 30, g: 144, b: 255, baseColor: "blue" },
    { name: "DodgerBlue2", hex: "#1C86EE", r: 28, g: 134, b: 238, baseColor: "blue" },
    { name: "DodgerBlue3", hex: "#1874CD", r: 24, g: 116, b: 205, baseColor: "blue" },
    { name: "DodgerBlue4", hex: "#104E8B", r: 16, g: 78, b: 139, baseColor: "blue" },
    { name: "LightBlue", hex: "#ADD8E6", r: 173, g: 216, b: 230, baseColor: "blue" },
    { name: "LightBlue1", hex: "#BFEFFF", r: 191, g: 239, b: 255, baseColor: "blue" },
    { name: "LightBlue2", hex: "#B2DFEE", r: 178, g: 223, b: 238, baseColor: "blue" },
    { name: "LightBlue3", hex: "#9AC0CD", r: 154, g: 192, b: 205, baseColor: "blue" },
    { name: "LightBlue4", hex: "#68838B", r: 104, g: 131, b: 139, baseColor: "teal" },
    { name: "LightCyan", hex: "#E0FFFF", r: 224, g: 255, b: 255, baseColor: "teal" },
    { name: "LightCyan1", hex: "#E0FFFF", r: 224, g: 255, b: 255, baseColor: "teal" },
    { name: "LightCyan2", hex: "#D1EEEE", r: 209, g: 238, b: 238, baseColor: "teal" },
    { name: "LightCyan3", hex: "#B4CDCD", r: 180, g: 205, b: 205, baseColor: "teal" },
    { name: "LightCyan4", hex: "#7A8B8B", r: 122, g: 139, b: 139, baseColor: "teal" },
    { name: "LightSkyBlue", hex: "#87CEFA", r: 135, g: 206, b: 250, baseColor: "blue" },
    { name: "LightSkyBlue1", hex: "#B0E2FF", r: 176, g: 226, b: 255, baseColor: "blue" },
    { name: "LightSkyBlue2", hex: "#A4D3EE", r: 164, g: 211, b: 238, baseColor: "blue" },
    { name: "LightSkyBlue3", hex: "#8DB6CD", r: 141, g: 182, b: 205, baseColor: "blue" },
    { name: "LightSkyBlue4", hex: "#607B8B", r: 96, g: 123, b: 139, baseColor: "blue" },
    { name: "LightSlateBlue", hex: "#8470FF", r: 132, g: 112, b: 255, baseColor: "blue" },
    { name: "LightSteelBlue", hex: "#B0C4DE", r: 176, g: 196, b: 222, baseColor: "blue" },
    { name: "LightSteelBlue1", hex: "#CAE1FF", r: 202, g: 225, b: 255, baseColor: "blue" },
    { name: "LightSteelBlue2", hex: "#BCD2EE", r: 188, g: 210, b: 238, baseColor: "blue" },
    { name: "LightSteelBlue3", hex: "#A2B5CD", r: 162, g: 181, b: 205, baseColor: "blue" },
    { name: "LightSteelBlue4", hex: "#6E7B8B", r: 110, g: 123, b: 139, baseColor: "blue" },
    { name: "Aquamarine", hex: "#70DB93", r: 112, g: 219, b: 147, baseColor: "teal" },
    { name: "MediumBlue", hex: "#0000CD", r: 0, g: 0, b: 205, baseColor: "blue" },
    { name: "MediumSlateBlue", hex: "#7B68EE", r: 123, g: 104, b: 238, baseColor: "blue" },
    { name: "MediumTurquoise", hex: "#48D1CC", r: 72, g: 209, b: 204, baseColor: "teal" },
    { name: "MidnightBlue", hex: "#191970", r: 25, g: 25, b: 112, baseColor: "blue" },
    { name: "NavyBlue", hex: "#000080", r: 0, g: 0, b: 128, baseColor: "blue" },
    { name: "PaleTurquoise", hex: "#AFEEEE", r: 175, g: 238, b: 238, baseColor: "teal" },
    { name: "PaleTurquoise1", hex: "#BBFFFF", r: 187, g: 255, b: 255, baseColor: "teal" },
    { name: "PaleTurquoise2", hex: "#AEEEEE", r: 174, g: 238, b: 238, baseColor: "teal" },
    { name: "PaleTurquoise3", hex: "#96CDCD", r: 150, g: 205, b: 205, baseColor: "teal" },
    { name: "PaleTurquoise4", hex: "#668B8B", r: 102, g: 139, b: 139, baseColor: "teal" },
    { name: "PowderBlue", hex: "#B0E0E6", r: 176, g: 224, b: 230, baseColor: "teal" },
    { name: "RoyalBlue", hex: "#000000", r: 65, g: 105, b: 225, baseColor: "blue" },
    { name: "RoyalBlue1", hex: "#4876FF", r: 72, g: 118, b: 255, baseColor: "blue" },
    { name: "RoyalBlue2", hex: "#436EEE", r: 67, g: 110, b: 238, baseColor: "blue" },
    { name: "RoyalBlue3", hex: "#3A5FCD", r: 58, g: 95, b: 205, baseColor: "blue" },
    { name: "RoyalBlue4", hex: "#27408B", r: 39, g: 64, b: 139, baseColor: "blue" },
    { name: "RoyalBlue5", hex: "#002266", r: 0, g: 34, b: 102, baseColor: "blue" },
    { name: "SkyBlue", hex: "#87CEEB", r: 135, g: 206, b: 235, baseColor: "blue" },
    { name: "SkyBlue1", hex: "#87CEFF", r: 135, g: 206, b: 255, baseColor: "blue" },
    { name: "SkyBlue2", hex: "#7EC0EE", r: 126, g: 192, b: 238, baseColor: "blue" },
    { name: "SkyBlue3", hex: "#6CA6CD", r: 108, g: 166, b: 205, baseColor: "blue" },
    { name: "SkyBlue4", hex: "#4A708B", r: 74, g: 112, b: 139, baseColor: "blue" },
    { name: "SlateBlue", hex: "#6A5ACD", r: 106, g: 90, b: 205, baseColor: "blue" },
    { name: "SlateBlue1", hex: "#836FFF", r: 131, g: 111, b: 255, baseColor: "blue" },
    { name: "SlateBlue2", hex: "#7A67EE", r: 122, g: 103, b: 238, baseColor: "blue" },
    { name: "SlateBlue3", hex: "#6959CD", r: 105, g: 89, b: 205, baseColor: "blue" },
    { name: "SlateBlue4", hex: "#473C8B", r: 71, g: 60, b: 139, baseColor: "blue" },
    { name: "SteelBlue", hex: "#4682B4", r: 70, g: 130, b: 180, baseColor: "blue" },
    { name: "SteelBlue1", hex: "#63B8FF", r: 99, g: 184, b: 255, baseColor: "blue" },
    { name: "SteelBlue2", hex: "#5CACEE", r: 92, g: 172, b: 238, baseColor: "blue" },
    { name: "SteelBlue3", hex: "#4F94CD", r: 79, g: 148, b: 205, baseColor: "blue" },
    { name: "SteelBlue4", hex: "#36648B", r: 54, g: 100, b: 139, baseColor: "blue" },
    { name: "aquamarine", hex: "#7FFFD4", r: 127, g: 255, b: 212, baseColor: "teal" },
    { name: "aquamarine1", hex: "#7FFFD4", r: 127, g: 255, b: 212, baseColor: "teal" },
    { name: "aquamarine2", hex: "#76EEC6", r: 118, g: 238, b: 198, baseColor: "teal" },
    { name: "aquamarine3", hex: "#66CDAA", r: 102, g: 205, b: 170, baseColor: "teal" },
    { name: "aquamarine4", hex: "#458B74", r: 69, g: 139, b: 116, baseColor: "teal" },
    { name: "azure", hex: "#F0FFFF", r: 240, g: 255, b: 255, baseColor: "teal" },
    { name: "azure1", hex: "#F0FFFF", r: 240, g: 255, b: 255, baseColor: "teal" },
    { name: "azure2", hex: "#E0EEEE", r: 224, g: 238, b: 238, baseColor: "teal" },
    { name: "azure3", hex: "#C1CDCD", r: 193, g: 205, b: 205, baseColor: "gray" },
    { name: "azure4", hex: "#838B8B", r: 131, g: 139, b: 139, baseColor: "gray" },
    { name: "blue", hex: "#0000FF", r: 0, g: 0, b: 255, baseColor: "blue" },
    { name: "blue1", hex: "#0000FF", r: 0, g: 0, b: 255, baseColor: "blue" },
    { name: "blue2", hex: "#0000EE", r: 0, g: 0, b: 238, baseColor: "blue" },
    { name: "blue3", hex: "#0000CD", r: 0, g: 0, b: 205, baseColor: "blue" },
    { name: "blue4", hex: "#00008B", r: 0, g: 0, b: 139, baseColor: "blue" },
    { name: "aqua", hex: "#00FFFF", r: 0, g: 255, b: 255, baseColor: "teal" },
    { name: "True Iris Blue", hex: "#03B4CC", r: 3, g: 180, b: 204, baseColor: "teal" },
    { name: "cyan", hex: "#00FFFF", r: 0, g: 255, b: 255, baseColor: "teal" },
    { name: "cyan1", hex: "#00FFFF", r: 0, g: 255, b: 255, baseColor: "teal" },
    { name: "cyan2", hex: "#00EEEE", r: 0, g: 238, b: 238, baseColor: "teal" },
    { name: "cyan3", hex: "#00CDCD", r: 0, g: 205, b: 205, baseColor: "teal" },
    { name: "cyan4", hex: "#008B8B", r: 0, g: 139, b: 139, baseColor: "teal" },
    { name: "navy", hex: "#000080", r: 0, g: 0, b: 128, baseColor: "blue" },
    { name: "teal", hex: "#008080", r: 0, g: 128, b: 128, baseColor: "teal" },
    { name: "turquoise", hex: "#40E0D0", r: 64, g: 224, b: 208, baseColor: "teal" },
    { name: "turquoise1", hex: "#00F5FF", r: 0, g: 245, b: 255, baseColor: "teal" },
    { name: "turquoise2", hex: "#00E5EE", r: 0, g: 229, b: 238, baseColor: "teal" },
    { name: "turquoise3", hex: "#00C5CD", r: 0, g: 197, b: 205, baseColor: "teal" },
    { name: "turquoise4", hex: "#00868B", r: 0, g: 134, b: 139, baseColor: "teal" },
    { name: "DarkSlateGray", hex: "#2F4F4F", r: 47, g: 79, b: 79, baseColor: "teal" },
    { name: "DarkSlateGray1", hex: "#97FFFF", r: 151, g: 255, b: 255, baseColor: "teal" },
    { name: "DarkSlateGray2", hex: "#8DEEEE", r: 141, g: 238, b: 238, baseColor: "teal" },
    { name: "DarkSlateGray3", hex: "#79CDCD", r: 121, g: 205, b: 205, baseColor: "teal" },
    { name: "DarkSlateGray4", hex: "#528B8B", r: 82, g: 139, b: 139, baseColor: "teal" },
    { name: "Dark Slate Blue", hex: "#241882", r: 36, g: 24, b: 130, baseColor: "blue" },
    { name: "Dark Turquoise", hex: "#7093DB", r: 112, g: 147, b: 219, baseColor: "teal" },
    { name: "Medium Slate Blue", hex: "#7F00FF", r: 127, g: 0, b: 255, baseColor: "purple" },
    { name: "Medium Turquoise", hex: "#70DBDB", r: 112, g: 219, b: 219, baseColor: "teal" },
    { name: "Midnight Blue", hex: "#2F2F4F", r: 47, g: 47, b: 79, baseColor: "blue" },
    { name: "Navy Blue", hex: "#23238E", r: 35, g: 35, b: 142, baseColor: "blue" },
    { name: "Neon Blue", hex: "#4D4DFF", r: 77, g: 77, b: 255, baseColor: "blue" },
    { name: "New Midnight Blue", hex: "#00009C", r: 0, g: 0, b: 156, baseColor: "blue" },
    { name: "Rich Blue", hex: "#5959AB", r: 89, g: 89, b: 171, baseColor: "blue" },
    { name: "Sky Blue", hex: "#3299CC", r: 50, g: 153, b: 204, baseColor: "blue" },
    { name: "Slate Blue", hex: "#007FFF", r: 0, g: 127, b: 255, baseColor: "blue" },
    { name: "Summer Sky", hex: "#38B0DE", r: 56, g: 176, b: 222, baseColor: "blue" },
    { name: "Iris Blue", hex: "#03B4C8", r: 3, g: 180, b: 200, baseColor: "teal" },
    { name: "Free Speech Blue", hex: "#4156C5", r: 65, g: 86, b: 197, baseColor: "blue" },
    { name: "RosyBrown", hex: "#BC8F8F", r: 188, g: 143, b: 143, baseColor: "brown" },
    { name: "RosyBrown1", hex: "#FFC1C1", r: 255, g: 193, b: 193, baseColor: "brown" },
    { name: "RosyBrown2", hex: "#EEB4B4", r: 238, g: 180, b: 180, baseColor: "brown" },
    { name: "RosyBrown3", hex: "#CD9B9B", r: 205, g: 155, b: 155, baseColor: "brown" },
    { name: "RosyBrown4", hex: "#8B6969", r: 139, g: 105, b: 105, baseColor: "brown" },
    { name: "SaddleBrown", hex: "#8B4513", r: 139, g: 69, b: 19, baseColor: "brown" },
    { name: "SandyBrown", hex: "#F4A460", r: 244, g: 164, b: 96, baseColor: "brown" },
    { name: "beige", hex: "#F5F5DC", r: 245, g: 245, b: 220, baseColor: "brown" },
    { name: "brown", hex: "#A52A2A", r: 165, g: 42, b: 42, baseColor: "brown" },
    { name: "brown", hex: "#A62A2A", r: 166, g: 42, b: 42, baseColor: "brown" },
    { name: "brown1", hex: "#FF4040", r: 255, g: 64, b: 64, baseColor: "brown" },
    { name: "brown2", hex: "#EE3B3B", r: 238, g: 59, b: 59, baseColor: "brown" },
    { name: "brown3", hex: "#CD3333", r: 205, g: 51, b: 51, baseColor: "brown" },
    { name: "brown4", hex: "#8B2323", r: 139, g: 35, b: 35, baseColor: "brown" },
    { name: "dark brown", hex: "#5C4033", r: 92, g: 64, b: 51, baseColor: "brown" },
    { name: "burlywood", hex: "#DEB887", r: 222, g: 184, b: 135, baseColor: "orange" },
    { name: "burlywood1", hex: "#FFD39B", r: 255, g: 211, b: 155, baseColor: "orange" },
    { name: "burlywood2", hex: "#EEC591", r: 238, g: 197, b: 145, baseColor: "orange" },
    { name: "burlywood3", hex: "#CDAA7D", r: 205, g: 170, b: 125, baseColor: "orange" },
    { name: "burlywood4", hex: "#8B7355", r: 139, g: 115, b: 85, baseColor: "brown" },
    { name: "baker's chocolate", hex: "#5C3317", r: 92, g: 51, b: 23, baseColor: "brown" },
    { name: "chocolate", hex: "#D2691E", r: 210, g: 105, b: 30, baseColor: "brown" },
    { name: "chocolate1", hex: "#FF7F24", r: 255, g: 127, b: 36, baseColor: "brown" },
    { name: "chocolate2", hex: "#EE7621", r: 238, g: 118, b: 33, baseColor: "brown" },
    { name: "chocolate3", hex: "#CD661D", r: 205, g: 102, b: 29, baseColor: "brown" },
    { name: "chocolate4", hex: "#8B4513", r: 139, g: 69, b: 19, baseColor: "brown" },
    { name: "peru", hex: "#CD853F", r: 205, g: 133, b: 63, baseColor: "orange" },
    { name: "tan", hex: "#D2B48C", r: 210, g: 180, b: 140, baseColor: "brown" },
    { name: "tan1", hex: "#FFA54F", r: 255, g: 165, b: 79, baseColor: "brown" },
    { name: "tan2", hex: "#EE9A49", r: 238, g: 154, b: 73, baseColor: "brown" },
    { name: "tan3", hex: "#CD853F", r: 205, g: 133, b: 63, baseColor: "brown" },
    { name: "tan4", hex: "#8B5A2B", r: 139, g: 90, b: 43, baseColor: "brown" },
    { name: "Dark Tan", hex: "#97694F", r: 151, g: 105, b: 79, baseColor: "brown" },
    { name: "Dark Wood", hex: "#855E44", r: 133, g: 94, b: 66, baseColor: "brown" },
    { name: "Light Wood", hex: "#856363", r: 133, g: 99, b: 99, baseColor: "red" },
    { name: "Medium Wood", hex: "#A68064", r: 166, g: 128, b: 100, baseColor: "orange" },
    { name: "New Tan", hex: "#EBC79E", r: 235, g: 199, b: 158, baseColor: "brown" },
    { name: "Semi-Sweet Chocolate", hex: "#6B4226", r: 107, g: 66, b: 38, baseColor: "brown" },
    { name: "Sienna", hex: "#8E6B23", r: 142, g: 107, b: 35, baseColor: "orange" },
    { name: "Tan", hex: "#DB9370", r: 219, g: 147, b: 112, baseColor: "brown" },
    { name: "Very Dark Brown", hex: "#5C4033", r: 92, g: 64, b: 51, baseColor: "brown" },
    { name: "Dark Green", hex: "#2F4F2F", r: 47, g: 79, b: 47, baseColor: "green" },
    { name: "DarkGreen", hex: "#006400", r: 0, g: 100, b: 0, baseColor: "green" },
    { name: "dark green copper", hex: "#4A766E", r: 74, g: 118, b: 110, baseColor: "metallic" },
    { name: "DarkKhaki", hex: "#BDB76B", r: 189, g: 183, b: 107, baseColor: "yellow" },
    { name: "DarkOliveGreen", hex: "#556B2F", r: 85, g: 107, b: 47, baseColor: "green" },
    { name: "DarkOliveGreen1", hex: "#CAFF70", r: 202, g: 255, b: 112, baseColor: "green" },
    { name: "DarkOliveGreen2", hex: "#BCEE68", r: 188, g: 238, b: 104, baseColor: "green" },
    { name: "DarkOliveGreen3", hex: "#A2CD5A", r: 162, g: 205, b: 90, baseColor: "green" },
    { name: "DarkOliveGreen4", hex: "#6E8B3D", r: 110, g: 139, b: 61, baseColor: "green" },
    { name: "olive", hex: "#808000", r: 128, g: 128, b: 0, baseColor: "green" },
    { name: "DarkSeaGreen", hex: "#8FBC8F", r: 143, g: 188, b: 143, baseColor: "green" },
    { name: "DarkSeaGreen1", hex: "#C1FFC1", r: 193, g: 255, b: 193, baseColor: "green" },
    { name: "DarkSeaGreen2", hex: "#B4EEB4", r: 180, g: 238, b: 180, baseColor: "green" },
    { name: "DarkSeaGreen3", hex: "#9BCD9B", r: 155, g: 205, b: 155, baseColor: "green" },
    { name: "DarkSeaGreen4", hex: "#698B69", r: 105, g: 139, b: 105, baseColor: "green" },
    { name: "ForestGreen", hex: "#228B22", r: 34, g: 139, b: 34, baseColor: "green" },
    { name: "GreenYellow", hex: "#ADFF2F", r: 173, g: 255, b: 47, baseColor: "green" },
    { name: "LawnGreen", hex: "#7CFC00", r: 124, g: 252, b: 0, baseColor: "green" },
    { name: "LightSeaGreen", hex: "#20B2AA", r: 32, g: 178, b: 170, baseColor: "teal" },
    { name: "LimeGreen", hex: "#32CD32", r: 50, g: 205, b: 50, baseColor: "green" },
    { name: "MediumSeaGreen", hex: "#3CB371", r: 60, g: 179, b: 113, baseColor: "green" },
    { name: "MediumSpringGreen", hex: "#00FA9A", r: 0, g: 250, b: 154, baseColor: "green" },
    { name: "MintCream", hex: "#F5FFFA", r: 245, g: 255, b: 250, baseColor: "green" },
    { name: "OliveDrab", hex: "#6B8E23", r: 107, g: 142, b: 35, baseColor: "green" },
    { name: "OliveDrab1", hex: "#C0FF3E", r: 192, g: 255, b: 62, baseColor: "green" },
    { name: "OliveDrab2", hex: "#B3EE3A", r: 179, g: 238, b: 58, baseColor: "green" },
    { name: "OliveDrab3", hex: "#9ACD32", r: 154, g: 205, b: 50, baseColor: "green" },
    { name: "OliveDrab4", hex: "#698B22", r: 105, g: 139, b: 34, baseColor: "green" },
    { name: "PaleGreen", hex: "#98FB98", r: 152, g: 251, b: 152, baseColor: "green" },
    { name: "PaleGreen1", hex: "#9AFF9A", r: 154, g: 255, b: 154, baseColor: "green" },
    { name: "PaleGreen2", hex: "#90EE90", r: 144, g: 238, b: 144, baseColor: "green" },
    { name: "PaleGreen3", hex: "#7CCD7C", r: 124, g: 205, b: 124, baseColor: "green" },
    { name: "PaleGreen4", hex: "#548B54", r: 84, g: 139, b: 84, baseColor: "green" },
    { name: "SeaGreen", hex: "#2E8B57", r: 46, g: 139, b: 87, baseColor: "green" },
    { name: "SeaGreen1", hex: "#54FF9F", r: 84, g: 255, b: 159, baseColor: "green" },
    { name: "SeaGreen2", hex: "#4EEE94", r: 78, g: 238, b: 148, baseColor: "green" },
    { name: "SeaGreen3", hex: "#43CD80", r: 67, g: 205, b: 128, baseColor: "green" },
    { name: "SpringGreen", hex: "#00FF7F", r: 0, g: 255, b: 127, baseColor: "green" },
    { name: "SpringGreen1", hex: "#00FF7F", r: 0, g: 255, b: 127, baseColor: "green" },
    { name: "SpringGreen2", hex: "#00EE76", r: 0, g: 238, b: 118, baseColor: "green" },
    { name: "SpringGreen3", hex: "#00CD66", r: 0, g: 205, b: 102, baseColor: "green" },
    { name: "SpringGreen4", hex: "#008B45", r: 0, g: 139, b: 69, baseColor: "green" },
    { name: "YellowGreen", hex: "#9ACD32", r: 154, g: 205, b: 50, baseColor: "green" },
    { name: "chartreuse", hex: "#7FFF00", r: 127, g: 255, b: 0, baseColor: "green" },
    { name: "chartreuse1", hex: "#7FFF00", r: 127, g: 255, b: 0, baseColor: "green" },
    { name: "chartreuse2", hex: "#76EE00", r: 118, g: 238, b: 0, baseColor: "green" },
    { name: "chartreuse3", hex: "#66CD00", r: 102, g: 205, b: 0, baseColor: "green" },
    { name: "chartreuse4", hex: "#458B00", r: 69, g: 139, b: 0, baseColor: "green" },
    { name: "green", hex: "#00FF00", r: 0, g: 255, b: 0, baseColor: "green" },
    { name: "green", hex: "#008000", r: 0, g: 128, b: 0, baseColor: "green" },
    { name: "lime", hex: "#00FF00", r: 0, g: 255, b: 0, baseColor: "green" },
    { name: "green1", hex: "#00FF00", r: 0, g: 255, b: 0, baseColor: "green" },
    { name: "green2", hex: "#00EE00", r: 0, g: 238, b: 0, baseColor: "green" },
    { name: "green3", hex: "#00CD00", r: 0, g: 205, b: 0, baseColor: "green" },
    { name: "green4", hex: "#008B00", r: 0, g: 139, b: 0, baseColor: "green" },
    { name: "khaki", hex: "#F0E68C", r: 240, g: 230, b: 140, baseColor: "yellow" },
    { name: "khaki1", hex: "#FFF68F", r: 255, g: 246, b: 143, baseColor: "yellow" },
    { name: "khaki2", hex: "#EEE685", r: 238, g: 230, b: 133, baseColor: "yellow" },
    { name: "khaki3", hex: "#CDC673", r: 205, g: 198, b: 115, baseColor: "yellow" },
    { name: "khaki4", hex: "#8B864E", r: 139, g: 134, b: 78, baseColor: "yellow" },
    { name: "Dark Olive Green", hex: "#4F4F2F", r: 79, g: 79, b: 47, baseColor: "green" },
    { name: "Green Yellow", hex: "#D19275", r: 209, g: 146, b: 117, baseColor: "orange" },
    { name: "Hunter Green", hex: "#8E2323", r: 142, g: 35, b: 35, baseColor: "red" },
    { name: "Forest Green", hex: "#23238E", r: 35, g: 142, b: 35, baseColor: "green" },
    { name: "Medium Forest Green", hex: "#DBDB70", r: 219, g: 219, b: 112, baseColor: "yellow" },
    { name: "Medium Sea Green", hex: "#426F42", r: 66, g: 111, b: 66, baseColor: "green" },
    { name: "Medium Spring Green", hex: "#7FFF00", r: 127, g: 255, b: 0, baseColor: "green" },
    { name: "Pale Green", hex: "#8FBC8F", r: 143, g: 188, b: 143, baseColor: "green" },
    { name: "Sea Green", hex: "#238E6B", r: 35, g: 142, b: 104, baseColor: "green" },
    { name: "Spring Green", hex: "#00FF7F", r: 0, g: 255, b: 127, baseColor: "green" },
    { name: "Free Speech Green", hex: "#09F911", r: 9, g: 249, b: 17, baseColor: "green" },
    { name: "Free Speech Aquamarine", hex: "#029D74", r: 2, g: 157, b: 116, baseColor: "teal" },
    { name: "DarkOrange", hex: "#FF8C00", r: 255, g: 140, b: 0, baseColor: "orange" },
    { name: "DarkOrange1", hex: "#FF7F00", r: 255, g: 127, b: 0, baseColor: "orange" },
    { name: "DarkOrange2", hex: "#EE7600", r: 238, g: 118, b: 0, baseColor: "orange" },
    { name: "DarkOrange3", hex: "#CD6600", r: 205, g: 102, b: 0, baseColor: "orange" },
    { name: "DarkOrange4", hex: "#8B4500", r: 139, g: 69, b: 0, baseColor: "orange" },
    { name: "DarkSalmon", hex: "#E9967A", r: 233, g: 150, b: 122, baseColor: "orange" },
    { name: "LightCoral", hex: "#F08080", r: 240, g: 128, b: 128, baseColor: "orange" },
    { name: "LightSalmon", hex: "#FFA07A", r: 255, g: 160, b: 122, baseColor: "orange" },
    { name: "LightSalmon1", hex: "#FFA07A", r: 255, g: 160, b: 122, baseColor: "orange" },
    { name: "LightSalmon2", hex: "#EE9572", r: 238, g: 149, b: 114, baseColor: "orange" },
    { name: "LightSalmon3", hex: "#CD8162", r: 205, g: 129, b: 98, baseColor: "orange" },
    { name: "LightSalmon4", hex: "#8B5742", r: 139, g: 87, b: 66, baseColor: "brown" },
    { name: "PeachPuff", hex: "#FFDAB9", r: 255, g: 218, b: 185, baseColor: "orange" },
    { name: "PeachPuff1", hex: "#FFDAB9", r: 255, g: 218, b: 185, baseColor: "orange" },
    { name: "PeachPuff2", hex: "#EECBAD", r: 238, g: 203, b: 173, baseColor: "orange" },
    { name: "PeachPuff3", hex: "#CDAF95", r: 205, g: 175, b: 149, baseColor: "orange" },
    { name: "PeachPuff4", hex: "#8B7765", r: 139, g: 119, b: 101, baseColor: "orange" },
    { name: "bisque", hex: "#FFE4C4", r: 255, g: 228, b: 196, baseColor: "orange" },
    { name: "bisque1", hex: "#FFE4C4", r: 255, g: 228, b: 196, baseColor: "orange" },
    { name: "bisque2", hex: "#EED5B7", r: 238, g: 213, b: 183, baseColor: "orange" },
    { name: "bisque3", hex: "#CDB79E", r: 205, g: 183, b: 158, baseColor: "orange" },
    { name: "bisque4", hex: "#8B7D6B", r: 139, g: 125, b: 107, baseColor: "orange" },
    { name: "coral", hex: "#FF7F00", r: 255, g: 127, b: 0, baseColor: "orange" },
    { name: "coral", hex: "#FF7F50", r: 255, g: 127, b: 80, baseColor: "orange" },
    { name: "coral1", hex: "#FF7256", r: 255, g: 114, b: 86, baseColor: "orange" },
    { name: "coral2", hex: "#EE6A50", r: 238, g: 106, b: 80, baseColor: "orange" },
    { name: "coral3", hex: "#CD5B45", r: 205, g: 91, b: 69, baseColor: "orange" },
    { name: "coral4", hex: "#8B3E2F", r: 139, g: 62, b: 47, baseColor: "orange" },
    { name: "honeydew", hex: "#F0FFF0", r: 240, g: 255, b: 240, baseColor: "green" },
    { name: "honeydew1", hex: "#F0FFF0", r: 240, g: 255, b: 240, baseColor: "green" },
    { name: "honeydew2", hex: "#E0EEE0", r: 224, g: 238, b: 224, baseColor: "green" },
    { name: "honeydew3", hex: "#C1CDC1", r: 193, g: 205, b: 193, baseColor: "gray" },
    { name: "honeydew4", hex: "#838B83", r: 131, g: 139, b: 131, baseColor: "gray" },
    { name: "orange", hex: "#FFA500", r: 255, g: 165, b: 0, baseColor: "orange" },
    { name: "orange1", hex: "#FFA500", r: 255, g: 165, b: 0, baseColor: "orange" },
    { name: "orange2", hex: "#EE9A00", r: 238, g: 154, b: 0, baseColor: "orange" },
    { name: "orange3", hex: "#CD8500", r: 205, g: 133, b: 0, baseColor: "orange" },
    { name: "orange4", hex: "#8B5A00", r: 139, g: 90, b: 0, baseColor: "orange" },
    { name: "salmon", hex: "#FA8072", r: 250, g: 128, b: 114, baseColor: "pink" },
    { name: "salmon1", hex: "#FF8C69", r: 255, g: 140, b: 105, baseColor: "pink" },
    { name: "salmon2", hex: "#EE8262", r: 238, g: 130, b: 98, baseColor: "pink" },
    { name: "salmon3", hex: "#CD7054", r: 205, g: 112, b: 84, baseColor: "red" },
    { name: "salmon4", hex: "#8B4C39", r: 139, g: 76, b: 57, baseColor: "red" },
    { name: "sienna", hex: "#A0522D", r: 160, g: 82, b: 45, baseColor: "orange" },
    { name: "sienna1", hex: "#FF8247", r: 255, g: 130, b: 71, baseColor: "orange" },
    { name: "sienna2", hex: "#EE7942", r: 238, g: 121, b: 66, baseColor: "orange" },
    { name: "sienna3", hex: "#CD6839", r: 205, g: 104, b: 57, baseColor: "orange" },
    { name: "sienna4", hex: "#8B4726", r: 139, g: 71, b: 38, baseColor: "orange" },
    { name: "Mandarian Orange", hex: "#8E2323", r: 142, g: 35, b: 35, baseColor: "red" },
    { name: "Orange", hex: "#FF7F00", r: 255, g: 127, b: 0, baseColor: "orange" },
    { name: "Orange Red", hex: "#FF2400", r: 255, g: 36, b: 0, baseColor: "red" },
    { name: "DeepPink", hex: "#FF1493", r: 255, g: 20, b: 147, baseColor: "pink" },
    { name: "DeepPink1", hex: "#FF1493", r: 255, g: 20, b: 147, baseColor: "pink" },
    { name: "DeepPink2", hex: "#EE1289", r: 238, g: 18, b: 137, baseColor: "pink" },
    { name: "DeepPink3", hex: "#CD1076", r: 205, g: 16, b: 118, baseColor: "pink" },
    { name: "DeepPink4", hex: "#8B0A50", r: 139, g: 10, b: 80, baseColor: "pink" },
    { name: "HotPink", hex: "#FF69B4", r: 255, g: 105, b: 180, baseColor: "pink" },
    { name: "HotPink1", hex: "#FF6EB4", r: 255, g: 110, b: 180, baseColor: "pink" },
    { name: "HotPink2", hex: "#EE6AA7", r: 238, g: 106, b: 167, baseColor: "pink" },
    { name: "HotPink3", hex: "#CD6090", r: 205, g: 96, b: 144, baseColor: "pink" },
    { name: "HotPink4", hex: "#8B3A62", r: 139, g: 58, b: 98, baseColor: "pink" },
    { name: "IndianRed", hex: "#CD5C5C", r: 205, g: 92, b: 92, baseColor: "red" },
    { name: "IndianRed1", hex: "#FF6A6A", r: 255, g: 106, b: 106, baseColor: "pink" },
    { name: "IndianRed2", hex: "#EE6363", r: 238, g: 99, b: 99, baseColor: "pink" },
    { name: "IndianRed3", hex: "#CD5555", r: 205, g: 85, b: 85, baseColor: "red" },
    { name: "IndianRed4", hex: "#8B3A3A", r: 139, g: 58, b: 58, baseColor: "red" },
    { name: "LightPink", hex: "#FFB6C1", r: 255, g: 182, b: 193, baseColor: "pink" },
    { name: "LightPink1", hex: "#FFAEB9", r: 255, g: 174, b: 185, baseColor: "pink" },
    { name: "LightPink2", hex: "#EEA2AD", r: 238, g: 162, b: 173, baseColor: "pink" },
    { name: "LightPink3", hex: "#CD8C95", r: 205, g: 140, b: 149, baseColor: "pink" },
    { name: "LightPink4", hex: "#8B5F65", r: 139, g: 95, b: 101, baseColor: "pink" },
    { name: "MediumVioletRed", hex: "#C71585", r: 199, g: 21, b: 133, baseColor: "purple" },
    { name: "MistyRose", hex: "#FFE4E1", r: 255, g: 228, b: 225, baseColor: "pink" },
    { name: "MistyRose1", hex: "#FFE4E1", r: 255, g: 228, b: 225, baseColor: "pink" },
    { name: "MistyRose2", hex: "#EED5D2", r: 238, g: 213, b: 210, baseColor: "pink" },
    { name: "MistyRose3", hex: "#CDB7B5", r: 205, g: 183, b: 181, baseColor: "pink" },
    { name: "MistyRose4", hex: "#8B7D7B", r: 139, g: 125, b: 123, baseColor: "pink" },
    { name: "OrangeRed", hex: "#FF4500", r: 255, g: 69, b: 0, baseColor: "orange" },
    { name: "OrangeRed1", hex: "#FF4500", r: 255, g: 69, b: 0, baseColor: "orange" },
    { name: "OrangeRed2", hex: "#EE4000", r: 238, g: 64, b: 0, baseColor: "orange" },
    { name: "OrangeRed3", hex: "#CD3700", r: 205, g: 55, b: 0, baseColor: "orange" },
    { name: "OrangeRed4", hex: "#8B2500", r: 139, g: 37, b: 0, baseColor: "orange" },
    { name: "PaleVioletRed", hex: "#DB7093", r: 219, g: 112, b: 147, baseColor: "purple" },
    { name: "PaleVioletRed1", hex: "#FF82AB", r: 255, g: 130, b: 171, baseColor: "purple" },
    { name: "PaleVioletRed2", hex: "#EE799F", r: 238, g: 121, b: 159, baseColor: "purple" },
    { name: "PaleVioletRed3", hex: "#CD6889", r: 205, g: 104, b: 137, baseColor: "purple" },
    { name: "PaleVioletRed4", hex: "#8B475D", r: 139, g: 71, b: 93, baseColor: "purple" },
    { name: "VioletRed", hex: "#D02090", r: 208, g: 32, b: 144, baseColor: "purple" },
    { name: "VioletRed1", hex: "#FF3E96", r: 255, g: 62, b: 150, baseColor: "purple" },
    { name: "VioletRed2", hex: "#EE3A8C", r: 238, g: 58, b: 140, baseColor: "purple" },
    { name: "VioletRed3", hex: "#CD3278", r: 205, g: 50, b: 120, baseColor: "purple" },
    { name: "VioletRed4", hex: "#8B2252", r: 139, g: 34, b: 82, baseColor: "purple" },
    { name: "firebrick", hex: "#B22222", r: 178, g: 34, b: 34, baseColor: "red" },
    { name: "firebrick1", hex: "#FF3030", r: 255, g: 48, b: 48, baseColor: "red" },
    { name: "firebrick2", hex: "#EE2C2C", r: 238, g: 44, b: 44, baseColor: "red" },
    { name: "firebrick3", hex: "#CD2626", r: 205, g: 38, b: 38, baseColor: "red" },
    { name: "firebrick4", hex: "#8B1A1A", r: 139, g: 26, b: 26, baseColor: "red" },
    { name: "pink", hex: "#FFC0CB", r: 255, g: 192, b: 203, baseColor: "pink" },
    { name: "pink1", hex: "#FFB5C5", r: 255, g: 181, b: 197, baseColor: "pink" },
    { name: "pink2", hex: "#EEA9B8", r: 238, g: 169, b: 184, baseColor: "pink" },
    { name: "pink3", hex: "#CD919E", r: 205, g: 145, b: 158, baseColor: "pink" },
    { name: "pink4", hex: "#8B636C", r: 139, g: 99, b: 108, baseColor: "pink" },
    { name: "Flesh", hex: "#F5CCB0", r: 245, g: 204, b: 176, baseColor: "orange" },
    { name: "Feldspar", hex: "#D19275", r: 209, g: 146, b: 117, baseColor: "orange" },
    { name: "red", hex: "#FF0000", r: 255, g: 0, b: 0, baseColor: "red" },
    { name: "red1", hex: "#FF0000", r: 255, g: 0, b: 0, baseColor: "red" },
    { name: "red2", hex: "#EE0000", r: 238, g: 0, b: 0, baseColor: "red" },
    { name: "red3", hex: "#CD0000", r: 205, g: 0, b: 0, baseColor: "red" },
    { name: "red4", hex: "#8B0000", r: 139, g: 0, b: 0, baseColor: "red" },
    { name: "tomato", hex: "#FF6347", r: 255, g: 99, b: 71, baseColor: "pink" },
    { name: "tomato1", hex: "#FF6347", r: 255, g: 99, b: 71, baseColor: "pink" },
    { name: "tomato2", hex: "#EE5C42", r: 238, g: 92, b: 66, baseColor: "pink" },
    { name: "tomato3", hex: "#CD4F39", r: 205, g: 79, b: 57, baseColor: "red" },
    { name: "tomato4", hex: "#8B3626", r: 139, g: 54, b: 38, baseColor: "red" },
    { name: "Dusty Rose", hex: "#856363", r: 133, g: 99, b: 99, baseColor: "pink" },
    { name: "Firebrick", hex: "#8E2323", r: 142, g: 35, b: 35, baseColor: "red" },
    { name: "Indian Red", hex: "#F5CCB0", r: 245, g: 204, b: 176, baseColor: "orange" },
    { name: "Pink", hex: "#BC8F8F", r: 188, g: 143, b: 143, baseColor: "pink" },
    { name: "Salmon", hex: "#6F4242", r: 111, g: 66, b: 66, baseColor: "red" },
    { name: "Scarlet", hex: "#8C1717", r: 140, g: 23, b: 23, baseColor: "red" },
    { name: "Spicy Pink", hex: "#FF1CAE", r: 255, g: 28, b: 174, baseColor: "pink" },
    { name: "Free Speech Magenta", hex: "#E35BD8", r: 227, g: 91, b: 216, baseColor: "purple" },
    { name: "Free Speech Red", hex: "#C00000", r: 192, g: 0, b: 0, baseColor: "red" },
    { name: "DarkOrchid", hex: "#9932CC", r: 153, g: 50, b: 204, baseColor: "purple" },
    { name: "DarkOrchid1", hex: "#BF3EFF", r: 191, g: 62, b: 255, baseColor: "purple" },
    { name: "DarkOrchid2", hex: "#B23AEE", r: 178, g: 58, b: 238, baseColor: "purple" },
    { name: "DarkOrchid3", hex: "#9A32CD", r: 154, g: 50, b: 205, baseColor: "purple" },
    { name: "DarkOrchid4", hex: "#68228B", r: 104, g: 34, b: 139, baseColor: "purple" },
    { name: "DarkViolet", hex: "#9400D3", r: 148, g: 0, b: 211, baseColor: "purple" },
    { name: "LavenderBlush", hex: "#FFF0F5", r: 255, g: 240, b: 245, baseColor: "pink" },
    { name: "LavenderBlush1", hex: "#FFF0F5", r: 255, g: 240, b: 245, baseColor: "pink" },
    { name: "LavenderBlush2", hex: "#EEE0E5", r: 238, g: 224, b: 229, baseColor: "pink" },
    { name: "LavenderBlush3", hex: "#CDC1C5", r: 205, g: 193, b: 197, baseColor: "pink" },
    { name: "LavenderBlush4", hex: "#8B8386", r: 139, g: 131, b: 134, baseColor: "pink" },
    { name: "MediumOrchid", hex: "#BA55D3", r: 186, g: 85, b: 211, baseColor: "purple" },
    { name: "MediumOrchid1", hex: "#E066FF", r: 224, g: 102, b: 255, baseColor: "purple" },
    { name: "MediumOrchid2", hex: "#D15FEE", r: 209, g: 95, b: 238, baseColor: "purple" },
    { name: "MediumOrchid3", hex: "#B452CD", r: 180, g: 82, b: 205, baseColor: "purple" },
    { name: "MediumOrchid4", hex: "#7A378B", r: 122, g: 55, b: 139, baseColor: "purple" },
    { name: "MediumPurple", hex: "#9370DB", r: 147, g: 112, b: 219, baseColor: "purple" },
    { name: "Medium Orchid", hex: "#9370DB", r: 147, g: 112, b: 219, baseColor: "purple" },
    { name: "MediumPurple1", hex: "#AB82FF", r: 171, g: 130, b: 255, baseColor: "purple" },
    { name: "Dark Orchid", hex: "#9932CD", r: 153, g: 50, b: 205, baseColor: "purple" },
    { name: "MediumPurple2", hex: "#9F79EE", r: 159, g: 121, b: 238, baseColor: "purple" },
    { name: "MediumPurple3", hex: "#8968CD", r: 137, g: 104, b: 205, baseColor: "purple" },
    { name: "MediumPurple4", hex: "#5D478B", r: 93, g: 71, b: 139, baseColor: "purple" },
    { name: "lavender", hex: "#E6E6FA", r: 230, g: 230, b: 250, baseColor: "purple" },
    { name: "magenta", hex: "#FF00FF", r: 255, g: 0, b: 255, baseColor: "purple" },
    { name: "fuchsia", hex: "#FF00FF", r: 255, g: 0, b: 255, baseColor: "purple" },
    { name: "magenta1", hex: "#FF00FF", r: 255, g: 0, b: 255, baseColor: "purple" },
    { name: "magenta2", hex: "#EE00EE", r: 238, g: 0, b: 238, baseColor: "purple" },
    { name: "magenta3", hex: "#CD00CD", r: 205, g: 0, b: 205, baseColor: "purple" },
    { name: "magenta4", hex: "#8B008B", r: 139, g: 0, b: 139, baseColor: "purple" },
    { name: "maroon", hex: "#B03060", r: 176, g: 48, b: 96, baseColor: "pink" },
    { name: "maroon1", hex: "#FF34B3", r: 255, g: 52, b: 179, baseColor: "pink" },
    { name: "maroon2", hex: "#EE30A7", r: 238, g: 48, b: 167, baseColor: "pink" },
    { name: "maroon3", hex: "#CD2990", r: 205, g: 41, b: 144, baseColor: "pink" },
    { name: "maroon4", hex: "#8B1C62", r: 139, g: 28, b: 98, baseColor: "pink" },
    { name: "orchid", hex: "#DA70D6", r: 218, g: 112, b: 214, baseColor: "purple" },
    { name: "Orchid", hex: "#DB70DB", r: 219, g: 112, b: 219, baseColor: "purple" },
    { name: "orchid1", hex: "#FF83FA", r: 255, g: 131, b: 250, baseColor: "purple" },
    { name: "orchid2", hex: "#EE7AE9", r: 238, g: 122, b: 233, baseColor: "purple" },
    { name: "orchid3", hex: "#CD69C9", r: 205, g: 105, b: 201, baseColor: "purple" },
    { name: "orchid4", hex: "#8B4789", r: 139, g: 71, b: 137, baseColor: "purple" },
    { name: "plum", hex: "#DDA0DD", r: 221, g: 160, b: 221, baseColor: "purple" },
    { name: "plum1", hex: "#FFBBFF", r: 255, g: 187, b: 255, baseColor: "purple" },
    { name: "plum2", hex: "#EEAEEE", r: 238, g: 174, b: 238, baseColor: "purple" },
    { name: "plum3", hex: "#CD96CD", r: 205, g: 150, b: 205, baseColor: "purple" },
    { name: "plum4", hex: "#8B668B", r: 139, g: 102, b: 139, baseColor: "purple" },
    { name: "purple", hex: "#A020F0", r: 160, g: 32, b: 240, baseColor: "purple" },
    { name: "purple", hex: "#800080", r: 128, g: 0, b: 128, baseColor: "purple" },
    { name: "purple1", hex: "#9B30FF", r: 155, g: 48, b: 255, baseColor: "purple" },
    { name: "purple2", hex: "#912CEE", r: 145, g: 44, b: 238, baseColor: "purple" },
    { name: "purple3", hex: "#7D26CD", r: 125, g: 38, b: 205, baseColor: "purple" },
    { name: "purple4", hex: "#551A8B", r: 85, g: 26, b: 139, baseColor: "purple" },
    { name: "thistle", hex: "#D8BFD8", r: 216, g: 191, b: 216, baseColor: "purple" },
    { name: "thistle1", hex: "#FFE1FF", r: 255, g: 225, b: 255, baseColor: "purple" },
    { name: "thistle2", hex: "#EED2EE", r: 238, g: 210, b: 238, baseColor: "purple" },
    { name: "thistle3", hex: "#CDB5CD", r: 205, g: 181, b: 205, baseColor: "purple" },
    { name: "thistle4", hex: "#8B7B8B", r: 139, g: 123, b: 139, baseColor: "gray" },
    { name: "violet", hex: "#EE82EE", r: 238, g: 130, b: 238, baseColor: "purple" },
    { name: "violet blue", hex: "#9F5F9F", r: 159, g: 95, b: 159, baseColor: "purple" },
    { name: "Dark Purple", hex: "#871F78", r: 135, g: 31, b: 120, baseColor: "purple" },
    { name: "Maroon", hex: "#800000", r: 128, g: 0, b: 0, baseColor: "red" },
    { name: "Medium Violet Red", hex: "#DB7093", r: 219, g: 112, b: 147, baseColor: "purple" },
    { name: "Neon Pink", hex: "#FF6EC7", r: 255, g: 110, b: 199, baseColor: "pink" },
    { name: "Plum", hex: "#EAADEA", r: 234, g: 173, b: 234, baseColor: "purple" },
    { name: "Thistle", hex: "#D8BFD8", r: 216, g: 191, b: 216, baseColor: "purple" },
    { name: "Turquoise", hex: "#ADEAEA", r: 173, g: 234, b: 234, baseColor: "teal" },
    { name: "Violet", hex: "#4F2F4F", r: 79, g: 47, b: 79, baseColor: "purple" },
    { name: "Violet Red", hex: "#CC3299", r: 204, g: 50, b: 153, baseColor: "purple" },
    { name: "AntiqueWhite", hex: "#FAEBD7", r: 250, g: 235, b: 215, baseColor: "orange" },
    { name: "AntiqueWhite1", hex: "#FFEFDB", r: 255, g: 239, b: 219, baseColor: "orange" },
    { name: "AntiqueWhite2", hex: "#EEDFCC", r: 238, g: 223, b: 204, baseColor: "orange" },
    { name: "AntiqueWhite3", hex: "#CDC0B0", r: 205, g: 192, b: 176, baseColor: "orange" },
    { name: "AntiqueWhite4", hex: "#8B8378", r: 139, g: 131, b: 120, baseColor: "gray" },
    { name: "FloralWhite", hex: "#FFFAF0", r: 255, g: 250, b: 240, baseColor: "orange" },
    { name: "GhostWhite", hex: "#F8F8FF", r: 248, g: 248, b: 255, baseColor: "blue" },
    { name: "NavajoWhite", hex: "#FFDEAD", r: 255, g: 222, b: 173, baseColor: "orange" },
    { name: "NavajoWhite1", hex: "#FFDEAD", r: 255, g: 222, b: 173, baseColor: "orange" },
    { name: "NavajoWhite2", hex: "#EECFA1", r: 238, g: 207, b: 161, baseColor: "orange" },
    { name: "NavajoWhite3", hex: "#CDB38B", r: 205, g: 179, b: 139, baseColor: "orange" },
    { name: "NavajoWhite4", hex: "#8B795E", r: 139, g: 121, b: 94, baseColor: "orange" },
    { name: "OldLace", hex: "#FDF5E6", r: 253, g: 245, b: 230, baseColor: "orange" },
    { name: "WhiteSmoke", hex: "#F5F5F5", r: 245, g: 245, b: 245, baseColor: "white" },
    { name: "gainsboro", hex: "#DCDCDC", r: 220, g: 220, b: 220, baseColor: "gray" },
    { name: "ivory", hex: "#FFFFF0", r: 255, g: 255, b: 240, baseColor: "yellow" },
    { name: "ivory1", hex: "#FFFFF0", r: 255, g: 255, b: 240, baseColor: "yellow" },
    { name: "ivory2", hex: "#EEEEE0", r: 238, g: 238, b: 224, baseColor: "yellow" },
    { name: "ivory3", hex: "#CDCDC1", r: 205, g: 205, b: 193, baseColor: "gray" },
    { name: "ivory4", hex: "#8B8B83", r: 139, g: 139, b: 131, baseColor: "gray" },
    { name: "linen", hex: "#FAF0E6", r: 250, g: 240, b: 230, baseColor: "orange" },
    { name: "seashell", hex: "#FFF5EE", r: 255, g: 245, b: 238, baseColor: "orange" },
    { name: "seashell1", hex: "#FFF5EE", r: 255, g: 245, b: 238, baseColor: "orange" },
    { name: "seashell2", hex: "#EEE5DE", r: 238, g: 229, b: 222, baseColor: "orange" },
    { name: "seashell3", hex: "#CDC5BF", r: 205, g: 197, b: 191, baseColor: "orange" },
    { name: "seashell4", hex: "#8B8682", r: 139, g: 134, b: 130, baseColor: "gray" },
    { name: "snow", hex: "#FFFAFA", r: 255, g: 250, b: 250, baseColor: "pink" },
    { name: "snow1", hex: "#FFFAFA", r: 255, g: 250, b: 250, baseColor: "pink" },
    { name: "snow2", hex: "#EEE9E9", r: 238, g: 233, b: 233, baseColor: "pink" },
    { name: "snow3", hex: "#CDC9C9", r: 205, g: 201, b: 201, baseColor: "gray" },
    { name: "snow4", hex: "#8B8989", r: 139, g: 137, b: 137, baseColor: "gray" },
    { name: "wheat", hex: "#F5DEB3", r: 245, g: 222, b: 179, baseColor: "orange" },
    { name: "wheat1", hex: "#FFE7BA", r: 255, g: 231, b: 186, baseColor: "orange" },
    { name: "wheat2", hex: "#EED8AE", r: 238, g: 216, b: 174, baseColor: "orange" },
    { name: "wheat3", hex: "#CDBA96", r: 205, g: 186, b: 150, baseColor: "orange" },
    { name: "wheat4", hex: "#8B7E66", r: 139, g: 126, b: 102, baseColor: "orange" },
    { name: "white", hex: "#FFFFFF", r: 255, g: 255, b: 255, baseColor: "white" },
    { name: "Quartz", hex: "#D9D9F3", r: 217, g: 217, b: 243, baseColor: "blue" },
    { name: "Wheat", hex: "#D8D8BF", r: 216, g: 216, b: 191, baseColor: "yellow" },
    { name: "BlanchedAlmond", hex: "#FFEBCD", r: 255, g: 235, b: 205, baseColor: "orange" },
    { name: "DarkGoldenrod", hex: "#B8860B", r: 184, g: 134, b: 11, baseColor: "metallic" },
    { name: "DarkGoldenrod1", hex: "#FFB90F", r: 255, g: 185, b: 15, baseColor: "metallic" },
    { name: "DarkGoldenrod2", hex: "#EEAD0E", r: 238, g: 173, b: 14, baseColor: "metallic" },
    { name: "DarkGoldenrod3", hex: "#CD950C", r: 205, g: 149, b: 12, baseColor: "metallic" },
    { name: "DarkGoldenrod4", hex: "#8B6508", r: 139, g: 101, b: 8, baseColor: "metallic" },
    { name: "LemonChiffon", hex: "#FFFACD", r: 255, g: 250, b: 205, baseColor: "yellow" },
    { name: "LemonChiffon1", hex: "#FFFACD", r: 255, g: 250, b: 205, baseColor: "yellow" },
    { name: "LemonChiffon2", hex: "#EEE9BF", r: 238, g: 233, b: 191, baseColor: "yellow" },
    { name: "LemonChiffon3", hex: "#CDC9A5", r: 205, g: 201, b: 165, baseColor: "yellow" },
    { name: "LemonChiffon4", hex: "#8B8970", r: 139, g: 137, b: 112, baseColor: "gray" },
    { name: "LightGoldenrod", hex: "#EEDD82", r: 238, g: 221, b: 130, baseColor: "metallic" },
    { name: "LightGoldenrod1", hex: "#FFEC8B", r: 255, g: 236, b: 139, baseColor: "metallic" },
    { name: "LightGoldenrod2", hex: "#EEDC82", r: 238, g: 220, b: 130, baseColor: "metallic" },
    { name: "LightGoldenrod3", hex: "#CDBE70", r: 205, g: 190, b: 112, baseColor: "metallic" },
    { name: "LightGoldenrod4", hex: "#8B814C", r: 139, g: 129, b: 76, baseColor: "metallic" },
    { name: "LightGoldenrodYellow", hex: "#FAFAD2", r: 250, g: 250, b: 210, baseColor: "metallic" },
    { name: "LightYellow", hex: "#FFFFE0", r: 255, g: 255, b: 224, baseColor: "yellow" },
    { name: "LightYellow1", hex: "#FFFFE0", r: 255, g: 255, b: 224, baseColor: "yellow" },
    { name: "LightYellow2", hex: "#EEEED1", r: 238, g: 238, b: 209, baseColor: "yellow" },
    { name: "LightYellow3", hex: "#CDCDB4", r: 205, g: 205, b: 180, baseColor: "yellow" },
    { name: "LightYellow4", hex: "#8B8B7A", r: 139, g: 139, b: 122, baseColor: "gray" },
    { name: "PaleGoldenrod", hex: "#EEE8AA", r: 238, g: 232, b: 170, baseColor: "metallic" },
    { name: "PapayaWhip", hex: "#FFEFD5", r: 255, g: 239, b: 213, baseColor: "orange" },
    { name: "cornsilk", hex: "#FFF8DC", r: 255, g: 248, b: 220, baseColor: "yellow" },
    { name: "cornsilk1", hex: "#FFF8DC", r: 255, g: 248, b: 220, baseColor: "yellow" },
    { name: "cornsilk2", hex: "#EEE8CD", r: 238, g: 232, b: 205, baseColor: "yellow" },
    { name: "cornsilk3", hex: "#CDC8B1", r: 205, g: 200, b: 177, baseColor: "yellow" },
    { name: "cornsilk4", hex: "#8B8878", r: 139, g: 136, b: 120, baseColor: "gray" },
    { name: "goldenrod", hex: "#DAA520", r: 218, g: 165, b: 32, baseColor: "metallic" },
    { name: "goldenrod1", hex: "#FFC125", r: 255, g: 193, b: 37, baseColor: "metallic" },
    { name: "goldenrod2", hex: "#EEB422", r: 238, g: 180, b: 34, baseColor: "metallic" },
    { name: "goldenrod3", hex: "#CD9B1D", r: 205, g: 155, b: 29, baseColor: "metallic" },
    { name: "goldenrod4", hex: "#8B6914", r: 139, g: 105, b: 20, baseColor: "metallic" },
    { name: "moccasin", hex: "#FFE4B5", r: 255, g: 228, b: 181, baseColor: "orange" },
    { name: "yellow", hex: "#FFFF00", r: 255, g: 255, b: 0, baseColor: "yellow" },
    { name: "yellow1", hex: "#FFFF00", r: 255, g: 255, b: 0, baseColor: "yellow" },
    { name: "yellow2", hex: "#EEEE00", r: 238, g: 238, b: 0, baseColor: "yellow" },
    { name: "yellow3", hex: "#CDCD00", r: 205, g: 205, b: 0, baseColor: "yellow" },
    { name: "yellow4", hex: "#8B8B00", r: 139, g: 139, b: 0, baseColor: "green" },
    { name: "gold", hex: "#FFD700", r: 255, g: 215, b: 0, baseColor: "metallic" },
    { name: "gold1", hex: "#FFD700", r: 255, g: 215, b: 0, baseColor: "metallic" },
    { name: "gold2", hex: "#EEC900", r: 238, g: 201, b: 0, baseColor: "metallic" },
    { name: "gold3", hex: "#CDAD00", r: 205, g: 173, b: 0, baseColor: "metallic" },
    { name: "gold4", hex: "#8B7500", r: 139, g: 117, b: 0, baseColor: "metallic" },
    { name: "Goldenrod", hex: "#DBDB70", r: 219, g: 219, b: 112, baseColor: "metallic" },
    { name: "Medium Goldenrod", hex: "#EAEAAE", r: 234, g: 234, b: 174, baseColor: "metallic" },
    { name: "Yellow Green", hex: "#99CC32", r: 153, g: 204, b: 50, baseColor: "green" },
    { name: "copper", hex: "#B87333", r: 184, g: 115, b: 51, baseColor: "metallic" },
    { name: "cool copper", hex: "#D98719", r: 217, g: 135, b: 25, baseColor: "metallic" },
    { name: "Green Copper", hex: "#856363", r: 133, g: 99, b: 99, baseColor: "metallic" },
    { name: "brass", hex: "#B5A642", r: 181, g: 166, b: 66, baseColor: "yellow" },
    { name: "bronze", hex: "#8C7853", r: 140, g: 120, b: 83, baseColor: "metallic" },
    { name: "bronze II", hex: "#A67D3D", r: 166, g: 125, b: 61, baseColor: "metallic" },
    { name: "bright gold", hex: "#D9D919", r: 217, g: 217, b: 25, baseColor: "metallic" },
    { name: "Old Gold", hex: "#CFB53B", r: 207, g: 181, b: 59, baseColor: "metallic" },
    { name: "CSS Gold", hex: "#CC9900", r: 204, g: 153, b: 0, baseColor: "metallic" },
    { name: "gold", hex: "#CD7F32", r: 205, g: 127, b: 50, baseColor: "metallic" },
    { name: "silver", hex: "#E6E8FA", r: 230, g: 232, b: 250, baseColor: "blue" },
    { name: "Silver", hex: "#C0C0C0", r: 192, g: 192, b: 192, baseColor: "gray" },
    { name: "Light Steel Blue", hex: "#545454", r: 84, g: 84, b: 84, baseColor: "gray" },
    { name: "Steel Blue", hex: "#236B8E", r: 35, g: 107, b: 142, baseColor: "blue" }
];

// Precompute Lab values for color shades
COLOR_SHADES.forEach(c => {
    c.lab = rgbToLab(c.r, c.g, c.b);
});

function getClosestColor(r, g, b) {
    const maxVal = Math.max(r, g, b);
    const minVal = Math.min(r, g, b);
    const chroma = maxVal - minVal;

    // Boost dark, saturated pixels to bring out their hue (using threshold 15)
    if (chroma >= 15 && maxVal < 100) {
        const scale = 150 / maxVal;
        r = Math.min(255, Math.round(r * scale));
        g = Math.min(255, Math.round(g * scale));
        b = Math.min(255, Math.round(b * scale));
    }

    const inputLab = rgbToLab(r, g, b);
    let minDistance = Infinity;
    let closestColor = null;

    for (let i = 0; i < COLOR_SHADES.length; i++) {
        const p = COLOR_SHADES[i];
        const distSq = (inputLab.L - p.lab.L) * (inputLab.L - p.lab.L) +
                       (inputLab.a - p.lab.a) * (inputLab.a - p.lab.a) +
                       (inputLab.b - p.lab.b) * (inputLab.b - p.lab.b);
        if (distSq < minDistance) {
            minDistance = distSq;
            closestColor = p;
        }
    }

    return closestColor ? { name: closestColor.name, hex: closestColor.hex, baseColor: closestColor.baseColor } : { name: "Unknown", hex: "#cccccc", baseColor: "gray" };
}

function extractColorFromImage(imgEl) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    
    // Sample the center 30% width, 40% height of the image to focus on the dress and avoid borders/background
    const startX = Math.floor(canvas.width * 0.35);
    const startY = Math.floor(canvas.height * 0.3);
    const w = Math.floor(canvas.width * 0.3);
    const h = Math.floor(canvas.height * 0.4);
    
    if (w === 0 || h === 0) {
        return {
            primary: { name: "Unknown", hex: "#cccccc" },
            secondary: null
        };
    }

    const imageData = ctx.getImageData(startX, startY, w, h);
    const data = imageData.data;
    
    const colorCounts = {};
    let totalCount = 0;
    
    // Sample every 4th pixel for high speed and accuracy
    for (let i = 0; i < data.length; i += 4 * 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const a = data[i+3];
        
        if (a > 100) {
            const colorObj = getClosestColor(r, g, b);
            if (colorObj && colorObj.name !== "Unknown") {
                colorCounts[colorObj.name] = colorCounts[colorObj.name] || { count: 0, hex: colorObj.hex, baseColor: colorObj.baseColor };
                colorCounts[colorObj.name].count++;
                totalCount++;
            }
        }
    }
    
    if (totalCount === 0) {
        return {
            primary: { name: "Unknown", hex: "#cccccc" },
            secondary: null
        };
    }
    
    function getColorPriority(name, baseColor) {
        if (baseColor === "white" || baseColor === "gray") {
            return 1; // lowest priority (usually mannequin background)
        }
        if (["black", "red", "pink", "blue", "purple", "teal", "green"].includes(baseColor)) {
            return 3; // highest priority (most attractive catalog colors)
        }
        return 2; // medium priority (Beige, Brown, Khaki, Orange, Yellow, etc.)
    }

    // Convert counts to sorted array and sort by weighted score
    const sortedColors = Object.keys(colorCounts).map(name => {
        const percentage = (colorCounts[name].count / totalCount) * 100;
        const priority = getColorPriority(name, colorCounts[name].baseColor);
        const score = percentage + (priority - 2) * 25;
        return {
            name: name,
            hex: colorCounts[name].hex,
            baseColor: colorCounts[name].baseColor,
            count: colorCounts[name].count,
            percentage: percentage,
            score: score
        };
    }).sort((a, b) => b.score - a.score);
    
    console.log("Analyzed prioritized color distribution:", sortedColors);
    
    const primary = sortedColors[0];
    let secondary = null;
    
    // If there is a second color that makes up more than 15% of the sampled area, report it!
    if (sortedColors.length > 1 && sortedColors[1].percentage > 15) {
        secondary = sortedColors[1];
    }
    
    return {
        primary: primary,
        secondary: secondary
    };
}

let tfModel = null;

function getApparelType(predictions) {
    const ladiesKidsItems = [
        { name: "Frock", keywords: ["frock", "apron", "pinafore"] },
        { name: "Gown", keywords: ["gown", "wedding", "robe", "cloak", "velvet"] },
        { name: "Dress", keywords: ["dress", "sarong", "kimono"] },
        { name: "Top", keywords: ["shirt", "t-shirt", "jersey", "cardigan", "sweater", "blouse", "top", "tunic", "poncho", "sweatshirt"] },
        { name: "Skirt", keywords: ["skirt"] },
        { name: "Pants", keywords: ["pants", "jean", "trousers", "slacks", "leggings", "pajamas", "shorts"] }
    ];

    for (let pred of predictions) {
        const className = pred.className.toLowerCase();
        for (let item of ladiesKidsItems) {
            const found = item.keywords.find(k => className.includes(k));
            if (found) {
                return item.name;
            }
        }
    }

    // Fallback if the top prediction is a mannequin or pedestal (highly common in catalog images)
    const topClass = predictions.length > 0 ? predictions[0].className.toLowerCase() : "";
    if (topClass.includes("mannequin") || topClass.includes("pedestal") || topClass.includes("pole") || topClass.includes("dummy")) {
        return "Frock / Dress";
    }

    return "Dress"; // Default safe fallback
}

window.handleAiFabricUpload = async function(input) {
    console.log("handleAiFabricUpload called", input);
    if (!input) {
        console.error("No input argument passed to handleAiFabricUpload.");
        return;
    }
    const files = input.files || (input.dataTransfer && input.dataTransfer.files);
    if (!files || files.length === 0) {
        console.warn("No files found to analyze.");
        return;
    }
    
    const file = files[0];
    console.log("Analyzing file:", file.name, "size:", file.size, "type:", file.type);
    
    const statusEl = document.getElementById('ai-upload-status');
    const modal = document.getElementById('ai-analysis-modal');
    const previewImg = document.getElementById('ai-modal-image-preview');
    const colorNameEl = document.getElementById('ai-modal-color-name');
    const colorHexEl = document.getElementById('ai-modal-color-hex');
    const colorSwatchEl = document.getElementById('ai-modal-color-swatch');
    
    const secondaryGroup = document.getElementById('ai-modal-secondary-group');
    const secondaryNameEl = document.getElementById('ai-modal-secondary-name');
    const secondaryHexEl = document.getElementById('ai-modal-secondary-hex');
    const secondarySwatchEl = document.getElementById('ai-modal-secondary-swatch');
    
    const fabricDescEl = document.getElementById('ai-modal-fabric-desc');
    
    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = 'var(--color-primary)';
        statusEl.innerText = `Preparing Client-Side AI...`;
    }
    
    try {
        if (!modal) {
            throw new Error("Target modal 'ai-analysis-modal' not found in DOM.");
        }
        modal.style.display = 'flex';
        
        if (previewImg) {
            previewImg.style.display = 'block';
            previewImg.src = URL.createObjectURL(file);
        }
        
        const colorUseCb = document.getElementById('ai-modal-color-use');
        const secondaryUseCb = document.getElementById('ai-modal-secondary-use');
        if (colorUseCb) colorUseCb.checked = true;
        if (secondaryUseCb) secondaryUseCb.checked = true;

        if (colorNameEl) colorNameEl.value = 'Analyzing...';
        if (colorHexEl) colorHexEl.value = '';
        if (colorSwatchEl) colorSwatchEl.style.backgroundColor = 'transparent';
        
        if (secondaryGroup) secondaryGroup.style.display = 'none';
        if (secondaryNameEl) secondaryNameEl.value = '';
        if (secondaryHexEl) secondaryHexEl.value = '';
        if (secondarySwatchEl) secondarySwatchEl.style.backgroundColor = 'transparent';
        
        if (fabricDescEl) fabricDescEl.value = 'Loading Free TensorFlow Model...';

        // Load TF Model
        console.log("Checking TensorFlow & MobileNet libraries...");
        if (!tfModel) {
            if (typeof mobilenet === 'undefined') {
                throw new Error("TensorFlow MobileNet script not loaded. Check internet connection.");
            }
            console.log("Loading MobileNet model...");
            tfModel = await mobilenet.load();
            console.log("MobileNet model loaded successfully.");
        }

        if (statusEl) statusEl.innerText = `Analyzing Image...`;
        if (fabricDescEl) fabricDescEl.value = 'Analyzing Image...';

        // Wait for image to load to run analysis
        if (previewImg) {
            await new Promise((resolve) => {
                if (previewImg.complete) resolve();
                else previewImg.onload = resolve;
            });
        } else {
            throw new Error("Preview image element not found, cannot run canvas/AI operations.");
        }

        // 1. Run MobileNet Classification
        console.log("Running classification predictions...");
        const predictions = await tfModel.classify(previewImg);
        console.log("Predictions:", predictions);
        
        // Filter predictions to only support ladies & kids wear items
        const detectedItem = getApparelType(predictions);

        // 2. Run Canvas Color Extraction (Pixel scan)
        console.log("Extracting dominant colors...");
        const colorData = extractColorFromImage(previewImg);
        console.log("Color extraction result:", colorData);

        const primaryColor = colorData.primary;
        const secondaryColor = colorData.secondary;

        // Save analysis data globally for real-time description update & variant creation
        window.aiAnalysisData = {
            primary: { name: primaryColor.name, hex: primaryColor.hex },
            secondary: secondaryColor ? { name: secondaryColor.name, hex: secondaryColor.hex } : null,
            apparelType: detectedItem,
            file: file // Store the analyzed file object
        };

        // Update Modal inputs
        if (colorNameEl) colorNameEl.value = primaryColor.name;
        if (colorHexEl) colorHexEl.value = primaryColor.hex;
        if (colorSwatchEl) colorSwatchEl.style.backgroundColor = primaryColor.hex;

        // If secondary color exists, show it
        if (secondaryColor && secondaryGroup) {
            secondaryGroup.style.display = 'block';
            if (secondaryNameEl) secondaryNameEl.value = secondaryColor.name;
            if (secondaryHexEl) secondaryHexEl.value = secondaryColor.hex;
            if (secondarySwatchEl) secondarySwatchEl.style.backgroundColor = secondaryColor.hex;
        } else if (secondaryGroup) {
            secondaryGroup.style.display = 'none';
        }

        // Initialize description text in textarea dynamically based on checkboxes
        window.updateAiModalDescriptionText();

        if (statusEl) {
            statusEl.style.color = '#27ae60';
            statusEl.innerText = `Analysis complete!`;
            setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
        }
    } catch (err) {
        console.error("AI Analysis Error:", err);
        if (fabricDescEl) {
            fabricDescEl.value = `Error: ${err.message || err}`;
        }
        if (statusEl) {
            statusEl.innerText = `Error: ${err.message || err}`;
            statusEl.style.color = '#e74c3c';
        }
    } finally {
        if (input && 'value' in input) {
            input.value = '';
        }
    }
};

window.closeAiModal = function() {
    document.getElementById('ai-analysis-modal').style.display = 'none';
};

window.copyAiDetailsToDescription = function() {
    const usePrimary = document.getElementById('ai-modal-color-use')?.checked;
    const primaryName = document.getElementById('ai-modal-color-name').value.trim();
    const primaryHex = document.getElementById('ai-modal-color-hex').value.trim();
    
    const secondaryGroup = document.getElementById('ai-modal-secondary-group');
    const useSecondary = secondaryGroup && secondaryGroup.style.display !== 'none' && document.getElementById('ai-modal-secondary-use')?.checked;
    const secondaryName = document.getElementById('ai-modal-secondary-name').value.trim();
    const secondaryHex = document.getElementById('ai-modal-secondary-hex').value.trim();
    
    const fabricDesc = document.getElementById('ai-modal-fabric-desc').value;
    
    if (!primaryName && !fabricDesc) return;
    
    const descField = document.getElementById('prod-desc');
    if (descField) {
        let textToAdd = `\n\nFabric Details: ${fabricDesc}`;
        if (!descField.value) {
            textToAdd = textToAdd.trim();
        }
        descField.value += textToAdd;
        
        let addedVariants = [];
        const localFiles = window.aiAnalysisData && window.aiAnalysisData.file ? [window.aiAnalysisData.file] : null;
        if (usePrimary && primaryName) {
            window.addVariantBlock({ name: primaryName, hex: primaryHex, localFiles: localFiles });
            addedVariants.push(primaryName);
        }
        if (useSecondary && secondaryName) {
            window.addVariantBlock({ name: secondaryName, hex: secondaryHex, localFiles: localFiles });
            addedVariants.push(secondaryName);
        }
        
        let toastMsg = "Fabric details added!";
        if (addedVariants.length > 0) {
            toastMsg += ` Color variant${addedVariants.length > 1 ? 's' : ''} created for: ${addedVariants.join(' & ')}`;
        }
        showRoyalToast("Added to Description", toastMsg, false);
        closeAiModal();
    }
};

window.updateAiModalDescriptionText = function() {
    if (!window.aiAnalysisData) return;
    
    const usePrimary = document.getElementById('ai-modal-color-use')?.checked;
    const secondaryGroup = document.getElementById('ai-modal-secondary-group');
    const useSecondary = secondaryGroup && secondaryGroup.style.display !== 'none' && document.getElementById('ai-modal-secondary-use')?.checked;
    
    let colorNameText = "";
    if (usePrimary && useSecondary && window.aiAnalysisData.secondary) {
        colorNameText = `${window.aiAnalysisData.primary.name} and ${window.aiAnalysisData.secondary.name}`;
    } else if (usePrimary) {
        colorNameText = window.aiAnalysisData.primary.name;
    } else if (useSecondary && window.aiAnalysisData.secondary) {
        colorNameText = window.aiAnalysisData.secondary.name;
    } else {
        colorNameText = "beautiful";
    }
    
    const descText = `A stunning ${colorNameText} ${window.aiAnalysisData.apparelType} featuring a comfortable and elegant design. Perfect for everyday wear, this piece offers a premium look with high-quality stitching and a flattering fit.`;
    
    const fabricDescEl = document.getElementById('ai-modal-fabric-desc');
    if (fabricDescEl) fabricDescEl.value = descText;
};

window.updateColorFromTextInput = function(type) {
    if (!window.aiAnalysisData) return;
    
    if (type === 'primary') {
        const nameVal = document.getElementById('ai-modal-color-name').value.trim();
        const hexVal = document.getElementById('ai-modal-color-hex').value.trim();
        const swatchEl = document.getElementById('ai-modal-color-swatch');
        
        window.aiAnalysisData.primary.name = nameVal;
        window.aiAnalysisData.primary.hex = hexVal;
        if (swatchEl) swatchEl.style.backgroundColor = hexVal;
    } else if (type === 'secondary' && window.aiAnalysisData.secondary) {
        const nameVal = document.getElementById('ai-modal-secondary-name').value.trim();
        const hexVal = document.getElementById('ai-modal-secondary-hex').value.trim();
        const swatchEl = document.getElementById('ai-modal-secondary-swatch');
        
        window.aiAnalysisData.secondary.name = nameVal;
        window.aiAnalysisData.secondary.hex = hexVal;
        if (swatchEl) swatchEl.style.backgroundColor = hexVal;
    }
    
    window.updateAiModalDescriptionText();
};

window.handleAiBatchUpload = async function(input) {
    const files = input.files;
    if (!files || files.length === 0) return;

    const statusEl = document.getElementById('ai-upload-status');
    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = 'var(--color-primary)';
        statusEl.innerText = `Processing batch of ${files.length} images...`;
    }

    try {
        if (!tfModel) {
            if (typeof mobilenet === 'undefined') {
                throw new Error("TensorFlow MobileNet script not loaded. Check internet connection.");
            }
            if (statusEl) statusEl.innerText = "Loading Free TensorFlow Model...";
            tfModel = await mobilenet.load();
        }

        const groups = {}; // colorName -> { hex, files: [] }
        let apparelType = "Dress"; // default fallback

        // Classify the first image in the batch to detect apparel type
        try {
            const firstImg = new Image();
            firstImg.src = URL.createObjectURL(files[0]);
            await new Promise((resolve, reject) => {
                firstImg.onload = resolve;
                firstImg.onerror = reject;
            });
            const predictions = await tfModel.classify(firstImg);
            apparelType = getApparelType(predictions);
        } catch (classErr) {
            console.error("Error classifying first image for apparel type:", classErr);
        }

        for (let file of files) {
            try {
                const img = new Image();
                img.src = URL.createObjectURL(file);
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });

                const colorData = extractColorFromImage(img);
                const primaryColor = colorData.primary;
                const colorName = primaryColor.name;

                if (!groups[colorName]) {
                    groups[colorName] = {
                        hex: primaryColor.hex,
                        files: []
                    };
                }
                groups[colorName].files.push(file);
            } catch (e) {
                console.error("Error processing file in batch:", file.name, e);
            }
        }

        // Clear existing variants before adding new auto-grouped ones
        document.getElementById('variants-container').innerHTML = '';

        // Create a variant block for each group
        for (let colorName in groups) {
            const group = groups[colorName];
            addVariantBlock({
                name: colorName,
                hex: group.hex,
                localFiles: group.files
            });
        }

        // Format color names list
        const colorNames = Object.keys(groups);
        let colorNameText = "";
        if (colorNames.length === 1) {
            colorNameText = colorNames[0];
        } else if (colorNames.length === 2) {
            colorNameText = `${colorNames[0]} and ${colorNames[1]}`;
        } else if (colorNames.length > 2) {
            colorNameText = colorNames.slice(0, -1).join(", ") + `, and ${colorNames[colorNames.length - 1]}`;
        } else {
            colorNameText = "beautiful";
        }

        // Generate description
        const descriptionTemplate = `A stunning ${colorNameText} ${apparelType} featuring a comfortable and elegant design. Perfect for everyday wear, this piece offers a premium look with high-quality stitching and a flattering fit.`;

        // Append to description field (Plain text, no markdown)
        const descField = document.getElementById('prod-desc');
        if (descField) {
            let textToAdd = `\n\nFabric Details: ${descriptionTemplate}`;
            if (!descField.value) {
                textToAdd = textToAdd.trim();
            }
            descField.value += textToAdd;
        }

        if (statusEl) {
            statusEl.style.color = '#27ae60';
            statusEl.innerText = `Auto-grouped into ${Object.keys(groups).length} variants and description appended!`;
            setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
        }
    } catch (err) {
        console.error("AI Batch Grouping Error:", err);
        if (statusEl) {
            statusEl.innerText = `Error: ${err.message || err}`;
            statusEl.style.color = '#e74c3c';
        }
    } finally {
        input.value = '';
    }
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
    showRoyalConfirm("Delete Product", "Are you sure you want to delete this product? This action cannot be undone.", async () => {
        const { error } = await sb.from('products').delete().eq('id', id); 
        if (error) showRoyalToast("Error Deleting", error.message, true);
        else {
            loadAdminProducts(); 
            showRoyalToast("Product Deleted", "The product has been removed from inventory.", false);
        }
    });
};

window.loadAdminProducts = loadAdminProducts;

/* ==========================================================================
   WISHLIST & NOTIFICATION SYSTEM FEATURES
   ========================================================================== */

// --- WISHLIST MANAGEMENT ---
function loadWishlist() {
    try {
        const saved = localStorage.getItem('royal_wishlist');
        if (saved) wishlist = JSON.parse(saved);
        else wishlist = [];
    } catch (e) {
        wishlist = [];
    }
}

function saveWishlist() {
    try {
        localStorage.setItem('royal_wishlist', JSON.stringify(wishlist));
    } catch (e) {}
    updateWishlistCount();
}

function updateWishlistCount() {
    const els = document.querySelectorAll('.wishlist-count');
    els.forEach(el => {
        el.innerText = wishlist.length;
        el.style.display = wishlist.length > 0 ? 'flex' : 'none';
    });
}

function isProductInWishlist(id) {
    return wishlist.some(item => Number(item.id) === Number(id));
}

window.toggleWishlist = function(id, name, price, img) {
    loadWishlist();
    const index = wishlist.findIndex(item => Number(item.id) === Number(id));
    if (index > -1) {
        wishlist.splice(index, 1);
        showRoyalToast('Removed from Wishlist', `${name} has been removed.`);
        // Update UI to reflect removal
        const icon = document.getElementById(`heart-icon-${id}`);
        if (icon) {
            const active = isProductInWishlist(id);
            icon.className = active ? 'fas fa-heart' : 'far fa-heart';
            icon.style.color = active ? 'var(--color-error)' : '';
        }
        const btn = document.getElementById('add-to-wishlist-btn');
        if (btn) {
            const active = isProductInWishlist(id);
            btn.title = active ? 'Remove from Wishlist' : 'Add to Wishlist';
            const i = btn.querySelector('i');
            if (i) {
                i.className = active ? 'fas fa-heart' : 'far fa-heart';
                i.style.color = active ? 'var(--color-error)' : '';
            }
        }
    } else {
        wishlist.push({ id: Number(id), name, price: Number(price), img });
        showRoyalToast('Added to Wishlist', `${name} has been added.`);
        const icon = document.getElementById(`heart-icon-${id}`);
        if (icon) {
            const active = isProductInWishlist(id);
            icon.className = active ? 'fas fa-heart' : 'far fa-heart';
            icon.style.color = active ? 'var(--color-error)' : '';
        }
        const btn = document.getElementById('add-to-wishlist-btn');
        if (btn) {
            const active = isProductInWishlist(id);
            btn.title = active ? 'Remove from Wishlist' : 'Add to Wishlist';
            const i = btn.querySelector('i');
            if (i) {
                i.className = active ? 'fas fa-heart' : 'far fa-heart';
                i.style.color = active ? 'var(--color-error)' : '';
            }
        }
    }
    saveWishlist();
    
    if (window.location.pathname.includes('wishlist')) {
        initWishlistPage();
    }
};

function initWishlistPage() {
    loadWishlist();
    const pageContainer = document.getElementById('wishlist-page-container');
    if (!pageContainer) return;

    if (wishlist.length === 0) {
        pageContainer.innerHTML = `
            <div class="wishlist-page-wrapper">
                <div class="wishlist-intro-col">
                    <h1 class="wishlist-title">My Wishlist</h1>
                    <div class="wishlist-divider"></div>
                    <p class="wishlist-subtitle">Your curated collection of elegant items</p>
                    <a href="index.html" class="btn btn-continue-shopping">
                        Continue Shopping <i class="fas fa-arrow-right" style="margin-left: 8px; font-size: 0.8rem;"></i>
                    </a>
                </div>
                
                <div class="wishlist-empty-col">
                    <div class="wishlist-empty-circle">
                        <div class="wishlist-empty-graphic">
                            <div class="sparkle-tl">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z"/></svg>
                            </div>
                            <div class="heart-center">
                                <svg viewBox="0 0 24 24" width="72" height="72" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                            </div>
                            <div class="sparkle-br">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 4C12 8.4 8.4 12 4 12C8.4 12 12 15.6 12 20C12 15.6 15.6 12 20 12C15.6 12 12 8.4 12 4Z"/></svg>
                            </div>
                        </div>
                        <h3 class="wishlist-empty-title">Your Wishlist is Empty</h3>
                        <p class="wishlist-empty-text">Save items you love here to view them later.</p>
                        <a href="index.html" class="btn btn-discover-trends">Discover Trends</a>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    pageContainer.innerHTML = `
        <div class="wishlist-header-populated">
            <h1 class="wishlist-title">My Wishlist</h1>
            <div class="wishlist-divider"></div>
            <p class="wishlist-subtitle">Your curated collection of elegant items</p>
        </div>
        <section class="container" style="padding-bottom: 80px;">
            <div id="wishlist-items-container" class="product-grid">
                ${wishlist.map(p => `
                    <div class="product-card">
                        <div class="product-image-wrapper">
                            <a href="product.html?id=${p.id}">
                                <img src="${p.img}" alt="${escapeHtml(p.name)}">
                            </a>
                            <div class="product-actions" style="opacity: 1; transform: translateY(0);">
                                <button class="action-btn delete" onclick="event.preventDefault(); toggleWishlist(${p.id}, '${escapeHtml(p.name)}', ${p.price}, '${p.img}');" title="Remove from Wishlist" style="color: var(--color-error)">
                                    <i class="fas fa-heart"></i>
                                </button>
                            </div>
                        </div>
                        <div class="product-details">
                            <h4 class="product-title"><a href="product.html?id=${p.id}">${escapeHtml(p.name)}</a></h4>
                            <div class="product-price">₹${p.price}</div>
                            <div style="margin-top: 15px;">
                                <a href="product.html?id=${p.id}" class="btn btn-sm btn-outline-dark" style="width: 100%; text-align: center;">View Options</a>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

// --- NOTIFICATION SYSTEM ---
const DEFAULT_NOTIFICATIONS = [
    {
        id: 'welcome-promo',
        title: 'Welcome to Royal Collections',
        body: 'Thank you for joining us! Use coupon code <strong style="color:var(--color-accent)">ROYAL10</strong> to get 10% off your very first order.',
        time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        unread: true,
        type: 'promo'
    },
    {
        id: 'complimentary-shipping',
        title: 'Complimentary Shipping',
        body: 'Enjoy free premium shipping on all orders over ₹10,000 across India. Crafted elegance delivered directly to your doorstep.',
        time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        unread: false,
        type: 'shipping'
    }
];

function loadNotifications() {
    try {
        const saved = localStorage.getItem(currentNotificationsKey);
        if (saved) {
            notifications = JSON.parse(saved);
        } else {
            notifications = [...DEFAULT_NOTIFICATIONS];
            localStorage.setItem(currentNotificationsKey, JSON.stringify(notifications));
        }
    } catch (e) {
        notifications = [...DEFAULT_NOTIFICATIONS];
    }
}

function saveNotifications() {
    try {
        localStorage.setItem(currentNotificationsKey, JSON.stringify(notifications));
    } catch (e) {}
    updateNotificationsCount();
}

function updateNotificationsCount() {
    const unreadCount = notifications.filter(n => n.unread).length;
    const els = document.querySelectorAll('.notification-count');
    els.forEach(el => {
        el.innerText = unreadCount;
        el.style.display = unreadCount > 0 ? 'flex' : 'none';
    });
}

window.addNotification = function(title, body, type = 'general') {
    loadNotifications();
    const newNotif = {
        id: `notif-${Date.now()}`,
        title,
        body,
        time: new Date().toISOString(),
        unread: true,
        type
    };
    notifications.unshift(newNotif);
    saveNotifications();
};

window.markNotificationRead = function(id) {
    loadNotifications();
    const notif = notifications.find(n => n.id === id);
    if (notif) {
        notif.unread = false;
        saveNotifications();
        if (window.location.pathname.includes('notifications')) {
            initNotificationsPage();
        }
    }
};

window.deleteNotification = function(id) {
    loadNotifications();
    notifications = notifications.filter(n => n.id !== id);
    saveNotifications();
    if (window.location.pathname.includes('notifications')) {
        initNotificationsPage();
    }
};

window.markAllNotificationsRead = function() {
    loadNotifications();
    notifications.forEach(n => n.unread = false);
    saveNotifications();
    if (window.location.pathname.includes('notifications')) {
        initNotificationsPage();
    }
};

function initNotificationsPage() {
    loadNotifications();
    const container = document.getElementById('notifications-items-container');
    const statusText = document.getElementById('unread-status-text');
    if (!container) return;

    const unreadCount = notifications.filter(n => n.unread).length;
    if (statusText) {
        statusText.innerText = `${unreadCount} Unread Notification${unreadCount === 1 ? '' : 's'}`;
    }

    const filterEl = document.getElementById('notification-filter');
    const filterVal = filterEl ? filterEl.value : 'all';

    let displayed = notifications;
    if (filterVal === 'unread') {
        displayed = notifications.filter(n => n.unread);
    } else if (filterVal === 'promo') {
        displayed = notifications.filter(n => n.type === 'promo');
    } else if (filterVal === 'shipping') {
        displayed = notifications.filter(n => n.type === 'shipping' || n.type === 'order');
    }

    if (displayed.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="far fa-bell" style="font-size: 3rem; color: #ccc; margin-bottom: 20px; display: block;"></i>
                <h3 style="font-family: var(--font-heading); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">No Notifications</h3>
                <p style="color: var(--color-secondary);">We couldn't find any notifications matching the selected filter.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = displayed.map(n => {
        let iconClass = 'fas fa-bell';
        let bgClass = 'icon-general';
        
        if (n.type === 'promo') { iconClass = 'fas fa-percent'; bgClass = 'icon-promo'; }
        else if (n.type === 'shipping') { iconClass = 'fas fa-truck'; bgClass = 'icon-shipping'; }
        else if (n.type === 'order') { iconClass = 'fas fa-shopping-bag'; bgClass = 'icon-order'; }

        const dateObj = new Date(n.time);
        const dateStr = dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = dateObj.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        return `
            <div class="notification-item ${n.unread ? 'unread' : ''}" onclick="markNotificationRead('${n.id}')">
                <div class="notif-dot"></div>
                <div class="notif-icon-circle ${bgClass}">
                    <i class="${iconClass}"></i>
                </div>
                <div class="notif-content">
                    <div class="notif-title-row">
                        <span class="notif-title">${escapeHtml(n.title)}</span>
                        ${n.unread ? '<span class="notif-tag">NEW</span>' : ''}
                    </div>
                    <div class="notif-body">${n.body}</div>
                </div>
                <div class="notif-meta">
                    <div class="notif-date">${dateStr}</div>
                    <div>${timeStr}</div>
                </div>
                <i class="fas fa-chevron-right notif-chevron"></i>
            </div>
        `;
    }).join('');
}

window.loadAdminProducts = loadAdminProducts;

// ==========================================================================
// ROYAL ASSISTANT SUPPORT CHATBOT WIDGET (GLOBAL INTEGRATION)
// ==========================================================================
function updateChatbotVisibility() {
    const fab = document.getElementById('royal-chatbot-fab');
    if (!fab) return;
    
    const isAdminPage = window.location.pathname.includes('admin');
    if (isAdminPage) {
        const dashboard = document.getElementById('admin-dashboard-content');
        if (dashboard && (dashboard.style.display === 'block' || dashboard.style.display !== 'none')) {
            fab.style.setProperty('display', 'flex', 'important');
        } else {
            fab.style.setProperty('display', 'none', 'important');
        }
    } else {
        fab.style.setProperty('display', 'flex', 'important');
    }
}

function initRoyalChatbot() {
    if (document.getElementById('royal-chatbot-fab')) return;

    const isAdminPage = window.location.pathname.includes('admin');
    const attachButtonHtml = isAdminPage 
        ? `<button class="royal-chat-attach" id="royal-chat-attach" title="Attach Image"><i class="fas fa-plus"></i></button>
           <input type="file" id="royal-chat-file-input" accept="image/*" style="display: none;">`
        : '';
    let fabDisplay = 'flex';

    // Inject CSS Styles Dynamically
    const style = document.createElement('style');
    style.innerHTML = `
        #royal-chatbot-fab {
            position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; border-radius: 50%;
            background: linear-gradient(135deg, #065184, #0b70b5); color: white;
            box-shadow: 0 10px 25px rgba(6, 81, 132, 0.35); display: ${fabDisplay}; align-items: center; justify-content: center;
            cursor: pointer; z-index: 9999; border: none; outline: none;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        #royal-chatbot-fab:hover { transform: scale(1.1); box-shadow: 0 15px 30px rgba(6, 81, 132, 0.45); }
        #royal-chatbot-fab i { font-size: 1.4rem; }
        #royal-chatbot-fab .pulse-ring {
            position: absolute; border: 3px solid rgba(6, 81, 132, 0.4); border-radius: 50%;
            inset: -6px; animation: royal-fab-pulse 2s infinite; pointer-events: none;
        }
        @keyframes royal-fab-pulse {
            0% { transform: scale(0.95); opacity: 1; }
            100% { transform: scale(1.3); opacity: 0; }
        }
        #royal-chatbot-drawer {
            position: fixed; bottom: 105px; right: 30px; width: 370px; height: 520px;
            max-height: calc(100vh - 150px); max-width: calc(100vw - 60px);
            background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(16px);
            border-radius: 16px; box-shadow: 0 15px 45px rgba(0,0,0,0.15);
            border: 1px solid rgba(0,0,0,0.08); display: flex; flex-direction: column;
            z-index: 9998; overflow: hidden; pointer-events: none;
            transform: translateY(20px) scale(0.95); opacity: 0;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        #royal-chatbot-drawer.open { transform: translateY(0) scale(1); opacity: 1; pointer-events: auto; }
        .royal-chat-header { background: #121212; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
        .royal-chat-brand { display: flex; align-items: center; gap: 10px; }
        .royal-chat-avatar {
            width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #065184, #0b70b5);
            display: flex; align-items: center; justify-content: center; position: relative;
        }
        .royal-chat-avatar i { font-size: 1rem; color: white; }
        .royal-chat-avatar .online-dot {
            position: absolute; bottom: 0; right: 0; width: 8px; height: 8px;
            border-radius: 50%; background: #27ae60; border: 1.5px solid #121212;
        }
        .royal-chat-title h4 { font-family: 'Cinzel', serif; font-size: 0.9rem; font-weight: 600; margin: 0; }
        .royal-chat-title span { font-size: 0.65rem; color: #aaa; display: block; margin-top: 1px; }
        .royal-chat-close { background: transparent; border: none; color: #ccc; font-size: 1.1rem; cursor: pointer; transition: color 0.2s; }
        .royal-chat-close:hover { color: white; }
        .royal-chat-messages { flex-grow: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background: #fafafa; }
        .royal-message { max-width: 80%; padding: 10px 14px; border-radius: 12px; font-size: 0.85rem; line-height: 1.45; animation: royal-msg-in 0.25s ease-out; }
        @keyframes royal-msg-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .royal-message.bot { background: #f0f2f5; color: #222; align-self: flex-start; border-bottom-left-radius: 3px; border: 1px solid #eef0f3; }
        .royal-message.user { background: #065184; color: white; align-self: flex-end; border-bottom-right-radius: 3px; box-shadow: 0 3px 8px rgba(6, 81, 132, 0.15); }
        .royal-chat-suggestions { padding: 8px 15px; background: #fafafa; display: flex; flex-wrap: wrap; gap: 6px; border-top: 1px solid rgba(0,0,0,0.02); }
        .royal-suggest-btn {
            background: white; border: 1px solid #e0e0e0; color: #555; padding: 6px 12px;
            border-radius: 15px; font-size: 0.75rem; font-weight: 500; cursor: pointer;
            transition: all 0.2s ease;
        }
        .royal-suggest-btn:hover { border-color: #065184; color: #065184; background: rgba(6, 81, 132, 0.02); }
        .royal-chat-footer { padding: 10px 15px; background: white; border-top: 1px solid #eee; display: flex; gap: 8px; align-items: center; }
        .royal-chat-input { flex-grow: 1; border: 1px solid #ddd; border-radius: 20px; padding: 8px 14px; font-size: 0.85rem; outline: none; background: #f9f9f9; transition: all 0.2s; }
        .royal-chat-input:focus { border-color: #065184; background: white; }
        .royal-chat-send { width: 34px; height: 34px; border-radius: 50%; background: #065184; color: white; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
        .royal-chat-send:hover { background: #0b70b5; transform: scale(1.05); }
        .royal-chat-attach {
            width: 34px; height: 34px; border-radius: 50%; background: #f1f1f1; color: #555; border: none;
            display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0;
        }
        .royal-chat-attach:hover { background: #e2e2e2; color: #121212; transform: scale(1.05); }
        .royal-chat-product-card { display: flex; gap: 10px; background: white; border: 1px solid #e5e5e5; border-radius: 6px; padding: 8px; margin-top: 4px; align-items: center; box-shadow: 0 1px 4px rgba(0,0,0,0.02); }
        .royal-chat-product-img { width: 44px; height: 58px; object-fit: cover; border-radius: 3px; }
        .royal-chat-product-details { flex-grow: 1; display: flex; flex-direction: column; gap: 2px; }
        .royal-chat-product-name { font-size: 0.75rem; font-weight: 600; color: #121212; line-height: 1.25; }
        .royal-chat-product-price { font-size: 0.75rem; color: #065184; font-weight: 700; }
        .royal-chat-product-link { font-size: 0.68rem; text-transform: uppercase; font-weight: 700; color: #065184; text-decoration: underline; align-self: flex-start; }
        .royal-typing-indicator { display: flex; gap: 3px; padding: 10px 14px; background: #f0f2f5; border-radius: 12px; border-bottom-left-radius: 3px; align-self: flex-start; width: fit-content; margin-top: 5px; }
        .royal-typing-dot { width: 5px; height: 5px; background: #888; border-radius: 50%; animation: royal-typing-bounce 1.4s infinite ease-in-out both; }
        .royal-typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .royal-typing-dot:nth-child(2) { animation-delay: -0.16s; }
        .royal-message.image-message {
            padding: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            max-width: 100%;
        }
        .royal-message.image-message img {
            max-width: 100%;
            border-radius: 12px;
            display: block;
            box-shadow: 0 3px 10px rgba(0,0,0,0.15);
            border: 1px solid rgba(0,0,0,0.08);
        }
        @keyframes royal-typing-bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
    `;
    document.head.appendChild(style);

    // Build Chatbot HTML Nodes
    const fab = document.createElement('button');
    fab.id = 'royal-chatbot-fab';
    fab.setAttribute('title', 'Royal Assistant Chat');
    fab.innerHTML = '<div class="pulse-ring"></div><i class="fas fa-crown"></i>';
    document.body.appendChild(fab);

    const drawer = document.createElement('div');
    drawer.id = 'royal-chatbot-drawer';
    drawer.innerHTML = `
        <div class="royal-chat-header">
            <div class="royal-chat-brand">
                <div class="royal-chat-avatar">
                    <i class="fas fa-crown"></i>
                    <div class="online-dot"></div>
                </div>
                <div class="royal-chat-title">
                    <h4>Royal Assistant</h4>
                    <span>Online | Ready to Help</span>
                </div>
            </div>
            <button class="royal-chat-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="royal-chat-messages" id="royal-chat-messages"></div>
        <div class="royal-chat-suggestions" id="royal-chat-suggestions"></div>
        <div class="royal-chat-footer">
            ${attachButtonHtml}
            <input type="text" class="royal-chat-input" id="royal-chat-input" placeholder="Ask about items, shipping, returns...">
            <button class="royal-chat-send" id="royal-chat-send"><i class="fas fa-paper-plane"></i></button>
        </div>
    `;
    document.body.appendChild(drawer);

    const msgsContainer = drawer.querySelector('#royal-chat-messages');
    const input = drawer.querySelector('#royal-chat-input');
    const sendBtn = drawer.querySelector('#royal-chat-send');
    const suggestionsContainer = drawer.querySelector('#royal-chat-suggestions');

    let royalCatalog = [];
    let hasOpened = false;

    // Fetch the full catalog in the background to provide instant, offline-capable search
    async function fetchFullCatalog() {
        if (!sb) {
            setTimeout(fetchFullCatalog, 1000);
            return;
        }
        try {
            const { data } = await sb.from('products').select('*').order('id', { ascending: false });
            if (data) royalCatalog = data;
        } catch (e) {
            console.error("Full Catalog Fetch Error:", e);
        }
    }
    fetchFullCatalog();

    // Toggle Drawer Events
    fab.addEventListener('click', () => {
        drawer.classList.add('open');
        if (!hasOpened) {
            hasOpened = true;
            showBotGreeting();
        }
        setTimeout(scrollBottom, 100);
    });

    drawer.querySelector('.royal-chat-close').addEventListener('click', () => {
        drawer.classList.remove('open');
    });

    // Helper Scroll Bottom
    function scrollBottom() {
        msgsContainer.scrollTop = msgsContainer.scrollHeight;
    }

    // Helper Add Message
    function addMessage(text, type = 'bot') {
        const msg = document.createElement('div');
        const isImage = typeof text === 'string' && text.trim().startsWith('<img');
        msg.className = `royal-message ${type}${isImage ? ' image-message' : ''}`;
        msg.innerHTML = text;
        msgsContainer.appendChild(msg);
        scrollBottom();
    }

    // Typing Indicator Helpers
    let typingIndicator = null;
    function showTyping() {
        if (typingIndicator) return;
        typingIndicator = document.createElement('div');
        typingIndicator.className = 'royal-typing-indicator';
        typingIndicator.innerHTML = '<div class="royal-typing-dot"></div><div class="royal-typing-dot"></div><div class="royal-typing-dot"></div>';
        msgsContainer.appendChild(typingIndicator);
        scrollBottom();
    }
    function hideTyping() {
        if (typingIndicator) {
            typingIndicator.remove();
            typingIndicator = null;
        }
    }

    // Initial Greetings
    function showBotGreeting() {
        showTyping();
        setTimeout(() => {
            hideTyping();
            addMessage("Hello! Welcome to <strong>Royal Collections</strong> 👑. I'm your Royal Assistant. I can search our catalog, check inventory, or answer shipping & return questions. What are you looking for today?");
            renderSuggestions([
                { text: "👗 Shop Ladies", val: "Ladies Category" },
                { text: "🧸 Kids Clothes", val: "Kids Category" },
                { text: "👟 Shoes", val: "Shoes Category" },
                { text: "📦 Shipping Policy", val: "Shipping Policy" },
                { text: "↩️ Returns Info", val: "Return Policy" }
            ]);
        }, 1000);
    }

    // Suggestions Helper
    function renderSuggestions(options) {
        suggestionsContainer.innerHTML = '';
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'royal-suggest-btn';
            btn.innerText = opt.text;
            btn.onclick = () => {
                input.value = opt.val;
                handleUserSend();
            };
            suggestionsContainer.appendChild(btn);
        });
    }

    // Handle Send Action
    async function handleUserSend() {
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        addMessage(escapeHtml(text), 'user');
        
        showTyping();
        await getBotResponse(text);
    }

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserSend();
    });
    sendBtn.addEventListener('click', handleUserSend);

    // Heuristic Fabric Visual Scanner for uploaded dress images
    function analyzeImageForFabric(fileName) {
        const name = fileName.toLowerCase();
        let itemType = "Summer Casual Dress";
        let fabric = "100% Premium Cotton";
        let texture = "Soft, lightweight, and highly breathable plain weave";
        let care = "Machine wash cold with similar colors, tumble dry low";
        let categoryKeyword = "ladies";

        if (name.includes("saree") || name.includes("sari")) {
            itemType = "Traditional Saree";
            fabric = "Banarasi Kanchipuram Silk Blend (80% Silk, 20% Zari)";
            texture = "Rich, lustrous weave with a heavy, premium drape and smooth metallic sheen";
            care = "Professional dry clean only. Store wrapped in soft muslin cloth";
            categoryKeyword = "ladies";
        } else if (name.includes("frock") || name.includes("kid") || name.includes("baby") || name.includes("child")) {
            itemType = "Kids Party Frock / Outfit";
            fabric = "100% Organic Soft Cotton (Hypoallergenic)";
            texture = "Extra soft brushed texture, gentle on sensitive skin, breathable weave";
            care = "Gentle machine wash inside out, tumble dry warm";
            categoryKeyword = "kids";
        } else if (name.includes("denim") || name.includes("jean") || name.includes("pant") || name.includes("trouser")) {
            itemType = "Structured Pants/Denim";
            fabric = "Ring-Spun Denim Cotton (98% Cotton, 2% Elastane)";
            texture = "Durable, medium-weight diagonal twill weave with subtle comfort stretch";
            care = "Wash inside out in cold water, line dry to prevent fading";
            categoryKeyword = "ladies";
        } else if (name.includes("shoe") || name.includes("footwear") || name.includes("sandal") || name.includes("slipper")) {
            itemType = "Premium Footwear";
            fabric = "Vegan Faux-Leather / Breathable Canvas";
            texture = "Smooth, textured finish with padded insoles and durable vulcanized sole";
            care = "Wipe clean with a damp cloth; air dry away from heat sources";
            categoryKeyword = "shoes";
        } else if (name.includes("jewel") || name.includes("ring") || name.includes("earring") || name.includes("necklace") || name.includes("pearl")) {
            itemType = "Boutique Jewelry";
            fabric = "18K Gold Plated / Premium Alloy with Faux Pearls";
            texture = "High-polish anti-tarnish finish with high luster and reflective luster";
            care = "Keep away from perfumes and moisture. Store in airtight container";
            categoryKeyword = "cosmetics";
        } else if (name.includes("silk")) {
            itemType = "Elegant Silk Dress";
            fabric = "100% Pure Mulberry Silk";
            texture = "Ultra-smooth, luxurious cooling feel on skin, subtle natural sheen";
            care = "Hand wash with mild silk detergent or dry clean";
            categoryKeyword = "ladies";
        } else if (name.includes("cotton")) {
            itemType = "Premium Cotton Apparel";
            fabric = "100% Long-Staple Combed Cotton";
            texture = "Soft, lightweight, skin-friendly, and highly absorbent";
            care = "Machine wash cold, air dry to avoid shrinkage";
            categoryKeyword = "ladies";
        } else if (name.includes("innerwear") || name.includes("bra") || name.includes("underwear")) {
            itemType = "Premium Comfort Innerwear";
            fabric = "Modal-Cotton Spandex Blend (92% Modal, 8% Spandex)";
            texture = "Ultra-elastic, moisture-wicking silky texture, fits like a second skin";
            care = "Machine wash warm in a lingerie laundry bag, lay flat to dry";
            categoryKeyword = "innerwears";
        }

        // Search catalog for matching items
        let recommendedProducts = [];
        if (royalCatalog && royalCatalog.length > 0) {
            recommendedProducts = royalCatalog.filter(p => p.category === categoryKeyword).slice(0, 3);
        }

        const introHtml = `🔍 <strong>Visual Scanner Active...</strong><br>I've analyzed your image. Here are the fabric and style details identified:`;
        
        const reportHtml = `
            <div style="background: white; border: 1px solid #e2e2e2; border-radius: 8px; padding: 12px; margin-top: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); color: #333;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: #888; font-weight: 700; letter-spacing: 0.5px; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 6px;">Fabric Scanner Report</div>
                <div style="font-size: 0.85rem; line-height: 1.45;">
                    <strong>👗 Item Type:</strong> ${itemType}<br>
                    <strong>🧶 Fabric/Material:</strong> ${fabric}<br>
                    <strong>✨ Texture & Feel:</strong> ${texture}<br>
                    <strong>🧼 Care:</strong> ${care}
                </div>
            </div>
        `;

        return {
            introHtml,
            reportHtml,
            recommendedProducts
        };
    }

    // Image upload/attachment handling on admin page
    if (isAdminPage) {
        const attachBtn = drawer.querySelector('#royal-chat-attach');
        const fileInput = drawer.querySelector('#royal-chat-file-input');
        
        if (attachBtn && fileInput) {
            attachBtn.addEventListener('click', () => fileInput.click());
            
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = function(event) {
                    const imgDataUrl = event.target.result;
                    addMessage(`<img src="${imgDataUrl}">`, 'user');
                    
                    showTyping();
                    setTimeout(() => {
                        hideTyping();
                        const analysis = analyzeImageForFabric(file.name);
                        addMessage(analysis.introHtml);
                        
                        showTyping();
                        setTimeout(() => {
                            hideTyping();
                            addMessage(analysis.reportHtml);
                            
                            if (analysis.recommendedProducts.length > 0) {
                                showTyping();
                                setTimeout(() => {
                                    hideTyping();
                                    addMessage("Here are some matching items from our boutique collection:");
                                    analysis.recommendedProducts.forEach(p => {
                                        const card = document.createElement('div');
                                        card.className = 'royal-chat-product-card';
                                        card.innerHTML = `
                                            <img src="${p.image_url}" class="royal-chat-product-img" alt="${escapeHtml(p.name)}">
                                            <div class="royal-chat-product-details">
                                                <span class="royal-chat-product-name">${escapeHtml(p.name)}</span>
                                                <span class="royal-chat-product-price">₹${p.price}</span>
                                                <a href="product.html?id=${p.id}" class="royal-chat-product-link">View Details</a>
                                            </div>
                                        `;
                                        msgsContainer.appendChild(card);
                                    });
                                    scrollBottom();
                                }, 800);
                            }
                        }, 1000);
                    }, 1200);
                };
                reader.readAsDataURL(file);
                fileInput.value = '';
            });
        }
    }

    // AI/Rule parsing
    async function getBotResponse(query) {
        setTimeout(async () => {
            hideTyping();
            const q = query.toLowerCase().trim();

            // 1. GREETINGS & CHIT-CHAT (Flexible Regex Matching)
            const isGreeting = /^(hi+|hello+|hey+|yo+|g'day|good\s+(morning|afternoon|evening))\b/i.test(q);
            if (isGreeting) {
                const greetings = [
                    "Hello there! 👑 How can I help you find the perfect outfit today?",
                    "Hi! Welcome to Royal Collections. 🌟 What elegant styles are you looking for today?",
                    "Hey! Hope you are having a wonderful day. 👑 How can I assist you with our collections?"
                ];
                const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
                addMessage(randomGreeting);
                return;
            }

            // 1b. BOT IDENTITY
            const isIdentity = /who\s+(are\s+you|is\s+this)|your\s+name|what\s+are\s+you/i.test(q);
            if (isIdentity) {
                addMessage("I am the <strong>Royal Assistant</strong>, your virtual personal shopper! 👑 I can help you search our boutique catalog, check sizing, view category links, or find store policies. Let me know what you're looking for!");
                return;
            }

            // 1c. WELL-BEING & SMALL TALK
            const isWellBeing = /how\s+(are\s+you|is\s+it\s+going|are\s+things|you\s+doing)/i.test(q);
            if (isWellBeing) {
                addMessage("I'm doing splendidly, thank you for asking! 😊 I'm always ready to help you discover beautiful garments. How are you doing today? Can I help you browse our collections?");
                return;
            }

            // 1d. GRATITUDE / APPRECIATION
            const isGratitude = /\b(thank\s+you|thanks|thx|great|awesome|perfect|cool|wonderful|amazing)\b/i.test(q);
            if (isGratitude) {
                addMessage("You are very welcome! 😊 It is my absolute pleasure to assist you. Let me know if there's anything else you need!");
                return;
            }

            // 2. FULL CATALOG LISTING REQUEST
            const isCatalogRequest = q.includes('list') || q.includes('show') || q.includes('catalog') || 
                                     q.includes('products') || q.includes('dresses') || q.includes('collection') || 
                                     q.includes('items') || q.includes('what do you have') || q.includes('what dress') || 
                                     q.includes('all dress') || q.includes('dress name') || q.includes('options') || 
                                     q.includes('everything') || q.includes('stock');

            if (isCatalogRequest && royalCatalog.length > 0) {
                let catGroups = {};
                royalCatalog.forEach(p => {
                    if (!catGroups[p.category]) catGroups[p.category] = [];
                    catGroups[p.category].push(p);
                });

                let responseHtml = "👑 <strong>Our Royal Catalog</strong>:<br>Here are all the elegant dress and collection names available in our boutique:<br><br>";
                
                for (let cat in catGroups) {
                    let catName = cat.charAt(0).toUpperCase() + cat.slice(1);
                    responseHtml += `✨ <strong>${catName} Collection</strong>:<br>`;
                    catGroups[cat].forEach(p => {
                        responseHtml += `- <a href='product.html?id=${p.id}' style='color:#065184; font-weight:600; text-decoration:underline;'>${escapeHtml(p.name)}</a> (From ₹${p.price})<br>`;
                    });
                    responseHtml += "<br>";
                }
                
                addMessage(responseHtml);
                return;
            }

            // 3. CATEGORIES MANUAL NAVIGATION
            if (q.includes('ladies') || q.includes('women') || q.includes('lady')) {
                addMessage("Exquisite designs await! Browse our premium collections in <strong>Ladies Fashion</strong>.<br><br>👉 <a href='ladies.html' style='color:#065184; font-weight:700; text-decoration:underline;'>Shop Ladies Fashion</a>");
                return;
            }
            if (q.includes('kids') || q.includes('children') || q.includes('child')) {
                addMessage("Delightful outfits! Check out play-ready fashion in our <strong>Kids Wear</strong> section.<br><br>👉 <a href='kids.html' style='color:#065184; font-weight:700; text-decoration:underline;'>Shop Kids Wear</a>");
                return;
            }
            if (q.includes('shoes') || q.includes('footwear') || q.includes('shoe')) {
                addMessage("Walk in luxury! View our premium shoes and footwear collections.<br><br>👉 <a href='shoes.html' style='color:#065184; font-weight:700; text-decoration:underline;'>Shop Footwear</a>");
                return;
            }
            if (q.includes('jewelry') || q.includes('cosmetics') || q.includes('jewel') || q.includes('earring')) {
                addMessage("Dazzle with grace! Browse our premium Jewelry and Cosmetics essentials.<br><br>👉 <a href='cosmetics.html' style='color:#065184; font-weight:700; text-decoration:underline;'>Shop Jewelry & Cosmetics</a>");
                return;
            }
            if (q.includes('innerwears') || q.includes('underwear') || q.includes('innerwear')) {
                addMessage("Perfect fit and soft comfort! Browse premium innerwear designs.<br><br>👉 <a href='innerwears.html' style='color:#065184; font-weight:700; text-decoration:underline;'>Shop Innerwears</a>");
                return;
            }

            // 4. POLICIES
            if (q.includes('shipping') || q.includes('delivery')) {
                addMessage("🚚 <strong>Shipping Policy</strong>:<br>- <strong>Complimentary standard shipping</strong> on all orders over ₹10,000.<br>- Standard delivery charge: ₹50 for orders under ₹10,000.<br>- Deliveries take 3 to 7 business days across regions.");
                return;
            }
            if (q.includes('return') || q.includes('replace') || q.includes('exchange')) {
                addMessage("↩️ <strong>Replacement Policy</strong>:<br>- Items can be replaced within <strong>7 days</strong> of delivery.<br>- Replacements are accepted for size exchanges, manufacturing defects, or wrong items sent.<br>- Ensure the item is unused with tags intact.");
                return;
            }
            if (q.includes('cancel') || q.includes('refund')) {
                addMessage("❌ <strong>Cancellations & Refunds</strong>:<br>- Order cancellation is allowed before shipping.<br>- Refunds for prepaid orders will be processed within 5-7 business days back to the original payment method.");
                return;
            }
            if (q.includes('contact') || q.includes('support') || q.includes('whatsapp') || q.includes('phone') || q.includes('help')) {
                addMessage("📞 <strong>Contact Customer Support</strong>:<br>We'd love to help you!<br>- WhatsApp Support Group: <a href='https://chat.whatsapp.com/EviieXclX0g9gNL8HHV8zr' target='_blank' style='color:#065184; text-decoration:underline;'>Join WhatsApp Chat</a><br>- Instagram Profile: <a href='https://www.instagram.com/royalcollectionskechery' target='_blank' style='color:#065184; text-decoration:underline;'>@royalcollectionskechery</a>");
                return;
            }

            // 5. HIGH-INTELLIGENCE FUZZY SEARCH (LOCAL CACHE PREFERRED)
            if (royalCatalog.length > 0) {
                const words = q.split(' ').filter(w => w.length > 2);
                let matched = royalCatalog.filter(p => {
                    // Check if category matches or all keywords are found in name/description
                    return q.includes(p.category.toLowerCase()) || 
                           (words.length > 0 && words.every(word => p.name.toLowerCase().includes(word) || p.description.toLowerCase().includes(word)));
                });

                // Single short-word matching fallback
                if (matched.length === 0 && q.length > 2) {
                    matched = royalCatalog.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
                }

                if (matched.length > 0) {
                    const displayLimit = matched.slice(0, 3);
                    addMessage(`I found ${matched.length} beautiful items matching your interest:`);
                    displayLimit.forEach(p => {
                        const card = document.createElement('div');
                        card.className = 'royal-chat-product-card';
                        card.innerHTML = `
                            <img src="${p.image_url}" class="royal-chat-product-img" alt="${escapeHtml(p.name)}">
                            <div class="royal-chat-product-details">
                                <span class="royal-chat-product-name">${escapeHtml(p.name)}</span>
                                <span class="royal-chat-product-price">₹${p.price}</span>
                                <a href="product.html?id=${p.id}" class="royal-chat-product-link">View Details</a>
                            </div>
                        `;
                        msgsContainer.appendChild(card);
                    });
                    scrollBottom();
                    return;
                }
            }

            // 6. LIVE FALLBACK TO SUPABASE (IF NOT FOUND LOCALLY)
            if (sb) {
                try {
                    showTyping();
                    const words = q.split(' ').filter(w => w.length > 2);
                    let searchWord = words.length > 0 ? words[0] : q;
                    
                    const { data: matched, error } = await sb.from('products').select('*').ilike('name', `%${searchWord}%`).limit(3);
                    hideTyping();

                    if (matched && matched.length > 0) {
                        addMessage(`I found ${matched.length} match(es) for you:`);
                        matched.forEach(p => {
                            const card = document.createElement('div');
                            card.className = 'royal-chat-product-card';
                            card.innerHTML = `
                                <img src="${p.image_url}" class="royal-chat-product-img" alt="${escapeHtml(p.name)}">
                                <div class="royal-chat-product-details">
                                    <span class="royal-chat-product-name">${escapeHtml(p.name)}</span>
                                    <span class="royal-chat-product-price">₹${p.price}</span>
                                    <a href="product.html?id=${p.id}" class="royal-chat-product-link">View Details</a>
                                </div>
                            `;
                            msgsContainer.appendChild(card);
                        });
                        scrollBottom();
                        return;
                    }
                } catch (e) {
                    hideTyping();
                    console.error("Chatbot Search Error:", e);
                }
            }

            // 7. DEFAULT FALLBACK & OFF-TOPIC CHECK
            const offTopicIndicators = [
                'joke', 'riddle', 'weather', 'news', 'president', 'capital', 'country', 'math', 'calculate', 
                'define', 'meaning of', 'translate', 'cook', 'recipe', 'food', 'restaurant', 'game', 'sport',
                'movie', 'song', 'music', 'singer', 'actor', 'history', 'science', 'technology', 'code', 
                'program', 'python', 'javascript', 'html', 'css', 'write a', 'generate a', 'tell me a'
            ];
            
            const boutiqueKeywords = [
                'dress', 'shirt', 'pant', 'shoe', 'boot', 'heel', 'sandal', 'sneaker', 'clothe', 'wear', 'outfit', 'garment',
                'catalog', 'item', 'product', 'collection', 'ladies', 'women', 'kids', 'children', 'boy', 'girl',
                'shipping', 'delivery', 'return', 'refund', 'exchange', 'cancel', 'contact', 'support', 'whatsapp', 'instagram',
                'phone', 'price', 'cost', 'buy', 'order', 'purchase', 'size', 'fit', 'material', 'fabric', 'silk', 'cotton',
                'frock', 'kurti', 'saree', 'top', 'jeans', 'tshirt', 'skirt', 'jacket', 'coat', 'boutique', 'shop', 'store',
                'jewelry', 'cosmetic', 'earring', 'necklace', 'makeup', 'lip', 'skin', 'perfume', 'fragrance',
                'innerwear', 'underwear', 'bra', 'brief', 'sock', 'vest', 'stock', 'list', 'show', 'search', 'find'
            ];

            const hasBoutiqueKeyword = boutiqueKeywords.some(keyword => q.includes(keyword));
            const hasOffTopicIndicator = offTopicIndicators.some(indicator => q.includes(indicator));
            const isGeneralQuestion = /^(what|how|why|who|where|when|can\s+you\s+tell|tell\s+me)\b/i.test(q) && !hasBoutiqueKeyword;

            if (hasOffTopicIndicator || isGeneralQuestion) {
                addMessage("I am the <strong>Royal Assistant</strong>, specialized in helping you discover and shop beautiful outfits at our boutique! 👑 I'm not able to answer off-topic questions. Try asking to 'show catalog', or browse our 'Ladies', 'Kids', or 'Shoes' categories!");
                renderSuggestions([
                    { text: "📖 Show Catalog", val: "show catalog" },
                    { text: "👗 Shop Ladies", val: "Ladies Category" },
                    { text: "🧸 Kids Clothes", val: "Kids Category" },
                    { text: "📦 Shipping Policy", val: "Shipping Policy" },
                    { text: "↩️ Returns Info", val: "Return Policy" }
                ]);
                return;
            }

            addMessage("I searched our boutique, but couldn't find a direct match. Try asking to 'show catalog' to view all dress names, or search for category terms like 'Ladies', 'Kids', or 'Shoes'! 👑");
            renderSuggestions([
                { text: "📖 Show Catalog", val: "show catalog" },
                { text: "👗 Shop Ladies", val: "Ladies Category" },
                { text: "🧸 Kids Clothes", val: "Kids Category" },
                { text: "📦 Shipping Policy", val: "Shipping Policy" },
                { text: "↩️ Returns Info", val: "Return Policy" }
            ]);
        }, 1000);
    }
    updateChatbotVisibility();
}

// Global Chatbot Initializer Trigger
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initRoyalChatbot();
        updateChatbotVisibility();
    });
} else {
    initRoyalChatbot();
    updateChatbotVisibility();
}

// ==========================================================================
// GLOBAL HEADER LOGIN ICON (Injected into every page)
// ==========================================================================
window.hasLocalStorageSession = hasLocalStorageSession;
function hasLocalStorageSession() {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('auth-token') || key === 'supabase.auth.token')) {
                const token = localStorage.getItem(key);
                if (token) return true;
            }
        }
    } catch(e) {}
    return false;
}

function updateGlobalLoginIcon(session) {
    const loginLink = document.getElementById('royal-login-icon');
    if (!loginLink) return;

    const isLoggedIn = (session && session.user) || hasLocalStorageSession();
    if (isLoggedIn) {
        loginLink.href = 'profile.html';
        loginLink.title = 'My Profile';
        loginLink.innerHTML = '<i class="fas fa-user" style="color: var(--color-accent, #065184);"></i>';
    } else {
        loginLink.href = 'login.html';
        loginLink.title = 'Login / My Account';
        loginLink.innerHTML = '<i class="far fa-user"></i>';
    }
}

async function initGlobalLoginIcon() {
    const headerIcons = document.querySelector('.header-icons');
    if (!headerIcons) return;

    let loginLink = document.getElementById('royal-login-icon');
    if (!loginLink) {
        const style = document.createElement('style');
        style.innerHTML = `
            #royal-login-icon {
                position: relative;
                font-size: 1.2rem;
                color: #000000;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                transition: transform 0.2s ease;
                text-decoration: none;
            }
            #royal-login-icon:hover { transform: scale(1.1); color: #000000; }
        `;
        document.head.appendChild(style);

        loginLink = document.createElement('a');
        loginLink.id = 'royal-login-icon';
        const isLoggedIn = hasLocalStorageSession();
        loginLink.href = isLoggedIn ? 'profile.html' : 'login.html';
        loginLink.title = isLoggedIn ? 'My Profile' : 'Login / My Account';
        loginLink.innerHTML = isLoggedIn 
            ? '<i class="fas fa-user" style="color: var(--color-accent, #065184);"></i>' 
            : '<i class="far fa-user"></i>';

        const notifIcon = headerIcons.querySelector('.notification-icon');
        if (notifIcon) {
            headerIcons.insertBefore(loginLink, notifIcon);
        } else {
            headerIcons.appendChild(loginLink);
        }
    }

    if (sb) {
        try {
            const { data: { session } } = await sb.auth.getSession();
            updateGlobalLoginIcon(session);
        } catch(e) {}
    }
}

// Global Login Icon Initializer Trigger
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initGlobalLoginIcon());
} else {
    initGlobalLoginIcon();
}

// ==========================================================================
// SCROLL REVEAL ANIMATION (Fade in from down to up)
// ==========================================================================
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length === 0) return;

    const observerOptions = {
        root: null, // use viewport
        rootMargin: '0px', // trigger exactly at viewport edge
        threshold: 0.05 // trigger when 5% of the card is visible
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-active');
                obs.unobserve(entry.target); // reveal only once
            }
        });
    }, observerOptions);

    revealElements.forEach(el => observer.observe(el));
}

// Scroll Reveal Initializer Trigger
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollReveal);
} else {
    initScrollReveal();
}
window.addEventListener('load', initScrollReveal);

// ==========================================================================
// ADMIN DASHBOARD MODULE
// ==========================================================================
let salesChartInstance = null;

async function loadAdminDashboard() {
    if (!sb) return;
    try {
        const { data: orders, error: ordersErr } = await sb.from('orders').select('*').neq('status', 'Pending Payment').order('created_at', { ascending: false });
        if (ordersErr) throw ordersErr;

        const { data: products, error: productsErr } = await sb.from('products').select('*');
        if (productsErr) throw productsErr;

        // Calculate metrics
        const totalOrders = orders ? orders.length : 0;
        
        let totalRevenue = 0;
        let todaySales = 0;
        const today = new Date();
        const customerEmails = new Set();

        if (orders) {
            orders.forEach(o => {
                totalRevenue += Number(o.total_amount || 0);
                
                // Compare order date to today's local date
                const orderDate = new Date(o.created_at);
                if (
                    orderDate.getDate() === today.getDate() &&
                    orderDate.getMonth() === today.getMonth() &&
                    orderDate.getFullYear() === today.getFullYear()
                ) {
                    todaySales += Number(o.total_amount || 0);
                }

                if (o.customer_email) {
                    customerEmails.add(o.customer_email.toLowerCase().trim());
                }
            });
        }

        const totalProducts = products ? products.length : 0;
        const totalCustomers = customerEmails.size;

        // Update UI
        document.getElementById('stat-total-orders').innerText = totalOrders;
        document.getElementById('stat-total-revenue').innerText = `₹${totalRevenue.toFixed(2)}`;
        document.getElementById('stat-today-sales').innerText = `₹${todaySales.toFixed(2)}`;
        document.getElementById('stat-total-products').innerText = totalProducts;
        document.getElementById('stat-total-customers').innerText = totalCustomers;

        compileLowStockAlerts(products);
        renderSalesChart(orders || []);
        renderRecentOrders(orders || []);

    } catch (e) {
        console.error("loadAdminDashboard Error:", e);
    }
}

function compileLowStockAlerts(products) {
    const alertsList = document.getElementById('low-stock-alerts-list');
    if (!alertsList) return;

    const lowStockItems = [];

    if (products) {
        products.forEach(p => {
            let hasVariants = false;
            
            if (p.variants) {
                if (Array.isArray(p.variants) && p.variants.length > 0) {
                    hasVariants = true;
                    p.variants.forEach(v => {
                        if (v.sizes && Array.isArray(v.sizes)) {
                            v.sizes.forEach(s => {
                                if (Number(s.stock) < 10) {
                                    lowStockItems.push({
                                        id: p.id,
                                        name: p.name,
                                        detail: `${v.name} - Size ${s.size}`,
                                        stock: s.stock
                                    });
                                }
                            });
                        }
                    });
                } else if (typeof p.variants === 'object') {
                    if (Array.isArray(p.variants.options)) {
                        hasVariants = true;
                        p.variants.options.forEach(o => {
                            if (Number(o.stock) < 10) {
                                lowStockItems.push({
                                    id: p.id,
                                    name: p.name,
                                    detail: `Size ${o.size}`,
                                    stock: o.stock
                                });
                            }
                        });
                    } else {
                        const keys = Object.keys(p.variants).filter(k => k !== 'gallery');
                        if (keys.length > 0) {
                            hasVariants = true;
                            keys.forEach(k => {
                                const option = p.variants[k];
                                if (option && option.stock !== undefined && Number(option.stock) < 10) {
                                    lowStockItems.push({
                                        id: p.id,
                                        name: p.name,
                                        detail: `Size ${k}`,
                                        stock: option.stock
                                    });
                                }
                            });
                        }
                    }
                }
            }

            if (!hasVariants) {
                if (Number(p.stock_quantity) < 10) {
                    lowStockItems.push({
                        id: p.id,
                        name: p.name,
                        detail: "Standard Inventory",
                        stock: p.stock_quantity
                    });
                }
            }
        });
    }

    if (lowStockItems.length === 0) {
        alertsList.innerHTML = '<div class="empty-state">No low stock items.</div>';
        return;
    }

    // Sort: 0 stock (out of stock) items at the very top, followed by lowest to highest stock
    lowStockItems.sort((a, b) => Number(a.stock) - Number(b.stock));

    alertsList.innerHTML = lowStockItems.map(item => {
        const isOutOfStock = Number(item.stock) === 0;
        const badgeText = isOutOfStock ? 'OUT OF STOCK' : `${item.stock} left`;
        const badgeStyle = isOutOfStock ? 'style="background: #991b1b; color: #ffffff;"' : '';
        return `
            <div class="alert-item" onclick="editProduct(${item.id})">
                <div class="alert-product-info">
                    <span class="alert-product-name">${escapeHtml(item.name)}</span>
                    <span class="alert-product-detail">${escapeHtml(item.detail)}</span>
                </div>
                <span class="alert-badge-red" ${badgeStyle}>${badgeText}</span>
            </div>
        `;
    }).join('');
}

function renderSalesChart(orders) {
    const canvas = document.getElementById('salesAnalyticsChart');
    if (!canvas) return;

    const last7Days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        last7Days.push({
            dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            rawDate: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
            total: 0
        });
    }

    orders.forEach(o => {
        const orderDate = new Date(o.created_at);
        const orderMidnight = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
        
        const dayMatch = last7Days.find(day => 
            day.rawDate.getTime() === orderMidnight.getTime()
        );
        if (dayMatch) {
            dayMatch.total += Number(o.total_amount || 0);
        }
    });

    const labels = last7Days.map(d => d.dateStr);
    const data = last7Days.map(d => d.total);

    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(6, 81, 132, 0.25)');
    gradient.addColorStop(1, 'rgba(6, 81, 132, 0.01)');

    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue (₹)',
                data: data,
                borderColor: '#065184',
                backgroundColor: gradient,
                fill: true,
                borderWidth: 2.5,
                tension: 0.35,
                pointBackgroundColor: '#065184',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#121212',
                    titleFont: { family: 'Montserrat', size: 12, weight: 'bold' },
                    bodyFont: { family: 'Montserrat', size: 12 },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return '₹' + context.raw.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: { family: 'Montserrat', size: 10, weight: 500 },
                        color: '#555555'
                    }
                },
                y: {
                    grid: {
                        borderDash: [5, 5],
                        color: '#e2e2e2'
                    },
                    ticks: {
                        font: { family: 'Montserrat', size: 10, weight: 500 },
                        color: '#555555',
                        callback: function(value) {
                            return '₹' + value;
                        }
                    }
                }
            }
        }
    });
}

function renderRecentOrders(orders) {
    const tbody = document.getElementById('dashboard-recent-orders-body');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No recent orders.</td></tr>';
        return;
    }

    const recent5 = orders.slice(0, 5);

    tbody.innerHTML = recent5.map(o => {
        const orderDate = new Date(o.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <tr>
                <td><strong>#${o.id}</strong></td>
                <td>
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600;">${escapeHtml(o.customer_name)}</span>
                        <span style="font-size:0.75rem; color:var(--color-secondary);">${escapeHtml(o.customer_email || '')}</span>
                    </div>
                </td>
                <td>${orderDate}</td>
                <td>₹${Number(o.total_amount).toFixed(2)}</td>
                <td>
                    <span class="status-badge ${o.status === 'Pending' ? 'status-pending' : 'status-paid'}">
                        ${escapeHtml(o.status)}
                    </span>
                </td>
                <td style="text-align: right;">
                    <button class="btn btn-sm btn-ghost" onclick="viewOrderDetailsInOrdersTab(${o.id})">View</button>
                </td>
            </tr>
        `;
    }).join('');
}

window.viewOrderDetailsInOrdersTab = function(orderId) {
    switchAdminTab('orders-section');
    const searchInput = document.getElementById('order-search-input');
    if (searchInput) {
        searchInput.value = `#${orderId}`;
        filterOrdersLocal();
    }
};

// End of script.js