(function() {
    try {
        var isCli = localStorage.getItem('startpage_cli_mode') === 'true';
        if (isCli) {
            document.documentElement.classList.add('cli-mode');
        }
        var theme = 'dark';
        var fontPack = 'default';
        var clockFont = 'inherit';
        var rawSettings = localStorage.getItem('startpage_settings');
        if (rawSettings) {
            var parsed = JSON.parse(rawSettings);
            if (parsed && parsed.theme) {
                theme = parsed.theme;
            }
            if (parsed && parsed.fontPack) {
                fontPack = parsed.fontPack;
            }
            if (parsed && parsed.clockFont) {
                clockFont = parsed.clockFont;
            }
        }
        if (!theme || theme === 'system') {
            theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-font-pack', fontPack);
        document.documentElement.setAttribute('data-clock-font', clockFont);
        document.documentElement.classList.remove('theme-dark', 'theme-light');
        document.documentElement.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
    } catch (e) {}
})();
