import { userSettings, saveSettings } from '../settings-state.js';

export function initBookmarksSettings(modal) {
    const toggleBookmarks = document.getElementById('toggle-all-bookmarks');
    if (toggleBookmarks) {
        toggleBookmarks.checked = userSettings.showBookmarks;
        toggleBookmarks.addEventListener('change', (e) => {
            userSettings.showBookmarks = e.target.checked;
            saveSettings();
        });
    }

    const selectBookmarkTarget = document.getElementById('setting-bookmark-target');
    if (selectBookmarkTarget) {
        selectBookmarkTarget.value = userSettings.bookmarkTarget;
        selectBookmarkTarget.addEventListener('change', (e) => {
            userSettings.bookmarkTarget = e.target.value;
            saveSettings();
        });
    }
}
