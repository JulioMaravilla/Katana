const express = require('express');
const router = express.Router();
const {
    getAllProducts,
    createProduct,
    deleteProduct
} = require('../controllers/product.controller');
const {
    adminAuth
} = require('../middleware/auth.middleware');
const {
    productUpload
} = require('../middleware/upload.middleware');

// Ruta pública para obtener todos los productos
router.get('/', getAllProducts);

// Rutas de admin para gestionar productos
router.post('/', adminAuth, productUpload.single('productImage'), createProduct);
router.delete('/:id', adminAuth, deleteProduct);

module.exports = router;