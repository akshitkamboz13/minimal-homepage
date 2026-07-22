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
}

export function initTopPanel() {
    const settingsBtn = document.getElementById('settings-toggle');
    const closeSettingsBtn = document.getElementById('close-settings');
    const settingsModal = document.getElementById('settings-modal');

    // Apply initial layout settings
    applyLayoutSettings();

    // Settings Modal Togglers
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (settingsModal) settingsModal.classList.remove('hidden');
        });
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            if (settingsModal) settingsModal.classList.add('hidden');
        });
    }
    if (settingsModal) {
        let isMouseDownOnOverlay = false;

        settingsModal.addEventListener('mousedown', (e) => {
            isMouseDownOnOverlay = (e.target === settingsModal);
        });

        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal && isMouseDownOnOverlay) {
                settingsModal.classList.add('hidden');
            }
            isMouseDownOnOverlay = false;
        });
    }
}
