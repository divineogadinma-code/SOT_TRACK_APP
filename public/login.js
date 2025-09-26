const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent the form from reloading the page
    errorMessage.textContent = ''; // Clear previous errors

    const username = loginForm.username.value;
    const password = loginForm.password.value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to login');
        }

        // Login successful, save the token and redirect
        localStorage.setItem('token', data.token);

        // In login.js, inside the 'if (!response.ok)' block

if (data.role === 'admin') {
    window.location.href = '/admin-dashboard.html'; // UPDATED
} else {
    window.location.href = `/worker-dashboard.html?id=${data.userId}`; // UPDATED
}
    } catch (error) {
        errorMessage.textContent = error.message;
    }
});