const practiceState = {
  activeTab: 'speaking',
  speaking: {
    mediaRecorder: null,
    stream: null,
    recognition: null,
    audioChunks: [],
    isRecording: false,
    prompt: 'Describe your ideal weekend and explain what makes it relaxing.'
  },
  reading: {
    passage: '',
    questions: [],
  },
  assessment: {
    data: null,
    currentStep: 0,
    timer: 600,
    timerId: null,
    responses: {},
    started: false,
  },
  results: null,
};

const showAlert = (message, type = 'error') => {
  const existing = document.querySelector('#practiceAlert');
  if (existing) existing.remove();

  const alert = document.createElement('div');
  alert.id = 'practiceAlert';
  alert.className = `fixed right-5 top-5 z-50 rounded-xl border px-4 py-3 text-sm shadow-xl ${
    type === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-100'
  }`;
  alert.textContent = message;
  document.body.appendChild(alert);

  setTimeout(() => {
    alert.remove();
  }, 3500);
};

const setLoading = (button, isLoading, label = 'Loading...') => {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = label;
    button.classList.add('opacity-75', 'cursor-not-allowed');
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || button.textContent;
    button.classList.remove('opacity-75', 'cursor-not-allowed');
  }
};

const getLevelFromScore = (score) => {
  const safeScore = Number.isFinite(score) ? Math.min(100, Math.max(0, Number(score))) : 0;

  if (safeScore >= 80) return 'Advanced';
  if (safeScore >= 60) return 'Intermediate';
  return 'Beginner';
};

const getNextLevel = (level) => {
  const order = ['Beginner', 'Intermediate', 'Advanced'];
  const currentIndex = order.indexOf(level);
  return order[Math.min(currentIndex + 1, order.length - 1)] || 'Intermediate';
};

const renderLevelStatus = async () => {
  const user = getCurrentUser();
  const levelText = document.getElementById('progressLevelText');
  const progressBar = document.getElementById('levelProgressBar');
  const goalText = document.getElementById('goalPathText');

  let currentLevel = String(user?.englishLevel || user?.level || 'Beginner').trim();
  let score = 0;

  try {
    const response = await fetch(`${API_URL}/analytics/progress`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const payload = await response.json();
      const analytics = payload.data || {};
      score = Number(analytics.averageScore || 0);
      currentLevel = analytics.currentLevel || currentLevel;
    }
  } catch (error) {
    console.error('Unable to load real user progress for level status:', error);
  }

  const normalizedLevel = ['Beginner', 'Intermediate', 'Advanced'].includes(currentLevel)
    ? currentLevel
    : getLevelFromScore(score);

  const nextLevel = getNextLevel(normalizedLevel);
  const goalValue = normalizedLevel === 'Advanced' ? 'Mastery complete' : `${normalizedLevel === 'Beginner' ? '60' : '80'}% to ${nextLevel}`;

  if (levelText) {
    levelText.textContent = `${normalizedLevel} - ${Math.round(score)}% to ${nextLevel}`;
  }

  if (goalText) {
    goalText.textContent = goalValue;
  }

  if (progressBar) {
    progressBar.style.width = `${Math.min(100, Math.max(0, score))}%`;
  }
};

const switchTab = (tabName) => {
  practiceState.activeTab = tabName;
  document.querySelectorAll('.module-card[data-tab]').forEach((card) => {
    card.classList.toggle('active-module', card.dataset.tab === tabName);
  });

  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.add('hidden');
  });

  const target = document.getElementById(`${tabName}Panel`);
  if (target) {
    target.classList.remove('hidden');
  }

  if (tabName === 'assessment') {
    const resultPanel = document.getElementById('resultPanel');
    if (resultPanel && !resultPanel.classList.contains('hidden')) {
      resultPanel.classList.add('hidden');
    }
  }
};

const getInitialTab = () => {
  const params = new URLSearchParams(window.location.search);
  const requestedTab = String(params.get('tab') || '').toLowerCase();
  const allowedTabs = ['speaking', 'writing', 'reading', 'assessment'];
  return allowedTabs.includes(requestedTab) ? requestedTab : 'speaking';
};

