const express = require('express');
const router = express.Router();
const {
    getAllProducts,
    getProductById,
    updateProduct,  
    createProduct,
    deleteProduct,
    getActiveCategories
} = require('../controllers/product.controller');
const {
    adminAuth
} = require('../middleware/auth.middleware');
const {
    productUpload
} = require('../middleware/upload.middleware');

// Ruta pública para obtener todos los productos
router.get('/', getAllProducts);

// Ruta pública para obtener un producto por su ID
router.get('/:id', getProductById);

// Ruta de admin para actualizar un producto
router.put('/:id', adminAuth, productUpload.single('productImage'), updateProduct);

// Rutas de admin para gestionar productos
router.post('/', adminAuth, productUpload.single('productImage'), createProduct);
router.delete('/:id', adminAuth, deleteProduct);

// Ruta para obtener categorías activas
router.get('/categories/active', getActiveCategories);

module.exports = router;