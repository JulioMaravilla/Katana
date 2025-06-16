const Order = require('../models/order.model');
const Product = require('../models/product.model');
const {
    notificarNuevoPedido
} = require('../services/email.service');

const createGuestOrder = async (req, res) => {
    try {
        const {
            items,
            deliveryDetails,
            clientRequestId,
            shippingCost,
            totalAmount: totalAmountFromClient
        } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0 || !deliveryDetails) {
            return res.status(400).json({
                success: false,
                message: 'Datos del pedido incompletos o inválidos.'
            });
        }
        if (clientRequestId) {
            const existing = await Order.findOne({
                clientRequestId
            });
            if (existing) {
                return res.status(200).json({
                    success: true,
                    message: 'Pedido ya registrado.',
                    data: {
                        orderId: existing.orderId
                    }
                });
            }
        }
        const productIds = items.map(item => item.productId);
        const productsInDB = await Product.find({
            _id: {
                $in: productIds
            },
            isActive: true
        });
        if (productsInDB.length !== productIds.length) {
            return res.status(400).json({
                success: false,
                message: 'Algunos productos no están disponibles.'
            });
        }
        let calculatedSubtotal = 0;
        const processedItems = items.map(item => {
            const product = productsInDB.find(p => p._id.toString() === item.productId);
            const itemTotal = product.price * item.quantity;
            calculatedSubtotal += itemTotal;
            return {
                productId: product._id,
                quantity: item.quantity,
                price: product.price,
                name: product.name,
                image: product.imageUrl
            };
        });

        const finalShippingCost = shippingCost !== undefined ? parseFloat(shippingCost) : 0;
        const finalTotalAmount = totalAmountFromClient !== undefined ? parseFloat(totalAmountFromClient) : (calculatedSubtotal + finalShippingCost);

        const newOrder = new Order({
            userId: null,
            items: processedItems,
            totalAmount: finalTotalAmount,
            shippingCost: finalShippingCost,
            status: 'pending',
            deliveryDetails,
            isGuestOrder: true,
            clientRequestId,
            source: 'web_guest'
        });
        const savedOrder = await newOrder.save();
        try {
            await notificarNuevoPedido(savedOrder);
        } catch (error) {
            console.error("Error enviando correo de notificación:", error);
        }
        res.status(201).json({
            success: true,
            message: 'Pedido realizado con éxito.',
            data: {
                orderId: savedOrder.orderId
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Pedido duplicado detectado.'
            });
        }
        console.error("Error en createGuestOrder:", error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor.'
        });
    }
};

const createAuthenticatedOrder = async (req, res) => {
    try {
        const {
            items,
            deliveryDetails,
            paymentMethod,
            clientRequestId,
            shippingCost,
            totalAmount: totalAmountFromClient
        } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0 || !deliveryDetails) {
            return res.status(400).json({
                success: false,
                message: 'Datos del pedido incompletos.'
            });
        }
        // ... (resto de la lógica que ya estaba en la ruta)
        const productIds = items.map(item => item.productId);
        const productsInDB = await Product.find({
            _id: {
                $in: productIds
            },
            isActive: true
        });
        if (productsInDB.length !== productIds.length) {
            return res.status(400).json({
                success: false,
                message: 'Algunos productos no están disponibles.'
            });
        }
        let calculatedSubtotal = 0;
        const processedItems = items.map(item => {
            const product = productsInDB.find(p => p._id.toString() === item.productId);
            calculatedSubtotal += product.price * item.quantity;
            return {
                productId: product._id,
                quantity: item.quantity,
                price: product.price,
                name: product.name,
                image: product.imageUrl
            };
        });

        const finalShippingCost = shippingCost !== undefined ? parseFloat(shippingCost) : 0;
        const finalTotalAmount = totalAmountFromClient !== undefined ? parseFloat(totalAmountFromClient) : (calculatedSubtotal + finalShippingCost);

        const newOrder = new Order({
            userId: req.userId,
            items: processedItems,
            totalAmount: finalTotalAmount,
            shippingCost: finalShippingCost,
            status: 'pending',
            deliveryDetails,
            paymentMethod: paymentMethod || 'contra_entrega',
            isGuestOrder: false,
            clientRequestId,
            source: 'web_user'
        });
        const savedOrder = await newOrder.save();
        try {
            await notificarNuevoPedido(savedOrder);
        } catch (error) {
            console.error("Error enviando correo de notificación:", error);
        }
        res.status(201).json({
            success: true,
            message: 'Pedido realizado con éxito.',
            data: {
                orderId: savedOrder.orderId
            }
        });
    } catch (error) {
        console.error("Error en createAuthenticatedOrder:", error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor.'
        });
    }
};

const getUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            userId: req.userId
        }).sort({
            createdAt: -1
        });
        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error("Error en getUserOrders:", error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor.'
        });
    }
};

module.exports = {
    createGuestOrder,
    createAuthenticatedOrder,
    getUserOrders
};