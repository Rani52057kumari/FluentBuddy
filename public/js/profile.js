// Profile management
let currentProfile = null;

// Check authentication on page load
if (!isLoggedIn()) {
    window.location.href = '/';
}

// Load profile data
async function loadProfile() {
    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const profile = await response.json();
            currentProfile = profile;
            displayProfile(profile);
            await loadStats();
        } else {
            showAlert('Failed to load profile', 'error');
        }
    } catch (error) {
        showAlert('Connection error', 'error');
    }
}

// Display profile data
function displayProfile(profile) {
    document.getElementById('profileName').textContent = profile.username;
    document.getElementById('profileEmail').textContent = profile.email;
    document.getElementById('username').value = profile.username;
    document.getElementById('email').value = profile.email;
    document.getElementById('bio').value = profile.bio || '';
    document.getElementById('currentLevel').textContent = capitalizeFirst(profile.level);

    // Display profile photo
    if (profile.profile_photo) {
        document.getElementById('profilePhoto').src = profile.profile_photo;
        document.getElementById('profilePhoto').style.display = 'block';
        document.getElementById('profilePhotoPlaceholder').style.display = 'none';
    } else {
        document.getElementById('profilePhoto').style.display = 'none';
        document.getElementById('profilePhotoPlaceholder').style.display = 'flex';
    }

    // Format member since date
    const memberSince = new Date(profile.created_at);
    document.getElementById('memberSince').textContent = `Member since ${memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
}

// Load user statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/progress/user`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const progress = await response.json();
            displayStats(progress);
        }
    } catch (error) {
        console.error('Failed to load stats', error);
    }
}

// Display statistics
function displayStats(progress) {
    const total = progress.length;
    const completed = progress.filter(p => p.completed).length;
    
    // Calculate average score
    let totalScore = 0;
    let scoreCount = 0;
    progress.forEach(p => {
        if (p.score !== null && p.score !== undefined) {
            totalScore += p.score;
            scoreCount++;
        }
    });
    const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    document.getElementById('totalExercises').textContent = total;
    document.getElementById('completedExercises').textContent = completed;
    document.getElementById('averageScore').textContent = `${averageScore}%`;
}

// Handle profile form submission
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const bio = document.getElementById('bio').value;
    const profile_photo = currentProfile.profile_photo;

    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ username, bio, profile_photo })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('Profile updated successfully!', 'success');
            currentProfile = data.user;
            displayProfile(data.user);
            
            // Update localStorage
            const user = getCurrentUser();
            user.username = data.user.username;
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            showAlert(data.error || 'Failed to update profile', 'error');
        }
    } catch (error) {
        showAlert('Connection error', 'error');
    }
});

// Handle file upload
document.getElementById('photoInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showAlert('Image size should be less than 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = event.target.result;
            currentProfile.profile_photo = imageData;
            document.getElementById('profilePhoto').src = imageData;
            document.getElementById('profilePhoto').style.display = 'block';
            document.getElementById('profilePhotoPlaceholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
});

// Handle avatar selection
document.querySelectorAll('.photo-option').forEach(option => {
    option.addEventListener('click', (e) => {
        const avatarSeed = e.target.dataset.avatar;
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;
        
        // Remove selected class from all options
        document.querySelectorAll('.photo-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Add selected class to clicked option
        e.target.classList.add('selected');
        
        // Update profile photo
        currentProfile.profile_photo = avatarUrl;
        document.getElementById('profilePhoto').src = avatarUrl;
        document.getElementById('profilePhoto').style.display = 'block';
        document.getElementById('profilePhotoPlaceholder').style.display = 'none';
    });
});

// Show alert message
function showAlert(message, type) {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.textContent = message;
    alertDiv.className = `alert alert-${type} show`;
    
    setTimeout(() => {
        alertDiv.classList.remove('show');
    }, 5000);
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Capitalize first letter
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Load profile on page load
loadProfile();
