import { saveSettings } from '../settings-state.js';

// Native Gzip Compression
async function compressString(str) {
    const blob = new Blob([str], { type: 'application/json' });
    const compressionStream = new CompressionStream('gzip');
    const compressedStream = blob.stream().pipeThrough(compressionStream);
    const response = new Response(compressedStream);
    return await response.blob();
}

// Native Gzip Decompression (with fallback for plain JSON .homewidget files)
async function decompressBlob(blob) {
    try {
        const decompressionStream = new DecompressionStream('gzip');
        const decompressedStream = blob.stream().pipeThrough(decompressionStream);
        const response = new Response(decompressedStream);
        return await response.text();
    } catch (e) {
        return await blob.text();
    }
}

function getWidgetIconMarkup(icon, name, size = 22) {
    if (icon && icon.trim().startsWith('<')) {
        return icon;
    } else if (icon && icon.trim()) {
        return `<img src="${icon.trim()}" alt="${name}" style="width: ${size}px; height: ${size}px; object-fit: contain; border-radius: 4px;" onerror="this.onerror=null; this.parentNode.innerHTML='<span style=\\'font-size: ${size - 2}px; line-height: 1;\\'>${icon.trim().substring(0,2)}</span>';" />`;
    } else {
        return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
    }
}

// Get custom widgets from localStorage
export function getCustomWidgets() {
    try {
        return JSON.parse(localStorage.getItem('startpage_custom_widgets')) || [];
    } catch (e) {
        return [];
    }
}

// Save custom widgets to localStorage
export function saveCustomWidgets(widgets) {
    localStorage.setItem('startpage_custom_widgets', JSON.stringify(widgets));
    // Dispatch event to reload runtime widgets immediately
    window.dispatchEvent(new CustomEvent('widgets-reloaded'));
}

export const GITHUB_WIDGETSTORE_RAW_BASE = 'https://raw.githubusercontent.com/akshitkamboz13/minimal-homepage/main/widgetstore/widgets';
export const GITHUB_WIDGETSTORE_CATALOG_URL = 'https://raw.githubusercontent.com/akshitkamboz13/minimal-homepage/main/widgetstore/widgets.json';
export const GITHUB_WIDGETSTORE_REPO_URL = 'https://github.com/akshitkamboz13/minimal-homepage/tree/main/widgetstore';

const FALLBACK_STORE_WIDGETS = [
    {
        id: 'github-profile',
        name: 'GitHub Profile Viewer',
        version: '1.0.0',
        author: 'si4k',
        category: 'Developer',
        description: 'Live profile stats, bio, followers, repositories, and direct links.',
        icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
        downloadUrl: `${GITHUB_WIDGETSTORE_RAW_BASE}/github-profile.homewidget`,
        jsonUrl: `${GITHUB_WIDGETSTORE_RAW_BASE}/github-profile.json`
    },
    {
        id: 'open-weather',
        name: 'Live Weather (Open-Meteo)',
        version: '1.0.0',
        author: 'si4k',
        category: 'Weather',
        description: 'Free open-API weather forecast powered by Open-Meteo. No API keys required.',
        icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
        downloadUrl: `${GITHUB_WIDGETSTORE_RAW_BASE}/open-weather.homewidget`,
        jsonUrl: `${GITHUB_WIDGETSTORE_RAW_BASE}/open-weather.json`
    },
    {
        id: 'pomodoro-timer',
        name: 'Pomodoro Focus Timer',
        version: '1.0.0',
        author: 'si4k',
        category: 'Productivity',
        description: 'Tactile Pomodoro focus timer with Focus, Short Break, and Long Break presets.',
        icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        downloadUrl: `${GITHUB_WIDGETSTORE_RAW_BASE}/pomodoro-timer.homewidget`,
        jsonUrl: `${GITHUB_WIDGETSTORE_RAW_BASE}/pomodoro-timer.json`
    }
];