const updateWordCount = () => {
  const value = document.getElementById('writingInput')?.value || '';
  const count = value.trim() ? value.trim().split(/\s+/).length : 0;
  const wordCount = document.getElementById('wordCount');
  if (wordCount) wordCount.textContent = `${count} words`;
};

const renderReadingQuestions = () => {
  const container = document.getElementById('readingQuestions');
  if (!container) return;

  if (!practiceState.reading.questions.length) {
    container.innerHTML = '<p class="text-sm text-slate-400">Generate a passage to start the comprehension exercise.</p>';
    return;
  }

  container.innerHTML = practiceState.reading.questions
    .map((question, index) => `
      <div class="rounded-xl border border-slate-700 bg-slate-900 p-3">
        <p class="mb-2 text-sm text-slate-200"><span class="font-semibold text-white">Q${index + 1}.</span> ${question.question}</p>
        <textarea data-reading-index="${index}" rows="3" class="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-brand-500" placeholder="Type your answer here..."></textarea>
      </div>
    `)
    .join('');
};

const renderAssessmentStep = () => {
  const assessment = practiceState.assessment;
  const content = document.getElementById('assessmentContent');
  if (!content || !assessment.data) return;

  const prompts = assessment.data.prompts || [];
  const current = prompts[assessment.currentStep];
  if (!current) return;

  const isLastStep = assessment.currentStep === prompts.length - 1;
  const nextBtn = document.getElementById('nextAssessmentStep');
  const submitBtn = document.getElementById('submitAssessmentBtn');
  if (nextBtn) {
    nextBtn.classList.toggle('hidden', isLastStep);
  }
  if (submitBtn) {
    submitBtn.classList.toggle('hidden', !isLastStep);
  }

  const promptText = current.promptText || 'Complete this challenge.';
  const moduleType = current.moduleType || 'Writing';

  let innerHTML = `
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.24em] text-brand-100">Task ${assessment.currentStep + 1} / ${prompts.length}</p>
        <h4 class="mt-2 text-2xl font-bold text-white">${moduleType} Task</h4>
      </div>
      <div class="rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-sm font-semibold text-brand-100">${moduleType}</div>
    </div>
    <p class="mt-4 text-base text-slate-200">${promptText}</p>
  `;

  if (moduleType === 'Reading') {
    innerHTML += `
      <div class="mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <p class="text-sm text-slate-300">Read the paragraph and answer in 1-2 sentences.</p>
        <textarea id="assessmentReadingAnswer" rows="5" class="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-brand-500" placeholder="Type your answer here..."></textarea>
      </div>
    `;
  }

  if (moduleType === 'Writing') {
    innerHTML += `
      <div class="mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <textarea id="assessmentWritingAnswer" rows="8" class="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-brand-500" placeholder="Write your response here..."></textarea>
      </div>
    `;
  }

  if (moduleType === 'Speaking') {
    innerHTML += `
      <div class="mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <label class="mb-2 block text-sm text-slate-300">Speaking response</label>
        <textarea id="assessmentSpeakingAnswer" rows="5" class="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-brand-500" placeholder="Speak your answer aloud or type a transcript here..."></textarea>
      </div>
    `;
  }

  content.innerHTML = innerHTML;

  const saved = assessment.responses[assessment.currentStep];
  if (saved) {
    const readingInput = document.getElementById('assessmentReadingAnswer');
    const writingInput = document.getElementById('assessmentWritingAnswer');
    const speakingInput = document.getElementById('assessmentSpeakingAnswer');

    if (readingInput && saved.answer) readingInput.value = saved.answer;
    if (writingInput && saved.answer) writingInput.value = saved.answer;
    if (speakingInput && saved.answer) speakingInput.value = saved.answer;
  }
};

const persistAssessmentAnswer = () => {
  const assessment = practiceState.assessment;
  const current = assessment.data?.prompts?.[assessment.currentStep];
  if (!current) return;

  const moduleType = current.moduleType || 'Writing';
  let answer = '';

  if (moduleType === 'Reading') {
    answer = document.getElementById('assessmentReadingAnswer')?.value || '';
  }
  if (moduleType === 'Writing') {
    answer = document.getElementById('assessmentWritingAnswer')?.value || '';
  }
  if (moduleType === 'Speaking') {
    answer = document.getElementById('assessmentSpeakingAnswer')?.value || '';
  }

  assessment.responses[assessment.currentStep] = {
    moduleType,
    answer,
  };
};

