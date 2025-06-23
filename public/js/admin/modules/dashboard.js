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
    loadRecentActivity();
}

/**
 * Carga las estadísticas principales del dashboard (tarjetas de resumen).
 */
async function loadDashboardStats() {
    console.log("Cargando estadísticas del dashboard...");
    // Resetear los valores a 'cargando'
    document.querySelector(SELECTORS.STAT_TOTAL_ORDERS).textContent = '...';
    document.querySelector(SELECTORS.STAT_TOTAL_CUSTOMERS).textContent = '...';
    document.querySelector(SELECTORS.STAT_MONTHLY_REVENUE).textContent = '$...';
    document.querySelector(SELECTORS.STAT_ACTIVE_PRODUCTS).textContent = '...';
    
    try {
        // Se pueden hacer las llamadas en paralelo para mayor eficiencia
        const [ordersResult, customersResult, productsResult] = await Promise.all([
            makeAdminApiCall('/admin/orders', 'GET'),
            makeAdminApiCall('/admin/users', 'GET'),
            makeAdminApiCall('/products', 'GET', null, false)
        ]);

        // Procesar pedidos y ingresos
        if (ordersResult.success && Array.isArray(ordersResult.data)) {
            document.querySelector(SELECTORS.STAT_TOTAL_ORDERS).textContent = ordersResult.data.length;
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlyRevenue = ordersResult.data.reduce((sum, order) => {
                const orderDate = new Date(order.createdAt);
                if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear && order.status !== 'cancelled') {
                    return sum + (order.totalAmount || 0);
                }
                return sum;
            }, 0);
            document.querySelector(SELECTORS.STAT_MONTHLY_REVENUE).textContent = `$${monthlyRevenue.toFixed(2)}`;
        }

        // Procesar clientes
        if (customersResult.success && Array.isArray(customersResult.data)) {
            document.querySelector(SELECTORS.STAT_TOTAL_CUSTOMERS).textContent = customersResult.data.length;
        }

        // Procesar productos
        const products = productsResult.success ? (productsResult.data || productsResult) : [];
        if (Array.isArray(products)) {
            document.querySelector(SELECTORS.STAT_ACTIVE_PRODUCTS).textContent = products.filter(p => p.isActive).length;
        }

    } catch (error) {
        console.error("Error cargando estadísticas del dashboard:", error);
        // Podrías poner un mensaje de error en las tarjetas si falla la carga
    }
}

/**
 * Carga las listas de actividad reciente (pedidos, clientes, productos).
 */
async function loadRecentActivity() {
    console.log("Cargando actividad reciente...");
    const { RECENT_ORDERS_LIST, RECENT_CUSTOMERS_LIST, RECENT_PRODUCTS_LIST } = SELECTORS;

    setListPlaceholder(RECENT_ORDERS_LIST, 'Cargando pedidos...');
    setListPlaceholder(RECENT_CUSTOMERS_LIST, 'Cargando clientes...');
    setListPlaceholder(RECENT_PRODUCTS_LIST, 'Cargando productos...');

    try {
        const [ordersResult, customersResult, productsResult] = await Promise.all([
            makeAdminApiCall(`/admin/orders?limit=${RECENT_ACTIVITY_LIMIT}&sort=-createdAt`, 'GET'),
            makeAdminApiCall(`/admin/users?limit=${RECENT_ACTIVITY_LIMIT}&sort=-createdAt`, 'GET'),
            makeAdminApiCall(`/products?limit=${RECENT_ACTIVITY_LIMIT}&sort=-createdAt`, 'GET', null, false)
        ]);
        
        // Renderizar pedidos recientes
        renderRecentItems(RECENT_ORDERS_LIST, ordersResult, renderRecentOrder, 'No hay pedidos recientes.');
        // Renderizar clientes recientes
        renderRecentItems(RECENT_CUSTOMERS_LIST, customersResult, renderRecentCustomer, 'No hay clientes recientes.');
        // Renderizar productos recientes
        renderRecentItems(RECENT_PRODUCTS_LIST, productsResult, renderRecentProduct, 'No hay productos recientes.');

    } catch (error) {
        console.error("Error general al cargar actividad reciente:", error);
        setListPlaceholder(RECENT_ORDERS_LIST, 'Error de carga.');
        setListPlaceholder(RECENT_CUSTOMERS_LIST, 'Error de carga.');
        setListPlaceholder(RECENT_PRODUCTS_LIST, 'Error de carga.');
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
