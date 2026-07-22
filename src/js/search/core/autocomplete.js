import { getSearchHistory, doSearch } from './search-engine.js';
import { userSettings } from '../../settings/index.js';

export function initAutocomplete() {
    const searchInput = document.getElementById('search-input');
    const searchSubmitBtn = document.getElementById('search-submit-btn');
    const suggestionsBox = document.getElementById('search-suggestions');
    const searchForm = document.getElementById('search-form');

    let currentFocus = -1;

    // Auto-focus search on global type
    document.addEventListener('keydown', (e) => {
        if (!userSettings.kbdAutofocus) return;
        if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) return;
        if (searchInput) searchInput.focus();
    });

    // Escape key clears input if configured
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && userSettings.kbdEscClear) {
            if (searchInput && document.activeElement === searchInput) {
                searchInput.value = '';
                if (suggestionsBox) suggestionsBox.classList.add('hidden');
            }
        }
    });

    const clockIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    const searchIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

    const renderSuggestions = (suggestions) => {
        if (!suggestionsBox) return;
        suggestionsBox.innerHTML = '';
        currentFocus = -1;

        if (suggestions.length === 0) {
            suggestionsBox.classList.add('hidden');
            return;
        }

        suggestions.forEach(item => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            
            const iconSpan = document.createElement('span');
            iconSpan.className = 'suggestion-icon';
            iconSpan.innerHTML = item.isHistory ? clockIcon : searchIconSvg;

            const textSpan = document.createElement('span');
            textSpan.className = 'suggestion-text';
            textSpan.textContent = item.text;

            const typeSpan = document.createElement('span');
            typeSpan.className = 'suggestion-type';
            typeSpan.textContent = item.isHistory ? 'History' : '';

            div.appendChild(iconSpan);
            div.appendChild(textSpan);
            div.appendChild(typeSpan);

            div.addEventListener('click', () => {
                if (searchInput) searchInput.value = item.text;
                doSearch(item.text);
            });

            suggestionsBox.appendChild(div);
        });

        suggestionsBox.classList.remove('hidden');
    };

    let debounceTimer;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (searchSubmitBtn) searchSubmitBtn.classList.toggle('hidden', val.length === 0);
            clearTimeout(debounceTimer);

            const limit = userSettings.historyCount || 5;
            const searchHistory = getSearchHistory();

            if (!val) {
                // No query typed — show recent history up to limit
                if (searchHistory.length > 0) {
                    renderSuggestions(
                        searchHistory.slice(0, limit).map(q => ({ text: q, isHistory: true }))
                    );
                } else if (suggestionsBox) {
                    suggestionsBox.classList.add('hidden');
                }
                return;
            }

            // History matches for the current query
            const historyMatches = searchHistory
                .filter(q => q.toLowerCase().includes(val.toLowerCase()))
                .map(q => ({ text: q, isHistory: true }));

            if (!userSettings.autocompleteSuggestions) {
                // Only history, capped to limit
                renderSuggestions(historyMatches.slice(0, limit));
                return;
            }

            debounceTimer = setTimeout(() => {
                fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(val)}`)
                    .then(response => response.json())
                    .then(data => {
                        const results = data[1] || [];

                        // Deduplicate history from API results; fill remaining slots with API items
                        const cappedHistory = historyMatches.slice(0, limit);
                        const remainingSlots = limit - cappedHistory.length;

                        const apiMatches = results
                            .filter(q => !cappedHistory.some(h => h.text === q))
                            .slice(0, remainingSlots)
                            .map(q => ({ text: q, isHistory: false }));

                        renderSuggestions([...cappedHistory, ...apiMatches]);
                    })
                    .catch(() => {
                        renderSuggestions(historyMatches.slice(0, limit));
                    });
            }, 150);
        });

        searchInput.addEventListener('focus', () => {
            const val = searchInput.value.trim();
            const limit = userSettings.historyCount || 5;
            const searchHistory = getSearchHistory();
            if (!val && searchHistory.length > 0) {
                renderSuggestions(
                    searchHistory.slice(0, limit).map(q => ({ text: q, isHistory: true }))
                );
            } else if (val) {
                searchInput.dispatchEvent(new Event('input'));
            }
        });

        document.addEventListener('click', (e) => {
            if (searchForm && !searchForm.contains(e.target) && suggestionsBox) {
                suggestionsBox.classList.add('hidden');
            }
        });

        searchInput.addEventListener('keydown', (e) => {
            if (!suggestionsBox) return;
            const items = suggestionsBox.querySelectorAll('.suggestion-item');
            if (items.length === 0 || suggestionsBox.classList.contains('hidden')) return;

            if (e.key === 'ArrowDown') {
                currentFocus++;
                addActive(items);
                e.preventDefault(); 
            } else if (e.key === 'ArrowUp') {
                currentFocus--;
                addActive(items);
                e.preventDefault();
            } else if (e.key === 'Enter') {
                if (currentFocus > -1) {
                    e.preventDefault(); 
                    items[currentFocus].click();
                }
            }
        });
    }

    const addActive = (items) => {
        if (!items || !searchInput) return;
        for (let i = 0; i < items.length; i++) items[i].classList.remove('active');
        if (currentFocus >= items.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = items.length - 1;
        items[currentFocus].classList.add('active');
        searchInput.value = items[currentFocus].querySelector('.suggestion-text').textContent;
    };
}
