document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('invitesSection')) return;

    requireAuth();
    loadInvites();
});

async function loadInvites() {
    try {
        const res = await fetch(`${API_URL}/invites`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Unable to load invites');

        const list = document.getElementById('invitesList');
        if (!list) return;
        list.innerHTML = '';

        (data.invites || []).forEach(invite => {
            const li = document.createElement('li');
            li.className = 'invite-item';
            const fromName = (invite.from && (invite.from.name || invite.from.email)) || 'Someone';
            const noteTitle = invite.note ? invite.note.title : 'a note';
            li.innerHTML = `<div class="invite-text"><strong>${escapeHtml(noteTitle)}</strong> — invited by ${escapeHtml(fromName)}</div>
                <div class="invite-actions">
                    <button class="btn-primary btn-accept" data-id="${invite._id}">Accept</button>
                    <button class="btn-secondary btn-reject" data-id="${invite._id}">Reject</button>
                </div>`;
            list.appendChild(li);
        });

        // attach handlers
        list.querySelectorAll('.btn-accept').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                try {
                    const res = await fetch(`${API_URL}/invites/${id}/accept`, { method: 'POST', headers: getAuthHeaders() });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Accept failed');
                    alert('Invite accepted');
                    await loadInvites();
                    // reload notes to reflect membership
                    if (window.loadUserNotes) await loadUserNotes();
                } catch (err) {
                    console.error('Accept invite error', err);
                    alert(err.message || 'Accept failed');
                }
            });
        });

        list.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                try {
                    const res = await fetch(`${API_URL}/invites/${id}/reject`, { method: 'POST', headers: getAuthHeaders() });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Reject failed');
                    alert('Invite rejected');
                    await loadInvites();
                } catch (err) {
                    console.error('Reject invite error', err);
                    alert(err.message || 'Reject failed');
                }
            });
        });
    } catch (err) {
        console.error('Load invites error', err);
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
