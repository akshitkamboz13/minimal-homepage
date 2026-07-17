import { initTopPanel, applyLayoutSettings } from './panels/top-panel.js';
import { initRightPanel } from './panels/right-panel.js';
import { initBottomPanel } from './panels/bottom-panel.js';
import { initSettingsPanel } from '../settings/index.js';

export function initPanels() {
    initTopPanel();
    initSettingsPanel();
    initRightPanel();
    initBottomPanel();
}

export { applyLayoutSettings };
