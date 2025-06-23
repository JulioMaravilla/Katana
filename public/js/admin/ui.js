/**
 * @file admin/ui.js
 * @module AdminUI
 * @description Maneja los componentes generales de la interfaz de usuario del panel de administración,
 * como la barra lateral, la navegación principal, notificaciones y modales.
 */

import { adminLogout } from './auth.js';

/**
 * Configura la funcionalidad de la barra lateral (sidebar) para que sea colapsable.
 */
export function setupAdminSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    const main = document.querySelector('.admin-main');
    const toggleBtn = document.querySelector('.sidebar-toggle');
    const logoutBtn = document.getElementById('adminLogoutButton');
    const logoutText = logoutBtn?.querySelector('.logout-text');

    if (!sidebar || !main || !toggleBtn) {
        console.error("Elementos de la sidebar no encontrados.");
        return;
    }

    const updateLogoutButtonVisibility = (isCollapsed) => {
        if (!logoutBtn) return;
        if (logoutText) logoutText.style.display = isCollapsed ? 'none' : 'inline';
        logoutBtn.style.justifyContent = isCollapsed ? 'center' : 'flex-start';
        const icon = logoutBtn.querySelector('i');
        if (icon) icon.style.marginRight = isCollapsed ? '0' : '8px';
    };

    toggleBtn.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.toggle('collapsed');
        main.classList.toggle('expanded');
        updateLogoutButtonVisibility(isCollapsed);
    });
    
    // Estado inicial
    updateLogoutButtonVisibility(sidebar.classList.contains('collapsed'));
}


/**
 * Configura la navegación principal del menú lateral.
 * @param {function(string): void} loadSectionContent - Callback que se ejecuta para cargar el contenido de la sección seleccionada.
 */
export function setupAdminNavigation(loadSectionContent) {
    console.log("Configurando navegación del menú admin...");
    
    const menuLinks = document.querySelectorAll('.admin-menu .menu-link');
    const mobileMenuLinks = document.querySelectorAll('.admin-mobile-menu-link');
    const sections = document.querySelectorAll('.dashboard-section');
    const headerTitle = document.querySelector('.admin-main .header-title');

    console.log(`Encontrados ${menuLinks.length} enlaces del menú:`, menuLinks);
    console.log(`Encontrados ${mobileMenuLinks.length} enlaces del menú móvil:`, mobileMenuLinks);
    console.log(`Encontradas ${sections.length} secciones:`, sections);

    // Función para manejar la navegación
    const handleNavigation = (link, targetSectionId, linkText) => {
        console.log("Navegando a:", {
            href: link.getAttribute('href'),
            dataSection: targetSectionId,
            linkText: linkText
        });

        if (!targetSectionId) {
            console.warn("Enlace sin data-section:", link);
            return;
        }

        console.log("Activando enlace:", targetSectionId);

        // Actualizar enlaces activos en ambos menús
        menuLinks.forEach(l => l.classList.remove('active'));
        mobileMenuLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Actualizar secciones
        sections.forEach(section => {
            const wasActive = section.classList.contains('active');
            const shouldBeActive = section.id === targetSectionId;
            section.classList.toggle('active', shouldBeActive);
            
            if (wasActive !== shouldBeActive) {
                console.log(`Sección ${section.id}: ${wasActive} -> ${shouldBeActive}`);
            }
        });

        // Actualizar título
        if (headerTitle) {
            headerTitle.textContent = linkText;
            console.log("Título actualizado:", linkText);
        }

        // Cargar contenido de la sección
        if (typeof loadSectionContent === 'function') {
            console.log("Llamando loadSectionContent con:", targetSectionId);
            loadSectionContent(targetSectionId);
        } else {
            console.warn("loadSectionContent no es una función:", typeof loadSectionContent);
        }

        // Cerrar menú móvil si el enlace es del menú móvil
        if (link.classList.contains('admin-mobile-menu-link')) {
            closeMobileMenu();
        }
    };

    // Configurar enlaces del menú lateral
    menuLinks.forEach((link, index) => {
        const targetSectionId = link.getAttribute('data-section');
        const targetSpan = link.querySelector('span');
        
        console.log(`Enlace ${index + 1}:`, {
            href: link.getAttribute('href'),
            dataSection: targetSectionId,
            spanText: targetSpan?.textContent,
            element: link
        });

        link.addEventListener('click', (e) => {
            e.preventDefault();
            handleNavigation(link, targetSectionId, targetSpan?.textContent);
        });
    });

    // Configurar enlaces del menú móvil
    mobileMenuLinks.forEach((link, index) => {
        const targetSectionId = link.getAttribute('data-section');
        const linkText = link.textContent.trim();
        
        console.log(`Enlace móvil ${index + 1}:`, {
            href: link.getAttribute('href'),
            dataSection: targetSectionId,
            linkText: linkText,
            element: link
        });

        link.addEventListener('click', (e) => {
            e.preventDefault();
            handleNavigation(link, targetSectionId, linkText);
        });
    });
    
    const logoutButton = document.getElementById('adminLogoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', adminLogout);
    }
}

