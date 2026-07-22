import { userSettings } from '../../settings/index.js';

let searchHistory = JSON.parse(localStorage.getItem('startpage_search_history')) || [];

export function getSearchHistory() {
    return searchHistory;
}

export function saveSearch(query) {
    if (!query) return;
    searchHistory = searchHistory.filter(q => q !== query);
    searchHistory.unshift(query);
    if (searchHistory.length > 5) searchHistory.pop();
    localStorage.setItem('startpage_search_history', JSON.stringify(searchHistory));
}

export function doSearch(query) {
    const imageSearchInput = document.getElementById('image-search-input');
    if (imageSearchInput && imageSearchInput.files.length > 0) {
        const lensForm = document.getElementById('lens-form');
        if (lensForm) lensForm.submit();
        return;
    }

    saveSearch(query);
    const searchModeRadio = document.querySelector('input[name="search-mode"]:checked');
    const searchMode = searchModeRadio ? searchModeRadio.value : 'google';
    
    if (searchMode === 'ai') {
        const selectedId = userSettings.selectedAi || 'gemini';
        const engine = userSettings.aiEngines.find(e => e.id === selectedId);

        // Apply custom prompt suffix if set
        let finalQuery = query;
        if (userSettings.aiCustomPrompt && userSettings.aiCustomPrompt.trim() !== '') {
            finalQuery = `${finalQuery} ${userSettings.aiCustomPrompt.trim()}`;
        }
        const encodedQuery = encodeURIComponent(finalQuery);

        if (engine && engine.url) {
            let targetUrl = engine.url;
            if (targetUrl.includes('{query}')) {
                targetUrl = targetUrl.replace('{query}', encodedQuery);
            } else if (targetUrl.includes('{q}')) {
                targetUrl = targetUrl.replace('{q}', encodedQuery);
            } else {
                const separator = targetUrl.includes('?') ? '&' : '?';
                targetUrl = `${targetUrl}${separator}q=${encodedQuery}`;
            }
            window.location.href = targetUrl;
        } else {
            // fallback
            window.location.href = `https://www.google.com/search?q=${encodedQuery}&udm=50`;
        }
    } else {
        if (window.chrome && chrome.search && chrome.search.query) {
            chrome.search.query({ text: query, disposition: 'CURRENT_TAB' });
        } else {
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
    }
}

// Expose globally for visual search module to access
window.doSearch = doSearch;

export function initSearchEngine() {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');

    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const imageSearchInput = document.getElementById('image-search-input');
            const hasImage = imageSearchInput && imageSearchInput.files.length > 0;
            const query = searchInput.value.trim();
            
            if (hasImage) {
                const lensForm = document.getElementById('lens-form');
                if (lensForm) lensForm.submit();
            } else if (query) {
                doSearch(query);
            }
        });
    }

    // Click the already-selected mode toggle → trigger search (like pressing Enter)
    const googleLabel = document.querySelector('.google-label');
    const aiLabel = document.querySelector('.ai-label');
    const modeGoogleRadio = document.getElementById('mode-google');
    const modeAiRadio = document.getElementById('mode-ai');

    if (googleLabel) {
        googleLabel.addEventListener('click', () => {
            if (modeGoogleRadio && modeGoogleRadio.checked) {
                const query = searchInput ? searchInput.value.trim() : '';
                if (query) doSearch(query);
            }
        });
    }

    if (aiLabel) {
        aiLabel.addEventListener('click', () => {
            if (modeAiRadio && modeAiRadio.checked) {
                const query = searchInput ? searchInput.value.trim() : '';
                if (query) doSearch(query);
            }
        });
    }
}
