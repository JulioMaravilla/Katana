import { makeAdminApiCall } from '../api.js';
import { showAdminNotification } from '../ui.js';

/**
 * Inicializa la sección de gestión de categorías.
 */
export function initializeCategoriesSection() {
    console.log("Módulo de Categorías inicializado.");
    setupCategoryFormListener();
    setupCategoryListListener();
    loadCategories();
}

/**
 * Configura el listener para el formulario de agregar categoría.
 */
function setupCategoryFormListener() {
    const form = document.getElementById('addCategoryForm');
    if (form && !form.dataset.listenerAttached) {
        form.addEventListener('submit', handleAddCategorySubmit);
        form.dataset.listenerAttached = 'true';
    }
}

/**
 * Maneja el envío del formulario para crear una nueva categoría.
 * @param {Event} event
 */
async function handleAddCategorySubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');

    const categoryData = {
        name: form.name.value.trim(),
        description: form.description.value.trim()
    };

    if (!categoryData.name) {
        showAdminNotification('El nombre es requerido.', 'error');
        return;
    }

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    const result = await makeAdminApiCall('/admin/categories', 'POST', categoryData);

    if (result.success) {
        showAdminNotification('Categoría creada con éxito.', 'success');
        form.reset();
        loadCategories(); 
    } else {
        showAdminNotification(result.message || 'No se pudo crear la categoría.', 'error');
    }

    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-plus-circle"></i> Agregar Categoría';
}

/**
 * Carga y muestra la lista de categorías existentes.
 */
async function loadCategories() {
    const container = document.getElementById('categoryListContainer');
    if (!container) return;

    container.innerHTML = '<p>Cargando categorías...</p>';

    const result = await makeAdminApiCall('/admin/categories', 'GET');

    if (result.success && Array.isArray(result.data)) {
        renderCategoriesList(result.data);
    } else {
        container.innerHTML = '<p style="color: red;">Error al cargar las categorías.</p>';
    }
}

/**
 * Renderiza la lista de categorías en el DOM.
 * @param {Array} categories - La lista de categorías a mostrar.
 */
function renderCategoriesList(categories) {
    const container = document.getElementById('categoryListContainer');
    if (!container) return;

    if (categories.length === 0) {
        container.innerHTML = '<p>No hay categorías creadas todavía.</p>';
        return;
    }

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th>Estado</th>
                    <th class="text-center">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${categories.map(cat => `
                    <tr data-id="${cat._id}">
                        <td><strong>${cat.name}</strong></td>
                        <td>${cat.description || '<em>Sin descripción</em>'}</td>
                        <td>
                            <span class="status-badge ${cat.isActive ? 'success' : 'danger'}">
                                ${cat.isActive ? 'Activa' : 'Inactiva'}
                            </span>
                        </td>
                        <td class="text-center">
                            <button class="action-btn toggle-status-btn" data-id="${cat._id}" data-active="${cat.isActive}" title="${cat.isActive ? 'Desactivar' : 'Activar'}">
                                <i class="fas ${cat.isActive ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                            </button>
                            </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

/**
 * Configura el listener principal para las acciones en la lista de categorías.
 */
function setupCategoryListListener() {
    const container = document.getElementById('categoryListContainer');
    if (container && !container.dataset.listener) {
        container.addEventListener('click', handleCategoryActionClick);
        container.dataset.listener = 'true';
    }
}

/**
 * Maneja los clics en los botones de acción de la tabla.
 * @param {Event} event
 */
async function handleCategoryActionClick(event) {
    const button = event.target.closest('.toggle-status-btn');
    if (!button) return;

    const categoryId = button.dataset.id;
    const currentStatus = button.dataset.active === 'true';

    // Cambiamos el estado al opuesto
    const newStatus = !currentStatus;

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const result = await makeAdminApiCall(`/admin/categories/${categoryId}/status`, 'PATCH', { isActive: newStatus });

    if (result.success) {
        showAdminNotification('Estado de la categoría actualizado.', 'success');
        loadCategories(); // Recargar la lista para reflejar el cambio
    } else {
        showAdminNotification(result.message || 'No se pudo actualizar el estado.', 'error');
        // Restaurar el botón en caso de error
        button.disabled = false;
        button.innerHTML = `<i class="fas ${currentStatus ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>`;
    }
}