/**
 * Script para el Dashboard Administrativo de Katana Sushi
 * INCLUYE:
 * - Autenticación de admin con JWT
 * - Toggle del sidebar
 * - Navegación entre secciones
 * - Inicialización de gráficos (Chart.js)
 * - Gestión de productos (agregar, listar, eliminar)
 * - Gestión de pedidos (listar, actualizar estado, SELECCIÓN MÚLTIPLE)
 * - Listado de clientes
 * - Carga de actividad reciente en Dashboard
 * - Gestión de imágenes del carrusel principal
 * - Gestión de perfil de administrador (datos, contraseña, avatar)
 * - Gestión de premios (Puntos y Recompensas)
 * - Exportación de pedidos a PDF
 */

// --- Constantes y Estado ---
const ADMIN_AUTH_KEY = 'adminAuthToken';
const API_BASE = '/api';
const RECENT_ACTIVITY_LIMIT = 5; // Número de items a mostrar por categoría

let adminAvailableProducts = [];
let adminManualOrderProductRowCount = 0; // Contador específico para filas de productos en pedido manual

// Estado global para almacenar las imágenes del carrusel actuales
let currentAdminCarouselImages = [];

// Estado para la selección múltiple de pedidos
let adminSelectedOrderIds = new Set();


// --- Autenticación ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin Dashboard DOM cargado.");
    checkAdminAuthentication();

    const reportTypeSelect = document.getElementById('reportTypeSelect');
    const reportTypeIcon = document.getElementById('reportTypeIcon');
    const reportTypeSelector = reportTypeSelect ? reportTypeSelect.closest('.report-type-selector') : null;

    if (reportTypeSelect && reportTypeIcon && reportTypeSelector) {
        const updateReportSelectorStyle = () => {
            let val = reportTypeSelect.value;
            reportTypeSelector.classList.remove('bg-ventas','bg-pedidos','bg-clientes','bg-productos');
            if (val === 'ventas') {
                reportTypeSelector.classList.add('bg-ventas');
                reportTypeIcon.innerHTML = '<i class="fas fa-chart-bar"></i>';
                reportTypeIcon.style.color = '#3498db';
            } else if (val === 'pedidos') {
                reportTypeSelector.classList.add('bg-pedidos');
                reportTypeIcon.innerHTML = '<i class="fas fa-shopping-cart"></i>';
                reportTypeIcon.style.color = '#e67e22';
            } else if (val === 'clientes') {
                reportTypeSelector.classList.add('bg-clientes');
                reportTypeIcon.innerHTML = '<i class="fas fa-users"></i>';
                reportTypeIcon.style.color = '#27ae60';
            } else if (val === 'productos') {
                reportTypeSelector.classList.add('bg-productos');
                reportTypeIcon.innerHTML = '<i class="fas fa-box"></i>';
                reportTypeIcon.style.color = '#8e44ad';
            } else {
                reportTypeIcon.innerHTML = '<i class="fas fa-file-alt"></i>';
                reportTypeIcon.style.color = '#888';
            }
        };
        reportTypeSelect.addEventListener('change', function() {
            const ventasContent = document.getElementById('ventasReportContent');
            const pedidosContent = document.getElementById('pedidosReportContent');
            const clientesContent = document.getElementById('clientesReportContent');
            const productosContent = document.getElementById('productosReportContent');
            const otherContent = document.getElementById('otherReportContent');
            
            ventasContent.style.display = 'none';
            pedidosContent.style.display = 'none';
            clientesContent.style.display = 'none';
            productosContent.style.display = 'none';
            otherContent.style.display = 'none';

            if (this.value === 'ventas') ventasContent.style.display = '';
            else if (this.value === 'pedidos') pedidosContent.style.display = '';
            else if (this.value === 'clientes') clientesContent.style.display = '';
            else if (this.value === 'productos') productosContent.style.display = '';
            else otherContent.style.display = '';
            
            updateReportSelectorStyle();
        });
        updateReportSelectorStyle(); // Aplicar estilo inicial
    }
    const openRegisterOrderModalBtn = document.getElementById('openRegisterOrderModalBtn');
    const registerOrderModal = document.getElementById('registerOrderModal');
    const closeRegisterOrderModalBtn = document.getElementById('closeRegisterOrderModalBtn');
    const registerOrderForm = document.getElementById('registerOrderForm');
    const orderProductsList = document.getElementById('orderProductsList');
    const addProductToOrderBtn = document.getElementById('addProductToOrderBtn');
    const orderTotal = document.getElementById('orderTotal');
    let productRowCount = 0;

    function renderProductRow(idx) {
        return `<div class="order-product-row" style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
            <select class="form-control order-product-select" name="producto${idx}" required style="flex:2;">
                <option value="">Selecciona producto</option>
                <option value="PR-001" data-precio="3.5">Roll Camarón ($3.50)</option>
                <option value="PR-002" data-precio="4.0">Roll Salmón ($4.00)</option>
                <option value="PR-003" data-precio="1.0">Refresco ($1.00)</option>
            </select>
            <input type="number" class="form-control order-product-cant" name="cantidad${idx}" min="1" value="1" required style="width:70px;">
            <button type="button" class="admin-btn btn-danger removeProductBtn" title="Quitar" style="padding:4px 10px;"><i class="fas fa-trash"></i></button>
        </div>`;
    }

    function addProductRow() {
        productRowCount++;
        const div = document.createElement('div');
        div.innerHTML = renderProductRow(productRowCount);
        if (orderProductsList) orderProductsList.appendChild(div.firstChild);
        updateOrderTotal();
    }

    function updateOrderTotal() {
        if(orderProductsList) { // orderProductsList se define en el DOMContentLoaded
            orderProductsList.addEventListener('click', function(e) {
                if (e.target.closest('.removeProductBtn')) {
                    e.target.closest('.order-product-row').remove();
                    updateAdminManualOrderShippingAndTotal(); // MODIFICADO
                }
            });
            orderProductsList.addEventListener('change', function(e) {
                if (e.target.classList.contains('order-product-select') || e.target.classList.contains('order-product-cant')) {
                    updateAdminManualOrderShippingAndTotal(); // MODIFICADO
                }
            });
        }
        let total = 0;
        orderProductsList.querySelectorAll('.order-product-row').forEach(row => {
            const select = row.querySelector('.order-product-select');
            const cant = row.querySelector('.order-product-cant');
            const precio = select && select.selectedOptions[0] ? parseFloat(select.selectedOptions[0].dataset.precio || 0) : 0;
            const cantidad = cant ? parseInt(cant.value) : 1;
            if (precio && cantidad) total += precio * cantidad;
        });
        orderTotal.textContent = `$${total.toFixed(2)}`;
    }

    if (openRegisterOrderModalBtn && registerOrderModal && orderProductsList) {
        openRegisterOrderModalBtn.onclick = async () => { // Hacerla async si loadProductsForAdminOrderModal es async
            await loadProductsForAdminOrderModal(); 
            registerOrderModal.style.display = 'flex';
            if (orderProductsList.children.length === 0) {
                addAdminManualProductRow(); // Esto llamará a updateAdminManualOrderShippingAndTotal
            } else {
                updateAdminManualOrderShippingAndTotal(); // Asegurar que se actualice al abrir por si hay items
            }
            // Resetear select de zona
            const zoneSelect = document.getElementById('adminOrderZoneSelect');
            if(zoneSelect) zoneSelect.value = "";
            // Actualizar costos (especialmente el costo de envío a $0.00 y el total)
            const costoEnvioInput = document.getElementById('adminOrderCostoEnvioInput');
            if(costoEnvioInput) costoEnvioInput.value = "0.00";
            updateAdminManualOrderShippingAndTotal();
    
        };
    }
    if (closeRegisterOrderModalBtn && registerOrderModal) {
        closeRegisterOrderModalBtn.onclick = () => {
            registerOrderModal.style.display = 'none';
            if (registerOrderForm) registerOrderForm.reset();
            if(orderProductsList) orderProductsList.innerHTML = ''; // Cambiado de getElementById a variable
            adminManualOrderProductRowCount = 0;
            // Resetear select de zona y mensaje de envío
            const zoneSelect = document.getElementById('adminOrderZoneSelect');
            if(zoneSelect) zoneSelect.value = "";
            const shippingMsgEl = document.getElementById('adminOrderShippingMsg');
            if(shippingMsgEl) {
                shippingMsgEl.textContent = '';
                shippingMsgEl.style.display = 'none';
            }
            const costoEnvioInput = document.getElementById('adminOrderCostoEnvioInput'); // El input
            if(costoEnvioInput) costoEnvioInput.value = "0.00";
            updateAdminManualOrderTotal(); // orderTotal también se define en DOMContentLoaded
            
            const messageElement = document.getElementById('adminOrderRegistrationMessage');
            if(messageElement) messageElement.textContent = '';
        };
    }
    if (addProductToOrderBtn) {
        addProductToOrderBtn.onclick = (e) => {
            e.preventDefault();
            addProductRow();
        };
    }
    if(orderProductsList) {
        orderProductsList.addEventListener('click', function(e) {
            if (e.target.closest('.removeProductBtn')) {
                e.target.closest('.order-product-row').remove();
                updateOrderTotal();
            }
        });
        orderProductsList.addEventListener('change', function(e) {
            if (e.target.classList.contains('order-product-select') || e.target.classList.contains('order-product-cant')) {
                updateOrderTotal();
            }
        });
    }

    const exportWordBtn = document.getElementById('exportWordBtn');
    if (exportWordBtn) {
        exportWordBtn.addEventListener('click', async () => {
            console.log('[Word Export] Click detectado en el botón Word');
            if (!window.docx || !window.QRious) {
                showAdminNotification('Librerías para exportar a Word (docx, qrious) no están cargadas.', 'error');
                console.error('[Word Export] docx:', window.docx, 'QRious:', window.QRious);
                return;
            }
            const orderCards = document.querySelectorAll('#adminOrdersList .order-card-visual');
            if (!orderCards.length) {
                showAdminNotification('No hay pedidos para exportar.', 'info');
                return;
            }
            const pedidos = Array.from(orderCards).filter(card => card.style.display !== 'none').map(card => {
                const dataString = card.dataset.orderData;
                if (dataString) {
                    try {
                        return JSON.parse(dataString.replace(/&apos;/g, "'"));
                    } catch (e) {
                        console.error("Error parseando datos del pedido (Word):", e, dataString);
                        return null;
                    }
                }
                // Fallback si data-order-data no está disponible (menos ideal)
                let nombre = '', telefono = '', total = '', direccion = '', zona = '';
                card.querySelectorAll('.order-info-row').forEach(row => {
                    const labelElement = row.querySelector('strong');
                    const label = labelElement?.textContent?.toLowerCase() || '';
                    let valueNode = labelElement?.nextSibling;
                    let value = '';
                    while(valueNode) {
                        if (valueNode.nodeType === Node.TEXT_NODE) {
                            value += valueNode.textContent.trim();
                        } else if (valueNode.nodeType === Node.ELEMENT_NODE && valueNode.tagName === 'SPAN') {
                            value += valueNode.textContent.trim();
                        }
                        valueNode = valueNode.nextSibling;
                    }
                    value = value.trim();
                    
                    if (label.includes('cliente:')) nombre = value.replace(/\(Invitado\)|\(Registrado\)/gi, '').trim();
                    if (label.includes('teléfono:')) telefono = value;
                    if (label.includes('dirección:')) {
                        const match = value.match(/^(.*)\s*\((.*)\)$/);
                        if (match) {
                            direccion = match[1].trim();
                            zona = match[2].trim();
                        } else {
                            direccion = value;
                        }
                    }
                    if (label.includes('total general:')) total = value.replace('$', '').trim();
                });
                return { nombre, telefono, total, direccion, zona, items: [], shippingCost: 0 }; // Asumir faltantes
            }).filter(p => p !== null);

            if (!pedidos.length) {
                showAdminNotification('No hay pedidos visibles para exportar.', 'info');
                return;
            }

            const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, HeadingLevel } = window.docx;
            const documentChildren = [];

            documentChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Katana Sushi - Reporte de Pedidos', bold: true, size: 36, color: "C2185B" }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 300 },
                })
            );
            documentChildren.push(
                new Paragraph({
                    text: `Generado: ${new Date().toLocaleString('es-ES')}`,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 600 },
                })
            );

            for (const pedido of pedidos) {
                const orderId = pedido.orderId || pedido._id;
                const subtotalProductos = (parseFloat(pedido.totalAmount) || 0) - (parseFloat(pedido.shippingCost) || 0);
                
                documentChildren.push(
                    new Paragraph({
                        text: `Pedido #${orderId}`,
                        heading: HeadingLevel.HEADING_2,
                        style: "Heading2",
                        spacing: { before: 400, after: 200 },
                    })
                );

                let qrData = pedido.deliveryDetails?.direccion || pedido.direccion || '';
                if (qrData) {
                    const coordsMatch = qrData.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
                    if (coordsMatch) {
                        const [_, lat, lng] = coordsMatch;
                        qrData = `https://www.google.com/maps?q=${lat},${lng}`;
                    } else {
                        qrData = `https://www.google.com/maps?q=${encodeURIComponent(qrData)}`;
                    }
                }

                const details = [
                    { label: "Cliente:", value: pedido.deliveryDetails?.nombre || pedido.nombre || pedido.apellido || 'N/A' },
                    { label: "Teléfono:", value: pedido.deliveryDetails?.telefono || pedido.telefono || 'N/A' },
                    { label: "Dirección:", value: `${pedido.deliveryDetails?.direccion || pedido.direccion || 'N/A'} (${pedido.deliveryDetails?.zona || pedido.zona || 'N/A'})` },
                    { label: "Fecha:", value: pedido.createdAt ? new Date(pedido.createdAt).toLocaleDateString('es-ES') : 'N/A' },
                    { label: "Subtotal Productos:", value: `$${subtotalProductos.toFixed(2)}` },
                    { label: "Costo Envío:", value: `$${(parseFloat(pedido.shippingCost) || 0).toFixed(2)}` },
                    { label: "Total General:", value: `$${(parseFloat(pedido.totalAmount) || parseFloat(pedido.total) || 0).toFixed(2)}`, bold: true },
                ];

                details.forEach(detail => {
                    documentChildren.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: `${detail.label} `, bold: true, size: 22 }),
                                new TextRun({ text: detail.value, size: 22, bold: !!detail.bold }),
                            ],
                            spacing: { after: 100 }
                        })
                    );
                });
                
                if (pedido.items && pedido.items.length > 0) {
                    documentChildren.push(new Paragraph({ text: "Productos:", style:"Heading3", spacing: { before: 200, after: 100 } }));
                    pedido.items.forEach(item => {
                        documentChildren.push(
                            new Paragraph({
                                text: `  - ${item.quantity}x ${item.name} ($${(parseFloat(item.price) || 0).toFixed(2)} c/u)`,
                                style: "ListParagraph", // Asegúrate que este estilo esté definido o usa uno por defecto
                                bullet: { level: 0 }
                            })
                        );
                    });
                }


                if (qrData) {
                    try {
                        const qr = new window.QRious({ value: qrData, size: 128, level: 'L' });
                        const dataUrl = qr.toDataURL();
                        const base64Data = dataUrl.split(',')[1];
                        const binaryString = atob(base64Data);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        documentChildren.push(
                            new Paragraph({
                                children: [new ImageRun({ data: bytes, transformation: { width: 100, height: 100 }})],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 200, before: 100 }
                            })
                        );
                    } catch (qrError) {
                        console.error("Error generando QR para pedido (Word):", pedido, qrError);
                        documentChildren.push(new Paragraph({ text: `[Error QR: ${pedido.deliveryDetails?.nombre || 'pedido'}]`, alignment: AlignmentType.CENTER }));
                    }
                }
                documentChildren.push(new Paragraph({ text: " ", spacing: {after: 300} })); // Espacio entre pedidos
            }

            const doc = new Document({
                sections: [{
                    properties: {
                        page: { margin: { top: 1440, right: 1200, bottom: 1440, left: 1200 } },
                    },
                    children: documentChildren,
                }],
                 styles: {
                    paragraphStyles: [
                        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, color: "C2185B" } },
                        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, color: "555555" } },
                        { id: "ListParagraph", name: "List Paragraph", basedOn: "Normal", quickFormat: true, paragraph: { indent: { left: 720, hanging: 360 }} }
                    ]
                }
            });

            const blob = await Packer.toBlob(doc);
            const a_el = document.createElement('a');
            a_el.href = URL.createObjectURL(blob);
            a_el.download = `pedidos_katana_sushi_${new Date().toISOString().split('T')[0]}.docx`;
            document.body.appendChild(a_el);
            a_el.click();
            document.body.removeChild(a_el);
            showAdminNotification('Documento Word generado.', 'success');
        });
    }
});

