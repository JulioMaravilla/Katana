const express = require('express');
const router = express.Router();
const { createGuestOrder, createAuthenticatedOrder, getUserOrders } = require('../controllers/order.controller');
const { auth } = require('../middleware/auth.middleware');

// Ruta para pedidos de invitados
router.post('/guest', createGuestOrder);

// Ruta para pedidos de usuarios autenticados
router.post('/', auth, createAuthenticatedOrder);

// Ruta para obtener el historial de pedidos de un usuario autenticado
router.get('/', auth, getUserOrders);

module.exports = router;