const advanceAssessmentStep = () => {
  persistAssessmentAnswer();
  const assessment = practiceState.assessment;
  const maxIndex = (assessment.data?.prompts?.length || 1) - 1;
  if (assessment.currentStep < maxIndex) {
    assessment.currentStep += 1;
    renderAssessmentStep();
  }
};

const previousAssessmentStep = () => {
  persistAssessmentAnswer();
  const assessment = practiceState.assessment;
  if (assessment.currentStep > 0) {
    assessment.currentStep -= 1;
    renderAssessmentStep();
  }
};

const startAssessmentTimer = () => {
  const assessment = practiceState.assessment;
  if (assessment.timerId) clearInterval(assessment.timerId);

  assessment.timerId = setInterval(() => {
    const timerEl = document.getElementById('assessmentTimer');
    if (!timerEl) return;

    if (assessment.timer <= 0) {
      clearInterval(assessment.timerId);
      timerEl.textContent = '00:00';
      showAlert('Time is up! Your assessment has been submitted.', 'success');
      submitAssessment();
      return;
    }

    assessment.timer -= 1;
    const minutes = Math.floor(assessment.timer / 60);
    const seconds = assessment.timer % 60;
    timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, 1000);
};

const loadReadingPractice = async () => {
  const button = document.getElementById('generateReadingBtn');
  setLoading(button, true, 'Generating...');
  try {
    const response = await fetch(`${API_URL}/practice/reading/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Unable to generate reading practice.');
    }

    practiceState.reading.passage = result.data?.passage || 'No passage available.';
    practiceState.reading.questions = result.data?.questions || [];
    document.getElementById('readingPassage').textContent = practiceState.reading.passage;
    renderReadingQuestions();
    showAlert('Reading passage generated successfully.', 'success');
  } catch (error) {
    showAlert(error.message || 'Unable to generate reading practice.');
  } finally {
    setLoading(button, false, 'Generate Passage');
  }
};

const analyzeReading = async () => {
  if (!practiceState.reading.passage || !practiceState.reading.questions.length) {
    showAlert('Generate a reading passage first.');
    return;
  }

  const answers = Array.from(document.querySelectorAll('[data-reading-index]')).map((input) => ({
    question: practiceState.reading.questions[Number(input.dataset.readingIndex)]?.question || '',
    answer: input.value.trim(),
  }));

  const button = document.getElementById('analyzeReadingBtn');
  setLoading(button, true, 'Analyzing...');

  try {
    const response = await fetch(`${API_URL}/practice/reading/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        passage: practiceState.reading.passage,
        answers,
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Unable to analyze reading answers.');
    }

    const data = result.data || {};
    const feedback = document.getElementById('readingFeedback');
    const container = feedback || document.createElement('div');
    container.id = 'readingFeedback';
    container.className = 'mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-50';
    container.innerHTML = `
      <p class="font-semibold">Comprehension result</p>
      <p class="mt-2">Overall score: <span class="font-bold">${data.overallScore || 0}%</span></p>
      <p class="mt-2">${data.detailedFeedback || 'Good job! Review the key details to strengthen your understanding.'}</p>
    `;

    const parent = document.getElementById('readingQuestions');
    if (parent && !parent.querySelector('#readingFeedback')) {
      parent.appendChild(container);
    }
    showAlert('Reading analysis completed.', 'success');
  } catch (error) {
    showAlert(error.message || 'Unable to analyze reading answers.');
  } finally {
    setLoading(button, false, 'Analyze Answers');
  }
};

const submitSpeakingPractice = async () => {
  const transcript = document.getElementById('speakingTranscript')?.value?.trim();
  const promptText = document.getElementById('speakingPrompt')?.textContent?.trim() || 'Describe your ideal weekend and explain what makes it relaxing.';

  if (!transcript) {
    showAlert('Please record or enter a speech transcript before submitting.');
    return;
  }

  const button = document.getElementById('submitSpeakingBtn');
  setLoading(button, true, 'Analyzing...');

  try {
    const response = await fetch(`${API_URL}/practice/speaking`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        promptText,
        transcript,
        userAudioUrl: '',
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Unable to evaluate speaking practice.');
    }

    const data = result.data || {};
    const feedbackBox = document.getElementById('speakingFeedback');
    if (feedbackBox) {
      feedbackBox.innerHTML = `
        <div class="rounded-xl border border-brand-500/30 bg-brand-500/10 p-4">
          <p class="text-xs uppercase tracking-[0.24em] text-brand-100">Overall score</p>
          <h5 class="mt-2 text-3xl font-bold text-white">${data.overallScore || 0}%</h5>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl border border-slate-700 bg-slate-900 p-3"><p class="text-slate-400">Grammar</p><p class="mt-1 text-lg font-semibold text-white">${data.scores?.grammar ?? 0}%</p></div>
          <div class="rounded-xl border border-slate-700 bg-slate-900 p-3"><p class="text-slate-400">Pronunciation</p><p class="mt-1 text-lg font-semibold text-white">${data.scores?.pronunciation ?? 0}%</p></div>
          <div class="rounded-xl border border-slate-700 bg-slate-900 p-3"><p class="text-slate-400">Comprehension</p><p class="mt-1 text-lg font-semibold text-white">${data.scores?.comprehension ?? 0}%</p></div>
          <div class="rounded-xl border border-slate-700 bg-slate-900 p-3"><p class="text-slate-400">Vocabulary</p><p class="mt-1 text-lg font-semibold text-white">${data.scores?.vocabulary ?? 0}%</p></div>
        </div>
        <div class="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <p class="font-semibold text-white">Detailed feedback</p>
          <p class="mt-2 text-slate-200">${data.detailedFeedback || 'Great progress. Keep practicing smooth pacing and more natural transitions.'}</p>
        </div>
      `;
    }
    showAlert('Speech feedback generated successfully.', 'success');
  } catch (error) {
    showAlert(error.message || 'Unable to evaluate speech.');
  } finally {
    setLoading(button, false, 'Analyze Speech');
  }
};

const evaluateWriting = async () => {
  const text = document.getElementById('writingInput')?.value?.trim();
  if (!text) {
    showAlert('Please write something before asking for AI feedback.');
    return;
  }

  const button = document.getElementById('grammarHelperBtn');
  setLoading(button, true, 'Analyzing...');

  try {
    const response = await fetch(`${API_URL}/ai/evaluate-writing`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Unable to evaluate writing.');
    }

    const feedbackBox = document.getElementById('writingFeedback');
    if (feedbackBox) {
      feedbackBox.innerHTML = `
        <div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p class="text-xs uppercase tracking-[0.24em] text-amber-200">Writing score</p>
          <h5 class="mt-2 text-3xl font-bold text-white">${result.score ?? 0}/10</h5>
        </div>
        <p class="text-slate-200">${result.feedback || 'Good writing, but you can improve structure and sentence variety.'}</p>
        <div class="rounded-xl border border-slate-700 bg-slate-900 p-3">
          <p class="font-semibold text-white">Suggested fixes</p>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-slate-200">
            ${(result.grammarFixes || []).map((fix) => `<li>${fix}</li>`).join('') || '<li>Use clearer sentences and more natural transitions.</li>'}
          </ul>
        </div>
      `;
    }
    showAlert('Writing feedback generated successfully.', 'success');
  } catch (error) {
    showAlert(error.message || 'Unable to evaluate writing.');
  } finally {
    setLoading(button, false, 'AI Grammar Helper');
  }
};

const startAssessment = async () => {
  const button = document.getElementById('startAssessmentAction');
  setLoading(button, true, 'Starting...');

  try {
    const response = await fetch(`${API_URL}/practice/test/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Unable to start the assessment.');
    }

    practiceState.assessment.data = result.data || { prompts: [] };
    practiceState.assessment.currentStep = 0;
    practiceState.assessment.responses = {};
    practiceState.assessment.started = true;
    practiceState.assessment.timer = 600;
    startAssessmentTimer();
    renderAssessmentStep();
    showAlert('Assessment started successfully.', 'success');
  } catch (error) {
    showAlert(error.message || 'Unable to start the assessment.');
  } finally {
    setLoading(button, false, 'Start Test');
  }
};

const submitAssessment = async () => {
  if (!practiceState.assessment.started || !practiceState.assessment.data) {
    showAlert('Start the assessment before submitting.');
    return;
  }

  persistAssessmentAnswer();
  const button = document.getElementById('submitAssessmentBtn');
  if (button) setLoading(button, true, 'Submitting...');

  try {
    const response = await fetch(`${API_URL}/practice/test/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        testType: practiceState.assessment.data.testType || 'Diagnostic',
        responses: practiceState.assessment.responses,
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Unable to submit assessment.');
    }

    const data = result.data || {};
    practiceState.results = data;
    renderAssessmentResults(data);
    showAlert('Assessment submitted successfully.', 'success');
  } catch (error) {
    showAlert(error.message || 'Unable to submit assessment.');
  } finally {
    if (button) setLoading(button, false, 'Submit Assessment');
  }
};

const renderAssessmentResults = (data) => {
  const resultPanel = document.getElementById('resultPanel');
  const summary = document.getElementById('resultSummary');
  const badge = document.getElementById('resultLevelBadge');

  if (resultPanel) resultPanel.classList.remove('hidden');
  if (badge) badge.textContent = data.levelAssigned || 'Intermediate';

  const breakdown = data.breakdown || {};
  const labels = ['Speaking', 'Writing', 'Reading'];
  const values = [
    Number(breakdown.speaking || 0),
    Number(breakdown.writing || 0),
    Number(breakdown.reading || 0),
  ];

  const ctx = document.getElementById('skillChart');
  if (ctx) {
    if (window.skillChartInstance) window.skillChartInstance.destroy();
    window.skillChartInstance = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: 'Skill score',
          data: values,
          backgroundColor: 'rgba(99, 102, 241, 0.35)',
          borderColor: '#818cf8',
          borderWidth: 2,
          pointBackgroundColor: '#c7d2fe',
        }],
      },
      options: {
        responsive: true,
        scales: { r: { beginAtZero: true, max: 100 } },
        plugins: { legend: { labels: { color: '#e2e8f0' } } },
      },
    });
  }

  const strengthText = values.some((score) => score >= 80)
    ? 'Your strongest area is consistency across tasks. Keep building on those wins.'
    : 'You are making strong progress. Focus on one skill at a time to build a clearer growth path.';

  const weaknessText = values.some((score) => score < 70)
    ? 'The biggest opportunity is to practice more on the area with the lowest score.'
    : 'Your performance is balanced. Aim for steady improvement in all categories.';

  if (summary) {
    summary.innerHTML = `
      <div class="rounded-xl border border-slate-700 bg-slate-950 p-4">
        <p class="text-sm text-slate-300">Overall score</p>
        <h4 class="mt-2 text-4xl font-bold text-white">${data.overallScore || 0}%</h4>
      </div>
      <div class="space-y-3 pt-2">
        <div class="rounded-xl border border-slate-700 bg-slate-950 p-3">
          <p class="text-sm text-slate-300">Speaking</p>
          <div class="mt-2 h-2 rounded-full bg-slate-800"><div class="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-400" style="width: ${breakdown.speaking || 0}%"></div></div>
          <p class="mt-2 text-sm font-semibold text-white">${breakdown.speaking || 0}%</p>
        </div>
        <div class="rounded-xl border border-slate-700 bg-slate-950 p-3">
          <p class="text-sm text-slate-300">Writing</p>
          <div class="mt-2 h-2 rounded-full bg-slate-800"><div class="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400" style="width: ${breakdown.writing || 0}%"></div></div>
          <p class="mt-2 text-sm font-semibold text-white">${breakdown.writing || 0}%</p>
        </div>
        <div class="rounded-xl border border-slate-700 bg-slate-950 p-3">
          <p class="text-sm text-slate-300">Reading</p>
          <div class="mt-2 h-2 rounded-full bg-slate-800"><div class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" style="width: ${breakdown.reading || 0}%"></div></div>
          <p class="mt-2 text-sm font-semibold text-white">${breakdown.reading || 0}%</p>
        </div>
      </div>
      <div class="rounded-xl border border-slate-700 bg-slate-950 p-4">
        <p class="font-semibold text-white">Strengths</p>
        <p class="mt-2 text-sm text-slate-200">${strengthText}</p>
      </div>
      <div class="rounded-xl border border-slate-700 bg-slate-950 p-4">
        <p class="font-semibold text-white">Weaknesses</p>
        <p class="mt-2 text-sm text-slate-200">${weaknessText}</p>
      </div>
      <div class="rounded-xl border border-slate-700 bg-slate-950 p-4">
        <p class="font-semibold text-white">Level update</p>
        <p class="mt-2 text-sm text-slate-200">Your English level is now <span class="font-semibold text-brand-100">${data.levelAssigned || 'Intermediate'}</span>. ${data.updatedLevel ? `Updated proficiency: ${data.updatedLevel}.` : ''}</p>
      </div>
    `;
  }
};

