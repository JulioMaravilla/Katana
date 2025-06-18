#!/bin/bash

# Script de inicio para producción
echo "🚀 Iniciando Katana Sushi..."

# Verificar si las variables de entorno están configuradas
if [ -z "$MONGODB_URI" ]; then
    echo "❌ Error: MONGODB_URI no está configurada"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ Error: JWT_SECRET no está configurada"
    exit 1
fi

# Verificar si los certificados SSL están disponibles
if [ -n "$SSL_CERT_PATH" ] && [ -n "$SSL_KEY_PATH" ]; then
    if [ -f "$SSL_CERT_PATH" ] && [ -f "$SSL_KEY_PATH" ]; then
        echo "✅ Certificados SSL encontrados"
        echo "🔒 Iniciando servidor HTTPS..."
    else
        echo "⚠️  Certificados SSL no encontrados en las rutas especificadas"
        echo "🌐 Iniciando servidor HTTP..."
    fi
else
    # Verificar certificados por defecto
    if [ -f "src/server/ssl/cert.pem" ] && [ -f "src/server/ssl/key.pem" ]; then
        echo "✅ Certificados SSL encontrados en ubicación por defecto"
        echo "🔒 Iniciando servidor HTTPS..."
    else
        echo "🌐 Iniciando servidor HTTP..."
    fi
fi

# Iniciar la aplicación
echo "📱 Aplicación disponible en:"
echo "   - HTTP:  http://localhost:${PORT:-3000}"
echo "   - HTTPS: https://localhost:${HTTPS_PORT:-3443}"
echo "   - Admin: http://localhost:${PORT:-3000}/admin"

# Ejecutar la aplicación
exec node src/server/server.js 