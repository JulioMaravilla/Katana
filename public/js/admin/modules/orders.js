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
let currentWeekStartDate = null;


// --- NUEVA FUNCIÓN DE AYUDA: Obtener el rango de la semana (Domingo a Sábado) ---
function getWeekRange(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Domingo, 1=Lunes, ...
    const diffToSunday = d.getDate() - day;
    
    const startDate = new Date(d.setDate(diffToSunday));
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7); // Apunta al inicio del siguiente Domingo
    
    return { start: startDate, end: endDate };
}

// --- NUEVA FUNCIÓN DE AYUDA: Formatear el rango para mostrarlo ---
function formatWeekRangeForDisplay(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // Sábado de esa semana

    const startDay = startDate.getDate();
    const startMonth = startDate.toLocaleString('es-ES', { month: 'short' });
    const endDay = endDate.getDate();
    const endMonth = endDate.toLocaleString('es-ES', { month: 'short' });
    const year = startDate.getFullYear();

    return `Semana: ${startDay} ${startMonth} - ${endDay} ${endMonth}, ${year}`;
}

/**
 * CORREGIDO: Inicializa la sección de pedidos con el nuevo navegador de semanas.
 */
export function initializeOrders() {
    console.log("Módulo de Pedidos inicializado con navegador de semanas.");

    // --- Lógica para el nuevo navegador de semanas ---
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');

    if (prevWeekBtn && !prevWeekBtn.dataset.listener) {
        prevWeekBtn.addEventListener('click', () => {
            currentWeekStartDate.setDate(currentWeekStartDate.getDate() - 7);
            const { start, end } = getWeekRange(currentWeekStartDate);
            loadAdminOrders(start, end);
        });
        prevWeekBtn.dataset.listener = 'true';
    }

    if (nextWeekBtn && !nextWeekBtn.dataset.listener) {
        nextWeekBtn.addEventListener('click', () => {
            currentWeekStartDate.setDate(currentWeekStartDate.getDate() + 7);
            const { start, end } = getWeekRange(currentWeekStartDate);
            loadAdminOrders(start, end);
        });
        nextWeekBtn.dataset.listener = 'true';
    }
    
    // --- Lógica existente que se mantiene ---
    setupBatchOrderActions();
    setupExportButtons();
    setupManualOrderModalListeners();
    
    // --- Carga inicial con la semana actual ---
    currentWeekStartDate = new Date();
    const { start, end } = getWeekRange(currentWeekStartDate);
    loadAdminOrders(start, end);
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
/**
 * CORREGIDO: Ahora acepta un rango de fechas.
 */
export async function loadAdminOrders(startDate, endDate) {
    const ordersContainer = document.getElementById('adminOrdersList');
    const weekDisplay = document.getElementById('weekRangeDisplay');
    
    if (!ordersContainer || !weekDisplay) return;

    ordersContainer.innerHTML = '<p style="text-align: center; width: 100%; padding: 2rem 0;">Cargando pedidos... <i class="fas fa-spinner fa-spin"></i></p>';
    weekDisplay.textContent = formatWeekRangeForDisplay(startDate);

    try {
        // Formatear fechas para la URL (YYYY-MM-DD)
        const startDateString = startDate.toISOString().split('T')[0];
        const endDateString = endDate.toISOString().split('T')[0];
        
        let url = `/admin/orders?startDate=${startDateString}&endDate=${endDateString}`;
        
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
    const orderDate = new Date(order.createdAt || Date.now());
    const orderDateFormatted = orderDate.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const orderDateForFilter = orderDate.toISOString().split('T')[0]; 
    
    const { statusClass, statusText } = getOrderStatusInfo(order.status);
    const orderDataString = JSON.stringify(order).replace(/'/g, "&apos;");
    const isActionable = order.status !== 'delivered' && order.status !== 'cancelled';
    
    // Calcular subtotal (Total - Envío)
    const totalAmount = parseFloat(order.totalAmount) || 0;
    const shippingCost = parseFloat(order.shippingCost) || 0;

    // Generar la lista de productos
    const productsHtml = (order.items || []).map(prod => `
        <div class="product-item">
            <span class="name">• ${prod.quantity}x ${prod.name || 'Producto'}</span>
            <span class="price">($${(prod.price || 0).toFixed(2)} c/u)</span>
        </div>
    `).join('');

    return `
        <div class="order-card-minimal"
             data-order-db-id="${order._id}" 
             data-order-status="${order.status}" 
             data-order-date="${orderDateForFilter}"
             data-order-data='${orderDataString}'> 
            
            <div class="minimal-header">
                <div class="order-id">
                    <input type="checkbox"
                           class="order-select-checkbox"
                           data-order-id="${order._id}"
                           ${!isActionable ? 'disabled' : ''}
                           title="${isActionable ? 'Seleccionar pedido' : 'Pedido no accionable'}">
                    <span>#${order.orderId || order._id.slice(-6)}</span>
                </div>
                
                <div class="custom-status-select ${statusClass}" data-order-id="${order._id}">
                    <button type="button" class="custom-select-btn ${statusClass}">${statusText}</button>
                    <ul class="custom-select-options">
                        <li class="custom-select-option status-pendiente" data-value="pending">Pendiente</li>
                        <li class="custom-select-option status-procesando" data-value="processing">En preparación</li>
                        <li class="custom-select-option status-camino" data-value="shipped">En Camino</li>
                        <li class="custom-select-option status-entregado" data-value="delivered">Entregado</li>
                        <li class="custom-select-option status-cancelado" data-value="cancelled">Cancelado</li>
                    </ul>
                </div>
            </div>

            <div class="minimal-body">
                <div class="customer-details">
                    <p><i class="fas fa-user"></i> <strong>Cliente:</strong> ${order.deliveryDetails?.nombre || '-'}</p>
                    <p><i class="fas fa-phone"></i> <strong>Teléfono:</strong> ${order.deliveryDetails?.telefono || '-'}</p>
                    <p><i class="fas fa-map-marker-alt"></i> <strong>Dirección:</strong> ${order.deliveryDetails?.direccion || '-'}</p>
                </div>
                <div class="product-list">
                    <strong>Producto(s):</strong>
                    ${productsHtml}
                </div>
            </div>

            <div class="minimal-footer">
                <div class="shipping-cost">
                    Envío: <strong>$${shippingCost.toFixed(2)}</strong>
                </div>
                <div class="grand-total">
                    Total: <strong>$${totalAmount.toFixed(2)}</strong>
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

            const { start, end } = getWeekRange(currentWeekStartDate);
            loadAdminOrders(start, end); // Recargar pedidos para reflejar el cambio
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
    const orderCards = document.querySelectorAll('#adminOrdersList .order-card-minimal');
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
        const button = event.target.closest('.admin-btn');
        const checkbox = event.target.closest('.order-select-checkbox');

        if (button) {
            if (button.id === 'markSelectedAsDeliveredBtn') handleMarkSelectedAsDelivered();
            else if (button.id === 'selectAllVisibleBtn') selectAllVisibleOrders();
            else if (button.id === 'deselectAllBtn') deselectAllOrders();
        } else if (checkbox) {
            updateBatchActionButtonsState();
        }
    });
}

/**
 * Actualiza la visibilidad y el estado de los botones de acción en lote.
 */
function updateBatchActionButtonsState() {
    const selectedCheckboxes = document.querySelectorAll('#adminOrdersList .order-card-minimal .order-select-checkbox:checked:not(:disabled)');
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
    document.querySelectorAll('#adminOrdersList .order-card-minimal').forEach(card => {
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
    document.querySelectorAll('#adminOrdersList .order-card-minimal .order-select-checkbox:checked').forEach(cb => cb.checked = false);
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
    
    const { start, end } = getWeekRange(currentWeekStartDate);
    loadAdminOrders(start, end); // Recargar pedidos para reflejar el cambio
}

// --- Lógica de Exportación ---

/**
 * Configura los event listeners para los botones de exportación (PDF, CSV y Word).
 */
function setupExportButtons() {
    const exportPdfBtn = document.getElementById('exportAdminOrdersPdfBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const exportWordBtn = document.getElementById('exportWordBtn');
    
    if (exportPdfBtn && exportPdfBtn.dataset.listenerAttached !== 'true') {
        exportPdfBtn.addEventListener('click', exportOrdersToPDF);
        exportPdfBtn.dataset.listenerAttached = 'true';
    }

    if (exportExcelBtn && exportExcelBtn.dataset.listenerAttached !== 'true') {
        exportExcelBtn.addEventListener('click', exportOrdersToExcel);
        exportExcelBtn.dataset.listenerAttached = 'true';
    }

    if (exportWordBtn && exportWordBtn.dataset.listenerAttached !== 'true') {
        exportWordBtn.addEventListener('click', exportOrdersToWord);
        exportWordBtn.dataset.listenerAttached = 'true';
    }
}

/**
 * FINAL: Exporta los pedidos activos de la semana actual a un PDF con un diseño 
 * de 6 tarjetas por página (2x3) y un nombre de archivo dinámico.
 */
async function exportOrdersToPDF() {
    if (!window.jspdf || !window.QRious) {
        return showAdminNotification('Librerías para PDF o QR no están cargadas.', 'error');
    }

    const { jsPDF } = window.jspdf;

    const allOrderCards = document.querySelectorAll('#adminOrdersList .order-card-minimal');
    
    const ordersToExport = Array.from(allOrderCards)
        .map(card => JSON.parse(card.dataset.orderData.replace(/'/g, "'")))
        .filter(order => {
            const status = order.status.toLowerCase();
            return status !== 'delivered' && status !== 'cancelled';
        });

    if (ordersToExport.length === 0) {
        return showAdminNotification('No hay pedidos activos para exportar en la vista actual.', 'info');
    }

    showAdminNotification(`Generando PDF para ${ordersToExport.length} pedidos...`, 'info');

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // --- INICIO DE LA CORRECCIÓN: PARÁMETROS PARA 2x3 ---
    const margin = 10;
    const verticalGap = 4; // Espacio vertical entre tarjetas
    const horizontalGap = 5; // Espacio horizontal
    const cardHeight = 80; // Altura que permite 3 filas
    const cardWidth = (pageWidth - (margin * 2) - horizontalGap) / 2; // Ancho para 2 tarjetas

    let y = margin;
    let x = margin;
    let isLeftColumn = true;
    // --- FIN DE LA CORRECCIÓN ---

    const logoUrl = '/images/LOGO-SIN-FONDO.png';

    for (const order of ordersToExport) {
        if (y + cardHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
            x = margin;
            isLeftColumn = true;
        }

        // El código para dibujar la tarjeta (bordes, logo, texto, etc.) es el mismo.
        // Solo hemos cambiado las dimensiones y la lógica de posicionamiento.
        doc.setDrawColor(180);
        doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3);
        doc.setDrawColor(220);
        doc.line(x, y + 15, x + cardWidth, y + 15);
        try { doc.addImage(logoUrl, 'PNG', x + 3, y + 2.5, 10, 10); } catch (e) { console.error("No se pudo añadir el logo al PDF:", e); }
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(44, 62, 80);
        doc.text(`#${order.orderId || order._id.slice(-6)}`, x + cardWidth - 3, y + 9, { align: 'right' });
        let currentY = y + 21;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(80);
        const textMaxWidth = cardWidth - 6;
        doc.text(`Cliente: ${order.deliveryDetails?.nombre || 'N/A'}`, x + 3, currentY);
        currentY += 5;
        doc.text(`Teléfono: ${order.deliveryDetails?.telefono || 'N/A'}`, x + 3, currentY);
        currentY += 5;
        const referenceLines = doc.splitTextToSize(`Ref: ${order.deliveryDetails?.referencia || 'Ninguna.'}`, textMaxWidth);
        doc.text(referenceLines, x + 3, currentY);
        currentY += (referenceLines.length * 3.5) + 2;
        doc.setFont(undefined, 'bold');
        doc.text('Producto(s):', x + 3, currentY);
        currentY += 4;
        doc.setFont(undefined, 'normal');
        const productSummary = order.items.map(item => `${item.quantity}x ${item.name}`).join(', ');
        let productLines = doc.splitTextToSize(productSummary, textMaxWidth);
        const maxProductLines = 2;
        if (productLines.length > maxProductLines) {
            productLines = productLines.slice(0, maxProductLines);
            productLines[maxProductLines - 1] = productLines[maxProductLines - 1].slice(0, -3) + '...';
        }
        doc.text(productLines, x + 3, currentY);
        const footerY = y + cardHeight - 12;
        doc.line(x, footerY, x + cardWidth, footerY);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(202, 11, 11);
        doc.text(`$${(parseFloat(order.totalAmount) || 0).toFixed(2)}`, x + 5, footerY + 7);
        const qrSize = 22;
        const qrX = x + cardWidth - qrSize - 3;
        const qrY = footerY - 9;
        const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(order.deliveryDetails?.direccion || 'Usulutan, El Salvador')}`;
        try {
            const qr = new window.QRious({ value: googleMapsUrl, size: 128 });
            doc.addImage(qr.toDataURL(), 'PNG', qrX, qrY, qrSize, qrSize);
        } catch (qrError) { console.error("Error al generar QR:", qrError); }
        
        // Lógica para alternar entre 2 columnas
        if (isLeftColumn) {
            x += cardWidth + horizontalGap;
            isLeftColumn = false;
        } else {
            x = margin;
            y += cardHeight + verticalGap;
            isLeftColumn = true;
        }
    }

    const { start: weekStart, end: weekEnd } = getWeekRange(currentWeekStartDate);
    weekEnd.setDate(weekEnd.getDate() - 1);
    const formatDate = (date) => `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    const fileName = `Fichas_Pedidos_KatanaSushi_Semana_${formatDate(weekStart)}_a_${formatDate(weekEnd)}.pdf`;
    
    doc.save(fileName);

    showAdminNotification('PDF con fichas de pedido generado.', 'success');
}

/**
 * Exporta los pedidos activos de la semana actual a un documento de Word (.docx)
 * con un formato de reporte detallado.
 */
async function exportOrdersToWord() {
    // 1. Verificar si la librería docx está disponible
    if (!window.docx) {
        return showAdminNotification('La librería para generar Word no está cargada.', 'error');
    }

    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } = window.docx;

    // 2. Filtrar los pedidos (misma lógica que PDF y Excel)
    const ordersToExport = allAdminOrders.filter(order => {
        const status = order.status.toLowerCase();
        return status !== 'delivered' && status !== 'cancelled';
    });

    if (ordersToExport.length === 0) {
        return showAdminNotification('No hay pedidos activos para exportar en la vista actual.', 'info');
    }

    showAdminNotification('Generando documento de Word...', 'info');

    // 3. Crear el contenido del documento
    const docChildren = [];

    docChildren.push(new Paragraph({ text: "Respaldo de Pedidos Semanales - Katana Sushi", heading: HeadingLevel.TITLE }));

    ordersToExport.forEach((order, index) => {
        const totalAmount = parseFloat(order.totalAmount) || 0;
        const shippingCost = parseFloat(order.shippingCost) || 0;
        const subtotal = totalAmount - shippingCost;

        // Añadir detalles del pedido
        docChildren.push(new Paragraph({ text: `Pedido #${order.orderId || order._id.slice(-6)}`, heading: HeadingLevel.HEADING_2 }));
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({ text: "Cliente: ", bold: true }),
                    new TextRun(order.deliveryDetails?.nombre || 'N/A'),
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Teléfono: ", bold: true }),
                    new TextRun(order.deliveryDetails?.telefono || 'N/A'),
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Dirección: ", bold: true }),
                    new TextRun(order.deliveryDetails?.direccion || 'N/A'),
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Estado: ", bold: true }),
                    new TextRun({ text: order.status || 'N/A', color: "CC0000" }),
                ]
            }),
            new Paragraph({ text: "Productos:", bold: true, spacing: { before: 200 } })
        );

        // Crear tabla de productos
        const tableRows = [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: "Cant.", bold: true })], width: { size: 10, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ text: "Producto", bold: true })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ text: "Precio Unit.", bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ text: "Subtotal", bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } }),
                ],
                tableHeader: true,
            })
        ];

        (order.items || []).forEach(item => {
            const itemPrice = parseFloat(item.price) || 0;
            const itemQuantity = parseInt(item.quantity) || 1;
            tableRows.push(
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(String(itemQuantity))] }),
                        new TableCell({ children: [new Paragraph(item.name || '')] }),
                        new TableCell({ children: [new Paragraph(`$${itemPrice.toFixed(2)}`)] }),
                        new TableCell({ children: [new Paragraph(`$${(itemPrice * itemQuantity).toFixed(2)}`)] }),
                    ]
                })
            );
        });

        const productTable = new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } });
        docChildren.push(productTable);

        // Resumen de costos
        docChildren.push(
            new Paragraph({ text: `Subtotal Productos: $${subtotal.toFixed(2)}`, alignment: AlignmentType.RIGHT }),
            new Paragraph({ text: `Costo de Envío: $${shippingCost.toFixed(2)}`, alignment: AlignmentType.RIGHT }),
            new Paragraph({
                children: [
                    new TextRun({ text: `Total del Pedido: $${totalAmount.toFixed(2)}`, bold: true, size: 24 }),
                ],
                alignment: AlignmentType.RIGHT
            })
        );

        // Separador para el siguiente pedido
        if (index < ordersToExport.length - 1) {
            docChildren.push(new Paragraph({ text: "", border: { bottom: { color: "auto", space: 1, value: "single", size: 6 } }, spacing: { after: 400, before: 400 } }));
        }
    });

    // 4. Crear y descargar el documento
    const doc = new Document({
        sections: [{ children: docChildren }],
        styles: {
            paragraphStyles: [
                { id: "Title", name: "Title", run: { size: 40, bold: true, color: "C00000" } },
                { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { size: 28, bold: true, color: "4F81BD" }, paragraph: { spacing: { before: 240, after: 120 } } },
            ]
        }
    });

    const { start: weekStart, end: weekEnd } = getWeekRange(currentWeekStartDate);
    weekEnd.setDate(weekEnd.getDate() - 1);
    const formatDate = function(date) {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        return d + '-' + m + '-' + y;
    };
    const fileName = `Respaldo_Word_Semana_${formatDate(weekStart)}_a_${formatDate(weekEnd)}.docx`;

    Packer.toBlob(doc).then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    });

    showAdminNotification('Documento Word generado exitosamente.', 'success');
}


