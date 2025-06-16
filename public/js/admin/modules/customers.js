/**
 * @file admin/modules/customers.js
 * @module AdminCustomers
 * @description Maneja la lógica para la sección de "Clientes" en el panel de administración.
 */

import { makeAdminApiCall } from '../api.js';
import { showAdminNotification } from '../ui.js';

const SELECTORS = {
    TABLE_BODY: '#customersContent .customers-table-container tbody',
    TABLE_CONTAINER: '#customersContent .customers-table-container'
};

/**
 * Inicializa la sección de gestión de clientes.
 */
export function initializeCustomers() {
    console.log("Módulo de Clientes inicializado.");
    loadCustomersTable();
    setupCustomerActionHandlers();
}

/**
 * Carga y muestra la lista de clientes registrados en la tabla.
 */
async function loadCustomersTable() {
    const tableBody = document.querySelector(SELECTORS.TABLE_BODY);
    if (!tableBody) {
        console.error("Contenedor de tabla de clientes no encontrado.");
        return;
    }

    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando clientes... <i class="fas fa-spinner fa-spin"></i></td></tr>';

    try {
        const result = await makeAdminApiCall('/admin/users', 'GET');

        if (!result.success || !Array.isArray(result.data)) {
            throw new Error(result.message || "La respuesta del servidor para clientes no es válida.");
        }

        const customers = result.data;
        if (customers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay clientes registrados.</td></tr>';
            return;
        }

        // El backend ya debería incluir la cuenta de pedidos, si no, se mostraría 0.
        tableBody.innerHTML = customers.map(customer => renderCustomerRow(customer)).join('');

    } catch (error) {
        console.error("Error al cargar clientes:", error);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Error: ${error.message}</td></tr>`;
    }
}

/**
 * Renderiza una fila de la tabla para un cliente.
 * @param {object} customer - El objeto del cliente.
 * @returns {string} El HTML de la fila (tr).
 */
function renderCustomerRow(customer) {
    let registrationDateFormatted = 'N/A';
    try {
        if (customer.createdAt) {
            registrationDateFormatted = new Date(customer.createdAt).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
    } catch (e) {
        console.warn("Error formateando fecha de registro del cliente:", e);
    }
    
    // El backend debería proveer `orderCount`. Si no, se puede calcular con otra llamada, pero es menos eficiente.
    const orderCount = customer.orderCount || 0;

    return `
        <tr data-customer-id="${customer._id}">
            <td>#${customer._id.slice(-6).toUpperCase()}</td>
            <td>${customer.nombre || ''} ${customer.apellidos || ''}</td>
            <td>${customer.email || '-'}</td>
            <td>${customer.telefono || '-'}</td>
            <td>${registrationDateFormatted}</td>
            <td>${orderCount}</td>
            <td>
                <button class="action-btn view-btn" title="Ver" data-id="${customer._id}"><i class="fas fa-user"></i></button>
                <button class="action-btn edit-btn" title="Editar" data-id="${customer._id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" title="Eliminar" data-id="${customer._id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
}

/**
 * Configura un único listener para los botones de acción en la tabla de clientes.
 */
function setupCustomerActionHandlers() {
    const tableContainer = document.querySelector(SELECTORS.TABLE_CONTAINER);
    if (!tableContainer) return;

    if (tableContainer.dataset.customerListener === 'true') return;
    tableContainer.dataset.customerListener = 'true';

    tableContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.action-btn');
        if (!button) return;

        const customerId = button.closest('tr')?.dataset.customerId;
        if (!customerId) return;

        if (button.classList.contains('edit-btn')) {
            handleEditCustomer(customerId);
        } else if (button.classList.contains('delete-btn')) {
            handleDeleteCustomer(customerId);
        } else if (button.classList.contains('view-btn')) {
            handleViewCustomer(customerId);
        }
    });
}

// --- Funciones de Acción (pendientes de implementación completa) ---

function handleEditCustomer(customerId) {
    showAdminNotification(`Funcionalidad para editar el cliente ${customerId} aún no implementada.`, 'info');
}

function handleViewCustomer(customerId) {
    showAdminNotification(`Funcionalidad para ver el cliente ${customerId} aún no implementada.`, 'info');
}

async function handleDeleteCustomer(customerId) {
    if (!confirm(`¿Estás seguro de que quieres eliminar al cliente con ID ${customerId}? Esta acción no se puede deshacer.`)) return;
    
    showAdminNotification(`Funcionalidad para eliminar el cliente ${customerId} aún no implementada.`, 'warning');
    // Implementación futura:
    // try {
    //     const result = await makeAdminApiCall(`/admin/users/${customerId}`, 'DELETE');
    //     if (result.success) {
    //         showAdminNotification("Cliente eliminado.", "success");
    //         loadCustomersTable();
    //     } else {
    //         showAdminNotification(`Error: ${result.message}`, "error");
    //     }
    // } catch (error) {
    //     showAdminNotification(error.message || "Error de red.", "error");
    // }
}
