import { userSettings, saveSettings } from '../settings-state.js';
import { initCustomDropdown } from '../custom-dropdown.js';

export function initVoice(modal) {
    const dropdownVoiceLang = initCustomDropdown('voice-lang', (val) => {
        userSettings.voiceLang = val;
        saveSettings();
    });
    if (dropdownVoiceLang) {
        dropdownVoiceLang.setValue(userSettings.voiceLang);
    }

    const toggleVoiceSubmit = document.getElementById('toggle-voice-auto-submit');
    if (toggleVoiceSubmit) {
        toggleVoiceSubmit.checked = userSettings.voiceAutoSubmit;
        toggleVoiceSubmit.addEventListener('change', (e) => {
            userSettings.voiceAutoSubmit = e.target.checked;
            saveSettings();
        });
    }
}
