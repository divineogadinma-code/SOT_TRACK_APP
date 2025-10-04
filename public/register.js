const registerForm = document.getElementById('register-form');
const errorMessage = document.getElementById('error-message');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.textContent = '';

    const name = registerForm.name.value;
    const username = registerForm.username.value;
    const password = registerForm.password.value;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Automatically set the role to 'worker' for security
            body: JSON.stringify({ name, username, password, role: 'worker' })
        });
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to register');
        }

        // Registration successful
        alert('Registration successful! Please sign in.');
        window.location.href = '/worker-login.html';

    } catch (error) {
        errorMessage.textContent = error.message;
    }
});