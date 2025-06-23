/**
 * @file admin/modules/orders.js
 * @module AdminOrders
 * @description Maneja toda la lógica para la sección de "Pedidos" en el panel de administración.
 */

import { makeAdminApiCall } from '../api.js';
import { showAdminNotification, setupCustomStatusSelects } from '../ui.js';

// --- Estado del Módulo ---
let allAdminOrders = []; // Caché local de todos los pedidos cargados
let adminSelectedOrderIds = new Set();
let adminAvailableProducts = []; // Caché para productos en el modal
let adminManualOrderProductRowCount = 0;

/**
 * Inicializa la sección de pedidos, configurando los listeners de eventos.
 */
export function initializeOrders() {
    console.log("Módulo de Pedidos inicializado.");
    
    const filtroFecha = document.getElementById('filtroFechaPedidos');
    if (filtroFecha) {
        console.log("Configurando filtro de fecha para pedidos");
        filtroFecha.addEventListener('change', () => loadAdminOrders(filtroFecha.value));
    } else {
        console.warn("No se encontró el filtro de fecha para pedidos");
    }
    
    console.log("Configurando acciones de lote para pedidos");
    setupBatchOrderActions();
    
    console.log("Configurando botones de exportación");
    setupExportButtons();
    
    console.log("Configurando listeners del modal de pedidos manuales");
    setupManualOrderModalListeners(); // <-- FIX: Añadida la inicialización del modal
    
    console.log("Cargando pedidos iniciales");
    loadAdminOrders();
    
    console.log("Módulo de Pedidos completamente inicializado");
}

// --- Lógica de Pedidos Manuales ---

/**
 * Configura todos los listeners de eventos para el modal de registro manual de pedidos.
 */
function setupManualOrderModalListeners() {
    const openBtn = document.getElementById('openRegisterOrderModalBtn');
    const modal = document.getElementById('registerOrderModal');
    const closeBtn = document.getElementById('closeRegisterOrderModalBtn');
    const form = document.getElementById('registerOrderForm');
    const addProductBtn = document.getElementById('addProductToOrderBtn');
    const productsList = document.getElementById('orderProductsList');
    const zoneSelect = document.getElementById('adminOrderZoneSelect');

    if (!openBtn || !modal || !closeBtn || !form) return;

    openBtn.addEventListener('click', async () => {
        await loadProductsForAdminOrderModal();
        modal.style.display = 'flex';
        if (productsList.children.length === 0) {
            addAdminManualProductRow();
        }
        updateAdminManualOrderShippingAndTotal();
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        form.reset();
        productsList.innerHTML = '';
        adminManualOrderProductRowCount = 0;
        updateAdminManualOrderShippingAndTotal();
    });

    addProductBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addAdminManualProductRow();
    });

    if(productsList) {
        productsList.addEventListener('click', (e) => {
            if (e.target.closest('.removeProductBtn')) {
                e.target.closest('.order-product-row').remove();
                updateAdminManualOrderShippingAndTotal();
            }
        });
        productsList.addEventListener('change', (e) => {
            if (e.target.classList.contains('order-product-select') || e.target.classList.contains('order-product-cant')) {
                updateAdminManualOrderShippingAndTotal();
            }
        });
    }

    if (zoneSelect) {
        zoneSelect.addEventListener('change', updateAdminManualOrderShippingAndTotal);
    }
    
    form.addEventListener('submit', handleAdminRegisterOrderSubmit);
}

/**
 * Carga los productos desde la API para usarlos en el selector del formulario de pedido manual.
 */
async function loadProductsForAdminOrderModal() {
    if (adminAvailableProducts.length > 0) {
        return; // Usa la caché si ya se cargaron
    }
    try {
        const result = await makeAdminApiCall('/products', 'GET', null, false);
        if (result.success && Array.isArray(result.data || result)) {
            adminAvailableProducts = result.data || result;
        } else {
            showAdminNotification("No se pudieron cargar los productos para el formulario.", "error");
        }
    } catch (error) {
        showAdminNotification("Error de red al cargar productos.", "error");
    }
}

