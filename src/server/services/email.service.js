const nodemailer = require('nodemailer');

// Configuración del transporte de correo.
// NOTA: Como buena práctica, te recomiendo mover estas credenciales
// a tu archivo .env para mayor seguridad (ej. process.env.EMAIL_USER y process.env.EMAIL_PASS)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'sortomejia66@gmail.com',
    pass: process.env.EMAIL_PASS || 'afls ornn dwvm ytbz' 
  }
});

/**
 * Envía una notificación por correo electrónico al administrador cuando se recibe un nuevo pedido.
 * @param {object} pedido - El objeto del pedido guardado en la base de datos.
 */
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
  
  // transporter.sendMail devuelve una promesa, lo que permite usar async/await donde se llame.
  return transporter.sendMail(mailOptions);
}

module.exports = {
    notificarNuevoPedido
};