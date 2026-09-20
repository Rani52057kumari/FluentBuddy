// Speaking practice functionality
let currentLevel = 'beginner';
let currentExercise = null;
let recognition = null;
let isRecording = false;

document.addEventListener('DOMContentLoaded', function() {
    requireAuth();
    displayUserInfo();
    initializeLogout();

    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('transcription').textContent = transcript;
            document.getElementById('spokenText').value = transcript;
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            document.getElementById('recordingStatus').textContent = 
                'Error: ' + event.error + '. Please try typing your response instead.';
        };

        recognition.onend = function() {
            isRecording = false;
            document.getElementById('startRecording').style.display = 'inline-block';
            document.getElementById('stopRecording').style.display = 'none';
            document.getElementById('recordingStatus').textContent = '';
        };
    }

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

    // Recording controls
    document.getElementById('startRecording').addEventListener('click', startRecording);
    document.getElementById('stopRecording').addEventListener('click', stopRecording);

    // Submit button
    document.getElementById('submitSpeaking').addEventListener('click', submitSpeaking);

    // Load initial exercises
    loadExercises();
});

async function loadExercises() {
    try {
        const response = await fetch(`${API_URL}/exercises/speaking?level=${currentLevel}`, {
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
            <p>${exercise.content.substring(0, 100)}...</p>
        </div>
    `).join('');
}

function openExercise(exerciseId) {
    fetch(`${API_URL}/exercises/speaking/${exerciseId}`, {
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

function startRecording() {
    if (recognition) {
        document.getElementById('transcription').textContent = 'Listening...';
        document.getElementById('recordingStatus').textContent = '🔴 Recording...';
        document.getElementById('startRecording').style.display = 'none';
        document.getElementById('stopRecording').style.display = 'inline-block';
        
        isRecording = true;
        recognition.start();
    } else {
        alert('Speech recognition is not supported in your browser. Please type your response.');
    }
}

function stopRecording() {
    if (recognition && isRecording) {
        recognition.stop();
    }
}

async function submitSpeaking() {
    const spokenText = document.getElementById('spokenText').value.trim();
    
    if (!spokenText) {
        alert('Please record or type your response first.');
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/exercises/speaking/${currentExercise.id}/submit`,
            {
                method: 'POST',
                headers: Object.assign({'Content-Type':'application/json'}, getAuthHeaders()),
                body: JSON.stringify({ answer: spokenText })
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
    document.getElementById('spokenText').value = '';
    document.getElementById('transcription').textContent = '';
    document.getElementById('recordingStatus').textContent = '';
    document.getElementById('feedback').className = 'feedback';
    document.getElementById('feedback').innerHTML = '';
    
    if (recognition && isRecording) {
        recognition.stop();
    }
}

function closeExerciseAndReload() {
    document.getElementById('exerciseModal').style.display = 'none';
    resetExercise();
    loadExercises();
}

// Make functions available globally
window.openExercise = openExercise;
window.closeExerciseAndReload = closeExerciseAndReload;
