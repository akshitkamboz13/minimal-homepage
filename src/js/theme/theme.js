import { userSettings, saveSettings, onSettingsChanged } from '../settings/index.js';
import { applyBackgroundVisuals } from '../settings/panels/appearance.js';

export function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    const applyTheme = (themeVal) => {
        let resolvedTheme = themeVal;
        if (themeVal === 'system') {
            resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        if (resolvedTheme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            if (sunIcon) sunIcon.style.display = 'block';
            if (moonIcon) moonIcon.style.display = 'none';
        } else {
            document.body.removeAttribute('data-theme');
            if (sunIcon) sunIcon.style.display = 'none';
            if (moonIcon) moonIcon.style.display = 'block';
        }
        localStorage.setItem('theme', resolvedTheme);
        
        // Refresh background visuals (especially if in custom mesh mode)
        applyBackgroundVisuals();
    };

    // Apply initial theme from settings
    applyTheme(userSettings.theme);

    // Watch for settings changes (e.g. from settings panel dropdown or toggle button)
    onSettingsChanged((settings) => {
        applyTheme(settings.theme);
        
        // Update custom theme dropdown UI if visible
        const dropdownThemeEl = document.getElementById('dropdown-theme');
        if (dropdownThemeEl) {
            const items = dropdownThemeEl.querySelectorAll('.dropdown-item');
            const label = dropdownThemeEl.querySelector('.dropdown-selected-label');
            items.forEach(item => {
                if (item.getAttribute('data-value') === settings.theme) {
                    item.classList.add('active');
                    if (label) label.textContent = item.textContent;
                } else {
                    item.classList.remove('active');
                }
            });
        }
    });

    // Toggle button handler updates settings
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            userSettings.theme = nextTheme;
            saveSettings();
        });
    }

    // System theme preference watcher
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (userSettings.theme === 'system') {
            applyTheme('system');
        }
    });
}
