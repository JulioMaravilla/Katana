/**
 * Script principal para index.html de Katana Sushi
 * Maneja:
 * - Carga dinámica del menú desde la API
 * - Filtrado de categorías del menú
 * - Funcionalidad del carrito de compras (localStorage)
 * - Menú de navegación móvil responsivo
 * - Autenticación de usuario en la barra de navegación
 * - Notificaciones visuales
 * - Control de scroll del navbar
 * - Flujo de pedido como invitado
 */

// Variable global para almacenar todos los productos cargados
let allProducts = [];
// Variable global para el carrito
let cart = JSON.parse(localStorage.getItem('cart')) || [];

document.addEventListener('DOMContentLoaded', function() {
    console.log("Katana Sushi DOM cargado.");

    // Carrusel principal (sin cambios)
    setupAdaptiveCarousel();

    // Configurar estado de autenticación en la barra de navegación
    setupNavbarAuth();

    // Cargar y mostrar el menú desde la API
    loadAndDisplayMenu();

    // Configurar listeners del carrito y modales de pedido
    setupCartAndCheckoutListeners(); // Renombrado para claridad

    // Configurar listeners del menú móvil
    setupMobileMenuListeners();

    // Configurar listeners de los botones de categoría
    setupCategoryButtons();

    // Configurar control de scroll del navbar
    setupNavbarScroll();

    // Inicializar el estado del carrito al cargar
    updateCart(); // Asegura que el contador y total se muestren correctamente

    // Listener para el botón de cupón registrado
    const btnCuponRegistrado = document.getElementById('btnUsarCuponRegistrado');
    if (btnCuponRegistrado) {
        btnCuponRegistrado.addEventListener('click', handleCouponClick);
    }

}); // Fin DOMContentLoaded

// --- Carrusel (sin cambios) ---
function setupAdaptiveCarousel() {
    const mainCarousel = document.querySelector('.main-carousel');
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');
    const nextBtn = document.querySelector('.carousel-btn.next');
    const prevBtn = document.querySelector('.carousel-btn.prev');
    let current = 0;
    const interval = 4000; // 4 segundos
    let timer;

    function adjustCarouselToImage(index) {
        if (!mainCarousel || slides.length === 0 || !slides[index]) return;
        const slide = slides[index];
        // Solo centrado y cover, sin padding ni height
        slides.forEach(s => {
            s.style.backgroundSize = 'cover';
            s.style.backgroundPosition = 'center center';
            s.style.backgroundRepeat = 'no-repeat';
        });
        mainCarousel.style.background = 'linear-gradient(135deg, #f8f8f8 0%, #e8e8e8 100%)';
    }

    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
            if (indicators[i]) indicators[i].classList.toggle('active', i === index);
        });
        current = index;
        adjustCarouselToImage(index);
    }

    function nextSlide() { let next = (current + 1) % slides.length; showSlide(next); }
    function prevSlide() { let prev = (current - 1 + slides.length) % slides.length; showSlide(prev); }
    function resetAutoplay() { clearInterval(timer); timer = setInterval(nextSlide, interval); }

    window.addEventListener('resize', function() { adjustCarouselToImage(current); });
    if (nextBtn) nextBtn.onclick = () => { nextSlide(); resetAutoplay(); };
    if (prevBtn) prevBtn.onclick = () => { prevSlide(); resetAutoplay(); };
    indicators.forEach((ind, i) => { ind.onclick = () => { showSlide(i); resetAutoplay(); }; });

    if (slides.length > 0) { showSlide(0); timer = setInterval(nextSlide, interval); }
}


// --- Carga y Visualización del Menú (sin cambios) ---

async function loadAndDisplayMenu() {
    const menuContainer = document.querySelector('.menu-items');
    if (!menuContainer) {
        console.error("Contenedor '.menu-items' no encontrado.");
        return;
    }
    menuContainer.innerHTML = '<p style="text-align:center;">Cargando menú... <i class="fas fa-spinner fa-spin"></i></p>';
    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        allProducts = await response.json();
        const initialCategory = document.querySelector('.category-btn.active')?.textContent.trim() || 'Rolls';
        displayMenuItems(initialCategory);
    } catch (error) {
        console.error("Error al cargar el menú:", error);
        menuContainer.innerHTML = `<p style="text-align:center; color: red;">Error al cargar el menú: ${error.message}. Intenta recargar.</p>`;
    }
}

