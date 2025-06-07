/**
 * dashboard.js - Refactored
 * Handles the functionality for the user dashboard interface.
 *
 * Sections:
 * 1. Constants & Configuration
 * 2. State Management
 * 3. Authentication
 * 4. Initialization
 * 5. Event Listener Setup
 * 6. UI Component Handlers (Sidebar, Modals, Notifications)
 * 7. Section Management & Content Loading
 * 8. Feature Modules (Profile, Cart, Checkout, Orders, Menu)
 * 9. API Utility Functions
 * 10. Utility Functions
 * 11. Global Event Listeners & Initial Load
 */

// --- 1. Constants & Configuration ---
const API_ENDPOINTS = {
    PROFILE: '/api/profile',
    CHANGE_PASSWORD: '/api/profile/change-password',
    ORDERS: '/api/orders', // Endpoint para obtener los pedidos del usuario logueado
    PRODUCTS: '/api/products'
};

const LOCAL_STORAGE_KEYS = {
    TOKEN: 'token',
    USER_INFO: 'userInfo',
    PREFERENCES: 'dashboardPreferences',
    CART: 'cart'
};

const SELECTORS = {
    // General Layout
    SIDEBAR: '.sidebar',
    MAIN_CONTENT: '.main-content',
    SIDEBAR_TOGGLE: '#sidebarToggle',
    PAGE_TITLE: '#pageTitle',
    LOGOUT_BTN: '.logout-btn',
    NOTIFICATION_BADGE: '.notification-badge',
    // Sections
    DASHBOARD_SECTIONS: '.dashboard-section',
    PROFILE_CONTENT: '#perfilContent',
    ORDERS_CONTENT: '#pedidosContent',
    CART_CONTENT: '#carritoContent',
    CHECKOUT_CONTENT: '#checkoutContent',
    MENU_CONTENT: '#menuContent',
    PUNTOS_CONTENT: '#puntosContent', // Agregado para la sección de puntos
    // Sidebar Menu
    SIDEBAR_MENU_ITEMS: '.sidebar-menu .menu-item',
    // Profile
    USER_NAME_HEADER: '#userName',
    USER_NOMBRES: '#userNombres',
    USER_APELLIDOS: '#userApellidos',
    USER_EMAIL: '#userEmail',
    USER_TELEFONO: '#userTelefono',
    USER_FECHA_NACIMIENTO: '#userFechaNacimiento',
    EDIT_PROFILE_BTN: '#perfilContent .action-btn.edit-btn',
    CHANGE_PASSWORD_BTN: '#perfilContent .action-btn.password-btn',
    // Modals
    EDIT_MODAL: '#editModal',
    PASSWORD_MODAL: '#passwordModal',
    MODAL_CLOSE_BTN: '.modal .close-modal',
    EDIT_PROFILE_FORM: '#editProfileForm',
    CHANGE_PASSWORD_FORM: '#changePasswordForm',
    // Cart
    CART_ITEMS_CONTAINER: '#carritoContent .cart-items',
    CART_TOTAL_AMOUNT: '#carritoContent .total-amount',
    CART_CHECKOUT_BTN: '#carritoContent .checkout-btn',
    EMPTY_CART_CONTINUE_BTN: '#carritoContent .empty-cart .continue-shopping',
    // Checkout
    CHECKOUT_ORDER_ITEMS: '#checkoutContent .order-items',
    CHECKOUT_PRODUCT_SUBTOTAL_AMOUNT: '#checkoutProductSubtotalAmount', // MODIFICADO ID
    CHECKOUT_SHIPPING_COST_AMOUNT: '#checkoutShippingCostAmount',   // NUEVO ID
    CHECKOUT_SHIPPING_MSG: '#checkoutContent #checkoutShippingMsg',   // NUEVO ID
    CHECKOUT_GRAND_TOTAL_AMOUNT: '#checkoutGrandTotalAmount',         // MODIFICADO ID (antes era solo #checkoutContent .total .amount)
    CHECKOUT_CONFIRM_BTN: '#checkoutContent .confirm-order-btn',
    SHIPPING_FORM: '#shippingForm',
    DASHBOARD_ZONE_SELECT: '#dashboardZoneSelect', // NUEVO ID para el select de zona en dashboard
    // Orders
    ORDERS_LIST_CONTAINER: '#pedidosContent .orders-list', // Contenedor para la lista de pedidos
    ORDERS_FILTERS_BUTTONS: '#pedidosContent .filter-buttons button',
    ORDERS_SEARCH_INPUT: '#pedidosContent #searchOrder',
    // Menu
    MENU_ITEMS_CONTAINER: '#menuContent .menu-items',
    MENU_ADD_TO_CART_BTN: '.add-to-cart-btn',
    // Notifications
    NOTIFICATION_CONTAINER: 'body',
};

const DEFAULT_SECTION = 'menu';

// --- 2. State Management ---
const dashboardState = {
    currentSection: DEFAULT_SECTION,
    userProfile: null,
    dashboardProducts: [],
    userOrders: [], // Para almacenar los pedidos del usuario
    isSidebarCollapsed: false,
};

// --- 3. Authentication ---
(function checkAuthImmediate() {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    const isLoginPage = window.location.pathname.endsWith('/login') || window.location.pathname.endsWith('/login.html');
    if (!token && !isLoginPage) {
        console.warn("AUTH CHECK (Immediate): No token, redirecting to login...");
        window.location.href = '/login';
    } else {
        console.log(`AUTH CHECK (Immediate): ${token ? 'Token found.' : 'No token, but on login page or similar.'}`);
    }
})();

function checkAuthOnLoad() {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    const isLoginPage = window.location.pathname.endsWith('/login') || window.location.pathname.endsWith('/login.html');
    if (!token && !isLoginPage) {
        console.warn("AUTH CHECK (DOM Load): No token found after DOM load, redirecting...");
        window.location.href = '/login';
        return false;
    }
    if (!token && isLoginPage) {
        console.log("AUTH CHECK (DOM Load): No token, on login page. Dashboard init skipped.");
        return false;
    }
    console.log("AUTH CHECK (DOM Load): Token present. Proceeding with initialization.");
    return true;
}

function logout() {
    console.log("Logging out...");
    localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_INFO);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.PREFERENCES);
    window.location.href = '/login';
}

// --- 4. Initialization ---
async function initializeDashboard() {
    console.log("Initializing dashboard...");
    setupSidebar();
    setupCommonEventListeners();
    setupModalListeners();
    setupSectionSpecificListeners();
    await fetchAndDisplayUserProfile();

    const lastSection = getUserPreference('lastSection') || DEFAULT_SECTION;
    const initialMenuItem = document.querySelector(`.menu-item a[href="#${lastSection}"]`)?.closest(SELECTORS.SIDEBAR_MENU_ITEMS);

    if (initialMenuItem) {
        await handleSectionChange(lastSection, initialMenuItem);
    } else {
        const defaultMenuItem = document.querySelector(`.menu-item a[href="#${DEFAULT_SECTION}"]`)?.closest(SELECTORS.SIDEBAR_MENU_ITEMS);
        if (defaultMenuItem) {
            await handleSectionChange(DEFAULT_SECTION, defaultMenuItem);
        } else {
            console.error("Default sidebar menu item not found!");
        }
    }
    handleResize();
    console.log("Dashboard initialized.");
}

// --- 5. Event Listener Setup ---
function setupCommonEventListeners() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const logoutBtn = document.querySelector(SELECTORS.LOGOUT_BTN);
    const notificationBadge = document.querySelector(SELECTORS.NOTIFICATION_BADGE);

    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    if (logoutBtn) logoutBtn.addEventListener('click', logout); // Cambiado de onclick a addEventListener
    if (notificationBadge) notificationBadge.addEventListener('click', showNotificationsPanel);

    document.querySelectorAll(SELECTORS.SIDEBAR_MENU_ITEMS).forEach(item => {
        item.addEventListener('click', handleSidebarMenuClick);
    });
    document.addEventListener('click', handleOutsideSidebarClick);
}

