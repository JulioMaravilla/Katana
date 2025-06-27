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
const Category = require('../models/category.model');
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
        // CORRECCIÓN: Leemos startDate y endDate en lugar de 'fecha'
        const { source, status, page = 1, limit = 1000, sort = '-createdAt', startDate, endDate } = req.query;
        let query = {};

        if (source) query.source = source;
        if (status && status !== 'all') query.status = status;

        // Si se proporcionan fechas de inicio y fin, las usamos para filtrar.
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lt: new Date(endDate) // Usamos 'less than' el día siguiente para incluir todo el día de fin.
            };
        }

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

/**
 * Obtiene un reporte de los productos más agregados a Favoritos por los usuarios.
 */
const getFavoritesReport = async (req, res) => {
    try {
        // 1. Obtener todos los usuarios y sus listas de favoritos.
        const users = await User.find({ favorites: { $exists: true, $not: { $size: 0 } } }).select('favorites');

        // 2. Contar la frecuencia de cada producto favorito.
        const favoritesCount = new Map();
        users.forEach(user => {
            user.favorites.forEach(productId => {
                const productIdStr = productId.toString();
                favoritesCount.set(productIdStr, (favoritesCount.get(productIdStr) || 0) + 1);
            });
        });

        if (favoritesCount.size === 0) {
            return res.json({ success: true, data: [] });
        }

        // 3. Obtener los detalles de los productos que están en la lista de favoritos.
        const productIds = Array.from(favoritesCount.keys());
        const products = await Product.find({ _id: { $in: productIds } });

        // 4. Combinar los datos y formatear la respuesta.
        const reportData = products.map(product => ({
            productId: product._id,
            name: product.name,
            category: product.category,
            imageUrl: product.imageUrl,
            timesFavorited: favoritesCount.get(product._id.toString()) || 0
        }));

        // 5. Ordenar por los más favoritados.
        reportData.sort((a, b) => b.timesFavorited - a.timesFavorited);

        res.json({ success: true, data: reportData });

    } catch (error) {
        console.error("Error en getFavoritesReport:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al generar el reporte.' });
    }
}

// --- INICIO DE LA NUEVA FUNCIÓN PARA EL PANEL DE ESTADO SEMANAL ---
const getWeeklyStatusMetrics = async (req, res) => {
    try {
        // Definir el rango de la semana actual (Domingo a Sábado)
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diffToSunday = today.getDate() - dayOfWeek;

        const startDate = new Date(today.setDate(diffToSunday));
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);

        // 1. Contar pedidos por estado usando una consulta de agregación
        const statusCounts = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const metrics = {
            pending: 0,
            processing: 0,
            shipped: 0, // 'shipped' se interpretará como 'Para Reparto'
            totalToCollect: 0
        };

        statusCounts.forEach(status => {
            if (metrics.hasOwnProperty(status._id)) {
                metrics[status._id] = status.count;
            }
        });

        // 2. Calcular el total a cobrar de los pedidos pendientes
        const pendingOrders = await Order.find({
            createdAt: { $gte: startDate, $lt: endDate },
            status: 'pending'
        });

        metrics.totalToCollect = pendingOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        res.json({ success: true, data: metrics });

    } catch (error) {
        console.error("Error en getWeeklyStatusMetrics:", error);
        res.status(500).json({ success: false, message: 'Error al calcular el estado semanal.' });
    }
};

