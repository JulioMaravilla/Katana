const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

// Hook para encriptar la contraseña antes de guardar
adminUserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

const AdminUser = mongoose.model('AdminUser', adminUserSchema);

module.exports = AdminUser;