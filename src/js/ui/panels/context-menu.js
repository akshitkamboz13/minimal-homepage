import { enableRearrangeMode, resetLayoutPositions } from './layout-manager.js';
import { userSettings, saveSettings, openDockSettings } from '../../settings/index.js';
import { applyDockVisuals } from './dock.js';
import { applyPanelsVisuals, openAddSiteModal, showToastNotification, refreshCustomShortcutsList } from '../../settings/panels/panels.js';

export function initContextMenu() {
    let menuEl = null;
    let lastTargetLink = null;

    const createMenu = () => {
        if (menuEl) return menuEl;

        menuEl = document.createElement('div');
        menuEl.id = 'custom-context-menu';
        menuEl.className = 'custom-context-menu glass-panel hidden';
        menuEl.innerHTML = `
            <ul class="context-menu-list">
                <!-- Browser Navigation -->
                <li class="context-menu-item" id="ctx-back">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    <span>Back</span>
                    <span class="context-shortcut"><kbd>Alt + ←</kbd></span>
                </li>
                <li class="context-menu-item" id="ctx-forward">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    <span>Forward</span>
                    <span class="context-shortcut"><kbd>Alt + →</kbd></span>
                </li>
                <li class="context-menu-item" id="ctx-reload">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    <span>Reload</span>
                    <span class="context-shortcut"><kbd>Ctrl + R</kbd></span>
                </li>

                <li class="context-menu-divider"></li>

                <!-- Add Site to Home -->
                <li class="context-menu-item has-submenu" id="ctx-add-site-to-home">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>Add Site to Home</span>
                    <svg class="submenu-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    <ul class="context-submenu">
                        <li class="context-menu-item" id="ctx-add-site-dock">
                            <span>To Application Dock</span>
                        </li>
                        <li class="context-menu-item" id="ctx-add-site-vertical">
                            <span>To Vertical Panel</span>
                        </li>
                        <li class="context-menu-item" id="ctx-add-site-horizontal">
                            <span>To Horizontal Panel</span>
                        </li>
                        <li class="context-menu-item" id="ctx-add-site-grid">
                            <span>To Applications Grid</span>
                        </li>
                    </ul>
                </li>

                <li class="context-menu-divider"></li>

                <!-- Startpage & Home Controls -->
                <li class="context-menu-item highlight-item" id="ctx-open-settings">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    <span>Home Settings</span>
                    <span class="context-shortcut"><kbd>Alt + S</kbd></span>
                </li>
                <li class="context-menu-item" id="ctx-unlock-layout">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55A2 2 0 0 0 6.512 23h10.976a2 2 0 0 0 1.792-2.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"></path><line x1="8.5" y1="2" x2="15.5" y2="2"></line><line x1="8.5" y1="14" x2="15.5" y2="14"></line></svg>
                    <span>Rearrange Layout (Labs)</span>
                </li>
                <li class="context-menu-item" id="ctx-add-note">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>Add Sticky Note</span>
                </li>
                <li class="context-menu-item" id="ctx-toggle-theme">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                    <span>Toggle Dark / Light Mode</span>
                </li>

                <li class="context-menu-divider"></li>

                <!-- Page Inspection & Reset -->
                <li class="context-menu-item" id="ctx-inspect">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <span>Inspect</span>
                    <span class="context-shortcut"><kbd>F12</kbd></span>
                </li>
                <li class="context-menu-item secondary" id="ctx-reset-layout">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                    <span>Reset Default Layout</span>
                </li>
            </ul>
        `;
        document.body.appendChild(menuEl);

        // ── Add Site to Home Handlers ──
        const addSiteToHome = (panel) => {
            hideMenu();
            let url = lastTargetLink ? lastTargetLink.url : '';
            let title = lastTargetLink ? lastTargetLink.title : '';

            if (!url) {
                url = window.location.href;
                title = document.title || 'Shortcut';
            }

            openAddSiteModal({ title: title, url: url, panel: panel });
        };

        menuEl.querySelector('#ctx-add-site-dock').addEventListener('click', () => addSiteToHome('dock'));
        menuEl.querySelector('#ctx-add-site-vertical').addEventListener('click', () => addSiteToHome('vertical'));
        menuEl.querySelector('#ctx-add-site-horizontal').addEventListener('click', () => addSiteToHome('horizontal'));
        menuEl.querySelector('#ctx-add-site-grid').addEventListener('click', () => addSiteToHome('grid'));
        document.body.appendChild(menuEl);

        // ── Navigation Handlers ──
        menuEl.querySelector('#ctx-back').addEventListener('click', () => {
            hideMenu();
            window.history.back();
        });

        menuEl.querySelector('#ctx-forward').addEventListener('click', () => {
            hideMenu();
            window.history.forward();
        });

        menuEl.querySelector('#ctx-reload').addEventListener('click', () => {
            hideMenu();
            window.location.reload();
        });

        // ── Startpage Handlers ──
        menuEl.querySelector('#ctx-open-settings').addEventListener('click', () => {
            hideMenu();
            const modal = document.getElementById('settings-modal');
            if (modal) modal.classList.remove('hidden');
        });

        menuEl.querySelector('#ctx-unlock-layout').addEventListener('click', () => {
            hideMenu();
            enableRearrangeMode(true);
        });

        menuEl.querySelector('#ctx-add-note').addEventListener('click', () => {
            hideMenu();
            const addBtn = document.getElementById('add-note-btn');
            if (addBtn) addBtn.click();
        });

        menuEl.querySelector('#ctx-toggle-theme').addEventListener('click', () => {
            hideMenu();
            const themeBtn = document.getElementById('theme-toggle');
            if (themeBtn) themeBtn.click();
        });

        // ── Inspection & Utility Handlers ──
        menuEl.querySelector('#ctx-inspect').addEventListener('click', () => {
            hideMenu();
            showInspectToast();
        });

        menuEl.querySelector('#ctx-reset-layout').addEventListener('click', () => {
            hideMenu();
            resetLayoutPositions();
        });

        return menuEl;
    };

    const showInspectToast = () => {
        let tip = document.getElementById('inspect-toast-tip');
        if (tip) tip.remove();

        tip = document.createElement('div');
        tip.id = 'inspect-toast-tip';
        tip.style.cssText = `
            position: fixed;
            top: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 100000;
            background: rgba(15, 23, 42, 0.9);
            color: #ffffff;
            border: 1px solid rgba(59, 130, 246, 0.5);
            padding: 10px 20px;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 500;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        tip.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <span>Press <kbd style="background:rgba(255,255,255,0.15); padding:2px 6px; border-radius:4px; font-family:monospace;">F12</kbd> or <kbd style="background:rgba(255,255,255,0.15); padding:2px 6px; border-radius:4px; font-family:monospace;">Ctrl+Shift+I</kbd> to open Developer Tools.</span>
        `;
        document.body.appendChild(tip);

        setTimeout(() => {
            if (tip) {
                tip.style.opacity = '0';
                tip.style.transition = 'opacity 0.3s ease';
                setTimeout(() => tip.remove(), 300);
            }
        }, 4000);
    };

    const hideMenu = () => {
        if (menuEl) {
            menuEl.classList.add('hidden');
        }
        if (dockMenuEl) {
            dockMenuEl.classList.add('hidden');
        }
        if (appsGridMenuEl) {
            appsGridMenuEl.classList.add('hidden');
        }
    };

    const positionMenuElement = (menu, clientX, clientY) => {
        menu.classList.remove('hidden');
        menu.style.visibility = 'hidden';
        menu.style.left = '0px';
        menu.style.top = '0px';

        const rect = menu.getBoundingClientRect();
        const menuWidth = rect.width || 220;
        const menuHeight = rect.height || 180;

        let posX = clientX;
        let posY = clientY;

        if (posX + menuWidth > window.innerWidth) {
            posX = window.innerWidth - menuWidth - 12;
        }
        if (posY + menuHeight > window.innerHeight) {
            posY = window.innerHeight - menuHeight - 12;
        }

        if (posX < 12) posX = 12;
        if (posY < 12) posY = 12;

        menu.style.left = `${posX}px`;
        menu.style.top = `${posY}px`;
        menu.style.visibility = 'visible';
    };

    const showToastNotification = (msg) => {
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
    };

    // ── Dedicated Dock Context Menu ──
    let dockMenuEl = null;
    let appsGridMenuEl = null;

    const createAppsGridMenu = () => {
        if (appsGridMenuEl) return appsGridMenuEl;
        appsGridMenuEl = document.createElement('div');
        appsGridMenuEl.id = 'apps-grid-context-menu';
        appsGridMenuEl.className = 'custom-context-menu glass-panel hidden';
        appsGridMenuEl.style.zIndex = '99999';
        document.body.appendChild(appsGridMenuEl);
        return appsGridMenuEl;
    };

    const showAppsGridContextMenu = (e, appTileEl) => {
        const menu = createAppsGridMenu();
        const appId = appTileEl.dataset.id;
        const appName = appTileEl.dataset.name;
        const appUrl = appTileEl.dataset.url;
        const appCategory = appTileEl.dataset.category;

        let isPinned = false;
        if (appCategory === 'pinned') {
            isPinned = true;
        } else {
            const items = userSettings.customPanelItems || [];
            isPinned = items.some(item => (item.id === appId || item.id === 'item_custom_' + appId.replace('custom_widget_', '')) && item.panel === 'dock');
        }

        const isCustomWidget = appCategory === 'custom' || (appId && appId.startsWith('custom_widget_'));
        const isUserShortcut = appCategory === 'grid' || appCategory === 'pinned';
        const showRemove = isCustomWidget || isUserShortcut;
        const removeLabel = isCustomWidget ? 'Remove Widget' : 'Remove App';

        let menuHTML = '';
        if (isPinned) {
            menuHTML = `
                <ul class="context-menu-list">
                    <li class="context-menu-item" id="apps-ctx-unpin">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        <span>Unpin from Dock</span>
                    </li>
            `;
        } else {
            menuHTML = `
                <ul class="context-menu-list">
                    <li class="context-menu-item" id="apps-ctx-pin">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>Pin to Dock</span>
                    </li>
            `;
        }

        if (showRemove) {
            menuHTML += `
                    <li class="context-menu-item" id="apps-ctx-remove" style="color: #f87171;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        <span>${removeLabel}</span>
                    </li>
            `;
        }

        menuHTML += `
                </ul>
            `;

        menu.innerHTML = menuHTML;
        positionMenuElement(menu, e.clientX, e.clientY);

        const bindClick = (id, handler) => {
            const btn = menu.querySelector('#' + id);
            if (btn) btn.addEventListener('click', () => {
                menu.classList.add('hidden');
                handler();
            });
        };

        bindClick('apps-ctx-pin', () => {
            if (appCategory === 'grid') {
                const items = userSettings.customPanelItems || [];
                const found = items.find(item => item.id === appId);
                if (found) {
                    found.panel = 'dock';
                }
            } else if (appCategory === 'system') {
                if (!userSettings.customPanelItems) userSettings.customPanelItems = [];
                if (appId === 'app_sticky_notes') {
                    userSettings.customPanelItems.push({
                        id: 'item_sticky_notes',
                        title: 'Sticky Notes',
                        panel: 'dock',
                        action: 'focus-notes',
                        icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M14 3v5h5"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`
                    });
                } else if (appId === 'app_puff_shell') {
                    userSettings.customPanelItems.push({
                        id: 'item_puff_shell',
                        title: 'Puff Shell',
                        panel: 'dock',
                        url: 'action:puff',
                        icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#22c55e" stroke-width="2.2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`
                    });
                } else if (appId === 'app_system_settings') {
                    userSettings.customPanelItems.push({
                        id: 'item_system_settings',
                        title: 'Settings',
                        panel: 'dock',
                        action: 'focus-settings',
                        icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
                    });
                }
            } else if (appCategory === 'custom') {
                try {
                    const list = JSON.parse(localStorage.getItem('startpage_custom_widgets') || '[]');
                    const wId = appId.replace('custom_widget_', '');
                    const widget = list.find(w => w.id === wId);
                    if (widget) {
                        if (!userSettings.customPanelItems) userSettings.customPanelItems = [];
                        userSettings.customPanelItems.push({
                            id: 'item_custom_' + widget.id,
                            title: widget.name,
                            panel: 'dock',
                            icon: widget.icon,
                            url: 'action:custom-widget:' + widget.id
                        });
                    }
                } catch(e) {}
            }

            saveSettings();
            applyDockVisuals();
            window.dispatchEvent(new CustomEvent('dock-state-changed'));
            showToastNotification(`Pinned "${appName}" to Application Dock`);
        });

        bindClick('apps-ctx-unpin', () => {
            if (appCategory === 'pinned') {
                const items = userSettings.customPanelItems || [];
                const found = items.find(item => item.id === appId);
                if (found) {
                    found.panel = 'grid';
                }
            } else {
                userSettings.customPanelItems = (userSettings.customPanelItems || []).filter(item => {
                    return item.id !== appId && item.id !== 'item_custom_' + appId.replace('custom_widget_', '') && item.id !== 'item_sticky_notes' && item.id !== 'item_puff_shell' && item.id !== 'item_system_settings';
                });
            }

            saveSettings();
            applyDockVisuals();
            window.dispatchEvent(new CustomEvent('dock-state-changed'));
            showToastNotification(`Unpinned "${appName}" from Application Dock`);
        });

        if (showRemove) {
            bindClick('apps-ctx-remove', () => {
                if (isCustomWidget) {
                    const wId = appId.replace('custom_widget_', '');
                    try {
                        let list = JSON.parse(localStorage.getItem('startpage_custom_widgets') || '[]');
                        list = list.filter(w => w.id !== wId);
                        localStorage.setItem('startpage_custom_widgets', JSON.stringify(list));
                        
                        userSettings.customPanelItems = (userSettings.customPanelItems || []).filter(item => {
                            return item.id !== 'item_custom_' + wId;
                        });
                        saveSettings();
                        
                        window.dispatchEvent(new CustomEvent('widgets-reloaded'));
                        window.dispatchEvent(new CustomEvent('dock-state-changed'));
                        showToastNotification(`Removed custom widget "${appName}"`);
                    } catch (err) {}
                } else if (isUserShortcut) {
                    userSettings.customPanelItems = (userSettings.customPanelItems || []).filter(i => i.id !== appId);
                    saveSettings();
                    
                    applyDockVisuals();
                    window.dispatchEvent(new CustomEvent('dock-state-changed'));
                    showToastNotification(`Removed shortcut "${appName}"`);
                }
            });
        }
    };

    const createDockMenu = () => {
        if (dockMenuEl) return dockMenuEl;
        dockMenuEl = document.createElement('div');
        dockMenuEl.id = 'dock-context-menu';
        dockMenuEl.className = 'custom-context-menu glass-panel hidden';
        dockMenuEl.style.zIndex = '99999';
        document.body.appendChild(dockMenuEl);
        return dockMenuEl;
    };

    const showDockContextMenu = (e, dockItemEl) => {
        const menu = createDockMenu();
        const itemId = dockItemEl ? dockItemEl.dataset.id : null;
        let menuHTML = '';

        if (itemId === 'show_applications_grid') {
            menuHTML = `
                <ul class="context-menu-list">
                    <li class="context-menu-item" id="dock-ctx-open-apps">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
                        <span>Show Applications</span>
                    </li>
                    <li class="context-menu-divider"></li>
                    <li class="context-menu-item" id="dock-ctx-settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        <span>Dock Settings</span>
                    </li>
                </ul>
            `;
        } else if (itemId === 'active_notes') {
            menuHTML = `
                <ul class="context-menu-list">
                    <li class="context-menu-item" id="dock-ctx-focus-notes">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M14 3v5h5"/></svg>
                        <span>Focus Sticky Notes</span>
                    </li>
                    <li class="context-menu-item" id="dock-ctx-min-notes">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>Toggle Minimize</span>
                    </li>
                    <li class="context-menu-divider"></li>
                    <li class="context-menu-item" id="dock-ctx-settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        <span>Dock Settings</span>
                    </li>
                </ul>
            `;
        } else if (itemId === 'active_settings') {
            menuHTML = `
                <ul class="context-menu-list">
                    <li class="context-menu-item" id="dock-ctx-focus-settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        <span>Focus System Settings</span>
                    </li>
                    <li class="context-menu-item" id="dock-ctx-min-settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>Toggle Minimize</span>
                    </li>
                </ul>
            `;
        } else if (dockItemEl) {
            const isWidget = itemId && itemId.startsWith('item_custom_');
            const removeLabel = isWidget ? 'Remove Widget' : 'Remove App';
            menuHTML = `
                <ul class="context-menu-list">
                    <li class="context-menu-item" id="dock-ctx-open-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        <span>Launch App / Open</span>
                    </li>
                    <li class="context-menu-item" id="dock-ctx-unpin-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2" x2="22" y2="22"></line><path d="M12 17v5M9 9v1.76a2 2 0 0 1-.44 1.24L6 16h10M14 4v2M10 4h4"></path></svg>
                        <span>Unpin from Dock</span>
                    </li>
                    <li class="context-menu-item" id="dock-ctx-remove-item" style="color: #f87171;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        <span>${removeLabel}</span>
                    </li>
                    <li class="context-menu-divider"></li>
                    <li class="context-menu-item" id="dock-ctx-settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        <span>Dock Settings</span>
                    </li>
                </ul>
            `;
        } else {
            menuHTML = `
                <ul class="context-menu-list">
                    <li class="context-menu-item" id="dock-ctx-add-site">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>Add Shortcut to Dock</span>
                    </li>
                    <li class="context-menu-divider"></li>
                    <li class="context-menu-item" id="dock-ctx-settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        <span>Dock Settings</span>
                    </li>
                </ul>
            `;
        }

        menu.innerHTML = menuHTML;
        positionMenuElement(menu, e.clientX, e.clientY);

        // Wire events
        const bindClick = (id, handler) => {
            const btn = menu.querySelector('#' + id);
            if (btn) btn.addEventListener('click', () => {
                menu.classList.add('hidden');
                handler();
            });
        };

        bindClick('dock-ctx-open-apps', () => {
            if (dockItemEl) dockItemEl.click();
        });
        bindClick('dock-ctx-focus-notes', () => {
            if (dockItemEl) dockItemEl.click();
        });
        bindClick('dock-ctx-min-notes', () => {
            if (dockItemEl) dockItemEl.click();
        });
        bindClick('dock-ctx-focus-settings', () => {
            if (dockItemEl) dockItemEl.click();
        });
        bindClick('dock-ctx-min-settings', () => {
            if (dockItemEl) dockItemEl.click();
        });
        bindClick('dock-ctx-open-item', () => {
            if (dockItemEl) dockItemEl.click();
        });
        bindClick('dock-ctx-unpin-item', () => {
            if (itemId) {
                const items = userSettings.customPanelItems || [];
                const found = items.find(i => i.id === itemId);
                if (found) {
                    found.panel = 'grid'; // Move to Apps Grid instead of deleting
                }
                saveSettings();
                applyDockVisuals();
                applyPanelsVisuals();
                refreshCustomShortcutsList();
                window.dispatchEvent(new CustomEvent('dock-state-changed'));
                showToastNotification('Unpinned item from Application Dock (moved to Apps Grid)');
            }
        });
        bindClick('dock-ctx-remove-item', () => {
            if (itemId) {
                userSettings.customPanelItems = (userSettings.customPanelItems || []).filter(i => i.id !== itemId);
                saveSettings();
                applyDockVisuals();
                applyPanelsVisuals();
                refreshCustomShortcutsList();
                window.dispatchEvent(new CustomEvent('dock-state-changed'));
                showToastNotification(isWidget ? 'Removed custom widget' : 'Removed custom application shortcut');
            }
        });
        bindClick('dock-ctx-add-site', () => {
            openAddSiteModal({ panel: 'dock' });
        });
        bindClick('dock-ctx-settings', () => {
            openDockSettings();
        });
    };

    // Right-click listener on document
    document.addEventListener('contextmenu', (e) => {
        const isDock = e.target.closest('.dock-item, #glass-dock');
        const isAppsGrid = e.target.closest('.app-tile');
        const isAppsGridOverlay = e.target.closest('#apps-grid-overlay');

        // Prevent default context menus inside the applications grid overlay entirely,
        // unless they are right-clicking specifically on an app tile
        if (isAppsGridOverlay && !isAppsGrid) {
            e.preventDefault();
            return;
        }

        // Do not intercept native right-clicks on interactive controls, inputs, links, buttons, top header, windows, or modals
        // unless they are dock items or applications grid tiles
        if (!isDock && !isAppsGrid) {
            if (e.target.closest('input, textarea, button, a, [contenteditable="true"], .glass-window-wrapper, #main-header, .top-panel, .header-actions, .settings-modal, .modal-content, .search-container, .clock-container, .fab-container, .bookmark-card, .bookmark-item, .app-item') || window.getSelection().toString().length > 0) {
                return;
            }
        }

        // Check if user right-clicked on Dock or Dock Applications
        const dockItemEl = e.target.closest('.dock-item');
        const glassDockEl = e.target.closest('#glass-dock');

        if (dockItemEl || glassDockEl) {
            e.preventDefault();
            e.stopPropagation();
            hideMenu();
            showDockContextMenu(e, dockItemEl);
            return;
        }

        if (dockMenuEl) dockMenuEl.classList.add('hidden');

        // Check if user right-clicked on Applications Grid items
        if (isAppsGrid && !isAppsGrid.classList.contains('app-tile-add')) {
            e.preventDefault();
            e.stopPropagation();
            hideMenu();
            showAppsGridContextMenu(e, isAppsGrid);
            return;
        }

        const targetEl = e.target.closest('a[href], [data-url], .bookmark-item, .bookmark-card, .app-item');
        if (targetEl) {
            const rawUrl = targetEl.href || targetEl.dataset.url || targetEl.getAttribute('href') || '';
            const rawTitle = targetEl.textContent.trim() || targetEl.getAttribute('title') || targetEl.getAttribute('aria-label') || '';
            lastTargetLink = { url: rawUrl, title: rawTitle };
        } else {
            lastTargetLink = null;
        }

        e.preventDefault();
        const menu = createMenu();
        positionMenuElement(menu, e.clientX, e.clientY);
    });

    // Dismiss context menu on click or escape
    document.addEventListener('click', (e) => {
        const clickInMenu = (menuEl && menuEl.contains(e.target)) ||
                            (dockMenuEl && dockMenuEl.contains(e.target)) ||
                            (appsGridMenuEl && appsGridMenuEl.contains(e.target));
        if (!clickInMenu) {
            hideMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideMenu();
        }
    });

    // Extension runtime message listener for external context menu additions
    if (window.chrome && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg.type === 'open-add-site-modal') {
                openAddSiteModal({ title: msg.title, url: msg.url, panel: msg.panel });
            } else if (msg.type === 'shortcut-added' && msg.item) {
                if (!userSettings.customPanelItems) userSettings.customPanelItems = [];
                if (!userSettings.customPanelItems.some(i => i.id === msg.item.id)) {
                    userSettings.customPanelItems.push(msg.item);
                    saveSettings();
                }
                applyDockVisuals();
                applyPanelsVisuals();
                refreshCustomShortcutsList();
                const panelName = msg.item.panel === 'vertical' ? 'Vertical Panel' : msg.item.panel === 'horizontal' ? 'Horizontal Panel' : msg.item.panel === 'grid' ? 'Applications Grid' : 'Application Dock';
                showToastNotification(`Added "${msg.item.title}" to ${panelName}`);
            }
        });
    }
}