const getWeeklyActivity = async (req, res) => {
    try {
        // 1. Definir el rango de la semana (sin cambios)
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diffToSunday = today.getDate() - dayOfWeek;
        const startDate = new Date(today.setDate(diffToSunday));
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);

        const weeklyOrders = await Order.find({
            createdAt: { $gte: startDate, $lt: endDate },
            status: { $nin: ['cancelled'] }
        }).populate('userId', 'nombre');

        // --- INICIO DE LA LÓGICA COMPLETA ---

        // 2. Calcular todas las métricas en un solo lugar
        const weeklyOrdersCount = weeklyOrders.length;
        const weeklyRevenue = weeklyOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        // Top Clientes (Incluye todos los tipos)
        const customerSpending = new Map();
        weeklyOrders.forEach(order => {
            let customerId, customerName;
            if (order.userId) {
                customerId = order.userId._id.toString();
                customerName = order.userId.nombre || 'Cliente Registrado';
            } else {
                customerName = `${order.deliveryDetails.nombre} ${order.isGuestOrder ? '(Invitado)' : '(Manual)'}`;
                customerId = `${customerName}_${order.deliveryDetails.telefono}`;
            }
            const currentSpending = customerSpending.get(customerId) || { name: customerName, total: 0 };
            customerSpending.set(customerId, { ...currentSpending, total: currentSpending.total + order.totalAmount });
        });
        const topCustomers = Array.from(customerSpending.values()).sort((a, b) => b.total - a.total).slice(0, 5);

        // Top Productos
        const productStats = new Map();
        weeklyOrders.forEach(order => { 
            order.items.forEach(item => { 
                const stats = productStats.get(item.name) || { name: item.name, quantity: 0, revenue: 0 }; 
                productStats.set(item.name, { ...stats, quantity: stats.quantity + item.quantity, revenue: stats.revenue + (item.quantity * item.price) });
            }); 
        });
        const topProducts = Array.from(productStats.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
        const topProduct = topProducts.length > 0 ? topProducts[0].name : 'N/A';

        // Origen de Pedidos (La parte que faltaba)
        const orderSource = { registered: 0, guest: 0, manual: 0 };
        weeklyOrders.forEach(order => {
            if (order.source === 'web_user') orderSource.registered++;
            else if (order.source === 'web_guest') orderSource.guest++;
            else if (order.source === 'admin_manual') orderSource.manual++;
        });

        // Crecimiento Semanal
        const weeklyCustomerIds = [...new Set(weeklyOrders.map(o => o.userId?._id.toString()).filter(id => id))];
        let newCustomers = 0;
        if (weeklyCustomerIds.length > 0) {
            const firstOrders = await Order.aggregate([ { $sort: { createdAt: 1 } }, { $group: { _id: "$userId", firstOrderDate: { $first: "$createdAt" } } }, { $match: { _id: { $in: weeklyCustomerIds.map(id => new mongoose.Types.ObjectId(id)) } } } ]);
            firstOrders.forEach(order => { if (order.firstOrderDate >= startDate) newCustomers++; });
        }

        // 3. Enviar la respuesta unificada completa
        res.json({
            success: true,
            data: {
                weeklyOrdersCount,
                weeklyRevenue,
                topProduct,
                topCustomers,
                topProducts,
                growth: { newCustomers, recurringCustomers: weeklyCustomerIds.length - newCustomers },
                orderSource
            }
        });

        // --- FIN DE LA LÓGICA COMPLETA ---

    } catch (error) {
        console.error("Error en getWeeklyActivity:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'El nombre de la categoría es requerido.' });
        }
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ success: false, message: 'Ya existe una categoría con ese nombre.' });
        }
        const newCategory = new Category({ name, description });
        await newCategory.save();
        res.status(201).json({ success: true, message: 'Categoría creada con éxito.', data: newCategory });
    } catch (error) {
        console.error("Error en createCategory:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

const getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error("Error en getCategories:", error);
        res.status(500).json({ success: false, message: 'Error al obtener las categorías.' });
    }
};

const updateCategoryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ success: false, message: 'El estado "isActive" debe ser un valor booleano.' });
        }

        const category = await Category.findByIdAndUpdate(id, { isActive }, { new: true });

        if (!category) {
            return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
        }

        res.json({ success: true, message: `El estado de la categoría "${category.name}" ha sido actualizado.`, data: category });
    } catch (error) {
        console.error("Error en updateCategoryStatus:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

/**
 * Actualiza el nombre y/o la descripción de una categoría específica.
 */
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'El nombre de la categoría no puede estar vacío.' });
        }

        const categoryToUpdate = await Category.findById(id);
        if (!categoryToUpdate) {
            return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
        }

        // Verificar si el nuevo nombre ya existe en otra categoría
        const existingCategory = await Category.findOne({ name, _id: { $ne: id } });
        if (existingCategory) {
            return res.status(400).json({ success: false, message: 'Ya existe otra categoría con ese nombre.' });
        }

        categoryToUpdate.name = name;
        categoryToUpdate.description = description;

        const updatedCategory = await categoryToUpdate.save();

        res.json({ success: true, message: 'Categoría actualizada con éxito.', data: updatedCategory });
    } catch (error) {
        console.error("Error en updateCategory:", error);
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
    getReportMetrics,
    getSalesChartData,
    getCategoryChartData,
    getCustomerReport,
    getProductReport,
    getManualOrders,
    getFavoritesReport,
    getWeeklyStatusMetrics,
    getWeeklyActivity,
    createCategory,
    getCategories,
    updateCategoryStatus,
    updateCategory
};