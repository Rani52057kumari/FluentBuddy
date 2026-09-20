(function () {
  if (window.__fluentBuddyChatWidgetInitialized) return;
  window.__fluentBuddyChatWidgetInitialized = true;

  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : '/api';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function createChatWidget() {
    const existing = document.getElementById('fluentBuddyChatWidget');
    if (existing) return existing;

    const container = document.createElement('div');
    container.innerHTML = `
      <div class="fb-chat-widget" id="fluentBuddyChatWidget" aria-live="polite">
        <button class="fb-chat-fab" id="fbChatFab" type="button" aria-label="Open FluentBuddy assistant">
          <span class="fb-chat-fab-icon">🤖</span>
          <span class="fb-chat-fab-label">Help</span>
        </button>

        <div class="fb-chat-panel" id="fbChatPanel" role="dialog" aria-modal="false" aria-label="FluentBuddy AI assistant">
          <div class="fb-chat-header">
            <div class="fb-chat-title-wrap">
              <div class="fb-chat-avatar">B</div>
              <div>
                <div class="fb-chat-title">Buddy</div>
                <div class="fb-chat-status">Online</div>
              </div>
            </div>
            <div class="fb-chat-header-actions">
              <button class="fb-chat-icon-btn" type="button" data-action="minimize" aria-label="Minimize chat">
                <span>−</span>
              </button>
              <button class="fb-chat-icon-btn" type="button" data-action="clear" aria-label="Clear conversation">
                <span>🗑</span>
              </button>
              <button class="fb-chat-icon-btn" type="button" data-action="close" aria-label="Close chat">
                <span>✕</span>
              </button>
            </div>
          </div>

          <div class="fb-chat-messages" id="fbChatMessages">
            <div class="fb-chat-message fb-chat-message-bot">
              <div class="fb-chat-bubble">Hi! I’m Buddy. Ask me about grammar, speaking practice, writing help, or how to use FluentBuddy.</div>
            </div>
          </div>

          <div class="fb-chat-input-row">
            <button class="fb-chat-mic" id="fbChatMic" type="button" aria-label="Use voice input">🎙️</button>
            <input id="fbChatInput" type="text" placeholder="Ask Buddy anything..." aria-label="Chat message" />
            <button class="fb-chat-send" id="fbChatSend" type="button" aria-label="Send message">Send</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container.firstElementChild);
    return document.getElementById('fluentBuddyChatWidget');
  }

  function ensureWidget() {
    const widget = createChatWidget();
    if (!widget) return;
    if (widget.dataset.chatBound === 'true') return widget;
    widget.dataset.chatBound = 'true';

    const panel = widget.querySelector('#fbChatPanel');
    const fab = widget.querySelector('#fbChatFab');
    const send = widget.querySelector('#fbChatSend');
    const input = widget.querySelector('#fbChatInput');
    const mic = widget.querySelector('#fbChatMic');
    const messages = widget.querySelector('#fbChatMessages');

    const state = {
      open: false,
      minimized: false,
      recognition: null,
      isListening: false,
      sessionMessages: [],
    };

    function togglePanel(forceOpen) {
      const next = typeof forceOpen === 'boolean' ? forceOpen : !state.open;
      state.open = next;
      state.minimized = false;
      widget.classList.toggle('is-open', next);
      widget.classList.remove('is-minimized');
      panel.setAttribute('aria-hidden', String(!next));
      if (next) {
        setTimeout(() => input.focus(), 120);
      }
    }

    function updateMessages() {
      messages.scrollTop = messages.scrollHeight;
    }

    function appendMessage(role, text, { isTyping = false } = {}) {
      const wrapper = document.createElement('div');
      wrapper.className = `fb-chat-message fb-chat-message-${role}`;

      const bubble = document.createElement('div');
      bubble.className = 'fb-chat-bubble';

      if (isTyping) {
        bubble.innerHTML = '<span class="fb-chat-typing"><span></span><span></span><span></span></span>';
      } else {
        bubble.innerHTML = `${escapeHtml(String(text || ''))}`;

        if (role === 'bot') {
          const speakBtn = document.createElement('button');
          speakBtn.type = 'button';
          speakBtn.className = 'fb-chat-speak';
          speakBtn.textContent = '🔊';
          speakBtn.title = 'Read aloud';
          speakBtn.addEventListener('click', () => {
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(String(text || ''));
              utterance.lang = 'en-US';
              utterance.rate = 1;
              utterance.pitch = 1;
              window.speechSynthesis.speak(utterance);
            }
          });
          bubble.appendChild(speakBtn);
        }
      }

      wrapper.appendChild(bubble);
      messages.appendChild(wrapper);
      updateMessages();
    }

    function clearChat() {
      messages.innerHTML = `
        <div class="fb-chat-message fb-chat-message-bot">
          <div class="fb-chat-bubble">The chat was cleared. Ask me anything else.</div>
        </div>
      `;
      state.sessionMessages = [];
      updateMessages();
    }

    function setMicListening(isListening) {
      state.isListening = isListening;
      mic.classList.toggle('fb-chat-mic-active', isListening);
      mic.setAttribute('aria-pressed', String(isListening));
      mic.textContent = isListening ? '🔴' : '🎙️';
    }

    function startSpeechRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        input.value = 'Voice input is not supported in this browser.';
        return;
      }

      if (state.recognition) {
        state.recognition.stop();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => setMicListening(true);
      recognition.onend = () => setMicListening(false);
      recognition.onerror = () => setMicListening(false);
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript || '')
          .join(' ')
          .trim();

        if (transcript) {
          input.value = transcript;
          input.focus();
        }
      };

      state.recognition = recognition;
      recognition.start();
    }

    async function sendMessage() {
      const text = (input.value || '').trim();
      if (!text) return;

      state.sessionMessages.push({ role: 'user', content: text });
      input.value = '';
      appendMessage('user', text);

      const typingBubble = document.createElement('div');
      typingBubble.className = 'fb-chat-message fb-chat-message-bot';
      const typingContent = document.createElement('div');
      typingContent.className = 'fb-chat-bubble';
      typingContent.innerHTML = '<span class="fb-chat-typing"><span></span><span></span><span></span></span>';
      typingBubble.appendChild(typingContent);
      messages.appendChild(typingBubble);
      updateMessages();

      try {
        const headers = { 'Content-Type': 'application/json' };
        const token = window.localStorage.getItem('token');
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(`${API_BASE}/chatbot/query`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: text,
            userContext: {
              englishLevel: (window.getCurrentUser && window.getCurrentUser()?.englishLevel) || 'beginner',
              level: (window.getCurrentUser && window.getCurrentUser()?.englishLevel) || 'beginner',
              goal: 'Improve my English practice',
              platformSection: 'general',
              lastAction: 'chat',
            },
            allowGuestSupport: true,
          }),
        });

        const payload = await response.json();
        const answer = payload?.response || 'I’m here to help you learn English. Try asking again in a simpler way.';

        const typingEl = messages.querySelector('.fb-chat-typing')?.closest('.fb-chat-message');
        if (typingEl) typingEl.remove();
        appendMessage('bot', answer);
      } catch (error) {
        const typingEl = messages.querySelector('.fb-chat-typing')?.closest('.fb-chat-message');
        if (typingEl) typingEl.remove();
        appendMessage('bot', 'I could not reach the assistant right now. Please try again in a moment.');
      }
    }

    fab.addEventListener('click', () => togglePanel());
    send.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
      }
    });
    mic.addEventListener('click', startSpeechRecognition);

    widget.querySelector('[data-action="minimize"]').addEventListener('click', () => {
      state.minimized = !state.minimized;
      widget.classList.toggle('is-minimized', state.minimized);

      if (state.minimized) {
        state.open = false;
        widget.classList.remove('is-open');
        panel.setAttribute('aria-hidden', 'true');
      } else if (state.open) {
        widget.classList.add('is-open');
        panel.setAttribute('aria-hidden', 'false');
      }
    });

    widget.querySelector('[data-action="clear"]').addEventListener('click', clearChat);
    widget.querySelector('[data-action="close"]').addEventListener('click', () => {
      state.open = false;
      state.minimized = false;
      widget.classList.remove('is-open');
      widget.classList.remove('is-minimized');
      panel.setAttribute('aria-hidden', 'true');
    });

    return widget;
  }

  window.initFluentBuddyChatWidget = ensureWidget;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureWidget);
  } else {
    ensureWidget();
  }
})();
