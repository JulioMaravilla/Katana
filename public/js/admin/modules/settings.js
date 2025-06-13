/**
 * @file admin/modules/settings.js
 * @module AdminSettings
 * @description Maneja la lógica para la sección de "Configuración" en el panel de administración,
 * incluyendo el perfil del administrador y la gestión de imágenes del carrusel.
 */

import { makeAdminApiCall } from '../api.js';
import { showAdminNotification } from '../ui.js';

let currentAdminCarouselImages = []; // Caché local para las imágenes del carrusel

const SELECTORS = {
    // Perfil
    PROFILE_FORM: '#adminProfileForm',
    PROFILE_MESSAGE: '#adminProfileMessage',
    PASSWORD_FORM: '#adminPasswordForm',
    PASSWORD_MESSAGE: '#adminPasswordMessage',
    AVATAR_INPUT: '#adminAvatar',
    // UI del Perfil
    SIDEBAR_USERNAME: '#adminSidebarUsername',
    SIDEBAR_ROLE: '#adminSidebarRole',
    CONFIG_USERNAME: '#adminConfigUsername',
    CONFIG_ROLE: '#adminConfigRole',
    CONFIG_EMAIL: '#adminConfigEmail',
    CONFIG_PHONE: '#adminConfigPhone',
    // Carrusel
    CAROUSEL_FORM: '#addCarouselImageForm',
    CAROUSEL_MESSAGE: '#carouselAdminMessage',
    CAROUSEL_CONTAINER: '#currentCarouselImages',
    CAROUSEL_COUNT_MSG: '#carouselCountMessage'
};

/**
 * Inicializa la sección de configuración.
 */
export function initializeSettings() {
    console.log("Módulo de Configuración inicializado.");
    loadAdminProfile();
    setupAdminProfileForms();
    setupCarouselManagement();
    loadCarouselImages();
}

// --- Gestión del Perfil del Administrador ---

/**
 * Carga la información del perfil del administrador y la muestra en la UI.
 */
async function loadAdminProfile() {
    try {
        const result = await makeAdminApiCall('/admin/profile', 'GET');
        if (result.success && result.data) {
            updateAdminProfileDOM(result.data);
        } else {
            showAdminNotification(result.message || 'No se pudo cargar el perfil.', 'error');
        }
    } catch (error) {
        showAdminNotification('Error de red al cargar el perfil.', 'error');
    }
}

/**
 * Actualiza los elementos del DOM con la información del perfil del admin.
 * @param {object} admin - Los datos del perfil del administrador.
 */
function updateAdminProfileDOM(admin) {
    const setText = (selector, text) => {
        const el = document.querySelector(selector);
        if (el) el.textContent = text || 'No especificado';
    };
    
    setText(SELECTORS.SIDEBAR_USERNAME, admin.fullName || admin.username);
    setText(SELECTORS.SIDEBAR_ROLE, admin.role ? admin.role.charAt(0).toUpperCase() + admin.role.slice(1) : 'Admin');
    setText(SELECTORS.CONFIG_USERNAME, admin.fullName || admin.username);
    setText(SELECTORS.CONFIG_ROLE, admin.role ? admin.role.charAt(0).toUpperCase() + admin.role.slice(1) : 'Admin');
    setText(SELECTORS.CONFIG_EMAIL, admin.email);
    setText(SELECTORS.CONFIG_PHONE, admin.phone);

    // Precargar los formularios
    const profileForm = document.querySelector(SELECTORS.PROFILE_FORM);
    if (profileForm) {
        profileForm.fullName.value = admin.fullName || '';
        profileForm.email.value = admin.email || '';
        profileForm.phone.value = admin.phone || '';
    }
    const roleInput = document.getElementById('adminRoleInput');
    if (roleInput) roleInput.value = admin.role || 'admin';
}

/**
 * Configura los event listeners para los formularios de perfil y contraseña.
 */
function setupAdminProfileForms() {
    const profileForm = document.querySelector(SELECTORS.PROFILE_FORM);
    const passwordForm = document.querySelector(SELECTORS.PASSWORD_FORM);
    const avatarInput = document.querySelector(SELECTORS.AVATAR_INPUT);

    if (profileForm && profileForm.dataset.listenerAttached !== 'true') {
        profileForm.addEventListener('submit', handleUpdateProfile);
        profileForm.dataset.listenerAttached = 'true';
    }
    if (passwordForm && passwordForm.dataset.listenerAttached !== 'true') {
        passwordForm.addEventListener('submit', handleChangePassword);
        passwordForm.dataset.listenerAttached = 'true';
    }
    if (avatarInput && avatarInput.dataset.listenerAttached !== 'true') {
        avatarInput.addEventListener('change', handleAvatarChange);
        avatarInput.dataset.listenerAttached = 'true';
    }
}

