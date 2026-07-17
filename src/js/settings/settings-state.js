let userSettings = JSON.parse(localStorage.getItem('startpage_settings')) || {};

const defaults = {
    showBookmarks: true,
    containerWidth: 'full', // 'full' | 'contained'
    tileWidth: 'fixed', // 'fixed' | 'auto'
    hiddenFolders: [], // Array of folder titles that are hidden
    hiddenLinks: [], // Array of link IDs that are hidden
    rememberSearchMode: false,
    lastSearchMode: 'google',
    showVisualSearch: true,
    showGoogleApps: true,

    // New configuration settings
    theme: 'system', // 'system' | 'light' | 'dark'
    accentColor: 'blue', // 'blue' | 'purple' | 'emerald' | 'amber' | 'rose'
    notesFont: 'sans', // 'sans' | 'serif' | 'mono'
    notesAutosave: 2,
    notesPlaceholder: 'Type a note here...',
    bookmarkTarget: '_blank', // '_blank' | '_self'
    windowScale: 100, // percentage 80-120
    sidebarHover: false,
    clockFormat: '12', // '12' | '24'
    clockShowSeconds: true,
    clockShowDate: true,
    selectedAi: null,
    selectedAiName: null,
    aiDirect: false,
    aiCustomPrompt: '',
    voiceLang: 'en-US',
    voiceAutoSubmit: true,
    visualProvider: 'google', // 'google' | 'bing' | 'yandex'
    kbdAutofocus: true,
    kbdEscClear: true,
    historyCount: 5,
    autocompleteSuggestions: true,
    reduceMotion: false,
    backgroundType: 'mesh-default',
    customBackgroundUrl: '',
    customAccentColor: '#3b82f6',
    customMeshBlob1Light: '#ffb6ff',
    customMeshBlob2Light: '#b3c5ff',
    customMeshBlob3Light: '#ffd4b3',
    customMeshBlob1Dark: '#4c1d95',
    customMeshBlob2Dark: '#1e3a8a',
    customMeshBlob3Dark: '#831843'
};

// Merge loaded settings with defaults to guarantee all keys exist
userSettings = { ...defaults, ...userSettings };

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