// Install widget from URL or shorthand identifier
export async function installWidgetFromUrl(rawTarget, statusElement = null, successCallback = null) {
    let url = (rawTarget || '').trim();
    if (!url) {
        showStatus(statusElement, 'Error: Please enter a widget URL or ID.', 'error');
        return { success: false, error: 'Empty URL' };
    }

    // 1. Handle homewidget:install?url=... URI or deep links
    if (url.startsWith('homewidget:')) {
        try {
            const queryIdx = url.indexOf('?');
            if (queryIdx !== -1) {
                const searchParams = new URLSearchParams(url.substring(queryIdx));
                const paramUrl = searchParams.get('url');
                if (paramUrl) {
                    url = paramUrl;
                }
            } else {
                url = url.replace(/^homewidget:(install\?)?/, '');
            }
        } catch (e) {
            url = url.replace(/^homewidget:(install\?)?(url=)?/, '');
        }
    }

    // 2. Handle shorthand IDs (e.g. "github-profile", "open-weather", "weather")
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        let cleanId = url.replace(/\.homewidget$/, '').replace(/\.json$/, '').trim();
        // Helpful aliases
        if (cleanId === 'weather') cleanId = 'open-weather';
        if (cleanId === 'github' || cleanId === 'gh') cleanId = 'github-profile';
        if (cleanId === 'pomodoro') cleanId = 'pomodoro-timer';
        url = `${GITHUB_WIDGETSTORE_RAW_BASE}/${cleanId}.homewidget`;
    }

    showStatus(statusElement, `Fetching widget package from ${url}...`, 'info');

    try {
        let response = await fetch(url);
        // Fallback to uncompressed .json if .homewidget fails or returns 404
        if (!response.ok && url.endsWith('.homewidget')) {
            const fallbackJsonUrl = url.replace(/\.homewidget$/, '.json');
            try {
                const fallbackRes = await fetch(fallbackJsonUrl);
                if (fallbackRes.ok) {
                    response = fallbackRes;
                }
            } catch (err) {}
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        showStatus(statusElement, 'Decompressing and validating package...', 'info');

        const decompressedText = await decompressBlob(blob);
        const widget = JSON.parse(decompressedText);

        if (!widget.id || !widget.name || !widget.type || (widget.html === undefined && (!Array.isArray(widget.files) || widget.files.length === 0))) {
            showStatus(statusElement, 'Error: Invalid widget package metadata format.', 'error');
            return { success: false, error: 'Invalid format' };
        }

        const list = getCustomWidgets();
        const existingIdx = list.findIndex(item => item.id === widget.id);

        if (existingIdx !== -1) {
            const confirmed = typeof confirm !== 'undefined'
                ? confirm(`A widget named "${list[existingIdx].name}" (${widget.id}) already exists. Overwrite with this version?`)
                : true;
            if (confirmed) {
                list[existingIdx] = widget;
                saveCustomWidgets(list);
                showStatus(statusElement, `Successfully updated "${widget.name}"!`, 'success');
            } else {
                showStatus(statusElement, 'Installation cancelled.', 'info');
                return { success: false, cancelled: true };
            }
        } else {
            list.push(widget);
            saveCustomWidgets(list);
            showStatus(statusElement, `Successfully installed "${widget.name}"!`, 'success');
        }

        if (typeof successCallback === 'function') {
            successCallback(widget);
        }

        return { success: true, widget };
    } catch (err) {
        console.error('Widget installation failed:', err);
        showStatus(statusElement, `Error: Failed to install widget (${err.message || 'Network error'})`, 'error');
        return { success: false, error: err.message };
    }
}

