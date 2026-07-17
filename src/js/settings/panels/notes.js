import { userSettings, saveSettings } from '../settings-state.js';

export function applyNotesVisuals() {
    const fontVal = userSettings.notesFont;
    const fontStack = fontVal === 'serif' 
        ? 'Georgia, serif' 
        : fontVal === 'mono' 
            ? 'monospace' 
            : 'inherit';
    document.documentElement.style.setProperty('--notes-font-family', fontStack);
}

export function initNotesSettings(modal) {
    const selectNotesFont = document.getElementById('setting-notes-font');
    if (selectNotesFont) {
        selectNotesFont.value = userSettings.notesFont;
        selectNotesFont.addEventListener('change', (e) => {
            userSettings.notesFont = e.target.value;
            saveSettings();
            applyNotesVisuals();
        });
    }

    const sliderNotesAutosave = document.getElementById('setting-notes-autosave');
    const labelNotesAutosave = document.getElementById('autosave-val');
    if (sliderNotesAutosave) {
        sliderNotesAutosave.value = userSettings.notesAutosave;
        if (labelNotesAutosave) labelNotesAutosave.textContent = `${userSettings.notesAutosave}s`;
        sliderNotesAutosave.addEventListener('input', (e) => {
            userSettings.notesAutosave = parseInt(e.target.value);
            if (labelNotesAutosave) labelNotesAutosave.textContent = `${userSettings.notesAutosave}s`;
            saveSettings();
        });
    }

    const inputNotesPlaceholder = document.getElementById('setting-notes-placeholder');
    if (inputNotesPlaceholder) {
        inputNotesPlaceholder.value = userSettings.notesPlaceholder;
        inputNotesPlaceholder.addEventListener('input', (e) => {
            userSettings.notesPlaceholder = e.target.value;
            saveSettings();
        });
    }
}