function setupSectionSpecificListeners() {
    const cartContainer = document.querySelector(SELECTORS.CART_CONTENT);
    if (cartContainer) cartContainer.addEventListener('click', handleCartActions);

    const checkoutContainer = document.querySelector(SELECTORS.CHECKOUT_CONTENT);
    if (checkoutContainer) {
        checkoutContainer.addEventListener('click', handleCheckoutActions);
        // Agregar el event listener para el botón de ubicación
        const locationButton = checkoutContainer.querySelector('#getCurrentLocation');
        if (locationButton) {
            locationButton.addEventListener('click', getCurrentLocation);
        }
        // NUEVO: Listener para el cambio de zona en el dashboard checkout
        const zoneSelectDashboard = document.querySelector(SELECTORS.DASHBOARD_ZONE_SELECT);
        if (zoneSelectDashboard) {
            zoneSelectDashboard.addEventListener('change', updateDashboardShippingInfoAndTotals);
        }
    }

    const ordersContainer = document.querySelector(SELECTORS.ORDERS_CONTENT);
    if (ordersContainer) {
        ordersContainer.addEventListener('click', handleOrderActions);
        const filterButtons = ordersContainer.querySelectorAll(SELECTORS.ORDERS_FILTERS_BUTTONS);
        filterButtons.forEach(button => button.addEventListener('click', handleOrderFilterClick));
        const searchInput = ordersContainer.querySelector(SELECTORS.ORDERS_SEARCH_INPUT);
        if (searchInput) searchInput.addEventListener('input', handleOrderSearch);
    }

    const menuContainer = document.querySelector(SELECTORS.MENU_CONTENT);
    if (menuContainer) menuContainer.addEventListener('click', handleMenuActions);

    const profileContainer = document.querySelector(SELECTORS.PROFILE_CONTENT);
    if (profileContainer) {
        const editProfileBtn = profileContainer.querySelector(SELECTORS.EDIT_PROFILE_BTN);
        const changePasswordBtn = profileContainer.querySelector(SELECTORS.CHANGE_PASSWORD_BTN);
        editProfileBtn?.addEventListener('click', () => openModal(SELECTORS.EDIT_MODAL, populateEditProfileForm));
        changePasswordBtn?.addEventListener('click', () => openModal(SELECTORS.PASSWORD_MODAL));
    }
}

function setupModalListeners() {
    document.querySelectorAll(SELECTORS.MODAL_CLOSE_BTN).forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.closest('.modal')));
    });
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) closeModal(event.target);
    });
    const editProfileForm = document.querySelector(SELECTORS.EDIT_PROFILE_FORM);
    const changePasswordForm = document.querySelector(SELECTORS.CHANGE_PASSWORD_FORM);
    editProfileForm?.addEventListener('submit', handleEditProfileSubmit);
    changePasswordForm?.addEventListener('submit', handleChangePasswordSubmit);
}

// --- Event Handlers ---
function handleSidebarMenuClick(event) {
    event.preventDefault();
    const menuItem = event.currentTarget;
    const link = menuItem.querySelector('a');
    if (!link) return;
    const sectionId = link.getAttribute('href')?.substring(1);
    if (sectionId) handleSectionChange(sectionId, menuItem);
}

function handleOutsideSidebarClick(event) {
    const sidebar = document.querySelector(SELECTORS.SIDEBAR);
    if (!sidebar || dashboardState.isSidebarCollapsed) return;
    if (window.innerWidth <= 768 && !event.target.closest(SELECTORS.SIDEBAR) && !event.target.closest(SELECTORS.SIDEBAR_TOGGLE)) {
        collapseSidebar();
    }
}

function handleCartActions(event) {
    const target = event.target;
    const cartItemDiv = target.closest('.cart-item');
    const continueShoppingBtn = target.closest(SELECTORS.EMPTY_CART_CONTINUE_BTN);
    const checkoutBtn = target.closest(SELECTORS.CART_CHECKOUT_BTN);

    if (cartItemDiv) {
        const index = parseInt(cartItemDiv.dataset.index, 10);
        if (isNaN(index)) return;
        if (target.matches('.quantity-btn.increase') || target.closest('.quantity-btn.increase')) updateCartQuantity(index, 1);
        else if (target.matches('.quantity-btn.decrease') || target.closest('.quantity-btn.decrease')) updateCartQuantity(index, -1);
        else if (target.matches('.cart-item-remove') || target.closest('.cart-item-remove')) removeFromCart(index);
    } else if (continueShoppingBtn) {
        event.preventDefault();
        const targetSection = continueShoppingBtn.dataset.targetSection || 'menu';
        const menuItem = document.querySelector(`.menu-item a[href="#${targetSection}"]`)?.closest(SELECTORS.SIDEBAR_MENU_ITEMS);
        if (menuItem) handleSectionChange(targetSection, menuItem);
    } else if (checkoutBtn) {
        const checkoutMenuItem = document.querySelector('.menu-item a[href="#checkout"]')?.closest(SELECTORS.SIDEBAR_MENU_ITEMS);
        if (checkoutMenuItem) handleSectionChange('checkout', checkoutMenuItem);
        else console.error("Checkout menu item not found.");
    }
}

function handleCheckoutActions(event) {
    const target = event.target;
    const confirmBtn = target.closest(SELECTORS.CHECKOUT_CONFIRM_BTN);
    if (confirmBtn) confirmOrder();
}

function handleOrderActions(event) {
    const target = event.target;
    const detailsBtn = target.closest('.order-card .order-header') || target.closest('.order-card .details-btn'); // Permitir click en todo el header o el botón
    if (detailsBtn) {
        const orderCard = detailsBtn.closest('.order-card');
        toggleOrderDetails(orderCard);
    }
}

function handleMenuActions(event) {
    const target = event.target;
    const addToCartBtn = target.closest(SELECTORS.MENU_ADD_TO_CART_BTN);
    if (addToCartBtn) {
        try {
            const productInfoString = addToCartBtn.dataset.productInfo;
            if (!productInfoString) {
                console.error("Product info data attribute missing on add-to-cart button.");
                showNotification("Error al obtener información del producto.", "error");
                return;
            }
            const productInfo = JSON.parse(productInfoString.replace(/'/g, "\"")); // Asegurar comillas dobles para JSON
            addToCart(productInfo);
        } catch (error) {
            console.error("Error processing add to cart click:", error);
            showNotification("Error al agregar el producto al carrito.", "error");
        }
    }
}

// --- 6. UI Component Handlers ---
function setupSidebar() { console.log("Sidebar setup initiated."); }
function toggleSidebar() {
    const sidebar = document.querySelector(SELECTORS.SIDEBAR);
    const mainContent = document.querySelector(SELECTORS.MAIN_CONTENT);
    if (!sidebar || !mainContent) return;
    const shouldCollapse = !sidebar.classList.contains('collapsed');
    if (shouldCollapse) collapseSidebar();
    else expandSidebar();
    if (window.innerWidth > 768) saveUserPreference('sidebarCollapsed', shouldCollapse);
}
function collapseSidebar() {
    const sidebar = document.querySelector(SELECTORS.SIDEBAR);
    const mainContent = document.querySelector(SELECTORS.MAIN_CONTENT);
    if (!sidebar || !mainContent) return;
    sidebar.classList.add('collapsed');
    mainContent.classList.add('expanded');
    dashboardState.isSidebarCollapsed = true;
    console.log("Sidebar collapsed.");
}
function expandSidebar() {
    const sidebar = document.querySelector(SELECTORS.SIDEBAR);
    const mainContent = document.querySelector(SELECTORS.MAIN_CONTENT);
    if (!sidebar || !mainContent) return;
    sidebar.classList.remove('collapsed');
    mainContent.classList.remove('expanded');
    dashboardState.isSidebarCollapsed = false;
    console.log("Sidebar expanded.");
}
function openModal(selectorOrElement, onOpenCallback) {
    const modalElement = typeof selectorOrElement === 'string' ? document.querySelector(selectorOrElement) : selectorOrElement;
    if (modalElement) {
        modalElement.style.display = 'flex';
        console.log(`Modal opened: ${modalElement.id}`);
        if (typeof onOpenCallback === 'function') {
            try { onOpenCallback(); } catch (error) { console.error(`Error in modal open callback for ${modalElement.id}:`, error); }
        }
    } else console.warn(`Modal element not found: ${selectorOrElement}`);
}
function closeModal(selectorOrElement) {
    const modalElement = typeof selectorOrElement === 'string' ? document.querySelector(selectorOrElement) : selectorOrElement;
    if (modalElement) {
        modalElement.style.display = 'none';
        console.log(`Modal closed: ${modalElement.id}`);
        const forms = modalElement.querySelectorAll('form');
        forms.forEach(form => form.reset());
        modalElement.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    }
}
function showNotification(message, type = 'success', duration = 3500) {
    const container = document.querySelector(SELECTORS.NOTIFICATION_CONTAINER) || document.body;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    const iconClass = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
    notification.innerHTML = `<i class="fas ${iconClass}"></i><span>${message}</span>`;
    container.appendChild(notification);
    requestAnimationFrame(() => notification.classList.add('show'));
    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => notification.remove());
        setTimeout(() => notification.remove(), 500);
    }, duration);
}
function showNotificationsPanel() {
    console.warn('PENDING FEATURE: Show notifications panel');
    showNotification('Panel de notificaciones aún no implementado.', 'warning');
}

