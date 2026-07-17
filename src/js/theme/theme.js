import { userSettings, saveSettings, onSettingsChanged } from '../settings/index.js';

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
    };

    // Apply initial theme from settings
    applyTheme(userSettings.theme);

    // Watch for settings changes (e.g. from settings panel dropdown)
    onSettingsChanged((settings) => {
        applyTheme(settings.theme);
        
        // Update setting dropdown element if visible in modal
        const selectTheme = document.getElementById('setting-theme');
        if (selectTheme) selectTheme.value = settings.theme;
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
