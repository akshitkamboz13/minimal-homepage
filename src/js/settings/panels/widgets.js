import { userSettings, saveSettings } from '../settings-state.js';
import { applyLayoutSettings } from '../../ui/panels/top-panel.js';

export function initWidgets(modal) {
    const selectClockFormat = document.getElementById('setting-clock-format');
    if (selectClockFormat) {
        selectClockFormat.value = userSettings.clockFormat;
        selectClockFormat.addEventListener('change', (e) => {
            userSettings.clockFormat = e.target.value;
            saveSettings();
        });
    }

    const toggleClockSeconds = document.getElementById('toggle-clock-seconds');
    if (toggleClockSeconds) {
        toggleClockSeconds.checked = userSettings.clockShowSeconds;
        toggleClockSeconds.addEventListener('change', (e) => {
            userSettings.clockShowSeconds = e.target.checked;
            saveSettings();
        });
    }

    const toggleClockDate = document.getElementById('toggle-clock-date');
    if (toggleClockDate) {
        toggleClockDate.checked = userSettings.clockShowDate;
        toggleClockDate.addEventListener('change', (e) => {
            userSettings.clockShowDate = e.target.checked;
            saveSettings();
        });
    }

    const toggleGoogleApps = document.getElementById('toggle-google-apps');
    if (toggleGoogleApps) {
        toggleGoogleApps.checked = userSettings.showGoogleApps;
        toggleGoogleApps.addEventListener('change', (e) => {
            userSettings.showGoogleApps = e.target.checked;
            saveSettings();
            applyLayoutSettings();
        });
    }
}
