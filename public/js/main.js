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
 * - Carga y control dinámico del carrusel principal
 */

// Variable global para almacenar todos los productos cargados
let allProducts = [];
// Variable global para el carrito
let cart = JSON.parse(localStorage.getItem('cart')) || [];
// Variables globales para el carrusel
let carouselSlides = [];
let carouselIndicators = [];
let currentCarouselIndex = 0;
let carouselTimer;
const CAROUSEL_INTERVAL = 4000; // 4 segundos
let map = null;
let marker = null;
let geocoder = null;
let verificationMap = null;
let verificationMarker = null;
let accuracyCircle = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log("Katana Sushi DOM cargado.");

    // Cargar y construir el carrusel principal dinámicamente
    loadAndBuildCarousel(); // MODIFICADO: Llamada a la nueva función

    // Configurar estado de autenticación en la barra de navegación
    setupNavbarAuth();

    // Cargar y mostrar el menú desde la API
    loadAndDisplayMenu();

    // Configurar listeners del carrito y modales de pedido
    setupCartAndCheckoutListeners();

    // Configurar listeners del menú móvil
    setupMobileMenuListeners();

    // Configurar listeners de los botones de categoría
    setupCategoryButtons();

    // Configurar control de scroll del navbar
    setupNavbarScroll();

    // Inicializar el estado del carrito al cargar
    updateCart();

    // Listener para el botón de cupón registrado
    const btnCuponRegistrado = document.getElementById('btnUsarCuponRegistrado');
    if (btnCuponRegistrado) {
        btnCuponRegistrado.addEventListener('click', handleCouponClick);
    }

    // El manejo de cookies ahora está en cookieManager.js

    const serfinsaPayBtn = document.getElementById('serfinsaPayBtn');
    if (serfinsaPayBtn) { // Verificar que el botón exista
        serfinsaPayBtn.addEventListener('click', function() {
            // Aquí deberías validar el formulario y obtener los datos necesarios
            // Simulación de datos:
            const pedidoId = 'KS-' + Date.now().toString().slice(-4); // Debes generar este ID dinámicamente
            
            const totalAmountElement = document.getElementById('guestOrderTotal');
            let monto = 0;
            if (totalAmountElement) {
                const montoText = totalAmountElement.textContent.replace('$', '').trim();
                monto = parseFloat(montoText);
                if (isNaN(monto)) {
                    alert('Error al obtener el monto total del pedido.');
                    return;
                }
            } else {
                alert('No se pudo encontrar el elemento del monto total.');
                return;
            }
            if (monto <= 0) {
                alert('El monto del pedido debe ser mayor a cero para procesar el pago.');
                return;
            }

            const nombreInput = document.getElementById('guestName');
            const nombre = nombreInput ? nombreInput.value : 'Cliente Katana';

            if (!nombre.trim()) {
                alert('Por favor, ingrese su nombre para continuar con el pago.');
                return;
            }
            
            // Aquí podrías primero intentar registrar el pedido en tu backend
            // y luego redirigir a Serfinsa con el ID de pedido real.
            // Por ahora, redirigimos directamente.

            // Redirige a la URL de Serfinsa (esto es un ejemplo, reemplaza con la real)
            // window.location.href = `https://pago.serfinsa.com?monto=${monto}&nombre=${encodeURIComponent(nombre)}&pedido=${pedidoId}&callback=https://YOUR_DOMAIN.com/pago-completado?id=${pedidoId}`;
            alert(`Simulación: Redirigiendo a Serfinsa para pagar ${monto.toFixed(2)} del pedido ${pedidoId} a nombre de ${nombre}`);
            // En un caso real, aquí iría la redirección.
        });
    }
}); // Fin DOMContentLoaded


