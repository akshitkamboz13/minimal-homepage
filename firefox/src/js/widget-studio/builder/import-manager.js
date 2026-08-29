/**
 * Widget Studio — Folder Import & Entry Point Picker
 */
import { state } from './state.js';
import { showAlert, escapeHTML } from './storage-export.js';
import { renderFileTree } from './file-tree-view.js';
import { openFile, renderTabsBar, saveCurrentEditorContent } from './editor-pane.js';

export function getNodeDepth(node) {
    let depth = 0;
    let curr = node;
    const nodeMap = new Map(state.fs.nodes.map(n => [n.id, n]));
    while (curr && curr.parentId && nodeMap.has(curr.parentId)) {
        curr = nodeMap.get(curr.parentId);
        depth++;
    }
    return depth;
}

export function replaceFilenameInAllFiles(oldRelPath, canonicalName) {
    if (!oldRelPath || !canonicalName) return;

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const oldBaseName = oldRelPath.split('/').pop();

    const searchTerms = new Set([
        oldRelPath,
        `./${oldRelPath}`,
        encodeURIComponent(oldRelPath),
        decodeURIComponent(oldRelPath),
        oldBaseName,
        `./${oldBaseName}`,
        encodeURIComponent(oldBaseName),
        decodeURIComponent(oldBaseName),
    ].filter(Boolean));

    for (const node of state.fs.nodes) {
        if (node.type === 'file' && typeof node.content === 'string') {
            const depth = getNodeDepth(node);
            const prefix = '../'.repeat(depth);
            const replacement = `${prefix}${canonicalName}`;

            let updated = node.content;
            for (const term of searchTerms) {
                if (term === replacement || term === canonicalName) continue;
                const regex = new RegExp(escapeRegex(term), 'gi');
                updated = updated.replace(regex, replacement);
            }
            node.content = updated;
        }
    }
}

export function triggerImportFolder(targetParentId = null) {
    state.importTargetParentId = targetParentId;
    const inputImportFolder = document.getElementById('input-import-folder');
    if (inputImportFolder) {
        inputImportFolder.value = '';
        inputImportFolder.click();
    }
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

export function initImportManager() {
    const btnImportFolder   = document.getElementById('btn-import-folder');
    const inputImportFolder = document.getElementById('input-import-folder');

    btnImportFolder?.addEventListener('click', () => triggerImportFolder(null));

    inputImportFolder?.addEventListener('change', async e => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        saveCurrentEditorContent();
        showAlert('Importing folder...', 'success');

        const folderCache = {};
        const importedFileMap = {};

        for (const file of files) {
            if (file.name.startsWith('.')) continue;

            const pathParts = file.webkitRelativePath.split('/');
            const importParts = pathParts.slice(1);
            if (importParts.length === 0) continue;

            let currentParentId = state.importTargetParentId;
            let accumulatedPath = '';

            for (let i = 0; i < importParts.length - 1; i++) {
                const folderName = importParts[i];
                accumulatedPath = accumulatedPath ? `${accumulatedPath}/${folderName}` : folderName;

                if (!folderCache[accumulatedPath]) {
                    const existingNode = state.fs.nodes.find(
                        n => n.name === folderName && n.type === 'folder' && n.parentId === currentParentId
                    );
                    if (existingNode) {
                        folderCache[accumulatedPath] = existingNode.id;
                    } else {
                        const folderNode = state.fs.createFolder(folderName, currentParentId);
                        folderCache[accumulatedPath] = folderNode.id;
                    }
                }
                currentParentId = folderCache[accumulatedPath];
            }

            const fileName = importParts[importParts.length - 1];
            try {
                const content = await readFileAsText(file);
                const existingFile = state.fs.nodes.find(
                    n => n.name === fileName && n.type === 'file' && n.parentId === currentParentId
                );
                let targetNode;
                if (existingFile) {
                    state.fs.updateContent(existingFile.id, content);
                    targetNode = existingFile;
                } else {
                    targetNode = state.fs.createFile(fileName, currentParentId);
                    state.fs.updateContent(targetNode.id, content);
                }
                const relPath = importParts.join('/');
                importedFileMap[relPath] = targetNode.id;
            } catch (err) {
                console.error('Error reading file:', file.name, err);
            }
        }

        renderFileTree();
        showAlert('Folder imported! Choose entry points…', 'success');

        showImportEntryModal(importedFileMap);
    });
}