function checkAdminAuthentication() {
    const token = sessionStorage.getItem(ADMIN_AUTH_KEY);
    const loginModal = document.getElementById('adminLoginModal');
    const mainContainer = document.querySelector('.admin-container');

    if (token) {
        console.log("Token de admin encontrado. Inicializando dashboard...");
        if (mainContainer) mainContainer.classList.remove('hidden-for-login');
        if (loginModal) loginModal.style.display = 'none';
        initializeAdminDashboard();
    } else {
        console.log("Admin NO autenticado. Mostrando modal de login...");
        if (mainContainer) mainContainer.classList.add('hidden-for-login');
        if (loginModal) {
            loginModal.style.display = 'flex';
            setupAdminLoginModal();
        } else {
            console.error("¡Error crítico! No se encontró el modal de login.");
            document.body.innerHTML = "<h1>Error de configuración: Falta el modal de login.</h1>";
        }
    }
}

function setupAdminLoginModal() {
    const loginForm = document.getElementById('adminLoginForm');
    const messageElement = document.getElementById('adminLoginMessage');
    const submitButton = loginForm?.querySelector('button[type="submit"]');
    if (!loginForm || !messageElement || !submitButton) { console.error("Error: Elementos del formulario de login admin no encontrados."); return; }
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); messageElement.textContent = ''; submitButton.disabled = true; submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        const username = loginForm.adminUsername.value; const password = loginForm.adminPassword.value;
        try {
            const result = await makeAdminApiCall(`${API_BASE}/admin/login`, 'POST', { username, password }, false);
            if (result.success && result.token) {
                console.log("Login de admin exitoso."); sessionStorage.setItem(ADMIN_AUTH_KEY, result.token);
                if(result.admin && result.admin.username) sessionStorage.setItem('adminUsername', result.admin.username);
                if(result.admin && result.admin.fullName) sessionStorage.setItem('adminFullName', result.admin.fullName); // Guardar fullName
                if(result.admin && result.admin.role) sessionStorage.setItem('adminRole', result.admin.role); // Guardar rol
                checkAdminAuthentication();
            } else { console.warn("Login de admin fallido:", result.message); messageElement.textContent = result.message || 'Credenciales inválidas.'; submitButton.disabled = false; submitButton.innerHTML = 'Ingresar'; }
        } catch (error) { console.error("Error en login admin:", error); messageElement.textContent = error.message || 'Error de conexión.'; submitButton.disabled = false; submitButton.innerHTML = 'Ingresar'; }
    });
}

function adminLogout() {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    sessionStorage.removeItem('adminUsername');
    sessionStorage.removeItem('adminFullName');
    sessionStorage.removeItem('adminRole');
    window.location.reload();
}

// --- Funciones del Dashboard ---
function initializeAdminDashboard() {
    console.log("Inicializando funciones del dashboard...");
    setupAdminSidebar();
    setupAdminNavigation();
    setupProductForm();
    setupActionButtons();
    setupAdminEventListeners();
    setupAdminProfileForms();
    setupCarouselManagement();
    loadAdminProfile(); 
    setupBatchOrderActions(); 

    loadInitialSection();
    setupPrizeManagement();
}

function setupAdminEventListeners() {
    const logoutButton = document.getElementById('adminLogoutButton');
    if (logoutButton) logoutButton.addEventListener('click', adminLogout);

    const adminZoneSelect = document.getElementById('adminOrderZoneSelect');
    if (adminZoneSelect) {
        adminZoneSelect.addEventListener('change', updateAdminManualOrderShippingAndTotal);
    }

    const openRegisterOrderModalBtnAdmin = document.getElementById('openRegisterOrderModalBtnAdmin');
    const registerOrderModal = document.getElementById('registerOrderModal');
    const closeRegisterOrderModalBtn = document.getElementById('closeRegisterOrderModalBtn');
    const registerOrderForm = document.getElementById('registerOrderForm');
    const addProductToOrderBtn = document.getElementById('addProductToOrderBtn');
    const orderProductsListEl = document.getElementById('orderProductsList');
    const costoEnvioInputEl = document.querySelector('#registerOrderForm input[name="costoEnvio"]');
    if (costoEnvioInputEl) { 
        // Si se permite editar manualmente el costo de envío (no readonly), 
        // entonces este listener es útil. Si es readonly, no es necesario.
        costoEnvioInputEl.addEventListener('input', updateAdminManualOrderTotal);
    }
    const exportPdfBtn = document.getElementById('exportAdminOrdersPdfBtn'); // Listener para PDF
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportOrdersToPDF);
    }


    if (openRegisterOrderModalBtnAdmin && registerOrderModal) {
        openRegisterOrderModalBtnAdmin.addEventListener('click', async () => {
            await loadProductsForAdminOrderModal(); 
            registerOrderModal.style.display = 'flex';
            if (orderProductsListEl && orderProductsListEl.children.length === 0) {
                addAdminManualProductRow();
            }
            updateAdminManualOrderTotal();
        });
    }

    if (closeRegisterOrderModalBtn && registerOrderModal) {
        closeRegisterOrderModalBtn.addEventListener('click', () => {
            registerOrderModal.style.display = 'none';
            if (registerOrderForm) registerOrderForm.reset();
            if (orderProductsListEl) orderProductsListEl.innerHTML = '';
            adminManualOrderProductRowCount = 0;
            updateAdminManualOrderTotal(); 
            const messageElement = document.getElementById('adminOrderRegistrationMessage');
            if(messageElement) messageElement.textContent = '';
        });
    }

    if (addProductToOrderBtn) {
        addProductToOrderBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addAdminManualProductRow();
        });
    }

    if (orderProductsListEl) {
        orderProductsListEl.addEventListener('click', function(e) {
            if (e.target.closest('.removeProductBtn')) {
                e.target.closest('.order-product-row').remove();
                updateAdminManualOrderTotal();
            }
        });
        orderProductsListEl.addEventListener('change', function(e) {
            if (e.target.classList.contains('order-product-select') || e.target.classList.contains('order-product-cant')) {
                updateAdminManualOrderTotal();
            }
        });
    }
     if (costoEnvioInputEl) { 
        costoEnvioInputEl.addEventListener('input', updateAdminManualOrderTotal);
    }

    if (registerOrderForm) {
        registerOrderForm.addEventListener('submit', handleAdminRegisterOrderSubmit);
    }

    const statusFilter = document.getElementById('orderStatusFilter'); 
    if (statusFilter) {
        statusFilter.addEventListener('change', filterAdminOrders);
    }

    const tableContainers = document.querySelectorAll('.customers-table-container, .products-table-container');
    tableContainers.forEach(container => {
        container.addEventListener('click', (e) => {
             const button = e.target.closest('.action-btn'); if (!button) return;
             const productId = button.closest('tr')?.dataset.productId;
             const customerId = button.closest('tr')?.dataset.customerId;
        });
    });

    const filtroFechaPedidos = document.getElementById('filtroFechaPedidos');
    if (filtroFechaPedidos) {
        filtroFechaPedidos.addEventListener('change', () => {
            const fecha = filtroFechaPedidos.value;
            loadAdminOrders(fecha);
        });
    }
}

