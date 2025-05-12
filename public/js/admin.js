/**
 * Script para el Dashboard Administrativo de Katana Sushi
 * INCLUYE:
 * - Autenticación de admin con JWT
 * - Toggle del sidebar
 * - Navegación entre secciones
 * - Inicialización de gráficos (Chart.js)
 * - Gestión de productos (agregar, listar, eliminar)
 * - Gestión de pedidos (listar, actualizar estado)
 * - Listado de clientes
 * - Carga de actividad reciente en Dashboard
 */

// --- Constantes y Estado ---
const ADMIN_AUTH_KEY = 'adminAuthToken';
const API_BASE = '/api';
const RECENT_ACTIVITY_LIMIT = 5; // Número de items a mostrar por categoría

// --- Autenticación (sin cambios) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin Dashboard DOM cargado.");
    checkAdminAuthentication();
    const reportTypeSelect = document.getElementById('reportTypeSelect');
    const reportTypeIcon = document.getElementById('reportTypeIcon');
    const reportTypeSelector = reportTypeSelect ? reportTypeSelect.closest('.report-type-selector') : null;
    // Aplicar diseño inicial según valor por defecto
    if (reportTypeSelect && reportTypeIcon && reportTypeSelector) {
        let val = reportTypeSelect.value;
        reportTypeSelector.classList.remove('bg-ventas','bg-pedidos','bg-clientes','bg-productos');
        if (val === 'ventas') {
            reportTypeSelector.classList.add('bg-ventas');
            reportTypeIcon.innerHTML = '<i class="fas fa-chart-bar"></i>';
            reportTypeIcon.style.color = '#3498db';
        } else if (val === 'pedidos') {
            reportTypeSelector.classList.add('bg-pedidos');
            reportTypeIcon.innerHTML = '<i class="fas fa-shopping-cart"></i>';
            reportTypeIcon.style.color = '#e67e22';
        } else if (val === 'clientes') {
            reportTypeSelector.classList.add('bg-clientes');
            reportTypeIcon.innerHTML = '<i class="fas fa-users"></i>';
            reportTypeIcon.style.color = '#27ae60';
        } else if (val === 'productos') {
            reportTypeSelector.classList.add('bg-productos');
            reportTypeIcon.innerHTML = '<i class="fas fa-box"></i>';
            reportTypeIcon.style.color = '#8e44ad';
        } else {
            reportTypeIcon.innerHTML = '<i class="fas fa-file-alt"></i>';
            reportTypeIcon.style.color = '#888';
        }
    }
    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', function() {
            const ventasContent = document.getElementById('ventasReportContent');
            const pedidosContent = document.getElementById('pedidosReportContent');
            const clientesContent = document.getElementById('clientesReportContent');
            const productosContent = document.getElementById('productosReportContent');
            const otherContent = document.getElementById('otherReportContent');
            const reportTypeIcon = document.getElementById('reportTypeIcon');
            ventasContent.style.display = 'none';
            pedidosContent.style.display = 'none';
            clientesContent.style.display = 'none';
            productosContent.style.display = 'none';
            otherContent.style.display = 'none';
            // Cambiar icono y color
            if (reportTypeIcon) {
                if (this.value === 'ventas') {
                    reportTypeIcon.innerHTML = '<i class="fas fa-chart-bar"></i>';
                    reportTypeIcon.style.color = '#3498db';
                } else if (this.value === 'pedidos') {
                    reportTypeIcon.innerHTML = '<i class="fas fa-shopping-cart"></i>';
                    reportTypeIcon.style.color = '#e67e22';
                } else if (this.value === 'clientes') {
                    reportTypeIcon.innerHTML = '<i class="fas fa-users"></i>';
                    reportTypeIcon.style.color = '#27ae60';
                } else if (this.value === 'productos') {
                    reportTypeIcon.innerHTML = '<i class="fas fa-box"></i>';
                    reportTypeIcon.style.color = '#8e44ad';
                } else {
                    reportTypeIcon.innerHTML = '<i class="fas fa-file-alt"></i>';
                    reportTypeIcon.style.color = '#888';
                }
            }
            if (this.value === 'ventas') {
                ventasContent.style.display = '';
            } else if (this.value === 'pedidos') {
                pedidosContent.style.display = '';
            } else if (this.value === 'clientes') {
                clientesContent.style.display = '';
            } else if (this.value === 'productos') {
                productosContent.style.display = '';
            } else {
                otherContent.style.display = '';
            }
            const reportTypeSelector = this.closest('.report-type-selector');
            if (reportTypeSelector) {
                reportTypeSelector.classList.remove('bg-ventas','bg-pedidos','bg-clientes','bg-productos');
                if (this.value === 'ventas') {
                    reportTypeSelector.classList.add('bg-ventas');
                } else if (this.value === 'pedidos') {
                    reportTypeSelector.classList.add('bg-pedidos');
                } else if (this.value === 'clientes') {
                    reportTypeSelector.classList.add('bg-clientes');
                } else if (this.value === 'productos') {
                    reportTypeSelector.classList.add('bg-productos');
                }
            }
        });
    }

    // --- Modal Registrar Pedido en Pedidos ---
    const openRegisterOrderModalBtn = document.getElementById('openRegisterOrderModalBtn');
    const registerOrderModal = document.getElementById('registerOrderModal');
    const closeRegisterOrderModalBtn = document.getElementById('closeRegisterOrderModalBtn');
    const registerOrderForm = document.getElementById('registerOrderForm');
    const orderProductsList = document.getElementById('orderProductsList');
    const addProductToOrderBtn = document.getElementById('addProductToOrderBtn');
    const orderTotal = document.getElementById('orderTotal');
    let productRowCount = 0;

    function renderProductRow(idx) {
        return `<div class="order-product-row" style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
            <select class="form-control order-product-select" name="producto${idx}" required style="flex:2;">
                <option value="">Selecciona producto</option>
                <option value="PR-001" data-precio="3.5">Roll Camarón ($3.50)</option>
                <option value="PR-002" data-precio="4.0">Roll Salmón ($4.00)</option>
                <option value="PR-003" data-precio="1.0">Refresco ($1.00)</option>
            </select>
            <input type="number" class="form-control order-product-cant" name="cantidad${idx}" min="1" value="1" required style="width:70px;">
            <button type="button" class="admin-btn btn-danger removeProductBtn" title="Quitar" style="padding:4px 10px;"><i class="fas fa-trash"></i></button>
        </div>`;
    }

    function addProductRow() {
        productRowCount++;
        const div = document.createElement('div');
        div.innerHTML = renderProductRow(productRowCount);
        orderProductsList.appendChild(div.firstChild);
        updateOrderTotal();
    }

    function updateOrderTotal() {
        let total = 0;
        orderProductsList.querySelectorAll('.order-product-row').forEach(row => {
            const select = row.querySelector('.order-product-select');
            const cant = row.querySelector('.order-product-cant');
            const precio = select && select.selectedOptions[0] ? parseFloat(select.selectedOptions[0].dataset.precio || 0) : 0;
            const cantidad = cant ? parseInt(cant.value) : 1;
            if (precio && cantidad) total += precio * cantidad;
        });
        orderTotal.textContent = `$${total.toFixed(2)}`;
    }

    if (openRegisterOrderModalBtn && registerOrderModal) {
        openRegisterOrderModalBtn.onclick = () => {
            registerOrderModal.style.display = 'flex';
            orderProductsList.innerHTML = '';
            productRowCount = 0;
            addProductRow();
        };
    }
    if (closeRegisterOrderModalBtn && registerOrderModal) {
        closeRegisterOrderModalBtn.onclick = () => {
            registerOrderModal.style.display = 'none';
            registerOrderForm.reset();
            orderProductsList.innerHTML = '';
            productRowCount = 0;
            orderTotal.textContent = '$0.00';
        };
    }
    if (addProductToOrderBtn) {
        addProductToOrderBtn.onclick = (e) => {
            e.preventDefault();
            addProductRow();
        };
    }
    orderProductsList.addEventListener('click', function(e) {
        if (e.target.closest('.removeProductBtn')) {
            e.target.closest('.order-product-row').remove();
            updateOrderTotal();
        }
    });
    orderProductsList.addEventListener('change', function(e) {
        if (e.target.classList.contains('order-product-select') || e.target.classList.contains('order-product-cant')) {
            updateOrderTotal();
        }
    });
});

