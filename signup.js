document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const messageBanner = document.getElementById('signup-message');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!name || !email || !password) {
            showMessage('All fields are required.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const result = await response.json();

            if (result.success) {
                showMessage('Registration successful! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                showMessage(result.message || 'An error occurred.', 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            showMessage('Failed to connect to the server.', 'error');
        }
    });

    function showMessage(message, type) {
        messageBanner.textContent = message;
        messageBanner.className = `message-banner ${type}`;
        messageBanner.style.display = 'block';
    }
}); 