// --- 7. Section Management & Content Loading ---
async function handleSectionChange(sectionId, menuItem) {
    if (!sectionId || !menuItem) {
        console.error("Invalid sectionId or menuItem provided to handleSectionChange.");
        return;
    }
    console.log(`Changing to section: ${sectionId}`);
    dashboardState.currentSection = sectionId;
    document.querySelectorAll(SELECTORS.SIDEBAR_MENU_ITEMS).forEach(item => item.classList.remove('active'));
    menuItem.classList.add('active');
    const pageTitleElement = document.getElementById('pageTitle');
    const linkText = menuItem.querySelector('a span')?.textContent;
    if (pageTitleElement && linkText) pageTitleElement.textContent = linkText;

    document.querySelectorAll(SELECTORS.DASHBOARD_SECTIONS).forEach(section => section.classList.remove('active'));
    const targetSection = document.getElementById(`${sectionId}Content`);
    if (targetSection) {
        targetSection.classList.add('active');
        await loadSectionContent(sectionId);
    } else {
        console.warn(`Section content element with ID '${sectionId}Content' not found.`);
        const defaultSectionContent = document.querySelector(SELECTORS.PROFILE_CONTENT); // O la sección por defecto que prefieras
        const defaultMenuItem = document.querySelector(`.menu-item a[href="#${DEFAULT_SECTION}"]`)?.closest(SELECTORS.SIDEBAR_MENU_ITEMS);
        if (defaultSectionContent && defaultMenuItem) {
            defaultSectionContent.classList.add('active');
            if (pageTitleElement) pageTitleElement.textContent = "Mi Perfil";
            defaultMenuItem.classList.add('active');
            dashboardState.currentSection = DEFAULT_SECTION;
            await loadSectionContent(DEFAULT_SECTION);
        }
    }
    saveUserPreference('lastSection', sectionId);
    if (window.innerWidth <= 768 && !dashboardState.isSidebarCollapsed) collapseSidebar();
}

async function loadSectionContent(sectionId) {
    console.log(`Loading dynamic content for section: ${sectionId}`);
    switch (sectionId) {
        case 'perfil': break;
        case 'pedidos': await loadOrders(); break;
        case 'carrito': updateCartDisplay(); break;
        case 'checkout': 
            initializeCheckout(); 
            loadCheckoutSummary();
            // Inicializar el mapa cuando se carga la sección de checkout
            if (typeof google !== 'undefined' && google.maps) {
                initMap();
            } else {
                // Si Google Maps no está cargado, esperar a que se cargue
                window.addEventListener('load', () => {
                    if (typeof google !== 'undefined' && google.maps) {
                        initMap();
                    }
                });
            }
            break;
        case 'menu': await loadDashboardMenu(); break;
        case 'puntos': loadPuntosContent(); break;
        default: console.log(`No specific content loading defined for section: ${sectionId}`);
    }
}

// --- 8. Feature Modules ---
// Profile Module
async function fetchAndDisplayUserProfile() {
    console.log("Fetching user profile...");
    const profileData = await makeApiCall(API_ENDPOINTS.PROFILE, 'GET');
    if (profileData && profileData.success) {
        dashboardState.userProfile = profileData.data;
        updateProfileDOM(profileData.data);
        console.log("User profile loaded and displayed.");
    } else {
        displayProfileError(profileData?.message || 'No se pudo cargar el perfil.');
        if (profileData?.status === 401) logout();
    }
}
function updateProfileDOM(userData) {
    const getElement = (selector) => document.querySelector(selector);
    const setText = (element, text) => { if (element) element.textContent = text || 'No disponible'; };
    setText(getElement(SELECTORS.USER_NAME_HEADER), userData.nombre || 'Usuario');
    setText(getElement(SELECTORS.USER_NOMBRES), userData.nombre);
    setText(getElement(SELECTORS.USER_APELLIDOS), userData.apellidos);
    setText(getElement(SELECTORS.USER_EMAIL), userData.email);
    setText(getElement(SELECTORS.USER_TELEFONO), userData.telefono);
    const fechaNacimientoEl = getElement(SELECTORS.USER_FECHA_NACIMIENTO);
    if (fechaNacimientoEl) {
        if (userData.fechaNacimiento) {
            try {
                const date = new Date(userData.fechaNacimiento);
                if (!isNaN(date.getTime())) {
                    const utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
                    fechaNacimientoEl.textContent = utcDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
                } else fechaNacimientoEl.textContent = 'Fecha inválida';
            } catch (e) { console.error("Error formatting date:", e); fechaNacimientoEl.textContent = 'Fecha inválida'; }
        } else fechaNacimientoEl.textContent = 'No disponible';
    }
}
function displayProfileError(message) {
    const selectors = [SELECTORS.USER_NAME_HEADER, SELECTORS.USER_NOMBRES, SELECTORS.USER_APELLIDOS, SELECTORS.USER_EMAIL, SELECTORS.USER_TELEFONO, SELECTORS.USER_FECHA_NACIMIENTO];
    selectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) element.textContent = (selector === SELECTORS.USER_NAME_HEADER) ? 'Error' : message;
    });
}
function populateEditProfileForm() {
    const profile = dashboardState.userProfile;
    if (!profile) { console.warn("Cannot populate edit form: User profile data not available."); return; }
    const form = document.querySelector(SELECTORS.EDIT_PROFILE_FORM);
    if (!form) return;
    form.nombres.value = profile.nombre || '';
    form.apellidos.value = profile.apellidos || '';
    form.telefono.value = profile.telefono || '';
    if (profile.fechaNacimiento) {
        try {
            const date = new Date(profile.fechaNacimiento);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                form.fechaNacimiento.value = `${year}-${month}-${day}`;
            } else form.fechaNacimiento.value = '';
        } catch (e) { console.error("Error formatting date for input:", e); form.fechaNacimiento.value = ''; }
    } else form.fechaNacimiento.value = '';
}
async function handleEditProfileSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const updatedData = {
        nombre: form.nombres.value.trim(),
        apellidos: form.apellidos.value.trim(),
        telefono: form.telefono.value.trim(),
        fechaNacimiento: form.fechaNacimiento.value
    };
    const result = await makeApiCall(API_ENDPOINTS.PROFILE, 'PUT', updatedData);
    if (result && result.success) {
        showNotification("Perfil actualizado con éxito", "success");
        closeModal(SELECTORS.EDIT_MODAL);
        await fetchAndDisplayUserProfile();
    } else showNotification(`Error al actualizar: ${result?.message || 'Error desconocido'}`, "error");
}
async function handleChangePasswordSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const currentPassword = form.currentPassword.value;
    const newPassword = form.newPassword.value;
    const confirmNewPassword = form.confirmNewPassword.value;
    if (!currentPassword || !newPassword || !confirmNewPassword) { showNotification("Por favor, completa todos los campos.", "error"); return; }
    if (newPassword !== confirmNewPassword) { showNotification("Las nuevas contraseñas no coinciden", "error"); return; }
    if (newPassword.length < 6) { showNotification("La nueva contraseña debe tener al menos 6 caracteres", "error"); return; }
    const result = await makeApiCall(API_ENDPOINTS.CHANGE_PASSWORD, 'POST', { currentPassword, newPassword });
    if (result && result.success) {
        showNotification("Contraseña cambiada con éxito", "success");
        closeModal(SELECTORS.PASSWORD_MODAL);
    } else showNotification(`Error al cambiar contraseña: ${result?.message || 'Error desconocido'}`, "error");
}

