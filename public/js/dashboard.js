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
    ORDERS: '/api/orders',
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
    // Sidebar Menu
    SIDEBAR_MENU_ITEMS: '.sidebar-menu .menu-item',
    SIDEBAR_MENU_ITEM_ACTIVE: '.sidebar-menu .menu-item.active',
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
    CHECKOUT_SUBTOTAL: '#checkoutContent .subtotal .amount',
    CHECKOUT_TOTAL: '#checkoutContent .total .amount',
    CHECKOUT_CONFIRM_BTN: '#checkoutContent .confirm-order-btn',
    SHIPPING_FORM: '#shippingForm',
    // Orders
    ORDERS_LIST_CONTAINER: '#pedidosContent .orders-list',
    // Menu
    MENU_ITEMS_CONTAINER: '#menuContent .menu-items',
    MENU_ADD_TO_CART_BTN: '.add-to-cart-btn',
    // Notifications
    NOTIFICATION_CONTAINER: 'body', // Where notifications are appended
};

const DEFAULT_SECTION = 'menu';

// --- 2. State Management ---
const dashboardState = {
    currentSection: DEFAULT_SECTION,
    userProfile: null, // Store fetched user profile data
    dashboardProducts: [], // Cache for menu products
    isSidebarCollapsed: false,
    // Removed notifications and userPreferences as they were not fully utilized
    // Preferences are handled directly via utility functions
};

// --- 3. Authentication ---

/**
 * Immediately checks for an authentication token on script load.
 * Redirects to login if no token is found and not already on the login page.
 */
(function checkAuthImmediate() {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    const isLoginPage = window.location.pathname.endsWith('/login') || window.location.pathname.endsWith('/login.html');

    if (!token && !isLoginPage) {
        console.warn("AUTH CHECK (Immediate): No token, redirecting to login...");
        window.location.href = '/login'; // Redirect to the login route defined in server.js
    } else {
        console.log(`AUTH CHECK (Immediate): ${token ? 'Token found.' : 'No token, but on login page or similar.'}`);
    }
})();

/**
 * Performs a final authentication check after the DOM is loaded.
 * Prevents dashboard initialization if no token is present.
 * @returns {boolean} - True if authenticated (token exists), false otherwise.
 */
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

/**
 * Logs the user out by removing tokens and redirecting.
 */
function logout() {
    console.log("Logging out...");
    localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_INFO);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.PREFERENCES);
    // Optional: Clear cart on logout?
    // localStorage.removeItem(LOCAL_STORAGE_KEYS.CART);
    window.location.href = '/login'; // Always redirect to /login on logout
}

// --- 4. Initialization ---

/**
 * Initializes the dashboard components and loads initial data.
 */
async function initializeDashboard() {
    console.log("Initializing dashboard...");
    setupSidebar();
    setupCommonEventListeners(); // Setup listeners not tied to specific dynamic content first
    setupModalListeners();
    setupSectionSpecificListeners(); // Setup listeners tied to sections (like cart, orders)

    // Load user profile data early
    await fetchAndDisplayUserProfile();

    // Determine and load the initial section
    const lastSection = getUserPreference('lastSection') || DEFAULT_SECTION;
    const initialMenuItem = document.querySelector(`.menu-item a[href="#${lastSection}"]`)?.closest(SELECTORS.SIDEBAR_MENU_ITEMS);

    if (initialMenuItem) {
        await handleSectionChange(lastSection, initialMenuItem);
    } else {
        // Fallback to default if saved section is invalid
        const defaultMenuItem = document.querySelector(`.menu-item a[href="#${DEFAULT_SECTION}"]`)?.closest(SELECTORS.SIDEBAR_MENU_ITEMS);
        if (defaultMenuItem) {
            await handleSectionChange(DEFAULT_SECTION, defaultMenuItem);
        } else {
            console.error("Default sidebar menu item not found!");
            // Handle error appropriately, maybe show a default view or error message
        }
    }

    // Initial setup based on window size
    handleResize();
    console.log("Dashboard initialized.");
}

// --- 5. Event Listener Setup ---

/**
 * Sets up event listeners for globally available elements (sidebar toggle, logout, etc.).
 */
function setupCommonEventListeners() {
    const sidebarToggle = document.getElementById('sidebarToggle'); // Using ID directly
    const logoutBtn = document.querySelector(SELECTORS.LOGOUT_BTN);
    const notificationBadge = document.querySelector(SELECTORS.NOTIFICATION_BADGE);

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    } else {
        console.warn("Sidebar toggle button not found.");
    }

    if (logoutBtn) {
        logoutBtn.onclick = null; // Clear potential inline listener
        logoutBtn.addEventListener('click', logout);
    } else {
        console.warn("Logout button not found.");
    }

    if (notificationBadge) {
        notificationBadge.addEventListener('click', showNotificationsPanel);
    }

    // Sidebar menu item clicks (delegation could be an alternative)
    document.querySelectorAll(SELECTORS.SIDEBAR_MENU_ITEMS).forEach(item => {
        item.addEventListener('click', handleSidebarMenuClick);
    });

    // Close sidebar on clicking outside on mobile
    document.addEventListener('click', handleOutsideSidebarClick);
}

/**
 * Sets up event listeners for elements within specific dashboard sections
 * using event delegation where possible.
 */
