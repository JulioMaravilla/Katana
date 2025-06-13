const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs'); // Importar el módulo fs para manejar archivos
const nodemailer = require('nodemailer');
const cron = require('node-cron');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Servir Archivos Estáticos ---
app.use(express.static(path.join(__dirname, '../../public')));
app.use('/public', express.static(path.join(__dirname, '../../public')));
app.use('/views', express.static(path.join(__dirname, '../views')));
app.use('/js', express.static(path.join(__dirname, '../../public/js')));
app.use('/css', express.static(path.join(__dirname, '../../public/css')));
app.use('/images', express.static(path.join(__dirname, '../../public/images')));
app.use('/images/avatars', express.static(path.join(__dirname, '../../public/images/avatars'))); // Ruta para avatares de admin
app.use('/images/carousel', express.static(path.join(__dirname, '../../public/images/carousel'))); // NUEVA RUTA: para imágenes del carrusel

// --- Configuración de Multer para Avatares de Admin ---
const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dest = path.join(__dirname, '../../public/images/avatars');
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

// --- NUEVA Configuración de Multer para Imágenes del Carrusel ---
const carouselStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dest = path.join(__dirname, '../../public/images/carousel');
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
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) { // Case insensitive match
            return cb(new Error('Solo se permiten archivos de imagen (jpg, jpeg, png, gif)!'), false);
        }
        cb(null, true);
    }
});


// --- Conexión MongoDB ---
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://raanndomlz:jXXYYC69QRzm1sqc@katanasushi.dbvpk8h.mongodb.net/katana_sushi')
    .then(() => {
        console.log("MongoDB conectado exitosamente.");
        initializeCounters();
    })
    .catch(err => console.error("Error de conexión MongoDB:", err));

// --- Modelos ---
// User Schema
const userSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellidos: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    telefono: { type: String, required: true, trim: true },
    fechaNacimiento: { type: Date },
    password: { type: String, required: true },
    role: { type: String, default: 'cliente' }, // Añadido para diferenciar roles
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Product Schema
const productSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'El nombre del producto es requerido'] },
    price: { type: Number, required: [true, 'El precio es requerido'], min: [0, 'El precio no puede ser negativo'] },
    category: { type: String, required: [true, 'La categoría es requerida'], trim: true },
    description: { type: String, trim: true },
    stock: { type: Number, default: 0, min: [0, 'El stock no puede ser negativo'] },
    imageUrl: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', productSchema);

// AdminUser Schema
const adminUserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    fullName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    avatar: {
        contentType: { type: String },
        filename: { type: String }
    },
    role: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});
adminUserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try { const salt = await bcrypt.genSalt(10); this.password = await bcrypt.hash(this.password, salt); next(); }
    catch (error) { next(error); }
});
const AdminUser = mongoose.model('AdminUser', adminUserSchema);

// Order Schemas
const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    name: { type: String, required: true },
    image: { type: String }
}, { _id: false });

const deliveryDetailsSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    telefono: { type: String, required: true },
    direccion: { type: String, required: true },
    zona: { type: String, required: true },
    referencia: { type: String }
}, { _id: false });

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema);