// Cart Module
function getCart() {
    try { return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CART) || '[]'); }
    catch (error) { console.error("Error parsing cart from localStorage:", error); return []; }
}
function saveCart(cart) {
    try { localStorage.setItem(LOCAL_STORAGE_KEYS.CART, JSON.stringify(cart)); }
    catch (error) { console.error("Error saving cart to localStorage:", error); showNotification("Error al guardar el carrito.", "error"); }
}
function addToCart(itemData) {
    console.log("Adding to cart (dashboard):", itemData);
    if (!itemData || !itemData.id) {
        console.error("Invalid item data provided to addToCart:", itemData);
        showNotification("No se pudo agregar el producto (datos inválidos).", "error"); // Asumo que showNotification existe
        return;
    }
    let cart = getCart();
    const existingItemIndex = cart.findIndex(i => i.id === itemData.id);
    if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity = (parseInt(cart[existingItemIndex].quantity, 10) || 0) + 1;
    } else {
        cart.push({ 
            id: itemData.id, 
            name: itemData.name || 'Producto sin nombre', 
            price: parseFloat(itemData.price) || 0, 
            image: itemData.image || '/public/images/placeholder.png', // Ruta corregida
            description: itemData.description, 
            quantity: 1 
        });
    }
    saveCart(cart); // Asumo que saveCart() existe
    showNotification(`${itemData.name || 'Producto'} agregado al carrito`, 'success');
    updateCartDisplay(); // <<--- LLAMADA IMPORTANTE
    if (dashboardState.currentSection === 'checkout') {
        loadCheckoutSummary(); // Si también tienes que actualizar el checkout
    }
}
function updateCartQuantity(index, change) {
    let cart = getCart();
    if (cart[index]) {
        const currentQuantity = parseInt(cart[index].quantity, 10) || 0;
        const newQuantity = currentQuantity + change;
        if (newQuantity < 1) {
            removeFromCart(index); // removeFromCart ya llama a updateCartDisplay
        } else {
            cart[index].quantity = newQuantity;
            saveCart(cart);
            updateCartDisplay(); // <<--- LLAMADA IMPORTANTE
            if (dashboardState.currentSection === 'checkout') {
                loadCheckoutSummary();
            }
        }
    } else console.warn(`Attempted to update quantity for invalid index: ${index}`);
}
function removeFromCart(index) {
    let cart = getCart();
    if (cart[index]) {
        const removedItemName = cart[index].name || 'Producto';
        cart.splice(index, 1);
        saveCart(cart);
        showNotification(`${removedItemName} eliminado del carrito`, "info");
        updateCartDisplay(); // <<--- LLAMADA IMPORTANTE
        if (dashboardState.currentSection === 'checkout') {
            loadCheckoutSummary();
        }
    } else console.warn(`Attempted to remove item with invalid index: ${index}`);
}
function updateCartDisplay() {
    const cartContainer = document.querySelector(SELECTORS.CART_ITEMS_CONTAINER);
    const totalAmountElement = document.querySelector(SELECTORS.CART_TOTAL_AMOUNT);
    const checkoutButton = document.querySelector(SELECTORS.CART_CHECKOUT_BTN);

    // NUEVO: Selector para el ícono del carrito en el menú lateral del dashboard
    // Asumimos que el enlace al carrito tiene href="#carrito" y el ícono está dentro de él.
    const sidebarCartLink = document.querySelector('.sidebar-menu a[href="#carrito"]');
    let sidebarCartIconElement = null;
    if (sidebarCartLink) {
        sidebarCartIconElement = sidebarCartLink.querySelector('i, svg'); // Puede ser <i> o <img> o <svg>
    }

    if (!cartContainer || !totalAmountElement || !checkoutButton) {
        console.warn("Faltan elementos del DOM para actualizar la UI del carrito en el dashboard.");
        if (!cartContainer || !totalAmountElement || !checkoutButton) return;
    }
    
    const cart = getCart(); 

    if (cart.length === 0) {
        cartContainer.innerHTML = `<div class="empty-cart"><i class="fas fa-shopping-cart fa-3x text-gray-400"></i><p class="my-4 text-gray-600">Tu carrito está vacío.</p><a href="#" class="continue-shopping inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-150" data-target-section="menu"><i class="fas fa-arrow-left mr-2"></i>Ver Menú</a></div>`;
        totalAmountElement.textContent = '$0.00';
        checkoutButton.disabled = true;
        checkoutButton.classList.add('opacity-50', 'cursor-not-allowed');

        if (sidebarCartIconElement && sidebarCartIconElement.tagName.toLowerCase() !== 'svg') { // No modificar si es SVG por ahora
            sidebarCartIconElement.className = 'material-icons'; // O tu clase de ícono por defecto
            sidebarCartIconElement.textContent = 'ramen_dining'; // O el contenido del ícono por defecto
        }
    } else {
        let total = 0;
        cartContainer.innerHTML = cart.map((item, index) => {
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity, 10) || 0;
            const itemTotal = price * quantity;
            total += itemTotal;
            const itemName = item.name || 'Nombre no disponible';
            const itemImage = item.image || '/public/images/placeholder.png';
            const itemDescription = item.description || '';
            return `<div class="cart-item flex items-center border-b py-4" data-index="${index}"><img src="${itemImage}" alt="${itemName}" class="cart-item-img w-16 h-16 object-cover rounded mr-4" onerror="this.onerror=null; this.src='/public/images/placeholder.png';"><div class="cart-item-details flex-grow"><h3 class="cart-item-name font-semibold">${itemName}</h3>${itemDescription ? `<p class="cart-item-description text-sm text-gray-600">${itemDescription}</p>` : ''}<div class="cart-item-price text-sm text-gray-800">Subtotal: $${itemTotal.toFixed(2)}</div><div class="cart-item-quantity flex items-center mt-2"><button class="quantity-btn decrease bg-gray-200 px-2 py-1 rounded hover:bg-gray-300" title="Disminuir">-</button><span class="mx-3 font-medium">${quantity}</span><button class="quantity-btn increase bg-gray-200 px-2 py-1 rounded hover:bg-gray-300" title="Aumentar">+</button></div></div><button class="cart-item-remove text-red-500 hover:text-red-700 ml-4" title="Eliminar"><i class="fas fa-trash fa-lg"></i></button></div>`;
        }).join('');
        totalAmountElement.textContent = `$${total.toFixed(2)}`;
        checkoutButton.disabled = false;
        checkoutButton.classList.remove('opacity-50', 'cursor-not-allowed');

        if (sidebarCartIconElement && sidebarCartIconElement.tagName.toLowerCase() !== 'svg') {
             sidebarCartIconElement.className = 'material-icons'; // O tu clase de ícono para carrito lleno
             sidebarCartIconElement.textContent = 'shopping_cart'; // O el contenido del ícono para carrito lleno
        }
    }
}

// Checkout Module
function initializeCheckout() { console.log("Checkout section initialized/prepared."); }