function setupSectionSpecificListeners() {
    // Cart Actions (Delegation)
    const cartContainer = document.querySelector(SELECTORS.CART_CONTENT);
    if (cartContainer) {
        cartContainer.addEventListener('click', handleCartActions);
    }

    // Checkout Actions
    const checkoutContainer = document.querySelector(SELECTORS.CHECKOUT_CONTENT);
    if (checkoutContainer) {
        checkoutContainer.addEventListener('click', handleCheckoutActions);
        const shippingForm = checkoutContainer.querySelector(SELECTORS.SHIPPING_FORM);
        if (shippingForm) {
            // Could add input validation listeners here if needed
        }
    }

    // Order Actions (Delegation)
    const ordersContainer = document.querySelector(SELECTORS.ORDERS_CONTENT);
    if (ordersContainer) {
        ordersContainer.addEventListener('click', handleOrderActions);
    }

    // Menu Actions (Delegation)
    const menuContainer = document.querySelector(SELECTORS.MENU_CONTENT);
    if (menuContainer) {
        menuContainer.addEventListener('click', handleMenuActions);
    }

    // Profile Actions (Buttons are static within the profile section)
    const profileContainer = document.querySelector(SELECTORS.PROFILE_CONTENT);
    if (profileContainer) {
        const editProfileBtn = profileContainer.querySelector(SELECTORS.EDIT_PROFILE_BTN);
        const changePasswordBtn = profileContainer.querySelector(SELECTORS.CHANGE_PASSWORD_BTN);
        editProfileBtn?.addEventListener('click', () => openModal(SELECTORS.EDIT_MODAL, populateEditProfileForm));
        changePasswordBtn?.addEventListener('click', () => openModal(SELECTORS.PASSWORD_MODAL));
    }
}

/**
 * Sets up event listeners for modal interactions (open, close, submit).
 */
function setupModalListeners() {
    // Close buttons within modals
    document.querySelectorAll(SELECTORS.MODAL_CLOSE_BTN).forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.closest('.modal')));
    });

    // Close modal on clicking the background overlay
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target);
        }
    });

    // Form submissions
    const editProfileForm = document.querySelector(SELECTORS.EDIT_PROFILE_FORM);
    const changePasswordForm = document.querySelector(SELECTORS.CHANGE_PASSWORD_FORM);

    editProfileForm?.addEventListener('submit', handleEditProfileSubmit);
    changePasswordForm?.addEventListener('submit', handleChangePasswordSubmit);
}

// --- Event Handlers (Delegated & Direct) ---

function handleSidebarMenuClick(event) {
    event.preventDefault();
    const menuItem = event.currentTarget; // The <li> element
    const link = menuItem.querySelector('a');
    if (!link) return;
    const sectionId = link.getAttribute('href')?.substring(1);
    if (sectionId) {
        handleSectionChange(sectionId, menuItem);
    }
}

function handleOutsideSidebarClick(event) {
    const sidebar = document.querySelector(SELECTORS.SIDEBAR);
    if (!sidebar || dashboardState.isSidebarCollapsed) return;

    // Check if on mobile and click is outside sidebar and toggle button
    if (window.innerWidth <= 768 &&
        !event.target.closest(SELECTORS.SIDEBAR) &&
        !event.target.closest(SELECTORS.SIDEBAR_TOGGLE)) {
        collapseSidebar();
    }
}

function handleCartActions(event) {
    const target = event.target;
    const cartItemDiv = target.closest('.cart-item');
    const continueShoppingBtn = target.closest(SELECTORS.EMPTY_CART_CONTINUE_BTN);
    const checkoutBtn = target.closest(SELECTORS.CART_CHECKOUT_BTN);

    // Quantity/Remove buttons within a cart item
    if (cartItemDiv) {
        const index = parseInt(cartItemDiv.dataset.index, 10);
        if (isNaN(index)) return;

        if (target.matches('.quantity-btn.increase') || target.closest('.quantity-btn.increase')) {
            updateCartQuantity(index, 1);
        } else if (target.matches('.quantity-btn.decrease') || target.closest('.quantity-btn.decrease')) {
            updateCartQuantity(index, -1);
        } else if (target.matches('.cart-item-remove') || target.closest('.cart-item-remove')) {
            removeFromCart(index);
        }
    }
    // "Continue Shopping" button in empty cart
    else if (continueShoppingBtn) {
        event.preventDefault();
        const targetSection = continueShoppingBtn.dataset.targetSection || 'menu';
        const menuItem = document.querySelector(`.menu-item a[href="#${targetSection}"]`)?.closest(SELECTORS.SIDEBAR_MENU_ITEMS);
        if (menuItem) handleSectionChange(targetSection, menuItem);
    }
    // "Proceed to Checkout" button
    else if (checkoutBtn) {
        const checkoutMenuItem = document.querySelector('.menu-item a[href="#checkout"]')?.closest(SELECTORS.SIDEBAR_MENU_ITEMS);
        if (checkoutMenuItem) {
            handleSectionChange('checkout', checkoutMenuItem);
        } else {
            console.error("Checkout menu item not found.");
        }
    }
}

function handleCheckoutActions(event) {
    const target = event.target;
    const confirmBtn = target.closest(SELECTORS.CHECKOUT_CONFIRM_BTN);

    if (confirmBtn) {
        confirmOrder();
    }
    // Add handlers for other checkout interactions if needed (e.g., payment method selection)
}

function handleOrderActions(event) {
    const target = event.target;
    const detailsBtn = target.closest('.details-btn');

    if (detailsBtn) {
        toggleOrderDetails(detailsBtn);
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
            const productInfo = JSON.parse(productInfoString);
            addToCart(productInfo); // Call the existing addToCart function
        } catch (error) {
            console.error("Error processing add to cart click:", error);
            showNotification("Error al agregar el producto al carrito.", "error");
        }
    }
}


// --- 6. UI Component Handlers ---

// Sidebar
function setupSidebar() {
    // Initial state based on preferences and screen size is handled in initializeDashboard and handleResize
    console.log("Sidebar setup initiated.");
}

