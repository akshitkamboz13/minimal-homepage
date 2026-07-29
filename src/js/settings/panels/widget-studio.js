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
function getCustomWidgets() {
    try {
        return JSON.parse(localStorage.getItem('startpage_custom_widgets')) || [];
    } catch (e) {
        return [];
    }
}

// Save custom widgets to localStorage
function saveCustomWidgets(widgets) {
    localStorage.setItem('startpage_custom_widgets', JSON.stringify(widgets));
    // Dispatch event to reload runtime widgets immediately
    window.dispatchEvent(new CustomEvent('widgets-reloaded'));
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
            } else if (tab === 'widget-docs') {
                initWidgetDocs(modal);
            }
        });
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

    // Listen for updates from builder tab
    window.addEventListener('storage', (e) => {
        if (e.key === 'startpage_custom_widgets') {
            renderAllLists();
        }
    });
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
