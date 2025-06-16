// 1. Cargar Variables de Entorno (¡siempre primero!)
require('./config/environment');

// 2. Importar Módulos Esenciales
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');

// 3. Importar Módulos de Nuestra Aplicación
const connectDB = require('./config/database');
const { startCronJobs } = require('./services/cron.service');
const mainApiRouter = require('./routes'); // Importa el enrutador principal desde routes/index.js

// --- Inicialización de la Aplicación ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware Esenciales ---
app.use(helmet()); // Agregar seguridad básica
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Servir Archivos Estáticos ---
// Sirve la carpeta 'public' completa en la raíz
app.use(express.static(path.join(__dirname, '../../public')));
// Define rutas específicas para mayor claridad (opcional pero recomendado)
app.use('/public', express.static(path.join(__dirname, '../../public')));
app.use('/js', express.static(path.join(__dirname, '../../public/js')));
app.use('/css', express.static(path.join(__dirname, '../../public/css')));
app.use('/images', express.static(path.join(__dirname, '../../public/images')));

// --- Rutas de la API ---
// Todas las rutas definidas en la carpeta /routes estarán bajo el prefijo /api
app.use('/api', mainApiRouter);

// --- Rutas para Servir Vistas HTML ---
// Sirve el archivo principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../index.html'));
});

// Sirve el panel de administración
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/admin-dashboard.html'));
});

// Sirve las páginas de políticas
app.get('/cookies', (req, res) => {
    res.sendFile(path.join(__dirname, '../politicas-cookies.html'));
});

app.get('/politicas-privacidad', (req, res) => {
    res.sendFile(path.join(__dirname, '../politicas-privacidad.html'));
});

// Sirve vistas específicas como login, registro y dashboard de cliente
app.get('/:viewName', (req, res, next) => {
    const viewName = req.params.viewName;
    const allowedViews = ['login', 'registro', 'dashboard', 'admin-dashboard'];
    const fileExtension = '.html';

    if (allowedViews.includes(viewName)) {
        let filePath = viewName === 'admin-dashboard'
            ? path.join(__dirname, '../../public', viewName + fileExtension)
            : path.join(__dirname, '../views', viewName + fileExtension);
        
        res.sendFile(filePath, (err) => {
            if (err) {
                console.error(`Error sirviendo ${filePath}:`, err.status);
                if (err.status === 404) {
                    res.status(404).send(`Vista "${viewName}" no encontrada.`);
                } else {
                    next(err);
                }
            }
        });
    } else {
        // Si no es una de las vistas permitidas, pasa al siguiente middleware (manejo de 404)
        next();
    }
});

// --- Manejo de Errores Global ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: {
            message: process.env.NODE_ENV === 'production' 
                ? 'Ha ocurrido un error en el servidor' 
                : err.message,
            status: err.status || 500
        }
    });
});

// --- Manejo de Rutas No Encontradas ---
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: 'Ruta no encontrada',
            status: 404
        }
    });
});

// --- Función de Arranque del Servidor ---
const startServer = async () => {
    try {
        // 1. Conectar a la base de datos
        await connectDB();

        // 2. Iniciar las tareas programadas
        startCronJobs();

        // 3. Poner el servidor a escuchar peticiones
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
            console.log(`También accesible en:`);
            console.log(`- http://[tu-ip-local]:${PORT}`);
            console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
        });

        // Manejo de errores no capturados
        process.on('uncaughtException', (error) => {
            console.error('Error no capturado:', error);
            server.close(() => process.exit(1));
        });

        process.on('unhandledRejection', (error) => {
            console.error('Promesa rechazada no manejada:', error);
            server.close(() => process.exit(1));
        });

    } catch (error) {
        console.error("No se pudo iniciar el servidor:", error);
        process.exit(1);
    }
};

// Iniciar la aplicación
startServer();