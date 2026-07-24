import { userSettings, saveSettings } from '../settings-state.js';
import { initCustomDropdown } from '../custom-dropdown.js';

export function applyPuffVisuals() {
    const fontVal = userSettings.puffFont || 'mono';
    const fontStack = fontVal === 'serif' 
        ? 'Georgia, serif' 
        : fontVal === 'sans' 
            ? 'system-ui, -apple-system, sans-serif' 
            : "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace";
    document.documentElement.style.setProperty('--puff-font-family', fontStack);
}

export function initPuffSettings(modal) {
    // 1. Font Family Dropdown
    const dropdownPuffFont = initCustomDropdown('puff-font', (val) => {
        userSettings.puffFont = val;
        saveSettings();
        applyPuffVisuals();
    });
    if (dropdownPuffFont) {
        dropdownPuffFont.setValue(userSettings.puffFont || 'mono');
    }

    // 2. Enable Puff Shell Switch
    const togglePuffShell = document.getElementById('toggle-puff-shell');
    if (togglePuffShell) {
        togglePuffShell.checked = userSettings.showPuffShell !== false;
        togglePuffShell.addEventListener('change', (e) => {
            userSettings.showPuffShell = e.target.checked;
            saveSettings();
            // Dispatch event to update dock and apps grid
            window.dispatchEvent(new CustomEvent('dock-state-changed'));
        });
    }

    // 3. Reset Puff Button
    const btnResetPuff = document.getElementById('btn-reset-puff');
    if (btnResetPuff) {
        btnResetPuff.addEventListener('click', () => {
            localStorage.removeItem('startpage_puff_state');
            const puffOutputHistory = document.getElementById('puff-output-history');
            if (puffOutputHistory) puffOutputHistory.innerHTML = '';
            
            const puffWin = document.getElementById('puff-window');
            if (puffWin) {
                puffWin.style.width = `${userSettings.defaultPuffWidth || 580}px`;
                puffWin.style.height = `${userSettings.defaultPuffHeight || 380}px`;
                puffWin.style.left = '140px';
                puffWin.style.top = '140px';
            }
        });
    }

    // 4. Placeholder Input
    const inputPuffPlaceholder = document.getElementById('setting-puff-placeholder');
    if (inputPuffPlaceholder) {
        inputPuffPlaceholder.value = userSettings.puffPlaceholder || '';
        inputPuffPlaceholder.addEventListener('input', (e) => {
            userSettings.puffPlaceholder = e.target.value;
            saveSettings();
            const puffInput = document.getElementById('puff-input');
            if (puffInput) {
                puffInput.placeholder = e.target.value;
            }
        });
    }

    // 5. Default Width Slider
    const sliderPuffWidth = document.getElementById('setting-puff-width');
    const labelPuffWidth = document.getElementById('puff-width-val');
    if (sliderPuffWidth) {
        sliderPuffWidth.value = userSettings.defaultPuffWidth || 580;
        if (labelPuffWidth) labelPuffWidth.textContent = `${userSettings.defaultPuffWidth || 580}px`;
        sliderPuffWidth.addEventListener('input', (e) => {
            const widthVal = parseInt(e.target.value);
            userSettings.defaultPuffWidth = widthVal;
            if (labelPuffWidth) labelPuffWidth.textContent = `${widthVal}px`;
            saveSettings();
            
            const puffWin = document.getElementById('puff-window');
            if (puffWin) {
                puffWin.style.width = `${widthVal}px`;
                try {
                    const state = JSON.parse(localStorage.getItem('startpage_puff_state')) || {};
                    state.w = widthVal;
                    localStorage.setItem('startpage_puff_state', JSON.stringify(state));
                } catch(err) {}
            }
        });
    }

    // 6. Default Height Slider
    const sliderPuffHeight = document.getElementById('setting-puff-height');
    const labelPuffHeight = document.getElementById('puff-height-val');
    if (sliderPuffHeight) {
        sliderPuffHeight.value = userSettings.defaultPuffHeight || 380;
        if (labelPuffHeight) labelPuffHeight.textContent = `${userSettings.defaultPuffHeight || 380}px`;
        sliderPuffHeight.addEventListener('input', (e) => {
            const heightVal = parseInt(e.target.value);
            userSettings.defaultPuffHeight = heightVal;
            if (labelPuffHeight) labelPuffHeight.textContent = `${heightVal}px`;
            saveSettings();
            
            const puffWin = document.getElementById('puff-window');
            if (puffWin) {
                puffWin.style.height = `${heightVal}px`;
                try {
                    const state = JSON.parse(localStorage.getItem('startpage_puff_state')) || {};
                    state.h = heightVal;
                    localStorage.setItem('startpage_puff_state', JSON.stringify(state));
                } catch(err) {}
            }
        });
    }
}
