const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Models
const AdminUser = require('../models/adminUser.model');
const User = require('../models/user.model');
const Order = require('../models/order.model');
const CarouselImage = require('../models/carouselImage.model');
const Product = require('../models/product.model');
const { notificarNuevoPedido } = require('../services/email.service');


// --- Controladores de Admin ---
const loginAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'Usuario y contraseña requeridos.' });
        const admin = await AdminUser.findOne({ username });
        if (!admin) return res.status(401).json({ message: 'Credenciales inválidas.' });
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas.' });
        const adminToken = jwt.sign(
            { adminId: admin._id, role: admin.role },
            process.env.ADMIN_JWT_SECRET || 'tu_admin_jwt_secret',
            { expiresIn: '8h' }
        );
        res.json({
            success: true,
            message: 'Login admin exitoso.',
            token: adminToken,
            admin: { id: admin._id, username: admin.username, role: admin.role, fullName: admin.fullName }
        });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Error interno.' }); }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json({ success: true, data: users });
    } catch (error) {
        console.error("Error en getAllUsers:", error);
        res.status(500).json({ success: false, message: 'Error al obtener usuarios.' });
    }
};

const getAllOrders = async (req, res) => {
    try {
        const { source, status, page = 1, limit = 1000, sort = '-createdAt' } = req.query;
        let query = {};
        if (source) query.source = source;
        if (status && status !== 'all') query.status = status;

        const options = {
            sort: sort,
            limit: parseInt(limit),
            skip: (parseInt(page) - 1) * parseInt(limit),
            populate: { path: 'userId', select: 'nombre email' }
        };

        const orders = await Order.find(query, null, options);
        const totalOrders = await Order.countDocuments(query);

        res.json({
            success: true,
            data: orders,
            totalPages: Math.ceil(totalOrders / parseInt(limit)),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error("Error en getAllOrders:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener pedidos.' });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: 'ID de pedido inválido.' });
        }
        const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Estado de pedido inválido.' });
        }
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId, { status: status }, { new: true, runValidators: true }
        ).populate('userId', 'nombre email');
        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
        }
        res.json({ success: true, message: `Estado del pedido ${updatedOrder.orderId} actualizado a ${status}.`, data: updatedOrder });
    } catch (error) {
        console.error("Error en updateOrderStatus:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar el estado.' });
    }
};

const getAdminProfile = async (req, res) => {
    try {
        const admin = await AdminUser.findById(req.adminId).select('-password');
        if (!admin) return res.status(404).json({ success: false, message: 'Administrador no encontrado.' });
        res.json({ success: true, data: admin });
    } catch (error) {
        console.error('Error en getAdminProfile:', error);
        res.status(500).json({ success: false, message: 'Error al obtener perfil.' });
    }
};

const updateAdminProfile = async (req, res) => {
    try {
        const { fullName, email, phone } = req.body;
        const admin = await AdminUser.findById(req.adminId);
        if (!admin) return res.status(404).json({ success: false, message: 'Administrador no encontrado.' });
        if (fullName) admin.fullName = fullName;
        if (email) admin.email = email;
        if (phone) admin.phone = phone;
        await admin.save();
        const updatedAdmin = await AdminUser.findById(req.adminId).select('-password');
        res.json({ success: true, message: 'Perfil actualizado correctamente.', data: updatedAdmin });
    } catch (error) {
        console.error('Error en updateAdminProfile:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar perfil.' });
    }
};

const changeAdminPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const admin = await AdminUser.findById(req.adminId);
        if (!admin) return res.status(404).json({ success: false, message: 'Administrador no encontrado.' });
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta.' });
        admin.password = newPassword; // El hook pre-save se encarga del hash
        await admin.save();
        res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('Error en changeAdminPassword:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar contraseña.' });
    }
};

const uploadAdminAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se proporcionó ninguna imagen.' });
        }
        const admin = await AdminUser.findById(req.adminId);
        if (!admin) {
            fs.unlinkSync(req.file.path); // Eliminar archivo subido si el admin no existe
            return res.status(404).json({ success: false, message: 'Administrador no encontrado.' });
        }
        if (admin.avatar && admin.avatar.filename) {
            const oldAvatarPath = path.join(__dirname, '../../../public/images/avatars', admin.avatar.filename);
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
            }
        }
        admin.avatar = { contentType: req.file.mimetype, filename: req.file.filename };
        await admin.save();
        res.json({
            success: true,
            message: 'Avatar actualizado correctamente.',
            avatarPath: `/images/avatars/${req.file.filename}`
        });
    } catch (error) {
        console.error('Error en uploadAdminAvatar:', error);
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: 'Error al actualizar avatar.' });
    }
};

