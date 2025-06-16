const jwt = require('jsonwebtoken');

// Middleware para verificar el token de un cliente normal
const auth = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Acceso denegado. No se proporcionó token.' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Acceso denegado. Token malformado.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_jwt_secret');
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error("Error de verificación de token:", error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expirado.' });
        }
        return res.status(401).json({ success: false, message: 'Token inválido.' });
    }
};

// Middleware para verificar el token de un administrador
const adminAuth = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Acceso de administrador denegado. No se proporcionó token.' });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Acceso de administrador denegado. Token malformado.' });
    }

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
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token de administrador expirado.' });
        }
        return res.status(401).json({ success: false, message: 'Token de administrador inválido.' });
    }
};

module.exports = { auth, adminAuth };