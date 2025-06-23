const mongoose = require('mongoose');

// Esquema para el contador de pedidos
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;