async function getNextSequenceValue(sequenceName) {
    const sequenceDocument = await Counter.findByIdAndUpdate(
        sequenceName,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    if (!sequenceDocument) {
        throw new Error(`Contador para ${sequenceName} no encontrado y no pudo ser creado.`);
    }
    return sequenceDocument.seq;
}

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

orderSchema.pre('save', async function(next) {
    if (this.isNew && !this.orderId) {
        try {
            const nextIdNumber = await getNextSequenceValue('orderId');
            this.orderId = `KS-${nextIdNumber.toString().padStart(4, '0')}`;
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
    }
}

// Modelo para Imágenes del Carrusel
const carouselImageSchema = new mongoose.Schema({
    imageUrl: { type: String, required: true },
    filename: { type: String, required: true },
    title: { type: String },
    order: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});
const CarouselImage = mongoose.model('CarouselImage', carouselImageSchema);

const CRON_TIMEZONE = "America/El_Salvador";

// Sábado a las 8:00 AM: Cambiar pedidos pendientes a "En preparación"
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

// Sábado a las 5:00 PM (17:00): Cambiar pedidos "En preparación" a "En camino"
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


// --- Middleware de Autenticación ---
const auth = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Acceso denegado. No se proporcionó token.' });
    const token = authHeader.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'Acceso denegado. Token malformado.' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_jwt_secret');
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error("Error de verificación de token:", error.message);
        if (error.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expirado.' });
        return res.status(401).json({ success: false, message: 'Token inválido.' });
    }
};

const adminAuth = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Acceso de administrador denegado. No se proporcionó token.' });
    const token = authHeader.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'Acceso de administrador denegado. Token malformado.' });
    try {
        const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET || 'tu_admin_jwt_secret');
        if (decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Acceso denegado. Permisos insuficientes.' });
        }
        req.adminId = decoded.adminId;
        req.adminRole = decoded.role;
        next();
    } catch (error) {
        console.error("Error de verificación de token de admin:", error.message);
        if (error.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token de administrador expirado.' });
        return res.status(401).json({ success: false, message: 'Token de administrador inválido.' });
    }
};

// --- Rutas API ---

// Autenticación Usuario
app.post('/api/register', async (req, res) => {
    try {
        const { nombre, apellidos, email, telefono, fechaNacimiento, password } = req.body;
        if (!nombre || !apellidos || !email || !telefono || !fechaNacimiento || !password) return res.status(400).json({ message: 'Faltan campos requeridos' });
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'El correo ya está registrado' });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = new User({ 
            nombre,
            apellidos, 
            email, 
            telefono, 
            fechaNacimiento, 
            password: hashedPassword 
        });
        await user.save();
        res.status(201).json({ success: true, message: 'Usuario registrado exitosamente' });
    } catch (error) { 
        console.error(error); 
        res.status(500).json({ message: 'Error en el servidor' }); 
    }
});
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Credenciales inválidas' });
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ message: 'Credenciales inválidas' });
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'tu_jwt_secret', { expiresIn: '24h' });
        res.json({ success: true, token, user: { id: user._id, nombre: user.nombre, email: user.email } });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Error en el servidor' }); }
});

// Perfil Usuario
app.get('/api/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        res.json({ success: true, data: user });
    } catch (error) { console.error("Error fetching profile:", error); res.status(500).json({ success: false, message: 'Error interno del servidor.' }); }
});
app.put('/api/profile', auth, async (req, res) => {
    try {
        const { nombre, apellidos, telefono, fechaNacimiento } = req.body;
        const updateData = { nombre, apellidos, telefono, fechaNacimiento };
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
        const updatedUser = await User.findByIdAndUpdate(req.userId, updateData, { new: true, runValidators: true }).select('-password');
        if (!updatedUser) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        res.json({ success: true, message: 'Perfil actualizado.', data: updatedUser });
    } catch (error) {
        console.error("Error updating profile:", error);
        if (error.name === 'ValidationError') { const errors = Object.values(error.errors).map(el => el.message); return res.status(400).json({ success: false, message: 'Error de validación', errors }); }
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});
app.post('/api/profile/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Contraseña actual y nueva son requeridas.' });
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'La contraseña actual es incorrecta.' });
        if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
        const salt = await bcrypt.genSalt(10); user.password = await bcrypt.hash(newPassword, salt); await user.save();
        res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (error) { console.error("Error changing password:", error); res.status(500).json({ success: false, message: 'Error interno del servidor.' }); }
});

