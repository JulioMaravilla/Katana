// Archivo: Katana-main/public/js/admin/modules/products.js (VERSIÓN COMPLETA)

import { makeAdminApiCall } from '../api.js';
import { showAdminNotification } from '../ui.js';

const SELECTORS = {
    ADD_FORM: '#addProductForm',
    EDIT_FORM: '#productEditForm',
    TABLE_BODY: '#viewProductsContent .products-table-container tbody',
    TABLE_CONTAINER: '#viewProductsContent .products-table-container',
    MODAL: '#productModal',
    MODAL_TITLE: '#productModalTitle',
    MODAL_ACTIONS: '#productModalActions',
    CLOSE_MODAL_BTN: '#closeProductModalBtn',
    CANCEL_MODAL_BTN: '#cancelProductEditBtn'
};

// --- SECCION "AGREGAR PRODUCTO" ---
export function initializeAddProductSection() {
    console.log("Módulo 'Agregar Producto' inicializado.");
    const addProductForm = document.querySelector(SELECTORS.ADD_FORM);

    populateCategorySelector(); // Cargar categorías activas al iniciar
    
    // Nos aseguramos de que el listener solo se añada una vez
    if (addProductForm && !addProductForm.dataset.listenerAttached) {
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = addProductForm.querySelector('button[type="submit"]');
            const formData = new FormData(addProductForm);
            
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

            const result = await makeAdminApiCall('/products', 'POST', formData);

            if (result.success) {
                showAdminNotification('¡Producto guardado!', 'success');
                addProductForm.reset();
                // Opcional: podrías redirigir al usuario a la lista de productos
                // window.location.hash = '#ver-productos';
            } else {
                showAdminNotification(result.message || 'Error al guardar el producto.', 'error');
            }
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Producto';
        });
        addProductForm.dataset.listenerAttached = 'true';
    }
}

/**
 * Abre el modal y lo configura para ver o editar un producto.
 * @param {string} mode - 'view' o 'edit'.
 * @param {object | null} product - El objeto del producto (solo para 'view' y 'edit').
 */
async function openProductModal(mode, product = null) {
    const modal = document.querySelector(SELECTORS.MODAL);
    const titleEl = document.querySelector(SELECTORS.MODAL_TITLE);
    const actionsEl = document.querySelector(SELECTORS.MODAL_ACTIONS);
    const form = document.querySelector(SELECTORS.EDIT_FORM);
    // Nuevo selector para el grupo de cambio de imagen
    const changeImageGroup = document.getElementById('changeImageGroup'); 
    

    if (!modal || !titleEl || !actionsEl || !form || !changeImageGroup) return;

    // Reiniciar formulario y estado
    form.reset();
    form.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = false);
    actionsEl.style.display = 'block';
    changeImageGroup.style.display = 'block'; // Aseguramos que sea visible por defecto

    if (mode === 'view') {
        titleEl.textContent = 'Detalles del Producto';
        actionsEl.style.display = 'none'; // Ocultar botón de guardar
        changeImageGroup.style.display = 'none'; // Ocultar opción para cambiar imagen
        form.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
    } else if (mode === 'edit') {
        titleEl.textContent = 'Editar Producto';
    }

    await populateCategorySelectorForEdit(product ? product.category : null);

    // Poblar formulario si hay datos de producto
    if (product) {
        form.productId.value = product._id;
        form.name.value = product.name;
        form.price.value = product.price;
        form.stock.value = product.stock;
        form.category.value = product.category;
        form.description.value = product.description;
        form.isActive.checked = product.isActive;
        document.getElementById('currentProductImage').src = product.imageUrl || '/images/placeholder.png';
    }

    modal.style.display = 'flex';
}

/**
 * Carga las categorías en el selector del modal de edición.
 */
async function populateCategorySelectorForEdit(currentCategoryName) {
    const categorySelect = document.getElementById('editProductCategory');
    if (!categorySelect) return;

    // Limpiar opciones, guardando el placeholder
    const placeholder = categorySelect.querySelector('option[value=""]');
    categorySelect.innerHTML = '';
    if (placeholder) categorySelect.appendChild(placeholder);

    try {
        const result = await makeAdminApiCall('/admin/categories', 'GET');
        if (result.success && Array.isArray(result.data)) {
            result.data.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.name;
                option.textContent = cat.name;
                categorySelect.appendChild(option);
            });

            // Seleccionar la categoría actual del producto
            if (currentCategoryName) {
                categorySelect.value = currentCategoryName;
            }
        }
    } catch (error) {
        console.error("Error al poblar categorías en modal de edición:", error);
    }
}

/**
 * Maneja el clic en el botón de "Editar".
 * @param {string} productId - El ID del producto.
 */
async function handleEditProduct(productId) {
    showAdminNotification('Cargando datos del producto...', 'info');
    const result = await makeAdminApiCall(`/products/${productId}`, 'GET', null, false);
    if (result.success) {
        openProductModal('edit', result.data);
    } else {
        showAdminNotification(`Error: ${result.message}`, 'error');
    }
}

/**
 * Maneja el clic en el botón de "Ver".
 * @param {string} productId - El ID del producto.
 */
