// Notes UI interactions for dashboard
document.addEventListener('DOMContentLoaded', function() {
    // load notes only on pages that include notes container
    if (!document.getElementById('notesSection')) return;

    requireAuth();
    loadUserNotes();

    const createForm = document.getElementById('createNoteForm');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('noteTitle').value;
            const content = document.getElementById('noteContent').value;

            try {
                const res = await fetch(`${API_URL}/notes`, {
                    method: 'POST',
                    headers: Object.assign({'Content-Type':'application/json'}, getAuthHeaders()),
                    body: JSON.stringify({ title, content })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Unable to create note');
                document.getElementById('noteTitle').value = '';
                document.getElementById('noteContent').value = '';
                await loadUserNotes();
            } catch (err) {
                console.error('Create note error', err);
                alert(err.message || 'Create note failed');
            }
        });
    }
});

async function loadUserNotes() {
    try {
        const res = await fetch(`${API_URL}/notes`, { headers: getAuthHeaders() });
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

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