const getAdminAvatar = async (req, res) => {
    try {
        const admin = await AdminUser.findById(req.params.adminId);
        if (!admin || !admin.avatar || !admin.avatar.filename) {
            return res.redirect('/images/admin-avatar.jpg');
        }
        const avatarPath = path.join(__dirname, '../../../public/images/avatars', admin.avatar.filename);
        res.sendFile(avatarPath, (err) => {
            if (err) {
                console.error('Error sirviendo avatar desde disco:', err);
                res.redirect('/images/admin-avatar.jpg');
            }
        });
    } catch (error) {
        console.error('Error al servir avatar:', error);
        res.status(500).send('Error al cargar la imagen');
    }
};

const createManualOrder = async (req, res) => {
    try {
        const { deliveryDetails, items, totalAmount, shippingCost, status, source } = req.body;
        // Validación de datos...
        const newOrder = new Order({
            userId: null,
            items: items.map(item => ({
                productId: item.productId,
                quantity: parseInt(item.quantity, 10),
                price: parseFloat(item.price),
                name: item.name,
                image: item.image || null
            })),
            totalAmount: parseFloat(totalAmount),
            shippingCost: parseFloat(shippingCost),
            status: status || 'processing',
            deliveryDetails,
            isGuestOrder: true,
            source: source || 'admin_manual',
        });
        const savedOrder = await newOrder.save();
        try {
            await notificarNuevoPedido(savedOrder);
        } catch (emailError) {
            console.error("Error enviando correo de notificación para pedido manual:", emailError);
        }
        res.status(201).json({ success: true, message: 'Pedido manual registrado con éxito.', data: savedOrder });
    } catch (error) {
        console.error("Error registrando pedido manual:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

const uploadCarouselImage = async (req, res) => {
     try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se proporcionó ninguna imagen.' });
        }
        const imageUrl = `/images/carousel/${req.file.filename}`;
        const newCarouselImage = new CarouselImage({
            imageUrl: imageUrl,
            filename: req.file.filename,
            title: req.body.title || ''
        });
        await newCarouselImage.save();
        res.status(201).json({ success: true, message: 'Imagen del carrusel agregada.', data: newCarouselImage });
    } catch (error) {
        console.error("Error al agregar imagen al carrusel:", error);
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Error al eliminar archivo subido tras fallo:", err);
            });
        }
        res.status(500).json({ success: false, message: 'Error al agregar imagen al carrusel.' });
    }
};

