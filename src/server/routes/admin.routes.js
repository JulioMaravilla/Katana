const express = require('express');
const router = express.Router();

// Controladores
const {
    loginAdmin, // Iniciar sesión de administrador
    getAllUsers, // Obtener todos los usuarios
    getAllOrders, // Obtener todos los pedidos
    updateOrderStatus, // Actualizar el estado de un pedido
    getAdminProfile, // Obtener perfil del administrador
    updateAdminProfile, // Actualizar perfil del administrador
    changeAdminPassword, // Cambiar contraseña del administrador
    uploadAdminAvatar, // Subir avatar del administrador
    getAdminAvatar, // Obtener avatar del administrador
    createManualOrder, // Crear un pedido manual
    getManualOrders, // Obtener pedidos manuales
    uploadCarouselImage, // Subir imagen del carrusel
    deleteCarouselImage, // Eliminar imagen del carrusel
    // Controladores de reportes
    getReportMetrics,
    getSalesChartData,
    getCategoryChartData,
    getCustomerReport,
    getProductReport
} = require('../controllers/admin.controller');

// Middlewares
const { adminAuth } = require('../middleware/auth.middleware');
const { avatarUpload, carouselUpload } = require('../middleware/upload.middleware');

// --- Rutas de Administración ---

// Auth
router.post('/login', loginAdmin);

// Users
router.get('/users', adminAuth, getAllUsers);

// Orders
router.get('/orders', adminAuth, getAllOrders);
router.patch('/orders/:id/status', adminAuth, updateOrderStatus);
router.post('/manual-order', adminAuth, createManualOrder);
router.get('/manual-orders', adminAuth, getManualOrders);

// Profile
router.get('/profile', adminAuth, getAdminProfile);
router.put('/profile', adminAuth, updateAdminProfile);
router.put('/password', adminAuth, changeAdminPassword);
router.post('/avatar', adminAuth, avatarUpload.single('avatar'), uploadAdminAvatar);
router.get('/avatar/:adminId', getAdminAvatar);

// Carousel
router.post('/carousel-images', adminAuth, carouselUpload.single('carouselImageFile'), uploadCarouselImage);
router.delete('/carousel-images/:id', adminAuth, deleteCarouselImage);

// Reports
router.get('/reports/metrics', adminAuth, getReportMetrics);
router.get('/reports/sales-chart', adminAuth, getSalesChartData);
router.get('/reports/category-chart', adminAuth, getCategoryChartData);
router.get('/reports/customers', adminAuth, getCustomerReport);
router.get('/reports/products', adminAuth, getProductReport);

module.exports = router;