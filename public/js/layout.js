document.addEventListener('DOMContentLoaded', function () {
  const shell = document.getElementById('app-layout');
  if (!shell) return;

  if (!document.querySelector('link[href="/css/chat-widget.css"]')) {
    const chatCss = document.createElement('link');
    chatCss.rel = 'stylesheet';
    chatCss.href = '/css/chat-widget.css';
    document.head.appendChild(chatCss);
  }

  if (!document.getElementById('fluentBuddyChatWidget')) {
    const chatMarkup = `
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
    document.body.insertAdjacentHTML('beforeend', chatMarkup);
  }

  if (!document.querySelector('script[data-chat-widget="true"]')) {
    const chatScript = document.createElement('script');
    chatScript.src = '/js/ChatWidget.js';
    chatScript.dataset.chatWidget = 'true';
    chatScript.async = true;
    document.body.appendChild(chatScript);
  }

  const pageKey = shell.dataset.page || 'dashboard';
  const normalizedPath = window.location.pathname || '/dashboard';
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const userName = user && (user.name || user.username) ? (user.name || user.username) : 'Student';
  const englishLevel = user && (user.englishLevel || user.level) ? (user.englishLevel || user.level) : 'Beginner';

  const headerMarkup = `
    <header class="site-header">
      <div class="nav-container">
        <a href="/dashboard" class="brand" aria-label="FluentBuddy Home">
          <span class="brand-mark">F</span>
          <span class="brand-name">FluentBuddy</span>
        </a>

        <nav class="nav-links" aria-label="Main navigation">
          <a href="/dashboard" class="nav-link ${normalizedPath === '/dashboard' || normalizedPath === '/' ? 'active' : ''}">Home / Dashboard</a>
          <a href="/practice" class="nav-link ${normalizedPath === '/practice' ? 'active' : ''}">Practice Hub</a>
          <a href="/progress" class="nav-link ${normalizedPath === '/progress' ? 'active' : ''}">My Progress / Analytics</a>
          <a href="/profile" class="nav-link ${normalizedPath === '/profile' ? 'active' : ''}">Profile</a>
        </nav>

        <div class="nav-actions">
          <div class="user-pill">
            <span id="userDisplay">${userName}</span>
            <span id="userLevelBadge" class="user-level-badge">${englishLevel}</span>
          </div>
          <button id="logoutBtn" class="btn btn-secondary" type="button">Logout</button>
        </div>
      </div>
    </header>
  `;

  shell.innerHTML = headerMarkup;

  const logoutButton = document.getElementById('logoutBtn');
  if (logoutButton && typeof logout === 'function') {
    logoutButton.addEventListener('click', logout);
  }

  const userDisplay = document.getElementById('userDisplay');
  if (userDisplay && user) {
    userDisplay.textContent = user.name || user.username || 'Student';
  }

  const userLevelBadge = document.getElementById('userLevelBadge');
  if (userLevelBadge) {
    userLevelBadge.textContent = user && (user.englishLevel || user.level) ? (user.englishLevel || user.level) : 'Beginner';
  }

  const footer = document.querySelector('.site-footer');
  if (!footer) {
    const footerMarkup = `
      <footer class="site-footer">
        &copy; 2026 FluentBuddy. Learn English with clarity and confidence.
      </footer>
    `;
    document.body.insertAdjacentHTML('beforeend', footerMarkup);
  }

  if (typeof displayUserInfo === 'function') {
    displayUserInfo();
  }

  if (typeof initializeLogout === 'function') {
    initializeLogout();
  }
});
