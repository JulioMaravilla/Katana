// Estado global para el dashboard
const dashboardState = {
    currentSection: 'perfil',
    notifications: [],
    userPreferences: {}
};

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// Inicialización del Dashboard
function initializeDashboard() {
    setupSidebar();
    setupNotifications();
    setupEventListeners();
}

// Configuración del Sidebar
function setupSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    // Toggle del sidebar
    sidebarToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
        saveUserPreference('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    });

    // Manejo de items del menú
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.querySelector('a').getAttribute('href').replace('#', '');
            handleSectionChange(section, this);
        });
    });

    // Restaurar estado del sidebar
    const sidebarCollapsed = getUserPreference('sidebarCollapsed');
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    }
}

// Manejo de cambio de secciones
function handleSectionChange(sectionId, menuItem) {
    // Actualizar estado actual
    dashboardState.currentSection = sectionId;

    // Actualizar menú
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    menuItem.classList.add('active');

    // Actualizar título
    const pageTitle = document.getElementById('pageTitle');
    pageTitle.textContent = menuItem.querySelector('span').textContent;

    // Ocultar todas las secciones y mostrar la seleccionada
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    const targetSection = document.getElementById(`${sectionId}Content`);
    if (targetSection) {
        targetSection.classList.add('active');
        loadSectionContent(sectionId);
    }

    // Guardar preferencia de última sección
    saveUserPreference('lastSection', sectionId);
}

// Sistema de Notificaciones
function setupNotifications() {
    const notificationBadge = document.querySelector('.notification-badge');
    
    notificationBadge?.addEventListener('click', () => {
        showNotificationsPanel();
    });
}

function showNotificationsPanel() {
    // Implementar panel de notificaciones
    console.log('Panel de notificaciones - Por implementar');
}

// Event Listeners Generales
function setupEventListeners() {
    // Listener para el botón de cerrar sesión
    const logoutBtn = document.querySelector('.logout-btn');
    logoutBtn?.addEventListener('click', () => {
        window.location.href = '/views/login.html';
    });

    // Listener para clicks fuera del sidebar en móviles
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        
        if (window.innerWidth <= 768 && 
            !e.target.closest('.sidebar') && 
            !e.target.closest('#sidebarToggle') && 
            !sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
            document.querySelector('.main-content').classList.add('expanded');
        }
    });

    // Listener para cambios de tamaño de ventana
    window.addEventListener('resize', handleResize);
}

// Utilidades
function saveUserPreference(key, value) {
    try {
        const preferences = JSON.parse(localStorage.getItem('dashboardPreferences') || '{}');
        preferences[key] = value;
        localStorage.setItem('dashboardPreferences', JSON.stringify(preferences));
    } catch (error) {
        console.error('Error saving preference:', error);
    }
}

function getUserPreference(key) {
    try {
        const preferences = JSON.parse(localStorage.getItem('dashboardPreferences') || '{}');
        return preferences[key];
    } catch (error) {
        console.error('Error getting preference:', error);
        return null;
    }
}

function handleResize() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    } else {
        const sidebarCollapsed = getUserPreference('sidebarCollapsed');
        if (!sidebarCollapsed) {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('expanded');
        }
    }
}

// Funciones para cargar contenido de secciones
async function loadSectionContent(sectionId) {
    console.log(`Sección ${sectionId} cargada`);
    
    if (sectionId === 'carrito') {
        updateCartDisplay();
    } else if (sectionId === 'checkout') {
        loadCheckoutContent();
    }
}

// Funciones del carrito
function updateCartDisplay() {
    const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
    const cartContainer = document.querySelector('.cart-items');
    const totalAmount = document.querySelector('.total-amount');
    
    if (cartItems.length === 0) {
        cartContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Tu carrito está vacío</p>
                <a href="#menu" class="continue-shopping" onclick="handleSectionChange('menu', document.querySelector('a[href=\'#menu\']').parentElement)">
                    <i class="fas fa-arrow-left"></i>
                    Continuar Comprando
                </a>
            </div>
        `;
        totalAmount.textContent = '$0.00';
        return;
    }

    let total = 0;
    cartContainer.innerHTML = cartItems.map((item, index) => {
        total += item.price * item.quantity;
        return `
            <div class="cart-item" data-index="${index}">
                <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-details">
                    <h3 class="cart-item-name">${item.name}</h3>
                    <p class="cart-item-description">${item.description}</p>
                    <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateQuantity(${index}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${index}, 1)">+</button>
                    </div>
                    <button class="cart-item-remove" onclick="removeFromCart(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    totalAmount.textContent = `$${total.toFixed(2)}`;
}

function updateQuantity(index, change) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart[index]) {
        cart[index].quantity += change;
        if (cart[index].quantity < 1) {
            cart.splice(index, 1);
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartDisplay();
    }
}

