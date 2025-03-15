document.addEventListener('DOMContentLoaded', function() {
    // Variables para el carrito
    const cartBtn = document.getElementById('cartBtn');
    const cartSidebar = document.querySelector('.cart-sidebar');
    const cartOverlay = document.querySelector('.cart-overlay');
    const closeCartBtn = document.querySelector('.close-cart');
    const cartItemsContainer = document.querySelector('.cart-items');
    let cart = [];

    // Variables para el menú móvil
    const menuToggle = document.querySelector('.menu-toggle');
    const menuIcon = document.querySelector('.menu-icon');
    const navLinks = document.querySelector('.nav-links');
    const navItems = navLinks.querySelectorAll('li');
    let isMenuOpen = false;

    // Datos de ejemplo para los productos
    const menuItems = {
        rolls: [
            {
                id: 1,
                name: "Roll California",
                price: 12.99,
                description: "Aguacate, pepino, cangrejo, cubierto con sésamo",
                image: "/public/images/roll-california.jpg"
            },
            {
                id: 2,
                name: "Roll Filadelfia",
                price: 14.99,
                description: "Salmón, queso crema, aguacate, pepino",
                image: "/public/images/roll-filadelfia.jpg"
            },
            {
                id: 3,
                name: "Roll Tempura",
                price: 13.99,
                description: "Camarón tempura, aguacate, pepino, cubierto con sésamo",
                image: "/public/images/roll-tempura.jpg"
            }
        ],
        nigiri: [
            {
                id: 4,
                name: "Nigiri de Salmón",
                price: 3.99,
                description: "Salmón fresco sobre arroz",
                image: "/public/images/nigiri-salmon.jpg"
            }
        ],
        sashimi: [
            {
                id: 5,
                name: "Sashimi de Atún",
                price: 15.99,
                description: "5 cortes de atún fresco",
                image: "/public/images/sashimi-atun.jpg"
            }
        ],
        bebidas: [
            {
                id: 6,
                name: "Sake",
                price: 8.99,
                description: "Sake tradicional japonés",
                image: "/public/images/sake.jpg"
            }
        ]
    };

    // Configurar índices para la animación de los elementos del menú
    navItems.forEach((item, index) => {
        item.style.setProperty('--item-index', index);
    });

    // Funciones del carrito
    function toggleCart() {
        if (isMenuOpen) {
            closeMenu();
        }
        cartSidebar.classList.toggle('active');
        cartOverlay.classList.toggle('active');
        document.body.style.overflow = cartSidebar.classList.contains('active') ? 'hidden' : '';
    }

    function closeCart() {
        cartSidebar.classList.remove('active');
        cartOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function updateCartCount() {
        const cartCount = document.querySelector('.cart-btn span');
        cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    }

    function updateCartTotal() {
        const totalElement = document.querySelector('.total-amount');
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        totalElement.textContent = `$${total.toFixed(2)}`;
    }

    function addToCart(item) {
        const existingItem = cart.find(cartItem => cartItem.id === item.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({...item, quantity: 1});
        }
        
        updateCart();
        // Asegurarnos que el carrito se abra
        cartSidebar.classList.add('active');
        cartOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function removeFromCart(itemId) {
        cart = cart.filter(item => item.id !== itemId);
        updateCart();
    }

    function updateItemQuantity(itemId, change) {
        const item = cart.find(item => item.id === itemId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                removeFromCart(itemId);
            } else {
                updateCart();
            }
        }
    }

    function updateCart() {
        const cartItemsContainer = document.querySelector('.cart-items');
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-basket"></i>
                    <p>Tu carrito está vacío</p>
                </div>
            `;
        } else {
            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="cart-item" data-id="${item.id}">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                    <div class="cart-item-details">
                        <h4 class="cart-item-name">${item.name}</h4>
                        <p class="cart-item-description">${item.description || ''}</p>
                        <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                        <div class="cart-item-quantity">
                            <button class="quantity-btn decrease" onclick="updateItemQuantity(${item.id}, -1)">-</button>
                            <span>${item.quantity}</span>
                            <button class="quantity-btn increase" onclick="updateItemQuantity(${item.id}, 1)">+</button>
                            <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        updateCartCount();
        updateCartTotal();
    }

    // Funciones del menú móvil
    function toggleMenu() {
        if (cartSidebar.classList.contains('active')) {
            closeCart();
        }
        isMenuOpen = !isMenuOpen;
        menuToggle.classList.toggle('active');
        
        navLinks.style.display = 'flex';
        // Forzar un reflow
        navLinks.offsetHeight;
        
        if (isMenuOpen) {
            navLinks.classList.add('active');
            menuIcon.classList.remove('fa-bars');
            menuIcon.classList.add('fa-times');
        } else {
            closeMenu();
        }
        
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    }

    function closeMenu() {
        isMenuOpen = false;
        menuToggle.classList.remove('active');
        menuIcon.classList.remove('fa-times');
        menuIcon.classList.add('fa-bars');
        
        navLinks.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Funciones del menú de productos
    function displayMenuItems(category = 'rolls') {
        const menuContainer = document.querySelector('.menu-items');
        const items = menuItems[category] || [];
        
        menuContainer.innerHTML = items.map(item => `
            <div class="menu-item-card">
                <img src="${item.image}" alt="${item.name}" class="menu-item-image">
                <div class="menu-item-content">
                    <div class="menu-item-header">
                        <h3 class="menu-item-name">${item.name}</h3>
                        <span class="menu-item-price">$${item.price.toFixed(2)}</span>
                    </div>
                    <p class="menu-item-description">${item.description}</p>
                    <button class="add-to-cart-btn" onclick='addToCart(${JSON.stringify({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        image: item.image,
                        description: item.description
                    })})'>
                        <i class="fas fa-shopping-cart"></i>
                        Agregar al carrito
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Event Listeners para las categorías del menú
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remover clase active de todos los botones
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            // Agregar clase active al botón clickeado
            button.classList.add('active');
            // Mostrar los productos de la categoría seleccionada
            const category = button.textContent.toLowerCase();
            displayMenuItems(category);
        });
    });

    // Mostrar productos iniciales
    displayMenuItems();

    // Event Listeners para el carrito
    cartBtn.addEventListener('click', function(e) {
        e.preventDefault();
        toggleCart();
    });

    closeCartBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', function(e) {
        if (e.target === cartOverlay) {
            closeCart();
        }
    });

    // Event Listeners para el menú móvil
    menuToggle.addEventListener('click', toggleMenu);

    // Manejar la transición del menú
    navLinks.addEventListener('transitionend', function(e) {
        if (e.propertyName === 'opacity' && !isMenuOpen) {
            navLinks.style.display = 'none';
        }
    });

    // Cerrar menú al hacer click en un enlace
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                closeMenu();
                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth' });
                }, 300);
            } else {
                closeMenu();
            }
        });
    });

    // Cerrar menú y carrito con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (cartSidebar.classList.contains('active')) {
                closeCart();
            }
            if (isMenuOpen) {
                closeMenu();
            }
        }
    });

    // Cerrar menú al hacer click fuera
    document.addEventListener('click', function(e) {
        if (isMenuOpen && 
            !e.target.closest('.nav-links') && 
            !e.target.closest('.menu-toggle')) {
            closeMenu();
        }
    });

    // Cambiar color de navbar al hacer scroll
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.backgroundColor = '#9A0024';
        } else {
            navbar.style.backgroundColor = '#BB002B';
        }
    });

    // Exponer funciones necesarias globalmente
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.updateItemQuantity = updateItemQuantity;
}); 