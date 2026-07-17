import { userSettings, saveSettings } from '../settings-state.js';

export function applyWindowsVisuals() {
    const container = document.querySelector('.container');
    if (container) {
        container.style.zoom = `${userSettings.windowScale}%`;
    }
}

export function initWindows(modal) {
    const sliderWindowScale = document.getElementById('setting-window-scale');
    const labelWindowScale = document.getElementById('scale-val');
    if (sliderWindowScale) {
        sliderWindowScale.value = userSettings.windowScale;
        if (labelWindowScale) labelWindowScale.textContent = `${userSettings.windowScale}%`;
        sliderWindowScale.addEventListener('input', (e) => {
            userSettings.windowScale = parseInt(e.target.value);
            if (labelWindowScale) labelWindowScale.textContent = `${userSettings.windowScale}%`;
            saveSettings();
            applyWindowsVisuals();
        });
    }

    const toggleSidebarHover = document.getElementById('toggle-sidebar-hover');
    if (toggleSidebarHover) {
        toggleSidebarHover.checked = userSettings.sidebarHover;
        toggleSidebarHover.addEventListener('change', (e) => {
            userSettings.sidebarHover = e.target.checked;
            saveSettings();
        });
    }
}
