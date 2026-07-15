import { initTheme } from './theme/Theme.js';
import { initClock } from './clock/Clock.js';
import { initSearch } from './search/core/index.js';
import { initVoiceSearch } from './search/voice/Voice.js';
import { initVisualSearch } from './search/visual/Visual.js';
import { initBookmarks } from './bookmarks/index.js';
import { initPanels } from './ui/index.js';
import { initNotes } from './notes/Notes.js';

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
