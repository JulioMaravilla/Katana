const express = require('express');
const router = express.Router();
const {
    getUserProfile,
    updateUserProfile,
    changePassword,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    deactivateAccount
} = require('../controllers/user.controller');
const {
    auth
} = require('../middleware/auth.middleware');

// Rutas de Perfil de Usuario (requieren autenticación)
router.get('/profile', auth, getUserProfile);
router.put('/profile', auth, updateUserProfile);
router.post('/profile/change-password', auth, changePassword);
router.post('/deactivate', auth, deactivateAccount);

// --- RUTAS PARA DIRECCIONES DE ENVÍO ---
router.get('/profile/addresses', auth, getAddresses);
router.post('/profile/addresses', auth, addAddress);
router.put('/profile/addresses/:addressId', auth, updateAddress);
router.delete('/profile/addresses/:addressId', auth, deleteAddress);

module.exports = router;