let userSettings = JSON.parse(localStorage.getItem('startpage_settings')) || {
    showBookmarks: true,
    containerWidth: 'full', // 'full' | 'contained'
    tileWidth: 'fixed', // 'fixed' | 'auto'
    hiddenFolders: [], // Array of folder titles that are hidden
    hiddenLinks: [], // Array of link IDs that are hidden
    rememberSearchMode: false,
    lastSearchMode: 'google',
    showVisualSearch: true,
    showGoogleApps: true
};

// Make sure we have defaults for new keys if user has old settings stored
if (userSettings.containerWidth === undefined) userSettings.containerWidth = 'full';
if (userSettings.tileWidth === undefined) userSettings.tileWidth = 'fixed';
if (userSettings.hiddenFolders === undefined) userSettings.hiddenFolders = [];
if (userSettings.hiddenLinks === undefined) userSettings.hiddenLinks = [];
if (userSettings.rememberSearchMode === undefined) userSettings.rememberSearchMode = false;
if (userSettings.lastSearchMode === undefined) userSettings.lastSearchMode = 'google';
if (userSettings.showVisualSearch === undefined) userSettings.showVisualSearch = true;
if (userSettings.showGoogleApps === undefined) userSettings.showGoogleApps = true;

if (!userSettings.rememberSearchMode) {
    userSettings.selectedAi = null;
    userSettings.selectedAiName = null;
}

const changeCallbacks = [];

export function onSettingsChanged(callback) {
    changeCallbacks.push(callback);
}

export function saveSettings() {
    localStorage.setItem('startpage_settings', JSON.stringify(userSettings));
    changeCallbacks.forEach(cb => cb(userSettings));
}

export { userSettings };
