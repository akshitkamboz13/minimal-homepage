/**
 * Widget Studio — Manifest ↔ Sidebar Form Two-Way Binding
 */
import { state } from './state.js';
import { buildManifestContent } from '../file-system/index.js';
import { getSelectedPermissions, ALL_PERMISSIONS } from './storage-export.js';

export function autoDetectPermissionsFromCode() {
    if (!state.fs) return [];
    let aggregatedCode = '';
    try {
        const { html, css, js, files } = state.fs.getAggregatedSources();
        aggregatedCode = (html || '') + ' ' + (css || '') + ' ' + (js || '');
        if (Array.isArray(files)) {
            files.forEach(f => {
                if (f && f.content) aggregatedCode += ' ' + f.content;
            });
        }
    } catch (_) {
        return [];
    }

    const detected = [];
    if (/\b(fetch|XMLHttpRequest|\$\.ajax|axios)\b|https?:\/\//i.test(aggregatedCode)) {
        detected.push('fetch');
    }
    if (/\b(Notification|showNotification)\b/i.test(aggregatedCode)) {
        detected.push('notifications');
    }
    if (/\b(navigator\.clipboard|execCommand)\b/i.test(aggregatedCode)) {
        detected.push('clipboard');
    }
    if (/\b(localStorage|sessionStorage|indexedDB|chrome\.storage|widget\.storage)\b/i.test(aggregatedCode)) {
        detected.push('storage');
    }
    if (/(<a\s|href=|window\.open|target=["']_blank["']|window\.location|open-external-url)/i.test(aggregatedCode)) {
        detected.push('popups');
    }

    let changed = false;
    detected.forEach(p => {
        const el = document.getElementById(`perm-${p}`);
        if (el && !el.checked) {
            el.checked = true;
            changed = true;
        }
    });

    if (changed && !state.suppressManifestSync) {
        syncManifestFromForm();
    }

    return detected;
}

export function syncManifestFromForm() {
    const manifestNode = state.fs.getManifestNode();
    if (!manifestNode) return;

    const inputName     = document.getElementById('widget-name');
    const inputAuthor   = document.getElementById('widget-author');
    const inputVersion  = document.getElementById('widget-version');
    const inputDesc     = document.getElementById('widget-desc');
    const textareaEnv   = document.getElementById('widget-env');
    const selectType    = document.getElementById('widget-type');
    const textareaIcon  = document.getElementById('widget-icon-svg');
    const inputDefW     = document.getElementById('widget-def-w');
    const inputDefH     = document.getElementById('widget-def-h');
    const inputMinW     = document.getElementById('widget-min-w');
    const inputMinH     = document.getElementById('widget-min-h');
    const inputMaxW     = document.getElementById('widget-max-w');
    const inputMaxH     = document.getElementById('widget-max-h');

    const type  = selectType?.value || 'app';
    const sized = type === 'app' || type === 'widget' || type === 'hybrid';

    const props = {
        name:        inputName?.value.trim()    || 'Untitled Widget',
        author:      inputAuthor?.value.trim()  || '',
        version:     inputVersion?.value.trim() || '1.0.0',
        description: inputDesc?.value.trim()    || '',
        type,
        permissions: getSelectedPermissions(),
        env:         textareaEnv?.value.trim()  || '',
        icon:        textareaIcon?.value.trim() || '',
        defaultW:    sized ? parseInt(inputDefW?.value) || 400 : null,
        defaultH:    sized ? parseInt(inputDefH?.value) || 300 : null,
        minW:        sized ? parseInt(inputMinW?.value) || 200 : null,
        minH:        sized ? parseInt(inputMinH?.value) || 160 : null,
        maxW:        sized ? parseInt(inputMaxW?.value) || 800 : null,
        maxH:        sized ? parseInt(inputMaxH?.value) || 600 : null,
    };

    const newContent = buildManifestContent(props);
    state.fs.updateContent(manifestNode.id, newContent);

    if (state.activeFileId === manifestNode.id) {
        const editorPaneEl = document.getElementById('editor-pane');
        const area = editorPaneEl?.querySelector('.editor-textarea');
        if (area) area.value = newContent;
    }
}

export function syncFormFromManifest() {
    const manifestNode = state.fs.getManifestNode();
    if (!manifestNode) return;

    let manifest;
    try {
        manifest = JSON.parse(manifestNode.content);
    } catch (_) {
        return;
    }

    state.suppressManifestSync = true;

    const inputName     = document.getElementById('widget-name');
    const inputAuthor   = document.getElementById('widget-author');
    const inputVersion  = document.getElementById('widget-version');
    const inputDesc     = document.getElementById('widget-desc');
    const textareaEnv   = document.getElementById('widget-env');
    const selectType    = document.getElementById('widget-type');
    const textareaIcon  = document.getElementById('widget-icon-svg');
    const inputDefW     = document.getElementById('widget-def-w');
    const inputDefH     = document.getElementById('widget-def-h');
    const inputMinW     = document.getElementById('widget-min-w');
    const inputMinH     = document.getElementById('widget-min-h');
    const inputMaxW     = document.getElementById('widget-max-w');
    const inputMaxH     = document.getElementById('widget-max-h');
    const projectNameEl = document.getElementById('project-name-display');

    if (inputName    && manifest.name        != null) inputName.value    = manifest.name;
    if (inputAuthor  && manifest.author       != null) inputAuthor.value  = manifest.author;
    if (inputVersion && manifest.version      != null) inputVersion.value = manifest.version;
    if (inputDesc    && manifest.description  != null) inputDesc.value    = manifest.description;
    if (textareaEnv  && manifest.env          != null) textareaEnv.value  = manifest.env;
    if (textareaIcon && manifest.icon         != null) textareaIcon.value = manifest.icon;

    if (selectType && manifest.type) {
        selectType.value = manifest.type;
        const dimensionsGrp = document.getElementById('dimensions-group');
        dimensionsGrp?.classList.toggle('active', manifest.type === 'app' || manifest.type === 'widget' || manifest.type === 'hybrid');
    }

    const d = manifest.dimensions || {};
    if (inputDefW && d.defaultW != null) inputDefW.value = d.defaultW;
    if (inputDefH && d.defaultH != null) inputDefH.value = d.defaultH;
    if (inputMinW && d.minW     != null) inputMinW.value = d.minW;
    if (inputMinH && d.minH     != null) inputMinH.value = d.minH;
    if (inputMaxW && d.maxW     != null) inputMaxW.value = d.maxW;
    if (inputMaxH && d.maxH     != null) inputMaxH.value = d.maxH;

    const perms = Array.isArray(manifest.permissions) ? manifest.permissions : [];
    ALL_PERMISSIONS.forEach(p => {
        const el = document.getElementById(`perm-${p}`);
        if (el) el.checked = perms.includes(p);
    });

    if (projectNameEl) projectNameEl.textContent = (manifest.name || '').trim() || 'widget';

    state.suppressManifestSync = false;
    autoDetectPermissionsFromCode();
}

export function initManifestSync() {
    function onFormChange() {
        if (state.suppressManifestSync) return;
        syncManifestFromForm();
    }

    const elements = [
        'widget-name', 'widget-author', 'widget-version', 'widget-desc',
        'widget-env', 'widget-icon-svg', 'widget-def-w', 'widget-def-h',
        'widget-min-w', 'widget-min-h', 'widget-max-w', 'widget-max-h'
    ].map(id => document.getElementById(id));

    elements.forEach(el => {
        el?.addEventListener('input',  onFormChange);
        el?.addEventListener('change', onFormChange);
    });

    document.getElementById('widget-type')?.addEventListener('change', onFormChange);

    ALL_PERMISSIONS.forEach(p => {
        document.getElementById(`perm-${p}`)?.addEventListener('change', onFormChange);
    });

    syncManifestFromForm();
}
