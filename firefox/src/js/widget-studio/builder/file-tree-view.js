/**
 * Widget Studio — Explorer File Tree View & Context Menu
 */
import { state } from './state.js';
import { fileIconSVG, SVG_NEW_FILE, SVG_RENAME, SVG_TRASH } from './icons.js';
import { openFile, closeTab, renderTabsBar, renderEditorPane } from './editor-pane.js';
import { showAlert } from './storage-export.js';

export function renderFileTree() {
    const fileTreeEl = document.getElementById('file-tree');
    if (!fileTreeEl) return;
    fileTreeEl.innerHTML = '';
    if (state.projectTreeOpen) renderTreeLevel(null, fileTreeEl, 0);
}

function renderTreeLevel(parentId, container, depth) {
    const children = state.fs.getChildren(parentId);
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
        + (node.id === state.activeFileId ? ' active' : '');
    item.dataset.nodeId = node.id;
    item.style.paddingLeft = '6px';

    for (let i = 0; i < depth; i++) {
        const guide = document.createElement('span');
        guide.className = 'tree-indent-guide';
        item.appendChild(guide);
    }

    if (node.type === 'folder') {
        const arrow = document.createElement('span');
        arrow.className = 'tree-arrow' + (node.isOpen ? ' open' : '');
        arrow.textContent = '▸';
        item.appendChild(arrow);

        item.insertAdjacentHTML('beforeend',
            `<svg class="folder-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
             </svg>`);
    } else {
        const spacer = document.createElement('span');
        spacer.className = 'tree-file-spacer';
        item.appendChild(spacer);

        const iconWrap = document.createElement('span');
        iconWrap.className = 'file-icon';
        iconWrap.innerHTML = fileIconSVG(node.language, 16);
        item.appendChild(iconWrap);
    }

    const nameEl = document.createElement('span');
    nameEl.className = 'file-name' + (node.language ? ` lang-${node.language}` : '');
    nameEl.textContent = node.name;
    item.appendChild(nameEl);

    const actions = document.createElement('div');
    actions.className = 'file-item-actions';

    if (node.type === 'folder') {
        actions.appendChild(makeIconBtn('New File in Folder', SVG_NEW_FILE, e => {
            e.stopPropagation();
            promptNewFile(node.id);
        }));
    }

    const isProtected = node.isHtmlRoot || node.isManifest;
    if (!isProtected) {
        actions.appendChild(makeIconBtn('Rename', SVG_RENAME, e => {
            e.stopPropagation();
            startInlineRename(node.id, nameEl);
        }));
        const delBtn = makeIconBtn('Delete', SVG_TRASH, e => {
            e.stopPropagation();
            deleteNode(node.id);
        });
        delBtn.classList.add('danger');
        actions.appendChild(delBtn);
    }
    item.appendChild(actions);

    item.addEventListener('click', e => {
        if (e.target.closest('.file-item-actions')) return;
        if (node.type === 'folder') {
            state.fs.toggleFolder(node.id);
            renderFileTree();
        } else {
            openFile(node.id);
        }
    });

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

export function promptNewFile(parentId = null) {
    const name = prompt('New file name (e.g. utils.js, data.json):');
    if (!name?.trim()) return;
    const node = state.fs.createFile(name.trim(), parentId);
    renderFileTree();
    openFile(node.id);
}

export function promptNewFolder(parentId = null) {
    const name = prompt('New folder name:');
    if (!name?.trim()) return;
    state.fs.createFolder(name.trim(), parentId);
    renderFileTree();
}

export function startInlineRename(id, nameEl) {
    const node = state.fs.getNode(id);
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
        state.fs.rename(id, newName);
        const tab = state.openTabs.find(t => t.id === id);
        if (tab) { tab.name = newName; tab.language = state.fs.getNode(id).language; }
        renderFileTree();
        renderTabsBar();
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter')  { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { input.remove(); nameEl.style.display = ''; }
    });
}

export function deleteNode(id) {
    const node = state.fs.getNode(id);
    if (!node) return;
    if (node.isHtmlRoot) { showAlert('index.html cannot be deleted.', 'error'); return; }
    if (node.isManifest) { showAlert('manifest.json cannot be deleted.', 'error'); return; }

    const what = node.type === 'folder'
        ? `folder "${node.name}" and all its contents`
        : `"${node.name}"`;
    if (!confirm(`Delete ${what}? This cannot be undone.`)) return;

    const deletedIds = state.fs.delete(id);
    state.openTabs = state.openTabs.filter(t => !deletedIds.includes(t.id));
    if (deletedIds.includes(state.activeFileId)) {
        state.activeFileId = state.openTabs[0]?.id || null;
    }
    renderFileTree();
    renderTabsBar();
    renderEditorPane();
}

export function showCtxMenu(x, y, nodeId) {
    state.ctxTargetId = nodeId;
    const ctxMenu = document.getElementById('file-ctx-menu');
    if (!ctxMenu) return;
    const node = nodeId ? state.fs.getNode(nodeId) : null;

    const ctxOpen   = document.getElementById('ctx-open');
    const ctxRename = document.getElementById('ctx-rename');
    const ctxDelete = document.getElementById('ctx-delete');

    if (ctxOpen) ctxOpen.style.display = (node && node.type === 'file') ? '' : 'none';
    if (ctxRename) {
        ctxRename.style.display = node ? '' : 'none';
        ctxRename.disabled      = !!(node && (node.isHtmlRoot || node.isManifest));
    }
    if (ctxDelete) {
        ctxDelete.style.display = node ? '' : 'none';
        ctxDelete.disabled      = !!(node && (node.isHtmlRoot || node.isManifest));
    }

    ctxMenu.style.left = `${Math.min(x, window.innerWidth  - 180)}px`;
    ctxMenu.style.top  = `${Math.min(y, window.innerHeight - 170)}px`;
    ctxMenu.classList.add('visible');
}

export function getCtxParentId() {
    if (!state.ctxTargetId) return null;
    const n = state.fs.getNode(state.ctxTargetId);
    return n ? (n.type === 'folder' ? n.id : n.parentId) : null;
}

export function initExplorerResize() {
    const explorerEl = document.getElementById('studio-explorer');
    if (!explorerEl) return;

    const handle = document.createElement('div');
    handle.className = 'explorer-resize-handle';
    handle.id = 'explorer-resize-handle';
    explorerEl.appendChild(handle);

    const savedWidth = parseInt(localStorage.getItem('studio_explorer_width'), 10);
    if (savedWidth && savedWidth >= 140 && savedWidth <= 480) {
        explorerEl.style.width = `${savedWidth}px`;
    }

    let startX = 0;
    let startW = 0;

    function onMouseMove(e) {
        const newW = Math.min(Math.max(startW + (e.clientX - startX), 140), 480);
        explorerEl.style.width = `${newW}px`;
    }

    function onMouseUp() {
        handle.classList.remove('dragging');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        const finalW = parseInt(explorerEl.style.width, 10);
        if (finalW) localStorage.setItem('studio_explorer_width', String(finalW));
    }

    handle.addEventListener('mousedown', e => {
        e.preventDefault();
        startX = e.clientX;
        startW = explorerEl.offsetWidth;
        handle.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}
