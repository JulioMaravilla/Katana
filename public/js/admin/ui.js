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
    const menuLinks = document.querySelectorAll('.admin-menu .menu-link');
    const sections = document.querySelectorAll('.dashboard-section');
    const headerTitle = document.querySelector('.admin-main .header-title');

    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSectionId = link.getAttribute('data-section');
            const targetSpan = link.querySelector('span');

            if (!targetSectionId || !targetSpan) return;

            menuLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            sections.forEach(section => {
                section.classList.toggle('active', section.id === targetSectionId);
            });

            if (headerTitle) {
                headerTitle.textContent = targetSpan.textContent;
            }

            if (typeof loadSectionContent === 'function') {
                loadSectionContent(targetSectionId);
            }
        });
    });
    
    const logoutButton = document.getElementById('adminLogoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', adminLogout);
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
