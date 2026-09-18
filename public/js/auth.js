// Always use the correct backend port
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api'
    : '/api';

function normalizeIdentifier(identifier) {
    const value = (identifier || '').trim();
    if (!value) return { error: 'Please enter a valid email or phone number.' };

    const isEmail = value.includes('@');
    if (isEmail) return { email: value };
    return { phone: value.replace(/\D/g, '') };
}

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('token') !== null;
}

// Get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Set authentication headers
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

async function sendOtpRequest(identifier, purpose) {
    try {
        const normalized = normalizeIdentifier(identifier);
        if (normalized.error) {
            return { success: false, error: normalized.error };
        }

        const response = await fetch(`${API_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...normalized, purpose })
        });

        const data = await response.json();
        if (!response.ok) {
            return { success: false, error: data.message || 'Unable to send OTP.' };
        }

        return { success: true, otp: data.otp, message: data.message };
    } catch (error) {
        return { success: false, error: 'Connection error. Please try again.' };
    }
}

async function verifyOtpRequest(identifier, otp, purpose) {
    try {
        const normalized = normalizeIdentifier(identifier);
        if (normalized.error) {
            return { success: false, error: normalized.error };
        }

        const response = await fetch(`${API_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...normalized, otp, purpose })
        });

        const data = await response.json();
        if (!response.ok) {
            return { success: false, error: data.message || 'OTP verification failed.' };
        }

        return { success: true, message: data.message };
    } catch (error) {
        return { success: false, error: 'Connection error. Please try again.' };
    }
}

// Login function
async function login(identifier, password, otp) {
    try {
        const normalized = normalizeIdentifier(identifier);
        if (normalized.error) {
            return { success: false, error: normalized.error };
        }

        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...normalized, password, otp })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            return { success: true, user: data.user };
        } else {
            return { success: false, error: data.message || data.error || 'Something went wrong.' };
        }
    } catch (error) {
        return { success: false, error: 'Connection error. Please try again.' };
    }
}

// Register function
async function register(username, identifier, password, level, otp) {
    try {
        const normalized = normalizeIdentifier(identifier);
        if (normalized.error) {
            return { success: false, error: normalized.error };
        }

        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: username,
                username,
                ...normalized,
                password,
                level,
                otp
            })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            return { success: true, user: data.user };
        } else {
            return { success: false, error: data.message || data.error || 'Something went wrong.' };
        }
    } catch (error) {
        return { success: false, error: 'Connection error. Please try again.' };
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Redirect to dashboard if logged in (for index page)
function redirectIfLoggedIn() {
    if (isLoggedIn()) {
        window.location.href = '/dashboard';
    }
}

// Redirect to login if not logged in (for protected pages)
function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = '/';
    }
}

// Display user info in navigation
function displayUserInfo() {
    const user = getCurrentUser();
    if (user) {
        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay) {
            userDisplay.textContent = user.username;
        }
    }
}

// Initialize logout button
function initializeLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}
