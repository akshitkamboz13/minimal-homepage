import { userSettings, saveSettings } from '../settings-state.js';
import { applyLayoutSettings } from '../../ui/panels/top-panel.js';
import { initCustomDropdown } from '../custom-dropdown.js';

export function initWidgets(modal) {
    const dropdownClockFormat = initCustomDropdown('clock-format', (val) => {
        userSettings.clockFormat = val;
        saveSettings();
    });
    if (dropdownClockFormat) {
        dropdownClockFormat.setValue(userSettings.clockFormat);
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