function displayMenuItems(category = 'Rolls') {
    const menuContainer = document.querySelector('.menu-items');
    if (!menuContainer) return;
    const itemsToShow = allProducts.filter(item => item.category && item.category.toLowerCase() === category.toLowerCase());
    if (itemsToShow.length === 0) {
        menuContainer.innerHTML = `<p style="text-align:center;">No hay productos disponibles en la categoría "${category}".</p>`;
        return;
    }
    menuContainer.innerHTML = itemsToShow.map(item => `
        <div class="menu-item-card fade-element">
            <img src="${item.imageUrl || 'public/images/placeholder.png'}" alt="${item.name || 'Producto'}" class="menu-item-image" onerror="this.onerror=null; this.src='public/images/placeholder.png';">
            <div class="menu-item-content">
                <div class="menu-item-header">
                    <h3 class="menu-item-name">${item.name || 'Nombre no disponible'}</h3>
                    <span class="menu-item-price">$${(item.price || 0).toFixed(2)}</span>
                </div>
                <p class="menu-item-description">${item.description || 'Descripción no disponible.'}</p>
                <button class="add-to-cart-btn" data-product-id="${item._id}"> <i class="fas fa-bowl-rice"></i>
                    Reservar pedido
                </button>
            </div>
        </div>
    `).join('');
    requestAnimationFrame(() => {
        document.querySelectorAll('.menu-item-card.fade-element').forEach(card => {
            card.classList.add('fade-in');
        });
    });
}

function setupCategoryButtons() {
    const categoryButtons = document.querySelectorAll('.menu-categories .category-btn');
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const category = button.textContent.trim();
            displayMenuItems(category);
        });
    });
}

// --- Funcionalidad del Carrito y Checkout ---

function setupCartAndCheckoutListeners() {
    const cartBtn = document.getElementById('cartBtn');
    const cartSidebar = document.querySelector('.cart-sidebar');
    const cartOverlay = document.querySelector('.cart-overlay');
    const closeCartBtn = document.querySelector('.close-cart');
    const cartItemsContainer = document.querySelector('.cart-sidebar .cart-items');
    const checkoutBtn = document.querySelector('.cart-sidebar .checkout-btn'); // Botón DENTRO del carrito

    // Modales
    const authChoiceModal = document.getElementById('authChoiceModal');
    const guestOrderModal = document.getElementById('guestOrderModal');
    const closeAuthChoiceModalBtn = document.getElementById('closeAuthChoiceModal');
    const closeGuestModalBtn = document.getElementById('closeGuestModal');
    const loginChoiceBtn = document.getElementById('loginChoiceBtn');
    const guestChoiceBtn = document.getElementById('guestChoiceBtn');
    const guestOrderForm = document.getElementById('guestOrderForm');
    const guestZoneSelect = document.getElementById('guestZone');

    // Abrir/cerrar carrito
    if (cartBtn) cartBtn.addEventListener('click', toggleCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', (e) => { if (e.target === cartOverlay) closeCart(); });

    // Listener para botones +/-/eliminar DENTRO del carrito (delegación)
    if (cartItemsContainer) {
        cartItemsContainer.addEventListener('click', handleCartItemActions);
    }

    // Listener para el botón "Continuar con el pedido" DENTRO del carrito
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckoutButtonClick);
    }

    // Listeners para botones del modal de elección
    if (loginChoiceBtn) loginChoiceBtn.addEventListener('click', () => { window.location.href = '/login'; });
    if (guestChoiceBtn) guestChoiceBtn.addEventListener('click', openGuestModal);
    if (closeAuthChoiceModalBtn) closeAuthChoiceModalBtn.addEventListener('click', closeAuthChoiceModal);

    // Listeners para el modal de invitado
    if (closeGuestModalBtn) closeGuestModalBtn.addEventListener('click', closeGuestModal);
    if (guestOrderForm) guestOrderForm.addEventListener('submit', handleGuestOrderSubmit);
    if (guestZoneSelect) guestZoneSelect.addEventListener('change', updateGuestShippingInfo);

    // Cerrar modales con click fuera
    if (authChoiceModal) authChoiceModal.addEventListener('click', (e) => { if (e.target === authChoiceModal) closeAuthChoiceModal(); });
    if (guestOrderModal) guestOrderModal.addEventListener('click', (e) => { if (e.target === guestOrderModal) closeGuestModal(); });

    // Listener para botones "Agregar al carrito" en el menú (delegación)
    const menuContainer = document.querySelector('.menu-items');
    if (menuContainer) {
        menuContainer.addEventListener('click', handleAddToCartClick);
    }
}

