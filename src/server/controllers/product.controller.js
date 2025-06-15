const mongoose = require('mongoose');
const Product = require('../models/product.model');

const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find({
            isActive: true
        }).sort({
            category: 1,
            name: 1
        });
        res.json(products);
    } catch (error) {
        console.error("Error en getAllProducts:", error);
        res.status(500).json({
            message: 'Error al obtener productos'
        });
    }
};

// NOTA: Las siguientes son funciones de admin, pero las dejamos aquí por ahora
// para mantener la lógica de "productos" junta.
const createProduct = async (req, res) => {
    try {
        const {
            name,
            price,
            category,
            description,
            stock
        } = req.body;

        // Ahora la URL de la imagen viene de req.file, si es que se subió una.
        const imageUrl = req.file ? `/images/products/${req.file.filename}` : req.body.imageUrl || null;

        if (!name || price === undefined || !category) {
            return res.status(400).json({
                message: 'Nombre, precio y categoría requeridos.'
            });
        }
        const newProduct = new Product({
            name,
            price,
            category,
            description,
            stock: stock || 0,
            imageUrl
        });
        const savedProduct = await newProduct.save();
        res.status(201).json({
            success: true,
            message: 'Producto creado',
            product: savedProduct
        });
    } catch (error) {
        console.error("Error en createProduct:", error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(el => el.message);
            return res.status(400).json({
                message: 'Error de validación',
                errors
            });
        }
        res.status(500).json({
            message: 'Error al crear producto'
        });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: 'ID inválido'
            });
        }
        const deletedProduct = await Product.findByIdAndDelete(productId);
        if (!deletedProduct) {
            return res.status(404).json({
                message: 'Producto no encontrado'
            });
        }
        res.json({
            success: true,
            message: 'Producto eliminado',
            product: deletedProduct
        });
    } catch (error) {
        console.error("Error en deleteProduct:", error);
        res.status(500).json({
            message: 'Error al eliminar producto'
        });
    }
};

module.exports = {
    getAllProducts,
    createProduct,
    deleteProduct
};