function loadCheckoutSummary() {
    console.log("Loading checkout summary...");
    const orderItemsContainer = document.querySelector(SELECTORS.CHECKOUT_ORDER_ITEMS);
    const productSubtotalElement = document.querySelector(SELECTORS.CHECKOUT_PRODUCT_SUBTOTAL_AMOUNT); // Nuevo
    const shippingCostElement = document.querySelector(SELECTORS.CHECKOUT_SHIPPING_COST_AMOUNT); // Nuevo
    const shippingMsgElement = document.querySelector(SELECTORS.CHECKOUT_SHIPPING_MSG); // Nuevo
    const grandTotalElement = document.querySelector(SELECTORS.CHECKOUT_GRAND_TOTAL_AMOUNT); // Nuevo
    const confirmBtn = document.querySelector(SELECTORS.CHECKOUT_CONFIRM_BTN);

    if (!orderItemsContainer || !productSubtotalElement || !shippingCostElement || !shippingMsgElement || !grandTotalElement || !confirmBtn) {
        console.error("Faltan elementos del DOM para el resumen de checkout.");
        if(orderItemsContainer) orderItemsContainer.innerHTML = '<p class="text-red-500">Error al cargar el resumen del pedido.</p>';
        return;
    }
    
    const cart = getCart();
    if (cart.length === 0) {
        orderItemsContainer.innerHTML = '<p class="empty-cart-message text-center text-gray-600 my-4">Tu carrito está vacío. Añade productos desde el menú para continuar.</p>';
        productSubtotalElement.textContent = '$0.00';
        shippingCostElement.textContent = '$0.00';
        shippingMsgElement.style.display = 'none';
        grandTotalElement.textContent = '$0.00';
        confirmBtn.disabled = true;
        confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
        return;
    }

    let orderItemsHTML = '';
    let productSubtotal = 0;
    cart.forEach(item => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 0;
        const itemTotal = price * quantity;
        productSubtotal += itemTotal;
        const itemName = item.name || 'Nombre no disponible';
        const itemImage = item.image || '/public/images/placeholder.png';
        orderItemsHTML += `
            <div class="order-item flex justify-between items-center py-3 border-b">
                <div class="flex items-center">
                    <img src="${itemImage}" alt="${itemName}" class="w-12 h-12 object-cover rounded mr-3" onerror="this.onerror=null; this.src='/public/images/placeholder.png';">
                    <div class="item-details">
                        <h4 class="font-medium">${itemName}</h4>
                        <p class="text-sm text-gray-600">Cantidad: ${quantity}</p>
                    </div>
                </div>
                <span class="item-price font-medium">$${itemTotal.toFixed(2)}</span>
            </div>`;
    });

    orderItemsContainer.innerHTML = orderItemsHTML;
    productSubtotalElement.textContent = `$${productSubtotal.toFixed(2)}`;
    
    confirmBtn.disabled = false;
    confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    
    updateDashboardShippingInfoAndTotals(); // Llamar para calcular envío y total final
    loadUserShippingInfo();
}

function updateDashboardShippingInfoAndTotals() {
    const zoneSelect = document.querySelector(SELECTORS.DASHBOARD_ZONE_SELECT);
    const shippingCostElement = document.querySelector(SELECTORS.CHECKOUT_SHIPPING_COST_AMOUNT);
    const shippingMsgElement = document.querySelector(SELECTORS.CHECKOUT_SHIPPING_MSG);
    const productSubtotalElement = document.querySelector(SELECTORS.CHECKOUT_PRODUCT_SUBTOTAL_AMOUNT);
    const grandTotalElement = document.querySelector(SELECTORS.CHECKOUT_GRAND_TOTAL_AMOUNT);

    if (!zoneSelect || !shippingCostElement || !shippingMsgElement || !productSubtotalElement || !grandTotalElement) {
        console.error("Faltan elementos del DOM para actualizar costos de envío y totales en dashboard.");
        return;
    }

    const cart = getCart();
    let productSubtotal = 0;
    if (cart.length > 0) {
        productSubtotal = cart.reduce((sum, item) => {
            return sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 0);
        }, 0);
    }
    productSubtotalElement.textContent = `$${productSubtotal.toFixed(2)}`;

    const selectedOption = zoneSelect.options[zoneSelect.selectedIndex];
    const shippingCostText = selectedOption ? selectedOption.dataset.cost : undefined;
    const zoneValue = zoneSelect.value;
    let shippingCost = 0;

    if (zoneValue && shippingCostText !== undefined) {
        shippingCost = parseFloat(shippingCostText);
        if (zoneValue === 'otra') {
            shippingCostElement.textContent = '$?.??'; 
            shippingMsgElement.textContent = 'Costo de envío a confirmar.';
            shippingMsgElement.style.display = 'block';
            // No podemos calcular el total exacto, pero podemos mostrar el subtotal + un indicador
            grandTotalElement.textContent = `$${productSubtotal.toFixed(2)} + Envío`;
        } else if (shippingCost >= 0) {
            shippingCostElement.textContent = `$${shippingCost.toFixed(2)}`;
            shippingMsgElement.style.display = 'none';
            grandTotalElement.textContent = `$${(productSubtotal + shippingCost).toFixed(2)}`;
        } else { // Caso por defecto si data-cost no es un número válido
            shippingCostElement.textContent = '$0.00';
            shippingMsgElement.style.display = 'none';
            grandTotalElement.textContent = `$${productSubtotal.toFixed(2)}`;
        }
    } else { // Si no se selecciona zona o no tiene data-cost
        shippingCostElement.textContent = '$0.00';
        shippingMsgElement.textContent = 'Selecciona una zona para calcular el envío.';
        shippingMsgElement.style.display = 'block';
        grandTotalElement.textContent = `$${productSubtotal.toFixed(2)}`;
    }
}


function loadUserShippingInfo() {
    const shippingForm = document.querySelector(SELECTORS.SHIPPING_FORM);
    if (!shippingForm) return;
    const profile = dashboardState.userProfile;
    shippingForm.reset();
    shippingForm.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    if (profile) {
        shippingForm.nombre.value = profile.nombre || '';
        shippingForm.apellido.value = profile.apellidos || ''; // Asumiendo que tienes 'apellidos' en el perfil
        shippingForm.telefono.value = profile.telefono || '';
    } else console.warn("User profile data not available for pre-filling shipping info.");
}
function validateShippingForm() {
    const shippingForm = document.querySelector(SELECTORS.SHIPPING_FORM);
    if (!shippingForm) return false;
    let isValid = true;
    const requiredInputs = shippingForm.querySelectorAll('input[required], select[required], textarea[required]');
    shippingForm.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    requiredInputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            input.classList.add('error');
            console.warn(`Validation failed for input: ${input.name}`);
        }
    });
    if (!isValid) showNotification('Por favor completa todos los campos requeridos en Detalles de envío', 'error');
    return isValid;
}
async function confirmOrder() {
    console.log("Attempting to confirm order...");
    if (!validateShippingForm()) return;
    const shippingForm = document.querySelector(SELECTORS.SHIPPING_FORM);
    const cart = getCart();
    if (cart.length === 0) { showNotification("El carrito está vacío. No se puede confirmar el pedido.", "error"); return; }

    // Obtener costo de envío del select
    const zoneSelect = document.getElementById('dashboardZoneSelect');
    const selectedZoneOption = zoneSelect.options[zoneSelect.selectedIndex];
    let shippingCost = 0;
    if (selectedZoneOption && selectedZoneOption.dataset.cost && selectedZoneOption.value !== 'otra') {
        shippingCost = parseFloat(selectedZoneOption.dataset.cost);
    } else if (selectedZoneOption && selectedZoneOption.value === 'otra') {
        // Para 'otra', el costo se confirmará después. Aquí se podría poner un placeholder o 0.
        shippingCost = 0; // O un valor indicativo que luego se actualice.
    }


    let subtotal = 0;
    const processedItems = cart.map(item => {
        const itemPrice = parseFloat(item.price) || 0;
        const itemQuantity = parseInt(item.quantity, 10) || 0;
        const itemTotal = itemPrice * itemQuantity;
        subtotal += itemTotal;
        return { productId: item.id, quantity: itemQuantity, price: itemPrice, name: item.name, image: item.image };
    });
    const totalAmount = subtotal + shippingCost;


    const deliveryData = {
        tipo: 'envio',
        nombre: shippingForm.nombre.value.trim(),
        apellido: shippingForm.apellido.value.trim(),
        telefono: shippingForm.telefono.value.trim(),
        zona: shippingForm.zona.value,
        direccion: shippingForm.direccion.value.trim(),
        referencia: shippingForm.referencia.value.trim(),
        indicaciones: shippingForm.indicaciones.value.trim()
    };
    const orderPayload = {
        items: processedItems,
        deliveryDetails: deliveryData,
        paymentMethod: 'contra_entrega',
        shippingCost: shippingCost, // Añadir shippingCost
        totalAmount: totalAmount    // El totalAmount ahora incluye el envío
    };
    const confirmBtn = document.querySelector(SELECTORS.CHECKOUT_CONFIRM_BTN);
    if (!confirmBtn) return;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando...';
    const result = await makeApiCall(API_ENDPOINTS.ORDERS, 'POST', orderPayload);
    if (result && result.success) {
        const orderId = result.data?.orderId || '';
        showNotification(`¡Pedido registrado #${orderId} con éxito!`, 'success');
        saveCart([]);
        setTimeout(() => {
            const pedidosMenuItem = document.querySelector('.menu-item a[href="#pedidos"]')?.closest(SELECTORS.SIDEBAR_MENU_ITEMS);
            if (pedidosMenuItem) handleSectionChange('pedidos', pedidosMenuItem);
        }, 2500);
    } else {
        showNotification(`Error al crear pedido: ${result?.message || 'Error desconocido'}`, 'error');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Confirmar Pedido';
    }
}