// NUEVA FUNCIÓN para manejar la selección de zona y actualizar costo de envío y total
function updateAdminManualOrderShippingAndTotal() {
    const zoneSelect = document.getElementById('adminOrderZoneSelect');
    const costoEnvioInput = document.getElementById('adminOrderCostoEnvioInput'); // El input (puede ser hidden/readonly)
    const shippingMsgEl = document.getElementById('adminOrderShippingMsg');

    if (!zoneSelect || !costoEnvioInput || !shippingMsgEl) {
        console.error("Elementos para zona de envío en pedido manual no encontrados.");
        return;
    }

    const selectedOption = zoneSelect.options[zoneSelect.selectedIndex];
    const shippingCostText = selectedOption ? selectedOption.dataset.cost : undefined;
    const zoneValue = zoneSelect.value;
    let calculatedShippingCost = 0;

    shippingMsgEl.style.display = 'none'; // Ocultar mensaje por defecto

    if (zoneValue && shippingCostText !== undefined) {
        calculatedShippingCost = parseFloat(shippingCostText);
        if (zoneValue === 'otra') {
            shippingMsgEl.textContent = 'Costo de envío para "Otra zona" se confirmará por separado.';
            shippingMsgEl.style.display = 'block';
            // Podrías decidir si el costo es 0 por defecto o se ingresa manualmente
            // Si el input de costo de envío es editable, el admin podría ajustarlo.
            // Si es readonly, y para "otra" se necesita un costo, se necesitaría un paso adicional.
            // Por ahora, lo dejamos en 0 si es 'otra' y el admin puede ajustarlo si el input no es readonly.
            // Si es readonly, el costo para 'otra' será 0 hasta que se implemente una lógica diferente.
        } else if (isNaN(calculatedShippingCost) || calculatedShippingCost < 0) {
            calculatedShippingCost = 0; // Fallback si el data-cost no es válido
        }
    }
    
    costoEnvioInput.value = calculatedShippingCost.toFixed(2); // Actualizar el input del costo de envío
    
    // Llamar a la función que recalcula todos los totales (subtotal productos + este nuevo envío)
    updateAdminManualOrderTotal(); 
}

function loadInitialSection() {
    const initialActiveLink = document.querySelector('.admin-menu .menu-link.active');
    let initialSectionId = 'dashboardContent';
    let initialSectionName = 'Dashboard';
    if (initialActiveLink) {
        initialSectionId = initialActiveLink.getAttribute('data-section') || 'dashboardContent';
        initialSectionName = initialActiveLink.querySelector('span')?.textContent || 'Dashboard';
    } else {
        const firstLink = document.querySelector('.admin-menu .menu-link');
        if (firstLink) {
            firstLink.classList.add('active');
            initialSectionId = firstLink.getAttribute('data-section') || 'dashboardContent';
            initialSectionName = firstLink.querySelector('span')?.textContent || 'Dashboard';
            const firstSectionElement = document.getElementById(initialSectionId);
            if (firstSectionElement) firstSectionElement.classList.add('active');
        }
    }
    const headerTitle = document.querySelector('.admin-main .header-title');
    if(headerTitle) headerTitle.textContent = initialSectionName;
    loadAdminSectionContent(initialSectionId);
}

// --- Sidebar y Navegación ---
function setupAdminSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    const main = document.querySelector('.admin-main');
    const toggleBtn = document.querySelector('.sidebar-toggle');
    const logoutBtn = document.getElementById('adminLogoutButton');
    const logoutText = logoutBtn?.querySelector('.logout-text');

    if (!sidebar || !main || !toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.toggle('collapsed');
        main.classList.toggle('expanded');
        if (logoutText) logoutText.style.display = isCollapsed ? 'none' : 'inline';
        if (logoutBtn) {
            logoutBtn.style.justifyContent = isCollapsed ? 'center' : 'flex-start';
            const icon = logoutBtn.querySelector('i');
            if(icon) icon.style.marginRight = isCollapsed ? '0' : '8px';
        }
    });
    if (sidebar.classList.contains('collapsed') && logoutText) logoutText.style.display = 'none';
    if (logoutBtn && sidebar.classList.contains('collapsed')) {
        logoutBtn.style.justifyContent = 'center';
        const icon = logoutBtn.querySelector('i');
        if(icon) icon.style.marginRight = '0';
    }
}
function setupAdminNavigation() {
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

            let sectionFound = false;
            sections.forEach(section => {
                if (section.id === targetSectionId) {
                    section.classList.add('active');
                    sectionFound = true;
                } else {
                    section.classList.remove('active');
                }
            });

            if (sectionFound) {
                if (headerTitle) headerTitle.textContent = targetSpan.textContent;
                loadAdminSectionContent(targetSectionId);
            } else {
                console.error(`Sección ${targetSectionId} no encontrada.`);
                const dashboardContent = document.getElementById('dashboardContent');
                if (dashboardContent) dashboardContent.classList.add('active');
                if (headerTitle) headerTitle.textContent = "Dashboard";
                const dashboardLink = document.querySelector('.menu-link[data-section="dashboardContent"]');
                if (dashboardLink) dashboardLink.classList.add('active');
                loadAdminSectionContent('dashboardContent');
            }
        });
    });
}

// --- Carga de Contenido Específico ---
function loadAdminSectionContent(sectionId) {
    console.log("Cargando contenido admin para:", sectionId);
    switch (sectionId) {
        case 'dashboardContent':
            loadDashboardStats();
            loadRecentActivity();
            break;
        case 'productsContent':
            loadProductsTable();
            break;
        case 'reportsContent':
            initializeCharts();
            break;
        case 'ordersContent':
            loadAdminOrders(); 
            break;
        case 'customersContent':
            loadCustomersTable();
            break;
        case 'configuracionContent':
             loadAdminProfile(); 
             loadCarouselImages(); 
             break;
        case 'premiosContent': 
            loadPrizes(); 
            break;
        case 'registrarPedidoContent': 
            loadProductsForAdminOrderModal(); 
            loadAdminManualOrders(); 
            const currentOrderProductsList = document.getElementById('orderProductsList');
            if (currentOrderProductsList && currentOrderProductsList.children.length === 0) {
                addAdminManualProductRow(); 
            }
            break;
        default:
            console.log(`No hay carga específica definida para la sección admin: ${sectionId}`);
    }
}

async function loadProductsForAdminOrderModal() {
    if (adminAvailableProducts.length > 0 && !document.getElementById('forceReloadProducts')) { 
        console.log("Usando productos cacheados para modal admin.");
        return;
    }
    try {
        const result = await makeAdminApiCall(`${API_BASE}/products`, 'GET', null, false);
        if (result.success && Array.isArray(result.data || result)) {
            adminAvailableProducts = result.data || result;
            console.log("Productos cargados para el modal de admin:", adminAvailableProducts.length);
        } else {
            console.error("Error cargando productos para modal admin:", result.message);
            showAdminNotification("No se pudieron cargar los productos para el formulario.", "error");
        }
    } catch (error) {
        console.error("Error en fetch de productos para modal admin:", error);
        showAdminNotification("Error de red al cargar productos.", "error");
    }
}

function renderAdminManualProductRow(idx) {
    let productOptions = '<option value="">Selecciona producto</option>';
    if (adminAvailableProducts.length > 0) {
        productOptions += adminAvailableProducts
            .filter(p => p.isActive) 
            .map(p =>
                `<option value="${p._id}" data-precio="${p.price}" data-name="${p.name}" data-image="${p.imageUrl || ''}">${p.name} ($${parseFloat(p.price || 0).toFixed(2)})</option>`
            ).join('');
    } else {
        productOptions = '<option value="">No hay productos activos cargados</option>';
    }

    return `<div class="order-product-row" style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
        <select class="form-control order-product-select" name="producto${idx}" required style="flex:2;">
            ${productOptions}
        </select>
        <input type="number" class="form-control order-product-cant" name="cantidad${idx}" min="1" value="1" required style="width:70px; padding: 0.5rem;">
        <button type="button" class="admin-btn btn-danger removeProductBtn" title="Quitar" style="padding:4px 10px;"><i class="fas fa-trash"></i></button>
    </div>`;
}

function addAdminManualProductRow() {
    const orderProductsListEl = document.getElementById('orderProductsList');
    if (!orderProductsListEl) return;
    adminManualOrderProductRowCount++;
    const div = document.createElement('div');
    div.innerHTML = renderAdminManualProductRow(adminManualOrderProductRowCount);
    orderProductsListEl.appendChild(div.firstElementChild); 
    updateAdminManualOrderShippingAndTotal(); // MODIFICADO: Llamar a esta para que se actualice el envío también
}

function updateAdminManualOrderTotal() {
    const orderProductsListEl = document.getElementById('orderProductsList');
    const costoEnvioInputEl = document.getElementById('adminOrderCostoEnvioInput'); // Usar ID específico
    const subtotalDisplayEl = document.getElementById('orderSubtotalProducts');
    const shippingCostDisplayEl = document.getElementById('orderShippingCostDisplay'); // Para mostrar el costo
    const totalGeneralDisplayEl = document.getElementById('orderTotalGeneral');

    if (!orderProductsListEl || !costoEnvioInputEl || !subtotalDisplayEl || !shippingCostDisplayEl || !totalGeneralDisplayEl) {
        console.warn("Faltan elementos del DOM para actualizar total de pedido manual.");
        return;
    }

    let subtotalProductos = 0;
    orderProductsListEl.querySelectorAll('.order-product-row').forEach(row => {
        const select = row.querySelector('.order-product-select');
        const cantInput = row.querySelector('.order-product-cant');
        const selectedOption = select ? select.options[select.selectedIndex] : null;
        const precio = selectedOption ? parseFloat(selectedOption.dataset.precio || 0) : 0;
        const cantidad = cantInput ? parseInt(cantInput.value) || 0 : 0;

        if (precio > 0 && cantidad > 0) {
            subtotalProductos += precio * cantidad;
        }
    });

    const costoEnvio = parseFloat(costoEnvioInputEl.value) || 0; // Obtener valor del input

    subtotalDisplayEl.textContent = `$${subtotalProductos.toFixed(2)}`;
    shippingCostDisplayEl.textContent = `$${costoEnvio.toFixed(2)}`; // Mostrar el costo de envío
    totalGeneralDisplayEl.textContent = `$${(subtotalProductos + costoEnvio).toFixed(2)}`;
}

async function handleAdminRegisterOrderSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const messageElement = document.getElementById('adminOrderRegistrationMessage');

    if (!messageElement) { 
        const p = document.createElement('p');
        p.id = 'adminOrderRegistrationMessage';
        p.style.marginTop = '1rem'; p.style.fontWeight = 'bold';
        form.insertBefore(p, submitButton.parentElement); 
    }
    messageElement.textContent = ''; 

    const items = [];
    let subtotalProductos = 0;
    form.querySelectorAll('.order-product-row').forEach(row => {
        // ... (código existente para recolectar items y calcular subtotalProductos) ...
        const select = row.querySelector('.order-product-select');
        const quantityInput = row.querySelector('.order-product-cant');
        const selectedOption = select.selectedOptions[0];

        if (selectedOption && selectedOption.value && quantityInput.value) {
            const productId = selectedOption.value;
            const quantity = parseInt(quantityInput.value, 10);
            const price = parseFloat(selectedOption.dataset.precio);
            const name = selectedOption.dataset.name;
            const image = selectedOption.dataset.image;

            if (productId && quantity > 0 && price >= 0 && name) {
                items.push({ productId, quantity, price, name, image });
                subtotalProductos += price * quantity;
            }
        }
    });

    if (items.length === 0) {
        showAdminNotification('Debe agregar al menos un producto al pedido.', 'error');
        return;
    }

    const costoEnvio = parseFloat(form.costoEnvio.value) || 0; // Tomar el valor actualizado del input
    const totalAmount = subtotalProductos + costoEnvio;

    const orderData = {
        deliveryDetails: {
            nombre: form.nombreCliente.value.trim(),
            telefono: form.telefonoCliente.value.trim(),
            direccion: form.direccionCliente.value.trim(),
            zona: form.zonaEnvio.value.trim(), // Valor del select
            referencia: form.puntoReferencia.value.trim()
        },
        items: items,
        totalAmount: totalAmount,
        shippingCost: costoEnvio,
        status: 'processing', 
        source: 'admin_manual'
    };

    // ... (resto de la lógica de submit, llamada API, etc.) ...
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

    try {
        const result = await makeAdminApiCall(`${API_BASE}/admin/manual-order`, 'POST', orderData);
        if (result.success) {
            showAdminNotification('Pedido manual registrado con éxito!', 'success');
            form.reset();
            document.getElementById('orderProductsList').innerHTML = '';
            adminManualOrderProductRowCount = 0; 
            // Resetear select de zona y mensaje de envío
            const zoneSelect = document.getElementById('adminOrderZoneSelect');
            if(zoneSelect) zoneSelect.value = "";
            const shippingMsgEl = document.getElementById('adminOrderShippingMsg');
            if(shippingMsgEl) {
                shippingMsgEl.textContent = '';
                shippingMsgEl.style.display = 'none';
            }
            const costoEnvioInput = document.getElementById('adminOrderCostoEnvioInput');
            if(costoEnvioInput) costoEnvioInput.value = "0.00";

            addAdminManualProductRow(); 
            updateAdminManualOrderTotal();
            
            const modal = document.getElementById('registerOrderModal');
            if (modal) modal.style.display = 'none';
            loadAdminManualOrders(); 
        } else {
            messageElement.textContent = result.message || 'Error al registrar el pedido.';
            messageElement.style.color = 'red';
        }
    } catch (error) {
        messageElement.textContent = 'Error de red al registrar el pedido.';
        messageElement.style.color = 'red';
        console.error(error);
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-save"></i> Registrar Pedido';
    }
}