// Productos
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find({ isActive: true }).sort({ category: 1, name: 1 });
        res.json(products);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Error al obtener productos' }); }
});
app.post('/api/products', adminAuth, async (req, res) => {
    try {
        const { name, price, category, description, stock, imageUrl } = req.body;
        if (!name || price === undefined || !category) return res.status(400).json({ message: 'Nombre, precio y categoría requeridos.' });
        const newProduct = new Product({ name, price, category, description, stock: stock || 0, imageUrl });
        const savedProduct = await newProduct.save();
        res.status(201).json({ success: true, message: 'Producto creado', product: savedProduct });
    } catch (error) {
        console.error(error);
        if (error.name === 'ValidationError') { const errors = Object.values(error.errors).map(el => el.message); return res.status(400).json({ message: 'Error de validación', errors }); }
        res.status(500).json({ message: 'Error al crear producto' });
    }
});
app.delete('/api/products/:id', adminAuth, async (req, res) => {
    try {
        const productId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ message: 'ID inválido' });
        const deletedProduct = await Product.findByIdAndDelete(productId);
        if (!deletedProduct) return res.status(404).json({ message: 'Producto no encontrado' });
        res.json({ success: true, message: 'Producto eliminado', product: deletedProduct });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Error al eliminar producto' }); }
});

// Pedidos
app.post('/api/orders/guest', async (req, res) => {
    try {
        const { items, deliveryDetails, clientRequestId, shippingCost, totalAmount: totalAmountFromClient } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0 || !deliveryDetails) {
            return res.status(400).json({ success: false, message: 'Datos del pedido incompletos o inválidos.' });
        }
        if (clientRequestId) {
            const existing = await Order.findOne({ clientRequestId });
            if (existing) {
                return res.status(200).json({ success: true, message: 'Pedido ya registrado.', data: { orderId: existing.orderId } });
            }
        }
        const productIds = items.map(item => item.productId);
        const productsInDB = await Product.find({ _id: { $in: productIds }, isActive: true });
        if (productsInDB.length !== productIds.length) {
            return res.status(400).json({ success: false, message: 'Algunos productos no están disponibles.' });
        }
        let calculatedSubtotal = 0;
        const processedItems = items.map(item => {
            const product = productsInDB.find(p => p._id.toString() === item.productId);
            const itemTotal = product.price * item.quantity;
            calculatedSubtotal += itemTotal;
            return { productId: product._id, quantity: item.quantity, price: product.price, name: product.name, image: product.imageUrl };
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
            console.error("Error enviando correo de notificación al admin:", error);
        }
        res.status(201).json({ success: true, message: 'Pedido realizado con éxito.', data: { orderId: savedOrder.orderId } });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'Pedido duplicado detectado.' });
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});
app.post('/api/orders', auth, async (req, res) => {
    try {
        const { items, deliveryDetails, paymentMethod, clientRequestId, shippingCost, totalAmount: totalAmountFromClient } = req.body;
        const userId = req.userId;
        if (!items || !Array.isArray(items) || items.length === 0 || !deliveryDetails) {
            return res.status(400).json({ success: false, message: 'Datos del pedido incompletos.' });
        }
        if (clientRequestId) {
            const existing = await Order.findOne({ clientRequestId });
            if (existing) {
                return res.status(200).json({ success: true, message: 'Pedido ya registrado.', data: { orderId: existing.orderId } });
            }
        }
        const productIds = items.map(item => item.productId);
        const productsInDB = await Product.find({ _id: { $in: productIds }, isActive: true });
        if (productsInDB.length !== productIds.length) {
            const foundIds = productsInDB.map(p => p._id.toString());
            const missingIds = productIds.filter(id => !foundIds.includes(id));
            return res.status(400).json({ success: false, message: `Productos no disponibles: ${missingIds.join(', ')}` });
        }
        let calculatedSubtotal = 0;
        const processedItems = items.map(item => {
            const product = productsInDB.find(p => p._id.toString() === item.productId);
            const itemTotal = product.price * item.quantity;
            calculatedSubtotal += itemTotal;
            return { productId: product._id, quantity: item.quantity, price: product.price, name: product.name, image: product.imageUrl };
        });

        const finalShippingCost = shippingCost !== undefined ? parseFloat(shippingCost) : 0;
        const finalTotalAmount = totalAmountFromClient !== undefined ? parseFloat(totalAmountFromClient) : (calculatedSubtotal + finalShippingCost);
        
        const newOrder = new Order({
            userId, 
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
            console.error("Error enviando correo de notificación al admin:", error);
        }
        return res.status(201).json({ success: true, message: 'Pedido realizado con éxito.', data: { orderId: savedOrder.orderId } });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'Pedido duplicado detectado.' });
        }
        console.error("Error en /api/orders:", error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});
