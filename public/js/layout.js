document.addEventListener('DOMContentLoaded', function () {
  const shell = document.getElementById('app-layout');
  if (!shell) return;

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
