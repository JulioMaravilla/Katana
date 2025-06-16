// src/server/models/order.model.js (CORREGIDO)

const mongoose = require('mongoose');
// Importamos el modelo Counter en lugar de volver a definirlo
const Counter = require('./counter.model'); 

// Sub-esquema para los ítems dentro de un pedido
const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    name: { type: String, required: true },
    image: { type: String }
}, { _id: false });

// Sub-esquema para los detalles de entrega
const deliveryDetailsSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    telefono: { type: String, required: true },
    direccion: { type: String, required: true },
    zona: { type: String, required: true },
    referencia: { type: String }
}, { _id: false });

// Esquema principal del pedido
const orderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    status: { type: String, default: 'pending', enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
    deliveryDetails: deliveryDetailsSchema,
    paymentMethod: { type: String, default: 'contra_entrega' },
    isGuestOrder: { type: Boolean, default: false },
    clientRequestId: { type: String, unique: true, sparse: true },
    source: { type: String, enum: ['web_guest', 'web_user', 'admin_manual'], default: 'web_user' },
    createdAt: { type: Date, default: Date.now }
});

// Hook para generar un ID de pedido secuencial y legible antes de guardar
orderSchema.pre('save', async function(next) {
    if (this.isNew && !this.orderId) {
        try {
            // Usamos el modelo Counter importado
            const sequenceDocument = await Counter.findByIdAndUpdate(
                'orderId',
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            if (!sequenceDocument) {
                throw new Error("Contador 'orderId' no encontrado.");
            }
            this.orderId = `KS-${sequenceDocument.seq.toString().padStart(4, '0')}`;
            console.log(`Hook pre-save: OrderId generado usando contador: ${this.orderId}`);
            next();
        } catch (error) {
            console.error("Error generando orderId desde el contador:", error);
            next(error);
        }
    } else {
        next();
    }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;