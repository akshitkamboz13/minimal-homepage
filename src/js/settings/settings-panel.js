import { userSettings } from './settings-state.js';
import { initAppearance, applyAppearanceVisuals } from './panels/appearance.js';
import { initNotesSettings, applyNotesVisuals } from './panels/notes.js';
import { initBookmarksSettings } from './panels/bookmarks.js';
import { initWindows, applyWindowsVisuals } from './panels/windows.js';
import { initWidgets } from './panels/widgets.js';
import { initAi } from './panels/ai.js';
import { initVoice } from './panels/voice.js';
import { initVisual } from './panels/visual.js';
import { initKeyboard } from './panels/keyboard.js';
import { initPrivacy } from './panels/privacy.js';
import { initPerformance, applyPerformanceVisuals } from './panels/performance.js';
import { initDeveloper } from './panels/developer.js';
import { initAbout } from './panels/about.js';

export function applySettingsVisuals() {
    applyAppearanceVisuals();
    applyNotesVisuals();
    applyWindowsVisuals();
    applyPerformanceVisuals();
}

export function initSettingsPanel() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    // Apply initial visuals on load
    applySettingsVisuals();

    // 1. Sidebar Tab Switching
    const menuItems = modal.querySelectorAll('.menu-item');
    const panes = modal.querySelectorAll('.settings-pane');
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            
            menuItems.forEach(mi => mi.classList.remove('active'));
            panes.forEach(pane => pane.classList.remove('active'));
            
            item.classList.add('active');
            const activePane = modal.querySelector(`#tab-${targetTab}`);
            if (activePane) activePane.classList.add('active');
        });
    });

    // 2. Sidebar Live Search
    const searchInput = document.getElementById('settings-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            menuItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                const matched = text.includes(query);
                item.style.display = matched ? 'block' : 'none';
            });
        });
    }

    // 3. Initialize all sub-panels
    initAppearance(modal);
    initNotesSettings(modal);
    initBookmarksSettings(modal);
    initWindows(modal);
    initWidgets(modal);
    initAi(modal);
    initVoice(modal);
    initVisual(modal);
    initKeyboard(modal);
    initPrivacy(modal);
    initPerformance(modal);
    initDeveloper(modal);
    initAbout(modal);
}
