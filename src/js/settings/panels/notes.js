import { userSettings, saveSettings } from '../settings-state.js';
import { initCustomDropdown } from '../custom-dropdown.js';

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
    const dropdownNotesFont = initCustomDropdown('notes-font', (val) => {
        userSettings.notesFont = val;
        saveSettings();
        applyNotesVisuals();
    });
    if (dropdownNotesFont) {
        dropdownNotesFont.setValue(userSettings.notesFont);
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