/**
 * Función para cerrar el menú móvil
 */
function closeMobileMenu() {
    const mobileMenuDrawer = document.getElementById('adminMobileMenuDrawer');
    const mobileMenuIcon = document.getElementById('adminMobileMenuIcon');
    
    if (mobileMenuDrawer) {
        mobileMenuDrawer.classList.remove('open');
    }
    
    if (mobileMenuIcon) {
        mobileMenuIcon.classList.remove('fa-times');
        mobileMenuIcon.classList.add('fa-bars');
    }
}

/**
 * Muestra una notificación tipo "toast" en la esquina de la pantalla.
 * @param {string} message - El mensaje a mostrar.
 * @param {'info'|'success'|'warning'|'error'} [type='info'] - El tipo de notificación.
 * @param {number} [duration=4000] - La duración en milisegundos.
 */
export function showAdminNotification(message, type = 'info', duration = 4000) {
    const container = document.body;
    const notification = document.createElement('div');
    notification.className = `admin-toast-notification ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    const iconClass = icons[type] || icons.info;

    notification.innerHTML = `<i class="fas ${iconClass}"></i><span>${message}</span>`;
    
    // Aplicar estilos directamente para asegurar la consistencia visual
    Object.assign(notification.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '15px 25px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '10000',
        opacity: '0',
        transform: 'translateY(20px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    });

    switch(type) {
        case 'success': notification.style.backgroundColor = '#4CAF50'; break;
        case 'error': notification.style.backgroundColor = '#dc3545'; break;
        case 'warning': 
            notification.style.backgroundColor = '#ffc107'; 
            notification.style.color = '#333';
            break;
        default: notification.style.backgroundColor = '#17a2b8'; break;
    }

    container.appendChild(notification);

    // Animar la entrada
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    });

    // Animar la salida y eliminar
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        notification.addEventListener('transitionend', () => notification.remove());
        // Fallback por si la transición no se dispara
        setTimeout(() => { if (notification.parentElement) notification.remove(); }, 500);
    }, duration);
}

/**
 * Configura la lógica para todos los selectores de estado personalizados en la lista de pedidos.
 * @param {function} onStatusChange - La función callback a ejecutar cuando el estado cambia. Recibe (orderId, newStatus).
 */
export function setupCustomStatusSelects(onStatusChange) {
    document.querySelectorAll('.custom-status-select').forEach(select => {
        const btn = select.querySelector('.custom-select-btn');
        const options = select.querySelector('.custom-select-options');
        if (!btn || !options) return;

        // Se usa .cloneNode para limpiar listeners previos y evitar duplicados
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Cierra otros selectores abiertos
            document.querySelectorAll('.custom-status-select.open').forEach(s => {
                if (s !== select) s.classList.remove('open');
            });
            select.classList.toggle('open');
        });

        options.querySelectorAll('.custom-select-option').forEach(opt => {
            const newOpt = opt.cloneNode(true);
            opt.parentNode.replaceChild(newOpt, opt);
            
            newOpt.addEventListener('click', (e) => {
                e.stopPropagation();
                const newStatus = newOpt.getAttribute('data-value');
                const orderId = select.getAttribute('data-order-id');
                select.classList.remove('open');
                if (orderId && newStatus && typeof onStatusChange === 'function') {
                    onStatusChange(orderId, newStatus, newBtn);
                }
            });
        });
    });

    // Listener global para cerrar los menús al hacer clic fuera
    if (!window._customStatusSelectOutsideClickAttached) {
        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-status-select.open').forEach(s => s.classList.remove('open'));
        });
        window._customStatusSelectOutsideClickAttached = true;
    }
}
