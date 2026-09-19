// Main page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Redirect if already logged in
    redirectIfLoggedIn();

    // Get modal elements
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    
    // Get button elements
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const getStartedBtn = document.getElementById('getStartedBtn');
    const sendSignupOtpBtn = document.getElementById('sendSignupOtpBtn');
    
    // Get close buttons
    const closeBtns = document.getElementsByClassName('close');
    
    // Get forms
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    // Switch links
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToLogin = document.getElementById('switchToLogin');

    // Open login modal
    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'block';
    });

    // Open signup modal
    signupBtn.addEventListener('click', () => {
        signupModal.style.display = 'block';
    });

    getStartedBtn.addEventListener('click', () => {
        signupModal.style.display = 'block';
    });

    // Close modals
    Array.from(closeBtns).forEach(btn => {
        btn.addEventListener('click', function() {
            loginModal.style.display = 'none';
            signupModal.style.display = 'none';
        });
    });

    // Switch between login and signup
    switchToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginModal.style.display = 'none';
        signupModal.style.display = 'block';
    });

    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        signupModal.style.display = 'none';
        loginModal.style.display = 'block';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
        if (e.target === signupModal) {
            signupModal.style.display = 'none';
        }
    });

    sendSignupOtpBtn.addEventListener('click', async () => {
        const identifier = document.getElementById('signupIdentifier').value;
        if (!identifier.trim()) {
            alert('Please enter your email or phone number first.');
            return;
        }

        const result = await sendOtpRequest(identifier, 'signup');
        if (result.success) {
            alert(result.message || 'OTP sent successfully.');
        } else {
            alert(result.error || 'Unable to send OTP.');
        }
    });

    // Handle login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const identifier = document.getElementById('loginIdentifier').value;
        const password = document.getElementById('loginPassword').value;

        const result = await login(identifier, password);
        
        if (result.success) {
            window.location.href = '/dashboard';
        } else {
            const errorMessage = result.error || result.message || 'Something went wrong.';
            if (errorMessage.includes('No account found')) {
                alert('❌ Account not found!\n\n' + 
                      'This email/phone is not registered yet.\n' + 
                      'Please click "Sign up" to create an account first.\n\n' +
                      'पहले Sign Up करें!');
            } else {
                alert(errorMessage);
            }
        }
    });

    // Handle signup form submission
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('signupUsername').value;
        const identifier = document.getElementById('signupIdentifier').value;
        const password = document.getElementById('signupPassword').value;
        const otp = document.getElementById('signupOtp').value;
        const level = document.getElementById('signupLevel').value;

        if (!otp.trim()) {
            alert('Please enter the OTP received via email or phone before creating your account.');
            return;
        }

        const result = await register(username, identifier, password, level, otp);
        
        if (result.success) {
            window.location.href = '/dashboard';
        } else {
            const errorMessage = result.error || result.message || 'Something went wrong.';
            if (errorMessage.includes('already exists')) {
                alert('✅ Good news! This email or phone is already registered.\n\n' + 
                      'Please use "Login" button to sign in.\n\n' +
                      'Click the Login button!');
            } else {
                alert(errorMessage);
            }
        }
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Password toggle function
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const toggle = input.nextElementSibling;
    
    if (input.type === 'password') {
        input.type = 'text';
        toggle.textContent = '🙈';
    } else {
        input.type = 'password';
        toggle.textContent = '👁️';
    }
}

// Google Sign In
async function loginWithGoogle() {
    const googleEmail = prompt('Enter your Google email:');
    if (!googleEmail) return;

    try {
        const response = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: googleEmail,
                name: googleEmail.split('@')[0],
                googleId: `google-demo-${Date.now()}`
            })
        });

        const data = await response.json();
        if (!response.ok) {
            alert(data.message || 'Google login failed.');
            return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/dashboard';
    } catch (error) {
        alert('Google login failed. Please try again.');
    }
}

async function signupWithGoogle() {
    return loginWithGoogle();
}