// Orders Module
async function loadOrders() {
    console.log("Loading user order history...");
    const ordersListContainer = document.querySelector(SELECTORS.ORDERS_LIST_CONTAINER);
    if (!ordersListContainer) {
        console.error("Orders list container not found in dashboard.");
        return;
    }
    ordersListContainer.innerHTML = '<p class="text-center my-4">Cargando tus pedidos... <i class="fas fa-spinner fa-spin ml-2"></i></p>';
    const result = await makeApiCall(API_ENDPOINTS.ORDERS, 'GET'); // Esta ruta ya está autenticada
    if (result && result.success && Array.isArray(result.data)) {
        dashboardState.userOrders = result.data; // Guardar los pedidos en el estado
        displayOrders(result.data);
        console.log(`${result.data.length} orders loaded for user.`);
    } else {
        ordersListContainer.innerHTML = `<p class="text-center text-red-500 my-4">Error al cargar pedidos: ${result?.message || 'No se pudieron obtener los datos.'}</p>`;
        if (result?.status === 401) logout();
    }
}

function displayOrders(ordersToDisplay) {
    const ordersListContainer = document.querySelector(SELECTORS.ORDERS_LIST_CONTAINER);
    if (!ordersListContainer) return;

    if (!Array.isArray(ordersToDisplay) || ordersToDisplay.length === 0) {
        ordersListContainer.innerHTML = '<p class="text-center text-gray-600 my-4">No has realizado ningún pedido todavía.</p>';
        return;
    }
    // No es necesario ordenar aquí si el backend ya los devuelve ordenados
    // ordersToDisplay.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    ordersListContainer.innerHTML = ordersToDisplay.map(order => renderOrderCard(order)).join('');
}

