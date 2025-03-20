document.addEventListener('DOMContentLoaded', function() {
    // Variables para el carrito
    const cartBtn = document.getElementById('cartBtn');
    const cartSidebar = document.querySelector('.cart-sidebar');
    const cartOverlay = document.querySelector('.cart-overlay');
    const closeCartBtn = document.querySelector('.close-cart');
    const cartItemsContainer = document.querySelector('.cart-items');
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // Variables para el menú móvil
    const menuToggle = document.querySelector('.menu-toggle');
    const menuIcon = document.querySelector('.menu-icon');
    const navLinks = document.querySelector('.nav-links');
    const navItems = navLinks.querySelectorAll('li');
    const body = document.body;
    let isMenuOpen = false;
    let lastScrollTop = 0;

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

    // Función para guardar el carrito en localStorage
    function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    // Funciones del carrito
    function toggleCart(e) {
        e?.preventDefault();
        if (isMenuOpen) {
            closeMenu();
        }
        cartSidebar.classList.toggle('active');
        cartOverlay.classList.toggle('active');
        document.body.style.overflow = cartSidebar.classList.contains('active') ? 'hidden' : '';
        updateCart(); // Actualizar el carrito al abrirlo
    }

    function closeCart() {
        cartSidebar.classList.remove('active');
        cartOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function updateCartCount() {
        const cartCount = document.querySelector('.cart-btn span');
        if (cartCount) {
            const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }

    function updateCartTotal() {
        const totalElement = document.querySelector('.total-amount');
        if (totalElement) {
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            totalElement.textContent = `$${total.toFixed(2)}`;
        }
    }

    function addToCart(item) {
        try {
            const parsedItem = typeof item === 'string' ? JSON.parse(item) : item;
            const existingItem = cart.find(cartItem => cartItem.id === parsedItem.id);
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({...parsedItem, quantity: 1});
            }
            
            saveCart();
            updateCart();
            showNotification('Producto agregado al carrito', 'success');
            
            // Abrir el carrito
            cartSidebar.classList.add('active');
            cartOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } catch (error) {
            console.error('Error al agregar al carrito:', error);
            showNotification('Error al agregar el producto', 'error');
        }
    }

    function removeFromCart(itemId) {
        cart = cart.filter(item => item.id !== itemId);
        saveCart();
        updateCart();
        showNotification('Producto eliminado del carrito', 'success');
    }

    function updateItemQuantity(itemId, change) {
        const item = cart.find(item => item.id === itemId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                removeFromCart(itemId);
            } else {
                saveCart();
                updateCart();
            }
        }
    }

    function updateCart() {
        if (!cartItemsContainer) return;
        
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
                            <button class="quantity-btn decrease" onclick="window.updateItemQuantity(${item.id}, -1)">-</button>
                            <span>${item.quantity}</span>
                            <button class="quantity-btn increase" onclick="window.updateItemQuantity(${item.id}, 1)">+</button>
                        </div>
                    </div>
                    <button class="cart-item-remove" onclick="window.removeFromCart(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }

        updateCartCount();
        updateCartTotal();
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);
        
        // Mostrar la notificación
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Ocultar y eliminar la notificación
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Funciones del menú móvil
    function openMenu() {
        if (isMenuOpen) return;
        
        isMenuOpen = true;
        menuToggle.classList.add('active');
        body.classList.add('menu-open');
        
        // Mostrar el menú
        navLinks.style.display = 'flex';
        
        // Forzar un reflow
        void navLinks.offsetHeight;
        
        // Activar las animaciones
        requestAnimationFrame(() => {
            navLinks.classList.add('active');
            menuIcon.classList.remove('fa-bars');
            menuIcon.classList.add('fa-times');
            
            // Animar los elementos del menú
            navItems.forEach((item, index) => {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                
                // Forzar un reflow
                void item.offsetWidth;
                
                item.style.transition = `all 0.3s ease ${index * 0.1}s`;
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            });
        });
    }

    function closeMenu() {
        if (!isMenuOpen) return;

        isMenuOpen = false;
        menuToggle.classList.remove('active');
        menuIcon.classList.remove('fa-times');
        menuIcon.classList.add('fa-bars');
        body.classList.remove('menu-open');

        // Animar la salida de los elementos
        navItems.forEach((item, index) => {
            item.style.transition = 'all 0.3s ease';
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
        });

        // Animar la salida del menú
        navLinks.classList.remove('active');

        // Esperar a que terminen las animaciones antes de ocultar
        setTimeout(() => {
            if (!isMenuOpen) {
                navLinks.style.display = 'none';
                // Limpiar estilos
                navItems.forEach(item => {
                    item.removeAttribute('style');
                });
            }
        }, 300);
    }

    function toggleMenu(e) {
        e?.preventDefault();
        e?.stopPropagation();
        
        if (cartSidebar?.classList.contains('active')) {
            closeCart();
        }
        
        if (!isMenuOpen) {
            openMenu();
        } else {
            closeMenu();
        }
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
    if (cartBtn) {
        cartBtn.addEventListener('click', toggleCart);
    }

    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', closeCart);
    }

    if (cartOverlay) {
        cartOverlay.addEventListener('click', (e) => {
            if (e.target === cartOverlay) {
                closeCart();
            }
        });
    }

    // Event Listeners para el menú móvil
    menuToggle.addEventListener('click', toggleMenu);

    // Cerrar menú al hacer click en enlaces
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            closeMenu();
        });
    });

    // Cerrar menú al hacer click fuera
    document.addEventListener('click', (e) => {
        if (isMenuOpen && 
            !e.target.closest('.nav-links') && 
            !e.target.closest('.menu-toggle')) {
            closeMenu();
        }
    });

    // Cerrar menú con la tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMenuOpen) {
            closeMenu();
        }
    });

    // Control del scroll del navbar
    let navbar = document.querySelector('.navbar');
    let scrollTimeout;

    function handleScroll() {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }

        scrollTimeout = setTimeout(() => {
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            
            // No ocultar el navbar si el menú está abierto
            if (!isMenuOpen) {
                if (currentScroll > lastScrollTop && currentScroll > 100) {
                    navbar.classList.add('hidden');
                } else {
                    navbar.classList.remove('hidden');
                }
            }
            
            // Cambiar color del navbar
            navbar.style.backgroundColor = currentScroll > 50 ? '#9A0024' : '#BB002B';

            lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
        }, 100);
    }

    window.addEventListener('scroll', handleScroll);

    // Cerrar menú al redimensionar la ventana
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (window.innerWidth > 768 && isMenuOpen) {
                closeMenu();
            }
        }, 100);
    });

    // Prevenir scroll en móvil cuando el menú está abierto
    document.addEventListener('touchmove', (e) => {
        if (isMenuOpen && !e.target.closest('.nav-links')) {
            e.preventDefault();
        }
    }, { passive: false });

    // Inicializar el carrito
    updateCart();

    // Exponer funciones necesarias globalmente
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.updateItemQuantity = updateItemQuantity;
}); 