function toggleSidebar() {
    const sidebar = document.querySelector(SELECTORS.SIDEBAR);
    const mainContent = document.querySelector(SELECTORS.MAIN_CONTENT);
    if (!sidebar || !mainContent) return;

    const shouldCollapse = !sidebar.classList.contains('collapsed');
    if (shouldCollapse) {
        collapseSidebar();
    } else {
        expandSidebar();
    }
    // Save preference only on desktop
    if (window.innerWidth > 768) {
        saveUserPreference('sidebarCollapsed', shouldCollapse);
    }
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

// Modals
function openModal(selectorOrElement, onOpenCallback) {
    const modalElement = typeof selectorOrElement === 'string' ? document.querySelector(selectorOrElement) : selectorOrElement;
    if (modalElement) {
        modalElement.style.display = 'flex'; // Or 'block' depending on CSS
        console.log(`Modal opened: ${modalElement.id}`);
        if (typeof onOpenCallback === 'function') {
            try {
                onOpenCallback();
            } catch (error) {
                console.error(`Error in modal open callback for ${modalElement.id}:`, error);
            }
        }
    } else {
        console.warn(`Modal element not found: ${selectorOrElement}`);
    }
}

function closeModal(selectorOrElement) {
    const modalElement = typeof selectorOrElement === 'string' ? document.querySelector(selectorOrElement) : selectorOrElement;
    if (modalElement) {
        modalElement.style.display = 'none';
        console.log(`Modal closed: ${modalElement.id}`);
        // Optional: Reset forms within the modal when closed
        const forms = modalElement.querySelectorAll('form');
        forms.forEach(form => form.reset());
        // Optional: Clear validation errors
        modalElement.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    }
}

// Notifications
function showNotification(message, type = 'success', duration = 3500) {
    const container = document.querySelector(SELECTORS.NOTIFICATION_CONTAINER) || document.body; // Fallback to body
    const notification = document.createElement('div');
    notification.className = `notification ${type}`; // Ensure CSS exists for .notification and .success/.error/.warning etc.
    const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'; // Simple icon logic
    notification.innerHTML = `
        <i class="fas ${iconClass}"></i>
        <span>${message}</span>
    `;
    container.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
        notification.classList.add('show'); // Ensure CSS transition/animation targets .notification.show
    });

    // Animate out and remove
    setTimeout(() => {
        notification.classList.remove('show');
        // Remove the element after the transition/animation finishes
        notification.addEventListener('transitionend', () => notification.remove());
        // Fallback removal if transitionend doesn't fire (e.g., no transition defined)
        setTimeout(() => notification.remove(), 500); // 500ms should be enough for typical transitions
    }, duration);
}

function showNotificationsPanel() {
    console.warn('PENDING FEATURE: Show notifications panel');
    showNotification('Panel de notificaciones aún no implementado.', 'warning');
}

// --- 7. Section Management & Content Loading ---

/**
 * Handles switching between dashboard sections.
 * Updates UI (active menu item, title, visible section) and loads section-specific content.
 * @param {string} sectionId - The ID of the section to switch to (e.g., 'perfil', 'pedidos').
 * @param {HTMLElement} menuItem - The clicked sidebar menu item (<li> element).
 */
async function handleSectionChange(sectionId, menuItem) {
    if (!sectionId || !menuItem) {
        console.error("Invalid sectionId or menuItem provided to handleSectionChange.");
        return;
    }
    console.log(`Changing to section: ${sectionId}`);
    dashboardState.currentSection = sectionId;

    // Update active menu item
    document.querySelectorAll(SELECTORS.SIDEBAR_MENU_ITEMS).forEach(item => item.classList.remove('active'));
    menuItem.classList.add('active');

    // Update page title
    const pageTitleElement = document.getElementById('pageTitle'); // Use ID directly
    const linkText = menuItem.querySelector('a span')?.textContent;
    if (pageTitleElement && linkText) {
        pageTitleElement.textContent = linkText;
    }

    // Hide all sections, then show the target one
    document.querySelectorAll(SELECTORS.DASHBOARD_SECTIONS).forEach(section => {
        section.classList.remove('active');
    });
    const targetSection = document.getElementById(`${sectionId}Content`); // Convention: sectionId + 'Content'
    if (targetSection) {
        targetSection.classList.add('active');
        // Load dynamic content for the section
        await loadSectionContent(sectionId);
    } else {
        console.warn(`Section content element with ID '${sectionId}Content' not found.`);
        // Fallback: Show default section or an error message
        const defaultSectionContent = document.querySelector(SELECTORS.PROFILE_CONTENT);
        const defaultMenuItem = document.querySelector(`.menu-item a[href="#${DEFAULT_SECTION}"]`)?.closest(SELECTORS.SIDEBAR_MENU_ITEMS);
        if (defaultSectionContent && defaultMenuItem) {
            defaultSectionContent.classList.add('active');
            if (pageTitleElement) pageTitleElement.textContent = "Mi Perfil";
            defaultMenuItem.classList.add('active');
            dashboardState.currentSection = DEFAULT_SECTION;
            await loadSectionContent(DEFAULT_SECTION); // Load default content
        }
    }

    saveUserPreference('lastSection', sectionId);

    // Close sidebar on mobile after section change
    if (window.innerWidth <= 768 && !dashboardState.isSidebarCollapsed) {
        collapseSidebar();
    }
}

/**
 * Loads dynamic data or performs setup tasks specific to a section.
 * @param {string} sectionId - The ID of the section being loaded.
 */
async function loadSectionContent(sectionId) {
    console.log(`Loading dynamic content for section: ${sectionId}`);
    switch (sectionId) {
        case 'perfil':
            // Profile data is usually loaded initially, but could be refreshed here if needed.
            // await fetchAndDisplayUserProfile(); // Uncomment to refresh on each visit
            break;
        case 'pedidos':
            await loadOrders();
            break;
        case 'carrito':
            updateCartDisplay(); // Cart is based on localStorage, just update display
            break;
        case 'checkout':
            initializeCheckout(); // Prepare checkout logic
            loadCheckoutSummary(); // Load cart summary and user info into checkout form
            break;
        case 'menu':
            await loadDashboardMenu();
            break;
        // Add cases for other sections (e.g., 'favoritos', 'direcciones')
        default:
            console.log(`No specific content loading defined for section: ${sectionId}`);
    }
}

// --- 8. Feature Modules ---

