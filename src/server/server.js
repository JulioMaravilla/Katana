const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const app = express();

// Configuración de Multer para manejo de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../public/images/avatars'))
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname))
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // límite de 5MB
    },
    fileFilter: function (req, file, cb) {
        // Aceptar solo imágenes
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Solo se permiten archivos de imagen!'), false);
        }
        cb(null, true);
    }
});

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
app.use('/avatars', express.static(path.join(__dirname, '../../public/images/avatars')));

// --- Conexión MongoDB ---
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://raanndomlz:jXXYYC69QRzm1sqc@katanasushi.dbvpk8h.mongodb.net/katana_sushi')
    .then(() => console.log("MongoDB conectado exitosamente."))
    .catch(err => console.error("Error de conexión MongoDB:", err));

// --- Modelos (User, Product, AdminUser, Order - sin cambios respecto a la versión anterior) ---
// Modelo de Usuario
const userSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    telefono: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Modelo de Producto
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

// Modelo de Administrador
const adminUserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    fullName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    avatar: {
        data: { type: Buffer },
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

// Modelo de Pedido
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

const orderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    status: { type: String, default: 'pending', enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
    deliveryDetails: deliveryDetailsSchema,
    paymentMethod: { type: String, default: 'contra_entrega' },
    isGuestOrder: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

orderSchema.pre('save', async function(next) {
    if (this.isNew && !this.orderId) {
        const lastOrder = await Order.findOne().sort({ createdAt: -1 });
        const lastIdNumber = lastOrder && lastOrder.orderId ? parseInt(lastOrder.orderId.split('-')[1]) : 0;
        this.orderId = `KS-${(lastIdNumber + 1).toString().padStart(4, '0')}`;
    }
    next();
});
const Order = mongoose.model('Order', orderSchema);

// --- Middleware de Autenticación ---

// Middleware para Usuarios (JWT)
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

// Middleware para Administradores (JWT) - NUEVO
const adminAuth = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Acceso de administrador denegado. No se proporcionó token.' });
    const token = authHeader.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'Acceso de administrador denegado. Token malformado.' });
    try {
        // Usar un secret diferente para admin si es necesario, o el mismo si se confía en el rol
        const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET || 'tu_admin_jwt_secret'); // ¡Usa un secret diferente!
        // Verificar si el usuario decodificado es realmente un admin (opcional pero recomendado)
        if (decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Acceso denegado. Permisos insuficientes.' });
        }
        req.adminId = decoded.adminId; // Guardar ID del admin si es necesario
        req.adminRole = decoded.role;
        next();
    } catch (error) {
        console.error("Error de verificación de token de admin:", error.message);
        if (error.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token de administrador expirado.' });
        return res.status(401).json({ success: false, message: 'Token de administrador inválido.' });
    }
};


// --- Rutas API ---

