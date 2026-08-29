import { userSettings, saveSettings } from '../../settings/index.js';

export function applyLayoutSettings() {
    if (userSettings.containerWidth === 'contained') {
        document.body.setAttribute('data-container-width', 'contained');
    } else {
        document.body.removeAttribute('data-container-width');
    }

    if (userSettings.tileWidth === 'auto') {
        document.body.setAttribute('data-tile-width', 'auto');
    } else {
        document.body.removeAttribute('data-tile-width');
    }
    
    const fabContainer = document.querySelector('.fab-container');
    const visualSearchBtn = document.getElementById('image-search-trigger');
    const googleAppsBtn = document.querySelector('.google-apps-btn');
    
    if (visualSearchBtn) {
        visualSearchBtn.style.display = userSettings.showVisualSearch ? 'flex' : 'none';
    }
    
    if (googleAppsBtn) {
        googleAppsBtn.style.display = userSettings.showGoogleApps ? 'flex' : 'none';
    }

    if (fabContainer) {
        fabContainer.style.display = (userSettings.showVisualSearch || userSettings.showGoogleApps) ? 'flex' : 'none';
    }
    
    const visualSearchPanel = document.getElementById('visual-search-panel');
    if (!userSettings.showVisualSearch && visualSearchPanel) {
        visualSearchPanel.classList.remove('active');
    }

    const dashboardWidgetsContainer = document.getElementById('dashboard-widgets-container');
    if (dashboardWidgetsContainer) {
        dashboardWidgetsContainer.style.display = userSettings.showDashboardWidgets !== false ? '' : 'none';
    }
}

export function initTopPanel() {
    const settingsBtn = document.getElementById('settings-toggle');
    const closeSettingsBtn = document.getElementById('close-settings');
    const minimizeSettingsBtn = document.getElementById('minimize-settings');
    const settingsModal = document.getElementById('settings-modal');

    // Apply initial layout settings
    applyLayoutSettings();

    // Restore initial minimized state if saved
    try {
        const isMinimized = localStorage.getItem('startpage_settings_minimized') === 'true';
        if (isMinimized && settingsModal) {
            settingsModal.classList.remove('hidden');
            settingsModal.classList.add('is-minimized');
        }
    } catch(e) {}

    // Settings Modal Togglers
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (settingsModal) {
                settingsModal.classList.remove('hidden', 'is-minimized');
                localStorage.setItem('startpage_settings_minimized', 'false');
            }
        });
    }
    if (minimizeSettingsBtn && settingsModal) {
        minimizeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('is-minimized');
            localStorage.setItem('startpage_settings_minimized', 'true');
        });
    }

    const closeSettings = () => {
        if (settingsModal) {
            settingsModal.classList.add('hidden');
            settingsModal.classList.remove('is-minimized');
            localStorage.setItem('startpage_settings_minimized', 'false');
            localStorage.removeItem('startpage_settings_last_tab'); // Erase last tab state on explicit close
        }
    };

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettings);
    }
    if (settingsModal) {
        let isMouseDownOnOverlay = false;

        settingsModal.addEventListener('mousedown', (e) => {
            isMouseDownOnOverlay = (e.target === settingsModal);
        });

        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal && isMouseDownOnOverlay) {
                closeSettings();
            }
            isMouseDownOnOverlay = false;
        });
    }
}