/**
 * Añade una nueva fila de producto al formulario de pedido manual.
 */
function addAdminManualProductRow() {
    const orderProductsList = document.getElementById('orderProductsList');
    adminManualOrderProductRowCount++;
    
    let productOptions = '<option value="">Selecciona un producto</option>';
    productOptions += adminAvailableProducts
        .filter(p => p.isActive)
        .map(p => `<option value="${p._id}" data-precio="${p.price}" data-name="${p.name}" data-image="${p.imageUrl || ''}">${p.name} ($${parseFloat(p.price || 0).toFixed(2)})</option>`)
        .join('');
        
    const rowHTML = `
        <div class="order-product-row" style="display:flex; gap:10px; align-items:center; margin-bottom:8px;">
            <select class="form-control order-product-select" name="producto${adminManualOrderProductRowCount}" required style="flex:2;">
                ${productOptions}
            </select>
            <input type="number" class="form-control order-product-cant" name="cantidad${adminManualOrderProductRowCount}" min="1" value="1" required style="width:70px;">
            <button type="button" class="admin-btn btn-danger removeProductBtn" title="Quitar"><i class="fas fa-trash"></i></button>
        </div>`;
        
    orderProductsList.insertAdjacentHTML('beforeend', rowHTML);
    updateAdminManualOrderShippingAndTotal();
}

/**
 * Actualiza el costo de envío y el total general en el formulario de pedido manual.
 */
function updateAdminManualOrderShippingAndTotal() {
    const zoneSelect = document.getElementById('adminOrderZoneSelect');
    const costoEnvioInput = document.getElementById('adminOrderCostoEnvioInput');
    
    const selectedOption = zoneSelect.options[zoneSelect.selectedIndex];
    const shippingCost = parseFloat(selectedOption?.dataset.cost || 0);
    
    costoEnvioInput.value = shippingCost.toFixed(2);
    updateAdminManualOrderTotal();
}

/**
 * Calcula y actualiza los subtotales y el total general del pedido manual.
 */
function updateAdminManualOrderTotal() {
    let subtotal = 0;
    document.querySelectorAll('#orderProductsList .order-product-row').forEach(row => {
        const select = row.querySelector('.order-product-select');
        const cantInput = row.querySelector('.order-product-cant');
        const precio = parseFloat(select?.selectedOptions[0]?.dataset.precio || 0);
        const cantidad = parseInt(cantInput?.value, 10) || 0;
        subtotal += precio * cantidad;
    });

    const costoEnvio = parseFloat(document.getElementById('adminOrderCostoEnvioInput').value) || 0;
    
    document.getElementById('orderSubtotalProducts').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('orderShippingCostDisplay').textContent = `$${costoEnvio.toFixed(2)}`;
    document.getElementById('orderTotalGeneral').textContent = `$${(subtotal + costoEnvio).toFixed(2)}`;
}

/**
 * Maneja el envío del formulario de registro manual de pedido.
 */
async function handleAdminRegisterOrderSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    const items = [];
    form.querySelectorAll('.order-product-row').forEach(row => {
        const select = row.querySelector('.order-product-select');
        const quantityInput = row.querySelector('.order-product-cant');
        const selectedOption = select.selectedOptions[0];

        if (selectedOption && selectedOption.value) {
            items.push({
                productId: selectedOption.value,
                quantity: parseInt(quantityInput.value, 10),
                price: parseFloat(selectedOption.dataset.precio),
                name: selectedOption.dataset.name,
                image: selectedOption.dataset.image
            });
        }
    });

    if (items.length === 0) return showAdminNotification('Debe agregar al menos un producto.', 'error');

    const totalAmount = parseFloat(document.getElementById('orderTotalGeneral').textContent.replace('$', ''));
    const shippingCost = parseFloat(document.getElementById('adminOrderCostoEnvioInput').value);

    const orderData = {
        deliveryDetails: {
            nombre: form.nombreCliente.value,
            telefono: form.telefonoCliente.value,
            direccion: form.direccionCliente.value,
            zona: form.zonaEnvio.value,
            referencia: form.puntoReferencia.value,
        },
        items,
        totalAmount,
        shippingCost,
        status: 'processing', // Los pedidos manuales pueden empezar como 'processing'
        source: 'admin_manual',
    };
    
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
    
    const result = await makeAdminApiCall('/admin/manual-order', 'POST', orderData);
    
    if (result.success) {
        showAdminNotification('Pedido manual registrado con éxito.', 'success');
        form.reset();
        document.getElementById('orderProductsList').innerHTML = '';
        adminManualOrderProductRowCount = 0;
        document.getElementById('registerOrderModal').style.display = 'none';
        loadAdminOrders();
    } else {
        showAdminNotification(result.message || 'Error al registrar pedido.', 'error');
    }

    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-save"></i> Registrar Pedido';
}


