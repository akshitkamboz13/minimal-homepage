/**
 * Widget Studio — Builder IDE Controller
 *
 * Manages the VS Code-style file system, editor tabs, split HTML editing,
 * live preview, widget save/export, and the right-click context menu.
 */
import { FileSystem, INDEX_LOCKED_HEAD, INDEX_LOCKED_FOOT } from './file-system.js';

// ══════════════════════════════════════════════════════════════════════════════
// INLINE SVG ICON STRINGS
// ══════════════════════════════════════════════════════════════════════════════

const SVG_NEW_FILE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="18" x2="12" y2="12"/>
    <line x1="9"  y1="15" x2="15" y2="15"/>
</svg>`;

const SVG_RENAME = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
</svg>`;

const SVG_TRASH = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
</svg>`;

const SVG_LOCK = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
</svg>`;

const SVG_PEN = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.5" stroke-linecap="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
</svg>`;

// ══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

async function compressString(str) {
    const blob = new Blob([str], { type: 'application/json' });
    const cs   = blob.stream().pipeThrough(new CompressionStream('gzip'));
    return new Response(cs).blob();
}

function getCustomWidgets() {
    try { return JSON.parse(localStorage.getItem('startpage_custom_widgets')) || []; }
    catch (e) { return []; }
}

function saveCustomWidgets(widgets) {
    localStorage.setItem('startpage_custom_widgets', JSON.stringify(widgets));
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, t =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t)
    );
}

/** Return the short label used inside file badge elements. */
function badgeLabel(language) {
    return { html: 'H', css: 'S', js: 'J', json: '{}', markdown: 'M', text: 'T' }[language] || '?';
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    // ── State ─────────────────────────────────────────────────────────────────
    const fs = new FileSystem();
    /** @type {Array<{id:string, name:string, language:string}>} */
    let openTabs       = [];
    let activeFileId   = null;
    let currentEditId  = null;
    let ctxTargetId    = null;  // node ID targeted by current context menu
    let projectTreeOpen = true;

    // ── DOM — sidebar ─────────────────────────────────────────────────────────
    const inputName     = document.getElementById('widget-name');
    const inputAuthor   = document.getElementById('widget-author');
    const inputVersion  = document.getElementById('widget-version');
    const inputDesc     = document.getElementById('widget-desc');
    const textareaEnv   = document.getElementById('widget-env');
    const selectType    = document.getElementById('widget-type');
    const textareaIcon  = document.getElementById('widget-icon-svg');
    const dimensionsGrp = document.getElementById('dimensions-group');
    const inputDefW     = document.getElementById('widget-def-w');
    const inputDefH     = document.getElementById('widget-def-h');
    const inputMinW     = document.getElementById('widget-min-w');
    const inputMinH     = document.getElementById('widget-min-h');
    const inputMaxW     = document.getElementById('widget-max-w');
    const inputMaxH     = document.getElementById('widget-max-h');

    // ── DOM — explorer ────────────────────────────────────────────────────────
    const fileTreeEl       = document.getElementById('file-tree');
    const projectToggleEl  = document.getElementById('file-tree-project-toggle');
    const projectNameEl    = document.getElementById('project-name-display');
    const btnNewFile       = document.getElementById('btn-new-file');
    const btnNewFolder     = document.getElementById('btn-new-folder');

    // ── DOM — editor ──────────────────────────────────────────────────────────
    const editorTabsBarEl  = document.getElementById('editor-tabs-bar');
    const editorPaneEl     = document.getElementById('editor-pane');

    // ── DOM — preview ─────────────────────────────────────────────────────────
    const previewIframe    = document.getElementById('preview-iframe');
    const btnRefresh       = document.getElementById('btn-refresh-preview');
    const previewThemeSel  = document.getElementById('preview-theme-select');

    // ── DOM — misc ────────────────────────────────────────────────────────────
    const btnSave          = document.getElementById('btn-save-widget');
    const btnExport        = document.getElementById('btn-export-pkg');
    const btnClose         = document.getElementById('btn-close-studio');
    const alertEl          = document.getElementById('studio-alert');
    const ctxMenu          = document.getElementById('file-ctx-menu');

    // ══════════════════════════════════════════════════════════════════════════
    // THEME & ACCENT
    // ══════════════════════════════════════════════════════════════════════════

    function resolveAccentColor() {
        try {
            const s = JSON.parse(localStorage.getItem('startpage_settings')) || {};
            const p = s.accentColor || 'blue';
            let hex = '#3b82f6';
            if (p === 'custom') {
                hex = s.customAccentColor || '#3b82f6';
            } else {
                hex = { blue: '#3b82f6', purple: '#a855f7', emerald: '#10b981',
                        amber: '#f59e0b', rose: '#f43f5e' }[p] || '#3b82f6';
            }
            document.body.style.setProperty('--accent-color', hex);
            return hex;
        } catch (e) { return '#3b82f6'; }
    }

    const initialTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', initialTheme);
    if (previewThemeSel) previewThemeSel.value = initialTheme;
    updatePreviewBackground(initialTheme);
    resolveAccentColor();

    window.addEventListener('storage', e => {
        if (e.key === 'theme') {
            const t = e.newValue || 'dark';
            document.body.setAttribute('data-theme', t);
            if (previewThemeSel) previewThemeSel.value = t;
            previewIframe?.contentWindow?.postMessage(
                { type: 'theme-changed', theme: t, accentColor: resolveAccentColor() }, '*');
        } else if (e.key === 'startpage_settings') {
            const hex = resolveAccentColor();
            previewIframe?.contentWindow?.postMessage(
                { type: 'theme-changed', theme: previewThemeSel?.value || 'dark', accentColor: hex }, '*');
        }
    });

    // ══════════════════════════════════════════════════════════════════════════
    // INITIALISE FILE SYSTEM
    // ══════════════════════════════════════════════════════════════════════════

    const urlParams = new URLSearchParams(window.location.search);
    const editId    = urlParams.get('edit');

    if (editId) {
        const widget = getCustomWidgets().find(w => w.id === editId);
        if (widget) {
            currentEditId = editId;
            document.title = `Edit Widget — ${widget.name}`;
            loadWidgetIntoForm(widget);
            if (widget.files && widget.files.length > 0) {
                fs.loadFromArray(widget.files);
            } else {
                // Migrate legacy {html, css, js} format
                fs.migrateFromLegacy({ html: widget.html, css: widget.css, js: widget.js });
            }
        } else {
            fs.createDefaultProject();
        }
    } else {
        fs.createDefaultProject();
    }

    // Sync project display name with widget name input
    if (inputName && projectNameEl) {
        const syncName = () => {
            projectNameEl.textContent = inputName.value.trim() || 'widget';
        };
        syncName();
        inputName.addEventListener('input', syncName);
    }

    renderFileTree();

    // Auto-open index.html (or first available file)
    const indexNode = fs.nodes.find(n => n.name === 'index.html' && n.type === 'file');
    if (indexNode) openFile(indexNode.id);
    else {
        const firstFile = fs.nodes.find(n => n.type === 'file');
        if (firstFile) openFile(firstFile.id);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // LOAD WIDGET INTO SIDEBAR FORM
    // ══════════════════════════════════════════════════════════════════════════

    function loadWidgetIntoForm(widget) {
        if (inputName)    inputName.value    = widget.name        || '';
        if (inputAuthor)  inputAuthor.value  = widget.author      || '';
        if (inputVersion) inputVersion.value = widget.version     || '1.0.0';
        if (inputDesc)    inputDesc.value    = widget.description || '';
        if (textareaEnv)  textareaEnv.value  = widget.env         || '';
        if (textareaIcon) textareaIcon.value = widget.icon        || '';
        if (selectType) {
            selectType.value = widget.type || 'app';
            toggleDimensionsVisibility(selectType.value);
        }
        if (inputDefW) inputDefW.value = widget.defaultW || 400;
        if (inputDefH) inputDefH.value = widget.defaultH || 300;
        if (inputMinW) inputMinW.value = widget.minW     || 200;
        if (inputMinH) inputMinH.value = widget.minH     || 160;
        if (inputMaxW) inputMaxW.value = widget.maxW     || 800;
        if (inputMaxH) inputMaxH.value = widget.maxH     || 600;

        // Restore permission checkboxes
        (widget.permissions || []).forEach(p => {
            const el = document.getElementById(`perm-${p}`);
            if (el) el.checked = true;
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DIMENSIONS VISIBILITY
    // ══════════════════════════════════════════════════════════════════════════

    function toggleDimensionsVisibility(type) {
        if (!dimensionsGrp) return;
        dimensionsGrp.classList.toggle('active', type === 'app' || type === 'widget');
    }

    selectType?.addEventListener('change', e => toggleDimensionsVisibility(e.target.value));

    // ══════════════════════════════════════════════════════════════════════════
    // FILE TREE RENDERING
    // ══════════════════════════════════════════════════════════════════════════

    function renderFileTree() {
        if (!fileTreeEl) return;
        fileTreeEl.innerHTML = '';
        if (projectTreeOpen) renderTreeLevel(null, fileTreeEl, 0);
    }

    function renderTreeLevel(parentId, container, depth) {
        const children = fs.getChildren(parentId);
        // Folders first, then alphabetical
        children.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        for (const node of children) {
            container.appendChild(createTreeItem(node, depth));
            if (node.type === 'folder') {
                const childWrap = document.createElement('div');
                childWrap.className = 'file-tree-children';
                container.appendChild(childWrap);
                if (node.isOpen) renderTreeLevel(node.id, childWrap, depth + 1);
            }
        }
    }

    function createTreeItem(node, depth) {
        const item = document.createElement('div');
        item.className = 'file-tree-item'
            + (node.type === 'folder' ? ' is-folder' : '')
            + (node.id === activeFileId  ? ' active'    : '');
        item.dataset.nodeId = node.id;
        item.style.paddingLeft = `${10 + depth * 14}px`;

        // Icon / badge
        if (node.type === 'folder') {
            const arrow = document.createElement('span');
            arrow.className = 'tree-arrow';
            arrow.textContent = node.isOpen ? '▾' : '▸';
            item.appendChild(arrow);

            // Folder SVG icon
            item.insertAdjacentHTML('beforeend',
                `<svg class="folder-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" opacity="0.55">
                    <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                 </svg>`);
        } else {
            const badge = document.createElement('span');
            badge.className = `file-badge ${node.language}`;
            badge.textContent = badgeLabel(node.language);
            item.appendChild(badge);
        }

        const nameEl = document.createElement('span');
        nameEl.className = 'file-name';
        nameEl.textContent = node.name;
        item.appendChild(nameEl);

        // Hover action buttons
        const actions = document.createElement('div');
        actions.className = 'file-item-actions';

        if (node.type === 'folder') {
            actions.appendChild(makeIconBtn('New File in Folder', SVG_NEW_FILE, e => {
                e.stopPropagation();
                promptNewFile(node.id);
            }));
        }
        actions.appendChild(makeIconBtn('Rename', SVG_RENAME, e => {
            e.stopPropagation();
            startInlineRename(node.id, nameEl);
        }));
        if (!node.isHtmlRoot) {
            const delBtn = makeIconBtn('Delete', SVG_TRASH, e => {
                e.stopPropagation();
                deleteNode(node.id);
            });
            delBtn.classList.add('danger');
            actions.appendChild(delBtn);
        }
        item.appendChild(actions);

        // Click to open file or toggle folder
        item.addEventListener('click', e => {
            if (e.target.closest('.file-item-actions')) return;
            if (node.type === 'folder') {
                fs.toggleFolder(node.id);
                renderFileTree();
            } else {
                openFile(node.id);
            }
        });

        // Right-click → context menu
        item.addEventListener('contextmenu', e => {
            e.preventDefault();
            e.stopPropagation();
            showCtxMenu(e.clientX, e.clientY, node.id);
        });

        return item;
    }

    function makeIconBtn(title, svgStr, handler) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'file-action-btn';
        btn.title = title;
        btn.innerHTML = svgStr;
        btn.addEventListener('click', handler);
        return btn;
    }

    // Project header — collapse / expand tree
    projectToggleEl?.addEventListener('click', () => {
        projectTreeOpen = !projectTreeOpen;
        const arrow = projectToggleEl.querySelector('.tree-arrow');
        if (arrow) arrow.textContent = projectTreeOpen ? '▾' : '▸';
        renderFileTree();
    });

    // Explorer toolbar: new file / new folder at root
    btnNewFile?.addEventListener('click',   () => promptNewFile(null));
    btnNewFolder?.addEventListener('click', () => promptNewFolder(null));

    // Background right-click in the tree area (no item)
    fileTreeEl?.addEventListener('contextmenu', e => {
        if (!e.target.closest('.file-tree-item')) {
            e.preventDefault();
            showCtxMenu(e.clientX, e.clientY, null);
        }
    });

    // ══════════════════════════════════════════════════════════════════════════
    // TAB MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════════

    function openFile(id) {
        const node = fs.getNode(id);
        if (!node || node.type === 'folder') return;

        saveCurrentEditorContent();

        if (!openTabs.find(t => t.id === id)) {
            openTabs.push({ id, name: node.name, language: node.language });
        }
        activeFileId = id;
        renderTabsBar();
        renderEditorPane();
        renderFileTree();
    }

    function closeTab(id) {
        const idx = openTabs.findIndex(t => t.id === id);
        if (idx === -1) return;

        if (id === activeFileId) saveCurrentEditorContent();
        openTabs.splice(idx, 1);

        if (activeFileId === id) {
            // Prefer the tab to the left, then right, then none
            activeFileId = openTabs[Math.max(0, idx - 1)]?.id
                        || openTabs[0]?.id
                        || null;
        }
        renderTabsBar();
        renderEditorPane();
        renderFileTree();
    }

    function saveCurrentEditorContent() {
        if (!activeFileId) return;
        const node = fs.getNode(activeFileId);
        if (!node) return;

        if (node.isHtmlRoot) {
            const area = editorPaneEl?.querySelector('.editor-body-area');
            if (area) fs.updateContent(activeFileId, area.value);
        } else {
            const area = editorPaneEl?.querySelector('.editor-textarea');
            if (area) fs.updateContent(activeFileId, area.value);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TABS BAR RENDERING
    // ══════════════════════════════════════════════════════════════════════════

    function renderTabsBar() {
        if (!editorTabsBarEl) return;
        editorTabsBarEl.innerHTML = '';

        for (const tab of openTabs) {
            const tabEl = document.createElement('div');
            tabEl.className = 'editor-tab' + (tab.id === activeFileId ? ' active' : '');
            tabEl.dataset.tabId = tab.id;

            const badge = document.createElement('span');
            badge.className = `file-badge tab-badge ${tab.language}`;
            badge.textContent = badgeLabel(tab.language);
            tabEl.appendChild(badge);

            const nameEl = document.createElement('span');
            nameEl.className = 'tab-name';
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
                if (tab.id !== activeFileId) {
                    saveCurrentEditorContent();
                    activeFileId = tab.id;
                    renderTabsBar();
                    renderEditorPane();
                    renderFileTree();
                }
            });

            editorTabsBarEl.appendChild(tabEl);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // EDITOR PANE RENDERING
    // ══════════════════════════════════════════════════════════════════════════

    function renderEditorPane() {
        if (!editorPaneEl) return;
        editorPaneEl.innerHTML = '';

        if (!activeFileId) {
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

        const node = fs.getNode(activeFileId);
        if (!node) return;

        if (node.isHtmlRoot) {
            renderSplitHtmlEditor(node);
        } else {
            renderSingleEditor(node);
        }
    }

    /**
     * Split editor for index.html:
     *   [locked head pre] ← read-only, grayed
     *   [editable body textarea] ← active editing zone
     *   [locked foot pre] ← read-only, grayed
     */
    function renderSplitHtmlEditor(node) {
        // ── Locked head zone ─────────────────────────────────────────────────
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
        editorPaneEl.appendChild(headZone);

        // ── Editable body zone ───────────────────────────────────────────────
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
        bodyZone.appendChild(bodyArea);

        editorPaneEl.appendChild(bodyZone);

        // ── Locked footer zone ───────────────────────────────────────────────
        const footZone = document.createElement('div');
        footZone.className = 'editor-locked-zone';

        const footPre = document.createElement('pre');
        footPre.className = 'editor-pre-locked';
        footPre.textContent = INDEX_LOCKED_FOOT;
        footZone.appendChild(footPre);
        editorPaneEl.appendChild(footZone);
    }

    /** Single full-height textarea for CSS, JS, JSON, and other file types. */
    function renderSingleEditor(node) {
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
        editorPaneEl.appendChild(area);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CONTEXT MENU
    // ══════════════════════════════════════════════════════════════════════════

    function showCtxMenu(x, y, nodeId) {
        ctxTargetId = nodeId;
        const node = nodeId ? fs.getNode(nodeId) : null;

        const ctxOpen      = document.getElementById('ctx-open');
        const ctxRename    = document.getElementById('ctx-rename');
        const ctxDelete    = document.getElementById('ctx-delete');

        if (ctxOpen)   ctxOpen.style.display   = (node && node.type === 'file') ? '' : 'none';
        if (ctxRename) ctxRename.style.display  = node ? '' : 'none';
        if (ctxDelete) {
            ctxDelete.style.display = node ? '' : 'none';
            ctxDelete.disabled      = !!(node && node.isHtmlRoot);
        }

        // Clamp to viewport bounds
        ctxMenu.style.left = `${Math.min(x, window.innerWidth  - 180)}px`;
        ctxMenu.style.top  = `${Math.min(y, window.innerHeight - 170)}px`;
        ctxMenu.classList.add('visible');
    }

    document.addEventListener('click',       () => ctxMenu?.classList.remove('visible'));
    document.addEventListener('contextmenu', e => {
        if (!e.target.closest('#studio-explorer')) ctxMenu?.classList.remove('visible');
    });

    document.getElementById('ctx-open')?.addEventListener('click', () => {
        if (ctxTargetId) openFile(ctxTargetId);
    });

    document.getElementById('ctx-rename')?.addEventListener('click', () => {
        if (!ctxTargetId) return;
        const nameEl = fileTreeEl?.querySelector(`[data-node-id="${ctxTargetId}"] .file-name`);
        if (nameEl) startInlineRename(ctxTargetId, nameEl);
    });

    document.getElementById('ctx-delete')?.addEventListener('click', () => {
        if (ctxTargetId) deleteNode(ctxTargetId);
    });

    document.getElementById('ctx-new-file')?.addEventListener('click', () => {
        promptNewFile(getCtxParentId());
    });

    document.getElementById('ctx-new-folder')?.addEventListener('click', () => {
        promptNewFolder(getCtxParentId());
    });

    function getCtxParentId() {
        if (!ctxTargetId) return null;
        const n = fs.getNode(ctxTargetId);
        return n ? (n.type === 'folder' ? n.id : n.parentId) : null;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // INLINE RENAME
    // ══════════════════════════════════════════════════════════════════════════

    function startInlineRename(id, nameEl) {
        const node = fs.getNode(id);
        if (!node) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'file-rename-input';
        input.value = node.name;

        nameEl.style.display = 'none';
        nameEl.parentElement.insertBefore(input, nameEl.nextSibling);
        input.focus();
        input.select();

        const commit = () => {
            const newName = input.value.trim();
            input.remove();
            nameEl.style.display = '';
            if (!newName || newName === node.name) { renderFileTree(); return; }
            fs.rename(id, newName);
            const tab = openTabs.find(t => t.id === id);
            if (tab) { tab.name = newName; tab.language = fs.getNode(id).language; }
            renderFileTree();
            renderTabsBar();
        };

        input.addEventListener('blur', commit);
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter')  { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { input.remove(); nameEl.style.display = ''; }
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DELETE NODE
    // ══════════════════════════════════════════════════════════════════════════

    function deleteNode(id) {
        const node = fs.getNode(id);
        if (!node) return;
        if (node.isHtmlRoot) { showAlert('index.html cannot be deleted.', 'error'); return; }

        const what = node.type === 'folder'
            ? `folder "${node.name}" and all its contents`
            : `"${node.name}"`;
        if (!confirm(`Delete ${what}? This cannot be undone.`)) return;

        const deletedIds = fs.delete(id);
        openTabs = openTabs.filter(t => !deletedIds.includes(t.id));
        if (deletedIds.includes(activeFileId)) {
            activeFileId = openTabs[0]?.id || null;
        }
        renderFileTree();
        renderTabsBar();
        renderEditorPane();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // NEW FILE / FOLDER (prompt-based for v1)
    // ══════════════════════════════════════════════════════════════════════════

    function promptNewFile(parentId = null) {
        const name = prompt('New file name (e.g. utils.js, data.json):');
        if (!name?.trim()) return;
        const node = fs.createFile(name.trim(), parentId);
        renderFileTree();
        openFile(node.id);
    }

    function promptNewFolder(parentId = null) {
        const name = prompt('New folder name:');
        if (!name?.trim()) return;
        fs.createFolder(name.trim(), parentId);
        renderFileTree();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PERMISSIONS
    // ══════════════════════════════════════════════════════════════════════════

    function getSelectedPermissions() {
        return ['fetch', 'notifications', 'clipboard', 'storage'].filter(p =>
            document.getElementById(`perm-${p}`)?.checked
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // LIVE PREVIEW
    // ══════════════════════════════════════════════════════════════════════════

    function runPreview() {
        if (!previewIframe) return;

        saveCurrentEditorContent();
        const { html, css, js } = fs.getAggregatedSources();

        // Parse .env textarea
        const envObj = {};
        (textareaEnv?.value || '').split('\n').forEach(line => {
            const idx = line.indexOf('=');
            if (idx !== -1) {
                const k = line.substring(0, idx).trim();
                const v = line.substring(idx + 1).trim();
                if (k) envObj[k] = v;
            }
        });

        const activeTheme = previewThemeSel?.value || 'dark';
        updatePreviewBackground(activeTheme);

        const sendData = () => {
            if (!previewIframe.contentWindow) return;
            previewIframe.contentWindow.postMessage({
                type:        'init',
                html,
                css,
                js,
                env:         envObj,
                permissions: getSelectedPermissions(),
                theme:       activeTheme,
                accentColor: resolveAccentColor(),
            }, '*');
        };

        previewIframe.onload = sendData;
        previewIframe.src = 'sandbox.html';
    }

    function updatePreviewBackground(theme) {
        const wrapper = document.querySelector('.preview-frame-wrapper');
        const body    = document.querySelector('.preview-body');
        wrapper?.classList.toggle('theme-light', theme === 'light');
        wrapper?.classList.toggle('theme-dark',  theme !== 'light');
        body?.classList.toggle('theme-light', theme === 'light');
        body?.classList.toggle('theme-dark',  theme !== 'light');
    }

    btnRefresh?.addEventListener('click', runPreview);

    previewThemeSel?.addEventListener('change', e => {
        const theme = e.target.value;
        updatePreviewBackground(theme);
        previewIframe?.contentWindow?.postMessage({ type: 'theme-changed', theme }, '*');
    });

    // Preview resize requests from sandboxed iframe
    window.addEventListener('message', e => {
        const data = e.data;
        if (data?.type === 'resize-widget' && previewIframe?.contentWindow === e.source) {
            const container = previewIframe.parentElement;
            if (container) {
                container.style.width  = `${Math.min(Math.max(data.width,  100), window.innerWidth  - 40)}px`;
                container.style.height = `${Math.min(Math.max(data.height, 100), window.innerHeight - 40)}px`;
            }
        }
    });

    runPreview(); // Initial render on load

    // ══════════════════════════════════════════════════════════════════════════
    // BUILD WIDGET OBJECT
    // ══════════════════════════════════════════════════════════════════════════

    function buildWidgetObject() {
        saveCurrentEditorContent();
        const { html, css, js } = fs.getAggregatedSources();
        const type = selectType?.value || 'app';
        const sized = type === 'app' || type === 'widget';

        return {
            id:          currentEditId || `widget_${Date.now()}`,
            name:        inputName?.value.trim()    || 'Untitled Widget',
            author:      inputAuthor?.value.trim()  || '',
            version:     inputVersion?.value.trim() || '1.0.0',
            description: inputDesc?.value.trim()    || '',
            env:         textareaEnv?.value.trim()  || '',
            type,
            icon:        textareaIcon?.value.trim() || '',
            permissions: getSelectedPermissions(),
            defaultW:    sized ? parseInt(inputDefW?.value) || 400 : null,
            defaultH:    sized ? parseInt(inputDefH?.value) || 300 : null,
            minW:        sized ? parseInt(inputMinW?.value) || 200 : null,
            minH:        sized ? parseInt(inputMinH?.value) || 160 : null,
            maxW:        sized ? parseInt(inputMaxW?.value) || 800 : null,
            maxH:        sized ? parseInt(inputMaxH?.value) || 600 : null,
            // Full file system for new format
            files: fs.toArray(),
            // Legacy fields preserved for widget-runtime.js backward compatibility
            html,
            css,
            js,
            enabled: true,
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SAVE
    // ══════════════════════════════════════════════════════════════════════════

    btnSave?.addEventListener('click', () => {
        if (!inputName?.value.trim()) {
            showAlert('Widget name is required.', 'error');
            inputName?.focus();
            return;
        }

        const newWidget = buildWidgetObject();
        const widgets   = getCustomWidgets();

        if (currentEditId) {
            const idx = widgets.findIndex(w => w.id === currentEditId);
            if (idx !== -1) widgets[idx] = newWidget;
            else widgets.push(newWidget);
        } else {
            widgets.push(newWidget);
            currentEditId = newWidget.id;
        }

        saveCustomWidgets(widgets);
        showAlert(`Widget "${newWidget.name}" saved!`, 'success');
    });

    // ══════════════════════════════════════════════════════════════════════════
    // EXPORT .homewidget
    // ══════════════════════════════════════════════════════════════════════════

    btnExport?.addEventListener('click', async () => {
        if (!inputName?.value.trim()) {
            showAlert('Widget name is required to export.', 'error');
            inputName?.focus();
            return;
        }

        const widget = buildWidgetObject();
        btnExport.textContent = 'Compressing…';
        btnExport.disabled = true;

        try {
            const blob = await compressString(JSON.stringify(widget));
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `${widget.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.homewidget`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
            showAlert('Widget exported!', 'success');
        } catch (err) {
            console.error(err);
            showAlert('Export failed.', 'error');
        } finally {
            btnExport.textContent = 'Export .homewidget';
            btnExport.disabled = false;
        }
    });

    // ══════════════════════════════════════════════════════════════════════════
    // CLOSE
    // ══════════════════════════════════════════════════════════════════════════

    btnClose?.addEventListener('click', () => {
        if (confirm('Close Widget Studio? Unsaved changes will be lost.')) window.close();
    });

    // ══════════════════════════════════════════════════════════════════════════
    // ALERT TOAST
    // ══════════════════════════════════════════════════════════════════════════

    function showAlert(text, type) {
        if (!alertEl) return;
        alertEl.textContent = text;
        alertEl.className = `studio-alert ${type} show`;
        setTimeout(() => alertEl.classList.remove('show'), 3000);
    }
});
