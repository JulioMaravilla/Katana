# Configuración de Certificados SSL/TLS

Esta carpeta es donde debes colocar tus certificados SSL/TLS para habilitar HTTPS en el servidor.

## Archivos Requeridos

Coloca los siguientes archivos en esta carpeta:

- `cert.pem` - El certificado SSL/TLS
- `key.pem` - La clave privada del certificado

## Opciones de Configuración

### Opción 1: Certificados en esta carpeta (Recomendado para desarrollo)
Simplemente coloca los archivos `cert.pem` y `key.pem` en esta carpeta y el servidor los detectará automáticamente.

### Opción 2: Variables de entorno (Recomendado para producción)
Configura las siguientes variables en tu archivo `.env`:

```env
SSL_CERT_PATH=/ruta/completa/a/tu/certificado.pem
SSL_KEY_PATH=/ruta/completa/a/tu/clave-privada.pem
HTTPS_PORT=443
```

## Puertos

- **HTTP**: Puerto 3000 (por defecto)
- **HTTPS**: Puerto 3443 (por defecto) o el especificado en `HTTPS_PORT`

## Notas Importantes

1. **Seguridad**: Nunca subas los archivos de certificados al control de versiones
2. **Permisos**: Asegúrate de que los archivos tengan los permisos correctos (solo lectura para el certificado, permisos restringidos para la clave)
3. **Formato**: Los certificados deben estar en formato PEM
4. **Renovación**: Recuerda renovar los certificados antes de que expiren

## Para Desarrollo Local

Si necesitas certificados para desarrollo local, puedes generar certificados autofirmados:

```bash
# Generar certificado autofirmado (solo para desarrollo)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

**⚠️ Advertencia**: Los certificados autofirmados mostrarán advertencias de seguridad en el navegador. Solo úsalos para desarrollo. 