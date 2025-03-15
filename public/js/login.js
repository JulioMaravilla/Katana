// Toggle password visibility
document.querySelector('.toggle-password').addEventListener('click', function() {
    const passwordInput = this.previousElementSibling;
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

// Form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password'),
        remember: formData.get('remember') === 'on'
    };

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const data = await response.json();

        if (response.ok) {
            // Guardar el token si existe
            if (data.token) {
                localStorage.setItem('token', data.token);
            }
            window.location.href = '/';
        } else {
            alert(data.message || 'Error en el inicio de sesión');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error en el inicio de sesión');
    }
});

// Social login handlers
document.querySelector('.social-btn.google').addEventListener('click', () => {
    window.location.href = '/api/auth/google';
});

document.querySelector('.social-btn.facebook').addEventListener('click', () => {
    window.location.href = '/api/auth/facebook';
}); 