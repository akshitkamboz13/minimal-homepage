import { initTheme } from './theme/theme.js';
import { initClock } from './clock/clock.js';
import { initSearch } from './search/core/index.js';
import { initVoiceSearch } from './search/voice/Voice.js';
import { initVisualSearch } from './search/visual/Visual.js';
import { initBookmarks } from './bookmarks/bookmarks.js';
import { initPanels } from './ui/panels.js';
import { initNotes } from './notes/notes.js';

// ES Modules with `type="module"` in index.html are deferred by default, 
// so the DOM is guaranteed to be parsed at this point.
// However, adding DOMContentLoaded provides an extra safety net.
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initClock();
    initSearch();
    initVoiceSearch();
    initVisualSearch();
    initBookmarks();
    initPanels();
    initNotes();
});
