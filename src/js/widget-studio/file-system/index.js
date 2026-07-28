/**
 * Widget Studio — Virtual File System Class
 * Manages the file/folder tree for a widget project.
 * Default project: index.html (body-only editable), style.css, script.js, manifest.json
 */
import {
    INDEX_LOCKED_HEAD,
    INDEX_LOCKED_FOOT,
    DEFAULT_HTML_BODY,
    DEFAULT_CSS,
    DEFAULT_JS
} from './defaults.js';

import {
    detectLanguage,
    buildManifestContent
} from './manifest-helper.js';

// Re-export defaults and helpers
export {
    INDEX_LOCKED_HEAD,
    INDEX_LOCKED_FOOT,
    detectLanguage,
    buildManifestContent
};

function genId() {
    return `fs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── FileSystem class ─────────────────────────────────────────────────────────
export class FileSystem {
    constructor() {
        /** @type {Array<FileNode|FolderNode>} */
        this.nodes = [];
    }

    // ── Initialization ────────────────────────────────────────────────────────

    /** Create the default 4-file starting project (index.html, style.css, script.js, manifest.json). */
    createDefaultProject() {
        this.nodes = [
            { id: genId(), name: 'index.html',   type: 'file', language: 'html',
              content: DEFAULT_HTML_BODY,         parentId: null, isHtmlRoot: true,  isManifest: false },
            { id: genId(), name: 'style.css',    type: 'file', language: 'css',
              content: DEFAULT_CSS,               parentId: null, isHtmlRoot: false, isManifest: false },
            { id: genId(), name: 'script.js',    type: 'file', language: 'js',
              content: DEFAULT_JS,                parentId: null, isHtmlRoot: false, isManifest: false },
            { id: genId(), name: 'manifest.json', type: 'file', language: 'json',
              content: buildManifestContent(),    parentId: null, isHtmlRoot: false, isManifest: true },
        ];
        return this;
    }

    /** Convert a legacy {html, css, js} widget into the file-system format. */
    migrateFromLegacy({ html, css, js }, props = {}) {
        this.nodes = [
            { id: genId(), name: 'index.html',   type: 'file', language: 'html',
              content: html || DEFAULT_HTML_BODY, parentId: null, isHtmlRoot: true,  isManifest: false },
            { id: genId(), name: 'style.css',    type: 'file', language: 'css',
              content: css  || DEFAULT_CSS,       parentId: null, isHtmlRoot: false, isManifest: false },
            { id: genId(), name: 'script.js',    type: 'file', language: 'js',
              content: js   || DEFAULT_JS,        parentId: null, isHtmlRoot: false, isManifest: false },
            { id: genId(), name: 'manifest.json', type: 'file', language: 'json',
              content: buildManifestContent(props), parentId: null, isHtmlRoot: false, isManifest: true },
        ];
        return this;
    }

    /** Load nodes from a serialized array (e.g. from localStorage). */
    loadFromArray(nodes, props = {}) {
        this.nodes = nodes.map(n => ({ ...n }));
        // Back-fill manifest.json if it is missing from older saved projects
        if (!this.nodes.find(n => n.isManifest)) {
            this.nodes.push({
                id: genId(), name: 'manifest.json', type: 'file', language: 'json',
                content: buildManifestContent(props), parentId: null,
                isHtmlRoot: false, isManifest: true,
            });
        }
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

    /** Return the manifest.json node, or null if not present. */
    getManifestNode() {
        return this.nodes.find(n => n.isManifest) || null;
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
            files: this.toArray(),
        };
    }
}
