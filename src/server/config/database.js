const mongoose = require('mongoose');
// Importamos el modelo Counter que creamos antes
const Counter = require('../models/counter.model');

// Esta función se encarga de asegurar que el contador para los IDs de pedido exista.
async function initializeCounters() {
    try {
        const orderIdCounter = await Counter.findById('orderId');
        if (!orderIdCounter) {
            await Counter.create({ _id: 'orderId', seq: 0 });
            console.log("Contador 'orderId' inicializado en la base de datos.");
        } else {
            console.log(`Contador 'orderId' ya existe con valor: ${orderIdCounter.seq}`);
        }
    } catch (error) {
        console.error("Error inicializando el contador 'orderId':", error);
        // En un entorno de producción, podrías querer terminar el proceso si la DB no funciona
        process.exit(1); 
    }
}

// Esta es la función principal de conexión
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://raanndomlz:jXXYYC69QRzm1sqc@katanasushi.dbvpk8h.mongodb.net/katana_sushi');
        console.log("MongoDB conectado exitosamente.");
        
        // Una vez conectados, inicializamos los contadores
        await initializeCounters();

    } catch (err) {
        console.error("Error de conexión MongoDB:", err);
        // Si no se puede conectar a la base de datos, terminamos el proceso de la aplicación
        process.exit(1);
    }
};

module.exports = connectDB;