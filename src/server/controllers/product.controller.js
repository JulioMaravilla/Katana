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

const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
        }
        res.json({ success: true, data: product });
    } catch (error) {
        console.error("Error en getProductById:", error);
        res.status(500).json({ success: false, message: 'Error al obtener el producto.' });
    }
};

const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'ID de producto inválido' });
        }

        const updateData = { ...req.body };

        // Si se sube un nuevo archivo, actualizamos la URL de la imagen
        if (req.file) {
            updateData.imageUrl = `/images/products/${req.file.filename}`;
            // Aquí podrías añadir lógica para borrar la imagen anterior del servidor si es necesario
        }

        const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { new: true, runValidators: true });

        if (!updatedProduct) {
            return res.status(404).json({ message: 'Producto no encontrado para actualizar' });
        }
        res.json({ success: true, message: 'Producto actualizado con éxito', data: updatedProduct });
    } catch (error) {
        console.error("Error en updateProduct:", error);
        res.status(500).json({ message: 'Error al actualizar el producto' });
    }
};

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
    getProductById,
    updateProduct,
    createProduct,
    deleteProduct
};