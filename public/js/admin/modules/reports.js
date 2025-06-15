/**
 * @file admin/modules/reports.js
 * @module AdminReports
 * @description Maneja la lógica para la sección de "Reportes" en el panel de administración.
 */

import { makeAdminApiCall } from '../api.js';
import { showAdminNotification } from '../ui.js';

// Guardaremos las instancias de los gráficos para destruirlas antes de volver a dibujar
let salesChartInstance = null;
let categoryChartInstance = null;

/**
 * Inicializa la sección de reportes.
 */
export function initializeReports() {
    console.log("Módulo de Reportes inicializado.");
    
    // Configuración de listeners para cada panel de reporte
    setupReportTypeSwitcher();
    setupSalesChartFilters();
    setupPedidosReportListeners();
    setupClientesReportListeners();
    setupProductosReportListeners();

    // Carga inicial de datos para el primer panel (Ventas)
    loadAllReportData(); 

    const reportSelect = document.getElementById('reportTypeSelect');
    // Asegurarse de que el listener principal se añada solo una vez
    if (reportSelect.dataset.mainListenerAttached !== 'true') {
        reportSelect.addEventListener('change', (e) => {
            const selectedValue = e.target.value;
            
            // Cargar datos del panel seleccionado si aún no se han cargado
            switch (selectedValue) {
                case 'pedidos':
                    const pedidosTableBody = document.querySelector('#pedidosReportTable tbody');
                    if (pedidosTableBody && pedidosTableBody.innerHTML.trim() === '') {
                        loadPedidosData();
                    }
                    break;
                case 'clientes':
                    const clientesTableBody = document.querySelector('#clientesReportTable tbody');
                    if (clientesTableBody && clientesTableBody.innerHTML.trim() === '') {
                        loadClientesData();
                    }
                    break;
                case 'productos':
                    const productosTableBody = document.querySelector('#productosReportTable tbody');
                    if (productosTableBody && productosTableBody.innerHTML.trim() === '') {
                        loadProductosData();
                    }
                    break;
                // El caso 'ventas' no necesita carga aquí porque se carga inicialmente.
            }
        });
        reportSelect.dataset.mainListenerAttached = 'true'; 
    }
}

/**
 * Configura el selector para cambiar entre tipos de reporte (ventas, pedidos, etc.).
 */
function setupReportTypeSwitcher() {
    const select = document.getElementById('reportTypeSelect');
    const selector = document.querySelector('.report-type-selector');
    const icon = document.getElementById('reportTypeIcon');
    
    if (!select || select.dataset.listenerAttached === 'true') return;

    // Función para actualizar los estilos
    function updateStyles(reportType) {
        // Remover todas las clases de fondo
        selector.classList.remove('bg-ventas', 'bg-pedidos', 'bg-clientes', 'bg-productos');
        
        // Agregar la clase correspondiente
        selector.classList.add(`bg-${reportType}`);
        
        // Actualizar el ícono y su color
        const icons = {
            ventas: { icon: 'fa-chart-bar', color: '#1565c0' },
            pedidos: { icon: 'fa-shopping-cart', color: '#b8860b' },
            clientes: { icon: 'fa-users', color: '#388e3c' },
            productos: { icon: 'fa-box', color: '#7c3aed' }
        };
        
        if (icon) {
            icon.innerHTML = `<i class="fas ${icons[reportType].icon}"></i>`;
            icon.style.color = icons[reportType].color;
        }
    }

    select.addEventListener('change', (e) => {
        const selectedReport = e.target.value;
        
        // Actualizar estilos
        updateStyles(selectedReport);
        
        // Ocultar todos los paneles
        document.querySelectorAll('.reports-section > div[id$="ReportContent"]').forEach(div => {
            div.style.display = 'none';
        });
        
        // Mostrar el panel seleccionado
        const activePanel = document.getElementById(`${selectedReport}ReportContent`);
        if (activePanel) {
            activePanel.style.display = 'block';
        }
    });

    // Aplicar estilos iniciales
    updateStyles(select.value);
    
    select.dataset.listenerAttached = 'true';
}


