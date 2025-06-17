const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de Multer para avatares de Admin
const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dest = path.join(__dirname, '../../../public/images/avatars');
        fs.mkdirSync(dest, { recursive: true }); // Asegura que el directorio exista
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return cb(new Error('Solo se permiten archivos de imagen (jpg, jpeg, png, gif)!'), false);
        }
        cb(null, true);
    }
});

// Configuración de Multer para imágenes del Carrusel
const carouselStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dest = path.join(__dirname, '../../../public/images/carousel');
        fs.mkdirSync(dest, { recursive: true }); // Asegura que el directorio exista
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'carousel-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const carouselUpload = multer({
    storage: carouselStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return cb(new Error('Solo se permiten archivos de imagen (jpg, jpeg, png, gif)!'), false);
        }
        cb(null, true);
    }
});

// --- Configuración de Multer para Imágenes de Productos ---
const productStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dest = path.join(__dirname, '../../../public/images/products'); // Nueva carpeta
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const productUpload = multer({
    storage: productStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) { // Añadimos webp
            return cb(new Error('Solo se permiten archivos de imagen!'), false);
        }
        cb(null, true);
    }
});

module.exports = {
    avatarUpload,
    carouselUpload,
    productUpload
};