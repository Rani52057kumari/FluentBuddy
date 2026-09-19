// Writing practice functionality
let currentLevel = 'beginner';
let currentExercise = null;

document.addEventListener('DOMContentLoaded', function() {
    requireAuth();
    displayUserInfo();
    initializeLogout();

    setupAiWorkspace();

    // Level selector
    const levelBtns = document.querySelectorAll('.level-btn');
    levelBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            levelBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentLevel = this.dataset.level;
            loadExercises();
        });
    });

    // Modal controls
    const modal = document.getElementById('exerciseModal');
    const closeBtn = modal.querySelector('.close');

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        resetExercise();
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            resetExercise();
        }
    });

    // Writing input with word count
    const writingInput = document.getElementById('writingInput');
    writingInput.addEventListener('input', updateWritingStats);

    // Submit button
    document.getElementById('submitWriting').addEventListener('click', submitWriting);

    // Load initial exercises
    loadExercises();
});

function setupAiWorkspace() {
    const tabs = document.querySelectorAll('.ai-tab');
    const panels = document.querySelectorAll('.ai-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const selected = tab.dataset.aiTab;
            tabs.forEach(item => item.classList.toggle('active', item === tab));
            panels.forEach(panel => {
                panel.classList.toggle('active', panel.id === `${selected}AiPanel`);
            });
        });
    });

    const analyzeBtn = document.getElementById('analyzeWritingBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeWritingWithAi);
    }

    const simplifyBtn = document.getElementById('simplifyContextBtn');
    if (simplifyBtn) {
        simplifyBtn.addEventListener('click', simplifyContextWithAi);
    }
}

async function analyzeWritingWithAi() {
    const text = document.getElementById('aiWritingInput').value.trim();
    const resultCard = document.getElementById('writingResultCard');
    const button = document.getElementById('analyzeWritingBtn');

    if (!text) {
        alert('Please enter some text to evaluate.');
        return;
    }

    button.disabled = true;
    button.textContent = 'Analyzing...';
    resultCard.classList.add('loading');

    try {
        const response = await fetch(`${API_URL}/ai/evaluate-writing`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ text })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Unable to analyze writing right now.');
        }

        const score = Number(data.score || 0);
        const grammar = Math.max(1, Math.min(10, Math.round(score)));
        const vocabulary = Math.max(1, Math.min(10, Math.round(score * 0.95)));

        document.getElementById('writingScoreBadge').textContent = `${score}/10`;
        document.getElementById('grammarMetric').textContent = `${grammar}/10`;
        document.getElementById('vocabMetric').textContent = `${vocabulary}/10`;
        document.getElementById('writingFeedbackText').textContent = data.feedback || 'No feedback available.';
        document.getElementById('writingGrammarList').innerHTML = (data.grammarFixes || []).map(item => `<li>${item}</li>`).join('') || '<li>No grammar suggestions available.</li>';
        document.getElementById('originalTextPreview').textContent = text;
        document.getElementById('correctedTextPreview').textContent = data.simplifiedText || text;
        resultCard.classList.remove('hidden');
        resultCard.classList.remove('loading');
    } catch (error) {
        console.error('AI writing analysis failed:', error);
        document.getElementById('writingFeedbackText').textContent = error.message || 'Network error. Please try again.';
        document.getElementById('writingGrammarList').innerHTML = '<li>Unable to fetch feedback right now.</li>';
        resultCard.classList.remove('hidden');
    } finally {
        button.disabled = false;
        button.textContent = 'Analyze Writing';
        resultCard.classList.remove('loading');
    }
}

