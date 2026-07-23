import { initTopPanel, applyLayoutSettings } from './panels/top-panel.js';
import { initRightPanel } from './panels/right-panel.js';
import { initDock } from './panels/dock.js';
import { initAppsGrid } from './panels/apps-grid.js';
import { initSettingsPanel } from '../settings/index.js';
import { applyPanelsVisuals } from '../settings/panels/panels.js';

export function initPanels() {
    initAppsGrid();
    initTopPanel();
    initSettingsPanel();
    initRightPanel();
    initDock();
    applyPanelsVisuals();
}

export { applyLayoutSettings };
