// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Require authentication
    requireAuth();
    
    // Display user info
    displayUserInfo();
    initializeLogout();

    const user = getCurrentUser();
    document.getElementById('username').textContent = user.username;
    document.getElementById('userLevel').textContent = capitalizeFirst(user.englishLevel || user.level || 'beginner');

    // Load progress overview
    loadProgressOverview();
});

async function loadProgressOverview() {
    try {
        const response = await fetch(`${API_URL}/analytics/progress`, {
            headers: getAuthHeaders()
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || responseData.error || 'Unable to load progress data.');
        }

        const data = responseData.data || {};
        const userLevel = data.currentLevel || getCurrentUser()?.englishLevel || getCurrentUser()?.level || 'beginner';
        const byType = {};

        if (Array.isArray(data.byType)) {
            data.byType.forEach((item) => {
                byType[String(item.exercise_type || '').toLowerCase()] = Number(item.count || 0);
            });
        }

        document.getElementById('totalExercises').textContent = Number(data.totalExercises || 0);
        document.getElementById('averageScore').textContent = `${Number(data.averageScore || 0)}%`;
        document.getElementById('userLevel').textContent = capitalizeFirst(userLevel);

        document.getElementById('speakingCount').textContent = `${byType.speaking || 0} completed`;
        document.getElementById('writingCount').textContent = `${byType.writing || 0} completed`;
        document.getElementById('readingCount').textContent = `${byType.reading || 0} completed`;
    } catch (error) {
        console.error('Error loading progress:', error);
        document.getElementById('totalExercises').textContent = 0;
        document.getElementById('averageScore').textContent = '0%';
        document.getElementById('userLevel').textContent = capitalizeFirst(getCurrentUser()?.englishLevel || getCurrentUser()?.level || 'beginner');
        document.getElementById('speakingCount').textContent = '0 completed';
        document.getElementById('writingCount').textContent = '0 completed';
        document.getElementById('readingCount').textContent = '0 completed';
    }
}

function capitalizeFirst(str) {
    const value = String(str || 'beginner');
    return value.charAt(0).toUpperCase() + value.slice(1);
}
