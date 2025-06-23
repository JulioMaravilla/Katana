/**
 * @file admin/modules/customers.js
 * @module AdminCustomers
 * @description Maneja la lógica para la sección de "Clientes" en el panel de administración.
 */

import { makeAdminApiCall } from '../api.js';
import { showAdminNotification } from '../ui.js';

let allCustomersData = [];
let allOrdersData = []; // NUEVO: Guardaremos todos los pedidos aquí

const SELECTORS = {
    TABLE_BODY: '#customersContent .customers-table-container tbody',
    TABLE_CONTAINER: '#customersContent .customers-table-container',
    SEARCH_INPUT: '#customersContent .search-box input',
    // Selectores del nuevo modal
    VIEW_MODAL: '#customerViewModal',
    CLOSE_VIEW_MODAL_BTN: '#closeCustomerViewModalBtn',
    VIEW_NAME: '#customer-view-name',
    VIEW_EMAIL: '#customer-view-email',
    VIEW_PHONE: '#customer-view-phone',
    VIEW_ORDERS_LIST: '#customer-view-orders-list'
};

/**
 * Inicializa la sección de gestión de clientes.
 */
export function initializeCustomers() {
    console.log("Módulo de Clientes inicializado.");
    loadCustomersAndOrders();
    setupCustomerActionHandlers();
    setupCustomerSearch();

    // Listener para cerrar el nuevo modal
    const closeModalBtn = document.querySelector(SELECTORS.CLOSE_VIEW_MODAL_BTN);
    closeModalBtn?.addEventListener('click', () => {
        document.querySelector(SELECTORS.VIEW_MODAL).style.display = 'none';
    });
}

/**
 * Configura el listener para el campo de búsqueda.
 */
function setupCustomerSearch() {
    // ... (código de búsqueda sin cambios)
    const searchInput = document.querySelector(SELECTORS.SEARCH_INPUT);
    if (!searchInput) return;

    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase().trim();
        const filteredCustomers = allCustomersData.filter(customer => {
            const fullName = `${customer.nombre || ''} ${customer.apellidos || ''}`.toLowerCase();
            const email = (customer.email || '').toLowerCase();
            const phone = (customer.telefono || '').toString().toLowerCase();
            return fullName.includes(searchTerm) || email.includes(searchTerm) || phone.includes(searchTerm);
        });
        displayCustomers(filteredCustomers);
    });
}


/**
 * Carga TODOS los clientes y TODOS los pedidos, y luego une los datos.
 */