function checkAdminAuthentication() {
    const token = sessionStorage.getItem(ADMIN_AUTH_KEY);
    const loginModal = document.getElementById('adminLoginModal');
    const mainContainer = document.querySelector('.admin-container');

    if (token) {
        console.log("Token de admin encontrado. Inicializando dashboard...");
        if (mainContainer) mainContainer.classList.remove('hidden-for-login');
        if (loginModal) loginModal.style.display = 'none';
        initializeAdminDashboard();
    } else {
        console.log("Admin NO autenticado. Mostrando modal de login...");
        if (mainContainer) mainContainer.classList.add('hidden-for-login');
        if (loginModal) {
            loginModal.style.display = 'flex';
            setupAdminLoginModal();
        } else {
            console.error("¡Error crítico! No se encontró el modal de login.");
            document.body.innerHTML = "<h1>Error de configuración: Falta el modal de login.</h1>";
        }
    }
}

function setupAdminLoginModal() {
    const loginForm = document.getElementById('adminLoginForm');
    const messageElement = document.getElementById('adminLoginMessage');
    const submitButton = loginForm?.querySelector('button[type="submit"]');
    if (!loginForm || !messageElement || !submitButton) { console.error("Error: Elementos del formulario de login admin no encontrados."); return; }
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); messageElement.textContent = ''; submitButton.disabled = true; submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        const username = loginForm.adminUsername.value; const password = loginForm.adminPassword.value;
        try {
            const result = await makeAdminApiCall(`${API_BASE}/admin/login`, 'POST', { username, password }, false);
            if (result.success && result.token) {
                console.log("Login de admin exitoso."); sessionStorage.setItem(ADMIN_AUTH_KEY, result.token);
                if(result.admin && result.admin.username) sessionStorage.setItem('adminUsername', result.admin.username);
                checkAdminAuthentication();
            } else { console.warn("Login de admin fallido:", result.message); messageElement.textContent = result.message || 'Credenciales inválidas.'; submitButton.disabled = false; submitButton.innerHTML = 'Ingresar'; }
        } catch (error) { console.error("Error en login admin:", error); messageElement.textContent = error.message || 'Error de conexión.'; submitButton.disabled = false; submitButton.innerHTML = 'Ingresar'; }
    });
}

function adminLogout() {
    sessionStorage.removeItem(ADMIN_AUTH_KEY); sessionStorage.removeItem('adminUsername'); window.location.reload();
}

// --- Funciones del Dashboard ---

function initializeAdminDashboard() {
    console.log("Inicializando funciones del dashboard...");
    setupAdminSidebar();
    setupAdminNavigation();
    setupProductForm();
    setupActionButtons();
    setupAdminEventListeners();
    setupAdminProfileForms();
    loadAdminProfile();

    const adminUsername = sessionStorage.getItem('adminUsername');
    const adminUserNameElement = document.getElementById('adminUserName');
    if (adminUserNameElement && adminUsername) adminUserNameElement.textContent = adminUsername;

    loadInitialSection();
}

function setupAdminEventListeners() {
     const logoutButton = document.getElementById('adminLogoutButton');
     if (logoutButton) logoutButton.addEventListener('click', adminLogout);
     else console.warn("Botón de logout no encontrado.");

     const ordersContainer = document.getElementById('adminOrdersList');
     if (ordersContainer) ordersContainer.addEventListener('change', handleOrderStatusChange);

      const statusFilter = document.getElementById('orderStatusFilter');
      if (statusFilter) statusFilter.addEventListener('change', filterAdminOrders);
}

function loadInitialSection() {
    const initialActiveLink = document.querySelector('.admin-menu .menu-link.active');
    let initialSectionId = 'dashboardContent'; let initialSectionName = 'Dashboard';
    if (initialActiveLink) { initialSectionId = initialActiveLink.getAttribute('data-section') || 'dashboardContent'; initialSectionName = initialActiveLink.querySelector('span')?.textContent || 'Dashboard'; }
    else {
        const firstLink = document.querySelector('.admin-menu .menu-link');
        if (firstLink) { firstLink.classList.add('active'); initialSectionId = firstLink.getAttribute('data-section') || 'dashboardContent'; initialSectionName = firstLink.querySelector('span')?.textContent || 'Dashboard'; const firstSectionElement = document.getElementById(initialSectionId); if (firstSectionElement) firstSectionElement.classList.add('active'); }
    }
    const headerTitle = document.querySelector('.admin-main .header-title'); if(headerTitle) headerTitle.textContent = initialSectionName;
    loadAdminSectionContent(initialSectionId);
}


// --- Sidebar y Navegación (sin cambios) ---
function setupAdminSidebar() {
    const sidebar = document.querySelector('.admin-sidebar'); const main = document.querySelector('.admin-main'); const toggleBtn = document.querySelector('.sidebar-toggle'); const logoutBtn = document.getElementById('adminLogoutButton'); const logoutText = logoutBtn?.querySelector('.logout-text');
    if (!sidebar || !main || !toggleBtn) return;
    toggleBtn.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.toggle('collapsed'); main.classList.toggle('expanded');
        if (logoutText) logoutText.style.display = isCollapsed ? 'none' : 'inline';
        if (logoutBtn) { logoutBtn.style.justifyContent = isCollapsed ? 'center' : 'flex-start'; logoutBtn.querySelector('i').style.marginRight = isCollapsed ? '0' : '8px'; }
    });
    if (sidebar.classList.contains('collapsed') && logoutText) logoutText.style.display = 'none';
    if (logoutBtn && sidebar.classList.contains('collapsed')) { logoutBtn.style.justifyContent = 'center'; logoutBtn.querySelector('i').style.marginRight = '0'; }
}
function setupAdminNavigation() {
    const menuLinks = document.querySelectorAll('.admin-menu .menu-link'); const sections = document.querySelectorAll('.dashboard-section'); const headerTitle = document.querySelector('.admin-main .header-title');
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); const targetSectionId = link.getAttribute('data-section'); const targetSpan = link.querySelector('span'); if (!targetSectionId || !targetSpan) return;
            menuLinks.forEach(l => l.classList.remove('active')); link.classList.add('active');
            let sectionFound = false; sections.forEach(section => { if (section.id === targetSectionId) { section.classList.add('active'); sectionFound = true; } else { section.classList.remove('active'); } });
            if (sectionFound) { if (headerTitle) headerTitle.textContent = targetSpan.textContent; loadAdminSectionContent(targetSectionId); }
            else { console.error(`Sección ${targetSectionId} no encontrada.`); document.getElementById('dashboardContent')?.classList.add('active'); if (headerTitle) headerTitle.textContent = "Dashboard"; document.querySelector('.menu-link[data-section="dashboardContent"]')?.classList.add('active'); loadAdminSectionContent('dashboardContent'); }
        });
    });
}