// Autenticación Usuario (sin cambios)
app.post('/api/register', async (req, res) => { /* ... código existente ... */
    try {
        const { nombre, email, telefono, password } = req.body;
        if (!nombre || !email || !telefono || !password) return res.status(400).json({ message: 'Faltan campos requeridos' });
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'El correo ya está registrado' });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = new User({ nombre, email, telefono, password: hashedPassword });
        await user.save();
        res.status(201).json({ success: true, message: 'Usuario registrado exitosamente' });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Error en el servidor' }); }
});
app.post('/api/login', async (req, res) => { /* ... código existente ... */
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

// Perfil Usuario (sin cambios)
app.get('/api/profile', auth, async (req, res) => { /* ... código existente ... */
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        res.json({ success: true, data: user });
    } catch (error) { console.error("Error fetching profile:", error); res.status(500).json({ success: false, message: 'Error interno del servidor.' }); }
});
app.put('/api/profile', auth, async (req, res) => { /* ... código existente ... */
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
app.post('/api/profile/change-password', auth, async (req, res) => { /* ... código existente ... */
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

// Productos (sin cambios en GET público, POST/DELETE ahora protegidos)
app.get('/api/products', async (req, res) => { /* ... código existente ... */
    try {
        const products = await Product.find({ isActive: true }).sort({ category: 1, name: 1 });
        res.json(products);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Error al obtener productos' }); }
});
app.post('/api/products', adminAuth, async (req, res) => { // Protegido
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
app.delete('/api/products/:id', adminAuth, async (req, res) => { // Protegido
    try {
        const productId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ message: 'ID inválido' });
        const deletedProduct = await Product.findByIdAndDelete(productId);
        if (!deletedProduct) return res.status(404).json({ message: 'Producto no encontrado' });
        res.json({ success: true, message: 'Producto eliminado', product: deletedProduct });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Error al eliminar producto' }); }
});
// TODO: Añadir ruta PUT/PATCH /api/products/:id (protegida) para editar productos

// Pedidos (sin cambios en los endpoints existentes)
app.post('/api/orders/guest', async (req, res) => { /* ... código existente ... */
    try {
        const { items, deliveryDetails } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0 || !deliveryDetails) return res.status(400).json({ success: false, message: 'Datos del pedido incompletos o inválidos.' });
        if (!deliveryDetails.nombre || !deliveryDetails.telefono || !deliveryDetails.direccion || !deliveryDetails.zona) return res.status(400).json({ success: false, message: 'Faltan detalles de entrega requeridos.' });
        const productIds = items.map(item => item.productId);
        const productsInDB = await Product.find({ _id: { $in: productIds }, isActive: true });
        if (productsInDB.length !== productIds.length) { const foundIds = productsInDB.map(p => p._id.toString()); const missingIds = productIds.filter(id => !foundIds.includes(id)); console.warn("Pedido de invitado rechazado. Productos no encontrados o inactivos:", missingIds); return res.status(400).json({ success: false, message: 'Algunos productos no están disponibles. Por favor, revisa tu carrito.' }); }
        let totalAmount = 0;
        const processedItems = items.map(item => { const product = productsInDB.find(p => p._id.toString() === item.productId); if (!product) throw new Error(`Producto con ID ${item.productId} no encontrado.`); const itemTotal = product.price * item.quantity; totalAmount += itemTotal; return { productId: product._id, quantity: item.quantity, price: product.price, name: product.name, image: product.imageUrl }; });
        const newOrder = new Order({ userId: null, items: processedItems, totalAmount: totalAmount, status: 'pending', deliveryDetails: deliveryDetails, isGuestOrder: true });
        const savedOrder = await newOrder.save();
        res.status(201).json({ success: true, message: 'Pedido realizado con éxito.', data: { orderId: savedOrder.orderId } });
    } catch (error) { console.error("Error al crear pedido de invitado:", error); res.status(500).json({ success: false, message: 'Error interno del servidor al procesar el pedido.' }); }
});
app.post('/api/orders', auth, async (req, res) => { /* ... código existente ... */
    try {
        const { items, deliveryDetails, paymentMethod } = req.body;
        const userId = req.userId;
        if (!items || !Array.isArray(items) || items.length === 0 || !deliveryDetails) return res.status(400).json({ success: false, message: 'Datos del pedido incompletos.' });
        if (!deliveryDetails.nombre || !deliveryDetails.telefono || !deliveryDetails.direccion || !deliveryDetails.zona) return res.status(400).json({ success: false, message: 'Faltan detalles de entrega requeridos.' });
        const productIds = items.map(item => item.productId);
        const productsInDB = await Product.find({ _id: { $in: productIds }, isActive: true });
        if (productsInDB.length !== productIds.length) { const foundIds = productsInDB.map(p => p._id.toString()); const missingIds = productIds.filter(id => !foundIds.includes(id)); return res.status(400).json({ success: false, message: `Productos no disponibles: ${missingIds.join(', ')}` }); }
        let totalAmount = 0;
        const processedItems = items.map(item => { const product = productsInDB.find(p => p._id.toString() === item.productId); const itemTotal = product.price * item.quantity; totalAmount += itemTotal; return { productId: product._id, quantity: item.quantity, price: product.price, name: product.name, image: product.imageUrl }; });
        const newOrder = new Order({ userId: userId, items: processedItems, totalAmount: totalAmount, status: 'pending', deliveryDetails: deliveryDetails, paymentMethod: paymentMethod || 'contra_entrega', isGuestOrder: false });
        const savedOrder = await newOrder.save();
        res.status(201).json({ success: true, message: 'Pedido realizado con éxito.', data: { orderId: savedOrder.orderId } });
    } catch (error) { console.error("Error al crear pedido (usuario logueado):", error); res.status(500).json({ success: false, message: 'Error interno del servidor.' }); }
});
app.get('/api/orders', auth, async (req, res) => { /* ... código existente ... */
    try {
        const userId = req.userId;
        const orders = await Order.find({ userId: userId }).sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (error) { console.error("Error al obtener historial de pedidos:", error); res.status(500).json({ success: false, message: 'Error interno del servidor.' }); }
});

// --- Rutas de Administración ---

// Login Admin - Modificado para devolver token JWT
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'Usuario y contraseña requeridos.' });
        const admin = await AdminUser.findOne({ username });
        if (!admin) return res.status(401).json({ message: 'Credenciales inválidas.' });
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas.' });

        // Generar token JWT para el admin
        const adminToken = jwt.sign(
            { adminId: admin._id, role: admin.role }, // Incluir ID y rol en el payload
            process.env.ADMIN_JWT_SECRET || 'tu_admin_jwt_secret', // ¡Usar un secret diferente!
            { expiresIn: '8h' } // Tiempo de expiración para el admin
        );

        res.json({
            success: true,
            message: 'Login admin exitoso.',
            token: adminToken, // Enviar el token al frontend
            admin: { // Enviar info básica del admin si se necesita
                id: admin._id,
                username: admin.username,
                role: admin.role
            }
         });
    } catch (error) { console.error(error); res.status(500).json({ message: 'Error interno.' }); }
});

// Obtener Usuarios (Clientes) - Protegido
app.get('/api/admin/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users); // Devuelve el array directamente
    } catch (error) { console.error(error); res.status(500).json({ message: 'Error al obtener usuarios.' }); }
});

