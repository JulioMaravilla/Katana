// Estado global para el dashboard
const dashboardState = {
    currentSection: 'perfil',
    notifications: [],
    userPreferences: {}
};

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// Inicialización del Dashboard
function initializeDashboard() {
    setupSidebar();
    setupNotifications();
    setupEventListeners();
}

// Configuración del Sidebar
function setupSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    // Toggle del sidebar
    sidebarToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
        saveUserPreference('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    });

    // Manejo de items del menú
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.querySelector('a').getAttribute('href').replace('#', '');
            handleSectionChange(section, this);
        });
    });

    // Restaurar estado del sidebar
    const sidebarCollapsed = getUserPreference('sidebarCollapsed');
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    }
}

// Manejo de cambio de secciones
function handleSectionChange(sectionId, menuItem) {
    // Actualizar estado actual
    dashboardState.currentSection = sectionId;

    // Actualizar menú
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    menuItem.classList.add('active');

    // Actualizar título
    const pageTitle = document.getElementById('pageTitle');
    pageTitle.textContent = menuItem.querySelector('span').textContent;

    // Ocultar todas las secciones y mostrar la seleccionada
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    const targetSection = document.getElementById(`${sectionId}Content`);
    if (targetSection) {
        targetSection.classList.add('active');
        loadSectionContent(sectionId);
    }

    // Guardar preferencia de última sección
    saveUserPreference('lastSection', sectionId);
}

// Sistema de Notificaciones
function setupNotifications() {
    const notificationBadge = document.querySelector('.notification-badge');
    
    notificationBadge?.addEventListener('click', () => {
        showNotificationsPanel();
    });
}

function showNotificationsPanel() {
    // Implementar panel de notificaciones
    console.log('Panel de notificaciones - Por implementar');
}

// Event Listeners Generales
function setupEventListeners() {
    // Listener para el botón de cerrar sesión
    const logoutBtn = document.querySelector('.logout-btn');
    logoutBtn?.addEventListener('click', () => {
        window.location.href = '/views/login.html';
    });

    // Listener para clicks fuera del sidebar en móviles
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        
        if (window.innerWidth <= 768 && 
            !e.target.closest('.sidebar') && 
            !e.target.closest('#sidebarToggle') && 
            !sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
            document.querySelector('.main-content').classList.add('expanded');
        }
    });

    // Listener para cambios de tamaño de ventana
    window.addEventListener('resize', handleResize);
}

// Utilidades
function saveUserPreference(key, value) {
    try {
        const preferences = JSON.parse(localStorage.getItem('dashboardPreferences') || '{}');
        preferences[key] = value;
        localStorage.setItem('dashboardPreferences', JSON.stringify(preferences));
    } catch (error) {
        console.error('Error saving preference:', error);
    }
}

function getUserPreference(key) {
    try {
        const preferences = JSON.parse(localStorage.getItem('dashboardPreferences') || '{}');
        return preferences[key];
    } catch (error) {
        console.error('Error getting preference:', error);
        return null;
    }
}

function handleResize() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    } else {
        const sidebarCollapsed = getUserPreference('sidebarCollapsed');
        if (!sidebarCollapsed) {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('expanded');
        }
    }
}

// Funciones para cargar contenido de secciones (a implementar)
async function loadSectionContent(sectionId) {
    console.log(`Sección ${sectionId} cargada`);
} 