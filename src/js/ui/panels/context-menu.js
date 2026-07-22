import { enableRearrangeMode, resetLayoutPositions } from './layout-manager.js';

export function initContextMenu() {
    let menuEl = null;

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
    };

    // Right-click listener on document
    document.addEventListener('contextmenu', (e) => {
        // Do not intercept if user right-clicks inside editable text input/textarea or selection
        if (e.target.closest('input, textarea') || window.getSelection().toString().length > 0) {
            return;
        }

        e.preventDefault();
        const menu = createMenu();

        // Position menu at pointer coordinates (clamp to screen)
        menu.classList.remove('hidden');
        const menuWidth = 260;
        const menuHeight = 320;

        let posX = e.clientX;
        let posY = e.clientY;

        if (posX + menuWidth > window.innerWidth) {
            posX = window.innerWidth - menuWidth - 12;
        }
        if (posY + menuHeight > window.innerHeight) {
            posY = window.innerHeight - menuHeight - 12;
        }

        menu.style.left = `${posX}px`;
        menu.style.top  = `${posY}px`;
    });

    // Dismiss context menu on click or escape
    document.addEventListener('click', (e) => {
        if (menuEl && !menuEl.contains(e.target)) {
            hideMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideMenu();
        }
    });
}