async function loadCustomersAndOrders() {
    const tableBody = document.querySelector(SELECTORS.TABLE_BODY);
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando... <i class="fas fa-spinner fa-spin"></i></td></tr>';

    try {
        const [usersResult, ordersResult] = await Promise.all([
            makeAdminApiCall('/admin/users', 'GET'),
            makeAdminApiCall('/admin/orders', 'GET')
        ]);

        if (!usersResult.success || !Array.isArray(usersResult.data)) throw new Error("No se pudieron cargar los usuarios.");
        if (!ordersResult.success || !Array.isArray(ordersResult.data)) throw new Error("No se pudieron cargar los pedidos.");

        const customers = usersResult.data;
        allOrdersData = ordersResult.data; // Guardamos la lista completa de pedidos
        
        const orderCounts = new Map();
        for (const order of allOrdersData) {
            if (order.userId) {
                const userIdStr = typeof order.userId === 'object' ? order.userId._id.toString() : order.userId.toString();
                orderCounts.set(userIdStr, (orderCounts.get(userIdStr) || 0) + 1);
            }
        }

        const customersWithCount = customers.map(customer => ({
            ...customer,
            orderCount: orderCounts.get(customer._id.toString()) || 0
        }));

        allCustomersData = customersWithCount;
        displayCustomers(allCustomersData);

    } catch (error) {
        console.error("Error al cargar y procesar clientes/pedidos:", error);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Error: ${error.message}</td></tr>`;
    }
}

/**
 * Muestra la lista de clientes en la tabla del DOM.
 */
function displayCustomers(customers) {
    // ... (código sin cambios)
    const tableBody = document.querySelector(SELECTORS.TABLE_BODY);
    if (!tableBody) return;
    if (customers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No se encontraron clientes.</td></tr>';
        return;
    }
    tableBody.innerHTML = customers.map(customer => renderCustomerRow(customer)).join('');
}

/**
 * Renderiza una fila de la tabla para un cliente.
 */
function renderCustomerRow(customer) {
    // ... (código sin cambios)
    let registrationDateFormatted = 'N/A';
    try {
        if (customer.createdAt) {
            registrationDateFormatted = new Date(customer.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
    } catch (e) { console.warn("Error formateando fecha:", e); }
    const orderCount = customer.orderCount !== undefined ? customer.orderCount : 0;
    
    // Aplicar sombreado si la cuenta está inactiva
    const isInactive = customer.isActive === false;
    const rowStyle = isInactive ? 'style="background-color: #edbcb7;"' : '';
    
    return `
        <tr data-customer-id="${customer._id}" ${rowStyle}>
            <td>#${customer._id.slice(-6).toUpperCase()}</td>
            <td>${customer.nombre || ''} ${customer.apellidos || ''}</td>
            <td>${customer.email || '-'}</td>
            <td>${customer.telefono || '-'}</td>
            <td>${registrationDateFormatted}</td>
            <td>${orderCount}</td>
            <td>
                <button class="action-btn view-btn" title="Ver" data-id="${customer._id}"><i class="fas fa-eye"></i></button>
            </td>
        </tr>`;
}


/**
 * Configura un único listener para los botones de acción en la tabla de clientes.
 */
function setupCustomerActionHandlers() {
    const tableContainer = document.querySelector(SELECTORS.TABLE_CONTAINER);
    if (!tableContainer || tableContainer.dataset.customerListener === 'true') return;
    tableContainer.dataset.customerListener = 'true';

    tableContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.action-btn');
        if (!button) return;
        const customerId = button.dataset.id;
        if (!customerId) return;

        if (button.classList.contains('view-btn')) {
            handleViewCustomer(customerId); // <-- ESTA ES LA FUNCIÓN QUE IMPLEMENTAREMOS
        }
        // ... otros botones
    });
}

/**
 * Muestra el modal con los detalles de un cliente y su historial de pedidos.
 * @param {string} customerId
 */
function handleViewCustomer(customerId) {
    const customer = allCustomersData.find(c => c._id === customerId);
    if (!customer) {
        showAdminNotification("Cliente no encontrado.", "error");
        return;
    }

    // Poblar los datos del cliente en el modal
    document.querySelector(SELECTORS.VIEW_NAME).textContent = `${customer.nombre || ''} ${customer.apellidos || ''}`;
    document.querySelector(SELECTORS.VIEW_EMAIL).textContent = customer.email || '-';
    document.querySelector(SELECTORS.VIEW_PHONE).textContent = customer.telefono || '-';

    // Filtrar los pedidos para este cliente específico
    const customerOrders = allOrdersData.filter(order => (order.userId?._id || order.userId)?.toString() === customer._id);
    
    const ordersListEl = document.querySelector(SELECTORS.VIEW_ORDERS_LIST);
    if (customerOrders.length > 0) {
        ordersListEl.innerHTML = customerOrders.map(order => {
            const orderDate = new Date(order.createdAt).toLocaleDateString('es-ES');
            return `<li><span class="order-id">#${order.orderId || order._id}</span> <span class="order-date">${orderDate}</span></li>`;
        }).join('');
    } else {
        ordersListEl.innerHTML = '<li class="no-orders-message">Este usuario no ha realizado pedidos.</li>';
    }

    // Mostrar el modal
    document.querySelector(SELECTORS.VIEW_MODAL).style.display = 'flex';
}