const cron = require('node-cron');
const Order = require('../models/order.model');

const CRON_TIMEZONE = "America/El_Salvador";

const startCronJobs = () => {
    console.log("Inicializando tareas programadas (cron jobs)...");

    // Tarea 1: Sábado a las 8:00 AM - Cambiar pedidos pendientes a "En preparación"
    cron.schedule('0 8 * * 6', async () => {
        const taskName = 'CAMBIAR_A_EN_PREPARACION';
        console.log(`[${new Date().toLocaleString()}] Iniciando tarea cron: ${taskName}`);
        try {
            const filter = {
                status: 'pending',
                source: { $in: ['web_guest', 'web_user'] }
            };
            const update = { $set: { status: 'processing' } };
            const result = await Order.updateMany(filter, update);
            console.log(`[${taskName}] ${result.modifiedCount} pedidos actualizados a "processing". Matched: ${result.matchedCount}`);
        } catch (error) {
            console.error(`[${taskName}] Error en la tarea cron:`, error);
        }
    }, { scheduled: true, timezone: CRON_TIMEZONE });

    // Tarea 2: Sábado a las 5:00 PM (17:00) - Cambiar pedidos "En preparación" a "En camino"
    cron.schedule('0 17 * * 6', async () => {
        const taskName = 'CAMBIAR_A_EN_CAMINO';
        console.log(`[${new Date().toLocaleString()}] Iniciando tarea cron: ${taskName}`);
        try {
            const filter = {
                status: 'processing',
                source: { $in: ['web_guest', 'web_user'] }
            };
            const update = { $set: { status: 'shipped' } };
            const result = await Order.updateMany(filter, update);
            console.log(`[${taskName}] ${result.modifiedCount} pedidos actualizados a "shipped". Matched: ${result.matchedCount}`);
        } catch (error) {
            console.error(`[${taskName}] Error en la tarea cron:`, error);
        }
    }, { scheduled: true, timezone: CRON_TIMEZONE });

    console.log("Tareas programadas configuradas y en ejecución.");
};

module.exports = {
    startCronJobs
};