/**
 * Carga todos los datos necesarios para la sección de reportes.
 */
async function loadAllReportData() {
    showAdminNotification('Cargando datos de reportes...', 'info', 2000);
    
    // Cargar métricas (no cambia)
    const metricsResult = await makeAdminApiCall('/admin/reports/metrics', 'GET');
    if (metricsResult.success) {
        updateMetricsUI(metricsResult.data);
    } else {
        showAdminNotification('Error al cargar métricas.', 'error');
    }

    // Carga inicial del gráfico de ventas (últimos 30 días por defecto)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    loadSalesChartData(startDate, endDate);

    // Cargar gráfico de categorías (no cambia)
    const categoryChartResult = await makeAdminApiCall('/admin/reports/category-chart', 'GET');
    if (categoryChartResult.success) {
        renderCategoryChart(categoryChartResult.data);
    } else {
        showAdminNotification('Error al cargar datos del gráfico de categorías.', 'error');
    }
}

/**
 * Actualiza las tarjetas de métricas en la UI.
 * @param {object} metrics - Los datos de las métricas.
 */
function updateMetricsUI(metrics) {
    const metricsGrid = document.querySelector('#ventasReportContent .metrics-grid');
    if (!metricsGrid) return;
    
    metricsGrid.innerHTML = `
        <div class="metric-card">
            <div class="metric-icon"><i class="fas fa-box"></i></div>
            <div class="metric-info"><h3>Producto más vendido</h3><div class="metric-value">${metrics.topProduct}</div></div>
        </div>
        <div class="metric-card">
            <div class="metric-icon"><i class="fas fa-dollar-sign"></i></div>
            <div class="metric-info"><h3>Ingresos totales</h3><div class="metric-value">$${(metrics.totalRevenue || 0).toFixed(2)}</div></div>
        </div>
        <div class="metric-card">
            <div class="metric-icon"><i class="fas fa-shopping-cart"></i></div>
            <div class="metric-info"><h3>Pedidos totales</h3><div class="metric-value">${metrics.totalOrders}</div></div>
        </div>
         <div class="metric-card">
            <div class="metric-icon"><i class="fas fa-users"></i></div>
            <div class="metric-info"><h3>Clientes totales</h3><div class="metric-value">${metrics.totalCustomers}</div></div>
        </div>
    `;
}

// ===== LÓGICA PARA EL REPORTE DE VENTAS (ACTUALIZADA) =====

/**
 * Dibuja o actualiza el gráfico de ventas con un título dinámico.
 * @param {object} chartData - Los datos para el gráfico ({ labels, values }).
 * @param {string} title - El título para el gráfico.
 */
function renderSalesChart(chartData, title) {
    const ctx = document.getElementById('salesChart')?.getContext('2d');
    const chartCardTitle = document.querySelector('#salesChartCard h3'); // Seleccionamos el título del card
    if (!ctx || !chartCardTitle) return;

    // Actualizar el título del card del gráfico
    chartCardTitle.innerText = title || 'Ventas'; 

    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    salesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Ingresos ($)',
                data: chartData.values,
                backgroundColor: 'rgba(52, 152, 219, 0.6)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });
}

/**
 * Carga los datos del gráfico de ventas para un rango de fechas específico.
 * @param {Date} startDate - La fecha de inicio.
 * @param {Date} endDate - La fecha de fin.
 */
async function loadSalesChartData(startDate, endDate) {
    showAdminNotification('Actualizando gráfico de ventas...', 'info', 1500);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const salesChartResult = await makeAdminApiCall(`/admin/reports/sales-chart?startDate=${startDateStr}&endDate=${endDateStr}`, 'GET');
    
    if (salesChartResult.success) {
        renderSalesChart(salesChartResult.data, salesChartResult.data.title);
    } else {
        showAdminNotification('Error al cargar datos del gráfico de ventas.', 'error');
    }
}

/**
 * Configura los listeners para los filtros del gráfico de ventas.
 */
function setupSalesChartFilters() {
    const filterSelect = document.getElementById('salesDateRangeFilter');
    const customDateContainer = document.getElementById('salesCustomDateContainer');
    const startDateInput = document.getElementById('salesStartDate');
    const endDateInput = document.getElementById('salesEndDate');
    const applyButton = document.getElementById('applyCustomDateFilter');

    if (!filterSelect || filterSelect.dataset.listenerAttached === 'true') return;

    filterSelect.addEventListener('change', () => {
        const selectedValue = filterSelect.value;
        if (selectedValue === 'custom') {
            customDateContainer.style.display = 'flex';
        } else {
            customDateContainer.style.display = 'none';
            const endDate = new Date();
            let startDate = new Date();
            switch(selectedValue) {
                case 'today':
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    startDate.setDate(endDate.getDate() - 7);
                    break;
                case 'month':
                    startDate.setDate(endDate.getDate() - 30);
                    break;
                case 'quarter':
                    startDate.setDate(endDate.getDate() - 90);
                    break;
                case 'semester':
                    startDate.setMonth(endDate.getMonth() - 6);
                    break;
                case 'year':
                    startDate.setFullYear(endDate.getFullYear() - 1);
                    break;
            }
            loadSalesChartData(startDate, endDate);
        }
    });

    applyButton.addEventListener('click', () => {
        // Los inputs tipo 'date' devuelven la fecha en UTC. Hay que ajustarlo a la zona local.
        const startValue = startDateInput.value;
        const endValue = endDateInput.value;
        if (!startValue || !endValue) {
             showAdminNotification('Por favor, selecciona ambas fechas.', 'error');
            return;
        }

        // Creamos las fechas agregando la hora para evitar problemas de zona horaria
        const startDate = new Date(`${startValue}T00:00:00`);
        const endDate = new Date(`${endValue}T23:59:59`);

        if (startDate > endDate) {
            showAdminNotification('La fecha de inicio no puede ser posterior a la fecha de fin.', 'error');
            return;
        }
        loadSalesChartData(startDate, endDate);
    });

    filterSelect.dataset.listenerAttached = 'true';
}

/**
 * Dibuja o actualiza el gráfico de categorías.
 * @param {object} chartData - Los datos para el gráfico ({ labels, values }).
 */
