document.addEventListener('DOMContentLoaded', () => {
    
    const products = {
        ladies: [
            { id: 1, name: "Sapphire Anarkali", price: "₹4,599", img: "https://placehold.co/400x550/f0f8ff/5DADE2?text=Blue+Anarkali", tag: "Ladies Couture" },
            { id: 2, name: "Silk Chiffon Saree", price: "₹2,899", img: "https://placehold.co/400x550/f0f8ff/5DADE2?text=Silk+Saree", tag: "Ladies Couture" },
            { id: 3, name: "Embroidered Kurti", price: "₹1,299", img: "https://placehold.co/400x550/f0f8ff/5DADE2?text=Kurti+Set", tag: "Ladies Couture" },
            { id: 4, name: "Royal Velvet Gown", price: "₹5,999", img: "https://placehold.co/400x550/f0f8ff/5DADE2?text=Velvet+Gown", tag: "Ladies Couture" }
        ],
        kids: [
            { id: 5, name: "Little Prince Sherwani", price: "₹1,999", img: "https://placehold.co/400x550/f0f8ff/5DADE2?text=Kids+Sherwani", tag: "Little Royals" },
            { id: 6, name: "Princess Tulle Frock", price: "₹1,499", img: "https://placehold.co/400x550/f0f8ff/5DADE2?text=Blue+Frock", tag: "Little Royals" },
            { id: 7, name: "Festive Dhoti Set", price: "₹1,199", img: "https://placehold.co/400x550/f0f8ff/5DADE2?text=Dhoti+Kurta", tag: "Little Royals" },
            { id: 8, name: "Velvet Party Coat", price: "₹2,100", img: "https://placehold.co/400x550/f0f8ff/5DADE2?text=Kids+Blazer", tag: "Little Royals" }
        ],
        cosmetics: [
            { id: 9, name: "Diamond Jewellery Set", price: "₹899", img: "https://placehold.co/400x550/f0f8ff/5DADE2?text=Necklace+Set", tag: "Ornaments" },
            { id: 10, name: "Matte Lipstick Trio", price: "₹599", img: "https://placehold.co/400x550/f0f8ff/5DADE2?text=Lipsticks", tag: "Cosmetics" },
            { id: 11, name: "Silver Plated Bangles", price: "₹450", img: "https://placehold.co/400x550/f0f8ff/5DADE2?text=Bangles", tag: "Ornaments" },
            { id: 12, name: "Organic Kajal", price: "₹299", img: "https://placehold.co/400x550/f0f8ff/5DADE2?text=Kajal", tag: "Cosmetics" }
        ]
    };

    const productContainer = document.getElementById('product-container');
    const tabButtons = document.querySelectorAll('.tab-btn');

    function renderProducts(category) {
        productContainer.innerHTML = '';
        
        const items = products[category];
        
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-image">
                    <img src="${item.img}" alt="${item.name}">
                    <div class="hover-actions">
                        <button class="action-btn" title="Add to Cart"><i class="fas fa-shopping-bag"></i></button>
                        <button class="action-btn" title="Wishlist"><i class="far fa-heart"></i></button>
                    </div>
                </div>
                <div class="product-info">
                    <div class="category-tag">${item.tag}</div>
                    <h4 class="product-title">${item.name}</h4>
                    <div class="product-price">${item.price}</div>
                </div>
            `;
            productContainer.appendChild(card);
        });
    }

    renderProducts('ladies');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.getAttribute('data-target');
            renderProducts(target);
        });
    });

    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.main-navigation');

    if(mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            if(nav.style.display === 'block') {
                nav.style.display = 'none';
            } else {
                nav.style.display = 'block';
            }
        });
    }

    const cosmeticTrack = document.getElementById('cosmetic-track');
    if(cosmeticTrack) {
        cosmeticTrack.innerHTML = '<p style="text-align:center; padding:20px; width:100%; color:#666;">New Cosmetic Arrivals Carousel Loading...</p>';
    }
});