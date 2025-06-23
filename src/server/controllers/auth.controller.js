const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Controlador para registrar un nuevo usuario
const registerUser = async (req, res) => {
    try {
        const { nombre, apellidos, email, telefono, fechaNacimiento, password } = req.body;
        if (!nombre || !apellidos || !email || !telefono || !fechaNacimiento || !password) {
            return res.status(400).json({ message: 'Faltan campos requeridos' });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }
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
        console.error("Error en registerUser:", error); 
        res.status(500).json({ message: 'Error en el servidor durante el registro.' }); 
    }
};

// Controlador para iniciar sesión
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        // Si el usuario no existe o está desactivado, mostrar el mismo mensaje
        if (!user || !user.isActive) {
            return res.status(400).json({ message: 'Esta cuenta no existe' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'tu_jwt_secret', { expiresIn: '24h' });
        res.json({ success: true, token, user: { id: user._id, nombre: user.nombre, email: user.email } });
    } catch (error) { 
        console.error("Error en loginUser:", error); 
        res.status(500).json({ message: 'Error en el servidor durante el inicio de sesión.' }); 
    }
};

module.exports = {
    registerUser,
    loginUser
};