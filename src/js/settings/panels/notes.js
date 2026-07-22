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

    // 1. Default Note Width Slider
    const sliderNotesWidth = document.getElementById('setting-notes-width');
    const labelNotesWidth = document.getElementById('notes-width-val');
    if (sliderNotesWidth) {
        sliderNotesWidth.value = userSettings.defaultNoteWidth || 250;
        if (labelNotesWidth) labelNotesWidth.textContent = `${userSettings.defaultNoteWidth || 250}px`;
        sliderNotesWidth.addEventListener('input', (e) => {
            userSettings.defaultNoteWidth = parseInt(e.target.value);
            if (labelNotesWidth) labelNotesWidth.textContent = `${userSettings.defaultNoteWidth}px`;
            saveSettings();
        });
    }

    // 2. Default Note Height Slider
    const sliderNotesHeight = document.getElementById('setting-notes-height');
    const labelNotesHeight = document.getElementById('notes-height-val');
    if (sliderNotesHeight) {
        sliderNotesHeight.value = userSettings.defaultNoteHeight || 250;
        if (labelNotesHeight) labelNotesHeight.textContent = `${userSettings.defaultNoteHeight || 250}px`;
        sliderNotesHeight.addEventListener('input', (e) => {
            userSettings.defaultNoteHeight = parseInt(e.target.value);
            if (labelNotesHeight) labelNotesHeight.textContent = `${userSettings.defaultNoteHeight}px`;
            saveSettings();
        });
    }

    // 3. Close All Sticky Notes
    const btnCloseAllNotes = document.getElementById('btn-close-all-notes');
    if (btnCloseAllNotes) {
        btnCloseAllNotes.addEventListener('click', () => {
            if (confirm('Are you sure you want to close and delete all open sticky notes?')) {
                window.dispatchEvent(new CustomEvent('clear-all-notes'));
            }
        });
    }
}