async function loadAdminManualOrders() {
    const tableBody = document.querySelector('#adminManualOrdersTable tbody');
    if (!tableBody) {
        console.error("Tabla para pedidos manuales de admin no encontrada.");
        return;
    }
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Cargando pedidos manuales...</td></tr>';

    try {
        const result = await makeAdminApiCall(`${API_BASE}/admin/orders?source=admin_manual`, 'GET');
        if (result.success && Array.isArray(result.data)) {
            if (result.data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay pedidos registrados manualmente.</td></tr>';
            } else {
                tableBody.innerHTML = result.data.map(order => `
                    <tr>
                        <td>${order.orderId || order._id}</td>
                        <td>${order.deliveryDetails?.nombre || 'N/A'}</td>
                        <td>${order.deliveryDetails?.telefono || 'N/A'}</td>
                        <td>${order.deliveryDetails?.direccion || 'N/A'}</td>
                        <td>${order.deliveryDetails?.zona || 'N/A'}</td>
                        <td>$${(order.totalAmount || 0).toFixed(2)}</td>
                        <td>${order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-ES') : 'N/A'}</td>
                        <td><span class="status-badge ${order.status?.toLowerCase() || 'unknown'}">${order.status || 'N/A'}</span></td>
                    </tr>
                `).join('');
            }
        } else {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Error: ${result.message || 'No se pudieron cargar los pedidos.'}</td></tr>`;
        }
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Error de red: ${error.message}</td></tr>`;
        console.error(error);
    }
}

// --- Gestión de Imágenes del Carrusel ---
function setupCarouselManagement() {
    const addCarouselImageForm = document.getElementById('addCarouselImageForm');
    const currentCarouselImagesContainer = document.getElementById('currentCarouselImages');

    if (addCarouselImageForm) {
        addCarouselImageForm.addEventListener('submit', handleAddCarouselImage);
    }

    if (currentCarouselImagesContainer) {
        currentCarouselImagesContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('delete-carousel-img-btn') || event.target.closest('.delete-carousel-img-btn')) {
                const button = event.target.closest('.delete-carousel-img-btn');
                const imageId = button.dataset.id;
                if (imageId) {
                    handleDeleteCarouselImage(imageId);
                }
            }
        });
    }
}

async function loadCarouselImages() {
    const container = document.getElementById('currentCarouselImages');
    const countMessage = document.getElementById('carouselCountMessage');
    if (!container || !countMessage) {
        console.error("Elementos para mostrar imágenes del carrusel no encontrados.");
        return;
    }
    container.innerHTML = '<p>Cargando imágenes...</p>';
    countMessage.textContent = 'Se requieren mínimo 3 imágenes.';

    try {
        const result = await makeAdminApiCall(`${API_BASE}/carousel-images`, 'GET', null, false); 
        if (result.success && Array.isArray(result.data)) {
            currentAdminCarouselImages = result.data; 
            if (currentAdminCarouselImages.length === 0) {
                container.innerHTML = '<p>No hay imágenes en el carrusel. Sube al menos 3.</p>';
            } else {
                container.innerHTML = currentAdminCarouselImages.map(image => `
                    <div class="carousel-image-item" style="border: 1px solid #ddd; padding: 0.5rem; border-radius: 4px; text-align: center; width: 150px;">
                        <img src="${image.imageUrl}" alt="${image.title || 'Imagen Carrusel'}" style="width: 100%; height: 80px; object-fit: cover; margin-bottom: 0.5rem;">
                        <p style="font-size: 0.8em; margin-bottom: 0.5rem; word-break: break-all;">${image.title || image.filename}</p>
                        <button class="admin-btn btn-danger btn-sm delete-carousel-img-btn" data-id="${image._id}" title="Eliminar Imagen">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                `).join('');
            }
            countMessage.textContent = `Imágenes actuales: ${currentAdminCarouselImages.length}. Se requieren mínimo 3.`;
            if (currentAdminCarouselImages.length <= 3) {
                 countMessage.style.color = 'red';
            } else {
                 countMessage.style.color = '#555';
            }
        } else {
            container.innerHTML = `<p style="color: red;">Error al cargar imágenes: ${result.message || 'Desconocido'}</p>`;
        }
    } catch (error) {
        console.error("Error en loadCarouselImages:", error);
        container.innerHTML = `<p style="color: red;">Error de red al cargar imágenes.</p>`;
    }
}

async function handleAddCarouselImage(event) {
    event.preventDefault();
    const form = event.target;
    const fileInput = document.getElementById('carouselImageFile');
    const titleInput = document.getElementById('carouselImageTitle');
    const messageElement = document.getElementById('carouselAdminMessage');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!fileInput.files || fileInput.files.length === 0) {
        messageElement.textContent = 'Por favor, selecciona un archivo de imagen.';
        messageElement.style.color = 'red';
        return;
    }

    const formData = new FormData();
    formData.append('carouselImageFile', fileInput.files[0]);
    if (titleInput.value.trim()) {
        formData.append('title', titleInput.value.trim());
    }

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
    messageElement.textContent = '';

    try {
        const token = sessionStorage.getItem(ADMIN_AUTH_KEY);
        const response = await fetch(`${API_BASE}/admin/carousel-images`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok && result.success) {
            messageElement.textContent = result.message || 'Imagen agregada con éxito.';
            messageElement.style.color = 'green';
            form.reset();
            loadCarouselImages(); 
        } else {
            messageElement.textContent = result.message || 'Error al agregar la imagen.';
            messageElement.style.color = 'red';
        }
    } catch (error) {
        console.error("Error en handleAddCarouselImage:", error);
        messageElement.textContent = 'Error de red al subir la imagen.';
        messageElement.style.color = 'red';
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-plus"></i> Agregar Imagen al Carrusel';
    }
}

async function handleDeleteCarouselImage(imageId) {
    if (currentAdminCarouselImages.length <= 3) {
        showAdminNotification('No se puede eliminar. Se requiere un mínimo de 3 imágenes en el carrusel.', 'warning');
        return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen del carrusel?')) {
        return;
    }

    const messageElement = document.getElementById('carouselAdminMessage');
    messageElement.textContent = '';

    try {
        const result = await makeAdminApiCall(`${API_BASE}/admin/carousel-images/${imageId}`, 'DELETE');
        if (result.success) {
            messageElement.textContent = result.message || 'Imagen eliminada con éxito.';
            messageElement.style.color = 'green';
            loadCarouselImages(); 
        } else {
            messageElement.textContent = result.message || 'Error al eliminar la imagen.';
            messageElement.style.color = 'red';
        }
    } catch (error) {
        console.error("Error en handleDeleteCarouselImage:", error);
        messageElement.textContent = 'Error de red al eliminar la imagen.';
        messageElement.style.color = 'red';
    }
}


// --- Actividad Reciente ---
async function loadRecentActivity() {
    console.log("Cargando actividad reciente...");
    const recentOrdersList = document.getElementById('recentOrdersList');
    const recentCustomersList = document.getElementById('recentCustomersList');
    const recentProductsList = document.getElementById('recentProductsList');

    const setListPlaceholder = (listElement, message) => {
        if (listElement) {
            listElement.innerHTML = `<li class="${message.includes('Cargando') ? 'loading' : 'empty'}-placeholder">${message}</li>`;
        }
    };
    setListPlaceholder(recentOrdersList, 'Cargando pedidos...');
    setListPlaceholder(recentCustomersList, 'Cargando clientes...');
    setListPlaceholder(recentProductsList, 'Cargando productos...');

    try {
        const ordersResult = await makeAdminApiCall(`${API_BASE}/admin/orders?limit=${RECENT_ACTIVITY_LIMIT}&sort=-createdAt`, 'GET');
        if (ordersResult.success && Array.isArray(ordersResult.data)) {
            const recentOrders = ordersResult.data; 
            if (recentOrders.length > 0) recentOrdersList.innerHTML = recentOrders.map(renderRecentOrder).join('');
            else setListPlaceholder(recentOrdersList, 'No hay pedidos recientes.');
        } else { setListPlaceholder(recentOrdersList, 'Error al cargar pedidos.'); console.error("Error cargando pedidos recientes:", ordersResult.message); }

        const customersResult = await makeAdminApiCall(`${API_BASE}/admin/users?limit=${RECENT_ACTIVITY_LIMIT}&sort=-createdAt`, 'GET');
        if (customersResult.success && Array.isArray(customersResult.data)) {
            const recentCustomers = customersResult.data;
            if (recentCustomers.length > 0) recentCustomersList.innerHTML = recentCustomers.map(renderRecentCustomer).join('');
            else setListPlaceholder(recentCustomersList, 'No hay clientes recientes.');
        } else { setListPlaceholder(recentCustomersList, 'Error al cargar clientes.'); console.error("Error cargando clientes recientes:", customersResult.message); }

        const productsResult = await makeAdminApiCall(`${API_BASE}/products?limit=${RECENT_ACTIVITY_LIMIT}&sort=-createdAt`, 'GET', null, false); 
        if (productsResult.success && Array.isArray(productsResult.data || productsResult)) { 
            const products = productsResult.data || productsResult;
            const recentProducts = products;
            if (recentProducts.length > 0) recentProductsList.innerHTML = recentProducts.map(renderRecentProduct).join('');
            else setListPlaceholder(recentProductsList, 'No hay productos recientes.');
        } else { setListPlaceholder(recentProductsList, 'Error al cargar productos.'); console.error("Error cargando productos recientes:", productsResult.message); }

    } catch (error) {
        console.error("Error general al cargar actividad reciente:", error);
        setListPlaceholder(recentOrdersList, 'Error de carga.');
        setListPlaceholder(recentCustomersList, 'Error de carga.');
        setListPlaceholder(recentProductsList, 'Error de carga.');
    }
}
function renderRecentOrder(order) {
    const orderId = order.orderId || order._id.slice(-6);
    const customerName = order.deliveryDetails?.nombre || (order.userId?.nombre) || (order.isGuestOrder ? 'Invitado' : 'Usuario Desconocido');
    const timestamp = order.createdAt ? formatRelativeTime(new Date(order.createdAt)) : '-';
    const statusClass = `status-${order.status?.toLowerCase() || 'pending'}`;
    return `
        <li>
            <span class="item-info">
                <span class="item-id">Pedido #${orderId}</span>
                <span class="item-details">por ${customerName} - $${(order.totalAmount || 0).toFixed(2)}</span>
            </span>
            <span class="item-status ${statusClass}">${order.status || 'Pendiente'}</span>
            <span class="item-timestamp" title="${new Date(order.createdAt).toLocaleString()}">${timestamp}</span>
        </li>
    `;
}
function renderRecentCustomer(customer) {
    const customerName = customer.nombre || 'Cliente Sin Nombre';
    const customerEmail = customer.email || '-';
    const timestamp = customer.createdAt ? formatRelativeTime(new Date(customer.createdAt)) : '-';
    return `
        <li>
            <span class="item-info">
                 <span class="item-id">${customerName}</span>
                 <span class="item-details">${customerEmail}</span>
            </span>
            <span class="item-timestamp" title="${new Date(customer.createdAt).toLocaleString()}">${timestamp}</span>
        </li>
    `;
}
function renderRecentProduct(product) {
    const productName = product.name || 'Producto Sin Nombre';
    const productCategory = product.category || '-';
    const timestamp = product.createdAt ? formatRelativeTime(new Date(product.createdAt)) : '-';
     const statusClass = product.isActive ? 'status-active' : 'status-inactive';
     const statusText = product.isActive ? 'Activo' : 'Inactivo';
    return `
        <li>
            <span class="item-info">
                 <span class="item-id">${productName}</span>
                 <span class="item-details">Categoría: ${productCategory}</span>
            </span>
             <span class="item-status ${statusClass}">${statusText}</span>
            <span class="item-timestamp" title="${new Date(product.createdAt).toLocaleString()}">${timestamp}</span>
        </li>
    `;
}
function formatRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.round((now - date) / 1000);
    const diffInMinutes = Math.round(diffInSeconds / 60);
    const diffInHours = Math.round(diffInMinutes / 60);
    const diffInDays = Math.round(diffInHours / 24);

    if (diffInSeconds < 60) return `hace segs`;
    if (diffInMinutes < 60) return `hace ${diffInMinutes} min`;
    if (diffInHours < 24) return `hace ${diffInHours} hr`;
    if (diffInDays === 1) return `ayer`;
    if (diffInDays < 7) return `hace ${diffInDays} días`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// --- Gestión de Pedidos (Admin) ---