// Profile Module
async function fetchAndDisplayUserProfile() {
    console.log("Fetching user profile...");
    const profileData = await makeApiCall(API_ENDPOINTS.PROFILE, 'GET');

    if (profileData && profileData.success) {
        dashboardState.userProfile = profileData.data; // Store profile data
        updateProfileDOM(profileData.data);
        console.log("User profile loaded and displayed.");
    } else {
        // Error handled within makeApiCall, but maybe show a specific message in the profile area
        displayProfileError(profileData?.message || 'No se pudo cargar el perfil.');
        if (profileData?.status === 401) {
            logout(); // Logout on authorization failure
        }
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
                    // Ensure the date is interpreted correctly (might need timezone adjustment depending on backend)
                    // Using UTC methods can help avoid local timezone issues if the date string is ISO 8601
                    const utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
                    fechaNacimientoEl.textContent = utcDate.toLocaleDateString('es-ES', {
                        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' // Specify timezone if needed
                    });
                } else {
                    fechaNacimientoEl.textContent = 'Fecha inválida';
                }
            } catch (e) {
                console.error("Error formatting date:", e);
                fechaNacimientoEl.textContent = 'Fecha inválida';
            }
        } else {
            fechaNacimientoEl.textContent = 'No disponible';
        }
    }
}

function displayProfileError(message) {
    const selectors = [
        SELECTORS.USER_NAME_HEADER, SELECTORS.USER_NOMBRES, SELECTORS.USER_APELLIDOS,
        SELECTORS.USER_EMAIL, SELECTORS.USER_TELEFONO, SELECTORS.USER_FECHA_NACIMIENTO
    ];
    selectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = (selector === SELECTORS.USER_NAME_HEADER) ? 'Error' : message;
        }
    });
}

function populateEditProfileForm() {
    const profile = dashboardState.userProfile;
    if (!profile) {
        console.warn("Cannot populate edit form: User profile data not available.");
        // Optionally fetch profile again or show an error
        return;
    }
    const form = document.querySelector(SELECTORS.EDIT_PROFILE_FORM);
    if (!form) return;

    form.nombres.value = profile.nombre || '';
    form.apellidos.value = profile.apellidos || '';
    form.telefono.value = profile.telefono || '';

    // Format date for input type="date" (YYYY-MM-DD)
    if (profile.fechaNacimiento) {
        try {
            const date = new Date(profile.fechaNacimiento);
             if (!isNaN(date.getTime())) {
                // Ensure correct formatting YYYY-MM-DD
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
                const day = date.getDate().toString().padStart(2, '0');
                form.fechaNacimiento.value = `${year}-${month}-${day}`;
            } else {
                 form.fechaNacimiento.value = '';
            }
        } catch (e) {
            console.error("Error formatting date for input:", e);
            form.fechaNacimiento.value = '';
        }
    } else {
        form.fechaNacimiento.value = '';
    }
}

async function handleEditProfileSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const updatedData = {
        nombre: form.nombres.value.trim(),
        apellidos: form.apellidos.value.trim(),
        telefono: form.telefono.value.trim(),
        fechaNacimiento: form.fechaNacimiento.value // Ensure backend expects YYYY-MM-DD
    };

    // Add validation if needed

    const result = await makeApiCall(API_ENDPOINTS.PROFILE, 'PUT', updatedData);

    if (result && result.success) {
        showNotification("Perfil actualizado con éxito", "success");
        closeModal(SELECTORS.EDIT_MODAL);
        await fetchAndDisplayUserProfile(); // Refresh profile data
    } else {
        showNotification(`Error al actualizar: ${result?.message || 'Error desconocido'}`, "error");
    }
}

async function handleChangePasswordSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const currentPassword = form.currentPassword.value;
    const newPassword = form.newPassword.value;
    const confirmNewPassword = form.confirmNewPassword.value;

    // Basic Validation
    if (!currentPassword || !newPassword || !confirmNewPassword) {
         showNotification("Por favor, completa todos los campos.", "error");
         return;
    }
    if (newPassword !== confirmNewPassword) {
        showNotification("Las nuevas contraseñas no coinciden", "error");
        return;
    }
    if (newPassword.length < 6) { // Example validation
        showNotification("La nueva contraseña debe tener al menos 6 caracteres", "error");
        return;
    }

    const result = await makeApiCall(API_ENDPOINTS.CHANGE_PASSWORD, 'POST', { currentPassword, newPassword });

    if (result && result.success) {
        showNotification("Contraseña cambiada con éxito", "success");
        closeModal(SELECTORS.PASSWORD_MODAL); // Form is reset by closeModal
    } else {
        showNotification(`Error al cambiar contraseña: ${result?.message || 'Error desconocido'}`, "error");
    }
}

// Cart Module
function getCart() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CART) || '[]');
    } catch (error) {
        console.error("Error parsing cart from localStorage:", error);
        return []; // Return empty cart on error
    }
}

function saveCart(cart) {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch (error) {
        console.error("Error saving cart to localStorage:", error);
        showNotification("Error al guardar el carrito.", "error");
    }
}

function addToCart(itemData) {
    console.log("Adding to cart:", itemData);
    if (!itemData || !itemData.id) {
        console.error("Invalid item data provided to addToCart:", itemData);
        showNotification("No se pudo agregar el producto (datos inválidos).", "error");
        return;
    }

    let cart = getCart();
    const existingItemIndex = cart.findIndex(i => i.id === itemData.id);

    if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity = (parseInt(cart[existingItemIndex].quantity, 10) || 0) + 1;
    } else {
        // Add only necessary info + quantity: 1
        cart.push({
            id: itemData.id, // Use the provided ID (_id from MongoDB)
            name: itemData.name || 'Producto sin nombre',
            price: parseFloat(itemData.price) || 0,
            image: itemData.image || '/public/images/placeholder.png', // Default image
            description: itemData.description, // Optional
            quantity: 1
        });
    }

    saveCart(cart);
    showNotification(`${itemData.name || 'Producto'} agregado al carrito`, 'success');

    // Update displays if relevant sections are active
    if (dashboardState.currentSection === 'carrito') updateCartDisplay();
    if (dashboardState.currentSection === 'checkout') loadCheckoutSummary();
    // updateGlobalCartCounter(); // If you have a global counter
}

