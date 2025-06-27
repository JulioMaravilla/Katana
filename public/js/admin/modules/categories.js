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

    // --- INICIO DEL CÓDIGO A AÑADIR ---
    const editForm = document.getElementById('editCategoryForm');
    const closeEditModalBtn = document.getElementById('closeEditCategoryModalBtn');

    if (editForm && !editForm.dataset.listener) {
        editForm.addEventListener('submit', handleUpdateCategorySubmit);
        editForm.dataset.listener = 'true';
    }
    if (closeEditModalBtn) {
        closeEditModalBtn.addEventListener('click', () => {
            document.getElementById('editCategoryModal').style.display = 'none';
        });
    }
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
                            <button class="action-btn edit-category-btn" data-id="${cat._id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
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
 * CORREGIDO: Maneja los clics en los botones de acción de la tabla,
 * como "Editar" o "Activar/Desactivar".
 * @param {Event} event
 */
async function handleCategoryActionClick(event) {
    // Usamos .closest() para encontrar el botón, sin importar si se hizo clic
    // en el ícono <i> o en el botón <button> directamente.
    const toggleBtn = event.target.closest('.toggle-status-btn');
    const editBtn = event.target.closest('.edit-category-btn');

    if (toggleBtn) {
        const categoryId = toggleBtn.dataset.id;
        const currentStatus = toggleBtn.dataset.active === 'true';
        const newStatus = !currentStatus;

        toggleBtn.disabled = true;
        toggleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const result = await makeAdminApiCall(`/admin/categories/${categoryId}/status`, 'PATCH', { isActive: newStatus });

        if (result.success) {
            showAdminNotification('Estado de la categoría actualizado.', 'success');
            loadCategories(); // Recargar la lista
        } else {
            showAdminNotification(result.message || 'No se pudo actualizar el estado.', 'error');
            toggleBtn.disabled = false;
            toggleBtn.innerHTML = `<i class="fas ${currentStatus ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>`;
        }
        return; // Detenemos la ejecución para no procesar ambos botones
    }

    if (editBtn) {
        const categoryId = editBtn.dataset.id;
        openEditCategoryModal(categoryId);
        return; // Detenemos la ejecución
    }
}

/**
 * Abre el modal de edición y lo rellena con los datos de la categoría.
 * @param {string} categoryId - El ID de la categoría a editar.
 */
async function openEditCategoryModal(categoryId) {
    const modal = document.getElementById('editCategoryModal');
    const form = document.getElementById('editCategoryForm');

    // Pide los datos más recientes de la categoría por si han cambiado
    const result = await makeAdminApiCall(`/admin/categories`, 'GET');
    const category = result.data.find(c => c._id === categoryId);

    if (!category) {
        showAdminNotification('No se encontró la categoría para editar.', 'error');
        return;
    }

    form.categoryId.value = category._id;
    form.name.value = category.name;
    form.description.value = category.description || '';

    modal.style.display = 'flex';
}

/**
 * Maneja el envío del formulario de edición de categoría.
 */
async function handleUpdateCategorySubmit(event) {
    event.preventDefault();
    const form = event.target;
    const categoryId = form.categoryId.value;
    const submitButton = form.querySelector('button[type="submit"]');

    const updatedData = {
        name: form.name.value.trim(),
        description: form.description.value.trim()
    };

    if (!updatedData.name) {
        showAdminNotification('El nombre es requerido.', 'error');
        return;
    }

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    const result = await makeAdminApiCall(`/admin/categories/${categoryId}`, 'PATCH', updatedData);

    if (result.success) {
        showAdminNotification('Categoría actualizada con éxito.', 'success');
        document.getElementById('editCategoryModal').style.display = 'none';
        loadCategories(); // Recargar la lista
    } else {
        showAdminNotification(result.message || 'No se pudo actualizar la categoría.', 'error');
    }

    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
}