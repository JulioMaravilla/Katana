// Cookie Manager para Katana Sushi
const CookieManager = {
    // Tipos de cookies
    COOKIE_TYPES: {
        NECESSARY: 'necessary',
        ANALYTICS: 'analytics',
        FUNCTIONAL: 'functional',
        MARKETING: 'marketing'
    },

    // Estado de consentimiento
    consentState: {
        necessary: true, // Siempre true ya que son necesarias
        analytics: false,
        functional: false,
        marketing: false
    },

    // Inicialización
    init() {
        this.loadConsentState();
        this.setupEventListeners();
        this.showBannerIfNeeded();
    },

    // Cargar estado de consentimiento guardado
    loadConsentState() {
        const savedState = localStorage.getItem('cookieConsent');
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                this.consentState = { ...this.consentState, ...parsedState };
            } catch (e) {
                console.error('Error al cargar el estado de cookies:', e);
            }
        }
    },

    // Guardar estado de consentimiento
    saveConsentState() {
        localStorage.setItem('cookieConsent', JSON.stringify(this.consentState));
    },

    // Configurar event listeners
    setupEventListeners() {
        const acceptBtn = document.getElementById('acceptCookies');
        const rejectBtn = document.getElementById('rejectCookies');

        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => this.acceptAllCookies());
        }

        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => this.rejectNonEssentialCookies());
        }
    },

    // Mostrar banner si es necesario
    showBannerIfNeeded() {
        const banner = document.getElementById('cookieBanner');
        if (banner && !localStorage.getItem('cookieConsent')) {
            banner.style.display = 'block';
        }
    },

    // Aceptar todas las cookies
    acceptAllCookies() {
        Object.keys(this.consentState).forEach(key => {
            this.consentState[key] = true;
        });
        this.saveConsentState();
        this.hideBanner();
        this.initializeCookies();
    },

    // Rechazar cookies no esenciales
    rejectNonEssentialCookies() {
        Object.keys(this.consentState).forEach(key => {
            if (key !== 'necessary') {
                this.consentState[key] = false;
            }
        });
        this.saveConsentState();
        this.hideBanner();
        this.initializeCookies();
    },

    // Ocultar banner
    hideBanner() {
        const banner = document.getElementById('cookieBanner');
        if (banner) {
            banner.style.display = 'none';
        }
    },

    // Inicializar cookies según el consentimiento
    initializeCookies() {
        // Cookies necesarias (siempre activas)
        this.initializeNecessaryCookies();

        // Cookies de análisis
        if (this.consentState.analytics) {
            this.initializeAnalyticsCookies();
        }

        // Cookies funcionales
        if (this.consentState.functional) {
            this.initializeFunctionalCookies();
        }

        // Cookies de marketing
        if (this.consentState.marketing) {
            this.initializeMarketingCookies();
        }
    },

    // Inicializar cookies necesarias
    initializeNecessaryCookies() {
        // Implementar cookies necesarias para el funcionamiento básico
        // Por ejemplo, sesión de usuario, carrito de compras, etc.
    },

    // Inicializar cookies de análisis
    initializeAnalyticsCookies() {
        // Implementar Google Analytics u otras herramientas de análisis
        // Ejemplo:
        // gtag('consent', 'update', {
        //     'analytics_storage': 'granted'
        // });
    },

    // Inicializar cookies funcionales
    initializeFunctionalCookies() {
        // Implementar cookies para funcionalidades adicionales
        // Por ejemplo, preferencias de usuario, temas, etc.
    },

    // Inicializar cookies de marketing
    initializeMarketingCookies() {
        // Implementar cookies de marketing si se necesitan
        // Por ejemplo, remarketing, publicidad, etc.
    },

    // Verificar si un tipo de cookie está permitido
    isCookieAllowed(type) {
        return this.consentState[type] === true;
    },

    // Obtener estado actual de consentimiento
    getConsentState() {
        return { ...this.consentState };
    }
};

// Inicializar el gestor de cookies cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    CookieManager.init();
}); 