// NUEVO: Variable global para el estado de la selección
// let adminSelectedOrderIds = new Set(); // Movida al inicio del archivo

// NUEVO: Función para actualizar el estado de los botones de acción en lote
function updateBatchActionButtonsState() {
    const selectedCheckboxes = document.querySelectorAll('#adminOrdersList .order-select-checkbox:checked:not(:disabled)');
    const batchActionsContainer = document.querySelector('.batch-actions');
    const markSelectedBtn = document.getElementById('markSelectedAsDeliveredBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    const selectedCountSpan = document.getElementById('selectedOrdersCount');

    if (!batchActionsContainer || !markSelectedBtn || !deselectAllBtn || !selectedCountSpan) {
        console.warn("Elementos de acciones en lote no encontrados.");
        return;
    }

    adminSelectedOrderIds.clear();
    selectedCheckboxes.forEach(cb => adminSelectedOrderIds.add(cb.dataset.orderId));

    const numSelected = adminSelectedOrderIds.size;
    selectedCountSpan.textContent = `${numSelected} pedido(s) seleccionados`;

    if (numSelected > 0) {
        batchActionsContainer.style.display = 'flex';
        deselectAllBtn.style.display = 'inline-block';
        markSelectedBtn.disabled = false;
        markSelectedBtn.title = `Marcar ${numSelected} pedido(s) como Entregados`;
    } else {
        // Ocultar si no hay nada seleccionado, excepto si se está mostrando explícitamente por otra razón
        const adminOrdersListContainer = document.getElementById('adminOrdersList');
        if (adminOrdersListContainer && adminOrdersListContainer.children.length > 0 && adminOrdersListContainer.querySelector('p')?.textContent?.includes('Cargando') === false) {
             // Solo ocultar si hay pedidos cargados y ninguno está seleccionado.
            if(numSelected === 0) batchActionsContainer.style.display = 'none';
        } else if (numSelected === 0) {
            batchActionsContainer.style.display = 'none';
        }


        deselectAllBtn.style.display = 'none';
        markSelectedBtn.disabled = true;
        markSelectedBtn.title = 'Seleccione pedidos para marcar como entregados';
    }
}


// NUEVO: Configurar listeners para acciones en lote
function setupBatchOrderActions() {
    const adminOrdersListContainer = document.getElementById('adminOrdersList');
    const markSelectedAsDeliveredBtn = document.getElementById('markSelectedAsDeliveredBtn');
    const selectAllVisibleBtn = document.getElementById('selectAllVisibleBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');

    if (adminOrdersListContainer) {
        adminOrdersListContainer.addEventListener('change', (event) => {
            if (event.target.classList.contains('order-select-checkbox')) {
                updateBatchActionButtonsState();
            }
        });
    }

    if (markSelectedAsDeliveredBtn) {
        markSelectedAsDeliveredBtn.addEventListener('click', async () => {
            const orderIdsToUpdate = Array.from(adminSelectedOrderIds);

            if (orderIdsToUpdate.length === 0) {
                showAdminNotification('No hay pedidos seleccionados para actualizar.', 'info');
                return;
            }

            if (!confirm(`¿Está seguro de que desea marcar ${orderIdsToUpdate.length} pedido(s) como "Entregado"?`)) {
                return;
            }

            markSelectedAsDeliveredBtn.disabled = true;
            markSelectedAsDeliveredBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
            let successCount = 0;
            let errorCount = 0;

            for (const orderId of orderIdsToUpdate) {
                try {
                    const result = await makeAdminApiCall(`${API_BASE}/admin/orders/${orderId}/status`, 'PATCH', { status: 'delivered' });
                    if (result.success) {
                        successCount++;
                    } else {
                        errorCount++;
                        console.error(`Error al actualizar pedido ${orderId}: ${result.message}`);
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`Error de red al actualizar pedido ${orderId}:`, error);
                }
            }

            markSelectedAsDeliveredBtn.innerHTML = '<i class="fas fa-check-double"></i> Marcar Seleccionados como Entregados';
            markSelectedAsDeliveredBtn.disabled = false; // Rehabilitar después de procesar

            if (errorCount > 0) {
                showAdminNotification(`${successCount} pedido(s) actualizados. ${errorCount} tuvieron errores.`, 'warning');
            } else if (successCount > 0) {
                showAdminNotification(`${successCount} pedido(s) actualizados a "Entregado" exitosamente.`, 'success');
            } else {
                 showAdminNotification('No se pudo actualizar ningún pedido.', 'info');
            }

            await loadAdminOrders(); // Recargar la lista de pedidos
            // El estado de los botones se reseteará con updateBatchActionButtonsState()
            // que es llamado por loadAdminOrders -> displayAdminOrders -> filterAdminOrders
        });
    }

    if (selectAllVisibleBtn) {
        selectAllVisibleBtn.addEventListener('click', () => {
            const visibleOrderCards = document.querySelectorAll('#adminOrdersList .order-card-visual');
            visibleOrderCards.forEach(card => {
                if (card.style.display !== 'none') { 
                    const checkbox = card.querySelector('.order-select-checkbox:not(:disabled)');
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                }
            });
            updateBatchActionButtonsState();
        });
    }

    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            document.querySelectorAll('#adminOrdersList .order-select-checkbox:checked').forEach(cb => {
                cb.checked = false;
            });
            updateBatchActionButtonsState();
        });
    }
}


async function loadAdminOrders(fecha = null) {
    console.log("Cargando TODOS los pedidos para admin...");
    const ordersContainer = document.getElementById('adminOrdersList');
    if (!ordersContainer) { console.error("Contenedor de pedidos admin (#adminOrdersList) no encontrado."); return; }
    
    // Mostrar el contenedor de acciones en lote solo si no está ya visible y hay pedidos.
    const batchActionsContainer = document.querySelector('.batch-actions');
    if (batchActionsContainer && batchActionsContainer.style.display === 'none' && ordersContainer.children.length > 0 && !ordersContainer.querySelector('p')?.textContent?.includes('Cargando')) {
        // No se muestra hasta que haya algo que seleccionar, lo maneja updateBatchActionButtonsState
    }

    ordersContainer.innerHTML = '<p style="text-align: center; width: 100%; padding: 2rem 0;">Cargando pedidos... <i class="fas fa-spinner fa-spin"></i></p>';
    try {
        let url = `${API_BASE}/admin/orders`;
        if (fecha) {
            url += `?fecha=${fecha}`;
        }
        const result = await makeAdminApiCall(url, 'GET');
        if (result.success && Array.isArray(result.data)) {
            displayAdminOrders(result.data); 
        } else {
            throw new Error(result.message || 'No se pudieron cargar los pedidos.');
        }
    } catch (error) {
        console.error("Error al cargar pedidos (admin):", error);
        ordersContainer.innerHTML = `<p style="text-align: center; width: 100%; color: red; padding: 2rem 0;">Error al cargar pedidos: ${error.message}</p>`;
    }
    updateBatchActionButtonsState(); // Asegurar que los botones de lote se actualicen después de cargar
}

function displayAdminOrders(orders) {
    const ordersContainer = document.getElementById('adminOrdersList'); if (!ordersContainer) return;
    if (orders.length === 0) { 
        ordersContainer.innerHTML = '<p style="text-align: center; width: 100%; padding: 2rem 0;">No hay pedidos para mostrar.</p>'; 
        updateBatchActionButtonsState(); // Actualizar botones incluso si no hay pedidos
        return; 
    }
    ordersContainer.innerHTML = orders.map(renderAdminOrderCard).join('');
    filterAdminOrders(); 
    setupCustomStatusSelects();
    updateBatchActionButtonsState(); // Llamar aquí también
}

