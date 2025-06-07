document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registerForm');
    const togglePassword = document.querySelectorAll('.toggle-password');
    
    // Función para alternar la visibilidad de la contraseña
    togglePassword.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });

    // Validación y envío del formulario
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Obtener los valores del formulario
        const formData = {
            nombres: form.nombres.value.trim(),
            apellidos: form.apellidos.value.trim(),
            email: form.email.value.trim(),
            telefono: form.telefono.value.trim(),
            fechaNacimiento: form.fechaNacimiento.value,
            password: form.password.value,
            confirmPassword: form.confirmPassword.value
        };

        // Validar que las contraseñas coincidan
        if (formData.password !== formData.confirmPassword) {
            alert('Las contraseñas no coinciden');
            return;
        }

        // Validar el formato del correo electrónico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            alert('Por favor, ingresa un correo electrónico válido');
            return;
        }

        // Validar el formato del teléfono (10 dígitos)
        const phoneRegex = /^\d{8}$/;
        if (!phoneRegex.test(formData.telefono)) {
            alert('Por favor, ingresa un número de teléfono válido (8 dígitos)');
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre: formData.nombres, // Mapea el valor de 'nombres' a la clave 'nombre'
                    apellidos: formData.apellidos,
                    email: formData.email,
                    telefono: formData.telefono,
                    fechaNacimiento: formData.fechaNacimiento,
                    password: formData.password
                    // Puedes añadir otros campos aquí si los necesitas y los agregas al Schema/backend
                    // Ejemplo: apellidos: formData.apellidos,
                    // Ejemplo: fechaNacimiento: formData.fechaNacimiento
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Registro exitoso');
                window.location.href = '/login';
            } else {
                alert(data.message || 'Error en el registro');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error en el registro. Por favor, intenta nuevamente');
        }
    });
}); 