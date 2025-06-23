/**
 * @file admin/section-loader.js
 * @module AdminSectionLoader
 * @description Carga dinámicamente la lógica específica para cada sección del dashboard.
 */

// Importa las funciones de inicialización de cada módulo de sección.
import { initializeDashboardContent } from './modules/dashboard.js';
import { initializeOrders, initializeManualOrdersSection } from './modules/orders.js';
import { initializeProducts } from './modules/products.js';
import { initializeCustomers } from './modules/customers.js';
import { initializeSettings } from './modules/settings.js';
import { initializePrizes } from './modules/prizes.js';
import { initializeReports } from './modules/reports.js';

// Mapa para evitar un switch largo y hacerlo más escalable
const sectionInitializers = {
    'dashboardContent': initializeDashboardContent,
    'ordersContent': initializeOrders,
    'customersContent': initializeCustomers,
    'productsContent': initializeProducts,
    'premiosContent': initializePrizes,
    'reportsContent': initializeReports,
    'configuracionContent': initializeSettings,
    'registrarPedidoContent': initializeManualOrdersSection
};

/**
 * Carga y ejecuta el código necesario para una sección específica del dashboard.
 * Cada función de inicialización es responsable de configurar sus propios listeners
 * para evitar duplicados en recargas.
 * @param {string} sectionId - El ID del elemento de la sección a cargar (ej. 'ordersContent').
 */
export function loadAdminSectionContent(sectionId) {
    console.log(`Cargando lógica para la sección: ${sectionId}`);

    const initializer = sectionInitializers[sectionId];

    if (initializer && typeof initializer === 'function') {
        console.log(`Ejecutando inicializador para: ${sectionId}`);
        try {
            initializer();
            console.log(`Inicializador ejecutado exitosamente para: ${sectionId}`);
        } catch (error) {
            console.error(`Error al ejecutar inicializador para ${sectionId}:`, error);
        }
    } else {
        console.warn(`No hay un módulo de carga específico definido para la sección: ${sectionId}`);
        console.log('Inicializadores disponibles:', Object.keys(sectionInitializers));
    }
}
