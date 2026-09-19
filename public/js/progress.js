let progressChart;

document.addEventListener('DOMContentLoaded', function() {
    requireAuth();
    displayUserInfo();
    initializeLogout();
    loadAnalyticsProgress();
});

async function loadAnalyticsProgress() {
    try {
        const response = await fetch(`${API_URL}/analytics/progress`, {
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Unable to load progress data.');
        }

        const payload = data.data || {};
        const recent = payload.recentFeedback || [];
        const totalExercises = Number(payload.totalExercises || 0);
        const averageGrammarScore = Number(payload.averageGrammarScore || 0);
        const averageVocabularyScore = Number(payload.averageVocabularyScore || 0);
        const currentLevel = payload.currentLevel || getCurrentUser()?.englishLevel || getCurrentUser()?.level || 'Beginner';

        document.getElementById('totalSessions').textContent = totalExercises;
        document.getElementById('averageGrammarScore').textContent = `${averageGrammarScore}%`;
        document.getElementById('averageVocabularyScore').textContent = `${averageVocabularyScore}%`;
        document.getElementById('currentEnglishLevel').textContent = capitalizeFirst(currentLevel || 'Beginner');

        renderRecentActivity(recent);
        renderTrendChart(recent);
    } catch (error) {
        console.error('Error loading analytics:', error);
        document.getElementById('activityTableBody').innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">Unable to load your progress data right now.</td>
            </tr>
        `;
    }
}

function renderRecentActivity(items) {
    const tbody = document.getElementById('activityTableBody');

    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">No recent practice activity yet.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map(item => {
        const score = Math.max(0, Number(item.score ?? item.grammarScore ?? item.vocabularyScore ?? 0));
        const inputSnippet = item.feedback ? truncateText(item.feedback, 50) : (item.title ? truncateText(item.title, 50) : 'No input recorded');
        const date = formatDate(item.completed_at || item.createdAt);

        return `
            <tr>
                <td>${escapeHtml(item.exercise_type || item.sessionType || 'Practice')}</td>
                <td>${escapeHtml(inputSnippet)}</td>
                <td>${score}</td>
                <td>${escapeHtml(date)}</td>
            </tr>
        `;
    }).join('');
}

function renderTrendChart(items) {
    const canvas = document.getElementById('progressChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const chartItems = [...(items || [])].reverse();

    if (chartItems.length === 0) {
        return;
    }

    const labels = chartItems.map(item => formatShortDate(item.createdAt));
    const grammarData = chartItems.map(item => Number(item.grammarScore || 0));
    const vocabularyData = chartItems.map(item => Number(item.vocabularyScore || 0));

    if (progressChart) {
        progressChart.destroy();
    }

    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Grammar',
                    data: grammarData,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.14)',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true,
                },
                {
                    label: 'Vocabulary',
                    data: vocabularyData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.14)',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true,
                }
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: 100,
                    ticks: {
                        callback: (value) => `${value}%`,
                    },
                },
            },
        },
    });
}

function truncateText(value, limit) {
    const text = String(value || '').trim();
    if (text.length <= limit) return text;
    return `${text.slice(0, limit).trim()}...`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatShortDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}

function capitalizeFirst(str) {
    return !str ? 'Beginner' : str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}
