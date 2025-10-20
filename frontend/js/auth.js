/**
 * Authentication Handler for Login Page
 */

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const eyeOpen = document.querySelector('.eye-open');
    const eyeClosed = document.querySelector('.eye-closed');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = 'block';
    } else {
        passwordInput.type = 'password';
        eyeOpen.style.display = 'block';
        eyeClosed.style.display = 'none';
    }
}

// Show/hide error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const successDiv = document.getElementById('successMessage');
    
    successDiv.style.display = 'none';
    errorText.textContent = message;
    errorDiv.style.display = 'flex';
    
    // Shake animation
    const form = document.getElementById('loginForm');
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 500);
}

// Show success message
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    const successText = document.getElementById('successText');
    const errorDiv = document.getElementById('errorMessage');
    
    errorDiv.style.display = 'none';
    successText.textContent = message;
    successDiv.style.display = 'flex';
}

// Hide all messages
function hideMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

// Login form submission
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn.querySelector('.btn-text');
    const spinner = loginBtn.querySelector('.spinner');
    
    // Validation
    if (!username || !password) {
        showError('Please enter both username and password');
        return;
    }
    
    // Show loading state
    loginBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'flex';
    hideMessages();
    
    try {
        // Attempt login
        const response = await api.login(username, password);
        
        if (response.success) {
            // Save remember me preference
            if (rememberMe) {
                localStorage.setItem('rememberedUsername', username);
            } else {
                localStorage.removeItem('rememberedUsername');
            }
            
            // Save user info
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            
            // Show success message
            showSuccess('Login successful! Redirecting...');
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            showError(response.message || 'Login failed');
            resetButton();
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'An error occurred during login. Please try again.');
        resetButton();
    }
    
    function resetButton() {
        loginBtn.disabled = false;
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
    }
});

// Show registration modal
function showRegistration(event) {
    if (event) event.preventDefault();
    document.getElementById('registrationModal').style.display = 'flex';
    document.getElementById('reg-username').focus();
}

// Close registration modal
function closeRegistration() {
    document.getElementById('registrationModal').style.display = 'none';
    document.getElementById('registrationForm').reset();
    document.getElementById('regErrorMessage').style.display = 'none';
}

// Registration form submission
document.getElementById('registrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    
    const errorDiv = document.getElementById('regErrorMessage');
    const errorText = document.getElementById('regErrorText');
    
    // Validation
    if (password !== confirmPassword) {
        errorText.textContent = 'Passwords do not match';
        errorDiv.style.display = 'flex';
        return;
    }
    
    if (password.length < 6) {
        errorText.textContent = 'Password must be at least 6 characters';
        errorDiv.style.display = 'flex';
        return;
    }
    
    errorDiv.style.display = 'none';
    
    try {
        const response = await api.register(username, email, password);
        
        if (response.success) {
            closeRegistration();
            showSuccess('Registration successful! You can now log in.');
            
            // Pre-fill username
            document.getElementById('username').value = username;
        } else {
            errorText.textContent = response.message || 'Registration failed';
            errorDiv.style.display = 'flex';
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        errorText.textContent = error.message || 'An error occurred during registration';
        errorDiv.style.display = 'flex';
    }
});

// Show forgot password (placeholder)
function showForgotPassword(event) {
    event.preventDefault();
    alert('Password reset functionality will be implemented soon. Please contact the administrator.');
}

// Close modal on outside click
window.addEventListener('click', function(event) {
    const modal = document.getElementById('registrationModal');
    if (event.target === modal) {
        closeRegistration();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeRegistration();
    }
});

// Load remembered username on page load
window.addEventListener('DOMContentLoaded', () => {
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername) {
        document.getElementById('username').value = rememberedUsername;
        document.getElementById('rememberMe').checked = true;
        document.getElementById('password').focus();
    }
    
    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
        // Verify token is still valid
        api.getCurrentUser()
            .then(() => {
                window.location.href = '/dashboard.html';
            })
            .catch(() => {
                // Token invalid, stay on login page
                api.clearToken();
            });
    }
});