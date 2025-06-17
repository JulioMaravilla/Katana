const dotenv = require('dotenv');
const path = require('path');

// La ruta sube dos niveles desde /config para encontrar el archivo .env en la raíz del proyecto.
// Esta configuración es robusta y funcionará sin importar desde donde se inicie el servidor.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });