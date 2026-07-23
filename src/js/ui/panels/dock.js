import { userSettings, onSettingsChanged } from '../../settings/index.js';
import { toggleAppsGrid } from './apps-grid.js';

let dockContainer = null;

export function getFaviconUrl(urlStr) {
    try {
        const parsed = new URL(urlStr);
        return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
    } catch (e) {
        return '';
    }
}

let isRenderingDock = false;

export function initDock() {
    dockContainer = document.getElementById('glass-dock');
    if (!dockContainer) return;

    renderDock();
    setupAutoHide();

    onSettingsChanged(() => {
        applyDockVisuals();
    });

    // Observer to auto-update dock ONLY when notes container or settings modal state changes
    const observer = new MutationObserver(() => {
        if (isRenderingDock) return;
        renderDock();
    });

    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        observer.observe(settingsModal, { attributes: true, attributeFilter: ['class'] });
    }
    const notesContainer = document.getElementById('notes-container');
    if (notesContainer) {
        observer.observe(notesContainer, { childList: true, subtree: true });
    }

    applyDockVisuals();
}

export function applyDockVisuals() {
    if (!dockContainer) return;

    const showDock = userSettings.showDock !== false;
    const pos = userSettings.dockPosition || 'bottom';
    
    if (!showDock) {
        dockContainer.style.display = 'none';
        return;
    } else {
        dockContainer.style.display = 'flex';
    }

    // Set 4-position variant classes
    dockContainer.classList.remove('dock-bottom', 'dock-top', 'dock-left', 'dock-right');
    dockContainer.classList.add(`dock-${pos}`);

    // Re-render items to catch dynamic customPanelItems changes
    renderDock();

    // Auto-hide configuration
    if (userSettings.dockAutohide) {
        dockContainer.classList.add('dock-hidden');
    } else {
        dockContainer.classList.remove('dock-hidden');
    }
}