function renderCategoryChart(chartData) {
    const ctx = document.getElementById('categoryChart')?.getContext('2d');
    if (!ctx) return;

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Ventas por Categoría',
                data: chartData.values,
                backgroundColor: [
                    'rgba(231, 76, 60, 0.7)',
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(46, 204, 113, 0.7)',
                    'rgba(241, 196, 15, 0.7)',
                    'rgba(155, 89, 182, 0.7)',
                    'rgba(26, 188, 156, 0.7)'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// ===== LÓGICA PARA EL REPORTE DE PEDIDOS =====

// Estado para la paginación y filtros del reporte de pedidos
let pedidosCurrentPage = 1;
const pedidosFilters = {
    status: 'all',
    source: 'all',
    sort: '-createdAt'
};

/**
 * Inicializa los listeners para los filtros y botones del reporte de pedidos.
 */
function setupPedidosReportListeners() {
    const statusFilter = document.getElementById('pedidosStatusFilter');
    const sourceFilter = document.getElementById('pedidosSourceFilter');
    const sortFilter = document.getElementById('pedidosSortFilter');
    const exportCSVBtn = document.getElementById('exportPedidosCSV');
    const exportPDFBtn = document.getElementById('exportPedidosPDF');

    // Evitar añadir listeners múltiples veces
    if (statusFilter.dataset.listenerAttached === 'true') return;

    statusFilter.addEventListener('change', () => {
        pedidosFilters.status = statusFilter.value;
        pedidosCurrentPage = 1;
        loadPedidosData();
    });

    sourceFilter.addEventListener('change', () => {
        pedidosFilters.source = sourceFilter.value;
        pedidosCurrentPage = 1;
        loadPedidosData();
    });
    
    sortFilter.addEventListener('change', () => {
        pedidosFilters.sort = sortFilter.value;
        pedidosCurrentPage = 1;
        loadPedidosData();
    });

    exportCSVBtn.addEventListener('click', exportPedidosToCSV);
    exportPDFBtn.addEventListener('click', exportPedidosToPDF);

    statusFilter.dataset.listenerAttached = 'true';
}

/**
 * Carga los datos de los pedidos desde la API usando los filtros actuales.
 */
async function loadPedidosData() {
    showAdminNotification('Cargando reporte de pedidos...', 'info', 2000);
    const limit = 15; // 15 pedidos por página
    let queryString = `/admin/orders?page=${pedidosCurrentPage}&limit=${limit}&sort=${pedidosFilters.sort}`;
    if (pedidosFilters.status !== 'all') {
        queryString += `&status=${pedidosFilters.status}`;
    }
    if (pedidosFilters.source !== 'all') {
        queryString += `&source=${pedidosFilters.source}`;
    }

    const result = await makeAdminApiCall(queryString, 'GET');

    if (result.success) {
        renderPedidosTable(result.data);
        renderPedidosPagination(result.totalPages, result.currentPage);
    } else {
        showAdminNotification('Error al cargar reporte de pedidos.', 'error');
        document.querySelector('#pedidosReportTable tbody').innerHTML = `<tr><td colspan="7">Error al cargar datos.</td></tr>`;
    }
}

/**
 * Renderiza la tabla de pedidos con los datos obtenidos.
 * @param {Array} orders - La lista de pedidos.
 */
function renderPedidosTable(orders) {
    const tableBody = document.querySelector('#pedidosReportTable tbody');
    if (!orders || orders.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7">No se encontraron pedidos con los filtros seleccionados.</td></tr>`;
        return;
    }

    tableBody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.orderId}</td>
            <td>${order.deliveryDetails.nombre}</td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td><span class="status-badge source-${order.source}">${order.source.replace(/_/g, ' ')}</span></td>
            <td class="text-center">${order.items.reduce((acc, item) => acc + item.quantity, 0)}</td>
            <td>$${(order.totalAmount || 0).toFixed(2)}</td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
        </tr>
    `).join('');
}

/**
 * Renderiza los controles de paginación para la tabla de pedidos.
 * @param {number} totalPages - El número total de páginas.
 * @param {number} currentPage - La página actual.
 */
function renderPedidosPagination(totalPages, currentPage) {
    const paginationContainer = document.getElementById('pedidosPagination');
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '';
    // Botón Anterior
    paginationHTML += `<button class="pagination-button" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">Anterior</button>`;

    // Números de página
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `<button class="pagination-button ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    // Botón Siguiente
    paginationHTML += `<button class="pagination-button" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Siguiente</button>`;

    paginationContainer.innerHTML = paginationHTML;

    // Añadir listeners a los nuevos botones
    paginationContainer.querySelectorAll('.pagination-button').forEach(button => {
        button.addEventListener('click', () => {
            pedidosCurrentPage = parseInt(button.dataset.page);
            loadPedidosData();
        });
    });
}

/**
 * Exporta los datos de la tabla de pedidos a un archivo CSV.
 */
function exportPedidosToCSV() {
    const table = document.getElementById('pedidosReportTable');
    let csv = [];
    // Encabezados
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText);
    csv.push(headers.join(','));

    // Filas
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const rowData = Array.from(row.querySelectorAll('td')).map(td => `"${td.innerText.replace(/"/g, '""')}"`);
        csv.push(rowData.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csv.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_pedidos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAdminNotification('Reporte CSV generado.', 'success');
}

/**
 * Exporta los datos de la tabla de pedidos a un archivo PDF.
 */
