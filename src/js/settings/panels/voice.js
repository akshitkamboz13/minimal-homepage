import { userSettings, saveSettings } from '../settings-state.js';

export function initVoice(modal) {
    const selectVoiceLang = document.getElementById('setting-voice-lang');
    if (selectVoiceLang) {
        selectVoiceLang.value = userSettings.voiceLang;
        selectVoiceLang.addEventListener('change', (e) => {
            userSettings.voiceLang = e.target.value;
            saveSettings();
        });
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
