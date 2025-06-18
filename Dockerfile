# Usar Node.js 18 LTS
FROM node:18-alpine

# Instalar curl para health checks
RUN apk add --no-cache curl

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY src/server/package*.json ./src/server/

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorio SSL si no existe
RUN mkdir -p src/server/ssl

# Hacer el script de inicio ejecutable
RUN chmod +x start.sh

# Exponer puertos
EXPOSE 3000 3443

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000
ENV HTTPS_PORT=3443

# Comando para iniciar la aplicación
CMD ["./start.sh"] 