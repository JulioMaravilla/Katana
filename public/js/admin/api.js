/**
 * @file admin/api.js
 * @module AdminAPI
 * @description Módulo centralizado para realizar llamadas a la API del backend del panel de administración.
 * Maneja la inclusión automática del token de autenticación y la gestión de errores comunes.
 */

// Se importa la función de logout para poder cerrar la sesión automáticamente si el token expira.
// NOTA: Esto creará una dependencia circular temporal que se resolverá cuando creemos auth.js.
import { adminLogout } from './auth.js';

const ADMIN_AUTH_KEY = 'adminAuthToken';
const API_BASE = '/api';

/**
 * Realiza una llamada a un endpoint de la API de administración.
 * Incluye automáticamente el token de autenticación en los encabezados.
 *
 * @param {string} endpoint - El endpoint de la API al que se llamará (ej. '/admin/orders').
 * @param {string} [method='GET'] - El método HTTP a utilizar (GET, POST, PUT, DELETE, etc.).
 * @param {object|FormData|null} [body=null] - El cuerpo de la solicitud para métodos POST, PUT, etc.
 * @param {boolean} [requireAuth=true] - Indica si la llamada requiere un token de autenticación.
 * @returns {Promise<object>} Un objeto con la respuesta: { success: boolean, data: any, message: string|null, token?: string }.
 */
export async function makeAdminApiCall(endpoint, method = 'GET', body = null, requireAuth = true) {
    const headers = {};
    const config = {
        method: method.toUpperCase(),
        headers: headers
    };

    // Añadir token de autenticación si es necesario
    if (requireAuth) {
        const token = sessionStorage.getItem(ADMIN_AUTH_KEY);
        if (!token) {
            console.error(`Error: Token de admin no encontrado para ${method} ${endpoint}`);
            // Si no hay token y es requerido, no tiene sentido continuar.
            adminLogout(); // Forzar logout si el token falta en una llamada protegida.
            return { success: false, message: 'No autenticado.', data: null };
        }
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Configurar el cuerpo de la solicitud
    if (body) {
        if (body instanceof FormData) {
            // FormData establece su propio Content-Type con el boundary correcto.
            config.body = body;
        } else {
            headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(body);
        }
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const responseData = await response.json().catch(() => ({})); // Evitar error si la respuesta no es JSON

        if (response.ok) {
            // Devuelve un objeto estandarizado para éxito
            return {
                success: true,
                data: responseData.data || responseData,
                message: responseData.message,
                token: responseData.token // Útil para el login
            };
        } else {
            // Manejo estandarizado de errores del servidor
            let errorMessage = responseData.message || `Error ${response.status}: ${response.statusText}`;
            console.error(`API Admin Call Error (${config.method} ${endpoint}): Status ${response.status}, Message: ${errorMessage}`, responseData);
            
            // Si el token es inválido o expiró, cerrar sesión
            if (response.status === 401 || response.status === 403) {
                errorMessage = 'Sesión inválida o expirada.';
                adminLogout();
            }
            
            return { success: false, message: errorMessage, data: null };
        }
    } catch (error) {
        // Manejo de errores de red o fetch
        console.error(`Network/Fetch Error (${config.method} ${endpoint}):`, error);
        return { success: false, message: 'Error de red o conexión al servidor.', data: null };
    }
}
