import { userSettings, saveSettings } from '../settings-state.js';

export function initKeyboard(modal) {
    const toggleKbdAutofocus = document.getElementById('toggle-kbd-autofocus');
    if (toggleKbdAutofocus) {
        toggleKbdAutofocus.checked = userSettings.kbdAutofocus;
        toggleKbdAutofocus.addEventListener('change', (e) => {
            userSettings.kbdAutofocus = e.target.checked;
            saveSettings();
        });
    }

    const toggleKbdEsc = document.getElementById('toggle-kbd-esc-clear');
    if (toggleKbdEsc) {
        toggleKbdEsc.checked = userSettings.kbdEscClear;
        toggleKbdEsc.addEventListener('change', (e) => {
            userSettings.kbdEscClear = e.target.checked;
            saveSettings();
        });
    }
}