app.get('/api/orders', auth, async (req, res) => {
    try {
        const userId = req.userId;
        const orders = await Order.find({ userId: userId }).sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (error) { console.error("Error al obtener historial de pedidos:", error); res.status(500).json({ success: false, message: 'Error interno del servidor.' }); }
});

// --- Rutas API para el Carrusel ---
app.get('/api/carousel-images', async (req, res) => {
    try {
        const images = await CarouselImage.find().sort({ order: 1, createdAt: -1 });
        res.json({ success: true, data: images });
    } catch (error) {
        console.error("Error al obtener imágenes del carrusel:", error);
        res.status(500).json({ success: false, message: 'Error al obtener imágenes del carrusel.' });
    }
});

app.post('/api/admin/carousel-images', adminAuth, carouselUpload.single('carouselImageFile'), async (req, res) => {
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
});

app.delete('/api/admin/carousel-images/:id', adminAuth, async (req, res) => {
    try {
        const imageId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(imageId)) {
            return res.status(400).json({ success: false, message: 'ID de imagen inválido.' });
        }
        const currentImageCount = await CarouselImage.countDocuments();
        if (currentImageCount <= 3) {
            return res.status(400).json({ success: false, message: 'No se puede eliminar. Se requiere un mínimo de 3 imágenes en el carrusel.' });
        }
        const imageToDelete = await CarouselImage.findById(imageId);
        if (!imageToDelete) {
            return res.status(404).json({ success: false, message: 'Imagen no encontrada.' });
        }
        const imagePath = path.join(__dirname, '../../public/images/carousel', imageToDelete.filename);
        fs.unlink(imagePath, async (err) => {
            if (err) {
                console.warn(`Error al eliminar el archivo ${imageToDelete.filename} del disco:`, err.message);
            }
            await CarouselImage.findByIdAndDelete(imageId);
            res.json({ success: true, message: 'Imagen del carrusel eliminada.' });
        });
    } catch (error) {
        console.error("Error al eliminar imagen del carrusel:", error);
        res.status(500).json({ success: false, message: 'Error al eliminar imagen del carrusel.' });
    }
});


// --- Rutas de Administración ---
app.post('/api/admin/login', async (req, res) => {
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
});

app.get('/api/admin/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json({ success: true, data: users });
    } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Error al obtener usuarios.' }); }
});

app.get('/api/admin/orders', adminAuth, async (req, res) => {
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
        console.error("Error al obtener todos los pedidos (admin):", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener pedidos.' });
    }
});

app.patch('/api/admin/orders/:id/status', adminAuth, async (req, res) => {
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
        console.error("Error al actualizar estado del pedido (admin):", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar el estado.' });
    }
});

app.get('/api/admin/profile', adminAuth, async (req, res) => {
    try {
        const admin = await AdminUser.findById(req.adminId).select('-password');
        if (!admin) return res.status(404).json({ success: false, message: 'Administrador no encontrado.' });
        res.json({ success: true, data: admin });
    } catch (error) {
        console.error('Error al obtener perfil de admin:', error);
        res.status(500).json({ success: false, message: 'Error al obtener perfil.' });
    }
});

app.put('/api/admin/profile', adminAuth, async (req, res) => {
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
        console.error('Error al actualizar perfil de admin:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar perfil.' });
    }
});

app.put('/api/admin/password', adminAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const admin = await AdminUser.findById(req.adminId);
        if (!admin) return res.status(404).json({ success: false, message: 'Administrador no encontrado.' });
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta.' });
        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(newPassword, salt);
        await admin.save();
        res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar contraseña de admin:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar contraseña.' });
    }
});