function updateCartQuantity(index, change) {
    let cart = getCart();
    if (cart[index]) {
        const currentQuantity = parseInt(cart[index].quantity, 10) || 0;
        const newQuantity = currentQuantity + change;

        if (newQuantity < 1) {
            // Remove item if quantity drops below 1
            cart.splice(index, 1);
            showNotification("Producto eliminado del carrito", "info");
        } else {
            cart[index].quantity = newQuantity;
        }

        saveCart(cart);
        // Update displays
        if (dashboardState.currentSection === 'carrito') updateCartDisplay();
        if (dashboardState.currentSection === 'checkout') loadCheckoutSummary();
        // updateGlobalCartCounter();
    } else {
        console.warn(`Attempted to update quantity for invalid index: ${index}`);
    }
}

function removeFromCart(index) {
    let cart = getCart();
    if (cart[index]) {
        const removedItemName = cart[index].name || 'Producto';
        cart.splice(index, 1);
        saveCart(cart);
        showNotification(`${removedItemName} eliminado del carrito`, "info");
        // Update displays
        if (dashboardState.currentSection === 'carrito') updateCartDisplay();
        if (dashboardState.currentSection === 'checkout') loadCheckoutSummary();
        // updateGlobalCartCounter();
    } else {
        console.warn(`Attempted to remove item with invalid index: ${index}`);
    }
}

function updateCartDisplay() {
    const cartContainer = document.querySelector(SELECTORS.CART_ITEMS_CONTAINER);
    const totalAmountElement = document.querySelector(SELECTORS.CART_TOTAL_AMOUNT);
    const checkoutButton = document.querySelector(SELECTORS.CART_CHECKOUT_BTN); // Get checkout button

    if (!cartContainer || !totalAmountElement || !checkoutButton) {
        // Don't log error if elements are simply not present (e.g., wrong section active)
        // console.warn("Cart display elements not found.");
        return;
    }

    const cart = getCart();

    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart fa-3x text-gray-400"></i>
                <p class="my-4 text-gray-600">Tu carrito está vacío.</p>
                <a href="#" class="continue-shopping inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-150" data-target-section="menu">
                    <i class="fas fa-arrow-left mr-2"></i>
                    Ver Menú
                </a>
            </div>
        `;
        totalAmountElement.textContent = '$0.00';
        checkoutButton.disabled = true; // Disable checkout button
        checkoutButton.classList.add('opacity-50', 'cursor-not-allowed'); // Add styling for disabled state
    } else {
        let total = 0;
        cartContainer.innerHTML = cart.map((item, index) => {
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity, 10) || 0;
            const itemTotal = price * quantity;
            total += itemTotal;

            // Basic validation/defaults for item properties
            const itemName = item.name || 'Nombre no disponible';
            const itemImage = item.image || '/public/images/placeholder.png';
            const itemDescription = item.description || '';

            return `
                <div class="cart-item flex items-center border-b py-4" data-index="${index}">
                    <img src="${itemImage}" alt="${itemName}" class="cart-item-img w-16 h-16 object-cover rounded mr-4" onerror="this.onerror=null; this.src='/public/images/placeholder.png';">
                    <div class="cart-item-details flex-grow">
                        <h3 class="cart-item-name font-semibold">${itemName}</h3>
                        ${itemDescription ? `<p class="cart-item-description text-sm text-gray-600">${itemDescription}</p>` : ''}
                        <div class="cart-item-price text-sm text-gray-800">Subtotal: $${itemTotal.toFixed(2)}</div>
                        <div class="cart-item-quantity flex items-center mt-2">
                            <button class="quantity-btn decrease bg-gray-200 px-2 py-1 rounded hover:bg-gray-300" title="Disminuir">-</button>
                            <span class="mx-3 font-medium">${quantity}</span>
                            <button class="quantity-btn increase bg-gray-200 px-2 py-1 rounded hover:bg-gray-300" title="Aumentar">+</button>
                        </div>
                    </div>
                    <button class="cart-item-remove text-red-500 hover:text-red-700 ml-4" title="Eliminar">
                        <i class="fas fa-trash fa-lg"></i>
                    </button>
                </div>
            `;
        }).join('');
        totalAmountElement.textContent = `$${total.toFixed(2)}`;
        checkoutButton.disabled = false; // Enable checkout button
        checkoutButton.classList.remove('opacity-50', 'cursor-not-allowed'); // Remove disabled styling
    }
}


// Checkout Module
function initializeCheckout() {
    // Add specific listeners or setup for the checkout section if needed
    console.log("Checkout section initialized/prepared.");
}

function loadCheckoutSummary() {
    console.log("Loading checkout summary...");
    const orderItemsContainer = document.querySelector(SELECTORS.CHECKOUT_ORDER_ITEMS);
    const subtotalElement = document.querySelector(SELECTORS.CHECKOUT_SUBTOTAL);
    const totalElement = document.querySelector(SELECTORS.CHECKOUT_TOTAL);
    const confirmBtn = document.querySelector(SELECTORS.CHECKOUT_CONFIRM_BTN);

    if (!orderItemsContainer || !subtotalElement || !totalElement || !confirmBtn) {
        console.warn("Checkout summary elements not found.");
        // Display an error message in the checkout area if appropriate
        if(orderItemsContainer) orderItemsContainer.innerHTML = '<p class="text-red-500">Error al cargar el resumen del pedido.</p>';
        return;
    }

    const cart = getCart();

    if (cart.length === 0) {
        orderItemsContainer.innerHTML = '<p class="empty-cart-message text-center text-gray-600 my-4">Tu carrito está vacío. Añade productos desde el menú para continuar.</p>';
        subtotalElement.textContent = '$0.00';
        totalElement.textContent = '$0.00'; // Assuming no extra fees for now
        confirmBtn.disabled = true;
        confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
        return;
    }

    let orderItemsHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 0;
        const itemTotal = price * quantity;
        subtotal += itemTotal;
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
            </div>
        `;
    });

    orderItemsContainer.innerHTML = orderItemsHTML;
    subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    // Calculate total (e.g., add shipping, taxes if applicable)
    const total = subtotal; // Simple total for now
    totalElement.textContent = `$${total.toFixed(2)}`;
    confirmBtn.disabled = false;
    confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');

    // Load user shipping info into the form
    loadUserShippingInfo();
}