// --- Carga y Visualización de Pedidos Existentes ---
// (Esta sección permanece igual, no se necesita modificar)

export async function loadAdminOrders(fecha = null) {
    const ordersContainer = document.getElementById('adminOrdersList');
    if (!ordersContainer) return;
    ordersContainer.innerHTML = '<p style="text-align: center; width: 100%; padding: 2rem 0;">Cargando pedidos... <i class="fas fa-spinner fa-spin"></i></p>';
    try {
        let url = '/admin/orders';
        if (fecha) {
            url += `?fecha=${fecha}`;
        }
        const result = await makeAdminApiCall(url, 'GET');
        if (result.success && Array.isArray(result.data)) {
            allAdminOrders = result.data;
            displayAdminOrders();
        } else {
            throw new Error(result.message || 'No se pudieron cargar los pedidos.');
        }
    } catch (error) {
        console.error("Error al cargar pedidos (admin):", error);
        ordersContainer.innerHTML = `<p style="text-align: center; width: 100%; color: red; padding: 2rem 0;">Error: ${error.message}</p>`;
    }
}

function displayAdminOrders() {
    const ordersContainer = document.getElementById('adminOrdersList');
    if (!ordersContainer) return;

    if (allAdminOrders.length === 0) { 
        ordersContainer.innerHTML = '<p style="text-align: center; width: 100%; padding: 2rem 0;">No hay pedidos para mostrar.</p>'; 
    } else {
        ordersContainer.innerHTML = allAdminOrders.map(renderAdminOrderCard).join('');
    }

    renderCustomStatusFilter();
    filterAdminOrders(); 
    setupCustomStatusSelects(handleStatusChange);
}