function exportPedidosToPDF() {
    // Asegúrate de que jspdf y jspdf-autotable estén cargados en tu admin-dashboard.html
    // <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    // <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf-autotable.min.js"></script>
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Reporte de Pedidos", 14, 16);
    
    // Extraer datos de la tabla HTML para autoTable
    const tableElement = document.getElementById('pedidosReportTable');
    const head = [Array.from(tableElement.querySelectorAll('thead th')).map(th => th.innerText)];
    const body = Array.from(tableElement.querySelectorAll('tbody tr')).map(tr => 
        Array.from(tr.querySelectorAll('td')).map(td => td.innerText)
    );
    
    doc.autoTable({
        startY: 20,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }, // Color azul para encabezados
    });

    doc.save(`reporte_pedidos_${new Date().toISOString().split('T')[0]}.pdf`);
    showAdminNotification('Reporte PDF generado.', 'success');
}

// Finalmente, modifica la función initializeReports para que llame a nuestros nuevos inicializadores
// Debes buscar la función `initializeReports` que ya existe y modificarla.

/* // ESTO ES UN EJEMPLO DE CÓMO DEBE QUEDAR LA FUNCIÓN. NO LA COPIES Y PEGUES, ¡MODIFICA LA TUYA!
export function initializeReports() {
    console.log("Módulo de Reportes inicializado.");
    
    // Lógica existente
    setupReportTypeSwitcher();
    loadAllReportData(); // Esto carga los datos del panel de ventas

    // Nueva lógica para el panel de pedidos
    setupPedidosReportListeners();
    // La carga inicial de datos de pedidos se hará cuando el usuario cambie al panel
    const reportSelect = document.getElementById('reportTypeSelect');
    reportSelect.addEventListener('change', (e) => {
        if (e.target.value === 'pedidos' && document.querySelector('#pedidosReportTable tbody').innerHTML.trim() === '') {
            loadPedidosData();
        }
    });
}
*/

// ===== LÓGICA PARA EL REPORTE DE CLIENTES =====

let clientesSortOrder = '-totalSpent';

/**
 * Inicializa los listeners para los filtros del reporte de clientes.
 */
function setupClientesReportListeners() {
    const sortFilter = document.getElementById('clientesSortFilter');
    const exportCSVBtn = document.getElementById('exportClientesCSV');
    const exportPDFBtn = document.getElementById('exportClientesPDF');
    
    if (sortFilter.dataset.listenerAttached === 'true') return;

    sortFilter.addEventListener('change', () => {
        clientesSortOrder = sortFilter.value;
        loadClientesData();
    });

    exportCSVBtn.addEventListener('click', exportClientesToCSV);
    exportPDFBtn.addEventListener('click', exportClientesToPDF);

    sortFilter.dataset.listenerAttached = 'true';
}

/**
 * Carga los datos de los clientes desde la API.
 */
async function loadClientesData() {
    showAdminNotification('Cargando reporte de clientes...', 'info', 2000);
    const queryString = `/admin/reports/customers?sort=${clientesSortOrder}`;

    const result = await makeAdminApiCall(queryString, 'GET');

    if (result.success) {
        renderClientesTable(result.data);
    } else {
        showAdminNotification('Error al cargar reporte de clientes.', 'error');
        document.querySelector('#clientesReportTable tbody').innerHTML = `<tr><td colspan="6">Error al cargar datos.</td></tr>`;
    }
}

/**
 * Renderiza la tabla de clientes con los datos obtenidos.
 * @param {Array} customers - La lista de clientes.
 */