function handleCartItemActions(e) {
    const target = e.target;
    const cartItemDiv = target.closest('.cart-item');
    if (!cartItemDiv) return;
    const productId = cartItemDiv.dataset.id;

    if (target.matches('.quantity-btn.increase') || target.closest('.quantity-btn.increase')) {
        updateItemQuantity(productId, 1);
    } else if (target.matches('.quantity-btn.decrease') || target.closest('.quantity-btn.decrease')) {
        updateItemQuantity(productId, -1);
    } else if (target.matches('.cart-item-remove') || target.closest('.cart-item-remove')) {
        removeFromCart(productId);
    }
}

function handleAddToCartClick(event) {
    const button = event.target.closest('.add-to-cart-btn');
    if (!button) return;

    const productId = button.dataset.productId;
    if (!productId) { console.error("No productId found on button."); return; }

    const productToAdd = allProducts.find(p => p._id === productId);
    if (productToAdd) {
        addToCart({
            id: productToAdd._id,
            name: productToAdd.name,
            price: productToAdd.price,
            image: productToAdd.imageUrl,
            description: productToAdd.description
        });
    } else {
        console.error(`Product with ID ${productId} not found.`);
        showNotification("Error: Producto no encontrado.", "error");
    }
}

function handleCheckoutButtonClick() {
    const token = localStorage.getItem('token');
    if (token) {
        // Usuario logueado: redirigir al dashboard de pago
        window.location.href = '/dashboard#checkout';
    } else {
        // Usuario no logueado: mostrar modal de elección
        openAuthChoiceModal();
    }
    closeCart(); // Siempre cerrar el carrito lateral
}

function toggleCart(e) {
    e?.preventDefault();
    const cartSidebar = document.querySelector('.cart-sidebar');
    const cartOverlay = document.querySelector('.cart-overlay');
    if (!cartSidebar || !cartOverlay) return;
    const isActive = cartSidebar.classList.contains('active');
    if (isActive) {
        closeCart();
    } else {
        if (document.body.classList.contains('menu-open')) closeMenu();
        cartSidebar.classList.add('active');
        cartOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateCart();
    }
}

function closeCart() {
    const cartSidebar = document.querySelector('.cart-sidebar');
    const cartOverlay = document.querySelector('.cart-overlay');
    if (!cartSidebar || !cartOverlay) return;
    cartSidebar.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function updateCart() {
    const cartItemsContainer = document.querySelector('.cart-sidebar .cart-items');
    const cartCountElement = document.querySelector('#cartBtn span');
    const totalAmountElement = document.querySelector('.cart-sidebar .total-amount');
    const checkoutBtn = document.querySelector('.cart-sidebar .checkout-btn');
    const cartIcon = document.querySelector('#cartBtn i');

    if (!cartItemsContainer || !cartCountElement || !totalAmountElement || !checkoutBtn) {
        return;
    }

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-basket fa-3x"></i>
                <p>Tu carrito está vacío</p>
            </div>
        `;
        totalAmountElement.textContent = '$0.00';
        checkoutBtn.disabled = true;
        checkoutBtn.style.opacity = '0.6';
        checkoutBtn.style.cursor = 'not-allowed';
        // Restaurar ícono original
        if (cartIcon) {
            cartIcon.className = 'fas fa-shopping-cart';
            cartIcon.innerHTML = '';
        }
    } else {
        let total = 0;
        cartItemsContainer.innerHTML = cart.map(item => {
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity, 10) || 0;
            const itemTotal = price * quantity;
            total += itemTotal;
            return `
                <div class="cart-item" data-id="${item.id}">
                    <img src="${item.image || 'public/images/placeholder.png'}" alt="${item.name || 'Producto'}" class="cart-item-img" onerror="this.onerror=null; this.src='public/images/placeholder.png';">
                    <div class="cart-item-details">
                        <h4 class="cart-item-name">${item.name || 'Nombre no disponible'}</h4>
                        <p class="cart-item-description">${item.description || ''}</p>
                        <div class="cart-item-price">$${itemTotal.toFixed(2)}</div>
                        <div class="cart-item-quantity">
                            <button class="quantity-btn decrease" title="Disminuir">-</button>
                            <span>${quantity}</span>
                            <button class="quantity-btn increase" title="Aumentar">+</button>
                        </div>
                    </div>
                    <button class="cart-item-remove" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');
        totalAmountElement.textContent = `$${total.toFixed(2)}`;
        checkoutBtn.disabled = false;
        checkoutBtn.style.opacity = '1';
        checkoutBtn.style.cursor = 'pointer';
        // Cambiar ícono a SVG personalizado
        if (cartIcon) {
            cartIcon.className = '';
            cartIcon.innerHTML = '<img src="public/images/bowl_with_chopsticks.svg" alt="Bowl con palillos" style="width:2em;height:2em;display:block;filter:invert(16%) sepia(97%) saturate(7472%) hue-rotate(-8deg) brightness(90%) contrast(110%);">';
        }
    }

    const totalItems = cart.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
    cartCountElement.textContent = totalItems;
    cartCountElement.style.display = totalItems > 0 ? 'flex' : 'none';
}