function renderAdminOrderCard(order) {
    // ... (sin cambios)
    const orderDate = new Date(order.createdAt || Date.now());
    const orderDateFormatted = orderDate.toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const orderDateForFilter = orderDate.toISOString().split('T')[0]; 
    const customerName = order.deliveryDetails?.nombre || (order.isGuestOrder ? 'Invitado' : 'Usuario Registrado');
    const { statusClass, statusText } = getOrderStatusInfo(order.status);
    const orderDataString = JSON.stringify(order).replace(/'/g, "&apos;");
    const subtotalProductos = (parseFloat(order.totalAmount) || 0) - (parseFloat(order.shippingCost) || 0);
    const isActionable = order.status !== 'delivered' && order.status !== 'cancelled';
    
    return `
        <div class="order-card-visual status-border-${order.status}" 
             data-order-db-id="${order._id}" 
             data-order-status="${order.status}" 
             data-order-date="${orderDateForFilter}"
             data-order-data='${orderDataString}'> 
            <div class="order-card-header">
                <div style="display: flex; align-items: center;">
                    <input type="checkbox"
                           class="order-select-checkbox"
                           data-order-id="${order._id}"
                           ${!isActionable ? 'disabled' : ''}
                           title="${isActionable ? 'Seleccionar pedido' : 'Pedido no accionable'}"
                           style="margin-right: 10px; width: 18px; height: 18px; accent-color: var(--admin-primary, #BB002B);">
                    <div class="order-id"><i class="fas fa-receipt"></i> #${order.orderId || order._id.slice(-6)}</div>
                </div>
            </div>
            <div class="order-card-body">
                <div class="order-info-row"><i class="fas fa-user"></i> <strong>Cliente:</strong> ${customerName}</div>
                <div class="order-info-row"><i class="fas fa-phone"></i> <strong>Teléfono:</strong> ${order.deliveryDetails?.telefono || '-'}</div>
                <div class="order-info-row"><i class="fas fa-map-marker-alt"></i> <strong>Dirección:</strong> ${order.deliveryDetails?.direccion || '-'} (${order.deliveryDetails?.zona || 'N/A'})</div>
                <div class="order-info-row"><i class="fas fa-calendar-alt"></i> <strong>Fecha:</strong> ${orderDateFormatted}</div>
                <div class="order-info-row" style="font-weight: bold; color: var(--admin-accent, #3498DB); margin-top: 0.5rem; border-top: 1px dashed #eee; padding-top: 0.5rem;">
                    <i class="fas fa-dollar-sign"></i> <strong>Total General:</strong> $${(parseFloat(order.totalAmount) || 0).toFixed(2)}
                </div>
            </div>
            <div class="order-card-actions">
                 <div class="custom-status-select ${statusClass}" data-order-id="${order._id}">
                    <button type="button" class="custom-select-btn ${statusClass}">${statusText}</button>
                    <ul class="custom-select-options">
                        <li class="custom-select-option status-pendiente" data-value="pending">Pendiente</li>
                        <li class="custom-select-option status-procesando" data-value="processing">En preparación</li>
                        <li class="custom-select-option status-camino" data-value="shipped">En camino</li>
                        <li class="custom-select-option status-entregado" data-value="delivered">Entregado</li>
                        <li class="custom-select-option status-cancelado" data-value="cancelled">Cancelado</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}

async function handleStatusChange(orderId, newStatus, btn) {
    if (btn) btn.disabled = true;
    try {
        const result = await makeAdminApiCall(`/admin/orders/${orderId}/status`, 'PATCH', { status: newStatus });
        if (result.success) {
            showAdminNotification(`Pedido actualizado a ${newStatus}.`, 'success');
            loadAdminOrders(document.getElementById('filtroFechaPedidos')?.value);
        } else {
            showAdminNotification(`Error al actualizar: ${result.message}`, 'error');
        }
    } catch (error) {
        showAdminNotification(`Error de red: ${error.message}`, 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}


// --- Lógica de Filtros ---

/**
 * Renderiza y configura la lógica del filtro de estado personalizado.
 */
function renderCustomStatusFilter() {
    const filterContainer = document.querySelector('#ordersContent .filters-group');
    if (!filterContainer) return;

    let customFilterElement = document.getElementById('customStatusFilter');
    if (customFilterElement) customFilterElement.remove();

    const statusOptions = [
        { value: 'all', text: 'Todos los estados', class: 'status-todos' },
        { value: 'pending', text: 'Pendiente', class: 'status-pendiente' },
        { value: 'processing', text: 'En preparación', class: 'status-procesando' },
        { value: 'shipped', text: 'En camino', class: 'status-camino' },
        { value: 'delivered', text: 'Entregado', class: 'status-entregado' },
        { value: 'cancelled', text: 'Cancelado', class: 'status-cancelado' }
    ];
    let selected = window._adminStatusFilterValue || 'all';
    const currentStatus = statusOptions.find(opt => opt.value === selected) || statusOptions[0];

    const filterHTML = `
        <div class="custom-status-filter ${currentStatus.class}" id="customStatusFilter">
            <div class="status-filter-group">
                <button type="button" class="custom-select-btn ${currentStatus.class}">
                    ${currentStatus.text}
                </button>
                <ul class="custom-select-options">
                    ${statusOptions.map(opt => `<li class="custom-select-option ${opt.class}" data-value="${opt.value}">${opt.text}</li>`).join('')}
                </ul>
            </div>
        </div>`;
    
    filterContainer.insertAdjacentHTML('afterbegin', filterHTML);
    setupCustomStatusFilterLogic();
}

/**
 * Añade los listeners al filtro de estado personalizado.
 */
function setupCustomStatusFilterLogic() {
    const filter = document.getElementById('customStatusFilter');
    if (!filter) return;
    const btn = filter.querySelector('.custom-select-btn');
    const options = filter.querySelector('.custom-select-options');
    
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        filter.classList.toggle('open');
    });

    options.addEventListener('click', (e) => {
        const opt = e.target.closest('.custom-select-option');
        if (!opt) return;
        
        const newValue = opt.dataset.value;
        window._adminStatusFilterValue = newValue; // Guardar el estado del filtro globalmente
        
        btn.textContent = opt.textContent;
        filter.className = `custom-status-filter ${opt.className.replace('custom-select-option', '').trim()}`;
        btn.className = `custom-select-btn ${opt.className.replace('custom-select-option', '').trim()}`;
        
        filter.classList.remove('open');
        filterAdminOrders();
    });
}

/**
 * Filtra los pedidos mostrados en el DOM según el estado seleccionado.
 */
function filterAdminOrders() {
    const selectedStatus = window._adminStatusFilterValue || 'all';
    const orderCards = document.querySelectorAll('#adminOrdersList .order-card-visual');
    let visibleCount = 0;

    orderCards.forEach(card => {
        const cardStatus = card.dataset.orderStatus;
        const isVisible = selectedStatus === 'all' || cardStatus === selectedStatus;
        card.style.display = isVisible ? 'flex' : 'none';
        if (isVisible) visibleCount++;
    });

    const noOrdersMessage = document.querySelector('#adminOrdersList .no-orders-message');
    if (noOrdersMessage) noOrdersMessage.remove();

    if (visibleCount === 0 && allAdminOrders.length > 0) {
        const p = document.createElement('p');
        p.className = 'no-orders-message';
        p.style.textAlign = 'center';
        p.style.width = '100%';
        p.style.padding = '2rem 0';
        p.textContent = `No hay pedidos con los filtros seleccionados.`;
        document.getElementById('adminOrdersList').appendChild(p);
    }
    
    updateBatchActionButtonsState();
}


// --- Lógica de Acciones en Lote ---

/**
 * Configura los botones para acciones en lote (seleccionar, deseleccionar, marcar como entregado).
 */
function setupBatchOrderActions() {
    const container = document.getElementById('ordersContent');
    if (!container || container.dataset.batchListenersAttached === 'true') return;
    container.dataset.batchListenersAttached = 'true';

    container.addEventListener('click', (event) => {
        const target = event.target;
        if (target.id === 'markSelectedAsDeliveredBtn') handleMarkSelectedAsDelivered();
        else if (target.id === 'selectAllVisibleBtn') selectAllVisibleOrders();
        else if (target.id === 'deselectAllBtn') deselectAllOrders();
        else if (target.classList.contains('order-select-checkbox')) updateBatchActionButtonsState();
    });
}

/**
 * Actualiza la visibilidad y el estado de los botones de acción en lote.
 */
function updateBatchActionButtonsState() {
    const selectedCheckboxes = document.querySelectorAll('#adminOrdersList .order-select-checkbox:checked:not(:disabled)');
    const batchActionsContainer = document.querySelector('.batch-actions');
    const markBtn = document.getElementById('markSelectedAsDeliveredBtn');
    const deselectBtn = document.getElementById('deselectAllBtn');
    const countSpan = document.getElementById('selectedOrdersCount');

    if (!batchActionsContainer || !markBtn || !deselectBtn || !countSpan) return;

    adminSelectedOrderIds.clear();
    selectedCheckboxes.forEach(cb => adminSelectedOrderIds.add(cb.dataset.orderId));

    const numSelected = adminSelectedOrderIds.size;
    countSpan.textContent = `${numSelected} seleccionado(s)`;

    if (numSelected > 0) {
        batchActionsContainer.style.display = 'flex';
        deselectBtn.style.display = 'inline-flex';
        markBtn.disabled = false;
    } else {
        batchActionsContainer.style.display = 'none';
    }
}

/**
 * Selecciona todos los checkboxes de pedidos visibles y no deshabilitados.
 */
function selectAllVisibleOrders() {
    document.querySelectorAll('#adminOrdersList .order-card-visual').forEach(card => {
        if (card.style.display !== 'none') {
            const checkbox = card.querySelector('.order-select-checkbox:not(:disabled)');
            if (checkbox) checkbox.checked = true;
        }
    });
    updateBatchActionButtonsState();
}

/**
 * Deselecciona todos los checkboxes de pedidos.
 */
function deselectAllOrders() {
    document.querySelectorAll('#adminOrdersList .order-select-checkbox:checked').forEach(cb => cb.checked = false);
    updateBatchActionButtonsState();
}

/**
 * Marca como "Entregado" todos los pedidos seleccionados.
 */
async function handleMarkSelectedAsDelivered() {
    const orderIds = Array.from(adminSelectedOrderIds);
    if (orderIds.length === 0) return showAdminNotification('No hay pedidos seleccionados.', 'info');
    if (!confirm(`¿Marcar ${orderIds.length} pedido(s) como "Entregado"?`)) return;

    const btn = document.getElementById('markSelectedAsDeliveredBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';

    let successCount = 0, errorCount = 0;
    for (const orderId of orderIds) {
        const result = await makeAdminApiCall(`/admin/orders/${orderId}/status`, 'PATCH', { status: 'delivered' });
        if (result.success) successCount++;
        else errorCount++;
    }

    if (errorCount > 0) showAdminNotification(`${successCount} actualizados. ${errorCount} fallaron.`, 'warning');
    else if (successCount > 0) showAdminNotification(`${successCount} pedidos marcados como entregados.`, 'success');
    
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-double"></i> Marcar Seleccionados como Entregados';
    
    loadAdminOrders(document.getElementById('filtroFechaPedidos')?.value);
}

// --- Lógica de Exportación ---

/**
 * Configura los event listeners para los botones de exportación (PDF, CSV y Word).
 */
function setupExportButtons() {
    const exportPdfBtn = document.getElementById('exportAdminOrdersPdfBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const exportWordBtn = document.getElementById('exportWordBtn');
    
    if (exportPdfBtn && exportPdfBtn.dataset.listenerAttached !== 'true') {
        exportPdfBtn.addEventListener('click', exportOrdersToPDF);
        exportPdfBtn.dataset.listenerAttached = 'true';
    }

    if (exportCsvBtn && exportCsvBtn.dataset.listenerAttached !== 'true') {
        exportCsvBtn.addEventListener('click', exportOrdersToCSV);
        exportCsvBtn.dataset.listenerAttached = 'true';
    }

    if (exportWordBtn && exportWordBtn.dataset.listenerAttached !== 'true') {
        exportWordBtn.addEventListener('click', exportOrdersToWord);
        exportWordBtn.dataset.listenerAttached = 'true';
    }
}

/**
 * Exporta los pedidos visibles a un documento PDF.
 */
async function exportOrdersToPDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF || typeof jsPDF.API.autoTable !== 'function') {
        return showAdminNotification('Librerías para PDF no están cargadas.', 'error');
    }

    const orderCards = document.querySelectorAll('#adminOrdersList .order-card-visual');
    const visibleOrders = Array.from(orderCards)
        .filter(card => card.style.display !== 'none')
        .map(card => JSON.parse(card.dataset.orderData.replace(/&apos;/g, "'")));
    
    if (visibleOrders.length === 0) {
        return showAdminNotification('No hay pedidos visibles para exportar.', 'info');
    }

    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(18);
    doc.text('Reporte de Pedidos - Katana Sushi', 105, yPos, { align: 'center' });
    yPos += 10;
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleString('es-ES')}`, 105, yPos, { align: 'center' });
    yPos += 15;

    visibleOrders.forEach((order, index) => {
        if (yPos > 260) {
            doc.addPage();
            yPos = 20;
        }

        const orderId = order.orderId || order._id;
        const customerName = order.deliveryDetails?.nombre || 'N/A';
        const orderDate = new Date(order.createdAt).toLocaleDateString('es-ES');
        
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
            theme: 'grid',
            headStyles: { fillColor: [202, 11, 11] },
            styles: { fontSize: 9, cellPadding: 1.5 },
            columnStyles: {
                0: { cellWidth: 15 }, 1: { cellWidth: 'auto' },
                2: { cellWidth: 30, halign: 'right' }, 3: { cellWidth: 30, halign: 'right' }
            }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(`Total: $${(parseFloat(order.totalAmount) || 0).toFixed(2)}`, 196, yPos, { align: 'right' });
        yPos += 15;

        if (index < visibleOrders.length - 1) {
            doc.setDrawColor(200, 200, 200);
            doc.line(14, yPos - 7, 196, yPos - 7);
        }
    });

    doc.save(`pedidos_katana_${new Date().toISOString().slice(0,10)}.pdf`);
    showAdminNotification('PDF de pedidos generado.', 'success');
}

