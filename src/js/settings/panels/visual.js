import { userSettings, saveSettings } from '../settings-state.js';
import { applyLayoutSettings } from '../../ui/panels/top-panel.js';
import { initCustomDropdown } from '../custom-dropdown.js';

export function initVisual(modal) {
    const toggleVisualSearch = document.getElementById('toggle-visual-search');
    if (toggleVisualSearch) {
        toggleVisualSearch.checked = userSettings.showVisualSearch;
        toggleVisualSearch.addEventListener('change', (e) => {
            userSettings.showVisualSearch = e.target.checked;
            saveSettings();
            applyLayoutSettings();
        });
    }

    const dropdownVisualProvider = initCustomDropdown('visual-provider', (val) => {
        userSettings.visualProvider = val;
        saveSettings();
    });
    if (dropdownVisualProvider) {
        dropdownVisualProvider.setValue(userSettings.visualProvider);
    }
}