function loadUserShippingInfo() {
    const shippingForm = document.querySelector(SELECTORS.SHIPPING_FORM);
    if (!shippingForm) return;

    const profile = dashboardState.userProfile; // Use cached profile data

    // Clear previous values and errors
    shippingForm.reset();
    shippingForm.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    // Consider clearing associated icons as well if they exist

    if (profile) {
        shippingForm.nombre.value = profile.nombre || '';
        shippingForm.apellido.value = profile.apellidos || '';
        shippingForm.telefono.value = profile.telefono || '';
        // Pre-fill other fields if available in profile (e.g., address, zone)
        // shippingForm.direccion.value = profile.address?.street || '';
        // shippingForm.zona.value = profile.address?.zone || '';
    } else {
        console.warn("User profile data not available for pre-filling shipping info.");
        // Optionally try localStorage as a fallback
        // const userInfoFromStorage = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.USER_INFO) || '{}');
        // shippingForm.nombre.value = userInfoFromStorage.nombre || '';
    }
}

function validateShippingForm() {
    const shippingForm = document.querySelector(SELECTORS.SHIPPING_FORM);
    if (!shippingForm) return false;

    let isValid = true;
    const requiredInputs = shippingForm.querySelectorAll('input[required], select[required], textarea[required]');

    // Clear previous errors
    shippingForm.querySelectorAll('.error').forEach(el => {
        el.classList.remove('error');
        // Clear icon errors if applicable
        // const icon = el.parentElement?.querySelector('i');
        // if (icon) icon.classList.remove('error');
    });

    requiredInputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            input.classList.add('error'); // Add error class for styling
            // Add icon error class if applicable
            // const icon = input.parentElement?.querySelector('i');
            // if (icon) icon.classList.add('error');
            console.warn(`Validation failed for input: ${input.name}`);
        }
    });

    if (!isValid) {
        showNotification('Por favor completa todos los campos requeridos en Detalles de envío', 'error');
        // Scroll to the first error
        const firstError = shippingForm.querySelector('.error');
        firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return isValid;
}

async function confirmOrder() {
    console.log("Attempting to confirm order...");

    if (!validateShippingForm()) {
        return; // Stop if form validation fails
    }

    const shippingForm = document.querySelector(SELECTORS.SHIPPING_FORM);
    const cart = getCart();

    if (cart.length === 0) {
        showNotification("El carrito está vacío. No se puede confirmar el pedido.", "error");
        return;
    }

    // Collect data
    const deliveryData = {
        tipo: 'envio', // Assuming 'envio' for now
        nombre: shippingForm.nombre.value.trim(),
        apellido: shippingForm.apellido.value.trim(),
        telefono: shippingForm.telefono.value.trim(),
        zona: shippingForm.zona.value,
        direccion: shippingForm.direccion.value.trim(),
        referencia: shippingForm.referencia.value.trim(),
        indicaciones: shippingForm.indicaciones.value.trim()
    };

    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 0), 0);

    // Prepare payload for the backend
    // Best practice: Send only IDs and quantities; let backend recalculate price and total.
    const orderPayload = {
        items: cart.map(item => ({
            productId: item.id, // Ensure 'id' is the correct product identifier (_id)
            quantity: item.quantity,
            // price: item.price // Optional: Backend should ideally fetch current price
        })),
        // totalAmount: total, // Optional: Backend should recalculate this
        deliveryDetails: deliveryData,
        paymentMethod: 'contra_entrega' // Assuming cash on delivery for now
    };

    const confirmBtn = document.querySelector(SELECTORS.CHECKOUT_CONFIRM_BTN);
    if (!confirmBtn) return;

    // Disable button and show loading state
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando...';

    const result = await makeApiCall(API_ENDPOINTS.ORDERS, 'POST', orderPayload);

    if (result && result.success) {
        const orderId = result.data?.orderId || ''; // Get order ID from response if available
        showNotification(`¡Pedido registrado #${orderId} con éxito!`, 'success');
        saveCart([]); // Clear the cart in localStorage

        // Redirect to orders section after a delay
        setTimeout(() => {
            const pedidosMenuItem = document.querySelector('.menu-item a[href="#pedidos"]')?.closest(SELECTORS.SIDEBAR_MENU_ITEMS);
            if (pedidosMenuItem) handleSectionChange('pedidos', pedidosMenuItem);
        }, 2500);

    } else {
        showNotification(`Error al crear pedido: ${result?.message || 'Error desconocido'}`, 'error');
        // Re-enable button
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Confirmar Pedido';
    }
}


// Orders Module
async function loadOrders() {
    console.log("Loading order history...");
    const ordersListContainer = document.querySelector(SELECTORS.ORDERS_LIST_CONTAINER);
    if (!ordersListContainer) return;

    ordersListContainer.innerHTML = '<p class="text-center my-4">Cargando pedidos... <i class="fas fa-spinner fa-spin ml-2"></i></p>';

    const result = await makeApiCall(API_ENDPOINTS.ORDERS, 'GET');

    if (result && result.success) {
        displayOrders(result.data); // Pass the array of orders
    } else {
        ordersListContainer.innerHTML = `<p class="text-center text-red-500 my-4">Error al cargar pedidos: ${result?.message || 'No se pudieron obtener los datos.'}</p>`;
        if (result?.status === 401) {
            logout(); // Logout on auth error
        }
    }
}

function displayOrders(orders) {
    const ordersListContainer = document.querySelector(SELECTORS.ORDERS_LIST_CONTAINER);
    if (!ordersListContainer) return;

    if (!Array.isArray(orders) || orders.length === 0) {
        ordersListContainer.innerHTML = '<p class="text-center text-gray-600 my-4">No has realizado ningún pedido todavía.</p>';
        return;
    }

    // Sort orders by date, most recent first (assuming 'date' or 'createdAt' field exists)
    orders.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

    ordersListContainer.innerHTML = orders.map(order => renderOrderCard(order)).join('');
}