function removeFromCart(index) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
}

// Funciones para el proceso de pago
function initializeCheckout() {
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            handleSectionChange('checkout', document.querySelector('a[href="#checkout"]').parentElement);
            loadCheckoutContent();
        });
    }
}

function loadCheckoutContent() {
    // Cargar resumen del pedido
    const orderItems = document.querySelector('.order-items');
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    if (cart.length === 0) {
        orderItems.innerHTML = '<p class="empty-cart-message">No hay productos en el carrito</p>';
        return;
    }
    
    let orderItemsHTML = '';
    let subtotal = 0;
    
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
        orderItemsHTML += `
            <div class="order-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p>Cantidad: ${item.quantity}</p>
                </div>
                <div class="item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        `;
    });
    
    orderItems.innerHTML = orderItemsHTML;
    
    // Actualizar totales
    document.querySelector('.subtotal .amount').textContent = `$${subtotal.toFixed(2)}`;
    document.querySelector('.total .amount').textContent = `$${subtotal.toFixed(2)}`;
    
    // Cargar información del usuario si está disponible
    loadUserShippingInfo();
}

function loadUserShippingInfo() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
    const shippingForm = document.getElementById('shippingForm');
    
    if (userInfo.nombre) {
        shippingForm.querySelector('input[name="nombre"]').value = userInfo.nombre;
        shippingForm.querySelector('input[name="apellido"]').value = userInfo.apellido || '';
        shippingForm.querySelector('input[name="telefono"]').value = userInfo.telefono || '';
    }

    // Limpiar errores previos
    shippingForm.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

function confirmOrder() {
    const shippingForm = document.getElementById('shippingForm');
    const inputs = shippingForm.querySelectorAll('input, select, textarea');
    let isValid = true;
    let formData = {};
    
    // Validar formulario
    inputs.forEach(input => {
        if (input.required && !input.value.trim()) {
            isValid = false;
            input.classList.add('error');
            input.parentElement.querySelector('i').classList.add('error');
        } else {
            input.classList.remove('error');
            input.parentElement.querySelector('i').classList.remove('error');
        }
    });
    
    if (isValid) {
        // Recopilar datos del formulario
        formData = {
            tipo: 'envio',
            nombre: shippingForm.querySelector('input[name="nombre"]').value.trim(),
            apellido: shippingForm.querySelector('input[name="apellido"]').value.trim(),
            telefono: shippingForm.querySelector('input[name="telefono"]').value.trim(),
            zona: shippingForm.querySelector('select[name="zona"]').value,
            direccion: shippingForm.querySelector('input[name="direccion"]').value.trim(),
            referencia: shippingForm.querySelector('input[name="referencia"]').value.trim(),
            indicaciones: shippingForm.querySelector('textarea[name="indicaciones"]').value.trim()
        };
        
        // Obtener datos del carrito
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Crear objeto de pedido
        const order = {
            id: generateOrderId(),
            date: new Date().toISOString(),
            items: cart,
            total: total,
            status: 'pendiente',
            delivery: formData,
            paymentMethod: 'contra_entrega'
        };
        
        // Guardar pedido
        saveOrder(order);
        
        // Mostrar notificación de éxito
        showNotification('¡Pedido confirmado con éxito!', 'success');
        
        // Limpiar carrito
        localStorage.removeItem('cart');
        
        // Redirigir a la sección de pedidos
        setTimeout(() => {
            handleSectionChange('pedidos', document.querySelector('a[href="#pedidos"]').parentElement);
        }, 2000);
    } else {
        showNotification('Por favor completa todos los campos requeridos', 'error');
    }
}

function generateOrderId() {
    return 'ORD-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

function saveOrder(order) {
    // Obtener pedidos existentes
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    
    // Agregar nuevo pedido
    orders.push(order);
    
    // Guardar pedidos actualizados
    localStorage.setItem('orders', JSON.stringify(orders));
}

// Función para agregar al carrito
function addToCart(item) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItem = cart.find(i => i.id === item.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...item,
            quantity: 1
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Mostrar notificación
    showNotification('Producto agregado al carrito');
    
    // Actualizar carrito si está visible
    if (document.getElementById('carritoContent').classList.contains('active')) {
        updateCartDisplay();
    }
}

// Función mejorada para mostrar notificaciones
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Usar requestAnimationFrame para asegurar la animación
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
    });
    
    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        });
    }, 3000);
}

// Inicializar el checkout cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    updateCartDisplay();
    initializeCheckout();
}); 