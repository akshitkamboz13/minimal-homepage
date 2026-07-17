import { userSettings, saveSettings } from '../settings-state.js';

export function applyPerformanceVisuals() {
    if (userSettings.reduceMotion) {
        document.body.classList.add('reduce-motion');
    } else {
        document.body.classList.remove('reduce-motion');
    }
}

export function initPerformance(modal) {
    const toggleReduceMotion = document.getElementById('toggle-performance-motion');
    if (toggleReduceMotion) {
        toggleReduceMotion.checked = userSettings.reduceMotion;
        toggleReduceMotion.addEventListener('change', (e) => {
            userSettings.reduceMotion = e.target.checked;
            saveSettings();
            applyPerformanceVisuals();
        });
    }
}
