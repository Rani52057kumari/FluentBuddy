// Notes UI interactions for dashboard
document.addEventListener('DOMContentLoaded', function() {
    // load notes only on pages that include notes container
    if (!document.getElementById('notesSection')) return;

    requireAuth();
    populateProjectSelect('noteProjectSelect');
    loadUserNotes();

    const noteContentInput = document.getElementById('noteContent');
    const notePreview = document.getElementById('notePreview');
    const explainBtn = document.getElementById('explainNoteBtn');
    const improveBtn = document.getElementById('improveNoteBtn');

    if (noteContentInput) {
        noteContentInput.addEventListener('input', () => updateMarkdownPreview(noteContentInput.value, notePreview));
        updateMarkdownPreview(noteContentInput.value, notePreview);
    }

    if (explainBtn) {
        explainBtn.addEventListener('click', async () => {
            const text = (document.getElementById('noteContent') || {}).value || '';
            if (!text.trim()) return alert('Write a note first.');

            try {
                const response = await fetch(`${API_URL}/gemini/explain`, {
                    method: 'POST',
                    headers: Object.assign({'Content-Type': 'application/json'}, getAuthHeaders()),
                    body: JSON.stringify({ text }),
                });
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.message || 'Unable to explain note.');
                if (notePreview) {
                    notePreview.innerHTML = `<strong>Explanation</strong><br>${escapeHtml(payload.explanation || 'No explanation returned.')}`;
                }
            } catch (error) {
                console.error('Explain note error:', error);
                alert(error.message || 'Could not explain the note.');
            }
        });
    }

    if (improveBtn) {
        improveBtn.addEventListener('click', async () => {
            const text = (document.getElementById('noteContent') || {}).value || '';
            if (!text.trim()) return alert('Write a note first.');

            try {
                const response = await fetch(`${API_URL}/ai/evaluate-writing`, {
                    method: 'POST',
                    headers: Object.assign({'Content-Type': 'application/json'}, getAuthHeaders()),
                    body: JSON.stringify({ text, englishLevel: 'Intermediate' }),
                });
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.message || 'Unable to suggest improvements.');
                if (notePreview) {
                    const fixes = Array.isArray(payload.grammarFixes) && payload.grammarFixes.length
                        ? `<ul>${payload.grammarFixes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
                        : '<p>No specific fixes suggested.</p>';
                    notePreview.innerHTML = `<strong>Suggested improvements</strong><br>${escapeHtml(payload.feedback || '')}${fixes}`;
                }
            } catch (error) {
                console.error('Suggest improvements error:', error);
                alert(error.message || 'Could not suggest improvements.');
            }
        });
    }

    const createForm = document.getElementById('createNoteForm');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('noteTitle').value;
            const content = document.getElementById('noteContent').value;
            const projectId = document.getElementById('noteProjectSelect')?.value || '';

            if (!projectId) {
                alert('Select a project for this note.');
                return;
            }

            try {
                const res = await fetch(`${API_URL}/notes`, {
                    method: 'POST',
                    headers: Object.assign({'Content-Type':'application/json'}, getAuthHeaders()),
                    body: JSON.stringify({ title, content, projectId })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Unable to create note');
                document.getElementById('noteTitle').value = '';
                document.getElementById('noteContent').value = '';
                if (notePreview) notePreview.innerHTML = '';
                await loadUserNotes();
            } catch (err) {
                console.error('Create note error', err);
                alert(err.message || 'Create note failed');
            }
        });
    }
});

async function populateProjectSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    try {
        const res = await fetch(`${API_URL}/projects`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Unable to load projects');

        const projects = Array.isArray(data.projects) ? data.projects : [];
        select.innerHTML = '<option value="">Select a project</option>' + projects.map((project) => `<option value="${project._id}">${escapeHtml(project.name || 'Untitled Project')}</option>`).join('');
    } catch (error) {
        console.error('Load project select error:', error);
        select.innerHTML = '<option value="">Unable to load projects</option>';
    }
}

async function loadUserNotes() {
    try {
        const projectId = document.getElementById('noteProjectSelect')?.value || '';
        const url = projectId ? `${API_URL}/notes?projectId=${encodeURIComponent(projectId)}` : `${API_URL}/notes`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Unable to load notes');

        const list = document.getElementById('notesList');
        if (!list) return;
        list.innerHTML = '';

        data.notes.forEach(note => {
                const li = document.createElement('li');
                li.className = 'note-item';
                const ownerName = note.owner ? (note.owner.name || note.owner.email || 'You') : 'Unknown';
                const ownerId = note.owner ? (note.owner._id || note.owner) : null;

                // Note header with owner label
                const headerHtml = `<strong>${escapeHtml(note.title)}</strong><span class="note-owner">(owner: ${escapeHtml(ownerName)})</span>`;

                // Invite UI for any logged-in user (allow invites by email/userId)
                const currentUser = getCurrentUser();
                let inviteHtml = '';
                if (currentUser) {
                    inviteHtml = `
                        <form class="invite-form" data-note-id="${note._id}">
                            <input name="invite" class="invite-input" placeholder="Email or User ID" />
                            <button type="submit" class="btn-secondary btn-invite">Invite</button>
                        </form>
                    `;
                }

                // Members list
                let membersHtml = '';
                if (Array.isArray(note.members) && note.members.length) {
                    membersHtml = '<ul class="members-list">';
                    note.members.forEach(m => {
                        const mName = m.name || m.email || 'Member';
                        const mId = m._id || m;
                        const isOwnerMember = String(mId) === String(ownerId);
                        membersHtml += `<li class="member-item">${escapeHtml(mName)}${isOwnerMember ? ' <span class="note-owner">(owner)</span>' : ''}`;
                        // show remove button only if current user is owner and this member is not owner
                        if (currentUser && ownerId && String(currentUser._id) === String(ownerId) && !isOwnerMember) {
                            membersHtml += ` <button class="btn btn-secondary btn-remove-member" data-note-id="${note._id}" data-member-id="${mId}">Remove</button>`;
                        }
                        membersHtml += `</li>`;
                    });
                    membersHtml += '</ul>';
                }

                li.innerHTML = headerHtml + `<p>${escapeHtml(note.content || '')}</p>` + membersHtml + inviteHtml;
                list.appendChild(li);
        });
            // attach invite form handlers (event delegation)
            list.querySelectorAll('.invite-form').forEach(form => {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const noteId = form.getAttribute('data-note-id');
                    const value = (form.querySelector('.invite-input') || {}).value || '';
                    const payload = value.includes('@') ? { email: value.trim() } : { userId: value.trim() };

                    try {
                        const res = await fetch(`${API_URL}/notes/${noteId}/members`, {
                                method: 'POST',
                                headers: Object.assign({'Content-Type':'application/json'}, getAuthHeaders()),
                                body: JSON.stringify(payload)
                            });

                        const data = await res.json();
                        if (!res.ok) throw new Error(data.message || 'Unable to add member');
                        // show basic inline feedback (alert for now)
                        alert('Member added successfully');
                        await loadUserNotes();
                    } catch (err) {
                        console.error('Add member error', err);
                        alert(err.message || 'Add member failed');
                    }
                });
            });
        // attach remove-member handlers
        list.querySelectorAll('.btn-remove-member').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const noteId = btn.getAttribute('data-note-id');
                const memberId = btn.getAttribute('data-member-id');
                if (!confirm('Remove this member from the note?')) return;

                try {
                    const res = await fetch(`${API_URL}/notes/${noteId}/members/${memberId}`, {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Unable to remove member');
                    alert('Member removed');
                    await loadUserNotes();
                } catch (err) {
                    console.error('Remove member error', err);
                    alert(err.message || 'Remove member failed');
                }
            });
        });
    } catch (err) {
        console.error('Load notes error', err);
    }
}

function updateMarkdownPreview(value, previewEl) {
    if (!previewEl) return;
    const text = value || '';
    const html = text
        .split('\n')
        .map((line) => line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>'))
        .join('<br>');
    previewEl.innerHTML = html || '<em>Preview will appear here...</em>';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
