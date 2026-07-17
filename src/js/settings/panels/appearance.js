import { userSettings, saveSettings } from '../settings-state.js';
import { applyLayoutSettings } from '../../ui/panels/top-panel.js';

export function applyAppearanceVisuals() {
    document.body.setAttribute('data-accent', userSettings.accentColor);
}

export function initAppearance(modal) {
    const selectTheme = document.getElementById('setting-theme');
    if (selectTheme) {
        selectTheme.value = userSettings.theme;
        selectTheme.addEventListener('change', (e) => {
            userSettings.theme = e.target.value;
            saveSettings();
        });
    }

    const toggleWidth = document.getElementById('toggle-container-width');
    if (toggleWidth) {
        toggleWidth.checked = userSettings.containerWidth === 'full';
        toggleWidth.addEventListener('change', (e) => {
            userSettings.containerWidth = e.target.checked ? 'full' : 'contained';
            saveSettings();
            applyLayoutSettings();
        });
    }

    const toggleTileWidth = document.getElementById('toggle-tile-width');
    if (toggleTileWidth) {
        toggleTileWidth.checked = userSettings.tileWidth === 'auto';
        toggleTileWidth.addEventListener('change', (e) => {
            userSettings.tileWidth = e.target.checked ? 'auto' : 'fixed';
            saveSettings();
            applyLayoutSettings();
        });
    }

    const colorDots = modal.querySelectorAll('.color-dot');
    colorDots.forEach(dot => {
        const color = dot.getAttribute('data-color');
        if (color === userSettings.accentColor) {
            dot.classList.add('active');
        }
        dot.addEventListener('click', () => {
            colorDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            userSettings.accentColor = color;
            saveSettings();
            applyAppearanceVisuals();
        });
    });
}
