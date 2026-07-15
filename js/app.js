import { initTheme } from './theme/theme.js';
import { initClock } from './clock/clock.js';
import { initSearch } from './search/core/index.js';
import { initVoiceSearch } from './search/voice/Voice.js';
import { initVisualSearch } from './search/visual/Visual.js';
import { initBookmarks } from './bookmarks/index.js';
import { initPanels } from './ui/panels.js';
import { initNotes } from './notes/notes.js';

export function initApp() {
    initTheme();
    initClock();
    initSearch();
    initVoiceSearch();
    initVisualSearch();
    initBookmarks();
    initPanels();
    initNotes();
}
