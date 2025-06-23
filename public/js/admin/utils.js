/**
 * @file admin/utils.js
 * @module AdminUtils
 * @description Contiene funciones de utilidad reutilizables para el panel de administración.
 */

/**
 * Valida si una cadena de texto es una URL HTTP/HTTPS válida.
 * @param {string} string - La cadena a validar.
 * @returns {boolean} - True si es una URL válida, de lo contrario false.
 */
export function isValidHttpUrl(string) {
    let url;
    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }
    return url.protocol === "http:" || url.protocol === "https";
}

/**
 * Formatea una fecha a un formato de tiempo relativo (ej. "hace 5 min", "ayer").
 * @param {Date} date - El objeto de fecha a formatear.
 * @returns {string} - La cadena de texto con el tiempo relativo.
 */
export function formatRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.round((now - date) / 1000);

    if (diffInSeconds < 60) return `hace segundos`;

    const diffInMinutes = Math.round(diffInSeconds / 60);
    if (diffInMinutes < 60) return `hace ${diffInMinutes} min`;

    const diffInHours = Math.round(diffInMinutes / 60);
    if (diffInHours < 24) return `hace ${diffInHours} hr`;

    const diffInDays = Math.round(diffInHours / 24);
    if (diffInDays === 1) return `ayer`;
    if (diffInDays < 7) return `hace ${diffInDays} días`;

    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
