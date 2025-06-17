const bcrypt = require('bcryptjs');
const User = require('../models/user.model');

const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        res.json({ success: true, data: user });
    } catch (error) { 
        console.error("Error en getUserProfile:", error); 
        res.status(500).json({ success: false, message: 'Error interno del servidor.' }); 
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const { nombre, apellidos, telefono, fechaNacimiento } = req.body;
        const updateData = { nombre, apellidos, telefono, fechaNacimiento };
        // Eliminar campos indefinidos para no sobreescribir con `null`
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const updatedUser = await User.findByIdAndUpdate(req.userId, updateData, { new: true, runValidators: true }).select('-password');
        if (!updatedUser) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        
        res.json({ success: true, message: 'Perfil actualizado.', data: updatedUser });
    } catch (error) {
        console.error("Error en updateUserProfile:", error);
        if (error.name === 'ValidationError') { 
            const errors = Object.values(error.errors).map(el => el.message); 
            return res.status(400).json({ success: false, message: 'Error de validación', errors }); 
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Contraseña actual y nueva son requeridas.' });
        }
        
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'La contraseña actual es incorrecta.' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
        }
        
        user.password = newPassword; // El hook pre-save en el modelo se encargará del hashing
        await user.save();
        
        res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (error) { 
        console.error("Error en changePassword:", error); 
        res.status(500).json({ success: false, message: 'Error interno del servidor.' }); 
    }
};

const getAddresses = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('addresses');
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        res.json({ success: true, data: user.addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener las direcciones.' });
    }
};

const addAddress = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

        const newAddress = req.body;

        // Si esta es la dirección predeterminada, asegúrate de que ninguna otra lo sea.
        if (newAddress.isDefault) {
            user.addresses.forEach(addr => addr.isDefault = false);
        }

        user.addresses.push(newAddress);
        await user.save();
        res.status(201).json({ success: true, message: 'Dirección añadida con éxito.', data: user.addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al añadir la dirección.' });
    }
};

const updateAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        const updatedData = req.body;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        
        const address = user.addresses.id(addressId);
        if (!address) return res.status(404).json({ success: false, message: 'Dirección no encontrada.' });

        // Si se está estableciendo como predeterminada, desmarca las demás.
        if (updatedData.isDefault) {
             user.addresses.forEach(addr => addr.isDefault = false);
        }

        address.set(updatedData);
        await user.save();
        res.json({ success: true, message: 'Dirección actualizada.', data: user.addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar la dirección.' });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

        // Utiliza el método .pull() de Mongoose para eliminar el subdocumento
        user.addresses.pull({ _id: addressId });
        
        await user.save();
        res.json({ success: true, message: 'Dirección eliminada.', data: user.addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar la dirección.' });
    }
};

const deactivateAccount = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ success: false, message: 'La contraseña es requerida.' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        // Verificar la contraseña
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'La contraseña es incorrecta.' });
        }

        // Desactivar la cuenta
        user.isActive = false;
        await user.save();

        res.json({ success: true, message: 'Cuenta desactivada exitosamente.' });
    } catch (error) {
        console.error("Error en deactivateAccount:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    changePassword,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    deactivateAccount
};