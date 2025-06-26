/**
 * @file admin/modules/dashboard.js
 * @module AdminDashboard
 * @description Maneja la lógica para la sección principal del Dashboard, incluyendo estadísticas y actividad reciente.
 */

import { makeAdminApiCall } from '../api.js';
import { formatRelativeTime } from '../utils.js';

// --- Constantes y Selectores ---
const RECENT_ACTIVITY_LIMIT = 5;

const SELECTORS = {
    // Estadísticas
    STAT_TOTAL_ORDERS: '#statTotalOrders',
    STAT_TOTAL_CUSTOMERS: '#statTotalCustomers',
    STAT_MONTHLY_REVENUE: '#statMonthlyRevenue',
    STAT_ACTIVE_PRODUCTS: '#statActiveProducts',
    // Listas de Actividad Reciente
    RECENT_ORDERS_LIST: '#recentOrdersList',
    RECENT_CUSTOMERS_LIST: '#recentCustomersList',
    RECENT_PRODUCTS_LIST: '#recentProductsList'
};

/**
 * Inicializa el contenido del dashboard principal.
 */
export function initializeDashboardContent() {
    console.log("Módulo de Dashboard principal inicializado.");
    loadDashboardStats();
    loadWeeklyStatusPanel(); 
    loadWeeklyActivityPanel();
}

/**
 * CORREGIDO: Carga las estadísticas semanales desde la nueva ruta de la API.
 */
async function loadDashboardStats() {
    console.log("Cargando estadísticas unificadas del dashboard...");

    // Seleccionamos los nuevos elementos del DOM
    const ordersEl = document.getElementById('statWeeklyOrders');
    const revenueEl = document.getElementById('statWeeklyRevenue');
    const topProductEl = document.getElementById('statTopProduct');
    const newCustomersEl = document.getElementById('statNewCustomersValue');
    const recurringCustomersEl = document.getElementById('statRecurringCustomersValue');

    try {
        // Hacemos una única llamada a la API unificada
        const result = await makeAdminApiCall('/admin/reports/weekly-activity', 'GET');

        if (result.success && result.data) {
            const metrics = result.data;

            // Actualizamos las 4 tarjetas principales
            if (ordersEl) ordersEl.textContent = metrics.weeklyOrdersCount || 0;
            if (revenueEl) revenueEl.textContent = `$${(metrics.weeklyRevenue || 0).toFixed(2)}`;
            if (topProductEl) topProductEl.textContent = metrics.topProduct || 'N/A';
            if (newCustomersEl) newCustomersEl.textContent = metrics.growth.newCustomers || 0;
            if (recurringCustomersEl) recurringCustomersEl.textContent = metrics.growth.recurringCustomers || 0;
        } else {
            showAdminNotification('No se pudieron cargar las métricas.', 'error');
        }
    } catch (error) {
        console.error("Error cargando estadísticas del dashboard:", error);
        showAdminNotification('Error de red al cargar las métricas.', 'error');
    }
}

// --- INICIO DE LA NUEVA FUNCIÓN ---
/**
 * Carga y muestra las métricas del panel de estado semanal.
 */
async function loadWeeklyStatusPanel() {
    const result = await makeAdminApiCall('/admin/reports/weekly-status', 'GET');

    if (result.success && result.data) {
        const metrics = result.data;
        document.getElementById('statusPendingCount').textContent = metrics.pending || 0;
        document.getElementById('statusProcessingCount').textContent = metrics.processing || 0;
        document.getElementById('statusShippedCount').textContent = metrics.shipped || 0;
        document.getElementById('totalToCollectValue').textContent = `$${(metrics.totalToCollect || 0).toFixed(2)}`;
    } else {
        console.error("No se pudieron cargar las métricas de estado semanal.");
    }
}

/**
 * CORREGIDO: Carga y muestra los datos del panel de Resumen Operativo Semanal,
 * con un manejo de errores robusto.
 */
