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
    
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminLoginMessage = document.getElementById('adminLoginMessage');

    // Video Preview Functionality Elements
    const toggleVideoPreview = document.getElementById('toggleVideoPreview'); // Main toggle for export buttons
    const toggleSaveProductVideoPreview = document.getElementById('toggleSaveProductVideoPreview'); // Toggle for Save Product button
    const toggleSaveProductEditVideoPreview = document.getElementById('toggleSaveProductEditVideoPreview'); // Toggle for Save Product Edit button

    // PDF Button elements
    const exportAdminOrdersPdfBtn = document.getElementById('exportAdminOrdersPdfBtn');
    const pdfVideoPreviewContainer = document.getElementById('pdfVideoPreviewContainer');
    const pdfPreviewVideo = document.getElementById('pdfPreviewVideo');

    // CSV Button elements
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const csvVideoPreviewContainer = document.getElementById('csvVideoPreviewContainer');
    const csvPreviewVideo = document.getElementById('csvPreviewVideo');

    // Word Button elements
    const exportWordBtn = document.getElementById('exportWordBtn');
    const wordVideoPreviewContainer = document.getElementById('wordVideoPreviewContainer');
    const wordPreviewVideo = document.getElementById('wordPreviewVideo');

    // Export Button elements
    const exportOrdersBtn = document.getElementById('exportOrdersBtn');
    const exportVideoPreviewContainer = document.getElementById('exportVideoPreviewContainer');
    const exportPreviewVideo = document.getElementById('exportPreviewVideo');

    // Registrar Pedido Button elements
    const openRegisterOrderModalBtn = document.getElementById('openRegisterOrderModalBtn');
    const registerOrderVideoPreviewContainer = document.getElementById('registerOrderVideoPreviewContainer');
    const registerOrderPreviewVideo = document.getElementById('registerOrderPreviewVideo');

    // Save Product Button elements
    const saveProductBtn = document.getElementById('saveProductBtn');
    const saveProductVideoPreviewContainer = document.getElementById('saveProductVideoPreviewContainer');
    const saveProductPreviewVideo = document.getElementById('saveProductPreviewVideo');

    // Save Product Edit Button elements
    const saveProductEditBtn = document.getElementById('saveProductEditBtn');
    const saveProductEditVideoPreviewContainer = document.getElementById('saveProductEditVideoPreviewContainer');
    const saveProductEditPreviewVideo = document.getElementById('saveProductEditPreviewVideo');

    // Full screen video modal elements
    const videoModal = document.getElementById('videoModal');
    const fullScreenVideo = document.getElementById('fullScreenVideo');
    const closeVideoModalBtn = document.getElementById('closeVideoModalBtn');

    // Helper function to handle video preview logic
    const setupVideoPreview = (buttonElement, containerElement, previewVideoElement, videoSrc, toggleCheckboxElement, position = 'right') => {
        if (buttonElement && containerElement && previewVideoElement && toggleCheckboxElement && videoModal && fullScreenVideo && closeVideoModalBtn) {
            // Ensure the parent for absolute positioning
            if (buttonElement.parentNode) {
                buttonElement.parentNode.style.position = 'relative';
                buttonElement.parentNode.style.display = 'inline-block'; // Ensure it doesn't break layout

                // Apply positioning based on the parameter
                if (position === 'left') {
                    containerElement.style.left = 'auto'; // Reset left if previously set
                    containerElement.style.right = '100%';
                    containerElement.style.marginLeft = '0'; // Reset margin-left
                    containerElement.style.marginRight = '10px';
                } else { // default to 'right'
                    containerElement.style.right = 'auto'; // Reset right if previously set
                    containerElement.style.left = '100%';
                    containerElement.style.marginRight = '0'; // Reset margin-right
                    containerElement.style.marginLeft = '10px';
                }
            }

            buttonElement.addEventListener('mouseenter', () => {
                if (toggleCheckboxElement.checked) {
                    containerElement.style.display = 'block';
                    if (previewVideoElement.paused || previewVideoElement.ended) {
                        previewVideoElement.play().catch(error => {
                            if (error.name !== 'AbortError') {
                                console.warn('Video play was prevented:', error);
                            }
                        });
                    }
                }
            });

            buttonElement.addEventListener('mouseleave', () => {
                if (toggleCheckboxElement.checked) {
                    containerElement.style.display = 'none';
                    previewVideoElement.pause();
                    previewVideoElement.currentTime = 0;
                }
            });

            previewVideoElement.addEventListener('click', () => {
                videoModal.style.display = 'flex';
                fullScreenVideo.src = videoSrc;
                fullScreenVideo.play();
            });
        }
    };

    // Initial state and change listener for the main toggle (for export buttons)
    if (toggleVideoPreview) {
        toggleVideoPreview.addEventListener('change', () => {
            const containers = [pdfVideoPreviewContainer, csvVideoPreviewContainer, wordVideoPreviewContainer, exportVideoPreviewContainer, registerOrderVideoPreviewContainer];
            containers.forEach(container => {
                if (container) {
                    // Solo ocultar si se desactiva el toggle, no mostrar automáticamente
                    if (!toggleVideoPreview.checked) {
                        container.style.display = 'none';
                        const video = container.querySelector('video');
                        if (video) {
                            video.pause();
                            video.currentTime = 0;
                        }
                    }
                }
            });
        });
    }

    // Initial state and change listener for Save Product toggle
    if (toggleSaveProductVideoPreview) {
        toggleSaveProductVideoPreview.addEventListener('change', () => {
            if (saveProductVideoPreviewContainer) {
                // Solo ocultar si se desactiva el toggle, no mostrar automáticamente
                if (!toggleSaveProductVideoPreview.checked) {
                    saveProductVideoPreviewContainer.style.display = 'none';
                    if (saveProductPreviewVideo) {
                        saveProductPreviewVideo.pause();
                        saveProductPreviewVideo.currentTime = 0;
                    }
                }
            }
        });
    }

    // Initial state and change listener for Save Product Edit toggle
    if (toggleSaveProductEditVideoPreview) {
        toggleSaveProductEditVideoPreview.addEventListener('change', () => {
            if (saveProductEditVideoPreviewContainer) {
                // Solo ocultar si se desactiva el toggle, no mostrar automáticamente
                if (!toggleSaveProductEditVideoPreview.checked) {
                    saveProductEditVideoPreviewContainer.style.display = 'none';
                    if (saveProductEditPreviewVideo) {
                        saveProductEditPreviewVideo.pause();
                        saveProductEditPreviewVideo.currentTime = 0;
                    }
                }
            }
        });
    }

    // Configuración de elementos de la sección de Configuración
    // Botón Guardar Cambios (Perfil de Administrador)
    const saveAdminProfileBtn = document.getElementById('saveAdminProfileBtn');
    const saveAdminProfileVideoPreviewContainer = document.getElementById('saveAdminProfileVideoPreviewContainer');
    const saveAdminProfilePreviewVideo = document.getElementById('saveAdminProfilePreviewVideo');
    const toggleSaveAdminProfileVideoPreview = document.getElementById('toggleSaveAdminProfileVideoPreview');

    // Botón Actualizar Contraseña
    const updateAdminPasswordBtn = document.getElementById('updateAdminPasswordBtn');
    const updateAdminPasswordVideoPreviewContainer = document.getElementById('updateAdminPasswordVideoPreviewContainer');
    const updateAdminPasswordPreviewVideo = document.getElementById('updateAdminPasswordPreviewVideo');
    const toggleUpdateAdminPasswordVideoPreview = document.getElementById('toggleUpdateAdminPasswordVideoPreview');

    // Botón Agregar Imagen al Carrusel
    const addCarouselImageSubmitBtn = document.getElementById('addCarouselImageSubmitBtn');
    const addCarouselImageVideoPreviewContainer = document.getElementById('addCarouselImageVideoPreviewContainer');
    const addCarouselImagePreviewVideo = document.getElementById('addCarouselImagePreviewVideo');
    const toggleAddCarouselImageVideoPreview = document.getElementById('toggleAddCarouselImageVideoPreview');

    // Initial state and change listener for Save Admin Profile toggle
    if (toggleSaveAdminProfileVideoPreview) {
        toggleSaveAdminProfileVideoPreview.addEventListener('change', () => {
            if (saveAdminProfileVideoPreviewContainer) {
                // Solo ocultar si se desactiva el toggle, no mostrar automáticamente
                if (!toggleSaveAdminProfileVideoPreview.checked) {
                    saveAdminProfileVideoPreviewContainer.style.display = 'none';
                    if (saveAdminProfilePreviewVideo) {
                        saveAdminProfilePreviewVideo.pause();
                        saveAdminProfilePreviewVideo.currentTime = 0;
                    }
                }
            }
        });
    }

    // Initial state and change listener for Update Admin Password toggle
    if (toggleUpdateAdminPasswordVideoPreview) {
        toggleUpdateAdminPasswordVideoPreview.addEventListener('change', () => {
            if (updateAdminPasswordVideoPreviewContainer) {
                // Solo ocultar si se desactiva el toggle, no mostrar automáticamente
                if (!toggleUpdateAdminPasswordVideoPreview.checked) {
                    updateAdminPasswordVideoPreviewContainer.style.display = 'none';
                    if (updateAdminPasswordPreviewVideo) {
                        updateAdminPasswordPreviewVideo.pause();
                        updateAdminPasswordPreviewVideo.currentTime = 0;
                    }
                }
            }
        });
    }

    // Initial state and change listener for Add Carousel Image toggle
    if (toggleAddCarouselImageVideoPreview) {
        toggleAddCarouselImageVideoPreview.addEventListener('change', () => {
            if (addCarouselImageVideoPreviewContainer) {
                // Solo ocultar si se desactiva el toggle, no mostrar automáticamente
                if (!toggleAddCarouselImageVideoPreview.checked) {
                    addCarouselImageVideoPreviewContainer.style.display = 'none';
                    if (addCarouselImagePreviewVideo) {
                        addCarouselImagePreviewVideo.pause();
                        addCarouselImagePreviewVideo.currentTime = 0;
                    }
                }
            }
        });
    }

    // Setup for all buttons
    setupVideoPreview(exportAdminOrdersPdfBtn, pdfVideoPreviewContainer, pdfPreviewVideo, './images/pdf.mp4', toggleVideoPreview);
    setupVideoPreview(exportCsvBtn, csvVideoPreviewContainer, csvPreviewVideo, './images/descarga.jpg', toggleVideoPreview);
    setupVideoPreview(exportWordBtn, wordVideoPreviewContainer, wordPreviewVideo, './images/word.mp4', toggleVideoPreview, 'left');
    setupVideoPreview(exportOrdersBtn, exportVideoPreviewContainer, exportPreviewVideo, './images/Todos.mp4', toggleVideoPreview, 'left');
    setupVideoPreview(openRegisterOrderModalBtn, registerOrderVideoPreviewContainer, registerOrderPreviewVideo, './images/registro.mp4', toggleVideoPreview);

    setupVideoPreview(saveProductBtn, saveProductVideoPreviewContainer, saveProductPreviewVideo, './images/producto.mp4', toggleSaveProductVideoPreview);
    setupVideoPreview(saveProductEditBtn, saveProductEditVideoPreviewContainer, saveProductEditPreviewVideo, './images/Todos.mp4', toggleSaveProductEditVideoPreview);

    setupVideoPreview(saveAdminProfileBtn, saveAdminProfileVideoPreviewContainer, saveAdminProfilePreviewVideo, './images/Todos.mp4', toggleSaveAdminProfileVideoPreview);
    setupVideoPreview(updateAdminPasswordBtn, updateAdminPasswordVideoPreviewContainer, updateAdminPasswordPreviewVideo, './images/Todos.mp4', toggleUpdateAdminPasswordVideoPreview);
    setupVideoPreview(addCarouselImageSubmitBtn, addCarouselImageVideoPreviewContainer, addCarouselImagePreviewVideo, './images/Todos.mp4', toggleAddCarouselImageVideoPreview);

    // Common full screen modal close logic
    if (videoModal && fullScreenVideo && closeVideoModalBtn) {
        closeVideoModalBtn.addEventListener('click', () => {
            videoModal.style.display = 'none';
            fullScreenVideo.pause();
            fullScreenVideo.currentTime = 0;
        });

        videoModal.addEventListener('click', (event) => {
            if (event.target === videoModal) {
                videoModal.style.display = 'none';
                fullScreenVideo.pause();
                fullScreenVideo.currentTime = 0;
            }
        });
    }

    // Funcionalidad para la carga de imágenes de producto personalizada
    const setupCustomFileInput = (fileInputId, uploadBtnId, fileNameSpanId) => {
        const fileInput = document.getElementById(fileInputId);
        const uploadBtn = document.getElementById(uploadBtnId);
        const fileNameSpan = document.getElementById(fileNameSpanId);

        if (fileInput && uploadBtn && fileNameSpan) {
            uploadBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    fileNameSpan.textContent = fileInput.files[0].name;
                } else {
                    fileNameSpan.textContent = 'No se eligió ningún archivo';
                }
            });
        }
    };

    // Configurar para el formulario de agregar producto
    setupCustomFileInput('productImageFile', 'addProductUploadBtn', 'productFileName');

    // Configurar para el formulario de editar producto (dentro del modal de producto)
    setupCustomFileInput('editProductImageFile', 'editProductUploadBtn', 'editProductFileName');

    // Configurar para el formulario de perfil de administrador (avatar)
    setupCustomFileInput('adminAvatar', 'adminAvatarUploadBtn', 'adminAvatarFileName');

    // Configurar para el formulario de agregar imagen de carrusel
    setupCustomFileInput('carouselImageFile', 'carouselImageUploadBtn', 'carouselImageFileName');

    // --- SOLO listeners para menú móvil aquí ---
    document.querySelectorAll('.admin-mobile-menu-link').forEach(link => {
        link.addEventListener('click', function(e) {
            const sectionId = link.getAttribute('data-section');
            if (sectionId) {
                // Cerrar el menú móvil
                const mobileMenuDrawer = document.getElementById('adminMobileMenuDrawer');
                const mobileMenuIcon = document.getElementById('adminMobileMenuIcon');
                if (mobileMenuDrawer) {
                    mobileMenuDrawer.classList.remove('open');
                }
                if (mobileMenuIcon) {
                    mobileMenuIcon.classList.remove('fa-times');
                    mobileMenuIcon.classList.add('fa-bars');
                }
                
                // Activar la sección
                document.querySelectorAll('.dashboard-section').forEach(section => {
                    section.classList.toggle('active', section.id === sectionId);
                });
                const headerTitle = document.querySelector('.admin-main .header-title');
                if (headerTitle) {
                    headerTitle.textContent = link.textContent.trim();
                }
                loadAdminSectionContent(sectionId);
            }
        });
    });
});