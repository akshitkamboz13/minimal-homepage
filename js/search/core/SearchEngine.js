import { userSettings } from '../../state/Settings.js';

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
        const ai = userSettings.selectedAi;
        const encodedQuery = encodeURIComponent(query);
        if (ai === 'bing') {
            window.location.href = `https://www.bing.com/copilotsearch?q=${encodedQuery}`;
        } else if (ai === 'google') {
            window.location.href = `https://www.google.com/search?q=${encodedQuery}&udm=50&aep=1&ntc=1&csuir=1`;
        } else if (ai === 'chatgpt') {
            window.location.href = `https://chatgpt.com/?prompt=${encodedQuery}`;
        } else if (ai === 'grok') {
            window.location.href = `https://grok.com/?q=${encodedQuery}`;
        } else if (ai === 'claude') {
            window.location.href = `https://claude.ai/new?q=${encodedQuery}`;
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
}
