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
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    updateOrderSummary(cart);
    loadUserShippingInfo();
    setupDeliveryOptions();
    setupPaymentButton();
}

function updateOrderSummary(cart) {
    const orderItems = document.querySelector('.order-items');
    const subtotalAmount = document.querySelector('.subtotal .amount');
    const totalAmount = document.querySelector('.total .amount');
    
    if (!orderItems || !subtotalAmount || !totalAmount) return;
    
    let subtotal = 0;
    
    if (cart.length === 0) {
        orderItems.innerHTML = '<p>No hay items en el carrito</p>';
        subtotalAmount.textContent = '$0.00';
        totalAmount.textContent = '$0.00';
        return;
    }

    orderItems.innerHTML = cart.map(item => {
        subtotal += item.price * item.quantity;
        return `
            <div class="order-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="order-item-details">
                    <div class="order-item-name">${item.name} (x${item.quantity})</div>
                    <div class="order-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                </div>
            </div>
        `;
    }).join('');

    subtotalAmount.textContent = `$${subtotal.toFixed(2)}`;
    totalAmount.textContent = `$${subtotal.toFixed(2)}`;
}

function setupDeliveryOptions() {
    const deliveryOptions = document.querySelectorAll('input[name="delivery"]');
    const shippingForm = document.getElementById('shippingForm');
    const pickupForm = document.getElementById('pickupForm');
    
    deliveryOptions.forEach(option => {
        option.addEventListener('change', (e) => {
            if (e.target.value === 'retiro') {
                shippingForm.style.display = 'none';
                shippingForm.classList.remove('active');
                pickupForm.style.display = 'block';
                setTimeout(() => pickupForm.classList.add('active'), 50);
                loadUserPickupInfo();
            } else {
                pickupForm.style.display = 'none';
                pickupForm.classList.remove('active');
                shippingForm.style.display = 'block';
                setTimeout(() => shippingForm.classList.add('active'), 50);
                loadUserShippingInfo();
            }
        });
    });

    // Activar el formulario inicial
    const defaultOption = document.querySelector('input[name="delivery"]:checked');
    if (defaultOption) {
        if (defaultOption.value === 'retiro') {
            pickupForm.style.display = 'block';
            setTimeout(() => pickupForm.classList.add('active'), 50);
            loadUserPickupInfo();
        } else {
            shippingForm.style.display = 'block';
            setTimeout(() => shippingForm.classList.add('active'), 50);
            loadUserShippingInfo();
        }
    }
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

function loadUserPickupInfo() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
    const pickupForm = document.getElementById('pickupForm');
    
    if (userInfo.nombre) {
        pickupForm.querySelector('input[name="pickup_nombre"]').value = userInfo.nombre;
        pickupForm.querySelector('input[name="pickup_apellido"]').value = userInfo.apellido || '';
        pickupForm.querySelector('input[name="pickup_telefono"]').value = userInfo.telefono || '';
    }

    // Limpiar errores previos
    pickupForm.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

function setupPaymentButton() {
    const paymentBtn = document.querySelector('.proceed-payment-btn');
    if (paymentBtn) {
        paymentBtn.addEventListener('click', handlePayment);
    }
}

function handlePayment() {
    const deliveryMethod = document.querySelector('input[name="delivery"]:checked').value;
    let isValid = true;
    let formData = {};
    
    if (deliveryMethod === 'envio') {
        const shippingForm = document.getElementById('shippingForm');
        const inputs = shippingForm.querySelectorAll('input, select, textarea');
        
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
            showPaymentModal(formData);
        } else {
            showNotification('Por favor completa todos los campos requeridos para el envío', 'error');
        }
    } else {
        const pickupForm = document.getElementById('pickupForm');
        const inputs = pickupForm.querySelectorAll('input, select');
        
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
            formData = {
                tipo: 'retiro',
                nombre: pickupForm.querySelector('input[name="pickup_nombre"]').value.trim(),
                apellido: pickupForm.querySelector('input[name="pickup_apellido"]').value.trim(),
                telefono: pickupForm.querySelector('input[name="pickup_telefono"]').value.trim(),
                horario: pickupForm.querySelector('select[name="pickup_horario"]').value
            };
            showPaymentModal(formData);
        } else {
            showNotification('Por favor completa todos los campos requeridos para el retiro', 'error');
        }
    }
}

function showPaymentModal(deliveryData) {
    const modal = document.getElementById('paymentModal');
    const totalAmount = document.querySelector('.total-amount').textContent;
    
    // Actualizar montos en el modal
    modal.querySelectorAll('.amount').forEach(el => {
        el.textContent = totalAmount;
    });
    
    // Mostrar modal
    modal.classList.add('active');
    
    // Guardar datos de entrega
    modal.dataset.deliveryData = JSON.stringify(deliveryData);
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    modal.classList.remove('active');
    
    // Limpiar formulario
    document.getElementById('cardPaymentForm').reset();
}

function formatCardNumber(input) {
    let value = input.value.replace(/\D/g, '');
    let formattedValue = '';
    
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) {
            formattedValue += ' ';
        }
        formattedValue += value[i];
    }
    
    input.value = formattedValue.slice(0, 19);
}

function formatExpiryDate(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2);
    }
    
    input.value = value.slice(0, 5);
}

function processPayment(event) {
    event.preventDefault();
    
    const form = event.target;
    const modal = document.getElementById('paymentModal');
    const deliveryData = JSON.parse(modal.dataset.deliveryData || '{}');
    
    // Validar formulario
    const formData = {
        cardHolder: form.cardHolder.value.trim(),
        cardNumber: form.cardNumber.value.replace(/\s/g, ''),
        expiryDate: form.expiryDate.value,
        cvv: form.cvv.value,
        email: form.email.value,
        deliveryInfo: deliveryData
    };
    
    // Simular procesamiento de pago
    showNotification('Procesando pago...', 'success');
    
    setTimeout(() => {
        showNotification('¡Pago procesado con éxito!', 'success');
        closePaymentModal();
        
        // Limpiar carrito y redirigir
        localStorage.removeItem('cart');
        setTimeout(() => {
            handleSectionChange('pedidos', document.querySelector('a[href="#pedidos"]').parentElement);
        }, 2000);
    }, 2000);
}

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
    const modal = document.getElementById('paymentModal');
    if (e.target === modal) {
        closePaymentModal();
    }
});

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