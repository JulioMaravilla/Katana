const mongoose = require('mongoose');

// Product Schema
const productSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'El nombre del producto es requerido'] },
    price: { type: Number, required: [true, 'El precio es requerido'], min: [0, 'El precio no puede ser negativo'] },
    category: { type: String, required: [true, 'La categoría es requerida'], trim: true },
    description: { type: String, trim: true },
    stock: { type: Number, default: 0, min: [0, 'El stock no puede ser negativo'] },
    imageUrl: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;