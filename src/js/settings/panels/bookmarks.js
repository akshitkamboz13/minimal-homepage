import { userSettings, saveSettings } from '../settings-state.js';
import { applyLayoutSettings } from '../../ui/panels/top-panel.js';
import { initCustomDropdown } from '../custom-dropdown.js';

export function initBookmarksSettings(modal) {
    const toggleBookmarks = document.getElementById('toggle-all-bookmarks');
    if (toggleBookmarks) {
        toggleBookmarks.checked = userSettings.showBookmarks;
        toggleBookmarks.addEventListener('change', (e) => {
            userSettings.showBookmarks = e.target.checked;
            saveSettings();
        });
    }

    const dropdownBookmarkTarget = initCustomDropdown('bookmark-target', (val) => {
        userSettings.bookmarkTarget = val;
        saveSettings();
    });
    if (dropdownBookmarkTarget) {
        dropdownBookmarkTarget.setValue(userSettings.bookmarkTarget);
    }

    const toggleTileWidth = document.getElementById('toggle-tile-width');
    if (toggleTileWidth) {
        toggleTileWidth.checked = userSettings.tileWidth === 'auto';
        toggleTileWidth.addEventListener('change', (e) => {
            userSettings.tileWidth = e.target.checked ? 'auto' : 'fixed';
            saveSettings();
            applyLayoutSettings();
        });
    }

    const folderLimitInput = document.getElementById('setting-bookmark-folders-limit');
    if (folderLimitInput) {
        folderLimitInput.value = userSettings.bookmarkFoldersLimit || 0;
        folderLimitInput.addEventListener('input', (e) => {
            let val = parseInt(e.target.value, 10);
            if (isNaN(val) || val < 0) val = 0;
            userSettings.bookmarkFoldersLimit = val;
            saveSettings();
            applyLayoutSettings(); // Propagate change triggers
        });
    }
}