export function initWidgetStudio(modal) {
    if (!modal) return;

    // Elements
    const btnLaunch = modal.querySelector('#btn-launch-widget-studio');
    const dragzone = modal.querySelector('#widget-import-dragzone');
    const fileInput = modal.querySelector('#widget-import-file-input');
    const statusMsg = modal.querySelector('#import-status-msg');

    // Launch Builder Studio in new tab
    if (btnLaunch) {
        btnLaunch.addEventListener('click', () => {
            window.open('widget-studio.html', '_blank');
        });
    }

    // Dynamic Lists Initialization
    const renderAllLists = () => {
        renderManageList(modal);
        renderExportList(modal);
    };

    // Re-render list whenever tab is active
    const menuItems = modal.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            if (tab === 'widget-manage' || tab === 'widget-export') {
                renderAllLists();
            } else if (tab === 'widget-import') {
                renderHubFeaturedWidgets(modal, renderAllLists);
            } else if (tab === 'widget-docs') {
                initWidgetDocs(modal);
            }
        });
    });

    // Setup URL / URI Import Section
    const btnImportUrl = modal.querySelector('#btn-import-url');
    const urlInput = modal.querySelector('#widget-import-url-input');
    const statusMsgUrl = modal.querySelector('#import-url-status-msg') || statusMsg;

    if (btnImportUrl && urlInput) {
        const doImportUrl = async () => {
            const val = urlInput.value.trim();
            if (!val) return;
            btnImportUrl.disabled = true;
            btnImportUrl.textContent = 'Fetching...';
            await installWidgetFromUrl(val, statusMsgUrl, () => {
                renderAllLists();
                renderHubFeaturedWidgets(modal, renderAllLists);
                urlInput.value = '';
            });
            btnImportUrl.disabled = false;
            btnImportUrl.textContent = 'Fetch & Install';
        };

        btnImportUrl.addEventListener('click', doImportUrl);
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                doImportUrl();
            }
        });
    }

    // Support window postMessage for 1-click install from Hub
    window.addEventListener('message', async (e) => {
        if (e.data && (e.data.type === 'INSTALL_HOMEWIDGET' || e.data.action === 'install-widget') && e.data.url) {
            modal.classList.remove('hidden', 'is-minimized');
            if (typeof window.openSettingsCategory === 'function') {
                window.openSettingsCategory('widget-studio', 'widget-import');
            }
            const statusElement = modal.querySelector('#import-url-status-msg') || statusMsg;
            await installWidgetFromUrl(e.data.url, statusElement, () => {
                renderAllLists();
                renderHubFeaturedWidgets(modal, renderAllLists);
            });
        }
    });

    // Setup Import Drag & Drop & File Input
    if (dragzone && fileInput) {
        dragzone.addEventListener('click', () => fileInput.click());

        dragzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dragzone.classList.add('dragover');
        });

        dragzone.addEventListener('dragleave', () => {
            dragzone.classList.remove('dragover');
        });

        dragzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dragzone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleImportFile(files[0], renderAllLists, statusMsg);
            }
        });

        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                handleImportFile(files[0], renderAllLists, statusMsg);
                fileInput.value = ''; // Reset input
            }
        });
    }

    // Initial render
    renderAllLists();
    renderHubFeaturedWidgets(modal, renderAllLists);
    handleInitialUrlInstall(modal, renderAllLists);

    // Listen for updates from builder tab
    window.addEventListener('storage', (e) => {
        if (e.key === 'startpage_custom_widgets') {
            renderAllLists();
            renderHubFeaturedWidgets(modal, renderAllLists);
        }
    });
}

// Render GitHub WidgetStore Featured Widgets in the Install & Store tab
async function renderHubFeaturedWidgets(modal, renderAllLists) {
    const container = modal.querySelector('#hub-featured-widgets-list');
    if (!container) return;

    let widgets = FALLBACK_STORE_WIDGETS;
    try {
        const res = await fetch(GITHUB_WIDGETSTORE_CATALOG_URL);
        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.widgets) && data.widgets.length > 0) {
                widgets = data.widgets;
            }
        }
    } catch (e) {
        // Fallback to offline catalog
    }

    const installed = getCustomWidgets();
    const installedIds = new Set(installed.map(w => w.id));

    container.innerHTML = '';
    widgets.forEach(w => {
        const isInstalled = installedIds.has(w.id);
        const card = document.createElement('div');
        card.className = 'widget-item-card hub-featured-card';
        card.innerHTML = `
            <div class="widget-item-info">
                <div class="widget-item-icon">
                    ${getWidgetIconMarkup(w.icon, w.name, 22)}
                </div>
                <div class="widget-item-meta">
                    <span class="widget-item-name">${escapeHTML(w.name)}</span>
                    <span class="widget-item-details">v${escapeHTML(w.version)} • by ${escapeHTML(w.author || 'si4k')} • ${escapeHTML(w.category || 'Utilities')}</span>
                    <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 3px;">${escapeHTML(w.description || '')}</div>
                </div>
            </div>
            <div class="widget-item-actions">
                <button type="button" class="action-btn ${isInstalled ? 'secondary-btn' : 'primary-btn'} btn-install-hub-item" data-url="${escapeHTML(w.downloadUrl || `${GITHUB_WIDGETSTORE_RAW_BASE}/${w.id}.homewidget`)}">
                    ${isInstalled ? 'Reinstall' : 'Install'}
                </button>
            </div>
        `;

        const btn = card.querySelector('.btn-install-hub-item');
        if (btn) {
            btn.addEventListener('click', async () => {
                const url = btn.getAttribute('data-url');
                const statusElement = modal.querySelector('#import-url-status-msg') || modal.querySelector('#import-status-msg');
                btn.disabled = true;
                btn.textContent = 'Installing...';
                await installWidgetFromUrl(url, statusElement, () => {
                    renderAllLists();
                    renderHubFeaturedWidgets(modal, renderAllLists);
                });
                btn.disabled = false;
                btn.textContent = 'Installed';
            });
        }

        container.appendChild(card);
    });
}

