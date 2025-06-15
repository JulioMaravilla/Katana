const CarouselImage = require('../models/carouselImage.model');

const getCarouselImages = async (req, res) => {
    try {
        const images = await CarouselImage.find().sort({ order: 1, createdAt: -1 });
        res.json({ success: true, data: images });
    } catch (error) {
        console.error("Error en getCarouselImages:", error);
        res.status(500).json({ success: false, message: 'Error al obtener imágenes del carrusel.' });
    }
};

module.exports = {
    getCarouselImages
};