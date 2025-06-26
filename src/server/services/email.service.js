const nodemailer = require('nodemailer');

// Configuración del transporte de correo.
// NOTA: Como buena práctica, te recomiendo mover estas credenciales
// a tu archivo .env para mayor seguridad (ej. process.env.EMAIL_USER y process.env.EMAIL_PASS)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'kataba.sushi.shulton@gmail.com',
    pass: process.env.EMAIL_PASS || 'txzq uxsv vgju idcc'
  }
});

/**
 * CORREGIDO: Envía una notificación con un diseño HTML personalizado.
 * @param {object} pedido - El objeto del pedido guardado en la base de datos.
 */
function notificarNuevoPedido(pedido) {
  // Generamos la lista de productos para el correo
  const productListHtml = pedido.items.map(item => 
      `<li>${item.quantity}x ${item.name}</li>`
  ).join('');

  // URL del logo (asegúrate de que sea públicamente accesible, por ejemplo, subiéndolo a un hosting)
  // Para este ejemplo, usaremos un enlace a una imagen que ya tienes en tu repo de GitHub.
  const logoUrl = 'https://raw.githubusercontent.com/USER/REPO/main/public/images/LOGO-SIN-FONDO.png'; // <-- ¡IMPORTANTE! Reemplaza con una URL pública a tu logo.

  const mailOptions = {
      from: '"Katana Sushi Notificaciones" <kataba.sushi.shulton@gmail.com>',
      to: 'kataba.sushi.shulton@gmail.com', // Correo del admin
      subject: `🍣 ¡Nuevo Pedido! - #${pedido.orderId}`,
      html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 8px;">
              <div style="background-color: #ca0b0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 24px;">¡Nuevo Pedido Recibido!</h1>
              </div>
              <div style="padding: 20px;">
                  <p>Se ha registrado un nuevo pedido en el sistema. Aquí están los detalles:</p>
                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                      <tr>
                          <td style="padding: 8px; border: 1px solid #eee; background-color: #f9f9f9; width: 100px;"><strong>Pedido #:</strong></td>
                          <td style="padding: 8px; border: 1px solid #eee;"><strong>${pedido.orderId}</strong></td>
                      </tr>
                      <tr>
                          <td style="padding: 8px; border: 1px solid #eee; background-color: #f9f9f9;"><strong>Cliente:</strong></td>
                          <td style="padding: 8px; border: 1px solid #eee;">${pedido.deliveryDetails?.nombre || 'Invitado'}</td>
                      </tr>
                      <tr>
                          <td style="padding: 8px; border: 1px solid #eee; background-color: #f9f9f9;"><strong>Teléfono:</strong></td>
                          <td style="padding: 8px; border: 1px solid #eee;">
                              <a href="https://wa.me/503${pedido.deliveryDetails?.telefono}">${pedido.deliveryDetails?.telefono || '-'}</a>
                          </td>
                      </tr>
                       <tr>
                          <td style="padding: 8px; border: 1px solid #eee; background-color: #f9f9f9;"><strong>Dirección:</strong></td>
                          <td style="padding: 8px; border: 1px solid #eee;">${pedido.deliveryDetails?.direccion || '-'}</td>
                      </tr>
                  </table>

                  <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-top: 30px;">Productos</h3>
                  <ul style="list-style: none; padding-left: 0;">
                      ${productListHtml}
                  </ul>

                  <div style="text-align: center; margin: 30px 0;">
                      <span style="font-size: 16px; color: #555;">Total del Pedido</span><br>
                      <strong style="font-size: 28px; color: #ca0b0b;">$${(pedido.totalAmount || 0).toFixed(2)}</strong>
                  </div>

                  <div style="text-align: center; margin-top: 30px;">
                      <a href="https://katanasushi.net/admin" style="background-color: #2C3E50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                          Ver Pedido en el Dashboard
                      </a>
                  </div>
              </div>
              <div style="background-color: #f2f2f2; color: #777; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
                  © ${new Date().getFullYear()} Katana Sushi. Todos los derechos reservados.
              </div>
          </div>
      `
  };

  return transporter.sendMail(mailOptions);
}

module.exports = {
    notificarNuevoPedido
};