// GET /api/admin/orders - Obtener TODOS los pedidos (NUEVO - Protegido)
app.get('/api/admin/orders', adminAuth, async (req, res) => {
    try {
        // Busca todos los pedidos, ordena por fecha descendente
        // Usa populate para obtener el nombre y email del usuario si no es invitado
        const orders = await Order.find()
            .populate('userId', 'nombre email') // Selecciona solo nombre y email del usuario referenciado
            .sort({ createdAt: -1 });

        res.json({ success: true, data: orders });

    } catch (error) {
        console.error("Error al obtener todos los pedidos (admin):", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener pedidos.' });
    }
});

// PATCH /api/admin/orders/:id/status - Actualizar estado de un pedido (NUEVO - Protegido)
app.patch('/api/admin/orders/:id/status', adminAuth, async (req, res) => {
    try {
        const orderId = req.params.id; // Este es el _id de MongoDB, no el orderId legible
        const { status } = req.body;

        // Validar que el ID sea válido
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: 'ID de pedido inválido.' });
        }

        // Validar que el estado sea uno de los permitidos
        const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Estado de pedido inválido.' });
        }

        // Buscar y actualizar el pedido
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status: status },
            { new: true, runValidators: true } // Devuelve el documento actualizado y corre validadores
        ).populate('userId', 'nombre email'); // Opcional: devolver el pedido actualizado con datos de usuario

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
        }

        // TODO: Enviar notificación al cliente sobre el cambio de estado (si aplica)

        res.json({ success: true, message: `Estado del pedido ${updatedOrder.orderId} actualizado a ${status}.`, data: updatedOrder });

    } catch (error) {
        console.error("Error al actualizar estado del pedido (admin):", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar el estado.' });
    }
});

// Obtener perfil del admin
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

// Actualizar perfil del admin
app.put('/api/admin/profile', adminAuth, async (req, res) => {
    try {
        const { fullName, email, phone } = req.body;
        const admin = await AdminUser.findById(req.adminId);
        if (!admin) return res.status(404).json({ success: false, message: 'Administrador no encontrado.' });

        // Actualizar campos
        if (fullName) admin.fullName = fullName;
        if (email) admin.email = email;
        if (phone) admin.phone = phone;

        await admin.save();
        res.json({ success: true, message: 'Perfil actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar perfil de admin:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar perfil.' });
    }
});

// Actualizar contraseña del admin
app.put('/api/admin/password', adminAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const admin = await AdminUser.findById(req.adminId);
        if (!admin) return res.status(404).json({ success: false, message: 'Administrador no encontrado.' });

        // Verificar contraseña actual
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta.' });

        // Actualizar contraseña
        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(newPassword, salt);
        await admin.save();

        res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar contraseña de admin:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar contraseña.' });
    }
});

// Actualizar avatar del admin
app.post('/api/admin/avatar', adminAuth, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se proporcionó ninguna imagen.' });
        }

        const admin = await AdminUser.findById(req.adminId);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Administrador no encontrado.' });
        }

        // Actualizar avatar con los datos de la imagen
        admin.avatar = {
            data: req.file.buffer,
            contentType: req.file.mimetype,
            filename: req.file.originalname
        };
        
        await admin.save();

        res.json({ 
            success: true, 
            message: 'Avatar actualizado correctamente.',
            avatar: `/api/admin/avatar/${admin._id}` // Nueva ruta para obtener la imagen
        });
    } catch (error) {
        console.error('Error al actualizar avatar de admin:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar avatar.' });
    }
});

// Nueva ruta para servir la imagen del avatar
app.get('/api/admin/avatar/:adminId', async (req, res) => {
    try {
        const admin = await AdminUser.findById(req.params.adminId);
        if (!admin || !admin.avatar || !admin.avatar.data) {
            // Si no hay avatar, servir una imagen por defecto
            return res.redirect('/images/admin-avatar.jpg');
        }

        res.set('Content-Type', admin.avatar.contentType);
        res.send(admin.avatar.data);
    } catch (error) {
        console.error('Error al servir avatar:', error);
        res.status(500).send('Error al cargar la imagen');
    }
});

// --- Rutas HTML (sin cambios) ---
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


// Ruta para servir el admin_dashboard.html
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/admin-dashboard.html'));
});

// --- Inicio del Servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
