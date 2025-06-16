/**
 * @file admin/modules/products.js
 * @module AdminProducts
 * @description Maneja la lógica para la sección de "Productos" en el panel de administración.
 */

import { makeAdminApiCall } from '../api.js';
import { showAdminNotification } from '../ui.js';
import { isValidHttpUrl } from '../utils.js';

const SELECTORS = {
    FORM: '#addProductForm',
    MESSAGE: '#addProductMessage',
    TABLE_BODY: '#productsContent .products-table-container tbody',
    TABLE_CONTAINER: '#productsContent .products-table-container'
};

/**
 * Inicializa la sección de gestión de productos.
 * Carga la tabla de productos y configura los manejadores de eventos del formulario y la tabla.
 */
export function initializeProducts() {
    console.log("Módulo de Productos inicializado.");
    setupProductForm();
    loadProductsTable();
    setupProductActionHandlers();
}

/**
 * Configura el formulario para agregar nuevos productos.
 */
function setupProductForm() {
    const addProductForm = document.querySelector(SELECTORS.FORM);
    if (!addProductForm) {
        console.error("Formulario de producto no encontrado.");
        return;
    }
    
    if (addProductForm.dataset.listenerAttached === 'true') return;
    addProductForm.dataset.listenerAttached = 'true';

    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageElement = document.querySelector(SELECTORS.MESSAGE);
        const submitButton = addProductForm.querySelector('button[type="submit"]');
        
        // La principal diferencia está aquí. Usamos FormData directamente.
        // Esto toma todos los campos del formulario, incluyendo el archivo.
        const formData = new FormData(addProductForm);
        
        // Ya no creamos un objeto JSON manual, FormData lo hace por nosotros.

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            // makeAdminApiCall ya está preparado para manejar FormData.
            const result = await makeAdminApiCall('/products', 'POST', formData);

            if (result.success) {
                showAdminNotification(result.message || '¡Producto guardado!', 'success');
                addProductForm.reset();
                loadProductsTable(); // Recargar la tabla para mostrar el nuevo producto
            } else {
                showAdminNotification(result.message || 'Error al guardar el producto.', 'error');
            }
        } catch (error) {
            showAdminNotification(error.message || 'Error de red.', 'error');
            console.error(error);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Producto';
        }
    });
}

/**
 * Carga y muestra la lista de productos en la tabla.
 */
async function loadProductsTable() {
    const tableBody = document.querySelector(SELECTORS.TABLE_BODY);
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando productos... <i class="fas fa-spinner fa-spin"></i></td></tr>';
    
    try {
        // La obtención de productos puede ser pública, por eso `requireAuth` es false.
        const result = await makeAdminApiCall('/products', 'GET', null, false);
        const products = result.success ? (result.data || result) : [];

        if (!Array.isArray(products)) {
            throw new Error("La respuesta del servidor para productos no es válida.");
        }

        if (products.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay productos registrados.</td></tr>';
            return;
        }

        tableBody.innerHTML = products.map(p => `
            <tr data-product-id="${p._id}">
                <td><img src="${p.imageUrl || '/images/placeholder.png'}" alt="${p.name}" class="product-thumbnail" onerror="this.src='/images/placeholder.png'"></td>
                <td>${p.name || '-'}</td>
                <td>$${(p.price || 0).toFixed(2)}</td>
                <td>${p.category || '-'}</td>
                <td>${p.stock ?? '-'}</td>
                <td><span class="status-badge ${p.isActive ? 'success' : 'danger'}">${p.isActive ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                    <button class="action-btn view-btn" title="Ver" data-id="${p._id}"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit-btn" title="Editar" data-id="${p._id}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" title="Eliminar" data-id="${p._id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`).join('');

    } catch (error) {
        console.error("Error cargando productos:", error);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Error: ${error.message}</td></tr>`;
    }
}

/**
 * Configura un único listener en la tabla para manejar los clics en los botones de acción.
 */
function setupProductActionHandlers() {
    const tableContainer = document.querySelector(SELECTORS.TABLE_CONTAINER);
    if (!tableContainer) return;
    
    // Evitar añadir múltiples listeners
    if (tableContainer.dataset.listenerAttached === 'true') return;
    tableContainer.dataset.listenerAttached = 'true';

    tableContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.action-btn');
        if (!button) return;

        const productId = button.closest('tr')?.dataset.productId;
        if (!productId) return;

        if (button.classList.contains('edit-btn')) {
            handleEditProduct(productId);
        } else if (button.classList.contains('delete-btn')) {
            handleDeleteProduct(productId);
        } else if (button.classList.contains('view-btn')) {
            handleViewProduct(productId);
        }
    });
}

// --- Funciones de Acción ---

function handleEditProduct(productId) {
    // TODO: Implementar lógica para editar un producto.
    // Podría abrir un modal precargado con los datos del producto.
    showAdminNotification(`Funcionalidad para editar el producto ${productId} aún no implementada.`, 'info');
}

function handleViewProduct(productId) {
    // TODO: Implementar lógica para ver detalles de un producto.
    showAdminNotification(`Funcionalidad para ver el producto ${productId} aún no implementada.`, 'info');
}

async function handleDeleteProduct(productId) {
    if (!confirm(`¿Estás seguro de que quieres eliminar el producto con ID ${productId}?`)) return;

    try {
        const result = await makeAdminApiCall(`/products/${productId}`, 'DELETE');
        if (result.success) {
            showAdminNotification("Producto eliminado correctamente.", "success");
            loadProductsTable(); // Recargar la tabla para reflejar el cambio
        } else {
            showAdminNotification(`Error al eliminar: ${result.message || 'Error desconocido'}`, "error");
        }
    } catch (error) {
        showAdminNotification(error.message || "Error de red al intentar eliminar.", "error");
        console.error(error);
    }
}