// --- Carga de Contenido Específico ---
function loadAdminSectionContent(sectionId) {
    console.log("Cargando contenido admin para:", sectionId);
    switch (sectionId) {
        case 'dashboardContent':
            loadDashboardStats();
            loadRecentActivity(); // <--- LLAMAR A LA NUEVA FUNCIÓN AQUÍ
            break;
        case 'productsContent':
            loadProductsTable();
            break;
        case 'reportsContent':
            initializeCharts();
            break;
        case 'ordersContent':
            loadAdminOrders();
            break;
        case 'customersContent':
            loadCustomersTable();
            break;
        // Añadir caso para 'configuracionContent' si necesita carga dinámica
        case 'configuracionContent':
             console.log("Cargando sección de configuración (actualmente estática).");
             // Si en el futuro necesitas cargar algo dinámico aquí (ej. lista de imágenes del carrusel),
             // lo harías llamando a una función como loadCarouselImages();
             break;
        default:
            console.log(`No hay carga específica definida para la sección admin: ${sectionId}`);
    }
}

// --- Nueva Función: Cargar Actividad Reciente ---
async function loadRecentActivity() {
    console.log("Cargando actividad reciente...");
    const recentOrdersList = document.getElementById('recentOrdersList');
    const recentCustomersList = document.getElementById('recentCustomersList');
    const recentProductsList = document.getElementById('recentProductsList');

    // Función auxiliar para mostrar placeholders de carga/vacío
    const setListPlaceholder = (listElement, message) => {
        if (listElement) {
            listElement.innerHTML = `<li class="${message.includes('Cargando') ? 'loading' : 'empty'}-placeholder">${message}</li>`;
        }
    };

    // Mostrar placeholders de carga inicial
    setListPlaceholder(recentOrdersList, 'Cargando pedidos...');
    setListPlaceholder(recentCustomersList, 'Cargando clientes...');
    setListPlaceholder(recentProductsList, 'Cargando productos...');

    try {
        // Cargar Pedidos Recientes (usando endpoint existente, limitando en frontend)
        const ordersResult = await makeAdminApiCall(`${API_BASE}/admin/orders`, 'GET');
        if (ordersResult.success && Array.isArray(ordersResult.data)) {
            const recentOrders = ordersResult.data.slice(0, RECENT_ACTIVITY_LIMIT); // Limita aquí
            if (recentOrders.length > 0) {
                recentOrdersList.innerHTML = recentOrders.map(renderRecentOrder).join('');
            } else {
                setListPlaceholder(recentOrdersList, 'No hay pedidos recientes.');
            }
        } else {
            setListPlaceholder(recentOrdersList, 'Error al cargar pedidos.');
            console.error("Error cargando pedidos recientes:", ordersResult.message);
        }

        // Cargar Clientes Recientes (usando endpoint existente, limitando en frontend)
        const customersResult = await makeAdminApiCall(`${API_BASE}/admin/users`, 'GET');
        if (customersResult.success && Array.isArray(customersResult.data)) {
            const recentCustomers = customersResult.data.slice(0, RECENT_ACTIVITY_LIMIT); // Limita aquí
            if (recentCustomers.length > 0) {
                recentCustomersList.innerHTML = recentCustomers.map(renderRecentCustomer).join('');
            } else {
                setListPlaceholder(recentCustomersList, 'No hay clientes recientes.');
            }
        } else {
            setListPlaceholder(recentCustomersList, 'Error al cargar clientes.');
            console.error("Error cargando clientes recientes:", customersResult.message);
        }

        // Cargar Productos Recientes (usando endpoint público, limitando en frontend)
        // Nota: La ruta pública solo muestra productos activos. Si quieres ver inactivos también, necesitarías una ruta admin.
        const productsResponse = await fetch(`${API_BASE}/products`); // Ruta pública
        if (productsResponse.ok) {
            const products = await productsResponse.json();
            if (Array.isArray(products)) {
                 // Ordenar por fecha de creación si existe, si no, no se puede ordenar fiablemente
                 products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                 const recentProducts = products.slice(0, RECENT_ACTIVITY_LIMIT);
                if (recentProducts.length > 0) {
                    recentProductsList.innerHTML = recentProducts.map(renderRecentProduct).join('');
                } else {
                    setListPlaceholder(recentProductsList, 'No hay productos recientes.');
                }
            } else {
                 setListPlaceholder(recentProductsList, 'Respuesta inválida del servidor.');
            }
        } else {
            setListPlaceholder(recentProductsList, 'Error al cargar productos.');
            console.error("Error cargando productos recientes:", productsResponse.statusText);
        }

    } catch (error) {
        console.error("Error general al cargar actividad reciente:", error);
        // Podrías poner un mensaje de error más genérico en las listas si falla la carga general
        setListPlaceholder(recentOrdersList, 'Error de carga.');
        setListPlaceholder(recentCustomersList, 'Error de carga.');
        setListPlaceholder(recentProductsList, 'Error de carga.');
    }
}

// --- Funciones Renderer para Actividad Reciente ---

function renderRecentOrder(order) {
    const orderId = order.orderId || order._id.slice(-6); // Usa orderId legible o parte del _id
    const customerName = order.deliveryDetails?.nombre || (order.userId?.nombre) || (order.isGuestOrder ? 'Invitado' : 'Usuario Desconocido');
    const timestamp = order.createdAt ? formatRelativeTime(new Date(order.createdAt)) : '-';
    const statusClass = `status-${order.status?.toLowerCase() || 'pending'}`;
    return `
        <li>
            <span class="item-info">
                <span class="item-id">Pedido #${orderId}</span>
                <span class="item-details">por ${customerName} - $${(order.totalAmount || 0).toFixed(2)}</span>
            </span>
            <span class="item-status ${statusClass}">${order.status || 'Pendiente'}</span>
            <span class="item-timestamp" title="${new Date(order.createdAt).toLocaleString()}">${timestamp}</span>
        </li>
    `;
}

function renderRecentCustomer(customer) {
    const customerName = customer.nombre || 'Cliente Sin Nombre';
    const customerEmail = customer.email || '-';
    const timestamp = customer.createdAt ? formatRelativeTime(new Date(customer.createdAt)) : '-';
    return `
        <li>
            <span class="item-info">
                 <span class="item-id">${customerName}</span>
                 <span class="item-details">${customerEmail}</span>
            </span>
            <span class="item-timestamp" title="${new Date(customer.createdAt).toLocaleString()}">${timestamp}</span>
        </li>
    `;
}