/**
 * Exporta los pedidos visibles a un documento de Word.
 */
async function exportOrdersToWord() {
    if (!window.docx || !window.QRious) {
        return showAdminNotification('Librerías para Word (docx, qrious) no están cargadas.', 'error');
    }

    const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, HeadingLevel } = window.docx;
    
    const orderCards = document.querySelectorAll('#adminOrdersList .order-card-visual');
    const visibleOrders = Array.from(orderCards)
        .filter(card => card.style.display !== 'none')
        .map(card => JSON.parse(card.dataset.orderData.replace(/&apos;/g, "'")));

    if (visibleOrders.length === 0) {
        return showAdminNotification('No hay pedidos visibles para exportar.', 'info');
    }

    const children = [new Paragraph({ text: 'Reporte de Pedidos - Katana Sushi', heading: HeadingLevel.TITLE })];

    for (const pedido of visibleOrders) {
        children.push(new Paragraph({ text: `Pedido #${pedido.orderId || pedido._id}`, heading: HeadingLevel.HEADING_2 }));
        
        const qrData = pedido.deliveryDetails?.direccion || '';
        if (qrData) {
            try {
                const qr = new window.QRious({ value: qrData, size: 128 });
                const dataUrl = qr.toDataURL();
                const base64Data = dataUrl.split(',')[1];
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length).map((_, i) => binaryString.charCodeAt(i));
                
                children.push(new Paragraph({
                    children: [new ImageRun({ data: bytes, transformation: { width: 100, height: 100 }})],
                    alignment: AlignmentType.CENTER
                }));
            } catch (qrError) {
                console.error("Error generando QR para pedido (Word):", pedido, qrError);
                children.push(new Paragraph({ text: `[Error al generar QR para la dirección]` }));
            }
        }
        
        children.push(new Paragraph({ text: `Cliente: ${pedido.deliveryDetails?.nombre}`}));
        children.push(new Paragraph({ text: `Total: $${(pedido.totalAmount || 0).toFixed(2)}` }));
    }

    const doc = new Document({
        sections: [{ children }],
        styles: {
            paragraphStyles: [
                { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, color: "C2185B" } },
            ]
        }
    });

    const blob = await Packer.toBlob(doc);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pedidos_katana_sushi_${new Date().toISOString().slice(0,10)}.docx`;
    link.click();
    URL.revokeObjectURL(link.href);
    showAdminNotification('Documento Word generado.', 'success');
}

/**
 * Exporta los pedidos visibles a un archivo CSV.
 */
async function exportOrdersToCSV() {
    const orderCards = document.querySelectorAll('#adminOrdersList .order-card-visual');
    const visibleOrders = Array.from(orderCards)
        .filter(card => card.style.display !== 'none')
        .map(card => JSON.parse(card.dataset.orderData.replace(/&apos;/g, "'")));
    
    if (visibleOrders.length === 0) {
        return showAdminNotification('No hay pedidos visibles para exportar.', 'info');
    }

    // Preparar los datos para CSV
    const csvData = [];
    
    // Encabezados
    csvData.push([
        'ID Pedido',
        'Cliente',
        'Teléfono',
        'Dirección',
        'Zona',
        'Fecha',
        'Estado',
        'Origen',
        'Total Productos',
        'Costo Envío',
        'Total General',
        'Productos'
    ]);

    // Datos de cada pedido
    visibleOrders.forEach(order => {
        const orderId = order.orderId || order._id.slice(-6);
        const customerName = order.deliveryDetails?.nombre || 'N/A';
        const phone = order.deliveryDetails?.telefono || 'N/A';
        const address = order.deliveryDetails?.direccion || 'N/A';
        const zone = order.deliveryDetails?.zona || 'N/A';
        const orderDate = new Date(order.createdAt).toLocaleDateString('es-ES');
        const status = order.status || 'N/A';
        const source = order.source || 'N/A';
        const totalItems = order.items?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;
        const shippingCost = order.shippingCost || 0;
        const totalAmount = order.totalAmount || 0;
        
        // Lista de productos como texto
        const productsList = order.items?.map(item => 
            `${item.quantity}x ${item.name} ($${(item.price || 0).toFixed(2)})`
        ).join('; ') || 'N/A';

        csvData.push([
            orderId,
            customerName,
            phone,
            address,
            zone,
            orderDate,
            status,
            source,
            totalItems,
            `$${shippingCost.toFixed(2)}`,
            `$${totalAmount.toFixed(2)}`,
            productsList
        ]);
    });

    // Convertir a formato CSV
    const csvContent = csvData.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    // Crear y descargar el archivo
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `pedidos_katana_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showAdminNotification('Archivo CSV de pedidos generado exitosamente.', 'success');
}