function addToCart(itemData) {
    const existingItem = cart.find(cartItem => cartItem.id === itemData.id);
    if (existingItem) {
        existingItem.quantity = (parseInt(existingItem.quantity, 10) || 0) + 1;
    } else {
        cart.push({ ...itemData, quantity: 1 });
    }
    saveCart();
    updateCart();
    showNotification(`${itemData.name} agregado al carrito`, 'success');
    const cartSidebar = document.querySelector('.cart-sidebar');
    // Opcional: Abrir carrito al agregar
    // if (cartSidebar && !cartSidebar.classList.contains('active')) {
    //     toggleCart();
    // }
}

function removeFromCart(productId) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    if (itemIndex > -1) {
        const itemName = cart[itemIndex].name || 'Producto';
        cart.splice(itemIndex, 1);
        saveCart();
        updateCart();
        showNotification(`${itemName} eliminado del carrito`, 'info');
    }
}

function updateItemQuantity(productId, change) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    if (itemIndex > -1) {
        cart[itemIndex].quantity = (parseInt(cart[itemIndex].quantity, 10) || 0) + change;
        if (cart[itemIndex].quantity <= 0) {
            removeFromCart(productId); // Ya maneja la notificación
        } else {
            saveCart();
            updateCart();
        }
    }
}

function saveCart() {
    try {
        localStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
        console.error("Error saving cart to localStorage:", error);
        showNotification("Error al guardar el carrito.", "error");
    }
}

// --- Modales de Autenticación y Pedido Invitado ---

function openAuthChoiceModal() {
    const modal = document.getElementById('authChoiceModal');
    if (modal) modal.style.display = 'flex';
}

function closeAuthChoiceModal() {
    const modal = document.getElementById('authChoiceModal');
    if (modal) modal.style.display = 'none';
}

function openGuestModal() {
    closeAuthChoiceModal(); // Cierra el modal de elección
    const modal = document.getElementById('guestOrderModal');
    const form = document.getElementById('guestOrderForm');
    const successDiv = document.getElementById('guestOrderSuccess');
    if (modal && form && successDiv) {
        form.style.display = 'block'; // Asegura que el form esté visible
        successDiv.style.display = 'none'; // Oculta el mensaje de éxito
        form.reset(); // Limpia el formulario
        updateGuestShippingInfo(); // Resetea info de envío
        modal.style.display = 'flex';
    }
}

function closeGuestModal() {
    const modal = document.getElementById('guestOrderModal');
    if (modal) modal.style.display = 'none';
}

