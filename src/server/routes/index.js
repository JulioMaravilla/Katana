const express = require('express');
const router = express.Router();

// Importar los enrutadores de cada módulo
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const productRoutes = require('./product.routes');
const orderRoutes = require('./order.routes');
const carouselRoutes = require('./carousel.routes');
const adminRoutes = require('./admin.routes');

// Health check endpoint para Coolify
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Usar los enrutadores en el router principal
// Todas estas rutas estarán prefijadas con /api
router.use('/auth', authRoutes); // ej: /api/auth/login
router.use('/users', userRoutes); // ej: /api/users/profile
router.use('/products', productRoutes); // ej: /api/products
router.use('/orders', orderRoutes); // ej: /api/orders
router.use('/carousel', carouselRoutes); // ej: /api/carousel/images
router.use('/admin', adminRoutes); // ej: /api/admin/orders

module.exports = router;