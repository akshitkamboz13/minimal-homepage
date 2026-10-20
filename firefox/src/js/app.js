import { initTheme } from './theme/theme.js';
import { initClock } from './clock/clock.js';
import { initSearch } from './search/core/index.js';
import { initVoiceSearch } from './search/voice/voice.js';
import { initVisualSearch } from './search/visual/visual.js';
import { initBookmarks } from './bookmarks/index.js';
import { initPanels } from './ui/index.js';
import { initNotes } from './notes/notes.js';
import { initPuff } from './puff/puff.js';
import { initLayoutManager } from './ui/panels/layout-manager.js';
import { initContextMenu } from './ui/panels/context-menu.js';
import { initWidgetRuntime } from './widgets/widget-runtime.js';
import { initAppWindowManager } from './ui/app-window-manager.js';
import { dismissPageLoader } from './animations/index.js';
import { initTracker } from './tracker/tracker.js';
import { initTodo } from './todo/todo.js';
import { initMediaController } from './media/media-controller.js';

export function initApp() {
    initTheme();
    initClock();
    initSearch();
    initVoiceSearch();
    initVisualSearch();
    initBookmarks();
    initPanels();
    initNotes();
    initPuff();
    initLayoutManager();
    initContextMenu();
    initWidgetRuntime();
    initAppWindowManager();
    initTracker();
    initTodo();
    initMediaController();

    // Smoothly dismiss page loader veil after initial components render
    dismissPageLoader();
}