async function loadWeeklyActivityPanel() {
    console.log("Cargando resumen operativo semanal...");

    const topCustomersList = document.getElementById('topCustomersList');
    const topProductsList = document.getElementById('topProductsList');
    const orderSourceList = document.getElementById('orderSourceList');

    // Placeholders de carga
    if (topCustomersList) topCustomersList.innerHTML = '<li class="loading-placeholder">Cargando...</li>';
    if (topProductsList) topProductsList.innerHTML = '<li class="loading-placeholder">Cargando...</li>';
    if (orderSourceList) orderSourceList.innerHTML = '<li class="loading-placeholder">Cargando...</li>';

    try {
        const result = await makeAdminApiCall('/admin/reports/weekly-activity', 'GET');

        if (result.success && result.data) {
            // Desestructuramos los datos que vienen de la API
            const { 
                topCustomers = [], 
                topProducts = [], 
                orderSource = { registered: 0, guest: 0, manual: 0 } 
            } = result.data;

            // Renderizar Top Clientes
            if (topCustomersList) {
                if (topCustomers.length > 0) {
                    topCustomersList.innerHTML = topCustomers.map((customer, index) => `
                        <li>
                            <span class="item-info">
                                <span class="item-id"><strong>#${index + 1}</strong> ${customer.name}</span>
                                <span class="item-details">Total gastado: $${(customer.total || 0).toFixed(2)}</span>
                            </span>
                        </li>
                    `).join('');
                } else {
                    topCustomersList.innerHTML = '<li class="empty-placeholder">No hay ventas esta semana.</li>';
                }
            }

            // Renderizar Top Productos
            if (topProductsList) {
                if (topProducts.length > 0) {
                    topProductsList.innerHTML = topProducts.map((product, index) => `
                        <li>
                            <span class="item-info">
                                <span class="item-id"><strong>#${index + 1}</strong> ${product.name}</span>
                                <span class="item-details">${product.quantity} vendidos - Ingresos: $${(product.revenue || 0).toFixed(2)}</span>
                            </span>
                        </li>
                    `).join('');
                } else {
                    topProductsList.innerHTML = '<li class="empty-placeholder">No hay productos vendidos.</li>';
                }
            }
            
            // Renderizar Origen de Pedidos
            if (orderSourceList) {
                orderSourceList.innerHTML = `
                    <li class="source-item">
                        <i class="fas fa-user-check registered"></i>
                        <span class="item-info"><span class="item-id">${orderSource.registered} Registrados</span></span>
                    </li>
                    <li class="source-item">
                        <i class="fas fa-user-clock guest"></i>
                        <span class="item-info"><span class="item-id">${orderSource.guest} Invitados</span></span>
                    </li>
                    <li class="source-item">
                        <i class="fas fa-edit manual"></i>
                        <span class="item-info"><span class="item-id">${orderSource.manual} Manuales</span></span>
                    </li>
                `;
            }

        } else {
            throw new Error(result.message || 'No se pudieron cargar los datos de actividad.');
        }

    } catch (error) {
        console.error("Error al cargar actividad semanal:", error);
        const errorMessage = '<li class="empty-placeholder" style="color: red;">Error al cargar.</li>';
        if (topCustomersList) topCustomersList.innerHTML = errorMessage;
        if (topProductsList) topProductsList.innerHTML = errorMessage;
        if (orderSourceList) orderSourceList.innerHTML = errorMessage;
    }
}

/**
 * Función genérica para renderizar items en una lista de actividad.
 * @param {string} selector - El selector del contenedor de la lista (ul).
 * @param {object} result - El resultado de la llamada a la API.
 * @param {function(object): string} renderFunction - La función que renderiza cada item a HTML.
 * @param {string} emptyMessage - Mensaje a mostrar si no hay items.
 */
function renderRecentItems(selector, result, renderFunction, emptyMessage) {
    const listElement = document.querySelector(selector);
    if (!listElement) return;

    const items = result.success ? (result.data || result) : [];
    if (Array.isArray(items) && items.length > 0) {
        listElement.innerHTML = items.map(renderFunction).join('');
    } else {
        setListPlaceholder(selector, result.success ? emptyMessage : 'Error al cargar datos.');
    }
}

/**
 * Renderiza el HTML para un item de pedido reciente.
 * @param {object} order - El objeto del pedido.
 * @returns {string} HTML del elemento de la lista.
 */
function renderRecentOrder(order) {
    const customerName = order.deliveryDetails?.nombre || (order.isGuestOrder ? 'Invitado' : 'Usuario');
    const timestamp = order.createdAt ? formatRelativeTime(new Date(order.createdAt)) : '-';
    return `
        <li>
            <span class="item-info">
                <span class="item-id">Pedido #${order.orderId || order._id.slice(-6)}</span>
                <span class="item-details">por ${customerName} - $${(order.totalAmount || 0).toFixed(2)}</span>
            </span>
            <span class="item-timestamp" title="${new Date(order.createdAt).toLocaleString()}">${timestamp}</span>
        </li>`;
}

/**
 * Renderiza el HTML para un item de cliente reciente.
 * @param {object} customer - El objeto del cliente.
 * @returns {string} HTML del elemento de la lista.
 */
function renderRecentCustomer(customer) {
    const timestamp = customer.createdAt ? formatRelativeTime(new Date(customer.createdAt)) : '-';
    return `
        <li>
            <span class="item-info">
                 <span class="item-id">${customer.nombre || 'Cliente sin nombre'}</span>
                 <span class="item-details">${customer.email}</span>
            </span>
            <span class="item-timestamp" title="${new Date(customer.createdAt).toLocaleString()}">${timestamp}</span>
        </li>`;
}

/**
 * Renderiza el HTML para un item de producto reciente.
 * @param {object} product - El objeto del producto.
 * @returns {string} HTML del elemento de la lista.
 */
function renderRecentProduct(product) {
    const timestamp = product.createdAt ? formatRelativeTime(new Date(product.createdAt)) : '-';
    const statusClass = product.isActive ? 'status-active' : 'status-inactive';
    return `
        <li>
            <span class="item-info">
                 <span class="item-id">${product.name}</span>
                 <span class="item-details">Categoría: ${product.category}</span>
            </span>
            <span class="item-status ${statusClass}">${product.isActive ? 'Activo' : 'Inactivo'}</span>
            <span class="item-timestamp" title="${new Date(product.createdAt).toLocaleString()}">${timestamp}</span>
        </li>`;
}

/**
 * Establece un mensaje de placeholder en una lista.
 * @param {string} selector - El selector del elemento de la lista.
 * @param {string} message - El mensaje a mostrar.
 */
function setListPlaceholder(selector, message) {
    const listElement = document.querySelector(selector);
    if (listElement) {
        const className = message.includes('Cargando') ? 'loading-placeholder' : 'empty-placeholder';
        listElement.innerHTML = `<li class="${className}">${message}</li>`;
    }
}