// Handle deep-link query parameter installation (e.g. ?install_widget=https://... or ?install=weather)
function handleInitialUrlInstall(modal, renderAllLists) {
    try {
        const params = new URLSearchParams(window.location.search);
        const installTarget = params.get('install_widget') || params.get('install');
        if (installTarget) {
            modal.classList.remove('hidden', 'is-minimized');
            if (typeof window.openSettingsCategory === 'function') {
                window.openSettingsCategory('widget-studio', 'widget-import');
            }

            const urlInput = modal.querySelector('#widget-import-url-input');
            if (urlInput) urlInput.value = installTarget;

            const statusElement = modal.querySelector('#import-url-status-msg') || modal.querySelector('#import-status-msg');
            installWidgetFromUrl(installTarget, statusElement, () => {
                renderAllLists();
                renderHubFeaturedWidgets(modal, renderAllLists);
            });

            // Clean query param from URL without reloading
            const cleanUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    } catch (e) {
        console.error('Error handling URL install param:', e);
    }
}

// Render Manage custom widgets tab panel
function renderManageList(modal) {
    const listContainer = modal.querySelector('#installed-widgets-list');
    if (!listContainer) return;

    const widgets = getCustomWidgets();
    if (widgets.length === 0) {
        listContainer.innerHTML = `<div class="empty-state">No custom widgets installed. Build or import one to get started!</div>`;
        return;
    }

    listContainer.innerHTML = '';
    widgets.forEach(widget => {
        const card = document.createElement('div');
        card.className = 'widget-item-card';

        // Render widget type details text
        let typeLabel = 'App';
        if (widget.type === 'vertical') typeLabel = 'Vertical Panel';
        else if (widget.type === 'horizontal') typeLabel = 'Horizontal Panel';
        else if (widget.type === 'widget') typeLabel = 'Dashboard Widget';

        card.innerHTML = `
            <div class="widget-item-info">
                <div class="widget-item-icon">
                    ${getWidgetIconMarkup(widget.icon, widget.name, 22)}
                </div>
                <div class="widget-item-meta">
                    <span class="widget-item-name">${escapeHTML(widget.name)}</span>
                    <span class="widget-item-details">v${escapeHTML(widget.version)} • by ${escapeHTML(widget.author || 'Unknown')} • ${typeLabel}</span>
                </div>
            </div>
            <div class="widget-item-actions">
                <label class="switch" title="Enable/Disable Widget">
                    <input type="checkbox" class="toggle-widget-state" data-id="${widget.id}" ${widget.enabled !== false ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
                <button type="button" class="action-btn edit-widget-btn" data-id="${widget.id}" title="Edit Widget" style="padding: 6px 10px;">Edit</button>
                <button type="button" class="action-btn delete-widget-btn" data-id="${widget.id}" title="Delete Widget" style="padding: 6px 10px; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: #f87171;">Delete</button>
            </div>
        `;

        // Toggle Widget Event
        card.querySelector('.toggle-widget-state').addEventListener('change', (e) => {
            const list = getCustomWidgets();
            const w = list.find(item => item.id === widget.id);
            if (w) {
                w.enabled = e.target.checked;
                saveCustomWidgets(list);
            }
        });

        // Edit Widget Event
        card.querySelector('.edit-widget-btn').addEventListener('click', () => {
            window.open(`widget-studio.html?edit=${widget.id}`, '_blank');
        });

        // Delete Widget Event
        card.querySelector('.delete-widget-btn').addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete "${widget.name}"?`)) {
                let list = getCustomWidgets();
                list = list.filter(item => item.id !== widget.id);
                saveCustomWidgets(list);
                renderManageList(modal);
                renderExportList(modal);
            }
        });

        listContainer.appendChild(card);
    });
}

// Render Export custom widgets tab panel
function renderExportList(modal) {
    const listContainer = modal.querySelector('#export-widgets-list');
    if (!listContainer) return;

    const widgets = getCustomWidgets();
    if (widgets.length === 0) {
        listContainer.innerHTML = `<div class="empty-state">No custom widgets available to export.</div>`;
        return;
    }

    listContainer.innerHTML = '';
    widgets.forEach(widget => {
        const card = document.createElement('div');
        card.className = 'widget-item-card';

        card.innerHTML = `
            <div class="widget-item-info">
                <div class="widget-item-icon">
                    ${getWidgetIconMarkup(widget.icon, widget.name, 22)}
                </div>
                <div class="widget-item-meta">
                    <span class="widget-item-name">${escapeHTML(widget.name)}</span>
                    <span class="widget-item-details">v${escapeHTML(widget.version)}</span>
                </div>
            </div>
            <div class="widget-item-actions">
                <button type="button" class="action-btn export-widget-btn" data-id="${widget.id}" title="Export to .homewidget" style="padding: 6px 12px; background: var(--accent-color); border-color: var(--accent-color); color: #fff;">Export</button>
            </div>
        `;

        // Export trigger
        card.querySelector('.export-widget-btn').addEventListener('click', async (e) => {
            const btn = e.target;
            const originalText = btn.textContent;
            btn.textContent = 'Packing...';
            btn.disabled = true;

            try {
                const payload = JSON.stringify(widget);
                const compressedBlob = await compressString(payload);
                
                const url = URL.createObjectURL(compressedBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${widget.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.homewidget`;
                document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            } catch (err) {
                console.error(err);
                alert('Export failed. Check console.');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });

        listContainer.appendChild(card);
    });
}