// --- Utilidades del Módulo ---

function getOrderStatusInfo(status) {
    const s = (status || '').toLowerCase();
    switch (s) {
        case 'pending': return { statusClass: 'status-pendiente', statusText: 'Pendiente' };
        case 'processing': return { statusClass: 'status-procesando', statusText: 'En Preparación' };
        case 'shipped': return { statusClass: 'status-camino', statusText: 'En Camino' };
        case 'delivered': return { statusClass: 'status-entregado', statusText: 'Entregado' };
        case 'cancelled': return { statusClass: 'status-cancelado', statusText: 'Cancelado' };
        default: return { statusClass: 'status-todos', statusText: 'Desconocido' };
    }
}

/**
 * Inicializa la sección de pedidos manuales.
 */
export function initializeManualOrdersSection() {
    console.log("Módulo de Pedidos Manuales inicializado.");
    loadManualOrders();
}

/**
 * Carga los pedidos registrados manualmente desde la API y los muestra en la tabla.
 */
async function loadManualOrders() {
    const tableBody = document.querySelector('#adminManualOrdersTable tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Cargando pedidos manuales...</td></tr>';

    try {
        const result = await makeAdminApiCall('/admin/manual-orders', 'GET');
        if (result.success && Array.isArray(result.data)) {
            renderManualOrdersTable(result.data);
        } else {
            throw new Error(result.message || 'No se pudieron cargar los pedidos manuales.');
        }
    } catch (error) {
        console.error("Error cargando pedidos manuales:", error);
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: red;">Error: ${error.message}</td></tr>`;
    }
}

/**
 * Renderiza las filas de la tabla para los pedidos manuales.
 * @param {Array} orders - La lista de pedidos manuales.
 */
function renderManualOrdersTable(orders) {
    const tableBody = document.querySelector('#adminManualOrdersTable tbody');
    if (!tableBody) return;

    if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay pedidos registrados manualmente.</td></tr>';
        return;
    }

    tableBody.innerHTML = orders.map(order => {
        const orderDate = new Date(order.createdAt).toLocaleDateString('es-ES');
        return `
            <tr>
                <td>${order.orderId || order._id.slice(-6)}</td>
                <td>${order.deliveryDetails.nombre || 'N/A'}</td>
                <td>${order.deliveryDetails.telefono || 'N/A'}</td>
                <td>${order.deliveryDetails.direccion || 'N/A'}</td>
                <td>${order.deliveryDetails.zona || 'N/A'}</td>
                <td>$${(order.totalAmount || 0).toFixed(2)}</td>
                <td>${orderDate}</td>
                <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            </tr>
        `;
    }).join('');
}