function updateGuestShippingInfo() {
    const zoneSelect = document.getElementById('guestZone');
    const costDiv = document.getElementById('guestShippingCost');
    const msgDiv = document.getElementById('guestShippingMsg');
    if (!zoneSelect || !costDiv || !msgDiv) return;

    const selectedOption = zoneSelect.options[zoneSelect.selectedIndex];
    const cost = selectedOption.dataset.cost;
    const zoneValue = zoneSelect.value;

    if (zoneValue && cost !== undefined) {
        const costValue = parseFloat(cost);
        if (zoneValue === 'otra') {
            costDiv.style.display = 'none';
            msgDiv.textContent = 'Nos pondremos en contacto para confirmar el costo de envío a tu zona.';
            msgDiv.style.display = 'block';
        } else if (costValue >= 0) {
            costDiv.textContent = `Costo de envío: $${costValue.toFixed(2)}`;
            costDiv.style.display = 'block';
            msgDiv.style.display = 'none';
        } else {
            costDiv.style.display = 'none';
            msgDiv.style.display = 'none';
        }
    } else {
        costDiv.style.display = 'none';
        msgDiv.style.display = 'none';
    }
}

async function handleGuestOrderSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const successDiv = document.getElementById('guestOrderSuccess');

    // Validación simple
    if (!form.checkValidity()) {
        showNotification("Por favor, completa todos los campos requeridos.", "error");
        form.reportValidity(); // Muestra mensajes de validación del navegador
        return;
    }

    // Validar teléfono (8 dígitos)
    const phoneRegex = /^\d{8}$/;
    if (!phoneRegex.test(form.guestPhone.value)) {
        showNotification('Por favor, ingresa un número de teléfono válido (8 dígitos)', 'error');
        form.guestPhone.focus();
        return;
    }

    if (cart.length === 0) {
        showNotification("Tu carrito está vacío.", "error");
        closeGuestModal();
        return;
    }

    const deliveryData = {
        nombre: form.guestName.value.trim(),
        telefono: form.guestPhone.value.trim(),
        direccion: form.guestAddress.value.trim(),
        zona: form.guestZone.value,
        referencia: form.guestComment.value.trim() // Usamos comentario como referencia
    };

    const orderPayload = {
        items: cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            // El backend debe buscar el precio actual
        })),
        deliveryDetails: deliveryData,
        isGuestOrder: true // Marca para el backend
    };

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
        // Usar el nuevo endpoint '/api/orders/guest'
        const response = await fetch('/api/orders/guest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showNotification("¡Pedido registrado con éxito!", "success");
            cart = []; // Vaciar carrito local
            saveCart(); // Guardar carrito vacío en localStorage
            updateCart(); // Actualizar UI del carrito

            // Mostrar mensaje de éxito en el modal
            form.style.display = 'none';
            successDiv.style.display = 'flex';

            // Cerrar modal después de unos segundos
            setTimeout(closeGuestModal, 4000);

        } else {
            showNotification(`Error al enviar pedido: ${result.message || 'Intenta nuevamente'}`, "error");
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar pedido';
        }

    } catch (error) {
        console.error("Error de red al enviar pedido invitado:", error);
        showNotification("Error de conexión al enviar el pedido.", "error");
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar pedido';
    }
}


// --- Funcionalidad del Menú Móvil (sin cambios) ---

let isMenuOpen = false;

function setupMobileMenuListeners() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (menuToggle) menuToggle.addEventListener('click', toggleMenu);
    if (navLinks) {
        navLinks.querySelectorAll('a').forEach(link => {
            if (!link.closest('.auth-mobile')) link.addEventListener('click', closeMenu);
        });
    }
    document.addEventListener('click', (e) => { if (isMenuOpen && !e.target.closest('.nav-links') && !e.target.closest('.menu-toggle')) closeMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isMenuOpen) closeMenu(); });
    
    // Improved resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (window.innerWidth > 768) {
                // Cierra el menú móvil y limpia todo
                isMenuOpen = false;
                const navLinks = document.querySelector('.nav-links');
                const menuToggle = document.querySelector('.menu-toggle');
                const menuIcon = document.querySelector('.menu-toggle .menu-icon');
                document.body.classList.remove('menu-open');
                if (navLinks) {
                    navLinks.classList.remove('active');
                    navLinks.style.display = '';
                    navLinks.style.right = '';
                    navLinks.style.top = '';
                    navLinks.style.height = '';
                }
                if (menuToggle) menuToggle.classList.remove('active');
                if (menuIcon) {
                    menuIcon.classList.remove('fa-times');
                    menuIcon.classList.add('fa-bars');
                }
            }
        }, 100);
    });
}

function toggleMenu(e) {
    e?.preventDefault();
    e?.stopPropagation();
    if (isMenuOpen) closeMenu();
    else openMenu();
}

