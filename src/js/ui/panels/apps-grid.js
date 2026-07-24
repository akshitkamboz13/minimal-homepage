import { userSettings } from '../../settings/index.js';
import { getFaviconUrl } from './dock.js';
import { openAddSiteModal } from '../../settings/panels/panels.js';
import { openPuffShell } from '../../puff/puff.js';

let appsOverlayEl = null;
let appsContentEl = null;
let searchInputEl = null;
let currentCategory = 'all';

const SYSTEM_APPS = [
    {
        id: 'app_sticky_notes',
        name: 'Sticky Notes',
        category: 'system',
        icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M14 3v5h5"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`,
        action: () => {
            const addBtn = document.getElementById('add-note-btn');
            if (addBtn) addBtn.click();
            closeAppsGrid();
        }
    },
    {
        id: 'app_puff_shell',
        name: 'Puff Shell',
        category: 'system',
        icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#22c55e" stroke-width="2.2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
        action: () => {
            openPuffShell();
            closeAppsGrid();
        }
    },
    {
        id: 'app_system_settings',
        name: 'Settings',
        category: 'system',
        icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
        action: () => {
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) settingsModal.classList.remove('hidden', 'is-minimized');
            closeAppsGrid();
        }
    }
];

export function initAppsGrid() {
    appsOverlayEl = document.getElementById('apps-grid-overlay');
    appsContentEl = document.getElementById('apps-grid-content');
    searchInputEl = document.getElementById('apps-grid-search-input');

    if (!appsOverlayEl) return;

    const closeBtn = document.getElementById('close-apps-grid');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAppsGrid);
    }

    // Close on overlay backdrop click
    appsOverlayEl.addEventListener('click', (e) => {
        if (e.target === appsOverlayEl) {
            closeAppsGrid();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !appsOverlayEl.classList.contains('hidden')) {
            closeAppsGrid();
        }
    });

    // Search input listener
    if (searchInputEl) {
        searchInputEl.addEventListener('input', () => {
            renderAppsGrid();
        });
    }

    // Category tabs listeners
    const tabBtns = document.querySelectorAll('.apps-grid-tab');
    tabBtns.forEach(tab => {
        tab.addEventListener('click', () => {
            tabBtns.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.category || 'all';
            renderAppsGrid();
        });
    });
}

export function openAppsGrid() {
    if (!appsOverlayEl) return;
    appsOverlayEl.classList.remove('hidden');
    if (searchInputEl) {
        searchInputEl.value = '';
        setTimeout(() => searchInputEl.focus(), 100);
    }
    renderAppsGrid();
}

export function closeAppsGrid() {
    if (!appsOverlayEl) return;
    appsOverlayEl.classList.add('hidden');
}

export function toggleAppsGrid() {
    if (!appsOverlayEl) return;
    if (appsOverlayEl.classList.contains('hidden')) {
        openAppsGrid();
    } else {
        closeAppsGrid();
    }
}

function renderAppsGrid() {
    if (!appsContentEl) return;
    appsContentEl.innerHTML = '';

    const searchQuery = (searchInputEl ? searchInputEl.value : '').toLowerCase().trim();

    // 1. System Apps (Sticky Notes + Settings)
    let systemApps = SYSTEM_APPS;
    if (userSettings.showPuffShell === false) {
        systemApps = systemApps.filter(app => app.id !== 'app_puff_shell');
    }

    // 2. User Shortcuts (Dock & Apps Grid)
    const customPanelItems = userSettings.customPanelItems || [];
    const pinnedDockApps = customPanelItems
        .filter(item => (item.panel === 'dock' || item.panel === 'grid') && item.id !== 'item_puff_shell' && item.url !== 'action:puff')
        .map(item => ({
            id: item.id || 'pinned_' + Math.random(),
            name: item.title || 'Shortcut',
            category: item.panel === 'grid' ? 'grid' : 'pinned',
            url: item.url,
            target: item.target || '_blank',
            icon: item.icon || (item.url ? getFaviconUrl(item.url) : '')
        }));

    // Combine ONLY Sticky Notes, Settings, and Pinned Dock Shortcuts
    let allApps = [...systemApps, ...pinnedDockApps];

    // Filter by Category
    if (currentCategory !== 'all') {
        allApps = allApps.filter(app => app.category === currentCategory);
    }

    // Filter by Search Query
    if (searchQuery) {
        allApps = allApps.filter(app => app.name.toLowerCase().includes(searchQuery));
    }

    if (allApps.length === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.style.gridColumn = '1 / -1';
        emptyEl.style.textAlign = 'center';
        emptyEl.style.padding = '3rem 1rem';
        emptyEl.style.opacity = '0.7';
        emptyEl.style.fontSize = '0.95rem';
        emptyEl.innerHTML = `No applications found matching "<strong>${searchQuery}</strong>".`;
        appsContentEl.appendChild(emptyEl);
        return;
    }

    // Render Tiles
    allApps.forEach(app => {
        const tile = document.createElement('div');
        tile.className = 'app-tile';
        tile.title = app.name;

        let iconMarkup = '';
        if (app.icon && app.icon.trim().startsWith('<')) {
            iconMarkup = app.icon;
        } else if (app.icon) {
            iconMarkup = `<img src="${app.icon}" alt="${app.name}" onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22><rect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22/></svg>';" />`;
        } else {
            iconMarkup = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
        }

        tile.innerHTML = `
            <div class="app-tile-icon">${iconMarkup}</div>
            <div class="app-tile-name">${app.name}</div>
        `;

        tile.addEventListener('click', () => {
            if (app.action) {
                app.action();
            } else if (app.url) {
                if (app.target === '_self') {
                    window.location.href = app.url;
                } else {
                    window.open(app.url, '_blank');
                }
                closeAppsGrid();
            }
        });

        appsContentEl.appendChild(tile);
    });

    // Render "+ Add Shortcut" card tile
    const addTile = document.createElement('div');
    addTile.className = 'app-tile app-tile-add';
    addTile.title = 'Add New Shortcut';
    addTile.innerHTML = `
        <div class="app-tile-icon" style="border: 2px dashed currentColor; opacity: 0.85;">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </div>
        <div class="app-tile-name" style="font-weight: 700;">+ Add Shortcut</div>
    `;
    addTile.addEventListener('click', () => {
        closeAppsGrid();
        openAddSiteModal({ panel: 'dock' });
    });
    appsContentEl.appendChild(addTile);
}