function renderRecentProduct(product) {
    const productName = product.name || 'Producto Sin Nombre';
    const productCategory = product.category || '-';
    const timestamp = product.createdAt ? formatRelativeTime(new Date(product.createdAt)) : '-';
     const statusClass = product.isActive ? 'status-active' : 'status-inactive';
     const statusText = product.isActive ? 'Activo' : 'Inactivo';
    return `
        <li>
            <span class="item-info">
                 <span class="item-id">${productName}</span>
                 <span class="item-details">Categoría: ${productCategory}</span>
            </span>
             <span class="item-status ${statusClass}">${statusText}</span>
            <span class="item-timestamp" title="${new Date(product.createdAt).toLocaleString()}">${timestamp}</span>
        </li>
    `;
}

// --- Función Utilidad para Tiempo Relativo ---
function formatRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.round((now - date) / 1000);
    const diffInMinutes = Math.round(diffInSeconds / 60);
    const diffInHours = Math.round(diffInMinutes / 60);
    const diffInDays = Math.round(diffInHours / 24);

    if (diffInSeconds < 60) return `hace segs`;
    if (diffInMinutes < 60) return `hace ${diffInMinutes} min`;
    if (diffInHours < 24) return `hace ${diffInHours} hr`;
    if (diffInDays === 1) return `ayer`;
    if (diffInDays < 7) return `hace ${diffInDays} días`;
    // Para fechas más antiguas, mostrar fecha normal
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}


