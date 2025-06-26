const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// --- Sub-esquema para las direcciones ---
const addressSchema = new mongoose.Schema({
    alias: { type: String, required: true, trim: true }, // Ej: "Casa", "Oficina"
    direccion: { type: String, required: true, trim: true },
    zona: { type: String, required: true },
    referencia: { type: String, trim: true },
    isDefault: { type: Boolean, default: false }
});

// User Schema
const userSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellidos: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    telefono: { type: String, required: true, trim: true },
    fechaNacimiento: { type: Date },
    password: { type: String, required: true },
    role: { type: String, default: 'cliente' },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    addresses: [addressSchema],
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
});

// Hook para encriptar la contraseña antes de guardar cualquier cambio en ella
userSchema.pre('save', async function(next) {
    // Solo encripta la contraseña si ha sido modificada (o es nueva)
    if (!this.isModified('password')) {
        return next();
    }

    try {
        // Genera la "sal" y encripta la contraseña
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;