// Reading practice functionality
let currentLevel = 'beginner';
let currentExercise = null;

document.addEventListener('DOMContentLoaded', function() {
    requireAuth();
    displayUserInfo();
    initializeLogout();

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

    // Submit button
    document.getElementById('submitReading').addEventListener('click', submitReading);

    // Load initial exercises
    loadExercises();
});

async function loadExercises() {
    try {
        const response = await fetch(`${API_URL}/exercises/reading?level=${currentLevel}`, {
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

    exercisesList.innerHTML = exercises.map(exercise => {
        // Split content into passage and question
        const parts = exercise.content.split('Question:');
        const passage = parts[0].replace('Read the passage:', '').replace('Read:', '').trim();
        const questionPreview = parts[1] ? parts[1].substring(0, 50) + '...' : '';
        
        return `
            <div class="exercise-card" onclick="openExercise(${exercise.id})">
                <div class="exercise-level-badge level-${exercise.level}">${exercise.level}</div>
                <h3>${exercise.title}</h3>
                <p><strong>Passage:</strong> ${passage.substring(0, 100)}...</p>
                ${questionPreview ? `<p><strong>Question:</strong> ${questionPreview}</p>` : ''}
            </div>
        `;
    }).join('');
}

function openExercise(exerciseId) {
    fetch(`${API_URL}/exercises/reading/${exerciseId}`, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(exercise => {
        currentExercise = exercise;
        document.getElementById('exerciseTitle').textContent = exercise.title;
        document.getElementById('exerciseLevelBadge').textContent = exercise.level;
        document.getElementById('exerciseLevelBadge').className = 
            `exercise-level-badge level-${exercise.level}`;
        
        // Format the content to show passage and question separately
        const content = exercise.content;
        const parts = content.split('Question:');
        
        let formattedContent = content;
        if (parts.length > 1) {
            formattedContent = `
                <p>${parts[0].replace('Read the passage:', '').replace('Read:', '').trim()}</p>
                <h4 style="margin-top: 20px; color: var(--primary-color);">Question:</h4>
                <p>${parts[1].trim()}</p>
            `;
        }
        
        document.getElementById('exerciseDescription').innerHTML = formattedContent;
        document.getElementById('exerciseHints').textContent = exercise.hints;
        
        document.getElementById('exerciseModal').style.display = 'block';
    })
    .catch(error => {
        console.error('Error loading exercise:', error);
        alert('Error loading exercise');
    });
}

async function submitReading() {
    const answer = document.getElementById('readingAnswer').value.trim();
    
    if (!answer) {
        alert('Please provide your answer first.');
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/exercises/reading/${currentExercise.id}/submit`,
            {
                method: 'POST',
                headers: Object.assign({'Content-Type':'application/json'}, getAuthHeaders()),
                body: JSON.stringify({ answer: answer })
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
    document.getElementById('readingAnswer').value = '';
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
