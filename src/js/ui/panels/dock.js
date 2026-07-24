import { userSettings, onSettingsChanged } from '../../settings/index.js';
import { toggleAppsGrid } from './apps-grid.js';
import { togglePuffShell } from '../../puff/puff.js';
import { appRegistry } from '../app-registry.js';

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

    // Subscribe to central AppRegistry for real-time active application updates
    appRegistry.subscribe(() => {
        if (!isRenderingDock) renderDock();
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

    window.addEventListener('dock-state-changed', () => {
        if (!isRenderingDock) renderDock();
    });

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
    let pinnedDockItems = allItems.filter(item => item.panel === 'dock');
    if (userSettings.showPuffShell === false) {
        pinnedDockItems = pinnedDockItems.filter(item => item.id !== 'item_puff_shell' && item.url !== 'action:puff');
    }

    const openNotesCount = document.querySelectorAll('.glass-note').length;
    const settingsModal = document.getElementById('settings-modal');
    const isSettingsOpen = settingsModal && !settingsModal.classList.contains('hidden');
    const registeredActiveApps = appRegistry.getActiveApps();

    // Signature fingerprint check: Do NOT clear innerHTML if dock contents have not changed
    const signature = JSON.stringify({
        pinned: pinnedDockItems.map(i => i.id + '_' + i.title + '_' + i.url),
        notes: openNotesCount,
        settings: isSettingsOpen,
        registry: registeredActiveApps.map(a => a.id + '_' + a.isMinimized)
    });

    if (dockContainer.dataset.renderedSignature === signature) {
        isRenderingDock = false;
        return;
    }
    dockContainer.dataset.renderedSignature = signature;
    // 1. Build targets list
    const targets = [];

    // GNOME Show Applications Grid
    targets.push({
        type: 'button',
        id: 'show_applications_grid',
        title: 'Show Applications',
        action: 'toggle-apps-grid',
        icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="6.5" height="6.5" rx="1.5"/><rect x="14.5" y="3" width="6.5" height="6.5" rx="1.5"/><rect x="3" y="14.5" width="6.5" height="6.5" rx="1.5"/><rect x="14.5" y="14.5" width="6.5" height="6.5" rx="1.5"/></svg>`
    });

    if (pinnedDockItems.length > 0) {
        targets.push({ type: 'separator', id: 'sep_pinned' });
    }

    pinnedDockItems.forEach(item => {
        targets.push({
            type: 'button',
            id: item.id,
            title: item.title,
            url: item.url,
            target: item.target,
            icon: item.icon
        });
    });

    const activeApps = [...registeredActiveApps];
    if (openNotesCount > 0 && !activeApps.some(a => a.id === 'sticky_notes')) {
        activeApps.push({
            id: 'active_notes',
            title: `Sticky Notes (${openNotesCount} active)`,
            action: 'focus-notes',
            icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M14 3v5h5"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`
        });
    }

    if (isSettingsOpen && !activeApps.some(a => a.id === 'settings_modal')) {
        activeApps.push({
            id: 'active_settings',
            title: 'Settings (Active)',
            action: 'focus-settings',
            icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
        });
    }

    if (activeApps.length > 0 && pinnedDockItems.length > 0) {
        targets.push({ type: 'separator', id: 'sep_active' });
    }

    activeApps.forEach(app => {
        targets.push({
            type: 'button',
            id: app.id,
            title: app.title || app.name,
            action: app.action,
            icon: app.icon,
            isActiveApp: true,
            isMinimized: app.isMinimized,
            focus: app.focus,
            toggleMinimize: app.toggleMinimize
        });
    });

    // 2. Perform DOM Reconciliation
    const currentChildren = Array.from(dockContainer.children);
    const existingById = new Map();
    currentChildren.forEach(child => {
        if (child.dataset.id) {
            existingById.set(child.dataset.id, child);
        }
    });

    targets.forEach((target, index) => {
        let el = existingById.get(target.id);

        if (el) {
            // Update existing element
            if (target.type === 'button') {
                el.setAttribute('aria-label', target.title);
                const tooltip = el.querySelector('.dock-tooltip');
                if (tooltip) tooltip.textContent = target.title;
                
                if (target.isActiveApp) {
                    el.classList.add('is-active-app');
                } else {
                    el.classList.remove('is-active-app');
                }
            }
            
            // Re-order if needed
            if (dockContainer.children[index] !== el) {
                dockContainer.insertBefore(el, dockContainer.children[index]);
            }
        } else {
            // Create new
            if (target.type === 'separator') {
                el = document.createElement('div');
                el.className = 'dock-separator';
                el.dataset.id = target.id;
            } else {
                el = document.createElement('button');
                el.className = 'dock-item dock-item-entering';
                if (target.isActiveApp) el.classList.add('is-active-app');
                el.setAttribute('aria-label', target.title);
                el.dataset.id = target.id;

                let iconMarkup = target.icon || '';
                if (!iconMarkup && target.url) {
                    const favUrl = getFaviconUrl(target.url);
                    iconMarkup = `<img src="${favUrl}" alt="${target.title}" onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>';" />`;
                } else if (iconMarkup && !iconMarkup.trim().startsWith('<')) {
                    iconMarkup = `<img src="${iconMarkup}" alt="${target.title}" />`;
                }

                el.innerHTML = `
                    <span class="dock-icon">${iconMarkup}</span>
                    <span class="dock-tooltip">${target.title}</span>
                `;

                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (target.toggleMinimize || target.focus) {
                        if (target.isMinimized) {
                            target.focus();
                        } else {
                            target.toggleMinimize();
                        }
                    } else if (target.url) {
                        if (target.url === 'action:puff') {
                            togglePuffShell();
                            return;
                        }
                        const targetFrame = target.target || '_blank';
                        if (targetFrame === '_self') {
                            window.location.href = target.url;
                        } else {
                            window.open(target.url, '_blank');
                        }
                    } else if (target.action === 'focus-notes') {
                        const notes = document.querySelectorAll('.glass-note');
                        const minimizedNotes = document.querySelectorAll('.glass-note.is-minimized');
                        
                        if (minimizedNotes.length > 0) {
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
                    } else if (target.action === 'focus-settings') {
                        const modal = document.getElementById('settings-modal');
                        if (modal) {
                            if (modal.classList.contains('is-minimized')) {
                                modal.classList.remove('is-minimized', 'hidden');
                                localStorage.setItem('startpage_settings_minimized', 'false');
                            } else if (!modal.classList.contains('hidden')) {
                                modal.classList.add('is-minimized');
                                localStorage.setItem('startpage_settings_minimized', 'true');
                            } else {
                                modal.classList.remove('hidden', 'is-minimized');
                                localStorage.setItem('startpage_settings_minimized', 'false');
                            }
                        }
                    } else if (target.action === 'focus-puff') {
                        togglePuffShell();
                    } else if (target.action === 'toggle-apps-grid') {
                        toggleAppsGrid();
                    }
                });

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        el.classList.remove('dock-item-entering');
                    });
                });
            }

            if (index >= dockContainer.children.length) {
                dockContainer.appendChild(el);
            } else {
                dockContainer.insertBefore(el, dockContainer.children[index]);
            }
        }
    });

    // Remove any children that are no longer in the targets list
    const targetIds = new Set(targets.map(t => t.id));
    currentChildren.forEach(child => {
        const id = child.dataset.id;
        if (id && !targetIds.has(id)) {
            if (child.classList.contains('dock-separator')) {
                child.remove();
            } else {
                child.classList.add('dock-item-exiting');
                const removeFn = () => {
                    child.remove();
                };
                child.addEventListener('transitionend', (e) => {
                    if (e.propertyName === 'width' || e.propertyName === 'opacity') {
                        removeFn();
                    }
                }, { once: true });
                setTimeout(removeFn, 350);
            }
        }
    });

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
