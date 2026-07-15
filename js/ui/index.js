import { initTopPanel, applyLayoutSettings } from './TopPanel/TopPanel.js';
import { initRightPanel } from './RightPanel/RightPanel.js';
import { initBottomPanel } from './BottomPanel/BottomPanel.js';

export function initPanels() {
    initTopPanel();
    initRightPanel();
    initBottomPanel();
}

export { applyLayoutSettings };
