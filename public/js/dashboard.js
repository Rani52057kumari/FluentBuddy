// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Require authentication
    requireAuth();
    
    // Display user info
    displayUserInfo();
    initializeLogout();

    const user = getCurrentUser();
    document.getElementById('username').textContent = user.username;
    document.getElementById('userLevel').textContent = capitalizeFirst(user.englishLevel || user.level || 'beginner');

    const projectForm = document.getElementById('createProjectForm');
    if (projectForm) {
        projectForm.addEventListener('submit', createProjectHandler);
    }

    // Load progress overview
    loadProgressOverview();
    loadContributionAnalytics();
    loadProjects();
});

async function createProjectHandler(event) {
    event.preventDefault();

    const nameInput = document.getElementById('projectNameInput');
    const descriptionInput = document.getElementById('projectDescriptionInput');
    const isPublicInput = document.getElementById('projectIsPublicInput');

    const name = (nameInput?.value || '').trim();
    if (!name) {
        alert('Project name is required.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
            body: JSON.stringify({
                name,
                description: descriptionInput?.value || '',
                isPublic: Boolean(isPublicInput?.checked),
            }),
        });

        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.message || 'Unable to create project.');
        }

        if (projectNameInput) projectNameInput.value = '';
        if (projectDescriptionInput) projectDescriptionInput.value = '';
        if (isPublicInput) isPublicInput.checked = false;

        await loadProjects();
        alert('Project created successfully.');
    } catch (error) {
        console.error('Create project error:', error);
        alert(error.message || 'Unable to create project.');
    }
}

async function loadProjects() {
    const listEl = document.getElementById('projectsList');
    if (!listEl) return;

    try {
        const response = await fetch(`${API_URL}/projects`, {
            headers: getAuthHeaders(),
        });

        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Unable to load projects.');

        const projects = Array.isArray(payload.projects) ? payload.projects : [];

        if (!projects.length) {
            listEl.innerHTML = '<li class="empty-state">No projects yet. Create one to share your work.</li>';
            return;
        }

        listEl.innerHTML = projects.map((project) => {
            const publicUrl = project.publicSlug ? `${window.location.origin}/project/${project.publicSlug}` : '';
            const publicButton = publicUrl
                ? `<button class="btn-module" data-share-url="${publicUrl}" data-project-id="${project._id}" data-action="copy-share">Copy Public Link</button>`
                : `<button class="btn-module" data-project-id="${project._id}" data-action="generate-share">Generate Public Link</button>`;

            return `
                <li class="note-item" style="display:block;">
                    <h3>${escapeHtml(project.name || 'Untitled Project')}</h3>
                    <p class="note-content">${escapeHtml(project.description || 'No description provided.')}</p>
                    <div class="meta">${Array.isArray(project.members) ? project.members.length : 0} members</div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:12px;">
                        ${publicButton}
                        ${publicUrl ? `<a class="btn-module" href="${publicUrl}" target="_blank" rel="noreferrer noopener">Open Public Page</a>` : ''}
                    </div>
                </li>
            `;
        }).join('');

        listEl.querySelectorAll('[data-action]').forEach((button) => {
            button.addEventListener('click', async () => {
                const action = button.dataset.action;
                const projectId = button.dataset.projectId;
                const shareUrl = button.dataset.shareUrl || '';

                try {
                    if (action === 'copy-share' && shareUrl) {
                        await navigator.clipboard.writeText(shareUrl);
                        alert('Public project link copied to clipboard.');
                        return;
                    }

                    const response = await fetch(`${API_URL}/projects/${projectId}/share`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                    });

                    const payload = await response.json();
                    if (!response.ok) throw new Error(payload.message || 'Unable to generate share link.');

                    const generatedUrl = payload.shareUrl || '';
                    if (generatedUrl && navigator.clipboard) {
                        await navigator.clipboard.writeText(generatedUrl);
                    }

                    await loadProjects();
                    alert(generatedUrl ? `Public link created and copied: ${generatedUrl}` : 'Public link created successfully.');
                } catch (error) {
                    console.error('Project share error:', error);
                    alert(error.message || 'Unable to create public link.');
                }
            });
        });
    } catch (error) {
        console.error('Load projects error:', error);
        listEl.innerHTML = '<li class="empty-state">Unable to load projects right now.</li>';
    }
}

async function loadContributionAnalytics() {
    const tableBody = document.getElementById('contributionTableBody');
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_URL}/analytics/contribution`, {
            headers: getAuthHeaders(),
        });

        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Unable to load contribution analytics.');

        const data = payload.data || {};
        const activityLogs = Array.isArray(data.activityLogs) ? data.activityLogs : [];

        document.getElementById('teamMemberCount').textContent = Number(data.teamMembers || 0);
        document.getElementById('totalNotesCreated').textContent = Number(data.totalNotes || 0);
        document.getElementById('totalFilesUploaded').textContent = Number(data.totalFiles || 0);

        if (!activityLogs.length) {
            tableBody.innerHTML = '<tr><td colspan="4" class="empty-state">No activity yet. Create notes or upload files to start tracking team contributions.</td></tr>';
            return;
        }

        tableBody.innerHTML = activityLogs.map((member) => `
            <tr>
                <td>${escapeHtml(member.name || 'Unknown User')}</td>
                <td>${Number(member.notesCreated || 0)}</td>
                <td>${Number(member.filesUploaded || 0)}</td>
                <td>${Number(member.totalActivities || 0)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Contribution analytics error:', error);
        tableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Unable to load contribution analytics.</td></tr>';
    }
}

async function loadProgressOverview() {
    try {
        const response = await fetch(`${API_URL}/analytics/progress`, {
            headers: getAuthHeaders()
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || responseData.error || 'Unable to load progress data.');
        }

        const data = responseData.data || {};
        const userLevel = data.currentLevel || getCurrentUser()?.englishLevel || getCurrentUser()?.level || 'beginner';
        const byType = {};

        if (Array.isArray(data.byType)) {
            data.byType.forEach((item) => {
                byType[String(item.exercise_type || '').toLowerCase()] = Number(item.count || 0);
            });
        }

        document.getElementById('totalExercises').textContent = Number(data.totalExercises || 0);
        document.getElementById('averageScore').textContent = `${Number(data.averageScore || 0)}%`;
        document.getElementById('userLevel').textContent = capitalizeFirst(userLevel);

        document.getElementById('speakingCount').textContent = `${byType.speaking || 0} completed`;
        document.getElementById('writingCount').textContent = `${byType.writing || 0} completed`;
        document.getElementById('readingCount').textContent = `${byType.reading || 0} completed`;
    } catch (error) {
        console.error('Error loading progress:', error);
        document.getElementById('totalExercises').textContent = 0;
        document.getElementById('averageScore').textContent = '0%';
        document.getElementById('userLevel').textContent = capitalizeFirst(getCurrentUser()?.englishLevel || getCurrentUser()?.level || 'beginner');
        document.getElementById('speakingCount').textContent = '0 completed';
        document.getElementById('writingCount').textContent = '0 completed';
        document.getElementById('readingCount').textContent = '0 completed';
    }
}

function capitalizeFirst(str) {
    const value = String(str || 'beginner');
    return value.charAt(0).toUpperCase() + value.slice(1);
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