function renderOrderCard(order) {
    // Format Date
    let orderDateFormatted = 'Fecha inválida';
    try {
        const date = new Date(order.createdAt || order.date);
        if (!isNaN(date.getTime())) {
            orderDateFormatted = date.toLocaleString('es-ES', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }
    } catch (e) { /* Ignore date formatting errors */ }

    // Format Status
    const { statusClass, statusText, statusIcon } = getOrderStatusInfo(order.status);

    // Format Items (Simplified for card header)
    // const itemsSummary = order.items.map(item => `${item.quantity}x ${item.productName || 'Producto'}`).join(', ');
    // Or show total items count
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

    // Render Items for Details View
    const itemsHTML = order.items.map(item => `
        <div class="order-item flex justify-between items-center py-2 border-t">
             <div class="flex items-center">
                 ${item.image ? `<img src="${item.image}" alt="${item.productName || ''}" class="w-10 h-10 object-cover rounded mr-3" onerror="this.onerror=null; this.src='/public/images/placeholder.png';">` : '<div class="w-10 h-10 bg-gray-200 rounded mr-3"></div>'}
                 <div class="item-details">
                     <h4 class="text-sm font-medium">${item.productName || 'Producto Desconocido'}</h4>
                     <p class="text-xs text-gray-600">Cantidad: ${item.quantity}</p>
                 </div>
             </div>
             <span class="item-price text-sm font-medium">$${((item.price || 0) * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');

    return `
        <div class="order-card bg-white shadow rounded-lg mb-4 overflow-hidden" data-order-id="${order.orderId || order.id}" data-status="${order.status?.toLowerCase() || 'pending'}">
            <div class="order-header p-4 flex justify-between items-center cursor-pointer details-btn">
                <div class="order-info">
                    <h3 class="font-semibold text-lg">Pedido #${order.orderId || order.id}</h3>
                    <span class="order-date text-sm text-gray-500">${orderDateFormatted}</span>
                    <p class="text-sm text-gray-600 mt-1">${totalItems} producto(s)</p>
                </div>
                <div class="order-status flex flex-col items-end ml-4">
                     <span class="status-badge text-xs font-semibold px-2 py-1 rounded-full ${statusClass}">
                        <i class="fas ${statusIcon} mr-1"></i>
                        ${statusText}
                     </span>
                     <div class="order-total mt-2">
                        <span class="text-lg font-bold text-gray-800">$${(order.totalAmount || 0).toFixed(2)}</span>
                    </div>
                </div>
                 <button class="details-btn-icon text-gray-500 ml-2">
                     <i class="fas fa-chevron-down transition-transform duration-300"></i>
                 </button>
            </div>
             <div class="order-details p-4 border-t" style="display: none;">
                <h4 class="font-semibold mb-2">Detalles del Pedido:</h4>
                ${itemsHTML}
                </div>
        </div>
    `;
}


function getOrderStatusInfo(status) {
    const lowerStatus = status?.toLowerCase() || 'pending';
    let statusClass = 'bg-yellow-100 text-yellow-800'; // Default: Pending
    let statusText = 'Pendiente';
    let statusIcon = 'fa-hourglass-start';

    switch (lowerStatus) {
        case 'processing':
        case 'en proceso':
        case 'en preparacion':
            statusClass = 'bg-blue-100 text-blue-800';
            statusText = 'En Preparación';
            statusIcon = 'fa-clock';
            break;
        case 'shipped': // Example new status
        case 'en camino':
             statusClass = 'bg-purple-100 text-purple-800';
             statusText = 'En Camino';
             statusIcon = 'fa-shipping-fast';
             break;
        case 'completed':
        case 'delivered':
        case 'entregado':
            statusClass = 'bg-green-100 text-green-800';
            statusText = 'Entregado';
            statusIcon = 'fa-check-circle';
            break;
        case 'cancelled':
        case 'cancelado':
            statusClass = 'bg-red-100 text-red-800';
            statusText = 'Cancelado';
            statusIcon = 'fa-times-circle';
            break;
        case 'pending': // Explicit pending case
             statusClass = 'bg-yellow-100 text-yellow-800';
             statusText = 'Pendiente';
             statusIcon = 'fa-hourglass-start';
             break;
        default: // Fallback for unknown statuses
             statusClass = 'bg-gray-100 text-gray-800';
             statusText = status || 'Desconocido'; // Show original status if available
             statusIcon = 'fa-question-circle';
             break;
    }
    return { statusClass, statusText, statusIcon };
}

function toggleOrderDetails(buttonOrHeader) {
    const orderCard = buttonOrHeader.closest('.order-card');
    if (!orderCard) return;

    const detailsContainer = orderCard.querySelector('.order-details');
    const icon = orderCard.querySelector('.details-btn-icon i'); // Target the icon specifically

    if (!detailsContainer || !icon) return;

    const isExpanded = detailsContainer.style.display !== 'none';

    if (isExpanded) {
        detailsContainer.style.display = 'none';
        icon.classList.remove('rotate-180'); // Assuming Tailwind rotate utility
    } else {
        detailsContainer.style.display = 'block'; // Or 'flex' etc. depending on CSS
        icon.classList.add('rotate-180');
    }
}

// Menu Module (Dashboard Version)
async function loadDashboardMenu() {
    console.log("Loading dashboard menu...");
    const menuContainer = document.querySelector(SELECTORS.MENU_ITEMS_CONTAINER);
    if (!menuContainer) {
        console.error("Dashboard menu container not found.");
        return;
    }

    menuContainer.innerHTML = '<p class="text-center my-4">Cargando menú... <i class="fas fa-spinner fa-spin ml-2"></i></p>';

    // Use cached products if available
    if (dashboardState.dashboardProducts && dashboardState.dashboardProducts.length > 0) {
        console.log("Using cached menu products for dashboard.");
        displayDashboardMenuItems(dashboardState.dashboardProducts);
        return;
    }

    // Fetch products if not cached
    const result = await makeApiCall(API_ENDPOINTS.PRODUCTS, 'GET');

    if (result && result.success && Array.isArray(result.data)) {
        dashboardState.dashboardProducts = result.data; // Cache the products
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

    // Generate HTML for each product card
    menuContainer.innerHTML = products.map(item => renderMenuItemCard(item)).join('');
    // Note: Event listeners are handled by delegation in setupSectionSpecificListeners
}

function renderMenuItemCard(item) {
    // Ensure item has necessary properties with defaults
    const productId = item._id || item.id; // Use _id if available (MongoDB)
    const productName = item.name || 'Nombre no disponible';
    const productPrice = parseFloat(item.price) || 0;
    const productImage = item.imageUrl || item.image || '/public/images/placeholder.png'; // Prioritize imageUrl
    const productDescription = item.description || 'Descripción no disponible.';

    // Prepare data attribute for 'Add to Cart' button
    // Only include necessary info for addToCart function
    const productInfo = JSON.stringify({
        id: productId,
        name: productName,
        price: productPrice,
        image: productImage,
        description: item.description // Keep original description if needed by addToCart
    });

    return `
        <div class="menu-item-card bg-white shadow rounded-lg overflow-hidden flex flex-col">
             <img src="${productImage}" alt="${productName}" class="menu-item-image w-full h-48 object-cover" onerror="this.onerror=null; this.src='/public/images/placeholder.png';">
             <div class="menu-item-content p-4 flex flex-col flex-grow">
                 <div class="menu-item-header flex justify-between items-start mb-2">
                     <h3 class="menu-item-name font-semibold text-lg flex-grow mr-2">${productName}</h3>
                     <span class="menu-item-price font-bold text-lg text-green-600 whitespace-nowrap">$${productPrice.toFixed(2)}</span>
                 </div>
                 <p class="menu-item-description text-sm text-gray-600 mb-4 flex-grow">${productDescription}</p>
                 <button class="add-to-cart-btn mt-auto w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition duration-150 flex items-center justify-center" data-product-info='${productInfo.replace(/'/g, "&apos;")}'>
                     <i class="fas fa-cart-plus mr-2"></i>
                     Reservar pedido
                 </button>
             </div>
        </div>
    `;
}


// --- 9. API Utility Functions ---

/**
 * Makes an API call using fetch.
 * Handles common headers (Authorization, Content-Type), JSON parsing, and basic error handling.
 * @param {string} endpoint - The API endpoint URL.
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE).
 * @param {object|null} body - The request body for POST/PUT requests.
 * @returns {Promise<object>} - An object containing { success: boolean, data: any|null, message: string|null, status: number|null }
 */
async function makeApiCall(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method: method.toUpperCase(),
        headers: headers,
    };

    if (body && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH')) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(endpoint, config);
        const responseData = await response.json().catch(() => null); // Attempt to parse JSON, return null on failure

        if (response.ok) {
            return {
                success: true,
                data: responseData, // Assumes backend sends data directly or within a 'data' property
                message: responseData?.message || null, // Include message if backend sends one on success
                status: response.status
            };
        } else {
            // Handle specific HTTP error statuses
            let errorMessage = `Error ${response.status}: ${response.statusText}`;
            if (responseData && responseData.message) {
                errorMessage = responseData.message; // Use backend error message if available
            } else if (response.status === 401) {
                errorMessage = 'No autorizado o sesión expirada.';
            } else if (response.status === 404) {
                errorMessage = 'Recurso no encontrado.';
            } // Add more specific error handling as needed

            console.error(`API Call Error (${method} ${endpoint}): Status ${response.status}, Message: ${errorMessage}`, responseData);
            return {
                success: false,
                data: null,
                message: errorMessage,
                status: response.status
            };
        }
    } catch (error) {
        console.error(`Network or Fetch Error (${method} ${endpoint}):`, error);
        // Handle network errors (e.g., server down, CORS issues)
        let message = 'Error de red o conexión.';
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
             message = 'No se pudo conectar al servidor. Verifica tu conexión o contacta al administrador.';
        }
        return {
            success: false,
            data: null,
            message: message,
            status: null // No HTTP status available for network errors
        };
    }
}


// --- 10. Utility Functions ---

/**
 * Saves a user preference to localStorage.
 * @param {string} key - The preference key.
 * @param {*} value - The preference value.
 */
function saveUserPreference(key, value) {
    try {
        const preferences = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.PREFERENCES) || '{}');
        preferences[key] = value;
        localStorage.setItem(LOCAL_STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
        console.error('Error saving user preference:', key, error);
    }
}

/**
 * Retrieves a user preference from localStorage.
 * @param {string} key - The preference key.
 * @returns {*} - The preference value or null if not found or error occurred.
 */
function getUserPreference(key) {
    try {
        const preferences = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.PREFERENCES) || '{}');
        return preferences.hasOwnProperty(key) ? preferences[key] : null; // Return null if key doesn't exist
    } catch (error) {
        console.error('Error getting user preference:', key, error);
        return null;
    }
}

/**
 * Handles window resize events, primarily for adjusting the sidebar.
 */
function handleResize() {
    const sidebar = document.querySelector(SELECTORS.SIDEBAR);
    const mainContent = document.querySelector(SELECTORS.MAIN_CONTENT);
    if (!sidebar || !mainContent) return;

    if (window.innerWidth <= 768) {
        // Force collapse on mobile regardless of preference
        if (!dashboardState.isSidebarCollapsed) {
            collapseSidebar();
        }
    } else {
        // On desktop, restore based on preference
        const sidebarCollapsedPref = getUserPreference('sidebarCollapsed');
        if (sidebarCollapsedPref && !dashboardState.isSidebarCollapsed) {
            collapseSidebar();
        } else if (!sidebarCollapsedPref && dashboardState.isSidebarCollapsed) {
            expandSidebar();
        }
        // If state already matches preference, do nothing.
    }
}

// --- 11. Global Event Listeners & Initial Load ---

// Global listener for window resize
window.addEventListener('resize', handleResize);

// Initial execution when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");

    // Final auth check before initializing
    if (checkAuthOnLoad()) {
        initializeDashboard();
    } else {
        console.log("Dashboard initialization skipped due to failed auth check.");
        // Optionally hide dashboard elements if they were briefly visible
    }
});
