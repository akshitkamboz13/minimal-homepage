/**
 * Widget Studio — Editor Tabs & Code Pane Renderer
 */
import { state } from './state.js';
import { fileIconSVG, SVG_LOCK, SVG_PEN } from './icons.js';
import { INDEX_LOCKED_HEAD, INDEX_LOCKED_FOOT } from '../file-system/index.js';

export function saveCurrentEditorContent() {
    if (!state.activeFileId) return;
    const node = state.fs.getNode(state.activeFileId);
    if (!node) return;

    const editorPaneEl = document.getElementById('editor-pane');
    if (node.isHtmlRoot) {
        const area = editorPaneEl?.querySelector('.editor-body-area');
        if (area) state.fs.updateContent(state.activeFileId, area.value);
    } else {
        const area = editorPaneEl?.querySelector('.editor-textarea');
        if (area) state.fs.updateContent(state.activeFileId, area.value);
    }

    // Dynamic import to avoid circular dependency loop with manifest-sync.js
    if (node.isManifest) {
        import('./manifest-sync.js').then(m => m.syncFormFromManifest());
    }
}

export function openFile(id) {
    const node = state.fs.getNode(id);
    if (!node || node.type === 'folder') return;

    saveCurrentEditorContent();

    if (!state.openTabs.find(t => t.id === id)) {
        state.openTabs.push({ id, name: node.name, language: node.language });
    }
    state.activeFileId = id;
    renderTabsBar();
    renderEditorPane();

    import('./file-tree-view.js').then(m => m.renderFileTree());
}

export function closeTab(id) {
    const idx = state.openTabs.findIndex(t => t.id === id);
    if (idx === -1) return;

    if (id === state.activeFileId) saveCurrentEditorContent();
    state.openTabs.splice(idx, 1);

    if (state.activeFileId === id) {
        state.activeFileId = state.openTabs[Math.max(0, idx - 1)]?.id
                    || state.openTabs[0]?.id
                    || null;
    }
    renderTabsBar();
    renderEditorPane();

    import('./file-tree-view.js').then(m => m.renderFileTree());
}

export function renderTabsBar() {
    const editorTabsBarEl = document.getElementById('editor-tabs-bar');
    if (!editorTabsBarEl) return;
    editorTabsBarEl.innerHTML = '';

    for (const tab of state.openTabs) {
        const tabEl = document.createElement('div');
        tabEl.className = 'editor-tab' + (tab.id === state.activeFileId ? ' active' : '');
        tabEl.dataset.tabId = tab.id;

        const iconWrap = document.createElement('span');
        iconWrap.className = 'tab-file-icon';
        iconWrap.innerHTML = fileIconSVG(tab.language, 14);
        tabEl.appendChild(iconWrap);

        const nameEl = document.createElement('span');
        nameEl.className = 'tab-name' + (tab.language ? ` lang-${tab.language}` : '');
        nameEl.textContent = tab.name;
        tabEl.appendChild(nameEl);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'tab-close';
        closeBtn.title = 'Close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', e => { e.stopPropagation(); closeTab(tab.id); });
        tabEl.appendChild(closeBtn);

        tabEl.addEventListener('click', () => {
            if (tab.id !== state.activeFileId) {
                saveCurrentEditorContent();
                state.activeFileId = tab.id;
                renderTabsBar();
                renderEditorPane();
                import('./file-tree-view.js').then(m => m.renderFileTree());
            }
        });

        editorTabsBarEl.appendChild(tabEl);
    }
}

export function renderEditorPane() {
    const editorPaneEl = document.getElementById('editor-pane');
    if (!editorPaneEl) return;
    editorPaneEl.innerHTML = '';

    if (!state.activeFileId) {
        editorPaneEl.innerHTML = `
            <div class="editor-empty">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.25">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                    <polyline points="13 2 13 9 20 9"/>
                </svg>
                <p>Select a file to start editing</p>
            </div>`;
        return;
    }

    const node = state.fs.getNode(state.activeFileId);
    if (!node) return;

    if (node.isHtmlRoot) {
        renderSplitHtmlEditor(node, editorPaneEl);
    } else {
        renderSingleEditor(node, editorPaneEl);
    }
}

function renderSplitHtmlEditor(node, container) {
    const headZone = document.createElement('div');
    headZone.className = 'editor-locked-zone';

    const headLabel = document.createElement('div');
    headLabel.className = 'editor-zone-label';
    headLabel.innerHTML = SVG_LOCK + ' &lt;head&gt; — managed by Widget Studio (read-only)';
    headZone.appendChild(headLabel);

    const headPre = document.createElement('pre');
    headPre.className = 'editor-pre-locked';
    headPre.textContent = INDEX_LOCKED_HEAD;
    headZone.appendChild(headPre);
    container.appendChild(headZone);

    const bodyZone = document.createElement('div');
    bodyZone.className = 'editor-editable-zone';

    const bodyLabel = document.createElement('div');
    bodyLabel.className = 'editor-zone-label editable';
    bodyLabel.innerHTML = SVG_PEN + ' &lt;body&gt; content — editable';
    bodyZone.appendChild(bodyLabel);

    const bodyArea = document.createElement('textarea');
    bodyArea.className = 'editor-body-area';
    bodyArea.spellcheck = false;
    bodyArea.placeholder = '<!-- Write your widget body HTML here -->';
    bodyArea.value = node.content;

    bodyArea.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = bodyArea.selectionStart;
            const end   = bodyArea.selectionEnd;
            bodyArea.value = bodyArea.value.substring(0, start) + '  ' + bodyArea.value.substring(end);
            bodyArea.selectionStart = bodyArea.selectionEnd = start + 2;
        }
    });

    bodyZone.appendChild(bodyArea);
    container.appendChild(bodyZone);

    const footZone = document.createElement('div');
    footZone.className = 'editor-locked-zone';

    const footPre = document.createElement('pre');
    footPre.className = 'editor-pre-locked';
    footPre.textContent = INDEX_LOCKED_FOOT;
    footZone.appendChild(footPre);
    container.appendChild(footZone);
}

function renderSingleEditor(node, container) {
    const area = document.createElement('textarea');
    area.className = 'editor-textarea';
    area.spellcheck = false;
    area.value = node.content;
    area.placeholder = {
        css:      '/* Widget styles */',
        js:       '// Widget script',
        json:     '{\n  \n}',
        html:     '<!-- HTML content -->',
        markdown: '# Notes',
        text:     '',
    }[node.language] || '';

    area.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = area.selectionStart;
            const end   = area.selectionEnd;
            area.value = area.value.substring(0, start) + '  ' + area.value.substring(end);
            area.selectionStart = area.selectionEnd = start + 2;
        }
    });

    container.appendChild(area);
}
