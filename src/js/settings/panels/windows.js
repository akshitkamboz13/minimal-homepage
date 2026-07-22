import { userSettings, saveSettings } from '../settings-state.js';
import { applyLayoutPositions, enableRearrangeMode, resetLayoutPositions } from '../../ui/panels/layout-manager.js';

export function applyWindowsVisuals() {
    const container = document.querySelector('.container');
    if (container) {
        container.style.zoom = `${userSettings.windowScale}%`;
    }
    applyLayoutPositions();
}

export function initWindows(modal) {
    const sliderWindowScale = document.getElementById('setting-window-scale');
    const labelWindowScale = document.getElementById('scale-val');
    if (sliderWindowScale) {
        sliderWindowScale.value = userSettings.windowScale;
        if (labelWindowScale) labelWindowScale.textContent = `${userSettings.windowScale}%`;
        sliderWindowScale.addEventListener('input', (e) => {
            userSettings.windowScale = parseInt(e.target.value);
            if (labelWindowScale) labelWindowScale.textContent = `${userSettings.windowScale}%`;
            saveSettings();
            applyWindowsVisuals();
        });
    }

    const toggleSidebarHover = document.getElementById('toggle-sidebar-hover');
    if (toggleSidebarHover) {
        toggleSidebarHover.checked = userSettings.sidebarHover;
        toggleSidebarHover.addEventListener('change', (e) => {
            userSettings.sidebarHover = e.target.checked;
            saveSettings();
        });
    }

    // Freeform Layout Controls
    const toggleFreeform = modal ? modal.querySelector('#toggle-freeform-layout') : document.getElementById('toggle-freeform-layout');
    const btnUnlockLayout = modal ? modal.querySelector('#btn-unlock-layout') : document.getElementById('btn-unlock-layout');
    const btnResetLayout = modal ? modal.querySelector('#btn-reset-screen-layout') : document.getElementById('btn-reset-screen-layout');

    if (toggleFreeform) {
        toggleFreeform.checked = !!userSettings.freeformLayout;
        toggleFreeform.addEventListener('change', (e) => {
            userSettings.freeformLayout = e.target.checked;
            if (e.target.checked) {
                userSettings.containerWidth = 'full';
                const toggleWidth = document.getElementById('toggle-container-width');
                if (toggleWidth) toggleWidth.checked = true;
            }
            saveSettings();
            applyLayoutPositions();
            if (e.target.checked) {
                enableRearrangeMode(true);
            } else {
                enableRearrangeMode(false);
            }
        });
    }

    if (btnUnlockLayout) {
        btnUnlockLayout.addEventListener('click', () => {
            userSettings.freeformLayout = true;
            userSettings.containerWidth = 'full';
            const toggleWidth = document.getElementById('toggle-container-width');
            if (toggleWidth) toggleWidth.checked = true;
            if (toggleFreeform) toggleFreeform.checked = true;
            saveSettings();
            enableRearrangeMode(true);
            
            // Close settings modal to let user drag elements
            const modalEl = document.getElementById('settings-modal');
            if (modalEl) modalEl.classList.add('hidden');
        });
    }

    if (btnResetLayout) {
        btnResetLayout.addEventListener('click', () => {
            resetLayoutPositions();
            if (toggleFreeform) toggleFreeform.checked = false;
        });
    }
}