async function handleViewProduct(productId) {
    showAdminNotification('Cargando detalles del producto...', 'info');
    const result = await makeAdminApiCall(`/products/${productId}`, 'GET', null, false);
    if (result.success) {
        openProductModal('view', result.data);
    } else {
        showAdminNotification(`Error: ${result.message}`, 'error');
    }
}

/**
 * Maneja el envío del formulario de edición de productos.
 */
async function handleProductEditSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const productId = form.productId.value;
    const submitButton = form.querySelector('button[type="submit"]');

    if (!productId) {
        showAdminNotification('Error: ID de producto no encontrado.', 'error');
        return;
    }

    const formData = new FormData(form);
    // FormData no incluye checkboxes desmarcados, así que lo añadimos manualmente si es necesario.
    if (!formData.has('isActive')) {
        formData.append('isActive', false);
    } else {
        formData.set('isActive', true);
    }

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    const result = await makeAdminApiCall(`/products/${productId}`, 'PUT', formData);

    if (result.success) {
        showAdminNotification('Producto actualizado con éxito.', 'success');
        document.querySelector(SELECTORS.MODAL).style.display = 'none';
        loadProductsTable(); // Recargar tabla
    } else {
        showAdminNotification(`Error: ${result.message}`, 'error');
    }

    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
}


/**
 * Carga y muestra la lista de productos en la tabla.
 */
async function loadProductsTable() {
    const tableBody = document.querySelector(SELECTORS.TABLE_BODY);
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando productos... <i class="fas fa-spinner fa-spin"></i></td></tr>';
    
    try {
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
                <td class="text-center" style="font-weight: 600;">${p.timesFavorited || 0}</td>
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

async function handleDeleteProduct(productId) {
    if (!confirm(`¿Estás seguro de que quieres eliminar este producto?`)) return;

    try {
        const result = await makeAdminApiCall(`/products/${productId}`, 'DELETE');
        if (result.success) {
            showAdminNotification("Producto eliminado correctamente.", "success");
            loadProductsTable(); // Recargar la tabla
        } else {
            showAdminNotification(`Error al eliminar: ${result.message || 'Error desconocido'}`, "error");
        }
    } catch (error) {
        showAdminNotification(error.message || "Error de red al intentar eliminar.", "error");
    }
}


/**
 * Inicializa la sección de gestión de productos.
 */
export function initializeViewProductsSection() {
    console.log("Módulo de 'Ver Pructos' inicializado.");
    
    const editProductForm = document.querySelector(SELECTORS.EDIT_FORM);
    
    if (editProductForm && !editProductForm.dataset.listenerAttached) {
        editProductForm.addEventListener('submit', handleProductEditSubmit);
        editProductForm.dataset.listenerAttached = 'true';
    }

    // Listener para los botones de acción en la tabla
    const tableContainer = document.querySelector(SELECTORS.TABLE_CONTAINER);
    if (tableContainer && !tableContainer.dataset.listenerAttached) {
        tableContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.action-btn');
            if (!button) return;

            const productId = button.dataset.id;
            if (!productId) return;

            if (button.classList.contains('edit-btn')) {
                handleEditProduct(productId);
            } else if (button.classList.contains('delete-btn')) {
                handleDeleteProduct(productId);
            } else if (button.classList.contains('view-btn')) {
                handleViewProduct(productId);
            }
        });
        tableContainer.dataset.listenerAttached = 'true';
    }

    // Listener para cerrar el modal
    const closeModalBtn = document.querySelector(SELECTORS.CLOSE_MODAL_BTN);
    if (closeModalBtn && !closeModalBtn.dataset.listenerAttached) {
        closeModalBtn.addEventListener('click', () => {
            const modal = document.querySelector(SELECTORS.MODAL);
            if (modal) modal.style.display = 'none';
        });
        closeModalBtn.dataset.listenerAttached = 'true';
    }
    
    loadProductsTable();
}

/**
 * Carga las categorías activas y las inserta en el <select> del formulario de productos.
 */
async function populateCategorySelector() {
    const categorySelect = document.getElementById('productCategory');
    if (!categorySelect) return;

    try {
        const result = await makeAdminApiCall('/admin/categories', 'GET');
        if (result.success && Array.isArray(result.data)) {
            const activeCategories = result.data.filter(cat => cat.isActive);

            // Guardar la opción "Seleccione" y limpiar el resto
            const placeholder = categorySelect.querySelector('option[value=""]');
            categorySelect.innerHTML = '';
            if (placeholder) {
                categorySelect.appendChild(placeholder);
            }

            if (activeCategories.length === 0) {
                categorySelect.disabled = true;
                placeholder.textContent = 'No hay categorías activas';
            } else {
                categorySelect.disabled = false;
                activeCategories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.name;
                    option.textContent = cat.name;
                    categorySelect.appendChild(option);
                });
            }
        } else {
            throw new Error('No se pudieron cargar las categorías.');
        }
    } catch (error) {
        console.error("Error al poblar categorías:", error);
        showAdminNotification('No se pudieron cargar las categorías para el formulario.', 'error');
        const placeholder = categorySelect.querySelector('option[value=""]');
        categorySelect.disabled = true;
        if(placeholder) placeholder.textContent = 'Error al cargar categorías';
    }
}