document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('filesSection')) return;

    requireAuth();
    initFileForm();
    loadFiles();
});

function initFileForm() {
    const form = document.getElementById('uploadFileForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('fileInput');
        if (!fileInput.files.length) return alert('Select a file');

        const fd = new FormData();
        fd.append('file', fileInput.files[0]);

        try {
            const res = await fetch(`${API_URL}/files/upload`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: fd,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Upload failed');
            fileInput.value = '';
            await loadFiles();
        } catch (err) {
            console.error('Upload error', err);
            alert(err.message || 'Upload failed');
        }
    });
}

async function loadFiles() {
    try {
        const res = await fetch(`${API_URL}/files`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Unable to load files');
        const list = document.getElementById('filesList');
        if (!list) return;
        list.innerHTML = '';

        (data.files || []).forEach(f => {
            const li = document.createElement('li');
            li.className = 'file-item';
            const url = `/uploads/${f.filename}`;
            const ext = (f.originalName || '').split('.').pop().toLowerCase();

            let previewBtn = '';
            if (['png','jpg','jpeg','gif'].includes(ext)) {
                previewBtn = `<button class="btn btn-secondary btn-preview" data-url="${url}">Preview</button>`;
            } else if (['js','py','txt','md','json'].includes(ext)) {
                previewBtn = `<button class="btn btn-secondary btn-preview" data-url="${url}" data-ext="${ext}" data-filename="${f.originalName}">Preview</button>`;
            }

            // show explain for js, py and pdf (pdf will use server-extracted text)
            const explainBtn = (['js','py','pdf'].includes(ext)) ? `<button class="btn btn-primary btn-explain" data-url="${url}" data-filename="${f.originalName}" data-upload-filename="${f.filename}" data-ext="${ext}">Explain Code</button>` : '';

            li.innerHTML = `<div class="file-meta"><strong>${escapeHtml(f.originalName)}</strong> <small>${(f.size||0)} bytes</small></div><div class="file-actions">${previewBtn} ${explainBtn}</div>`;
            list.appendChild(li);
        });

        // attach handlers
        list.querySelectorAll('.btn-preview').forEach(btn => {
            btn.addEventListener('click', () => {
                const url = btn.getAttribute('data-url');
                const ext = btn.getAttribute('data-ext');
                const filename = btn.getAttribute('data-filename') || '';
                openPreview(url, ext, filename);
            });
        });

        list.querySelectorAll('.btn-explain').forEach(btn => {
            btn.addEventListener('click', async () => {
                const url = btn.getAttribute('data-url');
                const filename = btn.getAttribute('data-filename') || '';
                const uploadFilename = btn.getAttribute('data-upload-filename') || '';
                const ext = (btn.getAttribute('data-ext') || '').toLowerCase();
                try {
                    let aiRes;
                    if (ext === 'pdf') {
                        // For PDFs, ask server to use extractedText by passing upload filename
                        aiRes = await fetch(`${API_URL}/ai/explain-code`, {
                            method: 'POST',
                            headers: Object.assign({'Content-Type':'application/json'}, getAuthHeaders()),
                            body: JSON.stringify({ filename: uploadFilename }),
                        });
                    } else {
                        // For text/code files, fetch the raw text then send
                        const fileRes = await fetch(url, { headers: getAuthHeaders() });
                        const code = await fileRes.text();
                        aiRes = await fetch(`${API_URL}/ai/explain-code`, {
                            method: 'POST',
                            headers: Object.assign({'Content-Type':'application/json'}, getAuthHeaders()),
                            body: JSON.stringify({ code, filename: uploadFilename }),
                        });
                    }

                    const aiData = await aiRes.json();

                    // If server indicates no extracted text for PDF, show helpful guidance
                    if (aiRes.status === 422) {
                        alert(aiData.message || 'No text was extracted from this file. Upload a searchable PDF or paste the text to explain.');
                        return;
                    }

                    if (!aiRes.ok) throw new Error(aiData.message || 'Explain failed');

                    // If AI returned placeholders for every line, show a helpful tip
                    const lines = aiData.lines || [];
                    const allUnavailable = lines.length && lines.every(l => !l.explanation || String(l.explanation).toLowerCase().includes('explanation not available'));
                    if (allUnavailable) {
                        alert('The AI could not generate explanations for this file. It may be a scanned PDF or unsupported format. Try uploading a searchable PDF or paste the text.');
                    }

                    showCodeExplanation(lines);
                } catch (err) {
                    console.error('Explain code error', err);
                    alert(err.message || 'Explain failed');
                }
            });
        });

    } catch (err) {
        console.error('Load files error', err);
    }
}

function openPreview(url, ext, filename) {
    // For images, open in new tab; for text/code, fetch and show modal
    if (['png','jpg','jpeg','gif'].includes((ext||'').toLowerCase())) {
        window.open(url, '_blank');
        return;
    }

    fetch(url, { headers: getAuthHeaders() }).then(r => r.text()).then(text => {
        const w = window.open('', '_blank');
        w.document.title = filename || 'Preview';
        const pre = w.document.createElement('pre');
        pre.textContent = text;
        w.document.body.appendChild(pre);
    }).catch(err => { console.error('Preview fetch error', err); alert('Unable to preview file'); });
}

function showCodeExplanation(lines) {
    const win = window.open('', '_blank');
    win.document.title = 'Code Explanation';
    const container = win.document.createElement('div');
    container.style.fontFamily = 'sans-serif';
    container.style.padding = '18px';
    lines.forEach(l => {
        const p = win.document.createElement('p');
        p.innerHTML = `<strong>Line ${l.line}:</strong> <code>${escapeHtml(l.code)}</code><br/><em>${escapeHtml(l.explanation)}</em>`;
        container.appendChild(p);
    });
    win.document.body.appendChild(container);
}

function escapeHtml(str) { if (!str) return ''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
