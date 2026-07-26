/**
 * Widget Studio — Virtual File System
 * Manages the file/folder tree for a widget project.
 * Default project: index.html (body-only editable), style.css, script.js
 */

// ─── Locked HTML shell shown in the read-only head/foot zones of index.html ──
export const INDEX_LOCKED_HEAD =
`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="style.css">
    <!-- Widget sandbox runtime injected by Widget Studio -->
</head>
<body class="widget">`;

export const INDEX_LOCKED_FOOT = `\n</body>\n</html>`;

// ─── Default starter content ──────────────────────────────────────────────────
const DEFAULT_HTML_BODY =
`<div class="widget-container">
    <div class="widget-header">
        <h2>My Widget</h2>
    </div>
    <div class="widget-body">
        <p id="widget-text">Hello, World!</p>
        <button type="button" id="btn-click">Click Me</button>
    </div>
</div>`;

const DEFAULT_CSS =
`/* Widget Styles */
.widget-container {
    width: 100%;
    height: 100%;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.widget-header h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
}

.widget-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

#btn-click {
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    background: #3b82f6;
    color: white;
    font-weight: 500;
    transition: opacity 0.2s;
}

#btn-click:hover {
    opacity: 0.85;
}`;

const DEFAULT_JS =
`// Widget Script — runs in a sandboxed iframe
const btn  = document.getElementById('btn-click');
const text = document.getElementById('widget-text');
let count = 0;

if (btn && text) {
    btn.addEventListener('click', () => {
        count++;
        text.textContent = \`Clicked \${count} time\${count !== 1 ? 's' : ''}!\`;
    });
}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genId() {
    return `fs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function detectLanguage(name) {
    const ext = name.split('.').pop().toLowerCase();
    return (
        { html: 'html', htm: 'html', css: 'css', js: 'js', mjs: 'js',
          cjs: 'js', json: 'json', md: 'markdown', txt: 'text' }[ext] || 'text'
    );
}

// ─── FileSystem class ─────────────────────────────────────────────────────────
export class FileSystem {
    constructor() {
        /** @type {Array<FileNode|FolderNode>} */
        this.nodes = [];
    }

    // ── Initialization ────────────────────────────────────────────────────────

    /** Create the default 3-file starting project. */
    createDefaultProject() {
        this.nodes = [
            { id: genId(), name: 'index.html', type: 'file', language: 'html',
              content: DEFAULT_HTML_BODY, parentId: null, isHtmlRoot: true },
            { id: genId(), name: 'style.css',  type: 'file', language: 'css',
              content: DEFAULT_CSS,       parentId: null, isHtmlRoot: false },
            { id: genId(), name: 'script.js',  type: 'file', language: 'js',
              content: DEFAULT_JS,        parentId: null, isHtmlRoot: false },
        ];
        return this;
    }

    /** Convert a legacy {html, css, js} widget into the file-system format. */
    migrateFromLegacy({ html, css, js }) {
        this.nodes = [
            { id: genId(), name: 'index.html', type: 'file', language: 'html',
              content: html || DEFAULT_HTML_BODY, parentId: null, isHtmlRoot: true },
            { id: genId(), name: 'style.css',  type: 'file', language: 'css',
              content: css  || DEFAULT_CSS,       parentId: null, isHtmlRoot: false },
            { id: genId(), name: 'script.js',  type: 'file', language: 'js',
              content: js   || DEFAULT_JS,        parentId: null, isHtmlRoot: false },
        ];
        return this;
    }

    /** Load nodes from a serialized array (e.g. from localStorage). */
    loadFromArray(nodes) {
        this.nodes = nodes.map(n => ({ ...n }));
        return this;
    }

    /** Serialize all nodes to a plain-object array for storage. */
    toArray() {
        return this.nodes.map(n => ({ ...n }));
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    getNode(id) {
        return this.nodes.find(n => n.id === id) || null;
    }

    getChildren(parentId) {
        return this.nodes.filter(n => n.parentId === parentId);
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    updateContent(id, content) {
        const node = this.getNode(id);
        if (node) node.content = content;
    }

    createFile(name, parentId = null) {
        const node = {
            id: genId(), name, type: 'file',
            language: detectLanguage(name), content: '',
            parentId, isHtmlRoot: false,
        };
        this.nodes.push(node);
        return node;
    }

    createFolder(name, parentId = null) {
        const node = { id: genId(), name, type: 'folder', parentId, isOpen: true };
        this.nodes.push(node);
        return node;
    }

    rename(id, newName) {
        const node = this.getNode(id);
        if (!node) return;
        node.name = newName;
        if (node.type === 'file') node.language = detectLanguage(newName);
    }

    /**
     * Delete a node and all its descendants.
     * @returns {string[]} Array of deleted IDs.
     */
    delete(id) {
        const toDelete = new Set([id]);
        let changed = true;
        while (changed) {
            changed = false;
            for (const n of this.nodes) {
                if (n.parentId && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
                    toDelete.add(n.id);
                    changed = true;
                }
            }
        }
        this.nodes = this.nodes.filter(n => !toDelete.has(n.id));
        return [...toDelete];
    }

    toggleFolder(id) {
        const node = this.getNode(id);
        if (node && node.type === 'folder') node.isOpen = !node.isOpen;
    }

    // ── Preview aggregation ───────────────────────────────────────────────────

    /**
     * Aggregate all CSS and JS files for sending to sandbox.
     * HTML is body content of the isHtmlRoot file.
     */
    getAggregatedSources() {
        const htmlRoot = this.nodes.find(n => n.type === 'file' && n.isHtmlRoot);
        const cssNodes = this.nodes.filter(n => n.type === 'file' && n.language === 'css');
        const jsNodes  = this.nodes.filter(n => n.type === 'file' && n.language === 'js');
        return {
            html: htmlRoot ? htmlRoot.content : '',
            css:  cssNodes.map(n => `/* === ${n.name} === */\n${n.content}`).join('\n\n'),
            js:   jsNodes.map(n => `/* === ${n.name} === */\n${n.content}`).join('\n\n'),
        };
    }
}
