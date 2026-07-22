import { initTopPanel, applyLayoutSettings } from './panels/top-panel.js';
import { initRightPanel } from './panels/right-panel.js';
import { initDock } from './panels/dock.js';
import { initSettingsPanel } from '../settings/index.js';

export function initPanels() {
    initTopPanel();
    initSettingsPanel();
    initRightPanel();
    initDock();
}

export { applyLayoutSettings };
