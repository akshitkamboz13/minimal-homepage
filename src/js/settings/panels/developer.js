import { userSettings } from '../settings-state.js';

export function initDeveloper(modal) {
    const btnExport = document.getElementById('btn-export-settings');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(userSettings, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "startpage_settings.json");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        });
    }

    const btnImportTrigger = document.getElementById('btn-import-settings');
    const inputImportFile = document.getElementById('file-import-settings');
    if (btnImportTrigger && inputImportFile) {
        btnImportTrigger.addEventListener('click', () => {
            inputImportFile.click();
        });
        inputImportFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    if (typeof parsed === 'object') {
                        localStorage.setItem('startpage_settings', JSON.stringify(parsed));
                        alert('Settings imported successfully! Reloading...');
                        window.location.reload();
                    } else {
                        alert('Invalid configurations structure.');
                    }
                } catch (err) {
                    alert('Error reading configuration file.');
                }
            };
            reader.readAsText(file);
        });
    }

    const btnReset = document.getElementById('btn-reset-settings');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (confirm('Reset settings to factory defaults? All layout and feature preferences will be lost.')) {
                localStorage.removeItem('startpage_settings');
                alert('Settings reset! Reloading...');
                window.location.reload();
            }
        });
    }
}
