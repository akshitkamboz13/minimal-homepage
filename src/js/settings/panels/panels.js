import { userSettings, saveSettings } from '../settings-state.js';
import { initCustomDropdown } from '../custom-dropdown.js';

export function initPanelsSettings(modal) {
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

    applyPanelsVisuals();
}

export function applyPanelsVisuals() {
    const fabContainer = document.querySelector('.fab-container');
    const mainHeader = document.getElementById('main-header');
    const googleAppsTrigger = document.getElementById('google-apps-trigger');
    const imageSearchTrigger = document.getElementById('image-search-trigger');
    const addNoteBtn = document.getElementById('add-note-btn');
    const settingsToggle = document.getElementById('settings-toggle');
    const themeToggle = document.getElementById('theme-toggle');

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
