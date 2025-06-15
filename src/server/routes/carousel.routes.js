const express = require('express');
const router = express.Router();
const { getCarouselImages } = require('../controllers/carousel.controller');

// Ruta para obtener las imágenes del carrusel
router.get('/images', getCarouselImages);

module.exports = router;