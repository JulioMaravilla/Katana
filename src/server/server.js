// 1. Cargar Variables de Entorno (¡siempre primero!)
require('./config/environment');

// 2. Importar Módulos Esenciales
const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const fs = require('fs');

// 3. Importar Módulos de Nuestra Aplicación
const connectDB = require('./config/database');
const { startCronJobs } = require('./services/cron.service');
const mainApiRouter = require('./routes'); // Importa el enrutador principal desde routes/index.js

// --- Inicialización de la Aplicación ---
const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// --- Middleware Esenciales ---
app.use(cors());
app.use(express.json());

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

// --- Configuración de Certificados SSL/TLS ---
const getSSLOptions = () => {
    const certPath = process.env.SSL_CERT_PATH;
    const keyPath = process.env.SSL_KEY_PATH;
    
    // Si las rutas de certificados están definidas en las variables de entorno
    if (certPath && keyPath) {
        try {
            return {
                cert: fs.readFileSync(certPath),
                key: fs.readFileSync(keyPath)
            };
        } catch (error) {
            console.warn('No se pudieron cargar los certificados SSL desde las rutas especificadas:', error.message);
            console.log('El servidor HTTPS no se iniciará hasta que instales los certificados.');
            return null;
        }
    }
    
    // Si no hay rutas definidas, intentar usar certificados por defecto
    const defaultCertPath = path.join(__dirname, 'ssl', 'cert.pem');
    const defaultKeyPath = path.join(__dirname, 'ssl', 'key.pem');
    
    try {
        if (fs.existsSync(defaultCertPath) && fs.existsSync(defaultKeyPath)) {
            return {
                cert: fs.readFileSync(defaultCertPath),
                key: fs.readFileSync(defaultKeyPath)
            };
        }
    } catch (error) {
        console.warn('No se encontraron certificados SSL por defecto:', error.message);
    }
    
    return null;
};

// --- Función de Arranque del Servidor ---
const startServer = async () => {
    try {
        // 1. Conectar a la base de datos
        await connectDB();

        // 2. Iniciar las tareas programadas
        startCronJobs();

        // 3. Configurar y iniciar servidor HTTPS
        const sslOptions = getSSLOptions();
        
        if (sslOptions) {
            // Crear servidor HTTPS
            const httpsServer = https.createServer(sslOptions, app);
            
            httpsServer.listen(HTTPS_PORT, () => {
                console.log(`🚀 Servidor HTTPS corriendo en https://localhost:${HTTPS_PORT}`);
                console.log(`📱 Aplicación disponible en https://localhost:${HTTPS_PORT}`);
                console.log(`🔧 Panel de administración en https://localhost:${HTTPS_PORT}/admin`);
            });
        } else {
            console.log('⚠️  No se encontraron certificados SSL/TLS.');
            console.log('📋 Para habilitar HTTPS, necesitas:');
            console.log('   1. Instalar certificados SSL en el servidor');
            console.log('   2. Configurar las variables de entorno SSL_CERT_PATH y SSL_KEY_PATH');
            console.log('   3. O colocar los certificados en src/server/ssl/cert.pem y src/server/ssl/key.pem');
            console.log('');
            console.log('🔄 Iniciando servidor HTTP por ahora...');
            
            // Iniciar servidor HTTP como fallback
            app.listen(PORT, () => {
                console.log(`🌐 Servidor HTTP corriendo en http://localhost:${PORT}`);
                console.log(`📱 Aplicación disponible en http://localhost:${PORT}`);
                console.log(`🔧 Panel de administración en http://localhost:${PORT}/admin`);
            });
        }
    } catch (error) {
        console.error("❌ No se pudo iniciar el servidor.", error);
        process.exit(1);
    }
};

// Iniciar la aplicación
startServer();