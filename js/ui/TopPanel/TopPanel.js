import { userSettings, saveSettings } from '../../state/Settings.js';

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
    
    const toggleAllBookmarks = document.getElementById('toggle-all-bookmarks');
    const toggleContainerWidth = document.getElementById('toggle-container-width');
    const toggleTileWidth = document.getElementById('toggle-tile-width');
    const toggleRememberSearch = document.getElementById('toggle-remember-search');
    const toggleVisualSearch = document.getElementById('toggle-visual-search');
    const toggleGoogleApps = document.getElementById('toggle-google-apps');

    // Apply initial layout settings
    applyLayoutSettings();

    // Settings Modal Togglers
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });
    }
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.add('hidden');
            }
        });
    }

    // Master Toggle Event
    if (toggleAllBookmarks) {
        toggleAllBookmarks.checked = userSettings.showBookmarks;
        toggleAllBookmarks.addEventListener('change', (e) => {
            userSettings.showBookmarks = e.target.checked;
            saveSettings();
        });
    }

    // Container Width Toggle Event
    if (toggleContainerWidth) {
        toggleContainerWidth.checked = userSettings.containerWidth === 'full';
        toggleContainerWidth.addEventListener('change', (e) => {
            userSettings.containerWidth = e.target.checked ? 'full' : 'contained';
            saveSettings();
            applyLayoutSettings();
        });
    }

    // Tile Width Toggle Event
    if (toggleTileWidth) {
        toggleTileWidth.checked = userSettings.tileWidth === 'auto';
        toggleTileWidth.addEventListener('change', (e) => {
            userSettings.tileWidth = e.target.checked ? 'auto' : 'fixed';
            saveSettings();
            applyLayoutSettings();
        });
    }

    // Remember Search Mode Toggle Event
    if (toggleRememberSearch) {
        toggleRememberSearch.checked = userSettings.rememberSearchMode;
        toggleRememberSearch.addEventListener('change', (e) => {
            userSettings.rememberSearchMode = e.target.checked;
            if (!userSettings.rememberSearchMode) {
                userSettings.lastSearchMode = 'google'; 
                userSettings.selectedAi = null;
                userSettings.selectedAiName = null;
                
                const googleMode = document.getElementById('mode-google');
                if (googleMode) googleMode.checked = true;
                
                const aiLabel = document.querySelector('.ai-label');
                if (aiLabel) {
                    aiLabel.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> AI`;
                }
                window.dispatchEvent(new Event('resize'));
            } else {
                const checkedMode = document.querySelector('input[name="search-mode"]:checked');
                if (checkedMode) userSettings.lastSearchMode = checkedMode.value;
            }
            saveSettings();
        });
    }

    // FAB Display Toggles
    if (toggleVisualSearch) {
        toggleVisualSearch.checked = userSettings.showVisualSearch;
        toggleVisualSearch.addEventListener('change', (e) => {
            userSettings.showVisualSearch = e.target.checked;
            saveSettings();
            applyLayoutSettings();
        });
    }

    if (toggleGoogleApps) {
        toggleGoogleApps.checked = userSettings.showGoogleApps;
        toggleGoogleApps.addEventListener('change', (e) => {
            userSettings.showGoogleApps = e.target.checked;
            saveSettings();
            applyLayoutSettings();
        });
    }
}
