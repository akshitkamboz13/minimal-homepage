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
    appName: 'Home by si4k'
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
    changeCallbacks.forEach(cb => cb(userSettings));
}

export { userSettings };
