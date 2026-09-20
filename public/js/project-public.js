document.addEventListener('DOMContentLoaded', async () => {
  const slug = window.location.pathname.split('/project/')[1];
  if (!slug) {
    document.getElementById('projectName').textContent = 'Project not found';
    return;
  }

  try {
    const response = await fetch(`${API_URL.replace('/api', '')}/api/projects/public/${slug}`);
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || 'Unable to load public project.');
    }

    const { project, notes = [], files = [], summary = {} } = payload;
    document.getElementById('projectName').textContent = project.name || 'Untitled Project';
    document.getElementById('projectDescription').textContent = project.description || 'This project is shared publicly for read-only viewing.';
    document.getElementById('memberCount').textContent = Array.isArray(project.members) ? project.members.length : 0;
    document.getElementById('noteCount').textContent = Number(summary.totalNotes || notes.length || 0);
    document.getElementById('fileCount').textContent = Number(summary.totalFiles || files.length || 0);

    const memberList = document.getElementById('memberList');
    const memberNames = Array.isArray(project.members) ? project.members : [];
    memberList.innerHTML = memberNames.length
      ? memberNames.map((member) => `<span class="member-pill">${escapeHtml(member.name || 'Member')}</span>`).join('')
      : '<span class="empty-state">No members yet.</span>';

    const noteList = document.getElementById('noteList');
    noteList.innerHTML = notes.length
      ? notes.map((note) => `
          <li class="note-item">
            <h3>${escapeHtml(note.title || 'Untitled note')}</h3>
            <div class="meta">By ${escapeHtml(note.owner?.name || 'Anonymous')} · ${new Date(note.createdAt).toLocaleDateString()}</div>
            <p class="note-content">${escapeHtml(note.content || '')}</p>
          </li>
        `).join('')
      : '<li class="empty-state">No public notes available for this project.</li>';

    const fileList = document.getElementById('fileList');
    fileList.innerHTML = files.length
      ? files.map((file) => `
          <li class="file-item">
            <h3>${escapeHtml(file.originalName || file.filename || 'Uploaded file')}</h3>
            <div class="meta">Uploaded by ${escapeHtml(file.uploader?.name || 'Unknown')} · ${new Date(file.createdAt).toLocaleDateString()}</div>
            <a href="/uploads/${encodeURIComponent(file.filename)}" target="_blank" rel="noreferrer noopener">Open file</a>
          </li>
        `).join('')
      : '<li class="empty-state">No public files available for this project.</li>';
  } catch (error) {
    console.error('Public project load error:', error);
    document.getElementById('projectName').textContent = 'Project unavailable';
    document.getElementById('projectDescription').textContent = error.message || 'This public project could not be loaded.';
    document.getElementById('noteList').innerHTML = '<li class="empty-state">This project is not available or the link is invalid.</li>';
    document.getElementById('fileList').innerHTML = '<li class="empty-state">No files available.</li>';
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
