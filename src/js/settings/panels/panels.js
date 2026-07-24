import { userSettings, saveSettings, onSettingsChanged } from '../settings-state.js';
import { initCustomDropdown } from '../custom-dropdown.js';
import { applyDockVisuals, getFaviconUrl } from '../../ui/panels/dock.js';

export function initPanelsSettings(modal) {
    onSettingsChanged(() => {
        applyPanelsVisuals();
    });
    initAddSiteModal();
    // 1. Vertical Panel (Right Panel)
    const toggleVerticalPanel = document.getElementById('toggle-vertical-panel');
    if (toggleVerticalPanel) {
        toggleVerticalPanel.checked = userSettings.showVerticalPanel !== false;
        toggleVerticalPanel.addEventListener('change', (e) => {
            userSettings.showVerticalPanel = e.target.checked;
            saveSettings();
            applyPanelsVisuals();
        });
    }

    const dropdownVerticalPos = initCustomDropdown('vertical-position', (val) => {
        userSettings.verticalPanelPosition = val;
        saveSettings();
        applyPanelsVisuals();
    });
    if (dropdownVerticalPos) {
        dropdownVerticalPos.setValue(userSettings.verticalPanelPosition || 'right');
    }

    const toggleGoogleApps = document.getElementById('toggle-google-apps');
    if (toggleGoogleApps) {
        toggleGoogleApps.checked = userSettings.showGoogleApps !== false;
        toggleGoogleApps.addEventListener('change', (e) => {
            userSettings.showGoogleApps = e.target.checked;
            saveSettings();
            applyPanelsVisuals();
        });
    }

    const toggleVisualSearch = document.getElementById('toggle-visual-search');
    if (toggleVisualSearch) {
        toggleVisualSearch.checked = userSettings.showVisualSearch !== false;
        toggleVisualSearch.addEventListener('change', (e) => {
            userSettings.showVisualSearch = e.target.checked;
            saveSettings();
            applyPanelsVisuals();
        });
    }

    const dropdownVerticalIconSize = initCustomDropdown('vertical-icon-size', (val) => {
        userSettings.verticalIconSize = parseInt(val, 10);
        saveSettings();
        applyPanelsVisuals();
    });
    if (dropdownVerticalIconSize) {
        dropdownVerticalIconSize.setValue(userSettings.verticalIconSize || 20);
    }

    // 2. Horizontal Panel (Top Panel)
    const toggleHorizontalPanel = document.getElementById('toggle-horizontal-panel');
    if (toggleHorizontalPanel) {
        toggleHorizontalPanel.checked = userSettings.showHorizontalPanel !== false;
        toggleHorizontalPanel.addEventListener('change', (e) => {
            userSettings.showHorizontalPanel = e.target.checked;
            saveSettings();
            applyPanelsVisuals();
        });
    }

    const dropdownHorizontalPos = initCustomDropdown('horizontal-position', (val) => {
        userSettings.horizontalPanelPosition = val;
        saveSettings();
        applyPanelsVisuals();
    });
    if (dropdownHorizontalPos) {
        dropdownHorizontalPos.setValue(userSettings.horizontalPanelPosition || 'top');
    }

    const toggleHeaderNote = document.getElementById('toggle-header-note');
    if (toggleHeaderNote) {
        toggleHeaderNote.checked = userSettings.showHeaderNote !== false;
        toggleHeaderNote.addEventListener('change', (e) => {
            userSettings.showHeaderNote = e.target.checked;
            saveSettings();
            applyPanelsVisuals();
        });
    }

    const toggleHeaderSettings = document.getElementById('toggle-header-settings');
    if (toggleHeaderSettings) {
        toggleHeaderSettings.checked = userSettings.showHeaderSettings !== false;
        toggleHeaderSettings.addEventListener('change', (e) => {
            userSettings.showHeaderSettings = e.target.checked;
            saveSettings();
            applyPanelsVisuals();
        });
    }

    const toggleHeaderTheme = document.getElementById('toggle-header-theme');
    if (toggleHeaderTheme) {
        toggleHeaderTheme.checked = userSettings.showHeaderTheme !== false;
        toggleHeaderTheme.addEventListener('change', (e) => {
            userSettings.showHeaderTheme = e.target.checked;
            saveSettings();
            applyPanelsVisuals();
        });
    }

    const dropdownHorizontalIconSize = initCustomDropdown('horizontal-icon-size', (val) => {
        userSettings.horizontalIconSize = parseInt(val, 10);
        saveSettings();
        applyPanelsVisuals();
    });
    if (dropdownHorizontalIconSize) {
        dropdownHorizontalIconSize.setValue(userSettings.horizontalIconSize || 20);
    }

    // 3. Application Dock
    const toggleDock = document.getElementById('toggle-dock');
    if (toggleDock) {
        toggleDock.checked = userSettings.showDock !== false;
        toggleDock.addEventListener('change', (e) => {
            userSettings.showDock = e.target.checked;
            saveSettings();
            applyDockVisuals();
        });
    }

    const dropdownDockPosition = initCustomDropdown('dock-position', (val) => {
        userSettings.dockPosition = val;
        saveSettings();
        applyDockVisuals();
    });
    if (dropdownDockPosition) {
        dropdownDockPosition.setValue(userSettings.dockPosition || 'bottom');
    }

    const toggleDockAutohide = document.getElementById('toggle-dock-autohide');
    if (toggleDockAutohide) {
        toggleDockAutohide.checked = userSettings.dockAutohide === true;
        toggleDockAutohide.addEventListener('change', (e) => {
            userSettings.dockAutohide = e.target.checked;
            saveSettings();
            applyDockVisuals();
        });
    }

    // 4. Custom Shortcuts Manager
    initCustomShortcutsManager();

    applyPanelsVisuals();
}