function renderOrderCard(order) {
    let orderDateFormatted = 'Fecha inválida';
    try {
        const date = new Date(order.createdAt || order.date); // 'createdAt' es más común
        if (!isNaN(date.getTime())) {
            orderDateFormatted = date.toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    } catch (e) { console.warn("Error al formatear fecha del pedido:", e); }

    const { statusClass, statusText, statusIcon } = getOrderStatusInfo(order.status);
    const totalItems = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    const itemsHTML = order.items.map(item => `
        <div class="order-item flex justify-between items-center py-2 border-t first:border-t-0">
             <div class="flex items-center">
                 <img src="${item.image || '/public/images/placeholder.png'}" alt="${item.name || 'Producto'}" class="w-12 h-12 object-cover rounded mr-3" onerror="this.onerror=null; this.src='/public/images/placeholder.png';">
                 <div class="item-details">
                     <h4 class="text-sm font-medium">${item.name || 'Producto Desconocido'}</h4>
                     <p class="text-xs text-gray-600">Cantidad: ${item.quantity || 0}</p>
                 </div>
             </div>
             <span class="item-price text-sm font-medium">$${((parseFloat(item.price) || 0) * (item.quantity || 0)).toFixed(2)}</span>
        </div>
    `).join('');

    return `
        <div class="order-card bg-white shadow rounded-lg mb-4 overflow-hidden" data-order-id="${order.orderId || order._id}" data-status="${order.status?.toLowerCase() || 'pending'}">
            <div class="order-header p-4 flex justify-between items-center cursor-pointer">
                <div class="order-info">
                    <h3 class="font-semibold text-lg text-gray-800">Pedido #${order.orderId || order._id}</h3>
                    <span class="order-date text-sm text-gray-500">${orderDateFormatted}</span>
                    <p class="text-sm text-gray-600 mt-1">${totalItems} producto(s)</p>
                </div>
                <div class="order-status-container flex flex-col items-end ml-2">
                     <span class="status-badge text-xs font-semibold px-3 py-1.5 rounded-full ${statusClass} flex items-center">
                        <i class="fas ${statusIcon} mr-1.5"></i>
                        ${statusText}
                     </span>
                     <div class="order-total mt-1.5">
                        <span class="text-lg font-bold text-gray-800">$${(parseFloat(order.totalAmount) || 0).toFixed(2)}</span>
                    </div>
                </div>
                 <button class="details-btn-icon text-gray-500 hover:text-gray-700 ml-2 p-1">
                     <i class="fas fa-chevron-down transition-transform duration-300"></i>
                 </button>
            </div>
             <div class="order-details p-4 border-t bg-gray-50" style="display: none;">
                <h4 class="font-semibold mb-2 text-gray-700">Detalles del Pedido:</h4>
                ${itemsHTML}
                ${order.deliveryDetails ? `
                <div class="delivery-info mt-3 pt-3 border-t">
                    <h5 class="font-semibold text-sm text-gray-700 mb-1">Detalles de Entrega:</h5>
                    <p class="text-xs text-gray-600"><strong>Nombre:</strong> ${order.deliveryDetails.nombre || 'N/A'}</p>
                    <p class="text-xs text-gray-600"><strong>Teléfono:</strong> ${order.deliveryDetails.telefono || 'N/A'}</p>
                    <p class="text-xs text-gray-600"><strong>Dirección:</strong> ${order.deliveryDetails.direccion || 'N/A'}</p>
                    <p class="text-xs text-gray-600"><strong>Zona:</strong> ${order.deliveryDetails.zona || 'N/A'}</p>
                    ${order.deliveryDetails.referencia ? `<p class="text-xs text-gray-600"><strong>Referencia:</strong> ${order.deliveryDetails.referencia}</p>` : ''}
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

function getOrderStatusInfo(status) {
    const lowerStatus = status?.toLowerCase() || 'pending';
    let statusClass = 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    let statusText = 'Pendiente';
    let statusIcon = 'fa-hourglass-start';
    switch (lowerStatus) {
        case 'processing': case 'en proceso': case 'en preparacion':
            statusClass = 'bg-blue-100 text-blue-800 border border-blue-300'; statusText = 'En Preparación'; statusIcon = 'fa-sync-alt fa-spin'; break;
        case 'shipped': case 'en camino':
            statusClass = 'bg-purple-100 text-purple-800 border border-purple-300'; statusText = 'En Camino'; statusIcon = 'fa-shipping-fast'; break;
        case 'completed': case 'delivered': case 'entregado':
            statusClass = 'bg-green-100 text-green-800 border border-green-300'; statusText = 'Entregado'; statusIcon = 'fa-check-circle'; break;
        case 'cancelled': case 'cancelado':
            statusClass = 'bg-red-100 text-red-800 border border-red-300'; statusText = 'Cancelado'; statusIcon = 'fa-times-circle'; break;
        default:
            statusClass = 'bg-gray-100 text-gray-800 border border-gray-300'; statusText = status || 'Desconocido'; statusIcon = 'fa-question-circle'; break;
    }
    return { statusClass, statusText, statusIcon };
}

function toggleOrderDetails(orderCardElement) { // Recibe el elemento de la tarjeta de pedido
    if (!orderCardElement) return;
    const detailsContainer = orderCardElement.querySelector('.order-details');
    const icon = orderCardElement.querySelector('.details-btn-icon i');
    if (!detailsContainer || !icon) return;
    const isExpanded = detailsContainer.style.display !== 'none';
    detailsContainer.style.display = isExpanded ? 'none' : 'block';
    icon.classList.toggle('rotate-180', !isExpanded);
}

function handleOrderFilterClick(event) {
    const filterValue = event.target.dataset.filter;
    document.querySelectorAll(SELECTORS.ORDERS_FILTERS_BUTTONS).forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    filterAndSearchOrders(filterValue, document.querySelector(SELECTORS.ORDERS_SEARCH_INPUT).value);
}

function handleOrderSearch(event) {
    const searchValue = event.target.value.toLowerCase();
    const activeFilter = document.querySelector(SELECTORS.ORDERS_FILTERS_BUTTONS + '.active')?.dataset.filter || 'all';
    filterAndSearchOrders(activeFilter, searchValue);
}

function filterAndSearchOrders(statusFilter, searchTerm) {
    const filteredOrders = dashboardState.userOrders.filter(order => {
        const matchesStatus = statusFilter === 'all' || (order.status && order.status.toLowerCase() === statusFilter);
        const matchesSearch = !searchTerm || (order.orderId && order.orderId.toLowerCase().includes(searchTerm)) ||
                              (order.items.some(item => item.name && item.name.toLowerCase().includes(searchTerm)));
        return matchesStatus && matchesSearch;
    });
    displayOrders(filteredOrders);
}


// Menu Module (Dashboard Version)
async function loadDashboardMenu() {
    console.log("Loading dashboard menu...");
    const menuContainer = document.querySelector(SELECTORS.MENU_ITEMS_CONTAINER);
    if (!menuContainer) { console.error("Dashboard menu container not found."); return; }
    menuContainer.innerHTML = '<p class="text-center my-4">Cargando menú... <i class="fas fa-spinner fa-spin ml-2"></i></p>';
    if (dashboardState.dashboardProducts && dashboardState.dashboardProducts.length > 0) {
        console.log("Using cached menu products for dashboard.");
        displayDashboardMenuItems(dashboardState.dashboardProducts);
        return;
    }
    const result = await makeApiCall(API_ENDPOINTS.PRODUCTS, 'GET');
    if (result && result.success && Array.isArray(result.data)) {
        dashboardState.dashboardProducts = result.data;
        console.log("Products loaded and cached for dashboard:", result.data.length);
        displayDashboardMenuItems(result.data);
    } else {
        console.error("Failed to load menu for dashboard:", result?.message);
        menuContainer.innerHTML = `<p class="text-center text-red-500 my-4">Error al cargar el menú: ${result?.message || 'No se pudieron obtener los productos.'}</p>`;
    }
}
function displayDashboardMenuItems(products) {
    const menuContainer = document.querySelector(SELECTORS.MENU_ITEMS_CONTAINER);
    if (!menuContainer) return;
    if (!products || products.length === 0) {
        menuContainer.innerHTML = '<p class="text-center text-gray-600 my-4">No hay productos disponibles en el menú en este momento.</p>';
        return;
    }
    menuContainer.innerHTML = products.map(item => renderMenuItemCard(item)).join('');
}
function renderMenuItemCard(item) {
    const productId = item._id || item.id;
    const productName = item.name || 'Nombre no disponible';
    const productPrice = parseFloat(item.price) || 0;
    const productImage = item.imageUrl || item.image || '/public/images/placeholder.png';
    const productDescription = item.description || 'Descripción no disponible.';
    const productInfo = JSON.stringify({ id: productId, name: productName, price: productPrice, image: productImage, description: item.description });
    return `<div class="menu-item-card bg-white shadow rounded-lg overflow-hidden flex flex-col"><img src="${productImage}" alt="${productName}" class="menu-item-image w-full h-48 object-cover" onerror="this.onerror=null; this.src='/public/images/placeholder.png';"><div class="menu-item-content p-4 flex flex-col flex-grow"><div class="menu-item-header flex justify-between items-start mb-2"><h3 class="menu-item-name font-semibold text-lg flex-grow mr-2">${productName}</h3><span class="menu-item-price font-bold text-lg text-green-600 whitespace-nowrap">$${productPrice.toFixed(2)}</span></div><p class="menu-item-description text-sm text-gray-600 mb-4 flex-grow">${productDescription}</p><button class="add-to-cart-btn mt-auto w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition duration-150 flex items-center justify-center" data-product-info='${productInfo.replace(/'/g, "&apos;")}'> <i class="fas fa-cart-plus mr-2"></i>Reservar pedido</button></div></div>`;
}

// Puntos Module
function loadPuntosContent() {
    // Premios personalizados de la ruleta
    const premios = [
        { texto: "Rollo de sushi gratis 🍣", color: "#FFD700" },
        { texto: "10% de descuento 💸", color: "#FF6347" },
        { texto: "Bebida de cortesía 🥤", color: "#1E90FF" },
        { texto: "Postre sorpresa 🎂", color: "#8A2BE2" },
        { texto: "15% de descuento 💸", color: "#4CAF50" },
        { texto: "Sello extra en tu tarjeta 🔖", color: "#FF69B4" },
    ];

    // Elementos del DOM
    const tarjetasCount = document.getElementById('tarjetasCount');
    const girarBtn = document.getElementById('girarRuletaBtn');
    const ruletaCanvas = document.getElementById('ruletaCanvas');
    const premioResultado = document.getElementById('premioResultado');
    const historialPremios = document.getElementById('historialPremios');

    // Utilidades para localStorage
    function getTarjetas() {
        return parseInt(localStorage.getItem('tarjetasVirtuales') || '0', 10);
    }
    function setTarjetas(n) {
        localStorage.setItem('tarjetasVirtuales', n);
        tarjetasCount.textContent = n;
        girarBtn.disabled = n <= 0;
        girarBtn.classList.toggle('opacity-50', n <= 0);
    }
    function getHistorial() {
        try {
            return JSON.parse(localStorage.getItem('historialPremios') || '[]');
        } catch { return []; }
    }
    function addHistorial(premio) {
        const hist = getHistorial();
        hist.unshift({ premio, fecha: new Date().toLocaleString('es-ES') });
        localStorage.setItem('historialPremios', JSON.stringify(hist.slice(0, 10)));
        renderHistorial();
    }
    function renderHistorial() {
        const hist = getHistorial();
        historialPremios.innerHTML = hist.length === 0
            ? '<li>No has ganado premios aún.</li>'
            : hist.map(h => `<li><b>${h.premio}</b> <span style="color:#888;font-size:0.9em;">(${h.fecha})</span></li>`).join('');
    }

    // Dibuja la ruleta
    function drawRuleta(angle = 0) {
        const ctx = ruletaCanvas.getContext('2d');
        const size = ruletaCanvas.width;
        const radio = size / 2;
        ctx.clearRect(0, 0, size, size);
        const numPremios = premios.length;
        const arc = 2 * Math.PI / numPremios;
        for (let i = 0; i < numPremios; i++) {
            ctx.beginPath();
            ctx.moveTo(radio, radio);
            ctx.arc(radio, radio, radio - 5, angle + i * arc, angle + (i + 1) * arc);
            ctx.closePath();
            ctx.fillStyle = premios[i].color;
            ctx.fill();
            ctx.save();
            ctx.translate(radio, radio);
            ctx.rotate(angle + (i + 0.5) * arc);
            ctx.textAlign = "right";
            ctx.font = "bold 16px Noto Sans JP, Arial";
            ctx.fillStyle = "#fff";
            ctx.fillText(premios[i].texto, radio - 20, 8);
            ctx.restore();
        }
        // Flecha
        ctx.save();
        ctx.translate(radio, radio);
        ctx.beginPath();
        ctx.moveTo(0, -radio + 10);
        ctx.lineTo(15, -radio + 35);
        ctx.lineTo(-15, -radio + 35);
        ctx.closePath();
        ctx.fillStyle = "#222";
        ctx.fill();
        ctx.restore();
    }

    // Animación de giro
    let girando = false;
    function girarRuleta() {
        if (girando || getTarjetas() <= 0) return;
        girando = true;
        premioResultado.textContent = '';
        let angulo = 0;
        let velocidad = Math.random() * 0.2 + 0.35;
        let vueltas = Math.floor(Math.random() * 3) + 5;
        let totalGiros = vueltas * 2 * Math.PI + Math.random() * 2 * Math.PI;
        let start = null;
        function animar(ts) {
            if (!start) start = ts;
            let progreso = (ts - start) / 1200;
            let ease = 1 - Math.pow(1 - progreso, 3);
            angulo = ease * totalGiros;
            drawRuleta(angulo);
            if (progreso < 1) {
                requestAnimationFrame(animar);
            } else {
                // Determinar premio
                const numPremios = premios.length;
                const arc = 2 * Math.PI / numPremios;
                let anguloFinal = (angulo % (2 * Math.PI));
                let indice = numPremios - Math.floor((anguloFinal) / arc) - 1;
                if (indice < 0) indice += numPremios;
                const premio = premios[indice].texto;
                premioResultado.textContent = `¡Ganaste: ${premio}!`;
                addHistorial(premio);
                setTarjetas(getTarjetas() - 1);
                girando = false;
            }
        }
        requestAnimationFrame(animar);
    }

    // Inicializar
    setTarjetas(getTarjetas());
    renderHistorial();
    drawRuleta();

    girarBtn.onclick = girarRuleta;
}

function sumarTarjetaPorCompra() {
    let compras = parseInt(localStorage.getItem('comprasAcumuladas') || '0', 10) + 1;
    localStorage.setItem('comprasAcumuladas', compras);
    if (compras % 3 === 0) {
        let tarjetas = parseInt(localStorage.getItem('tarjetasVirtuales') || '0', 10) + 1;
        localStorage.setItem('tarjetasVirtuales', tarjetas);
        if (document.getElementById('tarjetasCount')) {
            document.getElementById('tarjetasCount').textContent = tarjetas;
        }
        alert('¡Felicidades! Has recibido una tarjeta virtual para girar la ruleta.');
    }
}

// --- 9. API Utility Functions ---
async function makeApiCall(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const config = { method: method.toUpperCase(), headers: headers };
    if (body && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH')) {
        config.body = JSON.stringify(body);
    }
    try {
        const response = await fetch(endpoint, config);
        const responseData = await response.json().catch(() => null);
        if (response.ok) return { success: true, data: responseData?.data || responseData, message: responseData?.message || null, status: response.status };
        else {
            let errorMessage = `Error ${response.status}: ${response.statusText}`;
            if (responseData && responseData.message) errorMessage = responseData.message;
            else if (response.status === 401) errorMessage = 'No autorizado o sesión expirada.';
            else if (response.status === 404) errorMessage = 'Recurso no encontrado.';
            console.error(`API Call Error (${method} ${endpoint}): Status ${response.status}, Message: ${errorMessage}`, responseData);
            return { success: false, data: null, message: errorMessage, status: response.status };
        }
    } catch (error) {
        console.error(`Network or Fetch Error (${method} ${endpoint}):`, error);
        let message = 'Error de red o conexión.';
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) message = 'No se pudo conectar al servidor. Verifica tu conexión o contacta al administrador.';
        return { success: false, data: null, message: message, status: null };
    }
}

// --- 10. Utility Functions ---
function saveUserPreference(key, value) {
    try {
        const preferences = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.PREFERENCES) || '{}');
        preferences[key] = value;
        localStorage.setItem(LOCAL_STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
    } catch (error) { console.error('Error saving user preference:', key, error); }
}
function getUserPreference(key) {
    try {
        const preferences = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.PREFERENCES) || '{}');
        return preferences.hasOwnProperty(key) ? preferences[key] : null;
    } catch (error) { console.error('Error getting user preference:', key, error); return null; }
}
function handleResize() {
    const sidebar = document.querySelector(SELECTORS.SIDEBAR);
    const mainContent = document.querySelector(SELECTORS.MAIN_CONTENT);
    if (!sidebar || !mainContent) return;
    if (window.innerWidth <= 768) { if (!dashboardState.isSidebarCollapsed) collapseSidebar(); }
    else {
        const sidebarCollapsedPref = getUserPreference('sidebarCollapsed');
        if (sidebarCollapsedPref && !dashboardState.isSidebarCollapsed) collapseSidebar();
        else if (!sidebarCollapsedPref && dashboardState.isSidebarCollapsed) expandSidebar();
    }
}

