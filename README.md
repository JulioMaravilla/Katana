# 🍣 Katana Sushi - Sistema de Gestión

Sistema completo de gestión para restaurante de sushi con panel de administración, pedidos online y gestión de productos.

## 🚀 Características

- **Panel de Administración**: Gestión completa de productos, pedidos y usuarios
- **Sistema de Pedidos**: Carrito de compras y gestión de pedidos
- **Autenticación**: Sistema de login/registro seguro
- **HTTPS**: Configurado para funcionar con certificados SSL/TLS
- **API REST**: Backend completo con Express.js y MongoDB
- **Frontend**: Interfaz moderna y responsiva

## 🛠️ Tecnologías

- **Backend**: Node.js, Express.js, MongoDB
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Autenticación**: JWT
- **Base de Datos**: MongoDB Atlas
- **Despliegue**: Docker, Coolify

## 📦 Instalación Local

### Prerrequisitos
- Node.js 18+
- MongoDB (local o Atlas)
- Git

### Pasos
1. **Clonar el repositorio**
   ```bash
   git clone <tu-repositorio>
   cd Katana
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   cd src/server
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp env.example .env
   # Editar .env con tus configuraciones
   ```

4. **Iniciar el servidor**
   ```bash
   npm start
   ```

## 🚀 Despliegue en Coolify

### 1. Preparación del Repositorio
El proyecto ya está configurado para Coolify con:
- `Dockerfile` optimizado
- `docker-compose.yml` para desarrollo
- Endpoint de health check en `/api/health`
- Configuración de puertos (3000 HTTP, 3443 HTTPS)

### 2. Configuración en Coolify

#### Variables de Entorno Requeridas:
```env
# Base de datos
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/katana_sushi

# Configuración del servidor
NODE_ENV=production
PORT=3000
HTTPS_PORT=3443

# JWT
JWT_SECRET=tu_jwt_secret_super_seguro_y_largo_aqui
JWT_EXPIRES_IN=24h

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_password_de_aplicacion

# CORS
CORS_ORIGIN=https://tu-dominio.com

# Subida de archivos
UPLOAD_PATH=public/images/products
MAX_FILE_SIZE=5242880
```

#### Variables Opcionales para SSL:
```env
# Solo si usas certificados propios
SSL_CERT_PATH=/app/ssl/cert.pem
SSL_KEY_PATH=/app/ssl/key.pem
```

### 3. Configuración de Puertos
- **HTTP**: 3000
- **HTTPS**: 3443

### 4. Configuración de Dominio
En Coolify, configura tu dominio para que apunte a:
- `http://tu-app:3000` (HTTP)
- `https://tu-app:3443` (HTTPS)

## 🔒 Configuración HTTPS

### Opción 1: Certificados de Coolify (Recomendado)
Coolify puede manejar automáticamente los certificados SSL. Solo configura tu dominio en Coolify.

### Opción 2: Certificados Propios
1. Coloca tus certificados en la carpeta `ssl/` del proyecto
2. Configura las variables `SSL_CERT_PATH` y `SSL_KEY_PATH`
3. Monta el volumen en Coolify: `./ssl:/app/src/server/ssl:ro`

## 📁 Estructura del Proyecto

```
Katana/
├── src/
│   ├── server/           # Backend Node.js
│   │   ├── config/       # Configuraciones
│   │   ├── controllers/  # Controladores
│   │   ├── models/       # Modelos MongoDB
│   │   ├── routes/       # Rutas API
│   │   ├── middleware/   # Middlewares
│   │   ├── services/     # Servicios
│   │   └── ssl/          # Certificados SSL
│   └── views/            # Vistas HTML
├── public/               # Archivos estáticos
│   ├── css/             # Estilos
│   ├── js/              # JavaScript frontend
│   └── images/          # Imágenes
├── Dockerfile           # Configuración Docker
├── docker-compose.yml   # Docker Compose
└── coolify.yaml         # Configuración Coolify
```

## 🔧 Comandos Útiles

### Desarrollo
```bash
# Iniciar servidor de desarrollo
npm run dev

# Iniciar servidor de producción
npm start
```

### Docker
```bash
# Construir imagen
docker build -t katana-sushi .

# Ejecutar con Docker Compose
docker-compose up -d
```

## 📝 Notas Importantes

1. **Seguridad**: Los certificados SSL están protegidos en `.gitignore`
2. **Base de Datos**: Asegúrate de que tu IP esté en la whitelist de MongoDB Atlas
3. **Email**: Configura un email válido para el envío de notificaciones
4. **Dominio**: Configura CORS_ORIGIN con tu dominio real en producción

## 🆘 Soporte

Si tienes problemas con el despliegue:
1. Verifica las variables de entorno en Coolify
2. Revisa los logs del contenedor
3. Asegúrate de que los puertos estén correctamente configurados
4. Verifica la conectividad con MongoDB

## 📄 Licencia

Este proyecto es privado para Katana Sushi.