// --- NUEVO: Carga y Construcción del Carrusel Dinámico ---
async function loadAndBuildCarousel() {
    const carouselContainer = document.getElementById('mainCarouselContainer');
    const indicatorsContainer = document.getElementById('carouselIndicatorsContainer');

    if (!carouselContainer || !indicatorsContainer) {
        console.error("Contenedores del carrusel no encontrados.");
        // Opcionalmente, ocultar toda la sección del carrusel si los contenedores no existen
        if(carouselContainer) carouselContainer.style.display = 'none';
        return;
    }

    // Mostrar un mensaje de carga
    carouselContainer.insertAdjacentHTML('afterbegin', '<p id="carouselLoadingMsg" style="text-align:center; padding: 50px; color: #555;">Cargando imágenes del carrusel...</p>');

    try {
        const response = await fetch('/api/carousel/images');
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status} al cargar imágenes del carrusel.`);
        }
        const result = await response.json();

        // Eliminar mensaje de carga
        const loadingMsg = document.getElementById('carouselLoadingMsg');
        if (loadingMsg) loadingMsg.remove();

        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
            const images = result.data;

            // Limpiar slides e indicadores existentes (aunque el HTML ya debería estar limpio)
            carouselContainer.querySelectorAll('.carousel-slide').forEach(s => s.remove());
            indicatorsContainer.innerHTML = '';

            images.forEach((image, index) => {
                // Crear slide
                const slide = document.createElement('div');
                slide.className = 'carousel-slide';
                slide.style.backgroundImage = `url('${image.imageUrl}')`;
                // Añadir el texto fijo superpuesto
                slide.innerHTML = `
                    <div style="position: absolute; bottom: 10%; left: 5%; background-color: rgba(0,0,0,0.6); color: white; padding: 1rem; border-radius: 8px; max-width: 90%; text-shadow: 1px 1px 2px rgba(0,0,0,0.7);">
                        <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem; font-weight: bold;">📅 ¡Reserva tu pedido con tiempo!</h3>
                        <p style="font-size: 0.9rem; line-height: 1.4;">Puedes reservar tus pedidos estos días: <br>
                        <strong>DOMINGO A JUEVES: 8:00 AM a 6:00 PM</strong><br>
                        <strong>ENTREGAS SÁBADO desde las 5:30 PM en adelante</strong></p>
                    </div>
                `;
                carouselContainer.insertBefore(slide, carouselContainer.querySelector('.carousel-btn.prev')); // Insertar antes de los botones

                // Crear indicador
                const indicator = document.createElement('span');
                indicator.className = 'indicator';
                indicator.dataset.slideTo = index;
                indicatorsContainer.appendChild(indicator);
            });

            // Inicializar la lógica del carrusel una vez construido el DOM
            initializeCarouselLogic();
        } else if (result.success && result.data.length === 0) {
            carouselContainer.innerHTML = '<p style="text-align:center; padding: 50px; color: #555;">No hay imágenes para mostrar en el carrusel.</p>';
            indicatorsContainer.innerHTML = '';
            // Ocultar botones de control si no hay slides
            const prevBtn = carouselContainer.querySelector('.carousel-btn.prev');
            const nextBtn = carouselContainer.querySelector('.carousel-btn.next');
            if(prevBtn) prevBtn.style.display = 'none';
            if(nextBtn) nextBtn.style.display = 'none';
        } else {
            throw new Error(result.message || 'No se pudieron cargar las imágenes del carrusel.');
        }
    } catch (error) {
        console.error("Error en loadAndBuildCarousel:", error);
        const loadingMsg = document.getElementById('carouselLoadingMsg');
        if (loadingMsg) loadingMsg.remove();
        carouselContainer.innerHTML = `<p style="text-align:center; padding: 50px; color: red;">Error al cargar el carrusel: ${error.message}</p>`;
        indicatorsContainer.innerHTML = '';
    }
}

// --- Lógica del Carrusel (Adaptada de setupAdaptiveCarousel) ---
function initializeCarouselLogic() {
    const carouselContainer = document.getElementById('mainCarouselContainer');
    if (!carouselContainer) return;

    // Re-seleccionar slides e indicadores ya que son dinámicos
    carouselSlides = carouselContainer.querySelectorAll('.carousel-slide');
    carouselIndicators = document.getElementById('carouselIndicatorsContainer').querySelectorAll('.indicator');

    const nextBtn = carouselContainer.querySelector('.carousel-btn.next');
    const prevBtn = carouselContainer.querySelector('.carousel-btn.prev');

    if (carouselSlides.length === 0) {
        console.log("No hay slides para inicializar la lógica del carrusel.");
        if(prevBtn) prevBtn.style.display = 'none';
        if(nextBtn) nextBtn.style.display = 'none';
        return;
    }
    if(prevBtn) prevBtn.style.display = 'block';
    if(nextBtn) nextBtn.style.display = 'block';


    function showSlide(index) {
        carouselSlides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        carouselIndicators.forEach((indicator, i) => {
            indicator.classList.toggle('active', i === index);
        });
        currentCarouselIndex = index;
        // La función adjustCarouselToImage ya no es necesaria si el CSS maneja el cover/center
        // y el texto se añade directamente al HTML del slide.
    }

    function nextSlide() {
        let next = (currentCarouselIndex + 1) % carouselSlides.length;
        showSlide(next);
    }

    function prevSlide() {
        let prev = (currentCarouselIndex - 1 + carouselSlides.length) % carouselSlides.length;
        showSlide(prev);
    }

    function resetAutoplay() {
        clearInterval(carouselTimer);
        if (carouselSlides.length > 1) { // Solo autoplay si hay más de 1 slide
            carouselTimer = setInterval(nextSlide, CAROUSEL_INTERVAL);
        }
    }

    // window.addEventListener('resize', () => {
    //     // Ya no se necesita adjustCarouselToImage si el CSS es robusto
    // });

    if (nextBtn) nextBtn.onclick = () => { nextSlide(); resetAutoplay(); };
    if (prevBtn) prevBtn.onclick = () => { prevSlide(); resetAutoplay(); };

    carouselIndicators.forEach((indicator) => {
        indicator.onclick = () => {
            const slideToIndex = parseInt(indicator.dataset.slideTo, 10);
            showSlide(slideToIndex);
            resetAutoplay();
        };
    });

    if (carouselSlides.length > 0) {
        showSlide(0); // Mostrar el primer slide
        resetAutoplay(); // Iniciar autoplay
    }
}


// --- Carga y Visualización del Menú (sin cambios significativos, solo asegurar que no interfiera) ---
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

function displayMenuItems(category) {
    const menuContainer = document.querySelector('.menu-items');
    if (!menuContainer) return;
    
    // Filtra los productos que coinciden con la categoría seleccionada
    const itemsToShow = allProducts.filter(item => item.category && item.category.toLowerCase() === category.toLowerCase());
    
    if (itemsToShow.length === 0) {
        menuContainer.innerHTML = `<p style="text-align:center; width: 100%;">No hay productos disponibles en la categoría "${category}".</p>`;
        return;
    }

    menuContainer.innerHTML = itemsToShow.map(item => `
        <div class="menu-item-card">
            <img src="${item.imageUrl || 'public/images/placeholder.png'}" alt="${item.name || 'Producto'}" class="menu-item-image">
            <div class="menu-item-content">
                <div class="menu-item-header">
                    <h3 class="menu-item-name">${item.name || 'Nombre no disponible'}</h3>
                    <span class="menu-item-price">$${(item.price || 0).toFixed(2)}</span>
                </div>
                <p class="menu-item-description">${item.description || 'Descripción no disponible.'}</p>
                <button class="add-to-cart-btn" data-product-id="${item._id}">Reservar pedido</button>
            </div>
        </div>
    `).join('');
}

/**
 * Carga las categorías desde la API y configura los listeners de los botones.
 */
async function setupCategoryButtons() {
    const mainCategoriesContainer = document.querySelector('.image-categories-container');
    const subcategoriesContainer = document.querySelector('#rolls-subcategories .subcategories');

    if (!mainCategoriesContainer || !subcategoriesContainer) return;

    try {
        const result = await fetch('/api/products/categories/active');
        const responseData = await result.json();

        if (!responseData.success) throw new Error('No se pudieron cargar las categorías.');

        const categories = responseData.data;

        // Renderizar las categorías dinámicas
        categories.forEach(cat => {
            const isSubcategory = ['Makis', 'Uramakis', 'Tempurizados'].includes(cat.name);

            if (isSubcategory) {
                const button = document.createElement('button');
                button.className = 'category-btn';
                button.dataset.category = cat.name;
                button.textContent = cat.name;
                subcategoriesContainer.appendChild(button);
            } else {
                const mainCategoryItem = document.createElement('a');
                mainCategoryItem.href = '#';
                mainCategoryItem.className = 'image-category-item';
                mainCategoryItem.dataset.category = cat.name;
                const imageName = cat.name.toLowerCase().replace(/ /g, '-');
                const imageUrl = `public/images/categorias/${imageName}.avif`; // Puedes cambiar la extensión si usas otro formato

                mainCategoryItem.innerHTML = `
                    <img src="${imageUrl}" alt="${cat.name}" onerror="this.onerror=null; this.src='public/images/categorias/default.png';">
                    <h4>${cat.name}</h4>
                `;
                mainCategoriesContainer.appendChild(mainCategoryItem);
            }
        });

    } catch (error) {
        console.error("Error al cargar categorías dinámicas:", error);
        // Puedes mostrar un mensaje de error si lo deseas
    }

    // Configurar listeners para todos los botones (estáticos y dinámicos)
    mainCategoriesContainer.addEventListener('click', (event) => {
        const clickedItem = event.target.closest('.image-category-item');
        if (!clickedItem) return;
        event.preventDefault();

        const category = clickedItem.dataset.category;
        updateActiveButtons(clickedItem, true);

        const rollsSubcategories = document.getElementById('rolls-subcategories');
        if (category === 'Rolls') {
            rollsSubcategories.style.display = 'block';
            const firstSubCategoryBtn = subcategoriesContainer.querySelector('.category-btn');
            if (firstSubCategoryBtn) {
                updateActiveButtons(firstSubCategoryBtn, false);
                displayMenuItems(firstSubCategoryBtn.dataset.category);
            } else {
                // Si no hay subcategorías, podemos decidir qué mostrar.
                // Por ahora, no mostramos nada hasta que se seleccione una.
                document.querySelector('.menu-items').innerHTML = '<p style="text-align:center; width:100%;">Selecciona un tipo de roll.</p>';
            }
        } else {
            rollsSubcategories.style.display = 'none';
            displayMenuItems(category);
        }
    });

    subcategoriesContainer.addEventListener('click', (event) => {
        const clickedButton = event.target.closest('.category-btn');
        if (!clickedButton) return;
        const category = clickedButton.dataset.category;
        updateActiveButtons(clickedButton, false);
        displayMenuItems(category);
    });

    // Carga Inicial
    const initialRollsItem = document.getElementById('default-rolls-category');
    if (initialRollsItem) initialRollsItem.classList.add('active-category');

    const rollsSubcategories = document.getElementById('rolls-subcategories');
    rollsSubcategories.style.display = 'block';

    const firstSubCategoryButton = subcategoriesContainer.querySelector('.category-btn');
    if (firstSubCategoryButton) {
        firstSubCategoryButton.classList.add('active');
        displayMenuItems(firstSubCategoryButton.dataset.category);
    } else {
         // Si no hay subcategorías, pero sí productos "Rolls", podemos mostrarlos
         displayMenuItems('Makis'); // O la subcategoría por defecto que prefieras
    }
}

function updateActiveButtons(clickedElement, isMainCategory = true) {
    if (isMainCategory) {
        // Maneja la activación de las categorías principales (imágenes)
        document.querySelectorAll('.image-category-item').forEach(item => item.classList.remove('active-category'));
        clickedElement.classList.add('active-category');
        // Limpia la selección de subcategorías si no se está seleccionando "Rolls"
        if (clickedElement.dataset.category !== 'Rolls') {
             document.querySelectorAll('.subcategories .category-btn').forEach(btn => btn.classList.remove('active'));
        }
    } else { // Si se hizo clic en una subcategoría de Rolls
        // Maneja la activación de las subcategorías (botones)
        document.querySelectorAll('.subcategories .category-btn').forEach(btn => btn.classList.remove('active'));
        clickedElement.classList.add('active');
        // Asegurarse de que el item principal "Rolls" siga activo
        const rollsItem = document.querySelector('.image-category-item[data-category="Rolls"]');
        if (rollsItem && !rollsItem.classList.contains('active-category')) {
            document.querySelectorAll('.image-category-item').forEach(item => item.classList.remove('active-category'));
            rollsItem.classList.add('active-category');
        }
    }
}


// --- Funcionalidad del Carrito y Checkout (sin cambios) ---
function setupCartAndCheckoutListeners() {
    const cartBtn = document.getElementById('cartBtn');
    const cartSidebar = document.querySelector('.cart-sidebar');
    const cartOverlay = document.querySelector('.cart-overlay');
    const closeCartBtn = document.querySelector('.close-cart');
    const cartItemsContainer = document.querySelector('.cart-sidebar .cart-items');
    const checkoutBtn = document.querySelector('.cart-sidebar .checkout-btn');

    const authChoiceModal = document.getElementById('authChoiceModal');
    const guestOrderModal = document.getElementById('guestOrderModal');
    const closeAuthChoiceModalBtn = document.getElementById('closeAuthChoiceModal');
    const closeGuestModalBtn = document.getElementById('closeGuestModal');
    const loginChoiceBtn = document.getElementById('loginChoiceBtn');
    const guestChoiceBtn = document.getElementById('guestChoiceBtn');
    const guestOrderForm = document.getElementById('guestOrderForm');
    const guestZoneSelect = document.getElementById('guestZone');

    if (cartBtn) cartBtn.addEventListener('click', toggleCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', (e) => { if (e.target === cartOverlay) closeCart(); });
    if (cartItemsContainer) cartItemsContainer.addEventListener('click', handleCartItemActions);
    if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckoutButtonClick);
    if (loginChoiceBtn) loginChoiceBtn.addEventListener('click', () => { window.location.href = '/login'; });
    if (guestChoiceBtn) guestChoiceBtn.addEventListener('click', openGuestModal);
    if (closeAuthChoiceModalBtn) closeAuthChoiceModalBtn.addEventListener('click', closeAuthChoiceModal);
    if (closeGuestModalBtn) closeGuestModalBtn.addEventListener('click', closeGuestModal);
    if (guestOrderForm) guestOrderForm.addEventListener('submit', handleGuestOrderSubmit);
    if (guestZoneSelect) guestZoneSelect.addEventListener('change', updateGuestShippingInfo);
    if (authChoiceModal) authChoiceModal.addEventListener('click', (e) => { if (e.target === authChoiceModal) closeAuthChoiceModal(); });
    if (guestOrderModal) guestOrderModal.addEventListener('click', (e) => { if (e.target === guestOrderModal) closeGuestModal(); });

    const menuContainer = document.querySelector('.menu-items');
    if (menuContainer) menuContainer.addEventListener('click', handleAddToCartClick);

    const getCurrentLocationBtn = document.getElementById('getCurrentLocation');
    if (getCurrentLocationBtn) {
        getCurrentLocationBtn.addEventListener('click', getCurrentLocation);
    }

    // Inicializar el mapa cuando se abre el modal
    if (guestOrderModal) {
        guestOrderModal.addEventListener('show', () => {
            if (!map) {
                initMap();
            }
        });
    }
}
function handleCartItemActions(e) {
    const target = e.target;
    const cartItemDiv = target.closest('.cart-item');
    if (!cartItemDiv) return;
    const productId = cartItemDiv.dataset.id;
    if (target.matches('.quantity-btn.increase') || target.closest('.quantity-btn.increase')) updateItemQuantity(productId, 1);
    else if (target.matches('.quantity-btn.decrease') || target.closest('.quantity-btn.decrease')) updateItemQuantity(productId, -1);
    else if (target.matches('.cart-item-remove') || target.closest('.cart-item-remove')) removeFromCart(productId);
}
function handleAddToCartClick(event) {
    const button = event.target.closest('.add-to-cart-btn');
    if (!button) return;
    const productId = button.dataset.productId;
    if (!productId) { console.error("No productId found on button."); return; }
    const productToAdd = allProducts.find(p => p._id === productId);
    if (productToAdd) addToCart({ id: productToAdd._id, name: productToAdd.name, price: productToAdd.price, image: productToAdd.imageUrl, description: productToAdd.description });
    else { console.error(`Product with ID ${productId} not found.`); showNotification("Error: Producto no encontrado.", "error"); }
}
function handleCheckoutButtonClick() {
    const token = localStorage.getItem('token');
    if (token) window.location.href = '/dashboard#checkout';
    else openAuthChoiceModal();
    closeCart();
}
function toggleCart(e) {
    e?.preventDefault();
    const cartSidebar = document.querySelector('.cart-sidebar');
    const cartOverlay = document.querySelector('.cart-overlay');
    if (!cartSidebar || !cartOverlay) return;
    const isActive = cartSidebar.classList.contains('active');
    if (isActive) closeCart();
    else {
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
    const cartIconContainer = document.getElementById('cartBtn'); // Usar el contenedor del botón

    if (!cartItemsContainer || !cartCountElement || !totalAmountElement || !checkoutBtn || !cartIconContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<div class="empty-cart"><i class="fas fa-shopping-basket fa-3x"></i><p>Tu carrito está vacío</p></div>`;
        totalAmountElement.textContent = '$0.00';
        checkoutBtn.disabled = true; checkoutBtn.style.opacity = '0.6'; checkoutBtn.style.cursor = 'not-allowed';
        cartIconContainer.innerHTML = '<i class="material-icons">ramen_dining</i><span>0</span>';
        cartIconContainer.querySelector('span').style.display = 'none';
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
                    <button class="cart-item-remove" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>`;
        }).join('');
        totalAmountElement.textContent = `$${total.toFixed(2)}`;
        checkoutBtn.disabled = false; checkoutBtn.style.opacity = '1'; checkoutBtn.style.cursor = 'pointer';
        
        const totalItems = cart.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
        // Actualizar el ícono y el contador
        cartIconContainer.innerHTML = `
            <i class="material-icons">ramen_dining</i><span style="position: absolute; top: -8px; right: -8px; background-color: var(--accent-color); color: var(--primary-color); font-size: 12px; font-weight: bold; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">${totalItems}</span>
        `;
        cartIconContainer.querySelector('span').style.display = totalItems > 0 ? 'flex' : 'none';
    }
    // Re-seleccionar el contador después de cambiar el innerHTML del botón del carrito
    const newCartCountElement = cartIconContainer.querySelector('span');
    if (newCartCountElement) {
        const totalItems = cart.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
        newCartCountElement.textContent = totalItems;
        newCartCountElement.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}
function addToCart(itemData) {
    const existingItem = cart.find(cartItem => cartItem.id === itemData.id);
    if (existingItem) existingItem.quantity = (parseInt(existingItem.quantity, 10) || 0) + 1;
    else cart.push({ ...itemData, quantity: 1 });
    saveCart(); updateCart(); showNotification(`${itemData.name} agregado al carrito`, 'success');
}
function removeFromCart(productId) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    if (itemIndex > -1) { const itemName = cart[itemIndex].name || 'Producto'; cart.splice(itemIndex, 1); saveCart(); updateCart(); showNotification(`${itemName} eliminado del carrito`, 'info'); }
}
function updateItemQuantity(productId, change) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    if (itemIndex > -1) {
        cart[itemIndex].quantity = (parseInt(cart[itemIndex].quantity, 10) || 0) + change;
        if (cart[itemIndex].quantity <= 0) removeFromCart(productId);
        else { saveCart(); updateCart(); }
    }
}
function saveCart() {
    try { localStorage.setItem('cart', JSON.stringify(cart)); }
    catch (error) { console.error("Error saving cart to localStorage:", error); showNotification("Error al guardar el carrito.", "error"); }
}

// --- Modales de Autenticación y Pedido Invitado ---
function openAuthChoiceModal() { const modal = document.getElementById('authChoiceModal'); if (modal) modal.style.display = 'flex'; }
function closeAuthChoiceModal() { const modal = document.getElementById('authChoiceModal'); if (modal) modal.style.display = 'none'; }

function openGuestModal() {
    closeAuthChoiceModal();
    const modal = document.getElementById('guestOrderModal');
    const form = document.getElementById('guestOrderForm');
    const successDiv = document.getElementById('guestOrderSuccess');
    const summaryItemsContainer = document.getElementById('guestOrderSummaryItems');
    const subtotalProductsEl = document.getElementById('guestOrderSubtotalProducts');
    const totalOrderEl = document.getElementById('guestOrderTotal');

    if (modal && form && successDiv && summaryItemsContainer && subtotalProductsEl && totalOrderEl) {
        form.style.display = 'block';
        successDiv.style.display = 'none';
        form.reset();

        // Populate order summary
        if (cart.length === 0) {
            summaryItemsContainer.innerHTML = '<p>Tu carrito está vacío.</p>';
            subtotalProductsEl.textContent = '$0.00';
        } else {
            let itemsHtml = '<ul>';
            let currentSubtotal = 0;
            cart.forEach(item => {
                const itemTotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 0);
                currentSubtotal += itemTotal;
                itemsHtml += `<li style="display: flex; justify-content: space-between; font-size: 0.9em; margin-bottom: 0.3em;">
                                <span>${item.quantity}x ${item.name || 'Producto'}</span>
                                <span>$${itemTotal.toFixed(2)}</span>
                              </li>`;
            });
            itemsHtml += '</ul>';
            summaryItemsContainer.innerHTML = itemsHtml;
            subtotalProductsEl.textContent = `$${currentSubtotal.toFixed(2)}`;
        }
        
        updateGuestShippingInfo(); // Esto también actualizará el total general
        modal.style.display = 'flex';
    }
}

function closeGuestModal() { const modal = document.getElementById('guestOrderModal'); if (modal) modal.style.display = 'none'; }

function updateGuestShippingInfo() {
    const zoneSelect = document.getElementById('guestZone');
    const costDiv = document.getElementById('guestShippingCost'); // El div contenedor
    const costValueEl = document.getElementById('guestOrderShippingCostValue'); // El <strong> para el valor
    const msgDiv = document.getElementById('guestShippingMsg');
    const totalOrderEl = document.getElementById('guestOrderTotal');
    const subtotalProductsEl = document.getElementById('guestOrderSubtotalProducts');

    if (!zoneSelect || !costDiv || !costValueEl || !msgDiv || !totalOrderEl || !subtotalProductsEl) {
        console.error("Faltan elementos del DOM para el resumen de envío de invitado.");
        return;
    }

    const selectedOption = zoneSelect.options[zoneSelect.selectedIndex];
    const shippingCostText = selectedOption.dataset.cost;
    const zoneValue = zoneSelect.value;
    let shippingCost = 0;

    if (zoneValue && shippingCostText !== undefined) {
        shippingCost = parseFloat(shippingCostText);
        if (zoneValue === 'otra') {
            costDiv.style.display = 'none'; // Ocultar si es 'otra' ya que el msg lo indica
            msgDiv.textContent = 'Nos pondremos en contacto para confirmar el costo de envío a tu zona.';
            msgDiv.style.display = 'block';
            shippingCost = 0; // Asumir 0 hasta confirmar
        } else if (shippingCost >= 0) {
            costValueEl.textContent = `$${shippingCost.toFixed(2)}`;
            costDiv.style.display = 'flex'; // Asegurar que se muestre como flex
            msgDiv.style.display = 'none';
        } else {
            costDiv.style.display = 'none';
            msgDiv.style.display = 'none';
            shippingCost = 0;
        }
    } else {
        costDiv.style.display = 'none';
        msgDiv.style.display = 'none';
        shippingCost = 0;
    }

    // Recalcular total general
    let subtotalProductos = 0;
    if (cart.length > 0) {
        subtotalProductos = cart.reduce((sum, item) => {
            return sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 0);
        }, 0);
    }
    subtotalProductsEl.textContent = `$${subtotalProductos.toFixed(2)}`;
    totalOrderEl.textContent = `$${(subtotalProductos + shippingCost).toFixed(2)}`;
}

async function handleGuestOrderSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const successDiv = document.getElementById('guestOrderSuccess');

    if (!form.checkValidity()) {
        showNotification("Por favor, completa todos los campos requeridos.", "error");
        form.reportValidity();
        return;
    }

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

    // Obtener las coordenadas guardadas si existen
    const lastLocation = JSON.parse(localStorage.getItem('lastLocation') || '{}');
    const hasCoordinates = form.guestAddress.dataset.hasCoordinates === 'true';

    const deliveryData = {
        nombre: form.guestName.value.trim(),
        telefono: form.guestPhone.value.trim(),
        direccion: form.guestAddress.value.trim(),
        zona: form.guestZone.value,
        referencia: form.guestComment.value.trim(),
        // Incluir coordenadas solo si están disponibles
        ...(hasCoordinates && lastLocation.coordinates ? {
            coordinates: lastLocation.coordinates
        } : {})
    };

    // Obtener costo de envío de la zona seleccionada
    const zoneSelect = document.getElementById('guestZone');
    const selectedZoneOption = zoneSelect.options[zoneSelect.selectedIndex];
    const shippingCost = parseFloat(selectedZoneOption.dataset.cost) || 0;

    // Calcular subtotal y totalAmount
    let subtotal = 0;
    const processedItems = cart.map(item => {
        const itemPrice = parseFloat(item.price) || 0;
        const itemQuantity = parseInt(item.quantity, 10) || 0;
        const itemTotal = itemPrice * itemQuantity;
        subtotal += itemTotal;
        return { 
            productId: item.id, 
            quantity: itemQuantity, 
            price: itemPrice, 
            name: item.name, 
            image: item.image 
        };
    });
    const totalAmount = subtotal + shippingCost;

    const orderPayload = {
        items: processedItems,
        deliveryDetails: deliveryData,
        isGuestOrder: true,
        shippingCost: shippingCost, // Añadir costo de envío
        totalAmount: totalAmount   // El total ahora incluye el envío
    };

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
        const response = await fetch('/api/orders/guest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderPayload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showNotification("¡Pedido registrado con éxito!", "success");
            cart = [];
            saveCart();
            updateCart();
            form.style.display = 'none';
            successDiv.style.display = 'flex';
            // Limpiar la ubicación guardada después de un pedido exitoso
            localStorage.removeItem('lastLocation');
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

// --- Funcionalidad del Menú Móvil Mejorado ---
let isMenuOpen = false;

function setupMobileMenuListeners() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const mobileOverlay = document.querySelector('.mobile-menu-overlay');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMenu);
    }
    
    if (navLinks) {
        navLinks.querySelectorAll('a').forEach(link => {
            if (!link.closest('.auth-mobile')) {
                link.addEventListener('click', closeMenu);
            }
        });
    }
    
    // Cerrar menú al hacer clic en el overlay
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', closeMenu);
    }
    
    // Cerrar menú con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMenuOpen) {
            closeMenu();
        }
    });
    
    // Manejar resize de ventana
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (window.innerWidth > 768) {
                closeMenu();
            }
        }, 100);
    });
}

function toggleMenu(e) {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (isMenuOpen) {
        closeMenu();
    } else {
        openMenu();
    }
}

function openMenu() {
    if (isMenuOpen) return;

    const navLinks = document.querySelector('.nav-links');
    const mobileOverlay = document.querySelector('.mobile-menu-overlay');
    const body = document.body;

    if (!navLinks || !mobileOverlay) return;

    // Cerrar carrito si está abierto
    if (document.querySelector('.cart-sidebar')?.classList.contains('active')) {
        closeCart();
    }

    isMenuOpen = true;
    body.classList.add('menu-open');
    mobileOverlay.classList.add('active');
    navLinks.classList.add('active'); // <-- Solo añadimos la clase
}

function closeMenu() {
    if (!isMenuOpen) return;

    const navLinks = document.querySelector('.nav-links');
    const mobileOverlay = document.querySelector('.mobile-menu-overlay');
    const body = document.body;

    if (!navLinks || !mobileOverlay) return;

    isMenuOpen = false;
    body.classList.remove('menu-open');
    mobileOverlay.classList.remove('active');
    navLinks.classList.remove('active'); // <-- Solo quitamos la clase
}

// --- Autenticación en Navbar (sin cambios) ---
function setupNavbarAuth() {
    if (localStorage.getItem('adminAuthToken') || sessionStorage.getItem('adminAuthToken')) { const navButtonsContainer = document.querySelector('.nav-buttons'); const navLinksUl = document.querySelector('.nav-links'); if (navButtonsContainer) navButtonsContainer.querySelectorAll('.login-btn, .nav-user-menu').forEach(el => el.remove()); if (navLinksUl) navLinksUl.querySelectorAll('.auth-mobile').forEach(el => el.remove()); document.body.classList.remove('logged-in'); return; }
    const token = localStorage.getItem('token'); const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}'); const navButtonsContainer = document.querySelector('.nav-buttons'); const navLinksUl = document.querySelector('.nav-links'); const body = document.body;
    if (!navButtonsContainer || !navLinksUl) return; const cartBtnExisting = document.getElementById('cartBtn');
    navButtonsContainer.querySelectorAll('.login-btn, .nav-user-menu, .logout-btn-nav').forEach(el => el.remove()); navLinksUl.querySelectorAll('.auth-mobile').forEach(el => el.remove()); body.classList.remove('logged-in');
    if (token && userInfo.nombre) {
        body.classList.add('logged-in');
        // Restaurar el enlace al dashboard con el nombre del usuario en la navbar (escritorio)
        const userMenuDesktop = document.createElement('div');
        userMenuDesktop.className = 'nav-user-menu';
        userMenuDesktop.innerHTML = `<a href="/dashboard" class="nav-user-link" title="Mi Dashboard"><i class="fas fa-user-circle"></i> ${userInfo.nombre.split(' ')[0]}</a>`;
        if (cartBtnExisting) navButtonsContainer.insertBefore(userMenuDesktop, cartBtnExisting); else navButtonsContainer.appendChild(userMenuDesktop);

        // Volver a poner el botón de cerrar sesión en el menú móvil
        if (window.innerWidth <= 768) {
            let logoutMobileLi = navLinksUl.querySelector('.logout-mobile');
            if (!logoutMobileLi) {
                logoutMobileLi = document.createElement('li');
                logoutMobileLi.className = 'logout-mobile mobile-only';
                logoutMobileLi.innerHTML = `<button class="logout-btn-nav" style="width:100%;text-align:left;padding:0.7em 1em;font-size:1em;background:none;border:none;color:#bb002b;"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</button>`;
                navLinksUl.appendChild(logoutMobileLi);
                logoutMobileLi.querySelector('.logout-btn-nav').addEventListener('click', logoutUser);
            }
        } else {
            const logoutMobileLi = navLinksUl.querySelector('.logout-mobile');
            if (logoutMobileLi) logoutMobileLi.remove();
        }
    } else {
        const loginBtnDesktopNew = document.createElement('a'); loginBtnDesktopNew.href = '/login'; loginBtnDesktopNew.className = 'login-btn'; loginBtnDesktopNew.innerHTML = '<i class="fas fa-user"></i>Iniciar Sesión';
        if (cartBtnExisting) navButtonsContainer.insertBefore(loginBtnDesktopNew, cartBtnExisting); else navButtonsContainer.appendChild(loginBtnDesktopNew);
        const loginLinkMobile = document.createElement('li'); loginLinkMobile.className = 'auth-mobile mobile-only'; loginLinkMobile.innerHTML = `<a href="/login" class="login-btn"><i class="fas fa-user"></i>Iniciar Sesión</a>`; navLinksUl.appendChild(loginLinkMobile);
    }
    const updatedNavItems = navLinksUl.querySelectorAll('li'); updatedNavItems.forEach((item, index) => { item.style.setProperty('--item-index', index); });
}
function logoutUser() { localStorage.removeItem('token'); localStorage.removeItem('userInfo'); window.location.reload(); }

// --- Control de Scroll del Navbar (sin cambios) ---
let lastScrollTop = 0; let scrollTimeout; let isNavbarHidden = false;
function setupNavbarScroll() {
    const navbar = document.querySelector('.navbar'); if (!navbar) return;
    window.addEventListener('scroll', () => { if (isMenuOpen) { if (isNavbarHidden) { navbar.classList.remove('hidden'); isNavbarHidden = false; } return; } if (scrollTimeout) clearTimeout(scrollTimeout); scrollTimeout = setTimeout(() => { const currentScroll = window.pageYOffset || document.documentElement.scrollTop; if (currentScroll > lastScrollTop && currentScroll > 100) { if (!isNavbarHidden) { navbar.classList.add('hidden'); isNavbarHidden = true; } } else { if (isNavbarHidden) { navbar.classList.remove('hidden'); isNavbarHidden = false; } } navbar.style.backgroundColor = currentScroll > 50 ? 'rgba(187, 0, 43, 0.95)' : 'rgba(187, 0, 43, 1)'; lastScrollTop = currentScroll <= 0 ? 0 : currentScroll; }, 50); }, { passive: true });
}

// --- Notificaciones Visuales (sin cambios) ---
function showNotification(message, type = 'success', duration = 3500) {
    const container = document.body; const notification = document.createElement('div'); notification.className = `notification ${type}`; let iconClass = 'fa-check-circle'; if (type === 'error') iconClass = 'fa-exclamation-circle'; if (type === 'info') iconClass = 'fa-info-circle'; if (type === 'warning') iconClass = 'fa-exclamation-triangle'; notification.innerHTML = `<i class="fas ${iconClass}"></i><span>${message}</span>`; container.appendChild(notification); requestAnimationFrame(() => { notification.classList.add('show'); }); setTimeout(() => { notification.classList.remove('show'); notification.addEventListener('transitionend', () => notification.remove()); setTimeout(() => notification.remove(), 500); }, duration);
}

// --- Manejo de Cupón Registrado (sin cambios) ---
function handleCouponClick() {
    const token = localStorage.getItem('token');
    if (token) showNotification("Funcionalidad de cupón aún no implementada.", "info");
    else { showNotification("Inicia sesión para usar este cupón exclusivo.", "info"); setTimeout(() => { window.location.href = '/login'; }, 2000); }
}

function initMap() {
    // Esta función se llama cuando se carga el script de Google Maps
    console.log('Google Maps API cargada');
}

function getCurrentLocation() {
    const addressInput = document.getElementById('guestAddress');
    const locationButton = document.getElementById('getCurrentLocation');
    let watchId = null;

    if (!navigator.geolocation) {
        alert('Tu navegador no soporta geolocalización');
        return;
    }

    locationButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Obteniendo ubicación precisa...';
    locationButton.disabled = true;

    const options = {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
    };

    // Función para detener el seguimiento de la ubicación
    function stopWatching() {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
    }

    // Iniciar el seguimiento de la ubicación
    watchId = navigator.geolocation.watchPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            // Actualizar las coordenadas en el campo
            addressInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            console.log('Nueva ubicación detectada - Precisión:', accuracy, 'metros');

            // Si la precisión es muy buena (menos de 10 metros), detener el seguimiento
            if (accuracy <= 10) {
                stopWatching();
                locationButton.innerHTML = '<i class="fas fa-map-marker-alt"></i> Usar mi ubicación actual';
                locationButton.disabled = false;
                console.log('Ubicación precisa obtenida');
            }
        },
        function(error) {
            stopWatching();
            alert('Error al obtener tu ubicación: ' + error.message);
            locationButton.innerHTML = '<i class="fas fa-map-marker-alt"></i> Usar mi ubicación actual';
            locationButton.disabled = false;
        },
        options
    );

    // Detener el seguimiento después de 30 segundos si no se ha obtenido una ubicación precisa
    setTimeout(() => {
        if (watchId !== null) {
            stopWatching();
            locationButton.innerHTML = '<i class="fas fa-map-marker-alt"></i> Usar mi ubicación actual';
            locationButton.disabled = false;
        }
    }, 30000);
}