async function simplifyContextWithAi() {
    const text = document.getElementById('contextInput').value.trim();
    const resultCard = document.getElementById('contextResultCard');
    const button = document.getElementById('simplifyContextBtn');

    if (!text) {
        alert('Please enter a paragraph or question to simplify.');
        return;
    }

    button.disabled = true;
    button.textContent = 'Simplifying...';
    resultCard.classList.add('loading');

    try {
        const response = await fetch(`${API_URL}/ai/simplify-context`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ text })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Unable to simplify the text right now.');
        }

        const score = Number(data.score || 0);
        document.getElementById('contextScoreBadge').textContent = `${score}/10`;
        document.getElementById('contextFeedbackText').textContent = data.feedback || 'No explanation available.';
        document.getElementById('simplifiedTextPreview').textContent = data.simplifiedText || text;
        resultCard.classList.remove('hidden');
    } catch (error) {
        console.error('AI simplify context failed:', error);
        document.getElementById('contextFeedbackText').textContent = error.message || 'Network error. Please try again.';
        document.getElementById('simplifiedTextPreview').textContent = 'The simplifier could not process your text at the moment.';
        resultCard.classList.remove('hidden');
    } finally {
        button.disabled = false;
        button.textContent = 'Simplify Text';
        resultCard.classList.remove('loading');
    }
}

async function loadExercises() {
    try {
        const response = await fetch(`${API_URL}/exercises/writing?level=${currentLevel}`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const exercises = await response.json();
            displayExercises(exercises);
        }
    } catch (error) {
        console.error('Error loading exercises:', error);
    }
}

function displayExercises(exercises) {
    const exercisesList = document.getElementById('exercisesList');
    
    if (exercises.length === 0) {
        exercisesList.innerHTML = '<p class="no-activity">No exercises available for this level.</p>';
        return;
    }

    exercisesList.innerHTML = exercises.map(exercise => `
        <div class="exercise-card" onclick="openExercise(${exercise.id})">
            <div class="exercise-level-badge level-${exercise.level}">${exercise.level}</div>
            <h3>${exercise.title}</h3>
            <p>${exercise.content.substring(0, 150)}...</p>
        </div>
    `).join('');
}

function openExercise(exerciseId) {
    fetch(`${API_URL}/exercises/writing/${exerciseId}`, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(exercise => {
        currentExercise = exercise;
        document.getElementById('exerciseTitle').textContent = exercise.title;
        document.getElementById('exerciseLevelBadge').textContent = exercise.level;
        document.getElementById('exerciseLevelBadge').className = 
            `exercise-level-badge level-${exercise.level}`;
        document.getElementById('exerciseDescription').textContent = exercise.content;
        document.getElementById('exerciseHints').textContent = exercise.hints;
        
        document.getElementById('exerciseModal').style.display = 'block';
    })
    .catch(error => {
        console.error('Error loading exercise:', error);
        alert('Error loading exercise');
    });
}

function updateWritingStats() {
    const text = document.getElementById('writingInput').value;
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    const charCount = text.length;

    document.getElementById('wordCount').textContent = `Words: ${wordCount}`;
    document.getElementById('charCount').textContent = `Characters: ${charCount}`;
}

async function submitWriting() {
    const writingText = document.getElementById('writingInput').value.trim();
    
    if (!writingText) {
        alert('Please write your response first.');
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/exercises/writing/${currentExercise.id}/submit`,
            {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ answer: writingText })
            }
        );

        if (response.ok) {
            const result = await response.json();
            displayFeedback(result);
        } else {
            alert('Error submitting answer');
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
        alert('Error submitting answer');
    }
}

function displayFeedback(result) {
    const feedbackDiv = document.getElementById('feedback');
    feedbackDiv.className = 'feedback show';
    
    if (result.score >= 80) {
        feedbackDiv.classList.add('success');
    } else if (result.score >= 60) {
        feedbackDiv.classList.add('warning');
    } else {
        feedbackDiv.classList.add('error');
    }

    feedbackDiv.innerHTML = `
        <h3>Score: ${result.score}%</h3>
        <p>${result.feedback}</p>
        <button class="btn-primary" onclick="closeExerciseAndReload()">Continue</button>
    `;
}

function resetExercise() {
    currentExercise = null;
    document.getElementById('writingInput').value = '';
    document.getElementById('wordCount').textContent = 'Words: 0';
    document.getElementById('charCount').textContent = 'Characters: 0';
    document.getElementById('feedback').className = 'feedback';
    document.getElementById('feedback').innerHTML = '';
}

function closeExerciseAndReload() {
    document.getElementById('exerciseModal').style.display = 'none';
    resetExercise();
    loadExercises();
}

// Make functions available globally
window.openExercise = openExercise;
window.closeExerciseAndReload = closeExerciseAndReload;