// Handle .homewidget file import
async function handleImportFile(file, successCallback, statusElement) {
    if (!file) return;

    if (!file.name.endsWith('.homewidget')) {
        showStatus(statusElement, 'Error: File must have .homewidget extension.', 'error');
        return;
    }

    showStatus(statusElement, 'Decompressing and parsing package...', 'info');

    try {
        const decompressedText = await decompressBlob(file);
        const widget = JSON.parse(decompressedText);

        // Basic Schema Validation (supports legacy html string as well as multi-file package files)
        if (!widget.id || !widget.name || !widget.type || (widget.html === undefined && (!Array.isArray(widget.files) || widget.files.length === 0))) {
            showStatus(statusElement, 'Error: Invalid widget package metadata format.', 'error');
            return;
        }

        const list = getCustomWidgets();
        const existingIdx = list.findIndex(item => item.id === widget.id);

        if (existingIdx !== -1) {
            if (confirm(`A widget named "${list[existingIdx].name}" with the same ID already exists. Overwrite?`)) {
                list[existingIdx] = widget;
                saveCustomWidgets(list);
                showStatus(statusElement, `Successfully updated "${widget.name}"!`, 'success');
            } else {
                showStatus(statusElement, 'Import cancelled.', 'info');
                return;
            }
        } else {
            list.push(widget);
            saveCustomWidgets(list);
            showStatus(statusElement, `Successfully imported "${widget.name}"!`, 'success');
        }

        successCallback();
    } catch (err) {
        console.error(err);
        showStatus(statusElement, 'Error: Failed to decompress widget file. Invalid or corrupted archive.', 'error');
    }
}

function showStatus(element, message, type) {
    if (!element) return;
    element.textContent = message;
    element.className = `import-status ${type}`;
    element.classList.remove('hidden');
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function initWidgetDocs(modal) {
    const navList = modal.querySelector('#docs-nav-list');
    const titleEl = modal.querySelector('#docs-content-title');
    const bodyEl = modal.querySelector('#docs-content-body');
    if (!navList || !titleEl || !bodyEl) return;

    // Check if already populated to prevent duplicate fetches
    if (navList.children.length > 0) return;

    fetch('widget-studio-documentaion.json')
        .then(res => res.json())
        .then(data => {
            navList.innerHTML = '';
            
            let firstClickableItem = null;
            
            data.forEach(item => {
                if (item.children && item.children.length > 0) {
                    // Section header group item
                    const groupHeader = document.createElement('li');
                    groupHeader.className = 'docs-nav-group-header';
                    groupHeader.textContent = item.title;
                    navList.appendChild(groupHeader);
                    
                    item.children.forEach(child => {
                        const childItem = document.createElement('li');
                        childItem.className = 'docs-nav-item docs-nav-subitem';
                        childItem.textContent = child.title;
                        childItem.addEventListener('click', () => {
                            selectDocItem(childItem, child);
                        });
                        navList.appendChild(childItem);
                        if (!firstClickableItem) firstClickableItem = { el: childItem, item: child };
                    });
                } else {
                    // Standard clickable link item
                    const navItem = document.createElement('li');
                    navItem.className = 'docs-nav-item';
                    navItem.textContent = item.title;
                    navItem.addEventListener('click', () => {
                        selectDocItem(navItem, item);
                    });
                    navList.appendChild(navItem);
                    if (!firstClickableItem) firstClickableItem = { el: navItem, item: item };
                }
            });

            function selectDocItem(el, doc) {
                navList.querySelectorAll('.docs-nav-item').forEach(item => item.classList.remove('active'));
                el.classList.add('active');
                titleEl.textContent = doc.title;
                bodyEl.innerHTML = doc.content;
            }

            // Auto-select the first clickable page
            if (firstClickableItem) {
                selectDocItem(firstClickableItem.el, firstClickableItem.item);
            }
        })
        .catch(err => {
            console.error('Failed to load documentation:', err);
            navList.innerHTML = `<li style="color:#ef4444; font-size:0.75rem; padding: 10px;">Failed to load index.</li>`;
        });
}