app.post('/api/admin/avatar', adminAuth, avatarUpload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se proporcionó ninguna imagen.' });
        }
        const admin = await AdminUser.findById(req.adminId);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Administrador no encontrado.' });
        }
        if (admin.avatar && admin.avatar.filename) {
            const oldAvatarPath = path.join(__dirname, '../../public/images/avatars', admin.avatar.filename);
            fs.unlink(oldAvatarPath, (err) => {
                if (err && err.code !== 'ENOENT') console.warn("Error al eliminar avatar anterior:", err);
            });
        }
        admin.avatar = {
            contentType: req.file.mimetype,
            filename: req.file.filename
        };
        await admin.save();
        res.json({
            success: true,
            message: 'Avatar actualizado correctamente.',
            avatarPath: `/images/avatars/${req.file.filename}`
        });
    } catch (error) {
        console.error('Error al actualizar avatar de admin:', error);
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Error al eliminar archivo subido tras fallo en POST /api/admin/avatar:", err);
            });
        }
        res.status(500).json({ success: false, message: 'Error al actualizar avatar.' });
    }
});

app.get('/api/admin/avatar/:adminId', async (req, res) => {
    try {
        const admin = await AdminUser.findById(req.params.adminId);
        if (!admin || !admin.avatar || !admin.avatar.filename) {
            return res.redirect('/images/admin-avatar.jpg');
        }
        const avatarPath = path.join(__dirname, '../../public/images/avatars', admin.avatar.filename);
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
});

app.post('/api/admin/manual-order', adminAuth, async (req, res) => {
    try {
        const { deliveryDetails, items, totalAmount, shippingCost, status, source } = req.body;
        if (!deliveryDetails || !deliveryDetails.nombre || !deliveryDetails.telefono || !deliveryDetails.direccion) {
            return res.status(400).json({ success: false, message: 'Faltan detalles del cliente o dirección.' });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'El pedido debe contener al menos un producto.' });
        }
        if (totalAmount === undefined || isNaN(parseFloat(totalAmount)) || parseFloat(totalAmount) < 0) {
            return res.status(400).json({ success: false, message: 'Monto total inválido.' });
        }
        if (shippingCost === undefined || isNaN(parseFloat(shippingCost)) || parseFloat(shippingCost) < 0) {
            return res.status(400).json({ success: false, message: 'Costo de envío inválido.' });
        }
        for (const item of items) {
            if (!item.productId || !item.quantity || item.quantity <= 0 || !item.price || item.price < 0 || !item.name) {
                return res.status(400).json({ success: false, message: 'Datos de producto inválidos en el pedido.' });
            }
        }
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
            deliveryDetails: {
                nombre: deliveryDetails.nombre,
                telefono: deliveryDetails.telefono,
                direccion: deliveryDetails.direccion,
                zona: deliveryDetails.zona || 'N/A',
                referencia: deliveryDetails.referencia || ''
            },
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
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: 'Error de validación.', errors: error.errors });
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor al registrar pedido manual.' });
    }
});


// --- NUEVO: API PARA REPORTES ---