const deleteCarouselImage = async (req, res) => {
    try {
        const imageId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(imageId)) {
            return res.status(400).json({ success: false, message: 'ID de imagen inválido.' });
        }
        const currentImageCount = await CarouselImage.countDocuments();
        if (currentImageCount <= 3) {
            return res.status(400).json({ success: false, message: 'No se puede eliminar. Se requiere un mínimo de 3 imágenes.' });
        }
        const imageToDelete = await CarouselImage.findByIdAndDelete(imageId);
        if (!imageToDelete) {
            return res.status(404).json({ success: false, message: 'Imagen no encontrada.' });
        }
        const imagePath = path.join(__dirname, '../../../public/images/carousel', imageToDelete.filename);
        fs.unlink(imagePath, (err) => {
            if (err) console.warn(`Error al eliminar el archivo ${imageToDelete.filename}:`, err.message);
        });
        res.json({ success: true, message: 'Imagen del carrusel eliminada.' });
    } catch (error) {
        console.error("Error al eliminar imagen del carrusel:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// --- Controladores para Reportes ---
const getReportMetrics = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalCustomers = await User.countDocuments({ role: 'cliente' });
        const revenueData = await Order.aggregate([
            { $match: { status: { $nin: ['cancelled', 'pending'] } } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
        const topProductData = await Order.aggregate([
            { $match: { status: { $nin: ['cancelled', 'pending'] } } },
            { $unwind: '$items' },
            { $group: { _id: '$items.name', totalSold: { $sum: '$items.quantity' } } },
            { $sort: { totalSold: -1 } },
            { $limit: 1 }
        ]);
        const topProduct = topProductData.length > 0 ? topProductData[0]._id : 'N/A';
        res.json({ success: true, data: { totalOrders, totalCustomers, totalRevenue, topProduct } });
    } catch (error) {
        console.error("Error fetching admin report metrics:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

const getSalesChartData = async (req, res) => {
    try {
        const { startDate: startDateStr, endDate: endDateStr } = req.query;
        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        endDate.setHours(23, 59, 59, 999);
        let startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().setDate(endDate.getDate() - 30));
        startDate.setHours(0, 0, 0, 0);
        
        const dateRangeInDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
        const timezone = "America/El_Salvador";
        let groupFormat, labelFormatOptions;

        if (dateRangeInDays <= 1) {
            groupFormat = { $dateToString: { format: "%Y-%m-%dT%H:00:00", date: "$createdAt", timezone } };
            labelFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
        } else if (dateRangeInDays <= 90) {
            groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone } };
            labelFormatOptions = { month: 'short', day: 'numeric' };
        } else {
            groupFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone } };
            labelFormatOptions = { year: 'numeric', month: 'long' };
        }

        const salesData = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate }, status: { $nin: ['cancelled', 'pending'] } } },
            { $group: { _id: groupFormat, totalRevenue: { $sum: "$totalAmount" } } },
            { $sort: { _id: 1 } }
        ]);
        
        const labels = salesData.map(d => new Date(d._id).toLocaleDateString('es-ES', labelFormatOptions));
        const values = salesData.map(d => d.totalRevenue);
        const chartTitle = `Ventas del ${startDate.toLocaleDateString('es-ES')} al ${endDate.toLocaleDateString('es-ES')}`;

        res.json({ success: true, data: { labels, values, title: chartTitle } });
    } catch (error) {
        console.error("Error fetching sales chart data:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

const getCategoryChartData = async (req, res) => {
    try {
        const categoryData = await Order.aggregate([
            { $match: { status: { $nin: ['cancelled', 'pending'] } } },
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'productInfo' } },
            { $unwind: '$productInfo' },
            { $group: { _id: '$productInfo.category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        const labels = categoryData.map(d => d._id);
        const values = categoryData.map(d => d.count);
        res.json({ success: true, data: { labels, values } });
    } catch (error) {
        console.error("Error fetching category chart data:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

const getCustomerReport = async (req, res) => {
    try {
        const sortBy = req.query.sort || '-totalSpent';
        const customerData = await Order.aggregate([
            { $match: { status: { $nin: ['cancelled', 'pending'] }, userId: { $ne: null } } },
            { $group: { _id: '$userId', totalSpent: { $sum: '$totalAmount' }, orderCount: { $sum: 1 }, lastOrderDate: { $max: '$createdAt' } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'customerInfo' } },
            { $unwind: '$customerInfo' },
            { $project: { _id: 0, userId: '$_id', name: '$customerInfo.nombre', email: '$customerInfo.email', totalSpent: '$totalSpent', orderCount: '$orderCount', lastOrderDate: '$lastOrderDate' } },
            { $sort: (sortBy === 'orderCount' ? { orderCount: -1 } : { totalSpent: -1 }) }
        ]);
        res.json({ success: true, data: customerData });
    } catch (error) {
        console.error("Error fetching customer report data:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

const getProductReport = async (req, res) => {
    try {
        const sortBy = req.query.sort || '-unitsSold';
        const productData = await Order.aggregate([
            { $match: { status: { $nin: ['cancelled', 'pending'] } } },
            { $unwind: '$items' },
            { $group: { _id: '$items.productId', unitsSold: { $sum: '$items.quantity' }, totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } } } },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productDetails' } },
            { $unwind: '$productDetails' },
            { $project: { _id: 0, productId: '$_id', name: '$productDetails.name', category: '$productDetails.category', stock: '$productDetails.stock', unitsSold: '$unitsSold', totalRevenue: '$totalRevenue' } },
            { $sort: (sortBy === 'totalRevenue' ? { totalRevenue: -1 } : { unitsSold: -1 }) }
        ]);
        res.json({ success: true, data: productData });
    } catch (error) {
        console.error("Error fetching product report data:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// Obtener solo pedidos manuales
const getManualOrders = async (req, res) => {
    try {
        const manualOrders = await Order.find({ source: 'admin_manual' }).sort({ createdAt: -1 });
        res.json({ success: true, data: manualOrders });
    } catch (error) {
        console.error("Error al obtener pedidos manuales:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

module.exports = {
    loginAdmin,
    getAllUsers,
    getAllOrders,
    updateOrderStatus,
    getAdminProfile,
    updateAdminProfile,
    changeAdminPassword,
    uploadAdminAvatar,
    getAdminAvatar,
    createManualOrder,
    uploadCarouselImage,
    deleteCarouselImage,
    // Controladores de reportes
    getReportMetrics,
    getSalesChartData,
    getCategoryChartData,
    getCustomerReport,
    getProductReport,
    // Obtener pedidos manuales
    getManualOrders
};