import { userSettings, saveSettings } from '../settings-state.js';

// Setting category key mapping covering all modern settings
const CATEGORY_MAP = {
    appearance: [
        'theme', 'accentColor', 'customAccentColor', 'backgroundType', 'customBackgroundUrl', 'solidBgColor',
        'customBgLight', 'customTextColorLight', 'customTextSecondaryLight',
        'customBgDark', 'customTextColorDark', 'customTextSecondaryDark',
        'customMeshBlob1Light', 'customMeshBlob2Light', 'customMeshBlob3Light',
        'customMeshBlob1Dark', 'customMeshBlob2Dark', 'customMeshBlob3Dark',
        'reduceMotion'
    ],
    layout: [
        'freeformLayout', 'layoutPositions', 'containerWidth', 'tileWidth', 'windowScale', 'sidebarHover'
    ],
    search: [
        'selectedAi', 'selectedAiName', 'showAiToggle', 'aiCustomPrompt', 'aiEngines',
        'lastSearchMode', 'rememberSearchMode', 'showVisualSearch', 'visualProvider',
        'voiceLang', 'voiceAutoSubmit', 'kbdAutofocus', 'kbdEscClear', 'historyCount',
        'suggestionsLimit', 'autocompleteSuggestions'
    ],
    bookmarks: [
        'showBookmarks', 'hiddenFolders', 'hiddenLinks', 'bookmarkTarget'
    ],
    notes: [
        'notesFont', 'notesAutosave', 'notesPlaceholder', 'defaultNoteWidth', 'defaultNoteHeight'
    ],
    general: [
        'appName', 'clockFormat', 'clockShowSeconds', 'clockShowDate', 'clockAlignment',
        'greetingMode', 'greetingMorning', 'greetingAfternoon', 'greetingEvening',
        'greetingNight', 'customGreetingText'
    ]
};

export function initDeveloper(modal) {
    const btnExport = document.getElementById('btn-export-settings');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            showExportDialog();
        });
    }

    const btnImportTrigger = document.getElementById('btn-import-settings');
    const inputImportFile = document.getElementById('file-import-settings');
    if (btnImportTrigger && inputImportFile) {
        btnImportTrigger.addEventListener('click', () => {
            inputImportFile.value = '';
            inputImportFile.click();
        });
        inputImportFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    if (typeof parsed === 'object' && parsed !== null) {
                        showImportDialog(parsed);
                    } else {
                        alert('Invalid configuration file structure.');
                    }
                } catch (err) {
                    alert('Error parsing JSON configuration file.');
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
                localStorage.removeItem('startpage_notes');
                alert('Settings reset to factory defaults! Reloading...');
                window.location.reload();
            }
        });
    }
}

function showExportDialog() {
    let dialog = document.getElementById('config-export-modal');
    if (dialog) dialog.remove();

    dialog = document.createElement('div');
    dialog.id = 'config-export-modal';
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
        <div class="modal-content glass-panel" style="max-width: 480px; padding: 1.5rem; border-radius: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-color);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export Configurations
                </h3>
                <button type="button" class="icon-btn close-dialog" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); font-size: 1.1rem;">✕</button>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Select setting categories to export into your JSON configuration file:</p>

            <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem;">
                <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.88rem; cursor: pointer; color: var(--text-color);">
                    <input type="checkbox" id="exp-select-all" checked style="accent-color: var(--accent-color);"> <strong>Select All Categories</strong>
                </label>
                <hr style="border: none; border-top: 1px solid var(--glass-border); margin: 0.25rem 0;">
                <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: var(--text-color);">
                    <input type="checkbox" class="exp-cat-check" data-cat="appearance" checked style="accent-color: var(--accent-color);"> Appearance & Color Tokens
                </label>
                <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: var(--text-color);">
                    <input type="checkbox" class="exp-cat-check" data-cat="layout" checked style="accent-color: var(--accent-color);"> Screen Layout & Window Positions
                </label>
                <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: var(--text-color);">
                    <input type="checkbox" class="exp-cat-check" data-cat="search" checked style="accent-color: var(--accent-color);"> Search Engines & AI Options
                </label>
                <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: var(--text-color);">
                    <input type="checkbox" class="exp-cat-check" data-cat="bookmarks" checked style="accent-color: var(--accent-color);"> Bookmarks & Display Settings
                </label>
                <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: var(--text-color);">
                    <input type="checkbox" class="exp-cat-check" data-cat="notes" checked style="accent-color: var(--accent-color);"> Sticky Notes & Drafts
                </label>
                <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: var(--text-color);">
                    <input type="checkbox" class="exp-cat-check" data-cat="general" checked style="accent-color: var(--accent-color);"> General & App Identity
                </label>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                <button type="button" class="action-btn secondary cancel-dialog">Cancel</button>
                <button type="button" class="action-btn confirm-export">Export JSON</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);

    const closeBtn = dialog.querySelector('.close-dialog');
    const cancelBtn = dialog.querySelector('.cancel-dialog');
    const selectAll = dialog.querySelector('#exp-select-all');
    const checks = dialog.querySelectorAll('.exp-cat-check');
    const confirmBtn = dialog.querySelector('.confirm-export');

    const close = () => dialog.remove();
    closeBtn.addEventListener('click', close);
    cancelBtn.addEventListener('click', close);

    selectAll.addEventListener('change', (e) => {
        checks.forEach(c => c.checked = e.target.checked);
    });

    confirmBtn.addEventListener('click', () => {
        const exportData = {};
        checks.forEach(c => {
            if (c.checked) {
                const cat = c.dataset.cat;
                const keys = CATEGORY_MAP[cat] || [];
                keys.forEach(k => {
                    if (userSettings[k] !== undefined) {
                        exportData[k] = userSettings[k];
                    }
                });
                if (cat === 'notes') {
                    const savedNotes = localStorage.getItem('startpage_notes');
                    if (savedNotes) {
                        try {
                            exportData._saved_notes_data = JSON.parse(savedNotes);
                        } catch (e) {}
                    }
                }
            }
        });

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "startpage_settings.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        close();
    });
}

