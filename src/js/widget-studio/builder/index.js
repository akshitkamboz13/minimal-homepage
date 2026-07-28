/**
 * Widget Studio — Main App Orchestrator & Controller Entry Point
 * Integrates modular components: file tree, editor tabs, preview runner,
 * manifest sync, folder import manager, and widget package saver/exporter.
 */
import { state } from './state.js';
import { getCustomWidgets, saveCustomWidgets, showAlert, compressString, getSelectedPermissions } from './storage-export.js';
import { renderFileTree, promptNewFile, promptNewFolder, showCtxMenu, startInlineRename, deleteNode, getCtxParentId, initExplorerResize } from './file-tree-view.js';
import { openFile, saveCurrentEditorContent } from './editor-pane.js';
import { initManifestSync } from './manifest-sync.js';
import { initImportManager, triggerImportFolder } from './import-manager.js';
import { initPreviewRunner, resolveAccentColor } from './preview-runner.js';

document.addEventListener('DOMContentLoaded', () => {
    // ── 1. DOM Elements ───────────────────────────────────────────────────────
    const inputName        = document.getElementById('widget-name');
    const inputAuthor      = document.getElementById('widget-author');
    const inputVersion     = document.getElementById('widget-version');
    const inputDesc        = document.getElementById('widget-desc');
    const textareaEnv      = document.getElementById('widget-env');
    const selectType       = document.getElementById('widget-type');
    const textareaIcon     = document.getElementById('widget-icon-svg');
    const dimensionsGrp    = document.getElementById('dimensions-group');
    const inputDefW        = document.getElementById('widget-def-w');
    const inputDefH        = document.getElementById('widget-def-h');
    const inputMinW        = document.getElementById('widget-min-w');
    const inputMinH        = document.getElementById('widget-min-h');
    const inputMaxW        = document.getElementById('widget-max-w');
    const inputMaxH        = document.getElementById('widget-max-h');
    const fileTreeEl       = document.getElementById('file-tree');
    const projectToggleEl  = document.getElementById('file-tree-project-toggle');
    const btnNewFile       = document.getElementById('btn-new-file');
    const btnNewFolder     = document.getElementById('btn-new-folder');
    const btnSave          = document.getElementById('btn-save-widget');
    const btnExport        = document.getElementById('btn-export-pkg');
    const btnClose         = document.getElementById('btn-close-studio');
    const ctxMenu          = document.getElementById('file-ctx-menu');

    // ── 2. Theme & Accent Sync ────────────────────────────────────────────────
    window.addEventListener('storage', e => {
        const previewIframe   = document.getElementById('preview-iframe');
        const previewThemeSel = document.getElementById('preview-theme-select');
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

    // ── 3. File System Initialization ─────────────────────────────────────────
    const urlParams = new URLSearchParams(window.location.search);
    const editId    = urlParams.get('edit');

    if (editId) {
        const widget = getCustomWidgets().find(w => w.id === editId);
        if (widget) {
            state.currentEditId = editId;
            document.title = `Edit Widget — ${widget.name}`;
            loadWidgetIntoForm(widget);
            if (widget.files && widget.files.length > 0) {
                state.fs.loadFromArray(widget.files, widget);
            } else {
                state.fs.migrateFromLegacy({ html: widget.html, css: widget.css, js: widget.js }, widget);
            }
        } else {
            state.fs.createDefaultProject();
        }
    } else {
        state.fs.createDefaultProject();
    }

    function loadWidgetIntoForm(widget) {
        if (inputName)    inputName.value    = widget.name        || '';
        if (inputAuthor)  inputAuthor.value  = widget.author      || '';
        if (inputVersion) inputVersion.value = widget.version     || '1.0.0';
        if (inputDesc)    inputDesc.value    = widget.description || '';
        if (textareaEnv)  textareaEnv.value  = widget.env         || '';
        if (textareaIcon) textareaIcon.value = widget.icon        || '';
        if (selectType) {
            selectType.value = widget.type || 'app';
            dimensionsGrp?.classList.toggle('active', widget.type === 'app' || widget.type === 'widget');
        }
        if (inputDefW) inputDefW.value = widget.defaultW || 400;
        if (inputDefH) inputDefH.value = widget.defaultH || 300;
        if (inputMinW) inputMinW.value = widget.minW     || 200;
        if (inputMinH) inputMinH.value = widget.minH     || 160;
        if (inputMaxW) inputMaxW.value = widget.maxW     || 800;
        if (inputMaxH) inputMaxH.value = widget.maxH     || 600;

        (widget.permissions || []).forEach(p => {
            const el = document.getElementById(`perm-${p}`);
            if (el) el.checked = true;
        });
    }

    selectType?.addEventListener('change', e => {
        dimensionsGrp?.classList.toggle('active', e.target.value === 'app' || e.target.value === 'widget');
    });

    // ── 4. Initialise Sub-Modules ─────────────────────────────────────────────
    initManifestSync();
    initImportManager();
    initExplorerResize();

    renderFileTree();

    const indexNode = state.fs.nodes.find(n => n.name === 'index.html' && n.type === 'file');
    if (indexNode) openFile(indexNode.id);
    else {
        const firstFile = state.fs.nodes.find(n => n.type === 'file');
        if (firstFile) openFile(firstFile.id);
    }

    initPreviewRunner();

    // ── 5. Explorer Toolbar & Context Menu Listeners ──────────────────────────
    projectToggleEl?.addEventListener('click', () => {
        state.projectTreeOpen = !state.projectTreeOpen;
        projectToggleEl.classList.toggle('collapsed', !state.projectTreeOpen);
        renderFileTree();
    });

    btnNewFile?.addEventListener('click',   () => promptNewFile(null));
    btnNewFolder?.addEventListener('click', () => promptNewFolder(null));

    fileTreeEl?.addEventListener('contextmenu', e => {
        if (!e.target.closest('.file-tree-item')) {
            e.preventDefault();
            showCtxMenu(e.clientX, e.clientY, null);
        }
    });

    document.addEventListener('click',       () => ctxMenu?.classList.remove('visible'));
    document.addEventListener('contextmenu', e => {
        if (!e.target.closest('#studio-explorer')) ctxMenu?.classList.remove('visible');
    });

    document.getElementById('ctx-open')?.addEventListener('click', () => {
        if (state.ctxTargetId) openFile(state.ctxTargetId);
    });

    document.getElementById('ctx-rename')?.addEventListener('click', () => {
        if (!state.ctxTargetId) return;
        const nameEl = fileTreeEl?.querySelector(`[data-node-id="${state.ctxTargetId}"] .file-name`);
        if (nameEl) startInlineRename(state.ctxTargetId, nameEl);
    });

    document.getElementById('ctx-delete')?.addEventListener('click', () => {
        if (state.ctxTargetId) deleteNode(state.ctxTargetId);
    });

    document.getElementById('ctx-new-file')?.addEventListener('click', () => {
        promptNewFile(getCtxParentId());
    });

    document.getElementById('ctx-new-folder')?.addEventListener('click', () => {
        promptNewFolder(getCtxParentId());
    });

    document.getElementById('ctx-import-folder')?.addEventListener('click', () => {
        triggerImportFolder(getCtxParentId());
    });

    // ── 6. Build, Save & Export Handlers ──────────────────────────────────────
    function buildWidgetObject() {
        saveCurrentEditorContent();
        const { html, css, js } = state.fs.getAggregatedSources();
        const type = selectType?.value || 'app';
        const sized = type === 'app' || type === 'widget';

        return {
            id:          state.currentEditId || `widget_${Date.now()}`,
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
            files: state.fs.toArray(),
            html,
            css,
            js,
            enabled: true,
        };
    }

    btnSave?.addEventListener('click', () => {
        if (!inputName?.value.trim()) {
            showAlert('Widget name is required.', 'error');
            inputName?.focus();
            return;
        }

        const newWidget = buildWidgetObject();
        const widgets   = getCustomWidgets();

        if (state.currentEditId) {
            const idx = widgets.findIndex(w => w.id === state.currentEditId);
            if (idx !== -1) widgets[idx] = newWidget;
            else widgets.push(newWidget);
        } else {
            widgets.push(newWidget);
            state.currentEditId = newWidget.id;
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('edit', newWidget.id);
            window.history.replaceState({}, '', newUrl);
        }

        saveCustomWidgets(widgets);
        showAlert('Widget saved successfully!', 'success');
    });

    btnExport?.addEventListener('click', async () => {
        if (!inputName?.value.trim()) {
            showAlert('Widget name is required before exporting.', 'error');
            inputName?.focus();
            return;
        }

        const widgetObj = buildWidgetObject();
        const jsonString = JSON.stringify(widgetObj, null, 2);

        try {
            const gzippedBlob = await compressString(jsonString);
            const slug = widgetObj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'widget';
            const filename = `${slug}.homewidget`;

            const url = URL.createObjectURL(gzippedBlob);
            const a   = document.createElement('a');
            a.href     = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showAlert(`Exported ${filename}`, 'success');
        } catch (err) {
            console.error('Export failed:', err);
            showAlert('Failed to export widget package.', 'error');
        }
    });

    btnClose?.addEventListener('click', () => {
        window.close();
        setTimeout(() => { window.location.href = 'index.html'; }, 100);
    });
});
