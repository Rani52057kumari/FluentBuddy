// Profile management
let currentProfile = null;

if (!isLoggedIn()) {
    window.location.href = '/';
}

async function loadProfile() {
    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: getAuthHeaders(),
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error || 'Failed to load profile');
        }

        const profile = result.user || result;
        currentProfile = profile;
        displayProfile(profile);
        await loadStats();
    } catch (error) {
        console.error('Failed to load profile', error);
        showAlert('Unable to load profile data.', 'error');
    }
}

function displayProfile(profile) {
    const userName = profile.name || profile.username || 'User';
    const level = profile.englishLevel || profile.level || 'Beginner';
    const photoUrl = profile.profilePhoto || profile.profile_photo || '';
    const createdAt = profile.createdAt || profile.created_at;

    document.getElementById('profileName').textContent = userName;
    document.getElementById('profileEmail').textContent = profile.email || 'No email provided';
    document.getElementById('username').value = userName;
    document.getElementById('email').value = profile.email || '';
    document.getElementById('bio').value = profile.bio || '';
    document.getElementById('currentLevel').textContent = capitalizeFirst(level);

    if (photoUrl) {
        const photo = document.getElementById('profilePhoto');
        const placeholder = document.getElementById('profilePhotoPlaceholder');
        photo.src = photoUrl;
        photo.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        document.getElementById('profilePhoto').style.display = 'none';
        document.getElementById('profilePhotoPlaceholder').style.display = 'flex';
    }

    if (createdAt) {
        const memberSince = new Date(createdAt);
        document.getElementById('memberSince').textContent = `Member since ${memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    } else {
        document.getElementById('memberSince').textContent = 'Member';
    }
}

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/analytics/progress`, {
            headers: getAuthHeaders(),
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error || 'Unable to load stats');
        }

        const payload = result.data || {};
        const total = Number(payload.totalExercises || 0);
        const averageScore = Number(payload.averageScore || 0);
        const level = payload.currentLevel || currentProfile?.englishLevel || currentProfile?.level || 'Beginner';

        document.getElementById('totalExercises').textContent = total;
        document.getElementById('completedExercises').textContent = total;
        document.getElementById('averageScore').textContent = `${averageScore}%`;
        document.getElementById('currentLevel').textContent = capitalizeFirst(level);
    } catch (error) {
        console.error('Failed to load stats', error);
        document.getElementById('totalExercises').textContent = 0;
        document.getElementById('completedExercises').textContent = 0;
        document.getElementById('averageScore').textContent = '0%';
        document.getElementById('currentLevel').textContent = 'Beginner';
    }
}

async function updateProfileRequest() {
    const username = document.getElementById('username').value.trim();
    const bio = document.getElementById('bio').value.trim();
    const profilePhoto = currentProfile?.profilePhoto || currentProfile?.profile_photo || '';

    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'PUT',
            headers: Object.assign({'Content-Type':'application/json'}, getAuthHeaders()),
            body: JSON.stringify({ username, bio, profilePhoto }),
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to update profile');
        }

        currentProfile = data.user;
        displayProfile(data.user);
        showAlert('Profile updated successfully!', 'success');

        const user = getCurrentUser();
        if (user) {
            user.username = data.user.username || data.user.name;
            user.englishLevel = data.user.englishLevel || data.user.level || user.englishLevel;
            user.level = data.user.level || user.level;
            localStorage.setItem('user', JSON.stringify(user));
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showAlert(error.message || 'Failed to update profile', 'error');
    }
}

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateProfileRequest();
});

document.getElementById('photoInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showAlert('Image size should be less than 5MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const imageData = event.target.result;
        const photo = document.getElementById('profilePhoto');
        const placeholder = document.getElementById('profilePhotoPlaceholder');

        currentProfile = currentProfile || {};
        currentProfile.profilePhoto = imageData;
        currentProfile.profile_photo = imageData;
        photo.src = imageData;
        photo.style.display = 'block';
        placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
});

document.querySelectorAll('.photo-option').forEach((option) => {
    option.addEventListener('click', (e) => {
        const avatarSeed = e.target.dataset.avatar;
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

        document.querySelectorAll('.photo-option').forEach((opt) => {
            opt.classList.remove('selected');
        });

        e.target.classList.add('selected');

        const photo = document.getElementById('profilePhoto');
        const placeholder = document.getElementById('profilePhotoPlaceholder');
        currentProfile = currentProfile || {};
        currentProfile.profilePhoto = avatarUrl;
        currentProfile.profile_photo = avatarUrl;
        photo.src = avatarUrl;
        photo.style.display = 'block';
        placeholder.style.display = 'none';
    });
});

function showAlert(message, type) {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.textContent = message;
    alertDiv.className = `alert alert-${type} show`;

    setTimeout(() => {
        alertDiv.classList.remove('show');
    }, 5000);
}

function capitalizeFirst(str) {
    const value = String(str || 'Beginner');
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

loadProfile();