export function showImportEntryModal(fileMap) {
    const htmlFiles = Object.entries(fileMap).filter(([p]) => /\.html?$/i.test(p));
    const cssFiles  = Object.entries(fileMap).filter(([p]) => /\.css$/i.test(p));
    const jsFiles   = Object.entries(fileMap).filter(([p]) => /\.(m?js|cjs)$/i.test(p));

    const noneOpt = '<option value="">— none —</option>';

    function buildOptions(list) {
        return noneOpt + list.map(([p]) => `<option value="${escapeHTML(p)}">${escapeHTML(p)}</option>`).join('');
    }

    const overlay = document.createElement('div');
    overlay.className = 'import-modal-overlay';
    overlay.id = 'import-entry-overlay';

    overlay.innerHTML = `
<div class="import-modal" role="dialog" aria-modal="true" aria-label="Choose entry points">
  <div class="import-modal-title">Choose Entry Points</div>
  <div class="import-modal-subtitle">
    Select which imported file should act as each entry point.<br>
    Its content will be placed into the matching default file.
  </div>

  <div class="import-entry-group">
    <label class="import-entry-label" for="entry-html">
      <svg width="14" height="14" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <path fill="#e44d26" d="M5 3l1.87 21.17L16 27l9.12-2.83L27 3z"/>
        <path fill="#f16529" d="M16 25.28V5H5.73l1.6 18.16z"/>
      </svg>
      HTML entry → replaces &lt;body&gt; of index.html
    </label>
    <select id="entry-html" class="import-entry-select">${buildOptions(htmlFiles)}</select>
  </div>

  <div class="import-entry-group">
    <label class="import-entry-label" for="entry-css">
      <svg width="14" height="14" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <path fill="#1572b6" d="M5 3l1.87 21.17L16 27l9.12-2.83L27 3z"/>
        <path fill="#33a9dc" d="M16 25.28V5H5.73l1.6 18.16z"/>
      </svg>
      CSS entry → replaces style.css
    </label>
    <select id="entry-css" class="import-entry-select">${buildOptions(cssFiles)}</select>
  </div>

  <div class="import-entry-group">
    <label class="import-entry-label" for="entry-js">
      <svg width="14" height="14" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <rect width="28" height="28" x="2" y="2" rx="2" fill="#f7df1e"/>
        <path fill="#323330" d="M20.48 22.72c.52.87 1.2 1.51 2.4 1.51 1.01 0 1.65-.5 1.65-1.2 0-.83-.66-1.13-1.77-1.61l-.61-.26c-1.75-.74-2.92-1.68-2.92-3.65 0-1.82 1.38-3.2 3.54-3.2 1.54 0 2.64.53 3.43 1.93l-1.88 1.2c-.41-.74-.86-1.03-1.55-1.03-.7 0-1.15.45-1.15 1.03 0 .72.45 1.01 1.49 1.46l.61.26c2.06.88 3.25 1.79 3.25 3.81 0 2.18-1.72 3.38-4.02 3.38-2.26 0-3.72-1.07-4.43-2.48zm-9.12.22c.38.67.72 1.24 1.55 1.24.79 0 1.29-.31 1.29-1.51v-8.15h2.32v8.18c0 2.49-1.46 3.62-3.6 3.62-1.93 0-3.05-1-3.62-2.2z"/>
      </svg>
      JS entry → replaces script.js
    </label>
    <select id="entry-js" class="import-entry-select">${buildOptions(jsFiles)}</select>
  </div>

  <div class="import-modal-actions">
    <button type="button" id="entry-modal-skip" class="studio-btn">Skip</button>
    <button type="button" id="entry-modal-apply" class="studio-btn primary">Apply</button>
  </div>
</div>`;

    document.body.appendChild(overlay);

    function closeModal() {
        overlay.remove();
    }

    document.getElementById('entry-modal-skip')?.addEventListener('click', closeModal);

    document.getElementById('entry-modal-apply')?.addEventListener('click', () => {
        const htmlPath = document.getElementById('entry-html')?.value;
        const cssPath  = document.getElementById('entry-css')?.value;
        const jsPath   = document.getElementById('entry-js')?.value;

        function renameToCanonical(srcNode, canonicalName) {
            const oldName = srcNode.name;
            if (oldName === canonicalName) return;

            state.fs.rename(srcNode.id, canonicalName);

            const tab = state.openTabs.find(t => t.id === srcNode.id);
            if (tab) {
                tab.name     = canonicalName;
                tab.language = srcNode.language;
            }

            replaceFilenameInAllFiles(oldName, canonicalName);
        }

        const usedNodeIds = new Set();

        // ── HTML entry ───────────────────────────────────────────────────
        if (htmlPath && fileMap[htmlPath]) {
            const srcNode  = state.fs.getNode(fileMap[htmlPath]);
            const htmlRoot = state.fs.nodes.find(n => n.isHtmlRoot);

            if (srcNode && htmlRoot) {
                if (srcNode.id !== htmlRoot.id) {
                    const raw = srcNode.content;
                    const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
                    const bodyContent = bodyMatch ? bodyMatch[1].trim() : raw.trim();
                    state.fs.updateContent(htmlRoot.id, bodyContent);

                    replaceFilenameInAllFiles(srcNode.name, 'index.html');
                    if (htmlPath && htmlPath !== srcNode.name) {
                        replaceFilenameInAllFiles(htmlPath, 'index.html');
                    }

                    usedNodeIds.add(srcNode.id);
                }
            }
        }

        // ── CSS entry ────────────────────────────────────────────────────
        if (cssPath && fileMap[cssPath]) {
            const srcNode = state.fs.getNode(fileMap[cssPath]);
            const cssRoot = state.fs.nodes.find(n => n.language === 'css' && n.name === 'style.css');

            if (srcNode) {
                if (cssRoot && srcNode.id !== cssRoot.id) {
                    state.fs.updateContent(cssRoot.id, srcNode.content);
                    replaceFilenameInAllFiles(srcNode.name, 'style.css');
                    if (cssPath && cssPath !== srcNode.name) {
                        replaceFilenameInAllFiles(cssPath, 'style.css');
                    }
                    usedNodeIds.add(srcNode.id);
                } else if (!cssRoot) {
                    renameToCanonical(srcNode, 'style.css');
                }
            }
        }

        // ── JS entry ─────────────────────────────────────────────────────
        if (jsPath && fileMap[jsPath]) {
            const srcNode = state.fs.getNode(fileMap[jsPath]);
            const jsRoot  = state.fs.nodes.find(n => n.language === 'js' && n.name === 'script.js');

            if (srcNode) {
                if (jsRoot && srcNode.id !== jsRoot.id) {
                    state.fs.updateContent(jsRoot.id, srcNode.content);
                    replaceFilenameInAllFiles(srcNode.name, 'script.js');
                    if (jsPath && jsPath !== srcNode.name) {
                        replaceFilenameInAllFiles(jsPath, 'script.js');
                    }
                    usedNodeIds.add(srcNode.id);
                } else if (!jsRoot) {
                    renameToCanonical(srcNode, 'script.js');
                }
            }
        }

        for (const usedId of usedNodeIds) {
            const deletedIds = state.fs.delete(usedId);
            state.openTabs = state.openTabs.filter(t => !deletedIds.includes(t.id));
            if (deletedIds.includes(state.activeFileId)) {
                state.activeFileId = state.openTabs[0]?.id || null;
            }
        }

        closeModal();
        renderFileTree();
        renderTabsBar();
        state.activeFileId = null;
        const htmlRoot = state.fs.nodes.find(n => n.isHtmlRoot);
        if (htmlRoot) openFile(htmlRoot.id);
        showAlert('Entry points applied!', 'success');
    });

    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal();
    });
}