// --- Gestión de Pedidos (Admin - sin cambios funcionales, solo llamada API) ---
async function loadAdminOrders() { /* ... código existente ... */
    console.log("Cargando TODOS los pedidos para admin...");
    const ordersContainer = document.getElementById('adminOrdersList');
    if (!ordersContainer) { console.error("Contenedor de pedidos admin (#adminOrdersList) no encontrado."); return; }
    ordersContainer.innerHTML = '<p style="text-align: center; width: 100%; padding: 2rem 0;">Cargando pedidos... <i class="fas fa-spinner fa-spin"></i></p>';
    try {
        const result = await makeAdminApiCall(`${API_BASE}/admin/orders`, 'GET');
        if (result.success && Array.isArray(result.data)) { displayAdminOrders(result.data); }
        else { throw new Error(result.message || 'No se pudieron cargar los pedidos.'); }
    } catch (error) { console.error("Error al cargar pedidos (admin):", error); ordersContainer.innerHTML = `<p style="text-align: center; width: 100%; color: red; padding: 2rem 0;">Error al cargar pedidos: ${error.message}</p>`; }
}
function displayAdminOrders(orders) { /* ... código existente ... */
    const ordersContainer = document.getElementById('adminOrdersList'); if (!ordersContainer) return;
    if (orders.length === 0) { ordersContainer.innerHTML = '<p style="text-align: center; width: 100%; padding: 2rem 0;">No hay pedidos para mostrar.</p>'; return; }
    ordersContainer.innerHTML = orders.map(renderAdminOrderCard).join(''); filterAdminOrders();
}
function renderAdminOrderCard(order) {
    let orderDateFormatted = 'Fecha inválida'; try { if (order.createdAt) orderDateFormatted = new Date(order.createdAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { }
    let customerInfo = ''; let customerType = '';
    if (order.isGuestOrder) { customerInfo = order.deliveryDetails?.nombre || 'Invitado'; customerType = '<span style="font-size: 0.8em; color: #777;"> (Invitado)</span>'; }
    else if (order.userId) { customerInfo = order.userId.nombre || order.deliveryDetails?.nombre || 'Registrado'; customerType = ''; }
    else { customerInfo = 'Desconocido'; customerType = ''; }
    const customerPhone = order.deliveryDetails?.telefono || '-'; const customerAddress = order.deliveryDetails?.direccion || '-'; const customerZone = order.deliveryDetails?.zona || '-';
    const itemsSummary = order.items.map(item => `${item.quantity}x ${item.name}`).join(', ');
    const statusOptions = [
        { value: 'pending', text: 'Pendiente', class: 'status-pendiente' },
        { value: 'processing', text: 'En preparación', class: 'status-procesando' },
        { value: 'shipped', text: 'En camino', class: 'status-camino' },
        { value: 'delivered', text: 'Entregado', class: 'status-entregado' },
        { value: 'cancelled', text: 'Cancelado', class: 'status-cancelado' }
    ];
    const currentStatus = statusOptions.find(opt => opt.value === order.status) || statusOptions[0];
    const statusBorderClass = `status-border-${order.status}`;
    // Menú personalizado de estados
    const customSelectHTML = `
      <div class="custom-status-select ${currentStatus.class}" data-order-id="${order._id}">
        <button type="button" class="custom-select-btn ${currentStatus.class}">${currentStatus.text} <i class="fas fa-chevron-down"></i></button>
        <ul class="custom-select-options">
          ${statusOptions.map(opt => `<li class="custom-select-option ${opt.class}" data-value="${opt.value}">${opt.text}</li>`).join('')}
        </ul>
      </div>
    `;
    return `
        <div class="order-card-visual ${statusBorderClass}" data-order-db-id="${order._id}" data-order-status="${order.status}">
            <div class="order-card-header"> <div class="order-id"><i class="fas fa-receipt"></i> ${order.orderId || order._id}</div> ${customSelectHTML} </div>
            <div class="order-card-body">
                <div class="order-info-row"> <i class="fas fa-user"></i> <strong>Cliente:</strong> ${customerInfo}${customerType} </div>
                <div class="order-info-row"> <i class="fas fa-phone"></i> <strong>Teléfono:</strong> ${customerPhone} </div>
                <div class="order-info-row"> <i class="fas fa-map-marker-alt"></i> <strong>Dirección de entrega:</strong> ${customerAddress} (${customerZone}) </div>
                <div class="order-info-row"> <i class="fas fa-calendar-alt"></i> <strong>Fecha de reserva:</strong> ${orderDateFormatted} </div>
                <div class="order-info-row"> <i class="fas fa-dollar-sign"></i> <strong>Total:</strong> $${(order.totalAmount || 0).toFixed(2)} </div>
                <div class="order-info-row"> <i class="fas fa-list"></i> <strong>Productos:</strong> <div class="order-items-summary" title="${itemsSummary}">${itemsSummary}</div> </div>
            </div>
            <div class="order-card-actions"> <button class="action-btn view-btn" title="Ver detalles (Pendiente)" data-id="${order._id}"><i class="fas fa-eye"></i> Ver</button> <button class="action-btn print-btn" title="Imprimir (Pendiente)" data-id="${order._id}"><i class="fas fa-print"></i> Imprimir</button> </div>
        </div>`;
}
async function handleOrderStatusChange(event) { /* ... código existente ... */
    if (event.target.classList.contains('status-select')) {
        const selectElement = event.target; const orderId = selectElement.dataset.orderId; const newStatus = selectElement.value;
        console.log(`Actualizando estado del pedido ${orderId} a ${newStatus}`); selectElement.disabled = true;
        try {
            const result = await makeAdminApiCall(`${API_BASE}/admin/orders/${orderId}/status`, 'PATCH', { status: newStatus });
            if (result.success) { showAdminNotification(`Pedido ${result.data?.orderId || orderId} actualizado a ${newStatus}.`, 'success'); const card = selectElement.closest('.order-card-visual'); if (card) { card.dataset.orderStatus = newStatus; card.className = card.className.replace(/status-border-\w+/, `status-border-${newStatus}`); } filterAdminOrders(); }
            else { showAdminNotification(`Error al actualizar: ${result.message}`, 'error'); const card = selectElement.closest('.order-card-visual'); if(card) selectElement.value = card.dataset.orderStatus; }
        } catch (error) { showAdminNotification(`Error de red: ${error.message}`, 'error'); const card = selectElement.closest('.order-card-visual'); if(card) selectElement.value = card.dataset.orderStatus; }
        finally { selectElement.disabled = false; }
    }
}
function filterAdminOrders() { /* ... código existente ... */
    const filterSelect = document.getElementById('orderStatusFilter'); const selectedStatus = filterSelect ? filterSelect.value : 'all'; const orderCards = document.querySelectorAll('#adminOrdersList .order-card-visual'); let visibleCount = 0;
    console.log(`Filtrando pedidos por estado: ${selectedStatus}`);
    orderCards.forEach(card => { const cardStatus = card.dataset.orderStatus; if (selectedStatus === 'all' || cardStatus === selectedStatus) { card.style.display = 'flex'; visibleCount++; } else { card.style.display = 'none'; } });
    const ordersContainer = document.getElementById('adminOrdersList'); const noOrdersMessage = ordersContainer.querySelector('.no-orders-message');
    if (visibleCount === 0 && ordersContainer) { if (!noOrdersMessage) { const p = document.createElement('p'); p.className = 'no-orders-message'; p.textContent = `No hay pedidos con el estado "${selectedStatus}".`; p.style.textAlign = 'center'; p.style.width = '100%'; p.style.padding = '2rem 0'; ordersContainer.appendChild(p); } }
    else if (noOrdersMessage) { noOrdersMessage.remove(); }
}


// --- Gestión de Productos (sin cambios funcionales) ---
function setupProductForm() { /* ... código existente ... */
    const addProductForm = document.getElementById('addProductForm'); const addProductMessage = document.getElementById('addProductMessage'); if (!addProductForm || !addProductMessage) return;
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault(); addProductMessage.textContent = ''; addProductMessage.style.color = 'inherit'; const formData = new FormData(addProductForm); const productData = { name: formData.get('productName')?.trim(), price: parseFloat(formData.get('productPrice')), category: formData.get('productCategory'), stock: parseInt(formData.get('productStock'), 10) || 0, description: formData.get('productDescription')?.trim(), imageUrl: formData.get('productImageUrl')?.trim() }; if (!productData.name || !productData.price || !productData.category || isNaN(productData.price) || productData.price < 0 || isNaN(productData.stock) || productData.stock < 0 || (productData.imageUrl && !isValidHttpUrl(productData.imageUrl))) { addProductMessage.textContent = 'Verifica los campos.'; addProductMessage.style.color = 'red'; return; } const submitButton = addProductForm.querySelector('button[type="submit"]'); submitButton.disabled = true; submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        try { const result = await makeAdminApiCall(`${API_BASE}/products`, 'POST', productData); if (result.success) { addProductMessage.textContent = result.message || '¡Producto guardado!'; addProductMessage.style.color = 'green'; addProductForm.reset(); loadProductsTable(); } else { let errorMessage = result.message || `Error`; if (result.errors) errorMessage += ': ' + result.errors.join(', '); addProductMessage.textContent = errorMessage; addProductMessage.style.color = 'red'; } } catch (error) { addProductMessage.textContent = error.message || 'Error de red.'; addProductMessage.style.color = 'red'; console.error(error); } finally { submitButton.disabled = false; submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Producto'; }
    });
}
async function loadProductsTable() { /* ... código existente ... */
    const tableBody = document.querySelector('#productsContent .products-table-container tbody'); if (!tableBody) return; tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando...</td></tr>';
    try { const response = await fetch(`${API_BASE}/products`); if (!response.ok) throw new Error(`Error ${response.status}`); const products = await response.json(); if (!Array.isArray(products)) throw new Error("Respuesta inválida"); if (products.length === 0) { tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay productos.</td></tr>'; return; }
    tableBody.innerHTML = products.map(p => `<tr data-product-id="${p._id}"><td><img src="${p.imageUrl || '/images/placeholder.png'}" alt="${p.name}" class="product-thumbnail" onerror="this.src='/images/placeholder.png'"></td><td>${p.name || '-'}</td><td>$${(p.price || 0).toFixed(2)}</td><td>${p.category || '-'}</td><td>${p.stock ?? '-'}</td><td><span class="status-badge ${p.isActive ? 'success' : 'danger'}">${p.isActive ? 'Activo' : 'Inactivo'}</span></td><td><button class="action-btn view-btn" title="Ver" data-id="${p._id}"><i class="fas fa-eye"></i></button><button class="action-btn edit-btn" title="Editar" data-id="${p._id}"><i class="fas fa-edit"></i></button><button class="action-btn delete-btn" title="Eliminar" data-id="${p._id}"><i class="fas fa-trash"></i></button></td></tr>`).join('');
    } catch (error) { console.error("Error cargando productos:", error); tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Error: ${error.message}</td></tr>`; }
}
function setupActionButtons() { /* ... código existente ... */
    const productsTableContainer = document.querySelector('#productsContent .products-table-container'); const customersTableContainer = document.querySelector('#customersContent .customers-table-container');
    const handleTableClick = (e) => { const button = e.target.closest('.action-btn'); if (!button) return; const productId = button.closest('tr')?.dataset.productId; const customerId = button.closest('tr')?.dataset.customerId; if (productId) { if (button.classList.contains('edit-btn')) handleEditProduct(productId); else if (button.classList.contains('delete-btn')) handleDeleteProduct(productId); else if (button.classList.contains('view-btn')) handleViewProduct(productId); } else if (customerId) { if (button.classList.contains('edit-btn')) handleEditCustomer(customerId); else if (button.classList.contains('delete-btn')) handleDeleteCustomer(customerId); else if (button.classList.contains('view-btn')) handleViewCustomer(customerId); } };
    if (productsTableContainer) productsTableContainer.addEventListener('click', handleTableClick); if (customersTableContainer) customersTableContainer.addEventListener('click', handleTableClick);
}
function handleEditProduct(productId) { showAdminNotification(`PENDIENTE: Editar producto ${productId}`, 'info'); }
function handleViewProduct(productId) { showAdminNotification(`PENDIENTE: Ver producto ${productId}`, 'info'); }
async function handleDeleteProduct(productId) { /* ... código existente ... */
    if (!confirm(`¿Eliminar producto ID ${productId}?`)) return;
    try { const result = await makeAdminApiCall(`${API_BASE}/products/${productId}`, 'DELETE'); if (result.success) { showAdminNotification("Producto eliminado.", "success"); loadProductsTable(); } else { showAdminNotification(`Error: ${result.message || 'Desconocido'}`, "error"); } } catch (error) { showAdminNotification(error.message || "Error de red.", "error"); console.error(error); }
}
function handleEditCustomer(customerId) { showAdminNotification(`PENDIENTE: Editar cliente ${customerId}`, 'info'); }
function handleViewCustomer(customerId) { showAdminNotification(`PENDIENTE: Ver cliente ${customerId}`, 'info'); }
async function handleDeleteCustomer(customerId) { if (!confirm(`¿Eliminar cliente ID ${customerId}?`)) return; showAdminNotification(`PENDIENTE: Eliminar cliente ${customerId}.`, 'warning'); }


// --- Gestión de Clientes (sin cambios funcionales) ---
async function loadCustomersTable() { /* ... código existente ... */
    console.log("Cargando tabla de clientes..."); const tableBody = document.querySelector('#customersContent .customers-table-container tbody'); if (!tableBody) { console.error("Contenedor tbody clientes no encontrado."); return; } tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando... <i class="fas fa-spinner fa-spin"></i></td></tr>';
    try { const result = await makeAdminApiCall(`${API_BASE}/admin/users`, 'GET'); if (!result.success || !Array.isArray(result.data)) throw new Error(result.message || "Respuesta inválida."); const customers = result.data; console.log("Clientes recibidos:", customers); if (customers.length === 0) { tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay clientes.</td></tr>'; return; }
    tableBody.innerHTML = customers.map(customer => { let registrationDateFormatted = '-'; try { if (customer.createdAt) registrationDateFormatted = new Date(customer.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch (e) { } const orderCount = customer.orderCount || 0;
    return `<tr data-customer-id="${customer._id}"><td>#${customer._id.slice(-6)}</td><td>${customer.nombre || '-'} ${customer.apellidos || ''}</td><td>${customer.email || '-'}</td><td>${customer.telefono || '-'}</td><td>${registrationDateFormatted}</td><td>${orderCount}</td><td><button class="action-btn view-btn" title="Ver" data-id="${customer._id}"><i class="fas fa-user"></i></button><button class="action-btn edit-btn" title="Editar" data-id="${customer._id}"><i class="fas fa-edit"></i></button><button class="action-btn delete-btn" title="Eliminar" data-id="${customer._id}"><i class="fas fa-trash"></i></button></td></tr>`; }).join('');
    } catch (error) { console.error("Error al cargar clientes:", error); tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Error: ${error.message}</td></tr>`; }
}


// --- Gráficos y Estadísticas (sin cambios funcionales) ---
function initializeCharts() { /* ... código existente ... */
    console.log("Inicializando gráficos..."); const salesCanvas = document.getElementById('salesChart'); const categoryCanvas = document.getElementById('categoryChart'); if (!salesCanvas || !categoryCanvas) return; if (window.myAdminSalesChart) window.myAdminSalesChart.destroy(); if (window.myAdminCategoryChart) window.myAdminCategoryChart.destroy(); const salesData = { labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'], datasets: [{ label: 'Ventas ($)', data: [1200, 1900, 1500, 2100, 1800, 2400], backgroundColor: 'rgba(54, 162, 235, 0.6)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1 }] }; const categoryData = { labels: ['Rolls', 'Nigiri', 'Bebidas', 'Entradas', 'Postres'], datasets: [{ label: 'Ventas por Categoría', data: [45, 15, 25, 10, 5], backgroundColor: ['rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)'], borderWidth: 1 }] }; try { window.myAdminSalesChart = new Chart(salesCanvas, { type: 'bar', data: salesData, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: value => '$' + value } } }, plugins: { legend: { display: false } } } }); } catch(e) { console.error("Error creando salesChart:", e); } try { window.myAdminCategoryChart = new Chart(categoryCanvas, { type: 'pie', data: categoryData, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (c) => `${c.label}: ${c.formattedValue}%` } } } } }); } catch(e) { console.error("Error creando categoryChart:", e); }
}
async function loadDashboardStats() { /* ... código existente ... */
    console.log("Cargando estadísticas del dashboard..."); document.getElementById('statTotalOrders').textContent = '0'; document.getElementById('statTotalCustomers').textContent = '0'; document.getElementById('statMonthlyRevenue').textContent = '$0'; document.getElementById('statActiveProducts').textContent = '0';
    try { const ordersResult = await makeAdminApiCall(`${API_BASE}/admin/orders`, 'GET'); if (ordersResult.success && Array.isArray(ordersResult.data)) { document.getElementById('statTotalOrders').textContent = ordersResult.data.length; const currentMonth = new Date().getMonth(); const currentYear = new Date().getFullYear(); const monthlyRevenue = ordersResult.data.reduce((sum, order) => { const orderDate = new Date(order.createdAt); if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) return sum + (order.totalAmount || 0); return sum; }, 0); document.getElementById('statMonthlyRevenue').textContent = `$${monthlyRevenue.toFixed(2)}`; }
    const customersResult = await makeAdminApiCall(`${API_BASE}/admin/users`, 'GET'); if (customersResult.success && Array.isArray(customersResult.data)) document.getElementById('statTotalCustomers').textContent = customersResult.data.length;
    const productsResponse = await fetch(`${API_BASE}/products`); if (productsResponse.ok) { const products = await productsResponse.json(); if (Array.isArray(products)) document.getElementById('statActiveProducts').textContent = products.filter(p => p.isActive).length; }
    } catch (error) { console.error("Error cargando estadísticas:", error); showAdminNotification("Error al cargar estadísticas.", "error"); }
}

// --- Funciones de Utilidad (sin cambios) ---
function isValidHttpUrl(string) { try { const url = new URL(string); return url.protocol === "http:" || url.protocol === "https:"; } catch (_) { return false; } }
function showAdminNotification(message, type = 'info', duration = 4000) { let notificationElement = document.getElementById('addProductMessage'); let elementCreated = false; if (!notificationElement) { notificationElement = document.createElement('div'); notificationElement.style.cssText = 'position: fixed; bottom: 20px; right: 20px; padding: 15px 25px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 9999; opacity: 0; transition: opacity 0.3s ease;'; document.body.appendChild(notificationElement); elementCreated = true; } notificationElement.textContent = message; notificationElement.style.color = 'white'; switch (type) { case 'success': notificationElement.style.backgroundColor = '#4CAF50'; break; case 'error': notificationElement.style.backgroundColor = '#dc3545'; break; case 'warning': notificationElement.style.backgroundColor = '#ffc107'; notificationElement.style.color = '#333'; break; default: notificationElement.style.backgroundColor = '#17a2b8'; break; } if (elementCreated) requestAnimationFrame(() => notificationElement.style.opacity = '1'); setTimeout(() => { if (elementCreated) { notificationElement.style.opacity = '0'; notificationElement.addEventListener('transitionend', () => notificationElement.remove()); setTimeout(() => notificationElement.remove(), 500); } else { notificationElement.textContent = ''; notificationElement.style.color = 'inherit'; notificationElement.style.backgroundColor = 'transparent'; } }, duration); }
async function makeAdminApiCall(endpoint, method = 'GET', body = null, requireAuth = true) { const headers = { 'Content-Type': 'application/json' }; if (requireAuth) { const token = sessionStorage.getItem(ADMIN_AUTH_KEY); if (!token) { console.error(`Error: Token admin no encontrado para ${method} ${endpoint}`); return { success: false, message: 'No autenticado.', data: null }; } headers['Authorization'] = `Bearer ${token}`; } const config = { method: method.toUpperCase(), headers: headers }; if (body && (config.method === 'POST' || config.method === 'PATCH' || config.method === 'PUT')) config.body = JSON.stringify(body); try { const response = await fetch(endpoint, config); const responseData = await response.json().catch(() => ({})); if (response.ok) return { success: true, data: responseData.data || responseData, message: responseData.message, token: responseData.token }; else { let errorMessage = responseData.message || `Error ${response.status}: ${response.statusText}`; console.error(`API Admin Call Error (${config.method} ${endpoint}): Status ${response.status}, Message: ${errorMessage}`, responseData); if (response.status === 401 || response.status === 403) { adminLogout(); errorMessage = 'Sesión inválida o expirada.'; } return { success: false, message: errorMessage, data: null }; } } catch (error) { console.error(`Network/Fetch Error (${config.method} ${endpoint}):`, error); return { success: false, message: 'Error de red o conexión.', data: null }; } }

// Función para aplicar la clase de color al select según el estado seleccionado
function applyStatusClassToSelect(select) {
  if (!select) return;
  const status = select.value;
  select.classList.remove('status-pendiente', 'status-procesando', 'status-camino', 'status-entregado', 'status-cancelado');
  switch (status) {
    case 'pending': select.classList.add('status-pendiente'); break;
    case 'processing': select.classList.add('status-procesando'); break;
    case 'shipped': select.classList.add('status-camino'); break;
    case 'delivered': select.classList.add('status-entregado'); break;
    case 'cancelled': select.classList.add('status-cancelado'); break;
  }
}
// Aplica la clase de color al filtro de estados
function applyStatusClassToFilter(filter) {
  if (!filter) return;
  const status = filter.value;
  filter.classList.remove('status-pendiente', 'status-procesando', 'status-camino', 'status-entregado', 'status-cancelado');
  switch (status) {
    case 'pending': filter.classList.add('status-pendiente'); break;
    case 'processing': filter.classList.add('status-procesando'); break;
    case 'shipped': filter.classList.add('status-camino'); break;
    case 'delivered': filter.classList.add('status-entregado'); break;
    case 'cancelled': filter.classList.add('status-cancelado'); break;
    default: break;
  }
}
// Llama a estas funciones después de renderizar los pedidos y al cambiar el estado
const originalDisplayAdminOrders = displayAdminOrders;
displayAdminOrders = function(orders) {
  originalDisplayAdminOrders(orders);
  // Aplica la clase a todos los selects de estado
  document.querySelectorAll('.status-select').forEach(applyStatusClassToSelect);
  // Aplica la clase al filtro de estados
  applyStatusClassToFilter(document.getElementById('orderStatusFilter'));
};
// Al cambiar el estado de un pedido
const originalHandleOrderStatusChange = handleOrderStatusChange;
handleOrderStatusChange = async function(event) {
  await originalHandleOrderStatusChange(event);
  if (event.target.classList.contains('status-select')) {
    applyStatusClassToSelect(event.target);
    // Cambia el borde de la tarjeta
    const card = event.target.closest('.order-card-visual');
    if (card) {
      card.classList.remove('status-border-pending', 'status-border-processing', 'status-border-shipped', 'status-border-delivered', 'status-border-cancelled');
      card.classList.add('status-border-' + event.target.value);
    }
  }
};
// Al cambiar el filtro de estados
const statusFilter = document.getElementById('orderStatusFilter');
if (statusFilter) {
  statusFilter.addEventListener('change', function() {
    applyStatusClassToFilter(statusFilter);
  });
  // Aplica la clase al cargar
  applyStatusClassToFilter(statusFilter);
}

// Lógica para el menú personalizado de estados
function setupCustomStatusSelects() {
  // Elimina listeners previos para evitar duplicados
  document.querySelectorAll('.custom-status-select').forEach(select => {
    const btn = select.querySelector('.custom-select-btn');
    const options = select.querySelector('.custom-select-options');
    if (!btn || !options) return;
    btn.onclick = null;
    options.querySelectorAll('.custom-select-option').forEach(opt => { opt.onclick = null; });
  });
  // Agrega listeners nuevos
  document.querySelectorAll('.custom-status-select').forEach(select => {
    const btn = select.querySelector('.custom-select-btn');
    const options = select.querySelector('.custom-select-options');
    if (!btn || !options) return;
    btn.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-status-select.open').forEach(s => { if (s !== select) s.classList.remove('open'); });
      select.classList.toggle('open');
    };
    options.querySelectorAll('.custom-select-option').forEach(opt => {
      opt.onclick = async (e) => {
        e.stopPropagation();
        const newStatus = opt.getAttribute('data-value');
        const orderId = select.getAttribute('data-order-id');
        if (!orderId || !newStatus) return;
        btn.disabled = true;
        try {
          const result = await makeAdminApiCall(`${API_BASE}/admin/orders/${orderId}/status`, 'PATCH', { status: newStatus });
          if (result.success) {
            showAdminNotification(`Pedido actualizado a ${opt.textContent}.`, 'success');
            loadAdminOrders();
          } else {
            showAdminNotification(`Error al actualizar: ${result.message}`, 'error');
          }
        } catch (error) {
          showAdminNotification(`Error de red: ${error.message}`, 'error');
        } finally {
          btn.disabled = false;
          select.classList.remove('open');
        }
      };
    });
  });
  // Cerrar menú si se hace click fuera (solo uno global)
  if (!window._customStatusSelectOutsideClick) {
    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-status-select.open').forEach(s => s.classList.remove('open'));
    });
    window._customStatusSelectOutsideClick = true;
  }
}
// Llamar a setupCustomStatusSelects después de renderizar los pedidos
const originalDisplayAdminOrders_custom = displayAdminOrders;
displayAdminOrders = function(orders) {
  originalDisplayAdminOrders_custom(orders);
  setTimeout(setupCustomStatusSelects, 0); // Asegura que el DOM esté listo
};

// Renderiza el filtro de estados como menú personalizado
function renderCustomStatusFilter() {
  const filterContainer = document.querySelector('.header-actions');
  if (!filterContainer) return;
  // Elimina todos los select nativos y menús previos del filtro
  filterContainer.querySelectorAll('#orderStatusFilter, #customStatusFilter, .custom-status-filter').forEach(el => el.remove());
  // Opciones del filtro
  const statusOptions = [
    { value: 'all', text: 'Todos', class: 'status-todos' },
    { value: 'pending', text: 'Pendiente', class: 'status-pendiente' },
    { value: 'processing', text: 'En preparación', class: 'status-procesando' },
    { value: 'shipped', text: 'En camino', class: 'status-camino' },
    { value: 'delivered', text: 'Entregado', class: 'status-entregado' },
    { value: 'cancelled', text: 'Cancelado', class: 'status-cancelado' }
  ];
  // Estado seleccionado
  let selected = window._adminStatusFilterValue || 'all';
  const currentStatus = statusOptions.find(opt => opt.value === selected) || statusOptions[0];
  // Renderiza el menú
  let html = `<div class="custom-status-filter ${currentStatus.class}" id="customStatusFilter">
    <button type="button" class="custom-select-btn ${currentStatus.class}">${currentStatus.text} <i class="fas fa-chevron-down"></i></button>
    <ul class="custom-select-options">
      ${statusOptions.map(opt => `<li class="custom-select-option ${opt.class}" data-value="${opt.value}">${opt.text}</li>`).join('')}
    </ul>
  </div>`;
  // Inserta el menú al principio de .header-actions
  filterContainer.insertAdjacentHTML('afterbegin', html);
  setupCustomStatusFilter();
}
// Lógica del filtro personalizado
function setupCustomStatusFilter() {
  const filter = document.getElementById('customStatusFilter');
  if (!filter) return;
  const btn = filter.querySelector('.custom-select-btn');
  const options = filter.querySelector('.custom-select-options');
  if (!btn || !options) return;
  btn.onclick = (e) => {
    e.stopPropagation();
    document.querySelectorAll('.custom-status-filter.open').forEach(s => { if (s !== filter) s.classList.remove('open'); });
    filter.classList.toggle('open');
  };
  options.querySelectorAll('.custom-select-option').forEach(opt => {
    opt.onclick = (e) => {
      e.stopPropagation();
      const newValue = opt.getAttribute('data-value');
      window._adminStatusFilterValue = newValue;
      filter.className = 'custom-status-filter ' + opt.className.replace('custom-select-option','').trim();
      btn.className = 'custom-select-btn ' + opt.className.replace('custom-select-option','').trim();
      btn.innerHTML = `${opt.textContent} <i class='fas fa-chevron-down'></i>`;
      filter.classList.remove('open');
      // Filtra los pedidos
      filterAdminOrders();
    };
  });
  // Cerrar menú si se hace click fuera
  if (!window._customStatusFilterOutsideClick) {
    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-status-filter.open').forEach(s => s.classList.remove('open'));
    });
    window._customStatusFilterOutsideClick = true;
  }
}
// Modifico filterAdminOrders para usar el valor global
const originalFilterAdminOrders = filterAdminOrders;
filterAdminOrders = function() {
  const selectedStatus = window._adminStatusFilterValue || 'all';
  const orderCards = document.querySelectorAll('#adminOrdersList .order-card-visual');
  let visibleCount = 0;
  orderCards.forEach(card => {
    const cardStatus = card.dataset.orderStatus;
    if (selectedStatus === 'all' || cardStatus === selectedStatus) {
      card.style.display = 'flex'; visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });
  const ordersContainer = document.getElementById('adminOrdersList');
  const noOrdersMessage = ordersContainer.querySelector('.no-orders-message');
  if (visibleCount === 0 && ordersContainer) {
    if (!noOrdersMessage) {
      const p = document.createElement('p');
      p.className = 'no-orders-message';
      p.textContent = `No hay pedidos con el estado "${selectedStatus}".`;
      p.style.textAlign = 'center';
      p.style.width = '100%';
      p.style.padding = '2rem 0';
      ordersContainer.appendChild(p);
    }
  } else if (noOrdersMessage) {
    noOrdersMessage.remove();
  }
};
// Llamar a renderCustomStatusFilter al cargar la sección de pedidos
const originalLoadAdminOrders = loadAdminOrders;
loadAdminOrders = async function() {
  renderCustomStatusFilter();
  await originalLoadAdminOrders();
};

// Admin Profile Management
async function loadAdminProfile() {
    try {
        const response = await makeAdminApiCall(`${API_BASE}/admin/profile`, 'GET');
        console.log('Respuesta de /api/admin/profile:', response);
        if (response.success && response.data) {
            const admin = response.data;
            // Actualizar formulario de perfil
            document.getElementById('adminFullName').value = admin.fullName || '';
            document.getElementById('adminEmail').value = admin.email || '';
            document.getElementById('adminPhone').value = admin.phone || '';
            document.getElementById('adminRole').value = admin.role || 'admin';
            // Actualizar parte superior de la sección de configuración
            const adminUserName = document.getElementById('adminUserName');
            if (adminUserName) {
                adminUserName.textContent = admin.fullName || admin.username;
            }
            const adminUserRole = document.querySelector('.user-role');
            if (adminUserRole) {
                adminUserRole.textContent = admin.role ? admin.role.charAt(0).toUpperCase() + admin.role.slice(1) : 'Administrador';
            }
            const adminUserEmail = document.getElementById('adminUserEmail');
            if (adminUserEmail) {
                adminUserEmail.textContent = admin.email || '';
            }
            const adminUserPhone = document.getElementById('adminUserPhone');
            if (adminUserPhone) {
                adminUserPhone.textContent = admin.phone || '';
            }
            // Actualizar avatar si existe
            const avatarImg = document.querySelector('.user-avatar');
            if (avatarImg) {
                if (admin.avatar && admin.avatar.data) {
                    // Usar la nueva ruta para obtener la imagen
                    avatarImg.src = `/api/admin/avatar/${admin._id}`;
                    // Agregar manejo de error de carga de imagen
                    avatarImg.onerror = function() {
                        console.error('Error al cargar la imagen del avatar');
                        this.src = '/images/admin-avatar.jpg'; // Imagen por defecto
                    };
                } else {
                    avatarImg.src = '/images/admin-avatar.jpg'; // Imagen por defecto
                }
            }
        } else {
            showNotification('No se pudieron cargar los datos del administrador. Revisa la consola.', 'error');
            console.error('No se recibieron datos válidos del admin:', response);
        }
    } catch (error) {
        console.error('Error loading admin profile:', error);
        showNotification('Error al cargar el perfil. Revisa la consola.', 'error');
    }
}

function setupAdminProfileForms() {
    // Profile form
    const profileForm = document.getElementById('adminProfileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(profileForm);
            const data = {
                fullName: formData.get('fullName'),
                email: formData.get('email'),
                phone: formData.get('phone')
            };

            try {
                const response = await makeAdminApiCall(`${API_BASE}/admin/profile`, 'PUT', data);
                if (response.success) {
                    showNotification('Perfil actualizado correctamente', 'success');
                    loadAdminProfile(); // Reload profile data
                } else {
                    showNotification(response.message || 'Error al actualizar perfil', 'error');
                }
            } catch (error) {
                console.error('Error updating admin profile:', error);
                showNotification('Error al actualizar perfil', 'error');
            }
        });
    }

    // Password form
    const passwordForm = document.getElementById('adminPasswordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(passwordForm);
            const newPassword = formData.get('newPassword');
            const confirmPassword = formData.get('confirmPassword');

            if (newPassword !== confirmPassword) {
                showNotification('Las contraseñas no coinciden', 'error');
                return;
            }

            const data = {
                currentPassword: formData.get('currentPassword'),
                newPassword: newPassword
            };

            try {
                const response = await makeAdminApiCall(`${API_BASE}/admin/password`, 'PUT', data);
                if (response.success) {
                    showNotification('Contraseña actualizada correctamente', 'success');
                    passwordForm.reset();
                } else {
                    showNotification(response.message || 'Error al actualizar contraseña', 'error');
                }
            } catch (error) {
                console.error('Error updating admin password:', error);
                showNotification('Error al actualizar contraseña', 'error');
            }
        });
    }

    // Avatar upload
    const avatarInput = document.getElementById('adminAvatar');
    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('avatar', file);

            try {
                const response = await makeAdminApiCall(`${API_BASE}/admin/avatar`, 'POST', formData, true);
                if (response.success) {
                    showNotification('Avatar actualizado correctamente', 'success');
                    loadAdminProfile(); // Reload profile data
                } else {
                    showNotification(response.message || 'Error al actualizar avatar', 'error');
                }
            } catch (error) {
                console.error('Error updating admin avatar:', error);
                showNotification('Error al actualizar avatar', 'error');
            }
        });
    }
}

