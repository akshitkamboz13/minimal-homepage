import { userSettings, saveSettings } from '../settings-state.js';
import { applyLayoutSettings } from '../../ui/panels/top-panel.js';

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

    const selectVisualProvider = document.getElementById('setting-visual-provider');
    if (selectVisualProvider) {
        selectVisualProvider.value = userSettings.visualProvider;
        selectVisualProvider.addEventListener('change', (e) => {
            userSettings.visualProvider = e.target.value;
            saveSettings();
        });
    }
}
