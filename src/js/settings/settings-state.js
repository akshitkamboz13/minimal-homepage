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
    showVerticalPanel: true,
    verticalPanelPosition: 'right', // 'right' | 'left'
    verticalIconSize: 20, // 16 | 20 | 24 | 28
    showHorizontalPanel: true,
    horizontalPanelPosition: 'top', // 'top' | 'bottom'
    horizontalIconSize: 20, // 16 | 20 | 24 | 28
    showHeaderNote: true,
    showHeaderSettings: true,
    showHeaderTheme: true,
    showDock: true,
    dockPosition: 'bottom', // 'bottom' | 'top' | 'left' | 'right'
    dockAutohide: false,
    customPanelItems: [
        { id: 'item_google', title: 'Google', url: 'https://www.google.com', panel: 'dock', target: '_blank', icon: '' },
        { id: 'item_youtube', title: 'YouTube', url: 'https://www.youtube.com', panel: 'dock', target: '_blank', icon: '' },
        { id: 'item_github', title: 'GitHub', url: 'https://github.com', panel: 'dock', target: '_blank', icon: '' },
        { id: 'item_chatgpt', title: 'ChatGPT', url: 'https://chatgpt.com', panel: 'dock', target: '_blank', icon: '' }
    ],

    // New configuration settings
    theme: 'system', // 'system' | 'light' | 'dark'
    accentColor: 'blue', // 'blue' | 'purple' | 'emerald' | 'amber' | 'rose'
    notesFont: 'sans', // 'sans' | 'serif' | 'mono'
    notesAutosave: 2,
    notesPlaceholder: 'Type a note here...',
    defaultNoteWidth: 250,
    defaultNoteHeight: 250,
    bookmarkTarget: '_blank', // '_blank' | '_self'
    windowScale: 100, // percentage 80-120
    sidebarHover: false,
    clockFormat: '12', // '12' | '24'
    clockShowSeconds: true,
    clockShowDate: true,
    clockAlignment: 'center', // 'center' | 'left' | 'right'
    greetingMode: 'default', // 'default' | 'time_custom' | 'custom_text'
    greetingMorning: 'Good morning.',
    greetingAfternoon: 'Good afternoon.',
    greetingEvening: 'Good evening.',
    greetingNight: 'Good night.',
    customGreetingText: 'Welcome back.',
    selectedAi: 'gemini',
    selectedAiName: 'Google AI',
    showAiToggle: true,
    aiCustomPrompt: '',
    voiceLang: 'en-US',
    voiceAutoSubmit: true,
    visualProvider: 'google', // 'google' | 'bing' | 'yandex'
    kbdAutofocus: true,
    kbdEscClear: true,
    historyCount: 5,
    suggestionsLimit: 5,
    autocompleteSuggestions: true,
    reduceMotion: false,
    backgroundType: 'mesh-default',
    customBackgroundUrl: '',
    aiEngines: [
        { id: 'gemini', name: 'Google AI', url: 'https://www.google.com/search?q={query}&udm=50&aep=1&ntc=1&csuir=1', enabled: true, isCustom: false },
        { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/?prompt={query}', enabled: true, isCustom: false },
        { id: 'bing', name: 'Bing AI', url: 'https://www.bing.com/copilotsearch?q={query}', enabled: true, isCustom: false },
        { id: 'claude', name: 'Claude', url: 'https://claude.ai/new?q={query}', enabled: true, isCustom: false },
        { id: 'grok', name: 'Grok', url: 'https://grok.com/?q={query}', enabled: true, isCustom: false }
    ],
    customAccentColor: '#3b82f6',
    customMeshBlob1Light: '#ffb6ff',
    customMeshBlob2Light: '#b3c5ff',
    customMeshBlob3Light: '#ffd4b3',
    customMeshBlob1Dark: '#4c1d95',
    customMeshBlob2Dark: '#1e3a8a',
    customMeshBlob3Dark: '#831843',
    customBgLight: '#f8fafc',
    customTextColorLight: '#1e293b',
    customTextSecondaryLight: '#64748b',
    customBgDark: '#0f172a',
    customTextColorDark: '#f8fafc',
    customTextSecondaryDark: '#cbd5e1',
    solidBgColor: '#0f172a',
    appName: 'Home by si4k',
    freeformLayout: false,
    layoutPositions: {}
};

// Merge loaded settings with defaults to guarantee all keys exist
userSettings = { ...defaults, ...userSettings };

// Migrate Google Gemini to Google AI in existing user settings
if (userSettings.aiEngines) {
    const geminiEngine = userSettings.aiEngines.find(e => e.id === 'gemini');
    if (geminiEngine && (geminiEngine.name === 'Google Gemini' || geminiEngine.url.includes('gemini.google.com'))) {
        geminiEngine.name = 'Google AI';
        geminiEngine.url = 'https://www.google.com/search?q={query}&udm=50&aep=1&ntc=1&csuir=1';
        if (userSettings.selectedAi === 'gemini') {
            userSettings.selectedAiName = 'Google AI';
        }
        localStorage.setItem('startpage_settings', JSON.stringify(userSettings));
    }
}


const changeCallbacks = [];

export function onSettingsChanged(callback) {
    changeCallbacks.push(callback);
}

export function saveSettings() {
    localStorage.setItem('startpage_settings', JSON.stringify(userSettings));
    if (window.chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ startpage_settings: userSettings });
    }
    changeCallbacks.forEach(cb => cb(userSettings));
}

if (window.chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['startpage_settings'], (result) => {
        if (result && result.startpage_settings) {
            const remoteItems = result.startpage_settings.customPanelItems || [];
            const localItems = userSettings.customPanelItems || [];
            
            const mergedMap = new Map();
            [...defaults.customPanelItems, ...localItems, ...remoteItems].forEach(item => {
                if (item && item.id) mergedMap.set(item.id, item);
            });

            userSettings = {
                ...defaults,
                ...userSettings,
                ...result.startpage_settings,
                customPanelItems: Array.from(mergedMap.values())
            };
        } else {
            userSettings = { ...defaults, ...userSettings };
        }
        localStorage.setItem('startpage_settings', JSON.stringify(userSettings));
        chrome.storage.local.set({ startpage_settings: userSettings });
        changeCallbacks.forEach(cb => cb(userSettings));
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.startpage_settings && changes.startpage_settings.newValue) {
            const remoteItems = changes.startpage_settings.newValue.customPanelItems || [];
            const localItems = userSettings.customPanelItems || [];

            const mergedMap = new Map();
            [...localItems, ...remoteItems].forEach(item => {
                if (item && item.id) mergedMap.set(item.id, item);
            });

            userSettings = {
                ...defaults,
                ...userSettings,
                ...changes.startpage_settings.newValue,
                customPanelItems: Array.from(mergedMap.values())
            };
            localStorage.setItem('startpage_settings', JSON.stringify(userSettings));
            changeCallbacks.forEach(cb => cb(userSettings));
        }
    });
}

export { userSettings };