function renderClientesTable(customers) {
    const tableBody = document.querySelector('#clientesReportTable tbody');
    if (!customers || customers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6">No se encontraron datos de clientes.</td></tr>`;
        return;
    }

    tableBody.innerHTML = customers.map((customer, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${customer.name}</td>
            <td>${customer.email}</td>
            <td class="text-center">${customer.orderCount}</td>
            <td class="text-center">$${(customer.totalSpent || 0).toFixed(2)}</td>
            <td>${new Date(customer.lastOrderDate).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

/**
 * Exporta los datos de la tabla de clientes a CSV.
 */
function exportClientesToCSV() {
    const table = document.getElementById('clientesReportTable');
    let csv = [];
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText);
    csv.push(headers.join(','));

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const rowData = Array.from(row.querySelectorAll('td')).map(td => `"${td.innerText.replace(/"/g, '""')}"`);
        csv.push(rowData.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csv.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_clientes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAdminNotification('Reporte CSV de clientes generado.', 'success');
}

/**
 * Exporta los datos de la tabla de clientes a PDF.
 */
function exportClientesToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text("Reporte de Clientes", 14, 16);
    
    doc.autoTable({
        html: '#clientesReportTable',
        startY: 20,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`reporte_clientes_${new Date().toISOString().split('T')[0]}.pdf`);
    showAdminNotification('Reporte PDF de clientes generado.', 'success');
}

// ===== LÓGICA PARA EL REPORTE DE PRODUCTOS =====

let productosSortOrder = '-unitsSold';

/**
 * Inicializa los listeners para los filtros del reporte de productos.
 */
function setupProductosReportListeners() {
    const sortFilter = document.getElementById('productosSortFilter');
    const exportCSVBtn = document.getElementById('exportProductosCSV');
    const exportPDFBtn = document.getElementById('exportProductosPDF');
    
    if (sortFilter.dataset.listenerAttached === 'true') return;

    sortFilter.addEventListener('change', () => {
        productosSortOrder = sortFilter.value;
        loadProductosData();
    });

    exportCSVBtn.addEventListener('click', exportProductosToCSV);
    exportPDFBtn.addEventListener('click', exportProductosToPDF);

    sortFilter.dataset.listenerAttached = 'true';
}

/**
 * Carga los datos de los productos desde la API.
 */
async function loadProductosData() {
    showAdminNotification('Cargando reporte de productos...', 'info', 2000);
    const queryString = `/admin/reports/products?sort=${productosSortOrder}`;

    const result = await makeAdminApiCall(queryString, 'GET');

    if (result.success) {
        renderProductosTable(result.data);
    } else {
        showAdminNotification('Error al cargar reporte de productos.', 'error');
        document.querySelector('#productosReportTable tbody').innerHTML = `<tr><td colspan="6">Error al cargar datos.</td></tr>`;
    }
}

/**
 * Renderiza la tabla de productos con los datos obtenidos.
 * @param {Array} products - La lista de productos.
 */
function renderProductosTable(products) {
    const tableBody = document.querySelector('#productosReportTable tbody');
    if (!products || products.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6">No se encontraron datos de ventas de productos.</td></tr>`;
        return;
    }

    tableBody.innerHTML = products.map((product, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td class="text-center">${product.unitsSold}</td>
            <td class="text-center">$${(product.totalRevenue || 0).toFixed(2)}</td>
            <td class="text-center">${product.stock}</td>
        </tr>
    `).join('');
}

/**
 * Exporta los datos de la tabla de productos a CSV.
 */
function exportProductosToCSV() {
    const table = document.getElementById('productosReportTable');
    let csv = [];
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText);
    csv.push(headers.join(','));

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const rowData = Array.from(row.querySelectorAll('td')).map(td => `"${td.innerText.replace(/"/g, '""')}"`);
        csv.push(rowData.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csv.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_productos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAdminNotification('Reporte CSV de productos generado.', 'success');
}

/**
 * Exporta los datos de la tabla de productos a PDF.
 */
function exportProductosToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text("Reporte de Productos", 14, 16);
    
    doc.autoTable({
        html: '#productosReportTable',
        startY: 20,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`reporte_productos_${new Date().toISOString().split('T')[0]}.pdf`);
    showAdminNotification('Reporte PDF de productos generado.', 'success');
}