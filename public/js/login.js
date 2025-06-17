// Toggle password visibility
document.querySelector('.toggle-password').addEventListener('click', function () {
    const passwordInput = this.previousElementSibling;
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

// Form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginMessage = document.getElementById('loginMessage') || {
        textContent: '',
        style: {}
    };
    loginMessage.textContent = '';

    const formData = new FormData(e.target);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Iniciando...';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const data = await response.json();

        if (response.ok) {
            // Guardar el token y datos del usuario
            if (data.token) {
                localStorage.setItem('token', data.token);
            }
            if (data.user) {
                localStorage.setItem('userInfo', JSON.stringify(data.user));
            }

            loginMessage.textContent = '¡Inicio de sesión exitoso! Redirigiendo...';
            loginMessage.style.color = 'green';

            // Redirigir al dashboard
            window.location.href = '/dashboard';
        } else {
            // Mostrar el mensaje de error del servidor
            loginMessage.textContent = data.message || 'Error en el inicio de sesión';
            loginMessage.style.color = '#dc3545'; // Color rojo para errores
            submitButton.disabled = false;
            submitButton.textContent = 'Iniciar Sesión';
        }
    } catch (error) {
        console.error('Error:', error);
        loginMessage.textContent = 'Error de conexión. Intenta nuevamente.';
        loginMessage.style.color = '#dc3545';
        submitButton.disabled = false;
        submitButton.textContent = 'Iniciar Sesión';
    }
});

// Social login handlers
document.querySelector('.social-btn.google').addEventListener('click', () => {
    window.location.href = '/api/auth/google';
});

document.querySelector('.social-btn.facebook').addEventListener('click', () => {
    window.location.href = '/api/auth/facebook';
});