// Endpoint para métricas clave del dashboard
app.get('/api/admin/reports/metrics', adminAuth, async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalCustomers = await User.countDocuments({ role: 'cliente' }); // Contar solo clientes
        
        // Ingresos totales (excluyendo pedidos cancelados o pendientes)
        const revenueData = await Order.aggregate([
            { $match: { status: { $nin: ['cancelled', 'pending'] } } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
        
        // Productos más vendidos
        const topProductData = await Order.aggregate([
            { $match: { status: { $nin: ['cancelled', 'pending'] } } }, // Opcional: excluir cancelados de esta métrica también
            { $unwind: '$items' },
            { $group: { _id: '$items.name', totalSold: { $sum: '$items.quantity' } } },
            { $sort: { totalSold: -1 } },
            { $limit: 1 }
        ]);
        const topProduct = topProductData.length > 0 ? topProductData[0]._id : 'N/A';

        res.json({
            success: true,
            data: {
                totalOrders,
                totalCustomers,
                totalRevenue,
                topProduct,
            }
        });
    } catch (error) {
        console.error("Error fetching admin report metrics:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});


// Endpoint para datos del gráfico de ventas (modificado para rangos de fecha)
app.get('/api/admin/reports/sales-chart', adminAuth, async (req, res) => {
    try {
        const { startDate: startDateStr, endDate: endDateStr } = req.query;

        // Validar y establecer fechas por defecto si no se proporcionan
        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        // Ajustar endDate para que incluya todo el día
        endDate.setHours(23, 59, 59, 999);
        
        let startDate;
        if (startDateStr) {
            startDate = new Date(startDateStr);
            startDate.setHours(0, 0, 0, 0); // Asegurar que la fecha de inicio comience a las 00:00
        } else {
            // Por defecto, últimos 30 días si no hay fecha de inicio
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
        }

        const dateRangeInDays = (endDate - startDate) / (1000 * 60 * 60 * 24);

        // Decidir el formato de agrupación y etiqueta basado en el rango de fechas
        let groupFormat, labelFormatOptions;
        const timezone = "America/El_Salvador"; // Usa tu zona horaria local

        if (dateRangeInDays <= 1) { // Rango de un solo día, agrupar por hora
            groupFormat = { $dateToString: { format: "%Y-%m-%dT%H:00:00", date: "$createdAt", timezone } };
            labelFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
        } else if (dateRangeInDays <= 90) { // Hasta 3 meses, agrupar por día
            groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone } };
            labelFormatOptions = { month: 'short', day: 'numeric' };
        } else { // Más de 3 meses, agrupar por mes
            groupFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone } };
            labelFormatOptions = { year: 'numeric', month: 'long' };
        }

        const salesData = await Order.aggregate([
            { 
                $match: { 
                    createdAt: { $gte: startDate, $lte: endDate }, 
                    status: { $nin: ['cancelled', 'pending'] } 
                } 
            },
            { 
                $group: {
                    _id: groupFormat,
                    totalRevenue: { $sum: "$totalAmount" }
                } 
            },
            { $sort: { _id: 1 } }
        ]);
        
        const labels = salesData.map(d => new Date(d._id).toLocaleDateString('es-ES', labelFormatOptions));
        const values = salesData.map(d => d.totalRevenue);

        // Generar un título dinámico para el gráfico
        const chartTitle = `Ventas del ${startDate.toLocaleDateString('es-ES')} al ${endDate.toLocaleDateString('es-ES')}`;

        res.json({ success: true, data: { labels, values, title: chartTitle } });
    } catch (error)
    {
        console.error("Error fetching sales chart data:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});


// Endpoint para datos del gráfico de categorías
app.get('/api/admin/reports/category-chart', adminAuth, async (req, res) => {
    try {
        const categoryData = await Order.aggregate([
            { $match: { status: { $nin: ['cancelled', 'pending'] } } },
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'productInfo' } },
            { $unwind: '$productInfo' },
            { 
                $group: {
                    _id: '$productInfo.category',
                    count: { $sum: 1 } // Contar número de items vendidos por categoría
                } 
            },
            { $sort: { count: -1 } }
        ]);
        
        const labels = categoryData.map(d => d._id);
        const values = categoryData.map(d => d.count);
        
        res.json({ success: true, data: { labels, values } });

    } catch (error) {
        console.error("Error fetching category chart data:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Endpoint para datos del reporte de clientes
app.get('/api/admin/reports/customers', adminAuth, async (req, res) => {
    try {
        const sortBy = req.query.sort || '-totalSpent'; // Ordenar por gasto total por defecto

        const customerData = await Order.aggregate([
            // 1. Filtrar solo pedidos completados (puedes ajustar los estados según tu negocio)
            { $match: { status: { $nin: ['cancelled', 'pending'] }, userId: { $ne: null } } },

            // 2. Agrupar por userId para calcular métricas
            {
                $group: {
                    _id: '$userId',
                    totalSpent: { $sum: '$totalAmount' },
                    orderCount: { $sum: 1 },
                    lastOrderDate: { $max: '$createdAt' }
                }
            },
            
            // 3. Unir con la colección de usuarios para obtener nombre y email
            {
                $lookup: {
                    from: 'users', // El nombre de tu colección de usuarios
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customerInfo'
                }
            },
            
            // 4. Desplegar el array de la información del cliente
            { $unwind: '$customerInfo' },

            // 5. Formatear la salida final
            {
                $project: {
                    _id: 0, // Ocultar el _id del grupo
                    userId: '$_id',
                    name: '$customerInfo.nombre',
                    email: '$customerInfo.email',
                    totalSpent: '$totalSpent',
                    orderCount: '$orderCount',
                    lastOrderDate: '$lastOrderDate'
                }
            },

            // 6. Ordenar según el parámetro
            { $sort: (sortBy === 'orderCount' ? { orderCount: -1 } : { totalSpent: -1 }) }
        ]);

        res.json({ success: true, data: customerData });

    } catch (error) {
        console.error("Error fetching customer report data:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Endpoint para datos del reporte de productos
app.get('/api/admin/reports/products', adminAuth, async (req, res) => {
    try {
        const sortBy = req.query.sort || '-unitsSold'; // Ordenar por unidades vendidas por defecto

        const productData = await Order.aggregate([
            // 1. Filtrar solo pedidos completados
            { $match: { status: { $nin: ['cancelled', 'pending'] } } },

            // 2. Desplegar el array de items para procesar cada producto individualmente
            { $unwind: '$items' },

            // 3. Agrupar por ID de producto y calcular métricas de venta
            {
                $group: {
                    _id: '$items.productId',
                    unitsSold: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
            },

            // 4. Unir con la colección de productos para obtener detalles (nombre, stock, etc.)
            {
                $lookup: {
                    from: 'products', // El nombre de tu colección de productos
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },

            // 5. Desplegar el array de detalles del producto
            { $unwind: '$productDetails' },

            // 6. Formatear la salida final
            {
                $project: {
                    _id: 0,
                    productId: '$_id',
                    name: '$productDetails.name',
                    category: '$productDetails.category',
                    stock: '$productDetails.stock',
                    unitsSold: '$unitsSold',
                    totalRevenue: '$totalRevenue'
                }
            },

            // 7. Ordenar según el parámetro
            { $sort: (sortBy === 'totalRevenue' ? { totalRevenue: -1 } : { unitsSold: -1 }) }
        ]);

        res.json({ success: true, data: productData });

    } catch (error) {
        console.error("Error fetching product report data:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});


// --- Rutas HTML ---
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, '../../index.html')); });
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
                if (err.status === 404) res.status(404).send(`Vista "${viewName}" no encontrada.`);
                else next(err);
            }
        });
    } else { next(); }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/admin-dashboard.html'));
});

app.get('/cookies', (req, res) => {
    res.sendFile(path.join(__dirname, '../politicas-cookies.html'));
});

app.get('/politicas-privacidad', (req, res) => {
    res.sendFile(path.join(__dirname, '../politicas-privacidad.html'));
});

// --- Inicio del Servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// --- Configuración de Nodemailer para notificaciones de pedidos ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'sortomejia66@gmail.com',      // Tu correo de Gmail
    pass: 'afls ornn dwvm ytbz'         // Tu contraseña o App Password de Gmail
  }
});

// Función para notificar al admin por correo
function notificarNuevoPedido(pedido) {
  const mailOptions = {
    from: '"Katana Sushi" <sortomejia66@gmail.com>',
    to: 'sortomejia66@gmail.com', // Correo del admin
    subject: `¡Nuevo pedido recibido! - #${pedido.orderId}`,
    html: `
      <h2>Nuevo pedido recibido #${pedido.orderId}</h2>
      <p><strong>Cliente:</strong> ${pedido.deliveryDetails?.nombre || 'Invitado'}</p>
      <p><strong>Teléfono:</strong> ${pedido.deliveryDetails?.telefono || '-'}</p>
      <p><strong>Zona:</strong> ${pedido.deliveryDetails?.zona || '-'}</p>
      <p><strong>Total:</strong> $${(pedido.totalAmount || 0).toFixed(2)}</p>
      <hr>
      <p>Revisa el panel de administración para más detalles.</p>
    `
  };
  return transporter.sendMail(mailOptions);
}