function showImportDialog(parsedData) {
    let dialog = document.getElementById('config-import-modal');
    if (dialog) dialog.remove();

    dialog = document.createElement('div');
    dialog.id = 'config-import-modal';
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
        <div class="modal-content glass-panel" style="max-width: 480px; padding: 1.5rem; border-radius: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-color);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Import Configurations
                </h3>
                <button type="button" class="icon-btn close-dialog" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); font-size: 1.1rem;">✕</button>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Select configuration categories found in your JSON file to restore:</p>

            <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem;">
                <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.88rem; cursor: pointer; color: var(--text-color);">
                    <input type="checkbox" id="imp-select-all" checked style="accent-color: var(--accent-color);"> <strong>Select All Available Categories</strong>
                </label>
                <hr style="border: none; border-top: 1px solid var(--glass-border); margin: 0.25rem 0;">
                <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: var(--text-color);">
                    <input type="checkbox" class="imp-cat-check" data-cat="appearance" checked style="accent-color: var(--accent-color);"> Appearance & Color Tokens
                </label>
                <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: var(--text-color);">
                    <input type="checkbox" class="imp-cat-check" data-cat="layout" checked style="accent-color: var(--accent-color);"> Screen Layout & Window Positions
                </label>
                <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: var(--text-color);">
                    <input type="checkbox" class="imp-cat-check" data-cat="search" checked style="accent-color: var(--accent-color);"> Search Engines & AI Options
                </label>
                <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: var(--text-color);">
                    <input type="checkbox" class="imp-cat-check" data-cat="bookmarks" checked style="accent-color: var(--accent-color);"> Bookmarks & Display Settings
                </label>
                <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: var(--text-color);">
                    <input type="checkbox" class="imp-cat-check" data-cat="notes" checked style="accent-color: var(--accent-color);"> Sticky Notes & Drafts
                </label>
                <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: var(--text-color);">
                    <input type="checkbox" class="imp-cat-check" data-cat="general" checked style="accent-color: var(--accent-color);"> General & App Identity
                </label>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                <button type="button" class="action-btn secondary cancel-dialog">Cancel</button>
                <button type="button" class="action-btn confirm-import">Import Selected</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);

    const closeBtn = dialog.querySelector('.close-dialog');
    const cancelBtn = dialog.querySelector('.cancel-dialog');
    const selectAll = dialog.querySelector('#imp-select-all');
    const checks = dialog.querySelectorAll('.imp-cat-check');
    const confirmBtn = dialog.querySelector('.confirm-import');

    const close = () => dialog.remove();
    closeBtn.addEventListener('click', close);
    cancelBtn.addEventListener('click', close);

    selectAll.addEventListener('change', (e) => {
        checks.forEach(c => c.checked = e.target.checked);
    });

    confirmBtn.addEventListener('click', () => {
        checks.forEach(c => {
            if (c.checked) {
                const cat = c.dataset.cat;
                const keys = CATEGORY_MAP[cat] || [];
                keys.forEach(k => {
                    if (parsedData[k] !== undefined) {
                        userSettings[k] = parsedData[k];
                    }
                });
                if (cat === 'notes' && parsedData._saved_notes_data) {
                    localStorage.setItem('startpage_notes', JSON.stringify(parsedData._saved_notes_data));
                }
            }
        });

        saveSettings();
        alert('Configurations imported successfully! Reloading...');
        window.location.reload();
    });
}
