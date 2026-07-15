import { initTopPanel, applyLayoutSettings } from './panels/top-panel.js';
import { initRightPanel } from './panels/right-panel.js';
import { initBottomPanel } from './panels/bottom-panel.js';

export function initPanels() {
    initTopPanel();
    initRightPanel();
    initBottomPanel();
}

export { applyLayoutSettings };
