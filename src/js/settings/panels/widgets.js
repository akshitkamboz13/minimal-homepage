import { userSettings, saveSettings } from '../settings-state.js';
import { applyLayoutSettings } from '../../ui/panels/top-panel.js';
import { initCustomDropdown } from '../custom-dropdown.js';
import { applyAppearanceVisuals } from './appearance.js';

export function initWidgets(modal) {
    const dropdownClockFormat = initCustomDropdown('clock-format', (val) => {
        userSettings.clockFormat = val;
        saveSettings();
    });
    if (dropdownClockFormat) {
        dropdownClockFormat.setValue(userSettings.clockFormat);
    }

    const dropdownClockFont = initCustomDropdown('clock-font', (val) => {
        userSettings.clockFont = val;
        saveSettings();
        applyAppearanceVisuals();
    });
    if (dropdownClockFont) {
        dropdownClockFont.setValue(userSettings.clockFont || 'inherit');
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

    // 1. Clock Alignment Dropdown
    const dropdownClockAlign = initCustomDropdown('clock-align', (val) => {
        userSettings.clockAlignment = val;
        saveSettings();
    });
    if (dropdownClockAlign) {
        dropdownClockAlign.setValue(userSettings.clockAlignment || 'center');
    }

    // 2. Greeting Mode & Custom Inputs
    const customTimeContainer = document.getElementById('custom-time-greetings-container');
    const customTextContainer = document.getElementById('custom-text-greeting-container');

    const updateGreetingVisibility = (mode) => {
        if (customTimeContainer) {
            customTimeContainer.classList.toggle('hidden', mode !== 'time_custom');
        }
        if (customTextContainer) {
            customTextContainer.classList.toggle('hidden', mode !== 'custom_text');
        }
    };

    const dropdownGreetingMode = initCustomDropdown('greeting-mode', (val) => {
        userSettings.greetingMode = val;
        saveSettings();
        updateGreetingVisibility(val);
    });
    if (dropdownGreetingMode) {
        dropdownGreetingMode.setValue(userSettings.greetingMode || 'default');
        updateGreetingVisibility(userSettings.greetingMode || 'default');
    }

    // Custom time-based inputs
    const inputMorning = document.getElementById('setting-greeting-morning');
    if (inputMorning) {
        inputMorning.value = userSettings.greetingMorning || 'Good morning.';
        inputMorning.addEventListener('input', (e) => {
            userSettings.greetingMorning = e.target.value;
            saveSettings();
        });
    }

    const inputAfternoon = document.getElementById('setting-greeting-afternoon');
    if (inputAfternoon) {
        inputAfternoon.value = userSettings.greetingAfternoon || 'Good afternoon.';
        inputAfternoon.addEventListener('input', (e) => {
            userSettings.greetingAfternoon = e.target.value;
            saveSettings();
        });
    }

    const inputEvening = document.getElementById('setting-greeting-evening');
    if (inputEvening) {
        inputEvening.value = userSettings.greetingEvening || 'Good evening.';
        inputEvening.addEventListener('input', (e) => {
            userSettings.greetingEvening = e.target.value;
            saveSettings();
        });
    }

    const inputNight = document.getElementById('setting-greeting-night');
    if (inputNight) {
        inputNight.value = userSettings.greetingNight || 'Good night.';
        inputNight.addEventListener('input', (e) => {
            userSettings.greetingNight = e.target.value;
            saveSettings();
        });
    }

    const inputCustomText = document.getElementById('setting-greeting-text');
    if (inputCustomText) {
        inputCustomText.value = userSettings.customGreetingText || 'Welcome back.';
        inputCustomText.addEventListener('input', (e) => {
            userSettings.customGreetingText = e.target.value;
            saveSettings();
        });
    }

    // 3. Reset Default Greeting
    const btnResetGreeting = document.getElementById('btn-reset-greeting');
    if (btnResetGreeting) {
        btnResetGreeting.addEventListener('click', () => {
            userSettings.greetingMode = 'default';
            userSettings.greetingMorning = 'Good morning.';
            userSettings.greetingAfternoon = 'Good afternoon.';
            userSettings.greetingEvening = 'Good evening.';
            userSettings.greetingNight = 'Good night.';
            userSettings.customGreetingText = 'Welcome back.';
            saveSettings();

            if (dropdownGreetingMode) dropdownGreetingMode.setValue('default');
            if (inputMorning) inputMorning.value = 'Good morning.';
            if (inputAfternoon) inputAfternoon.value = 'Good afternoon.';
            if (inputEvening) inputEvening.value = 'Good evening.';
            if (inputNight) inputNight.value = 'Good night.';
            if (inputCustomText) inputCustomText.value = 'Welcome back.';
            updateGreetingVisibility('default');
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