/**
 * FINAL: Exporta los pedidos activos de la semana actual a un archivo XLSX (Excel)
 * con estilos y el nombre de archivo formateado correctamente.
 */
function exportOrdersToExcel() {
    // 1. Filtrar los pedidos (esto ya funciona bien)
    const ordersToExport = allAdminOrders.filter(order => {
        const status = order.status.toLowerCase();
        return status !== 'delivered' && status !== 'cancelled';
    });

    if (ordersToExport.length === 0) {
        return showAdminNotification('No hay pedidos activos para exportar.', 'info');
    }

    // ... (El código para preparar los datos y estilos de la hoja de cálculo no cambia) ...
    const dataForSheet = [];
    ordersToExport.forEach(order => {
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                dataForSheet.push({
                    "ID Pedido": order.orderId || order._id.slice(-6),
                    "Fecha": new Date(order.createdAt).toLocaleDateString('es-ES'),
                    "Cliente": order.deliveryDetails?.nombre || 'N/A',
                    "Teléfono": order.deliveryDetails?.telefono || 'N/A',
                    "Dirección": order.deliveryDetails?.direccion || 'N/A',
                    "Referencia": order.deliveryDetails?.referencia || 'N/A',
                    "Producto": item.name || 'Producto desconocido',
                    "Cant.": item.quantity || 1,
                    "Precio Unit.": parseFloat(item.price || 0),
                    "Total Pedido": parseFloat(order.totalAmount || 0),
                    "Estado": order.status
                });
            });
        }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4F81BD" } } };
    const currencyStyle = { numFmt: "$#,##0.00" };
    const columnWidths = [ { wch: 10 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 12 } ];
    worksheet['!cols'] = columnWidths;
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (worksheet[address]) worksheet[address].s = headerStyle;
    }
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        if (worksheet[XLSX.utils.encode_cell({ r: R, c: 8 })]) worksheet[XLSX.utils.encode_cell({ r: R, c: 8 })].s = currencyStyle;
        if (worksheet[XLSX.utils.encode_cell({ r: R, c: 9 })]) worksheet[XLSX.utils.encode_cell({ r: R, c: 9 })].s = currencyStyle;
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pedidos");


    // --- INICIO DE LA CORRECCIÓN FINAL ---
    const { start: weekStart, end: weekEnd } = getWeekRange(currentWeekStartDate);
    weekEnd.setDate(weekEnd.getDate() - 1);

    // Escribimos la función de la forma más tradicional y segura posible.
    const formatDate = function(date) {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return d + '-' + m + '-' + y;
    };

    const fileName = "Respaldo_Pedidos_Semana_" + formatDate(weekStart) + "_a_" + formatDate(weekEnd) + ".xlsx";
    // --- FIN DE LA CORRECCIÓN FINAL ---
    
    XLSX.writeFile(workbook, fileName);

    showAdminNotification('Respaldo Excel generado exitosamente.', 'success');
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