function openMenu() {
    if (isMenuOpen) return;
    const menuToggle = document.querySelector('.menu-toggle');
    const menuIcon = document.querySelector('.menu-toggle .menu-icon');
    const navLinks = document.querySelector('.nav-links');
    const navItems = navLinks?.querySelectorAll('li');
    const body = document.body;
    
    if (!menuToggle || !menuIcon || !navLinks || !navItems) return;
    
    if (document.querySelector('.cart-sidebar')?.classList.contains('active')) closeCart();
    
    isMenuOpen = true;
    menuToggle.classList.add('active');
    body.classList.add('menu-open');
    
    // Set initial state
    navLinks.style.display = 'flex';
    navLinks.style.right = '-100%';
    
    // Force reflow
    navLinks.offsetHeight;
    
    // Add active class and update icon
    navLinks.classList.add('active');
    menuIcon.classList.remove('fa-bars');
    menuIcon.classList.add('fa-times');
    
    // Animate items
    navItems.forEach((item, index) => {
        item.style.transitionDelay = `${index * 0.05}s`;
        item.classList.add('visible');
    });
}

function closeMenu() {
    if (!isMenuOpen) return;
    const menuToggle = document.querySelector('.menu-toggle');
    const menuIcon = document.querySelector('.menu-toggle .menu-icon');
    const navLinks = document.querySelector('.nav-links');
    const navItems = navLinks?.querySelectorAll('li');
    const body = document.body;
    
    if (!menuToggle || !menuIcon || !navLinks || !navItems) return;
    
    isMenuOpen = false;
    menuToggle.classList.remove('active');
    menuIcon.classList.remove('fa-times');
    menuIcon.classList.add('fa-bars');
    body.classList.remove('menu-open');
    
    // Remove active class
    navLinks.classList.remove('active');
    
    // Remove visible class from items
    navItems.forEach(item => item.classList.remove('visible'));
    
    // Hide menu after transition
    setTimeout(() => {
        if (!isMenuOpen) {
            navLinks.style.display = 'none';
            navLinks.style.right = '-100%';
        }
    }, 300);
}


// --- Autenticación en Navbar (sin cambios) ---

function setupNavbarAuth() {
    // Si hay sesión de admin, no mostrar menú de usuario ni logout en navbar pública
    if (localStorage.getItem('adminAuthToken') || sessionStorage.getItem('adminAuthToken')) {
        const navButtonsContainer = document.querySelector('.nav-buttons');
        const navLinksUl = document.querySelector('.nav-links');
        if (navButtonsContainer) navButtonsContainer.querySelectorAll('.login-btn, .nav-user-menu').forEach(el => el.remove());
        if (navLinksUl) navLinksUl.querySelectorAll('.auth-mobile').forEach(el => el.remove());
        document.body.classList.remove('logged-in');
        return;
    }
    const token = localStorage.getItem('token');
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const navButtonsContainer = document.querySelector('.nav-buttons');
    const navLinksUl = document.querySelector('.nav-links');
    const body = document.body; // Referencia al body

    if (!navButtonsContainer || !navLinksUl) return;

    const cartBtnExisting = document.getElementById('cartBtn');
    const menuToggleExisting = document.querySelector('.menu-toggle');

    // Limpiar elementos de autenticación previos (reforzado)
    navButtonsContainer.querySelectorAll('.login-btn, .nav-user-menu, .logout-btn-nav').forEach(el => el.remove());
    navLinksUl.querySelectorAll('.auth-mobile').forEach(el => el.remove());

    // Limpiar clase de estado del body
    body.classList.remove('logged-in');

    if (token && userInfo.nombre) {
        // --- Usuario Logueado ---
        body.classList.add('logged-in'); // Añadir clase al body

        // Desktop: Menú de Usuario
        const userMenuDesktop = document.createElement('div');
        userMenuDesktop.className = 'nav-user-menu';
        userMenuDesktop.innerHTML = `
            <a href="/dashboard" class="nav-user-link" title="Mi Dashboard">
                <i class="fas fa-user-circle"></i> ${userInfo.nombre.split(' ')[0]}
            </a>
            <button class="logout-btn-nav" title="Cerrar Sesión">
                <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
            </button>
        `;
        // Insertar antes del carrito o al final si no hay carrito
        if (cartBtnExisting) navButtonsContainer.insertBefore(userMenuDesktop, cartBtnExisting);
        else navButtonsContainer.appendChild(userMenuDesktop);

        userMenuDesktop.querySelector('.logout-btn-nav').addEventListener('click', logoutUser);

        // Móvil: Enlaces Dashboard y Logout
        const dashboardLinkMobile = document.createElement('li');
        dashboardLinkMobile.className = 'auth-mobile';
        dashboardLinkMobile.innerHTML = `<a href="/dashboard"><i class="fas fa-tachometer-alt"></i> Dashboard</a>`;
        navLinksUl.appendChild(dashboardLinkMobile);

        const logoutLinkMobile = document.createElement('li');
        logoutLinkMobile.className = 'auth-mobile';
        logoutLinkMobile.innerHTML = `<a href="#" id="mobileLogoutLink"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</a>`;
        navLinksUl.appendChild(logoutLinkMobile);
        logoutLinkMobile.querySelector('#mobileLogoutLink').addEventListener('click', (e) => { e.preventDefault(); logoutUser(); });

    } else {
        // --- Usuario NO Logueado ---
        // Desktop: Botón Iniciar Sesión
        const loginBtnDesktopNew = document.createElement('a');
        loginBtnDesktopNew.href = '/login';
        loginBtnDesktopNew.className = 'login-btn';
        loginBtnDesktopNew.innerHTML = '<i class="fas fa-user"></i>Iniciar Sesión';
        // Insertar antes del carrito o al final si no hay carrito
        if (cartBtnExisting) navButtonsContainer.insertBefore(loginBtnDesktopNew, cartBtnExisting);
        else navButtonsContainer.appendChild(loginBtnDesktopNew);

        // Móvil: Enlace Iniciar Sesión
        const loginLinkMobile = document.createElement('li');
        loginLinkMobile.className = 'auth-mobile mobile-only'; // Clase para identificarlo
        loginLinkMobile.innerHTML = `<a href="/login" class="login-btn"><i class="fas fa-user"></i>Iniciar Sesión</a>`;
        navLinksUl.appendChild(loginLinkMobile);
    }

    const updatedNavItems = navLinksUl.querySelectorAll('li');
    updatedNavItems.forEach((item, index) => {
       item.style.setProperty('--item-index', index);
    });
}


function logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    // localStorage.removeItem('cart'); // Opcional
    window.location.reload();
}

// --- Control de Scroll del Navbar (sin cambios) ---

let lastScrollTop = 0;
let scrollTimeout;
let isNavbarHidden = false;

function setupNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    window.addEventListener('scroll', () => {
        if (isMenuOpen) { if (isNavbarHidden) { navbar.classList.remove('hidden'); isNavbarHidden = false; } return; }
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            if (currentScroll > lastScrollTop && currentScroll > 100) { if (!isNavbarHidden) { navbar.classList.add('hidden'); isNavbarHidden = true; } }
            else { if (isNavbarHidden) { navbar.classList.remove('hidden'); isNavbarHidden = false; } }
            navbar.style.backgroundColor = currentScroll > 50 ? 'rgba(187, 0, 43, 0.95)' : 'rgba(187, 0, 43, 1)';
            lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
        }, 50);
    }, { passive: true });
}


// --- Notificaciones Visuales (sin cambios) ---

function showNotification(message, type = 'success', duration = 3500) {
    const container = document.body;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    let iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'info') iconClass = 'fa-info-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle'; // Añadido warning
    notification.innerHTML = `<i class="fas ${iconClass}"></i><span>${message}</span>`;
    container.appendChild(notification);
    requestAnimationFrame(() => { notification.classList.add('show'); });
    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => notification.remove());
        setTimeout(() => notification.remove(), 500); // Fallback
    }, duration);
}

// --- Manejo de Cupón Registrado ---
function handleCouponClick() {
    const token = localStorage.getItem('token');
    if (token) {
        // Usuario logueado - aplicar lógica del cupón (aún no implementada)
        showNotification("Funcionalidad de cupón aún no implementada.", "info");
        // Aquí iría la lógica para aplicar el cupón en el carrito o checkout
    } else {
        // Usuario no logueado - redirigir a login
        showNotification("Inicia sesión para usar este cupón exclusivo.", "info");
        setTimeout(() => { window.location.href = '/login'; }, 2000);
    }
}

// --- FIN DEL SCRIPT ---
