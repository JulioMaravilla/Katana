const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/auth.controller');

// Ruta para registrar un nuevo usuario
// POST /api/auth/register
router.post('/register', registerUser);

// Ruta para iniciar sesión
// POST /api/auth/login
router.post('/login', loginUser);

module.exports = router;