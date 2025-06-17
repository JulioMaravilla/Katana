/**
 * @file admin.js
 * @module AdminMain
 * @description Punto de entrada principal y orquestador para el panel de administración de Katana Sushi.
 * Carga e inicializa los módulos de autenticación, UI y secciones.
 */

// Importamos los módulos de alto nivel que controlan el flujo de la aplicación.
import { checkAdminAuthentication } from './admin/auth.js';
import { setupAdminSidebar, setupAdminNavigation } from './admin/ui.js';
import { loadAdminSectionContent } from './admin/section-loader.js';

/**
 * Función principal que se ejecuta solo si el administrador está autenticado.
 * Configura los componentes principales de la interfaz y carga la sección inicial.
 */
export function initializeAdminDashboard() {
    console.log("Inicializando componentes principales del dashboard de admin...");

    setupAdminSidebar();
    
    // Pasamos el cargador de secciones a la función de navegación para que sepa
    // qué hacer cuando el usuario hace clic en un enlace del menú.
    setupAdminNavigation(loadAdminSectionContent);

    // Determina y carga la sección inicial.
    loadInitialSection();
}

/**
 * Determina cuál sección cargar al iniciar el dashboard.
 * Puede ser la última visitada o la sección por defecto.
 */
function loadInitialSection() {
    // Se puede expandir en el futuro para guardar la última sección visitada en localStorage.
    const initialActiveLink = document.querySelector('.admin-menu .menu-link.active');
    let initialSectionId = 'dashboardContent'; // Sección por defecto.

    if (initialActiveLink) {
        initialSectionId = initialActiveLink.getAttribute('data-section') || 'dashboardContent';
    } else {
        // Si no hay ninguno activo, activa el primero que encuentre.
        const firstLink = document.querySelector('.admin-menu .menu-link');
        if (firstLink) {
            firstLink.classList.add('active');
            initialSectionId = firstLink.getAttribute('data-section') || 'dashboardContent';
        }
    }
    
    // Carga el contenido de la sección inicial.
    loadAdminSectionContent(initialSectionId);
}

/**
 * Listener principal que se dispara cuando el DOM está completamente cargado.
 * El único punto de partida es verificar la autenticación.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin Dashboard DOM cargado. Iniciando verificación de autenticación...");
    // A partir de aquí, el flujo es manejado por el módulo de autenticación.
    // Si el login es exitoso, llamará a initializeAdminDashboard().
    checkAdminAuthentication();
});