// --- 11. Global Event Listeners & Initial Load ---
window.addEventListener('resize', handleResize);
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed for dashboard.");
    if (checkAuthOnLoad()) initializeDashboard();
    else console.log("Dashboard initialization skipped due to failed auth check.");
});

async function girarRuletaUsuario() {
    const res = await fetch('/api/ruleta/girar', { method: 'POST', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
    const data = await res.json();
    if (data.success) {
        // Muestra el premio ganado
        alert('¡Ganaste: ' + data.premio.name + '!');
        cargarPremiosRuleta(); // Por si cambia la cantidad disponible
    } else {
        alert(data.message || 'No se pudo girar la ruleta');
    }
}

async function cargarPremiosRuleta() {
    // Obtiene los premios activos desde el backend
    const res = await fetch('/api/ruleta/premios');
    const data = await res.json();
    if (!data.success) {
        alert('No se pudieron cargar los premios de la ruleta');
        return;
    }
    const premios = data.premios; // [{name, description, type, imageUrl, probability, ...}]
    dibujarRuleta(premios);
}

function dibujarRuleta(premios) {
    // Ejemplo simple: cada premio es un segmento de la ruleta
    const canvas = document.getElementById('ruletaCanvas');
    const ctx = canvas.getContext('2d');
    const numPremios = premios.length;
    const arc = 2 * Math.PI / numPremios;
    const radio = canvas.width / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < numPremios; i++) {
        ctx.beginPath();
        ctx.moveTo(radio, radio);
        ctx.arc(radio, radio, radio - 5, i * arc, (i + 1) * arc);
        ctx.closePath();
        ctx.fillStyle = premios[i].color || `hsl(${i * 360 / numPremios}, 70%, 60%)`;
        ctx.fill();
        ctx.save();
        ctx.translate(radio, radio);
        ctx.rotate((i + 0.5) * arc);
        ctx.textAlign = "right";
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = "#fff";
        ctx.fillText(premios[i].name, radio - 20, 8);
        ctx.restore();
    }
    // Puedes agregar imágenes, íconos, etc. según tus necesidades
}

async function cargarHistorialUsuario() {
    const res = await fetch('/api/ruleta/historial', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
    const data = await res.json();
    // data.historial es un array de giros del usuario
    // Muestra en el historial del usuario
}

// Variables globales para la ubicación
let lastLocation = {
    coordinates: null
};

// Función para obtener la ubicación actual
function getCurrentLocation() {
    const addressInput = document.getElementById('direccionInput');
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