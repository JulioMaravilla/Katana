const mongoose = require('mongoose');

// Modelo para Imágenes del Carrusel
const carouselImageSchema = new mongoose.Schema({
    imageUrl: { type: String, required: true },
    filename: { type: String, required: true },
    title: { type: String },
    order: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const CarouselImage = mongoose.model('CarouselImage', carouselImageSchema);

module.exports = CarouselImage;