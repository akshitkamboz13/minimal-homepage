import { userSettings, saveSettings } from '../state/settings.js';

export function initPanels() {
    // --- Settings & Bookmarks State ---
    const settingsBtn = document.getElementById('settings-toggle');
    const closeSettingsBtn = document.getElementById('close-settings');
    const settingsModal = document.getElementById('settings-modal');
    const toggleAllBookmarks = document.getElementById('toggle-all-bookmarks');
    const toggleContainerWidth = document.getElementById('toggle-container-width');
    const toggleTileWidth = document.getElementById('toggle-tile-width');
    const toggleRememberSearch = document.getElementById('toggle-remember-search');
    
    // FAB Buttons Settings Toggles
    const toggleVisualSearch = document.getElementById('toggle-visual-search');
    const toggleGoogleApps = document.getElementById('toggle-google-apps');

    // Layout applicator
    const applyLayoutSettings = () => {
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
    };

    applyLayoutSettings();

    // Modal Togglers
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
                
                // Assuming updateSlider is globally available or we just trigger resize
                window.dispatchEvent(new Event('resize'));
            } else {
                const checkedMode = document.querySelector('input[name="search-mode"]:checked');
                if (checkedMode) userSettings.lastSearchMode = checkedMode.value;
            }
            saveSettings();
        });
    }

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

    // Panels Logic
    const imageSearchTrigger = document.getElementById('image-search-trigger');
    const visualSearchPanel = document.getElementById('visual-search-panel');
    const googleAppsTrigger = document.getElementById('google-apps-trigger');
    const googleAppsPanel = document.getElementById('google-apps-panel');

    if (imageSearchTrigger && visualSearchPanel) {
        imageSearchTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            visualSearchPanel.classList.toggle('active');
            imageSearchTrigger.classList.toggle('active');
            if (googleAppsPanel) googleAppsPanel.classList.remove('active');
            if (googleAppsTrigger) googleAppsTrigger.classList.remove('active');
        });
    }

    if (googleAppsTrigger && googleAppsPanel) {
        googleAppsTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            googleAppsPanel.classList.toggle('active');
            googleAppsTrigger.classList.toggle('active');
            if (visualSearchPanel) visualSearchPanel.classList.remove('active');
            if (imageSearchTrigger) imageSearchTrigger.classList.remove('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (visualSearchPanel && visualSearchPanel.classList.contains('active') && 
            !visualSearchPanel.contains(e.target) && 
            !(imageSearchTrigger && imageSearchTrigger.contains(e.target))) {
            visualSearchPanel.classList.remove('active');
            if (imageSearchTrigger) imageSearchTrigger.classList.remove('active');
        }
        if (googleAppsPanel && googleAppsPanel.classList.contains('active') && 
            !googleAppsPanel.contains(e.target) && 
            !(googleAppsTrigger && googleAppsTrigger.contains(e.target))) {
            googleAppsPanel.classList.remove('active');
            if (googleAppsTrigger) googleAppsTrigger.classList.remove('active');
        }
    });

    // Add title attributes to Google Apps items for tooltip on hover
    document.querySelectorAll('.google-apps-panel .app-item').forEach(item => {
        const span = item.querySelector('span');
        if (span && span.textContent) {
            item.title = span.textContent.trim();
        }
    });
}