function renderAdminOrderCard(order) {
    let orderDateFormatted = 'Fecha inválida';
    let orderDate = '';
    try {
        if (order.createdAt) {
            const date = new Date(order.createdAt);
            orderDateFormatted = date.toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            orderDate = date.toISOString().split('T')[0]; 
        }
    } catch (e) { }
    let customerInfo = ''; let customerType = '';
    if (order.isGuestOrder) { customerInfo = order.deliveryDetails?.nombre || 'Invitado'; customerType = '<span style="font-size: 0.8em; color: #777;"> (Invitado)</span>'; }
    else if (order.userId) { customerInfo = order.userId.nombre || order.deliveryDetails?.nombre || 'Registrado'; customerType = ''; }
    else { customerInfo = 'Desconocido'; customerType = ''; }
    const customerPhone = order.deliveryDetails?.telefono || '-'; const customerAddress = order.deliveryDetails?.direccion || '-'; const customerZone = order.deliveryDetails?.zona || '-';
    const itemsSummary = order.items.map(item => `${item.quantity}x ${item.name}`).join(', ');
    const statusOptions = [
        { value: 'pending', text: 'Pendiente', class: 'status-pendiente' },
        { value: 'processing', text: 'En preparación', class: 'status-procesando' },
        { value: 'shipped', text: 'En camino', class: 'status-camino' },
        { value: 'delivered', text: 'Entregado', class: 'status-entregado' },
        { value: 'cancelled', text: 'Cancelado', class: 'status-cancelado' }
    ];
    const currentStatus = statusOptions.find(opt => opt.value === order.status) || statusOptions[0];
    const statusBorderClass = `status-border-${order.status}`;
    
    const orderDataString = JSON.stringify(order).replace(/'/g, "&apos;");


    const checkboxHTML = `
        <input type="checkbox"
               class="order-select-checkbox admin-form-checkbox"
               data-order-id="${order._id}"
               data-current-status="${order.status}"
               style="margin-right: 10px; vertical-align: middle; width: 18px; height: 18px; accent-color: var(--admin-primary, #BB002B);"
               ${order.status === 'delivered' || order.status === 'cancelled' ? 'disabled' : ''}
               title="${order.status === 'delivered' ? 'Este pedido ya fue entregado' : (order.status === 'cancelled' ? 'Este pedido fue cancelado' : 'Seleccionar pedido')}">
    `;

    const customSelectHTML = `
      <div class="custom-status-select ${currentStatus.class}" data-order-id="${order._id}">
        <button type="button" class="custom-select-btn ${currentStatus.class}">${currentStatus.text} <i class="fas fa-chevron-down"></i></button>
        <ul class="custom-select-options">
          ${statusOptions.map(opt => `<li class="custom-select-option ${opt.class}" data-value="${opt.value}">${opt.text}</li>`).join('')}
        </ul>
      </div>
    `;
    const subtotalProductos = (parseFloat(order.totalAmount) || 0) - (parseFloat(order.shippingCost) || 0);

    return `
        <div class="order-card-visual ${statusBorderClass}" 
             data-order-db-id="${order._id}" 
             data-order-status="${order.status}" 
             data-order-date="${orderDate}"
             data-order-data='${orderDataString}'> 
            <div class="order-card-header">
                <div style="display: flex; align-items: center;">
                    ${checkboxHTML}
                    <div class="order-id"><i class="fas fa-receipt"></i> ${order.orderId || order._id}</div>
                </div>
                ${customSelectHTML}
            </div>
            <div class="order-card-body">
                <div class="order-info-row"> <i class="fas fa-user"></i> <strong>Cliente:</strong> ${customerInfo}${customerType} </div>
                <div class="order-info-row"> <i class="fas fa-phone"></i> <strong>Teléfono:</strong> ${customerPhone} </div>
                <div class="order-info-row"> <i class="fas fa-map-marker-alt"></i> <strong>Dirección:</strong> ${customerAddress} (${customerZone}) </div>
                <div class="order-info-row"> <i class="fas fa-calendar-alt"></i> <strong>Fecha:</strong> ${orderDateFormatted} </div>
                
                <div class="order-info-row" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed #eee;"> 
                    <i class="fas fa-sushi"></i> <strong>Subtotal Productos:</strong> $${subtotalProductos.toFixed(2)}
                </div>
                <div class="order-info-row">
                    <i class="fas fa-shipping-fast"></i> <strong>Costo Envío:</strong> $${(parseFloat(order.shippingCost) || 0).toFixed(2)}
                </div>
                <div class="order-info-row" style="font-weight: bold; color: var(--admin-accent, #3498DB);">
                    <i class="fas fa-dollar-sign"></i> <strong>Total General:</strong> $${(parseFloat(order.totalAmount) || 0).toFixed(2)}
                </div>

                <div class="order-info-row" style="margin-top: 0.5rem;"> <i class="fas fa-list"></i> <strong>Ítems:</strong> <div class="order-items-summary" title="${itemsSummary}">${itemsSummary}</div> </div>
            </div>
            <div class="order-card-actions"> 
                <button class="action-btn view-btn" title="Ver detalles (Pendiente)" data-id="${order._id}"><i class="fas fa-eye"></i> Ver</button> 
                <button class="action-btn print-btn" title="Imprimir (Pendiente)" data-id="${order._id}"><i class="fas fa-print"></i> Imprimir</button> 
            </div>
        </div>
    `;
}

function setupCustomStatusSelects() {
  document.querySelectorAll('.custom-status-select').forEach(select => {
    const btn = select.querySelector('.custom-select-btn');
    const options = select.querySelector('.custom-select-options');
    if (!btn || !options) return;

    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-status-select.open').forEach(s => { if (s !== select) s.classList.remove('open'); });
      select.classList.toggle('open');
    });

    options.querySelectorAll('.custom-select-option').forEach(opt => {
        const newOpt = opt.cloneNode(true);
        opt.parentNode.replaceChild(newOpt, opt);
        newOpt.addEventListener('click', async (e) => {
            e.stopPropagation();
            const newStatus = newOpt.getAttribute('data-value');
            const orderId = select.getAttribute('data-order-id');
            if (!orderId || !newStatus) return;
            
            newBtn.disabled = true; 
            try {
                const result = await makeAdminApiCall(`${API_BASE}/admin/orders/${orderId}/status`, 'PATCH', { status: newStatus });
                if (result.success) {
                    showAdminNotification(`Pedido actualizado a ${newOpt.textContent}.`, 'success');
                    loadAdminOrders(); 
                } else {
                    showAdminNotification(`Error al actualizar: ${result.message}`, 'error');
                }
            } catch (error) {
                showAdminNotification(`Error de red: ${error.message}`, 'error');
            } finally {
                newBtn.disabled = false; 
                select.classList.remove('open');
            }
        });
    });
  });
  if (!window._customStatusSelectOutsideClickAttached) {
    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-status-select.open').forEach(s => s.classList.remove('open'));
    });
    window._customStatusSelectOutsideClickAttached = true;
  }
}
function renderCustomStatusFilter() {
  const filterContainer = document.querySelector('#ordersContent .filters-group');
  if (!filterContainer) return;
  
  let customFilterElement = document.getElementById('customStatusFilter');
  if (customFilterElement) customFilterElement.remove();

  const statusOptions = [
    { value: 'all', text: 'Todos', class: 'status-todos' },
    { value: 'pending', text: 'Pendiente', class: 'status-pendiente' },
    { value: 'processing', text: 'En preparación', class: 'status-procesando' },
    { value: 'shipped', text: 'En camino', class: 'status-camino' },
    { value: 'delivered', text: 'Entregado', class: 'status-entregado' },
    { value: 'cancelled', text: 'Cancelado', class: 'status-cancelado' }
  ];
  let selected = window._adminStatusFilterValue || 'all';
  const currentStatus = statusOptions.find(opt => opt.value === selected) || statusOptions[0];
  
  let html = `<div class="custom-status-filter ${currentStatus.class}" id="customStatusFilter" style="display:flex;align-items:center;gap:1rem;">
    <div class="status-filter-group">
      <button type="button" class="custom-select-btn ${currentStatus.class}">${currentStatus.text}</button>
      <ul class="custom-select-options">
        ${statusOptions.map(opt => `<li class="custom-select-option ${opt.class}" data-value="${opt.value}">${opt.text}</li>`).join('')}
      </ul>
    </div>
  </div>`;
  filterContainer.insertAdjacentHTML('afterbegin', html);
  setupCustomStatusFilterLogic();
}

