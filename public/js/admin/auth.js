/**
 * @file admin/auth.js
 * @module AdminAuth
 * @description Maneja la lógica de autenticación para el panel de administración,
 * incluyendo la verificación de sesión, el inicio y el cierre de sesión.
 */

import { makeAdminApiCall } from './api.js';
// Importamos la función que inicializará el resto del dashboard.
// Esto nos permite controlar el flujo: solo si el login es exitoso, se carga el resto.
import { initializeAdminDashboard } from '../admin.js';

const ADMIN_AUTH_KEY = 'adminAuthToken';

/**
 * Verifica si existe un token de administrador en sessionStorage.
 * Si existe, inicia el dashboard. Si no, muestra el modal de inicio de sesión.
 */
export function checkAdminAuthentication() {
    const token = sessionStorage.getItem(ADMIN_AUTH_KEY);
    const loginModal = document.getElementById('adminLoginModal');
    const mainContainer = document.querySelector('.admin-container');

    if (token) {
        console.log("Admin autenticado. Inicializando dashboard...");
        if (mainContainer) mainContainer.classList.remove('hidden-for-login');
        if (loginModal) loginModal.style.display = 'none';
        initializeAdminDashboard(); // Llama a la función principal del dashboard
    } else {
        console.log("Admin NO autenticado. Mostrando modal de login...");
        if (mainContainer) mainContainer.classList.add('hidden-for-login');
        if (loginModal) {
            loginModal.style.display = 'flex';
            setupAdminLoginModal(); // Prepara el formulario de login para recibir la interacción
        } else {
            console.error("¡Error crítico! No se encontró el modal de login.");
            document.body.innerHTML = "<h1>Error de configuración: Falta el modal de login.</h1>";
        }
    }
}

/**
 * Configura el listener para el formulario de inicio de sesión del administrador.
 */
export function setupAdminLoginModal() {
    const loginForm = document.getElementById('adminLoginForm');
    if (!loginForm) {
        console.error("Error: Formulario de login de admin no encontrado.");
        return;
    }

    // Se usa un manejador de eventos para evitar múltiples asignaciones si la función se llama más de una vez
    const submitHandler = async (e) => {
        e.preventDefault();
        const messageElement = document.getElementById('adminLoginMessage');
        const submitButton = loginForm.querySelector('button[type="submit"]');
        
        if (messageElement) messageElement.textContent = '';
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

        const username = loginForm.adminUsername.value;
        const password = loginForm.adminPassword.value;

        try {
            // Utilizamos nuestro módulo centralizado de API
            const result = await makeAdminApiCall('/admin/login', 'POST', { username, password }, false);

            if (result.success && result.token) {
                console.log("Login de admin exitoso.");
                sessionStorage.setItem(ADMIN_AUTH_KEY, result.token);
                // Guardar información adicional para uso en la UI
                if (result.admin && result.admin.fullName) sessionStorage.setItem('adminFullName', result.admin.fullName);
                if (result.admin && result.admin.role) sessionStorage.setItem('adminRole', result.admin.role);
                
                checkAdminAuthentication(); // Vuelve a verificar, esta vez tendrá éxito e iniciará el dash.
            } else {
                if (messageElement) {
                    messageElement.textContent = result.message || 'Credenciales inválidas.';
                    messageElement.style.color = 'red';
                }
                submitButton.disabled = false;
                submitButton.innerHTML = 'Ingresar';
            }
        } catch (error) {
            console.error("Error en submit de login admin:", error);
            if (messageElement) {
                messageElement.textContent = 'Error de conexión. Intenta nuevamente.';
                messageElement.style.color = 'red';
            }
            submitButton.disabled = false;
            submitButton.innerHTML = 'Ingresar';
        }
    };

    // Para evitar agregar múltiples listeners, se remueve el anterior si existe
    loginForm.removeEventListener('submit', loginForm._submitHandler);
    loginForm.addEventListener('submit', submitHandler);
    loginForm._submitHandler = submitHandler; // Guardamos una referencia para poder removerlo
}

/**
 * Cierra la sesión del administrador eliminando el token y recargando la página.
 */
export function adminLogout() {
    console.log("Cerrando sesión de administrador...");
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    sessionStorage.removeItem('adminUsername');
    sessionStorage.removeItem('adminFullName');
    sessionStorage.removeItem('adminRole');
    window.location.reload();
}