async function handleUpdateProfile(e) {
    e.preventDefault();
    const form = e.target;
    const messageEl = document.querySelector(SELECTORS.PROFILE_MESSAGE);
    const submitBtn = form.querySelector('button[type="submit"]');
    
    const data = {
        fullName: form.fullName.value,
        email: form.email.value,
        phone: form.phone.value
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
    
    const result = await makeAdminApiCall('/admin/profile', 'PUT', data);
    
    if (result.success) {
        showAdminNotification('Perfil actualizado correctamente.', 'success');
        if (result.data && result.data.fullName) {
            sessionStorage.setItem('adminFullName', result.data.fullName);
        }
        loadAdminProfile();
    } else {
        showAdminNotification(result.message || 'Error al actualizar.', 'error');
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
}

async function handleChangePassword(e) {
    e.preventDefault();
    const form = e.target;
    const messageEl = document.querySelector(SELECTORS.PASSWORD_MESSAGE);
    const submitBtn = form.querySelector('button[type="submit"]');

    const data = {
        currentPassword: form.currentPassword.value,
        newPassword: form.newPassword.value,
    };

    if (data.newPassword !== form.confirmPassword.value) {
        showAdminNotification('Las nuevas contraseñas no coinciden.', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
    
    const result = await makeAdminApiCall('/admin/password', 'PUT', data);
    
    if (result.success) {
        showAdminNotification('Contraseña actualizada.', 'success');
        form.reset();
    } else {
        showAdminNotification(result.message || 'Error al cambiar contraseña.', 'error');
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-key"></i> Actualizar Contraseña';
}

async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    showAdminNotification('Subiendo avatar...', 'info');
    const formData = new FormData();
    formData.append('avatar', file);
    
    // FormData se maneja diferente, makeAdminApiCall lo gestionará
    const result = await makeAdminApiCall('/admin/avatar', 'POST', formData);
    
    if (result.success) {
        showAdminNotification('Avatar actualizado.', 'success');
        loadAdminProfile();
    } else {
        showAdminNotification(result.message || 'Error al subir avatar.', 'error');
    }
}


// --- Gestión del Carrusel ---

/**
 * Configura los listeners para el formulario y la lista de imágenes del carrusel.
 */
function setupCarouselManagement() {
    const form = document.querySelector(SELECTORS.CAROUSEL_FORM);
    const container = document.querySelector(SELECTORS.CAROUSEL_CONTAINER);

    if (form && form.dataset.listenerAttached !== 'true') {
        form.addEventListener('submit', handleAddCarouselImage);
        form.dataset.listenerAttached = 'true';
    }
    if (container && container.dataset.listenerAttached !== 'true') {
        container.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-carousel-img-btn');
            if (deleteBtn) {
                handleDeleteCarouselImage(deleteBtn.dataset.id);
            }
        });
        container.dataset.listenerAttached = 'true';
    }
}

/**
 * Carga las imágenes actuales del carrusel desde la API y las muestra.
 */
async function loadCarouselImages() {
    const container = document.querySelector(SELECTORS.CAROUSEL_CONTAINER);
    const countMessage = document.querySelector(SELECTORS.CAROUSEL_COUNT_MSG);
    if (!container || !countMessage) return;

    container.innerHTML = '<p>Cargando imágenes...</p>';
    
    try {
        const result = await makeAdminApiCall('/carousel-images', 'GET', null, false);
        if (result.success && Array.isArray(result.data)) {
            currentAdminCarouselImages = result.data;
            renderCarouselImages();
        } else {
            throw new Error(result.message || 'Error desconocido.');
        }
    } catch (error) {
        console.error("Error en loadCarouselImages:", error);
        container.innerHTML = `<p style="color: red;">Error de red al cargar imágenes.</p>`;
    }
}

/**
 * Renderiza las imágenes del carrusel en el DOM a partir del estado local.
 */
function renderCarouselImages() {
    const container = document.querySelector(SELECTORS.CAROUSEL_CONTAINER);
    const countMessage = document.querySelector(SELECTORS.CAROUSEL_COUNT_MSG);

    if (currentAdminCarouselImages.length === 0) {
        container.innerHTML = '<p>No hay imágenes en el carrusel.</p>';
    } else {
        container.innerHTML = currentAdminCarouselImages.map(image => `
            <div class="carousel-image-item">
                <img src="${image.imageUrl}" alt="${image.title || 'Imagen Carrusel'}">
                <p>${image.title || image.filename}</p>
                <button class="admin-btn btn-danger btn-sm delete-carousel-img-btn" data-id="${image._id}" title="Eliminar Imagen">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        `).join('');
    }

    countMessage.textContent = `Imágenes actuales: ${currentAdminCarouselImages.length}. Se requieren mínimo 3.`;
    countMessage.style.color = currentAdminCarouselImages.length < 3 ? 'red' : 'inherit';
}

/**
 * Maneja el envío del formulario para agregar una nueva imagen al carrusel.
 * @param {Event} event - El evento de submit del formulario.
 */
async function handleAddCarouselImage(event) {
    event.preventDefault();
    const form = event.target;
    const fileInput = form.querySelector('#carouselImageFile');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!fileInput.files || fileInput.files.length === 0) {
        showAdminNotification('Por favor, selecciona un archivo de imagen.', 'error');
        return;
    }
    
    const formData = new FormData(form);

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';

    const result = await makeAdminApiCall('/admin/carousel-images', 'POST', formData);

    if (result.success) {
        showAdminNotification(result.message || 'Imagen agregada con éxito.', 'success');
        form.reset();
        loadCarouselImages(); // Recargar la lista
    } else {
        showAdminNotification(result.message || 'Error al agregar la imagen.', 'error');
    }
    
    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-plus"></i> Agregar Imagen';
}

/**
 * Maneja la eliminación de una imagen del carrusel.
 * @param {string} imageId - El ID de la imagen a eliminar.
 */
async function handleDeleteCarouselImage(imageId) {
    if (currentAdminCarouselImages.length <= 3) {
        showAdminNotification('No se puede eliminar. Se requiere un mínimo de 3 imágenes.', 'warning');
        return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) return;

    const result = await makeAdminApiCall(`/admin/carousel-images/${imageId}`, 'DELETE');
    
    if (result.success) {
        showAdminNotification(result.message || 'Imagen eliminada.', 'success');
        loadCarouselImages(); // Recargar la lista
    } else {
        showAdminNotification(result.message || 'Error al eliminar la imagen.', 'error');
    }
}