function setupCustomStatusFilterLogic() {
  const filter = document.getElementById('customStatusFilter');
  if (!filter) return;
  const btn = filter.querySelector('.custom-select-btn');
  const options = filter.querySelector('.custom-select-options');
  if (!btn || !options) return;

  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.custom-status-filter.open').forEach(s => { if (s !== filter) s.classList.remove('open'); });
    filter.classList.toggle('open');
  });

  options.querySelectorAll('.custom-select-option').forEach(opt => {
    const newOpt = opt.cloneNode(true);
    opt.parentNode.replaceChild(newOpt, opt);
    newOpt.addEventListener('click', (e) => {
      e.stopPropagation();
      const newValue = newOpt.getAttribute('data-value');
      window._adminStatusFilterValue = newValue; 
      
      filter.className = `custom-status-filter ${newOpt.className.replace('custom-select-option','').trim()}`;
      newBtn.className = `custom-select-btn ${newOpt.className.replace('custom-select-option','').trim()}`;
      newBtn.innerHTML = `${newOpt.textContent}`;
      
      filter.classList.remove('open');
      filterAdminOrders(); 
    });
  });

  if (!window._customStatusFilterOutsideClickAttached) {
    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-status-filter.open').forEach(s => s.classList.remove('open'));
    });
    window._customStatusFilterOutsideClickAttached = true;
  }
}
function filterAdminOrders() {
  const selectedStatus = window._adminStatusFilterValue || 'all'; 
  const selectedDate = document.getElementById('filtroFechaPedidos')?.value;
  const orderCards = document.querySelectorAll('#adminOrdersList .order-card-visual');
  let visibleCount = 0;

  orderCards.forEach(card => {
    const cardStatus = card.dataset.orderStatus;
    const cardDate = card.dataset.orderDate;
    
    const statusMatch = selectedStatus === 'all' || cardStatus === selectedStatus;
    const dateMatch = !selectedDate || cardDate === selectedDate;

    if (statusMatch && dateMatch) {
      card.style.display = 'flex';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  const ordersContainer = document.getElementById('adminOrdersList');
  let noOrdersMessage = ordersContainer.querySelector('.no-orders-message');
  if (visibleCount === 0 && ordersContainer) {
    if (!noOrdersMessage) {
      const p = document.createElement('p');
      p.className = 'no-orders-message';
      p.style.textAlign = 'center';
      p.style.width = '100%';
      p.style.padding = '2rem 0';
      ordersContainer.appendChild(p);
      noOrdersMessage = p;
    }
    noOrdersMessage.textContent = `No hay pedidos con los filtros seleccionados.`;
  } else if (noOrdersMessage) {
    noOrdersMessage.remove();
  }
  updateBatchActionButtonsState(); // NUEVO: Actualizar estado de botones de lote
}
const originalLoadAdminOrders_forFilter = loadAdminOrders;
loadAdminOrders = async function(fecha = null) { // Asegurar que fecha tenga un valor por defecto
  renderCustomStatusFilter(); 
  await originalLoadAdminOrders_forFilter(fecha); // Pasar la fecha
  updateBatchActionButtonsState(); // Asegurar que se llame después de cargar
};

// --- Gestión de Productos ---
function setupProductForm() {
    const addProductForm = document.getElementById('addProductForm');
    const addProductMessage = document.getElementById('addProductMessage');
    if (!addProductForm || !addProductMessage) return;
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault(); addProductMessage.textContent = ''; addProductMessage.style.color = 'inherit';
        const formData = new FormData(addProductForm);
        const productData = {
            name: formData.get('productName')?.trim(),
            price: parseFloat(formData.get('productPrice')),
            category: formData.get('productCategory'),
            stock: parseInt(formData.get('productStock'), 10) || 0,
            description: formData.get('productDescription')?.trim(),
            imageUrl: formData.get('productImageUrl')?.trim()
        };
        if (!productData.name || !productData.price || !productData.category || isNaN(productData.price) || productData.price < 0 || isNaN(productData.stock) || productData.stock < 0 || (productData.imageUrl && !isValidHttpUrl(productData.imageUrl))) {
            addProductMessage.textContent = 'Verifica los campos.'; addProductMessage.style.color = 'red'; return;
        }
        const submitButton = addProductForm.querySelector('button[type="submit"]');
        submitButton.disabled = true; submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        try {
            const result = await makeAdminApiCall(`${API_BASE}/products`, 'POST', productData);
            if (result.success) {
                addProductMessage.textContent = result.message || '¡Producto guardado!'; addProductMessage.style.color = 'green';
                addProductForm.reset(); loadProductsTable();
            } else {
                let errorMessage = result.message || `Error`;
                if (result.errors) errorMessage += ': ' + result.errors.join(', ');
                addProductMessage.textContent = errorMessage; addProductMessage.style.color = 'red';
            }
        } catch (error) {
            addProductMessage.textContent = error.message || 'Error de red.'; addProductMessage.style.color = 'red'; console.error(error);
        } finally {
            submitButton.disabled = false; submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Producto';
        }
    });
}
async function loadProductsTable() {
    const tableBody = document.querySelector('#productsContent .products-table-container tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando...</td></tr>';
    try {
        const result = await makeAdminApiCall(`${API_BASE}/products`, 'GET', null, false); 
        const products = result.success ? (result.data || result) : []; 
        if (!Array.isArray(products)) throw new Error("Respuesta inválida del servidor de productos");

        if (products.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay productos.</td></tr>'; return;
        }
        tableBody.innerHTML = products.map(p => `
            <tr data-product-id="${p._id}">
                <td><img src="${p.imageUrl || '/images/placeholder.png'}" alt="${p.name}" class="product-thumbnail" onerror="this.src='/images/placeholder.png'"></td>
                <td>${p.name || '-'}</td><td>$${(p.price || 0).toFixed(2)}</td><td>${p.category || '-'}</td>
                <td>${p.stock ?? '-'}</td>
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
function setupActionButtons() {
    const productsTableContainer = document.querySelector('#productsContent .products-table-container');
    const customersTableContainer = document.querySelector('#customersContent .customers-table-container');

    const handleTableClick = (e) => {
        const button = e.target.closest('.action-btn'); if (!button) return;
        const productId = button.closest('tr')?.dataset.productId;
        const customerId = button.closest('tr')?.dataset.customerId;

        if (productId) {
            if (button.classList.contains('edit-btn')) handleEditProduct(productId);
            else if (button.classList.contains('delete-btn')) handleDeleteProduct(productId);
            else if (button.classList.contains('view-btn')) handleViewProduct(productId);
        } else if (customerId) {
            if (button.classList.contains('edit-btn')) handleEditCustomer(customerId);
            else if (button.classList.contains('delete-btn')) handleDeleteCustomer(customerId);
            else if (button.classList.contains('view-btn')) handleViewCustomer(customerId);
        }
    };
    if (productsTableContainer) productsTableContainer.addEventListener('click', handleTableClick);
    if (customersTableContainer) customersTableContainer.addEventListener('click', handleTableClick);
}
function handleEditProduct(productId) { showAdminNotification(`PENDIENTE: Editar producto ${productId}`, 'info'); }
function handleViewProduct(productId) { showAdminNotification(`PENDIENTE: Ver producto ${productId}`, 'info'); }
async function handleDeleteProduct(productId) {
    if (!confirm(`¿Eliminar producto ID ${productId}?`)) return;
    try {
        const result = await makeAdminApiCall(`${API_BASE}/products/${productId}`, 'DELETE');
        if (result.success) { showAdminNotification("Producto eliminado.", "success"); loadProductsTable(); }
        else { showAdminNotification(`Error: ${result.message || 'Desconocido'}`, "error"); }
    } catch (error) { showAdminNotification(error.message || "Error de red.", "error"); console.error(error); }
}
function handleEditCustomer(customerId) { showAdminNotification(`PENDIENTE: Editar cliente ${customerId}`, 'info'); }
function handleViewCustomer(customerId) { showAdminNotification(`PENDIENTE: Ver cliente ${customerId}`, 'info'); }
async function handleDeleteCustomer(customerId) { if (!confirm(`¿Eliminar cliente ID ${customerId}?`)) return; showAdminNotification(`PENDIENTE: Eliminar cliente ${customerId}.`, 'warning'); }

// --- Gestión de Clientes ---
async function loadCustomersTable() {
    console.log("Cargando tabla de clientes...");
    const tableBody = document.querySelector('#customersContent .customers-table-container tbody');
    if (!tableBody) { console.error("Contenedor tbody clientes no encontrado."); return; }
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando... <i class="fas fa-spinner fa-spin"></i></td></tr>';
    try {
        const result = await makeAdminApiCall(`${API_BASE}/admin/users`, 'GET');
        if (!result.success || !Array.isArray(result.data)) throw new Error(result.message || "Respuesta inválida.");
        const customers = result.data;
        console.log("Clientes recibidos:", customers);
        if (customers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay clientes.</td></tr>'; return;
        }
        tableBody.innerHTML = customers.map(customer => {
            let registrationDateFormatted = '-';
            try { if (customer.createdAt) registrationDateFormatted = new Date(customer.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch (e) { }
            const orderCount = customer.orderCount || 0; 
            return `
                <tr data-customer-id="${customer._id}">
                    <td>#${customer._id.slice(-6)}</td>
                    <td>${customer.nombre || '-'} ${customer.apellidos || ''}</td>
                    <td>${customer.email || '-'}</td>
                    <td>${customer.telefono || '-'}</td>
                    <td>${registrationDateFormatted}</td>
                    <td>${orderCount}</td>
                    <td>
                        <button class="action-btn view-btn" title="Ver" data-id="${customer._id}"><i class="fas fa-user"></i></button>
                        <button class="action-btn edit-btn" title="Editar" data-id="${customer._id}"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn" title="Eliminar" data-id="${customer._id}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
        }).join('');
    } catch (error) {
        console.error("Error al cargar clientes:", error);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Error: ${error.message}</td></tr>`;
    }
}

// --- Gráficos y Estadísticas ---
function initializeCharts() {
    console.log("Inicializando gráficos...");
    const salesCanvas = document.getElementById('salesChart');
    const categoryCanvas = document.getElementById('categoryChart');
    if (!salesCanvas || !categoryCanvas) return;

    if (window.myAdminSalesChart) window.myAdminSalesChart.destroy();
    if (window.myAdminCategoryChart) window.myAdminCategoryChart.destroy();

    const salesData = {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
        datasets: [{ label: 'Ventas ($)', data: [1200, 1900, 1500, 2100, 1800, 2400], backgroundColor: 'rgba(54, 162, 235, 0.6)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1 }]
    };
    const categoryData = {
        labels: ['Rolls', 'Nigiri', 'Bebidas', 'Entradas', 'Postres'],
        datasets: [{ label: 'Ventas por Categoría', data: [45, 15, 25, 10, 5], backgroundColor: ['rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)'], borderWidth: 1 }]
    };
    try { window.myAdminSalesChart = new Chart(salesCanvas, { type: 'bar', data: salesData, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: value => '$' + value } } }, plugins: { legend: { display: false } } } }); } catch(e) { console.error("Error creando salesChart:", e); }
    try { window.myAdminCategoryChart = new Chart(categoryCanvas, { type: 'pie', data: categoryData, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (c) => `${c.label}: ${c.formattedValue}%` } } } } }); } catch(e) { console.error("Error creando categoryChart:", e); }
}
async function loadDashboardStats() {
    console.log("Cargando estadísticas del dashboard...");
    document.getElementById('statTotalOrders').textContent = '0';
    document.getElementById('statTotalCustomers').textContent = '0';
    document.getElementById('statMonthlyRevenue').textContent = '$0';
    document.getElementById('statActiveProducts').textContent = '0';
    try {
        const ordersResult = await makeAdminApiCall(`${API_BASE}/admin/orders`, 'GET');
        if (ordersResult.success && Array.isArray(ordersResult.data)) {
            document.getElementById('statTotalOrders').textContent = ordersResult.data.length;
            const currentMonth = new Date().getMonth(); const currentYear = new Date().getFullYear();
            const monthlyRevenue = ordersResult.data.reduce((sum, order) => {
                const orderDate = new Date(order.createdAt);
                if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) return sum + (order.totalAmount || 0);
                return sum;
            }, 0);
            document.getElementById('statMonthlyRevenue').textContent = `$${monthlyRevenue.toFixed(2)}`;
        }
        const customersResult = await makeAdminApiCall(`${API_BASE}/admin/users`, 'GET');
        if (customersResult.success && Array.isArray(customersResult.data)) document.getElementById('statTotalCustomers').textContent = customersResult.data.length;

        const productsResult = await makeAdminApiCall(`${API_BASE}/products`, 'GET', null, false); 
        if (productsResult.success && Array.isArray(productsResult.data || productsResult)) {
             const products = productsResult.data || productsResult;
             document.getElementById('statActiveProducts').textContent = products.filter(p => p.isActive).length;
        }
    } catch (error) { console.error("Error cargando estadísticas:", error); showAdminNotification("Error al cargar estadísticas.", "error"); }
}

// --- Funciones de Utilidad ---
function isValidHttpUrl(string) { try { const url = new URL(string); return url.protocol === "http:" || url.protocol === "https:"; } catch (_) { return false; } }
function showAdminNotification(message, type = 'info', duration = 4000) {
    const container = document.body; 
    const notification = document.createElement('div');
    notification.className = `admin-toast-notification ${type}`; 
    let iconClass = 'fas fa-info-circle'; 
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
    notification.innerHTML = `<i class="${iconClass}"></i><span>${message}</span>`;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000; 
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        color: white;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    if (type === 'success') notification.style.backgroundColor = '#4CAF50';
    else if (type === 'error') notification.style.backgroundColor = '#dc3545';
    else if (type === 'warning') { notification.style.backgroundColor = '#ffc107'; notification.style.color = '#333'; }
    else notification.style.backgroundColor = '#17a2b8'; 
    container.appendChild(notification);
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        notification.addEventListener('transitionend', () => notification.remove());
        setTimeout(() => notification.remove(), 500); 
    }, duration);
}
async function makeAdminApiCall(endpoint, method = 'GET', body = null, requireAuth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (requireAuth) {
        const token = sessionStorage.getItem(ADMIN_AUTH_KEY);
        if (!token) { console.error(`Error: Token admin no encontrado para ${method} ${endpoint}`); return { success: false, message: 'No autenticado.', data: null }; }
        headers['Authorization'] = `Bearer ${token}`;
    }
    const config = { method: method.toUpperCase(), headers: headers };
    if (body && (config.method === 'POST' || config.method === 'PATCH' || config.method === 'PUT')) {
        if (body instanceof FormData) {
            delete headers['Content-Type']; 
            config.body = body;
        } else {
            config.body = JSON.stringify(body);
        }
    }
    try {
        const response = await fetch(endpoint, config);
        const responseData = await response.json().catch(() => ({})); 
        if (response.ok) {
            return { success: true, data: responseData.data || responseData, message: responseData.message, token: responseData.token };
        } else {
            let errorMessage = responseData.message || `Error ${response.status}: ${response.statusText}`;
            console.error(`API Admin Call Error (${config.method} ${endpoint}): Status ${response.status}, Message: ${errorMessage}`, responseData);
            if (response.status === 401 || response.status === 403) { adminLogout(); errorMessage = 'Sesión inválida o expirada.'; }
            return { success: false, message: errorMessage, data: null };
        }
    } catch (error) {
        console.error(`Network/Fetch Error (${config.method} ${endpoint}):`, error);
        return { success: false, message: 'Error de red o conexión.', data: null };
    }
}

// --- Gestión de Perfil de Admin ---
async function loadAdminProfile() {
    try {
        const response = await makeAdminApiCall(`${API_BASE}/admin/profile`, 'GET');
        if (response.success && response.data) {
            const admin = response.data;
            document.getElementById('adminFullName').value = admin.fullName || '';
            document.getElementById('adminEmail').value = admin.email || '';
            document.getElementById('adminPhone').value = admin.phone || '';
            document.getElementById('adminRoleInput').value = admin.role || 'admin'; 

            const sidebarUsername = document.getElementById('adminSidebarUsername');
            const sidebarRole = document.getElementById('adminSidebarRole');
            const sidebarAvatar = document.getElementById('adminSidebarAvatar'); 

            if (sidebarUsername) sidebarUsername.textContent = admin.fullName || admin.username || 'Admin';
            if (sidebarRole) sidebarRole.textContent = admin.role ? admin.role.charAt(0).toUpperCase() + admin.role.slice(1) : 'Administrador';
            
            const configUsername = document.getElementById('adminConfigUsername');
            const configRole = document.getElementById('adminConfigRole');
            const configEmail = document.getElementById('adminConfigEmail');
            const configPhone = document.getElementById('adminConfigPhone');
            const configAvatar = document.getElementById('adminConfigAvatar'); 

            if (configUsername) configUsername.textContent = admin.fullName || admin.username || 'Admin';
            if (configRole) configRole.textContent = admin.role ? admin.role.charAt(0).toUpperCase() + admin.role.slice(1) : 'Administrador';
            if (configEmail) configEmail.textContent = admin.email || 'No especificado';
            if (configPhone) configPhone.textContent = admin.phone || 'No especificado';

        } else {
            showAdminNotification(response.message || 'No se pudo cargar el perfil del administrador.', 'error');
            console.error('Error cargando perfil de admin:', response);
        }
    } catch (error) {
        console.error('Error en loadAdminProfile:', error);
        showAdminNotification('Error de red al cargar el perfil.', 'error');
    }
}
function setupAdminProfileForms() {
    const profileForm = document.getElementById('adminProfileForm');
    const passwordForm = document.getElementById('adminPasswordForm');
    const avatarInput = document.getElementById('adminAvatar');
    const profileMessage = document.getElementById('adminProfileMessage');
    const passwordMessage = document.getElementById('adminPasswordMessage');

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            profileMessage.textContent = '';
            const formData = new FormData(profileForm);
            const data = {
                fullName: formData.get('fullName'),
                email: formData.get('email'),
                phone: formData.get('phone')
            };
            const submitButton = profileForm.querySelector('button[type="submit"]');
            submitButton.disabled = true; submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
            try {
                const response = await makeAdminApiCall(`${API_BASE}/admin/profile`, 'PUT', data);
                if (response.success) {
                    profileMessage.textContent = 'Perfil actualizado correctamente.'; profileMessage.style.color = 'green';
                    loadAdminProfile(); 
                    if (response.data && response.data.fullName) sessionStorage.setItem('adminFullName', response.data.fullName);
                } else {
                    profileMessage.textContent = response.message || 'Error al actualizar perfil.'; profileMessage.style.color = 'red';
                }
            } catch (error) { console.error('Error updating admin profile:', error); profileMessage.textContent = 'Error de red.'; profileMessage.style.color = 'red';
            } finally { submitButton.disabled = false; submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios'; }
        });
    }
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            passwordMessage.textContent = '';
            const formData = new FormData(passwordForm);
            const newPassword = formData.get('newPassword');
            const confirmPassword = formData.get('confirmPassword');
            if (newPassword !== confirmPassword) { passwordMessage.textContent = 'Las nuevas contraseñas no coinciden.'; passwordMessage.style.color = 'red'; return; }
            const data = { currentPassword: formData.get('currentPassword'), newPassword: newPassword };
            const submitButton = passwordForm.querySelector('button[type="submit"]');
            submitButton.disabled = true; submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
            try {
                const response = await makeAdminApiCall(`${API_BASE}/admin/password`, 'PUT', data);
                if (response.success) { passwordMessage.textContent = 'Contraseña actualizada correctamente.'; passwordMessage.style.color = 'green'; passwordForm.reset();
                } else { passwordMessage.textContent = response.message || 'Error al actualizar contraseña.'; passwordMessage.style.color = 'red'; }
            } catch (error) { console.error('Error updating admin password:', error); passwordMessage.textContent = 'Error de red.'; passwordMessage.style.color = 'red';
            } finally { submitButton.disabled = false; submitButton.innerHTML = '<i class="fas fa-key"></i> Actualizar Contraseña'; }
        });
    }
    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0]; if (!file) return;
            profileMessage.textContent = 'Subiendo avatar...'; profileMessage.style.color = 'blue';
            const formData = new FormData(); formData.append('avatar', file);
            try {
                const token = sessionStorage.getItem(ADMIN_AUTH_KEY);
                const response = await fetch(`${API_BASE}/admin/avatar`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                const result = await response.json();
                if (response.ok && result.success) {
                    profileMessage.textContent = 'Avatar actualizado correctamente.'; profileMessage.style.color = 'green';
                    loadAdminProfile(); 
                } else {
                    profileMessage.textContent = result.message || 'Error al actualizar avatar.'; profileMessage.style.color = 'red';
                }
            } catch (error) { console.error('Error updating admin avatar:', error); profileMessage.textContent = 'Error de red al subir avatar.'; profileMessage.style.color = 'red'; }
        });
    }
}

// --- Gestión de Premios ---
function setupPrizeManagement() {
    const prizeForm = document.getElementById('addPrizeForm');
    const prizeMessage = document.getElementById('addPrizeMessage');
    const prizeListContainer = document.getElementById('prizeList');

    if (prizeForm) {
        prizeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            prizeMessage.textContent = '';
            const formData = new FormData(prizeForm);
            const prizeData = {
                name: formData.get('prizeName').trim(),
                description: formData.get('prizeDescription').trim(),
                type: formData.get('prizeType'),
                quantity: parseInt(formData.get('prizeQuantity'), 10),
                probability: parseInt(formData.get('prizeProbability'), 10),
                imageUrl: formData.get('prizeImageUrl').trim(),
                isActive: document.getElementById('prizeActive').checked
            };
            const prizeId = formData.get('prizeId');
            let result;
            if (prizeId) {
                result = await makeAdminApiCall(`/api/admin/ruleta/premios/${prizeId}`, 'PUT', prizeData);
            } else {
                result = await makeAdminApiCall('/api/admin/ruleta/premios', 'POST', prizeData);
            }
            if (result.success) {
                prizeForm.reset();
                document.getElementById('prizeActive').checked = true;
                loadPrizes(); 
            } else {
                alert(result.message || 'Error al guardar el premio.');
            }
        });
    }
    if (prizeListContainer) {
        prizeListContainer.addEventListener('click', async (e) => {
            if (e.target.closest('.delete-prize-btn')) {
                const prizeId = e.target.closest('.delete-prize-btn').dataset.id;
                if (confirm(`¿Eliminar premio ID ${prizeId}?`)) {
                    try {
                        const result = await makeAdminApiCall(`${API_BASE}/admin/prizes/${prizeId}`, 'DELETE'); 
                        if (result.success) { showAdminNotification("Premio eliminado.", "success"); loadPrizes(); }
                        else { showAdminNotification(`Error: ${result.message}`, "error"); }
                    } catch (error) { showAdminNotification(error.message || "Error de red.", "error"); }
                }
            }
        });
    }
}
async function loadPrizes() {
    const prizeListContainer = document.getElementById('prizeList');
    if (!prizeListContainer) return;
    prizeListContainer.innerHTML = '<p style="text-align: center;">Cargando premios... <i class="fas fa-spinner fa-spin"></i></p>';
    try {
        const result = await makeAdminApiCall(`${API_BASE}/admin/prizes`, 'GET'); 
        if (result.success && Array.isArray(result.data)) {
            if (result.data.length === 0) {
                 prizeListContainer.innerHTML = '<p style="text-align: center;">No hay premios registrados.</p>';
            } else {
                prizeListContainer.innerHTML = result.data.map(renderPrize).join('');
            }
        } else {
            prizeListContainer.innerHTML = `<p style="text-align: center; color: red;">Error al cargar premios: ${result.message || 'Desconocido'}</p>`;
        }
    } catch (error) {
        prizeListContainer.innerHTML = `<p style="text-align: center; color: red;">Error de red: ${error.message}</p>`;
    }
}
function renderPrize(prize) {
    return `
        <div class="prize-card" data-prize-id="${prize._id}" style="border: 1px solid #ddd; padding: 1rem; border-radius: 8px; width: calc(33.333% - 1rem); margin-bottom: 1rem; box-sizing: border-box;">
            <img src="${prize.imageUrl || '/images/placeholder.png'}" alt="${prize.name}" class="prize-image" style="width: 100%; height: 120px; object-fit: cover; margin-bottom: 0.5rem; border-radius: 4px;" onerror="this.src='/images/placeholder.png'">
            <h3 style="font-size: 1.1em; margin-bottom: 0.3rem;">${prize.name}</h3>
            <p style="font-size: 0.9em; color: #555; margin-bottom: 0.7rem;">Puntos: ${prize.points}</p>
            <button class="admin-btn btn-danger btn-sm delete-prize-btn" title="Eliminar Premio" data-id="${prize._id}">
                <i class="fas fa-trash"></i> Eliminar
            </button>
        </div>
    `;
}

async function cargarHistorialGirosAdmin() {
    const usuario = document.getElementById('filtroUsuario').value;
    const premio = document.getElementById('filtroPremio').value;
    const fecha = document.getElementById('filtroFecha').value;
    const estado = document.getElementById('filtroEstado').value;
    let url = `/api/admin/ruleta/historial?usuario=${usuario}&premio=${premio}&fecha=${fecha}&estado=${estado}`;
    const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('adminAuthToken') } });
    const data = await res.json();
}

async function cargarEstadisticasRuleta() {
    const res = await fetch('/api/admin/ruleta/estadisticas', { headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('adminAuthToken') } });
    const data = await res.json();
    document.getElementById('statTotalGiros').textContent = data.totalGiros;
    document.getElementById('statPremiosPopulares').textContent = data.premiosPopulares.join(', ');
    document.getElementById('statParticipacionHoy').textContent = data.participacionHoy;
    document.getElementById('statPremiosEntregados').textContent = data.porcentajeEntregados + '%';
}

// Función para exportar a PDF
async function exportOrdersToPDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showAdminNotification('La librería jsPDF no está cargada.', 'error');
        console.error('jsPDF is not loaded.');
        return;
    }
    if (typeof jsPDF.API.autoTable !== 'function') {
        showAdminNotification('El plugin jsPDF-AutoTable no está cargado.', 'error');
        console.error('jsPDF-AutoTable plugin is not loaded.');
        return;
    }

    const doc = new jsPDF();
    let yPos = 20; // Posición Y inicial

    doc.setFontSize(18);
    doc.text('Reporte de Pedidos - Katana Sushi', 105, yPos, { align: 'center' });
    yPos += 10;
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleString('es-ES')}`, 105, yPos, { align: 'center' });
    yPos += 15;

    const orderCards = document.querySelectorAll('#adminOrdersList .order-card-visual');
    const visibleOrdersData = [];

    orderCards.forEach(card => {
        if (card.style.display !== 'none') { // Solo procesar tarjetas visibles
            try {
                const orderDataString = card.dataset.orderData;
                if (orderDataString) {
                    // Reemplazar &apos; con ' antes de parsear si es necesario, aunque JSON.stringify no debería producir &apos;
                    visibleOrdersData.push(JSON.parse(orderDataString.replace(/&apos;/g, "'")));
                }
            } catch (e) {
                console.error("Error parseando datos del pedido de la tarjeta:", e, card.dataset.orderData);
            }
        }
    });
    
    if (visibleOrdersData.length === 0) {
        showAdminNotification('No hay pedidos visibles para exportar a PDF.', 'info');
        return;
    }

    doc.setFontSize(12);

    visibleOrdersData.forEach((order, index) => {
        if (yPos > 260) { // Estimar si se necesita nueva página (A4 height ~297mm, márgenes)
            doc.addPage();
            yPos = 20;
        }

        const orderId = order.orderId || order._id;
        let customerName = 'Desconocido';
        if (order.isGuestOrder) {
            customerName = order.deliveryDetails?.nombre || 'Invitado';
        } else if (order.userId && typeof order.userId === 'object') { // Verificar si userId es un objeto poblado
            customerName = order.userId.nombre || order.deliveryDetails?.nombre || 'Registrado';
        } else if (order.deliveryDetails?.nombre) {
            customerName = order.deliveryDetails.nombre;
        }


        const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-ES') : 'N/A';
        const subtotalProductos = (parseFloat(order.totalAmount) || 0) - (parseFloat(order.shippingCost) || 0);


        doc.setFont(undefined, 'bold');
        doc.text(`Pedido #${orderId}`, 14, yPos);
        yPos += 7;
        doc.setFont(undefined, 'normal');
        doc.text(`Cliente: ${customerName}`, 14, yPos);
        doc.text(`Fecha: ${orderDate}`, 100, yPos);
        doc.text(`Estado: ${order.status || 'N/A'}`, 150, yPos);
        yPos += 7;
        doc.text(`Dirección: ${order.deliveryDetails?.direccion || 'N/A'} (${order.deliveryDetails?.zona || 'N/A'})`, 14, yPos);
        yPos += 7;
        doc.text(`Teléfono: ${order.deliveryDetails?.telefono || 'N/A'}`, 14, yPos);
        yPos += 10;

        const head = [['Cant.', 'Producto', 'Precio Unit.', 'Subtotal']];
        const body = order.items.map(item => [
            item.quantity,
            item.name,
            `$${(parseFloat(item.price) || 0).toFixed(2)}`,
            `$${((parseFloat(item.price) || 0) * (item.quantity || 0)).toFixed(2)}`
        ]);

        doc.autoTable({
            startY: yPos,
            head: head,
            body: body,
            theme: 'grid', // 'striped', 'grid', 'plain'
            headStyles: { fillColor: [202, 11, 11] }, // Rojo Katana
            styles: { fontSize: 9, cellPadding: 1.5 },
            columnStyles: {
                0: { cellWidth: 15 }, // Cant.
                1: { cellWidth: 'auto' }, // Producto
                2: { cellWidth: 30, halign: 'right' }, // Precio Unit.
                3: { cellWidth: 30, halign: 'right' }  // Subtotal
            },
            didDrawPage: (data) => {
                yPos = data.cursor.y; // Actualizar yPos después de que la tabla se dibuje
            }
        });
        
        yPos = doc.lastAutoTable.finalY + 10; // Posición después de la tabla

        doc.setFontSize(10);
        doc.text(`Subtotal Productos: $${subtotalProductos.toFixed(2)}`, 196, yPos, {align: 'right'});
        yPos += 6;
        doc.text(`Costo de Envío: $${(parseFloat(order.shippingCost) || 0).toFixed(2)}`, 196, yPos, {align: 'right'});
        yPos += 6;
        doc.setFont(undefined, 'bold');
        doc.text(`Total General: $${(parseFloat(order.totalAmount) || 0).toFixed(2)}`, 196, yPos, {align: 'right'});
        yPos += 15; // Espacio antes del siguiente pedido

        if (index < visibleOrdersData.length - 1) {
            doc.setDrawColor(200, 200, 200); // Color gris claro para la línea
            doc.line(14, yPos - 7, 196, yPos - 7); // Línea separadora
        }
    });

    doc.save(`pedidos_katana_sushi_${new Date().toISOString().slice(0,10)}.pdf`);
    showAdminNotification('PDF de pedidos generado exitosamente.', 'success');
}