function renderDock() {
    if (!dockContainer || isRenderingDock) return;
    isRenderingDock = true;

    const allItems = userSettings.customPanelItems || [];
    // User-pinned dock items ONLY
    const pinnedDockItems = allItems.filter(item => item.panel === 'dock');

    const openNotesCount = document.querySelectorAll('.glass-note').length;
    const settingsModal = document.getElementById('settings-modal');
    const isSettingsOpen = settingsModal && !settingsModal.classList.contains('hidden');

    // Signature fingerprint check: Do NOT clear innerHTML if dock contents have not changed
    const signature = JSON.stringify({
        pinned: pinnedDockItems.map(i => i.id + '_' + i.title + '_' + i.url),
        notes: openNotesCount,
        settings: isSettingsOpen
    });

    if (dockContainer.dataset.renderedSignature === signature) {
        isRenderingDock = false;
        return;
    }
    dockContainer.dataset.renderedSignature = signature;
    dockContainer.innerHTML = '';

    // Helper to render an item
    const renderItem = (item, isActiveApp = false) => {
        const btn = document.createElement('button');
        btn.className = 'dock-item' + (isActiveApp ? ' is-active-app' : '');
        btn.setAttribute('aria-label', item.title);
        btn.dataset.id = item.id;

        let iconMarkup = item.icon || '';
        if (!iconMarkup && item.url) {
            const favUrl = getFaviconUrl(item.url);
            iconMarkup = `<img src="${favUrl}" alt="${item.title}" onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>';" />`;
        } else if (iconMarkup && !iconMarkup.trim().startsWith('<')) {
            iconMarkup = `<img src="${iconMarkup}" alt="${item.title}" />`;
        }

        btn.innerHTML = `
            <span class="dock-icon">${iconMarkup}</span>
            <span class="dock-tooltip">${item.title}</span>
        `;

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (item.url) {
                const target = item.target || '_blank';
                if (target === '_self') {
                    window.location.href = item.url;
                } else {
                    window.open(item.url, '_blank');
                }
            } else if (item.action === 'focus-notes') {
                const notes = document.querySelectorAll('.glass-note');
                const minimizedNotes = document.querySelectorAll('.glass-note.is-minimized');
                
                if (minimizedNotes.length > 0) {
                    // Unminimize all minimized notes
                    minimizedNotes.forEach(noteEl => {
                        noteEl.classList.remove('is-minimized');
                    });
                    try {
                        const rawNotes = JSON.parse(localStorage.getItem('startpage_notes') || '[]');
                        rawNotes.forEach(n => n.isMinimized = false);
                        localStorage.setItem('startpage_notes', JSON.stringify(rawNotes));
                    } catch(err) {}
                    if (notes.length > 0) notes[0].click();
                } else if (notes.length > 0) {
                    // If all visible, minimize all notes
                    notes.forEach(noteEl => noteEl.classList.add('is-minimized'));
                    try {
                        const rawNotes = JSON.parse(localStorage.getItem('startpage_notes') || '[]');
                        rawNotes.forEach(n => n.isMinimized = true);
                        localStorage.setItem('startpage_notes', JSON.stringify(rawNotes));
                    } catch(err) {}
                } else {
                    const addBtn = document.getElementById('add-note-btn');
                    if (addBtn) addBtn.click();
                }
            } else if (item.action === 'focus-settings') {
                const settingsModal = document.getElementById('settings-modal');
                if (settingsModal) {
                    if (settingsModal.classList.contains('is-minimized')) {
                        settingsModal.classList.remove('is-minimized', 'hidden');
                        localStorage.setItem('startpage_settings_minimized', 'false');
                    } else if (!settingsModal.classList.contains('hidden')) {
                        settingsModal.classList.add('is-minimized');
                        localStorage.setItem('startpage_settings_minimized', 'true');
                    } else {
                        settingsModal.classList.remove('hidden', 'is-minimized');
                        localStorage.setItem('startpage_settings_minimized', 'false');
                    }
                }
            } else if (item.action === 'toggle-apps-grid') {
                toggleAppsGrid();
            }
        });

        dockContainer.appendChild(btn);
    };

    // GNOME Show Applications Launcher Icon
    const appsGridLauncher = {
        id: 'show_applications_grid',
        title: 'Show Applications',
        action: 'toggle-apps-grid',
        icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="6.5" height="6.5" rx="1.5"/><rect x="14.5" y="3" width="6.5" height="6.5" rx="1.5"/><rect x="3" y="14.5" width="6.5" height="6.5" rx="1.5"/><rect x="14.5" y="14.5" width="6.5" height="6.5" rx="1.5"/></svg>`
    };
    renderItem(appsGridLauncher);

    if (pinnedDockItems.length > 0) {
        const sep1 = document.createElement('div');
        sep1.className = 'dock-separator';
        dockContainer.appendChild(sep1);
    }

    // Render User-Pinned Items
    pinnedDockItems.forEach(item => renderItem(item));

    // Dynamic Active Apps (Notes, Settings, etc.)
    const activeApps = [];

    // Active Sticky Notes app tab
    if (openNotesCount > 0) {
        activeApps.push({
            id: 'active_notes',
            title: `Sticky Notes (${openNotesCount} active)`,
            action: 'focus-notes',
            icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M14 3v5h5"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`
        });
    }

    // Active Settings Modal app tab
    if (isSettingsOpen) {
        activeApps.push({
            id: 'active_settings',
            title: 'Settings (Active)',
            action: 'focus-settings',
            icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
        });
    }

    if (activeApps.length > 0 && pinnedDockItems.length > 0) {
        const sep = document.createElement('div');
        sep.className = 'dock-separator';
        dockContainer.appendChild(sep);
    }

    activeApps.forEach(app => renderItem(app, true));
    isRenderingDock = false;
}

let isAutoHideListening = false;
let autoHideAnimationFrame = null;

function setupAutoHide() {
    if (isAutoHideListening) return;
    isAutoHideListening = true;

    document.addEventListener('mousemove', (e) => {
        if (!dockContainer || !userSettings.showDock || !userSettings.dockAutohide) return;
        if (autoHideAnimationFrame) return;

        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const target = e.target;

        autoHideAnimationFrame = requestAnimationFrame(() => {
            autoHideAnimationFrame = null;
            const pos = userSettings.dockPosition || 'bottom';
            const screenW = window.innerWidth;
            const screenH = window.innerHeight;

            let reveal = false;

            if (pos === 'bottom') {
                if (mouseY >= screenH - 40 || dockContainer.contains(target)) reveal = true;
            } else if (pos === 'top') {
                if (mouseY <= 90 || dockContainer.contains(target)) reveal = true;
            } else if (pos === 'left') {
                if (mouseX <= 40 || dockContainer.contains(target)) reveal = true;
            } else if (pos === 'right') {
                if (mouseX >= screenW - 40 || dockContainer.contains(target)) reveal = true;
            }

            if (reveal) {
                dockContainer.classList.remove('dock-hidden');
            } else {
                dockContainer.classList.add('dock-hidden');
            }
        });
    }, { passive: true });
}
