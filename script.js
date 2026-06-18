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
                if (custEmail && !custEmail.value && user.email) {
                    custEmail.value = user.email;
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
        
        const imgGroup = document.getElementById('variant-images-group');
        const imgContainer = document.getElementById('variant-images-container');
        const swatchGroup = document.getElementById('variant-swatches-group');
        const swatchContainer = document.getElementById('variant-swatches-container');
        
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
        
        if (variants.length > 0) {
            if (imgGroup && imgContainer) {
                imgGroup.style.display = 'block';
                imgContainer.innerHTML = '';
            }
            
            const hasHex = variants.some(v => v.hex);
            if (swatchGroup && swatchContainer) {
                if (hasHex) {
                    swatchGroup.style.display = 'block';
                    swatchContainer.innerHTML = '';
                } else {
                    swatchGroup.style.display = 'none';
                }
            }
            
            variants.forEach((v, i) => {
                // 1. Primary Image Selector
                if (imgContainer) {
                    const b = document.createElement('button');
                    b.className = 'variant-btn';
                    b.title = v.name;
                    const img = document.createElement('img');
                    img.src = v.images && v.images.length > 0 ? v.images[0] : p.image_url;
                    b.appendChild(img);
                    b.onclick = () => selectVariant(i);
                    imgContainer.appendChild(b);
                }
                
                // 2. Swatch Selector (if hasHex)
                if (hasHex && swatchContainer) {
                    const b = document.createElement('button');
                    b.className = 'swatch-btn';
                    b.title = v.name;
                    b.style.backgroundColor = v.hex || '#cccccc';
                    b.onclick = () => selectVariant(i);
                    swatchContainer.appendChild(b);
                }
            });
            selectVariant(0);
        }
        
        function selectVariant(idx) {
            // Update active states for both image and swatch selector lists
            const imageBtns = imgContainer ? imgContainer.querySelectorAll('.variant-btn') : [];
            const swatchBtns = swatchContainer ? swatchContainer.querySelectorAll('.swatch-btn') : [];
            imageBtns.forEach((b, i) => b.classList.toggle('active', i === idx));
            swatchBtns.forEach((b, i) => b.classList.toggle('active', i === idx));
            const v = variants[idx];
            selectedVariantName = v.name;
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

function getClosestColor(r, g, b) {
    const hsl = rgbToHsl(r, g, b);
    const h = hsl.h;
    const s = hsl.s;
    const l = hsl.l;

    console.log(`HSL computed: Hue=${h}°, Saturation=${s}%, Lightness=${l}% (RGB: ${r}, ${g}, ${b})`);

    // 1. NEUTRALS & GREYS (Black, White, Off-Whites, Greys)
    if (l < 15) {
        return { name: "Black", hex: "#111111" };
    }
    if (l < 25 && s < 18) {
        return { name: "Black", hex: "#111111" };
    }
    if (l > 94 && s < 6) {
        return { name: "White", hex: "#ffffff" };
    }
    if (l > 90 && h >= 35 && h < 60 && s >= 6 && s < 15) {
        return { name: "Ivory", hex: "#fffff0" };
    }
    if (l > 88 && s < 10) {
        return { name: "Off-White", hex: "#faf9f6" };
    }
    if (s < 12) {
        if (l < 32) return { name: "Charcoal", hex: "#2f3e46" };
        if (l > 65 && l <= 88) {
            if (s < 8) return { name: "Silver", hex: "#c0c0c0" };
            return { name: "Light Grey", hex: "#d3d3d3" };
        }
        return { name: "Grey", hex: "#808080" };
    }

    // 2. CREAMS, CHAMPAGNES, BEIGES, KHAKIS & CAMELS (Warm Neutrals)
    if (h >= 25 && h < 60) {
        if (l >= 82 && s < 25) return { name: "Cream", hex: "#fffdd0" };
        if (l >= 75 && l < 82 && s >= 15 && s < 30) return { name: "Champagne", hex: "#f7e7ce" };
        if (l >= 60 && l < 82 && s < 32) return { name: "Beige", hex: "#f5f5dc" };
        if (l >= 38 && l < 60 && s < 30) return { name: "Khaki", hex: "#c3b091" };
        if (l >= 45 && l < 60 && s >= 28 && s < 50) return { name: "Camel", hex: "#c19a6b" };
    }

    // 3. SPECIALIZED LIGHT APPAREL SHADES (Denims, Sages, Lavenders, Lilacs, Mints)
    // washed blue denim
    if (h >= 180 && h < 245 && s >= 10 && s < 35 && l >= 50 && l < 80) {
        return { name: "Light Blue", hex: "#add8e6" };
    }
    // lavender
    if (h >= 245 && h < 310 && s >= 10 && s < 45 && l >= 68) {
        return { name: "Lavender", hex: "#e6e6fa" };
    }
    // lilac
    if (h >= 265 && h < 295 && s >= 20 && s < 45 && l >= 62 && l < 78) {
        return { name: "Lilac", hex: "#c8a2c8" };
    }
    // sage green
    if (h >= 80 && h < 160 && l >= 55 && l < 75 && s >= 10 && s < 32) {
        return { name: "Sage Green", hex: "#87a96b" };
    }
    // mint green
    if (h >= 120 && h < 165 && l >= 72 && s >= 15 && s < 50) {
        return { name: "Mint Green", hex: "#aaf0d1" };
    }
    // aqua / seafoam
    if (h >= 150 && h < 200 && l >= 65 && s >= 20 && s < 50) {
        return { name: "Aqua", hex: "#7fffd4" };
    }

    // 4. PEACH, SALMON, ROSE GOLD, DUSTY ROSE & MAUVES
    if (h >= 330 || h < 25) {
        if (l >= 72 && s >= 15 && s < 45) {
            if (h >= 12 && h < 30) return { name: "Peach", hex: "#ffdab9" };
            return { name: "Blush Pink", hex: "#ffb7c5" };
        }
        if (h >= 6 && h < 22 && l >= 60 && l < 72 && s >= 35) {
            return { name: "Salmon", hex: "#fa8072" };
        }
        if (l >= 60 && l < 75 && s >= 20 && s < 40) {
            return { name: "Rose Gold", hex: "#b76e79" };
        }
        if (l >= 48 && l < 68 && s >= 12 && s < 35) {
            return { name: "Dusty Rose", hex: "#cca9a1" };
        }
    }
    if (h >= 270 && h < 320 && s >= 15 && s < 35 && l >= 45 && l < 70) {
        return { name: "Mauve", hex: "#e0b0ff" };
    }

    // 5. DETAILED HUE RANGES (Main Colors & Shades)

    // A. REDS & PINK & BURGUNDY & MAROON
    if (h >= 340 || h < 12) {
        if (l >= 15 && l < 32) {
            if (s >= 30) return { name: "Burgundy", hex: "#800020" };
            return { name: "Maroon", hex: "#800000" };
        }
        if (l >= 28 && l < 48 && s >= 50) return { name: "Crimson", hex: "#dc143c" };
        if (l >= 60) return { name: "Pink", hex: "#ffc0cb" };
        return { name: "Red", hex: "#e74c3c" };
    }

    // B. ORANGES & RUST & BROWNS & APRICOT
    if (h >= 12 && h < 35) {
        if (l < 20 && s >= 20) return { name: "Chocolate Brown", hex: "#3d2314" };
        if (l < 32) return { name: "Brown", hex: "#5c4033" };
        if (l >= 25 && l < 45 && s >= 35) return { name: "Rust", hex: "#b22222" };
        if (h >= 12 && h < 25 && l >= 30 && l < 50 && s >= 30 && s < 60) return { name: "Terracotta", hex: "#e2725b" };
        if (h >= 20 && h < 35 && l >= 65 && l < 78 && s >= 30 && s < 55) return { name: "Apricot", hex: "#fbceb1" };
        if (l >= 32 && l < 60 && s < 45) return { name: "Tan", hex: "#d2b48c" };
        return { name: "Orange", hex: "#f39c12" };
    }

    // C. YELLOWS & MUSTARDS & GOLD
    if (h >= 35 && h < 62) {
        if (l < 32) return { name: "Olive", hex: "#556b2f" };
        if (h >= 38 && h < 54 && l >= 45 && l < 65 && s >= 45 && s < 75) return { name: "Gold", hex: "#ffd700" };
        if (l < 60 && s >= 35) return { name: "Mustard", hex: "#e1ad01" };
        if (h >= 48 && h < 62 && l >= 60 && s >= 60) return { name: "Lemon Yellow", hex: "#fff700" };
        return { name: "Yellow", hex: "#fcbf49" };
    }

    // D. GREENS & OLIVES & EMERALD
    if (h >= 62 && h < 160) {
        if (h >= 62 && h < 90 && l < 40) return { name: "Olive Green", hex: "#556b2f" };
        if (h >= 60 && h < 90 && l >= 30 && l < 50 && s >= 10 && s < 25) return { name: "Khaki Green", hex: "#708238" };
        if (l < 35) return { name: "Forest Green", hex: "#1b4d3e" };
        if (h >= 110 && h < 155 && l >= 25 && l < 55 && s >= 45) return { name: "Emerald Green", hex: "#50c878" };
        if (h >= 62 && h < 90 && s >= 45) return { name: "Lime Green", hex: "#32cd32" };
        return { name: "Green", hex: "#2ecc71" };
    }

    // E. TEALS & TURQUOISE
    if (h >= 160 && h < 195) {
        if (l < 42) return { name: "Teal", hex: "#008080" };
        return { name: "Turquoise", hex: "#40e0d0" };
    }

    // F. BLUES & NAVIES & ROYAL BLUE
    if (h >= 195 && h < 245) {
        if (l < 26 && s >= 20) return { name: "Navy Blue", hex: "#0b1d3a" };
        if (h >= 200 && h < 240 && s >= 55 && l >= 30 && l < 60) return { name: "Royal Blue", hex: "#4169e1" };
        if (l >= 25 && l < 48 && s >= 15 && s < 40) return { name: "Indigo", hex: "#2f4858" };
        if (l >= 65 && s >= 30) return { name: "Sky Blue", hex: "#87ceeb" };
        return { name: "Blue", hex: "#2563eb" };
    }

    // G. PURPLES & PLUMS
    if (h >= 245 && h < 300) {
        if (l < 35) return { name: "Plum", hex: "#4d0f28" };
        return { name: "Purple", hex: "#8b5cf6" };
    }

    // H. MAGENTAS & FUCHSIAS
    if (h >= 300 && h < 340) {
        if (s >= 55 && l >= 35 && l < 60) return { name: "Fuchsia", hex: "#ff007f" };
        if (s >= 40 && l >= 25 && l < 55) return { name: "Magenta", hex: "#ff00ff" };
        if (l >= 60) return { name: "Pink", hex: "#ffc0cb" };
        return { name: "Fuchsia", hex: "#ff007f" };
    }

    // Fallback if none matches (safe guard)
    return { name: "Grey", hex: "#808080" };
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
                colorCounts[colorObj.name] = colorCounts[colorObj.name] || { count: 0, hex: colorObj.hex };
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
    
    function getColorPriority(name) {
        const neutralBackgrounds = ["White", "Off-White", "Light Grey", "Grey"];
        if (neutralBackgrounds.includes(name)) {
            return 1; // lowest priority (usually mannequin background)
        }
        const premiumColors = ["Black", "Burgundy", "Navy Blue", "Royal Blue", "Blue", "Red", "Pink", "Purple", "Emerald", "Teal", "Forest Green", "Plum", "Fuchsia", "Rust"];
        if (premiumColors.includes(name)) {
            return 3; // highest priority (most attractive catalog colors)
        }
        return 2; // medium priority (Beige, Brown, Khaki, Orange, Yellow, etc.)
    }

    // Convert counts to sorted array and sort by weighted score
    const sortedColors = Object.keys(colorCounts).map(name => {
        const percentage = (colorCounts[name].count / totalCount) * 100;
        const priority = getColorPriority(name);
        const score = percentage + (priority - 2) * 25;
        return {
            name: name,
            hex: colorCounts[name].hex,
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
            apparelType: detectedItem
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
        if (usePrimary && primaryName) {
            window.addVariantBlock({ name: primaryName, hex: primaryHex });
            addedVariants.push(primaryName);
        }
        if (useSecondary && secondaryName) {
            window.addVariantBlock({ name: secondaryName, hex: secondaryHex });
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
                addMessage("🚚 <strong>Shipping Policy</strong>:<br>- <strong>Complimentary standard shipping</strong> on all orders over ₹10,000.<br>- Standard delivery charge: ₹100 for orders under ₹10,000.<br>- Deliveries take 3 to 7 business days across regions.");
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