function initCustomShortcutsManager() {
    const listContainer = document.getElementById('custom-shortcuts-list');
    const formContainer = document.getElementById('shortcut-form-container');
    const btnAdd = document.getElementById('btn-add-custom-shortcut');
    const btnCancel = document.getElementById('btn-cancel-shortcut');
    const btnSave = document.getElementById('btn-save-shortcut');
    
    const editIdInput = document.getElementById('shortcut-edit-id');
    const titleInput = document.getElementById('shortcut-input-title');
    const urlInput = document.getElementById('shortcut-input-url');
    const panelSelect = document.getElementById('shortcut-select-panel');
    const targetSelect = document.getElementById('shortcut-select-target');
    const iconInput = document.getElementById('shortcut-input-icon');
    const formTitle = document.getElementById('shortcut-form-title');

    if (!listContainer) return;

    const renderList = () => {
        listContainer.innerHTML = '';
        const items = userSettings.customPanelItems || [];

        if (items.length === 0) {
            listContainer.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; padding: 12px;">No custom panel shortcuts added yet.</p>';
            return;
        }

        items.forEach(item => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 8px; font-size: 0.85rem;';

            const panelBadgeName = item.panel === 'vertical' ? 'Vertical Panel' : item.panel === 'horizontal' ? 'Horizontal Panel' : 'Dock';
            const panelBadgeColor = item.panel === 'vertical' ? 'rgba(59, 130, 246, 0.2)' : item.panel === 'horizontal' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(34, 197, 94, 0.2)';

            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; overflow: hidden; margin-right: 8px;">
                    <strong style="white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${item.title}</strong>
                    <span style="font-size: 0.72rem; color: var(--text-secondary); white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${item.url}</span>
                    <span style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: ${panelBadgeColor}; color: var(--text-color); font-weight: 500;">${panelBadgeName}</span>
                </div>
                <div style="display: flex; gap: 6px; flex-shrink: 0;">
                    <button type="button" class="action-btn secondary edit-btn" style="padding: 2px 8px; font-size: 0.75rem;">Edit</button>
                    <button type="button" class="action-btn danger delete-btn" style="padding: 2px 8px; font-size: 0.75rem;">Delete</button>
                </div>
            `;

            row.querySelector('.edit-btn').addEventListener('click', () => {
                editIdInput.value = item.id;
                titleInput.value = item.title || '';
                urlInput.value = item.url || '';
                panelSelect.value = item.panel || 'dock';
                targetSelect.value = item.target || '_blank';
                iconInput.value = item.icon || '';
                formTitle.textContent = 'Edit Shortcut';
                formContainer.style.display = 'block';
            });

            row.querySelector('.delete-btn').addEventListener('click', () => {
                userSettings.customPanelItems = (userSettings.customPanelItems || []).filter(i => i.id !== item.id);
                saveSettings();
                renderList();
                applyDockVisuals();
                applyPanelsVisuals();
            });

            listContainer.appendChild(row);
        });
    };

    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            editIdInput.value = '';
            titleInput.value = '';
            urlInput.value = '';
            panelSelect.value = 'dock';
            targetSelect.value = '_self';
            iconInput.value = '';
            formTitle.textContent = 'Add New Shortcut';
            formContainer.style.display = 'block';
        });
    }

    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            formContainer.style.display = 'none';
        });
    }

    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const title = titleInput.value.trim();
            const url = urlInput.value.trim();
            if (!title || !url) {
                alert('Please enter both Title and URL for the shortcut.');
                return;
            }

            const panel = panelSelect.value;
            const target = targetSelect.value;
            const icon = iconInput.value.trim();
            const editId = editIdInput.value;

            if (!userSettings.customPanelItems) userSettings.customPanelItems = [];

            if (editId) {
                const item = userSettings.customPanelItems.find(i => i.id === editId);
                if (item) {
                    item.title = title;
                    item.url = url;
                    item.panel = panel;
                    item.target = target;
                    item.icon = icon;
                }
            } else {
                userSettings.customPanelItems.push({
                    id: 'shortcut_' + Date.now(),
                    title,
                    url,
                    panel,
                    target,
                    icon
                });
            }

            saveSettings();
            formContainer.style.display = 'none';
            renderList();
            applyDockVisuals();
            applyPanelsVisuals();
        });
    }

    window.renderCustomShortcutsList = renderList;
    renderList();
}

export function refreshCustomShortcutsList() {
    if (typeof window.renderCustomShortcutsList === 'function') {
        window.renderCustomShortcutsList();
    }
}

export function applyPanelsVisuals() {
    const fabContainer = document.querySelector('.fab-container');
    const mainHeader = document.getElementById('main-header');
    const googleAppsTrigger = document.getElementById('google-apps-trigger');
    const imageSearchTrigger = document.getElementById('image-search-trigger');
    const addNoteBtn = document.getElementById('add-note-btn');
    const settingsToggle = document.getElementById('settings-toggle');
    const themeToggle = document.getElementById('theme-toggle');

    const fabCustomContainer = document.getElementById('fab-custom-items');
    const headerCustomContainer = document.getElementById('header-custom-items');

    const customItems = userSettings.customPanelItems || [];

    // Render Vertical Panel Custom Items
    if (fabCustomContainer) {
        fabCustomContainer.innerHTML = '';
        const vItems = customItems.filter(i => i.panel === 'vertical');
        const vSize = userSettings.verticalIconSize || 20;

        vItems.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'floating-action-btn';
            btn.setAttribute('aria-label', item.title);
            btn.setAttribute('title', item.title);

            let iconMarkup = item.icon || '';
            if (!iconMarkup && item.url) {
                const favUrl = getFaviconUrl(item.url);
                iconMarkup = `<img src="${favUrl}" alt="${item.title}" style="width:${vSize}px;height:${vSize}px;object-fit:contain;" />`;
            } else if (iconMarkup && !iconMarkup.trim().startsWith('<')) {
                iconMarkup = `<img src="${iconMarkup}" alt="${item.title}" style="width:${vSize}px;height:${vSize}px;object-fit:contain;" />`;
            }

            btn.innerHTML = iconMarkup;
            btn.addEventListener('click', () => {
                if (item.target === '_self') {
                    window.location.href = item.url;
                } else {
                    window.open(item.url, '_blank');
                }
            });

            fabCustomContainer.appendChild(btn);
        });
    }

    // Render Horizontal Panel Custom Items
    if (headerCustomContainer) {
        headerCustomContainer.innerHTML = '';
        const hItems = customItems.filter(i => i.panel === 'horizontal');
        const hSize = userSettings.horizontalIconSize || 20;

        hItems.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'glass-btn';
            btn.setAttribute('aria-label', item.title);
            btn.setAttribute('title', item.title);

            let iconMarkup = item.icon || '';
            if (!iconMarkup && item.url) {
                const favUrl = getFaviconUrl(item.url);
                iconMarkup = `<img src="${favUrl}" alt="${item.title}" style="width:${hSize}px;height:${hSize}px;object-fit:contain;" />`;
            } else if (iconMarkup && !iconMarkup.trim().startsWith('<')) {
                iconMarkup = `<img src="${iconMarkup}" alt="${item.title}" style="width:${hSize}px;height:${hSize}px;object-fit:contain;" />`;
            }

            btn.innerHTML = iconMarkup;
            btn.addEventListener('click', () => {
                if (item.target === '_self') {
                    window.location.href = item.url;
                } else {
                    window.open(item.url, '_blank');
                }
            });

            headerCustomContainer.appendChild(btn);
        });
    }

    // 1. Vertical Panel (Right Panel)
    if (fabContainer) {
        if (userSettings.showVerticalPanel === false) {
            fabContainer.style.display = 'none';
        } else {
            fabContainer.style.display = 'flex';
            if (userSettings.verticalPanelPosition === 'left' && !userSettings.freeformLayout) {
                fabContainer.style.left = '2rem';
                fabContainer.style.right = 'auto';
            } else if (!userSettings.freeformLayout) {
                fabContainer.style.right = '2rem';
                fabContainer.style.left = 'auto';
            }
        }
    }

    if (googleAppsTrigger) {
        googleAppsTrigger.style.display = userSettings.showGoogleApps === false ? 'none' : '';
    }
    if (imageSearchTrigger) {
        imageSearchTrigger.style.display = userSettings.showVisualSearch === false ? 'none' : '';
    }

    // Apply Vertical Icon Size
    const vSize = userSettings.verticalIconSize || 20;
    document.querySelectorAll('.fab-container .floating-action-btn svg').forEach(svg => {
        svg.setAttribute('width', vSize);
        svg.setAttribute('height', vSize);
    });

    // 2. Horizontal Panel (Top Panel)
    if (mainHeader) {
        if (userSettings.showHorizontalPanel === false) {
            mainHeader.style.display = 'none';
        } else {
            mainHeader.style.display = 'flex';
            if (!userSettings.freeformLayout) {
                mainHeader.style.position = 'fixed';
                mainHeader.style.right = '2rem';
                mainHeader.style.zIndex = '1000';
                if (userSettings.horizontalPanelPosition === 'bottom') {
                    mainHeader.style.top = 'auto';
                    mainHeader.style.bottom = '1.5rem';
                } else {
                    mainHeader.style.top = '1.5rem';
                    mainHeader.style.bottom = 'auto';
                }
            }
        }
    }

    if (addNoteBtn) {
        addNoteBtn.style.display = userSettings.showHeaderNote === false ? 'none' : '';
    }
    if (settingsToggle) {
        settingsToggle.style.display = userSettings.showHeaderSettings === false ? 'none' : '';
    }
    if (themeToggle) {
        themeToggle.style.display = userSettings.showHeaderTheme === false ? 'none' : '';
    }

    // Apply Horizontal Icon Size
    const hSize = userSettings.horizontalIconSize || 20;
    document.querySelectorAll('#main-header .glass-btn svg').forEach(svg => {
        svg.setAttribute('width', hSize);
        svg.setAttribute('height', hSize);
    });
}

export function showToastNotification(msg) {
    let toast = document.createElement('div');
    toast.className = 'glass-panel';
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        z-index: 100000;
        background: rgba(15, 23, 42, 0.85);
        color: #ffffff;
        border: 1px solid rgba(59, 130, 246, 0.4);
        padding: 10px 18px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 500;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    toast.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg><span>${msg}</span>`;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function updateFaviconPreview(urlStr) {
    const previewContainer = document.getElementById('modal-favicon-preview');
    if (!previewContainer) return;

    if (!urlStr || !urlStr.trim()) {
        previewContainer.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color, #3b82f6)" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`;
        return;
    }

    try {
        let fullUrl = urlStr.trim();
        if (!/^https?:\/\//i.test(fullUrl)) fullUrl = 'https://' + fullUrl;
        const favUrl = getFaviconUrl(fullUrl);
        if (favUrl) {
            previewContainer.innerHTML = `<img src="${favUrl}" alt="Favicon" onerror="this.onerror=null;this.parentElement.innerHTML='<svg width=\\'22\\' height=\\'22\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'var(--accent-color, #3b82f6)\\' stroke-width=\\'2\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\'/></svg>';" />`;
        }
    } catch (e) {
        previewContainer.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color, #3b82f6)" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`;
    }
}

export function openAddSiteModal(options = {}) {
    const modal = document.getElementById('add-site-modal');
    if (!modal) return;

    const titleInput = document.getElementById('modal-shortcut-title');
    const urlInput = document.getElementById('modal-shortcut-url');
    const panelInput = document.getElementById('modal-shortcut-panel');
    const targetSelect = document.getElementById('modal-shortcut-target');
    const iconInput = document.getElementById('modal-shortcut-icon');

    const panelVal = options.panel || 'dock';

    if (titleInput) titleInput.value = options.title || '';
    if (urlInput) urlInput.value = options.url || '';
    if (panelInput) panelInput.value = panelVal;
    if (targetSelect) targetSelect.value = options.target || '_self';
    if (iconInput) iconInput.value = options.icon || '';

    // Sync radio buttons
    const radios = document.querySelectorAll('input[name="modal-panel-radio"]');
    radios.forEach(radio => {
        radio.checked = radio.value === panelVal;
    });

    updateFaviconPreview(options.url || '');

    modal.classList.remove('hidden');
    if (titleInput) {
        titleInput.focus();
        titleInput.select();
    }
}

export function closeAddSiteModal() {
    const modal = document.getElementById('add-site-modal');
    if (modal) modal.classList.add('hidden');
}

export function initAddSiteModal() {
    const modal = document.getElementById('add-site-modal');
    const form = document.getElementById('add-site-modal-form');
    const btnClose = document.getElementById('btn-close-add-site-modal');
    const btnCancel = document.getElementById('btn-cancel-add-site-modal');
    const urlInput = document.getElementById('modal-shortcut-url');
    const panelInput = document.getElementById('modal-shortcut-panel');

    if (!modal || !form) return;

    if (btnClose) btnClose.addEventListener('click', closeAddSiteModal);
    if (btnCancel) btnCancel.addEventListener('click', closeAddSiteModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAddSiteModal();
    });

    if (urlInput) {
        urlInput.addEventListener('input', (e) => {
            updateFaviconPreview(e.target.value);
        });
    }

    // Radio panel selector change listener
    const radios = document.querySelectorAll('input[name="modal-panel-radio"]');
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked && panelInput) {
                panelInput.value = e.target.value;
            }
        });
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let title = document.getElementById('modal-shortcut-title').value.trim();
        let url = document.getElementById('modal-shortcut-url').value.trim();
        const panel = document.getElementById('modal-shortcut-panel').value;
        const target = document.getElementById('modal-shortcut-target').value;
        const icon = document.getElementById('modal-shortcut-icon').value.trim();

        if (!url) return;
        if (!url.startsWith('action:') && !/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        if (!title) {
            try { title = new URL(url).hostname; } catch(err) { title = 'Shortcut'; }
        }

        if (!userSettings.customPanelItems) userSettings.customPanelItems = [];
        const newItem = {
            id: 'shortcut_' + Date.now(),
            title: title,
            url: url,
            panel: panel,
            target: target,
            icon: icon
        };

        userSettings.customPanelItems.push(newItem);
        saveSettings();
        applyDockVisuals();
        applyPanelsVisuals();
        refreshCustomShortcutsList();
        closeAddSiteModal();

        const panelName = panel === 'vertical' ? 'Vertical Panel' : panel === 'horizontal' ? 'Horizontal Panel' : panel === 'grid' ? 'Applications Grid' : 'Application Dock';
        showToastNotification(`Added "${newItem.title}" to ${panelName}`);
    });

    // Check URL search parameters for external additions
    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('add_site')) {
            const addUrl = urlParams.get('url') || '';
            const addTitle = urlParams.get('title') || '';
            const addPanel = urlParams.get('panel') || 'dock';
            openAddSiteModal({ title: addTitle, url: addUrl, panel: addPanel });
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } catch (e) {}
}