const setupRecorders = () => {
  const startBtn = document.getElementById('startRecordingBtn');
  const stopBtn = document.getElementById('stopRecordingBtn');
  const recordingBadge = document.getElementById('recordingBadge');
  const transcriptArea = document.getElementById('speakingTranscript');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      if (transcriptArea) transcriptArea.value = transcript;
    };
    practiceState.speaking.recognition = recognition;
  }

  startBtn.addEventListener('click', async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showAlert('This browser does not support microphone recording.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      practiceState.speaking.stream = stream;
      practiceState.speaking.mediaRecorder = new MediaRecorder(stream);
      practiceState.speaking.audioChunks = [];

      practiceState.speaking.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          practiceState.speaking.audioChunks.push(event.data);
        }
      };

      practiceState.speaking.mediaRecorder.start();
      practiceState.speaking.isRecording = true;
      // UI updates: show recording badge and mic animation
      if (recordingBadge) recordingBadge.classList.remove('hidden');
      startBtn.classList.add('recording');
      startBtn.setAttribute('aria-pressed', 'true');
      startBtn.disabled = true;
      stopBtn.disabled = false;
      if (practiceState.speaking.recognition) practiceState.speaking.recognition.start();
      showAlert('Recording started. Speak clearly into your microphone.', 'success');
    } catch (error) {
      showAlert('Microphone access was denied or is unavailable.');
    }
  });

  stopBtn.addEventListener('click', () => {
    if (!practiceState.speaking.mediaRecorder) {
      showAlert('No recording is active right now.');
      return;
    }

    practiceState.speaking.mediaRecorder.stop();
    practiceState.speaking.isRecording = false;
    if (recordingBadge) recordingBadge.classList.add('hidden');
    // UI: reset mic button state
    startBtn.classList.remove('recording');
    startBtn.setAttribute('aria-pressed', 'false');
    startBtn.disabled = false;
    stopBtn.disabled = true;
    if (practiceState.speaking.recognition) practiceState.speaking.recognition.stop();
    if (practiceState.speaking.stream) {
      practiceState.speaking.stream.getTracks().forEach((track) => track.stop());
    }
    showAlert('Recording saved. You can submit the speech for AI feedback.', 'success');
    if (transcriptArea && !transcriptArea.value.trim()) {
      transcriptArea.value = 'I enjoyed spending time ...';
    }
    submitSpeakingPractice();
  });
};

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  displayUserInfo();
  initializeLogout();
  renderLevelStatus();
  updateWordCount();

  document.querySelectorAll('.module-card[data-tab]').forEach((card) => {
    card.addEventListener('click', () => switchTab(card.dataset.tab));
  });

  document.getElementById('startAssessmentBtn').addEventListener('click', () => {
    switchTab('assessment');
  });

  document.getElementById('writingInput').addEventListener('input', updateWordCount);
  document.getElementById('grammarHelperBtn').addEventListener('click', evaluateWriting);
  document.getElementById('generateReadingBtn').addEventListener('click', loadReadingPractice);
  document.getElementById('analyzeReadingBtn').addEventListener('click', analyzeReading);
  document.getElementById('submitSpeakingBtn').addEventListener('click', submitSpeakingPractice);
  document.getElementById('startAssessmentAction').addEventListener('click', startAssessment);
  document.getElementById('nextAssessmentStep').addEventListener('click', advanceAssessmentStep);
  document.getElementById('prevAssessmentStep').addEventListener('click', previousAssessmentStep);
  document.getElementById('submitAssessmentBtn').addEventListener('click', submitAssessment);

  setupRecorders();
  switchTab(getInitialTab());
});
