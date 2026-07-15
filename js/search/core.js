import { userSettings, saveSettings } from '../state/settings.js';

export function initSearch() {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchSubmitBtn = document.getElementById('search-submit-btn');
    const suggestionsBox = document.getElementById('search-suggestions');
    
    // Auto-focus search on global type
    document.addEventListener('keydown', (e) => {
        if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) return;
        if (searchInput) searchInput.focus();
    });

    let searchHistory = JSON.parse(localStorage.getItem('startpage_search_history')) || [];
    let currentFocus = -1;

    const saveSearch = (query) => {
        if (!query) return;
        searchHistory = searchHistory.filter(q => q !== query);
        searchHistory.unshift(query);
        if (searchHistory.length > 5) searchHistory.pop();
        localStorage.setItem('startpage_search_history', JSON.stringify(searchHistory));
    };

    const doSearch = (query) => {
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
    };

    // Expose globally for visual search module to access
    window.doSearch = doSearch;

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
                searchInput.value = item.text;
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

            if (!val) {
                if (searchHistory.length > 0) {
                    renderSuggestions(searchHistory.map(q => ({ text: q, isHistory: true })));
                } else if (suggestionsBox) {
                    suggestionsBox.classList.add('hidden');
                }
                return;
            }

            debounceTimer = setTimeout(() => {
                fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(val)}`)
                    .then(response => response.json())
                    .then(data => {
                        const results = data[1] || [];
                        const historyMatches = searchHistory
                            .filter(q => q.toLowerCase().includes(val.toLowerCase()))
                            .map(q => ({ text: q, isHistory: true }));

                        const apiMatches = results
                            .filter(q => !historyMatches.some(h => h.text === q))
                            .map(q => ({ text: q, isHistory: false }))
                            .slice(0, 6);

                        renderSuggestions([...historyMatches, ...apiMatches]);
                    })
                    .catch(() => {
                        const historyMatches = searchHistory
                            .filter(q => q.toLowerCase().includes(val.toLowerCase()))
                            .map(q => ({ text: q, isHistory: true }));
                        renderSuggestions(historyMatches);
                    });
            }, 150);
        });

        searchInput.addEventListener('focus', () => {
            const val = searchInput.value.trim();
            if (!val && searchHistory.length > 0) {
                renderSuggestions(searchHistory.map(q => ({ text: q, isHistory: true })));
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

    const aiLabel = document.querySelector('.ai-label');
    const modeAiRadio = document.getElementById('mode-ai');
    
    const updateAiLabel = () => {
        if (userSettings.selectedAi && userSettings.selectedAiName && aiLabel) {
            aiLabel.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> ${userSettings.selectedAiName}`;
        }
    };
    updateAiLabel();

    window.addEventListener('resize', updateSlider);
    setTimeout(updateSlider, 50);

    if (aiLabel) {
        aiLabel.addEventListener('click', (e) => {
            if (!userSettings.selectedAi) {
                e.preventDefault();
            }
        });
    }

    const aiOptions = document.querySelectorAll('.ai-option');
    aiOptions.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const aiType = e.target.getAttribute('data-ai');
            const aiName = e.target.textContent;
            
            userSettings.selectedAi = aiType;
            userSettings.selectedAiName = aiName;
            saveSettings();
            
            updateAiLabel();
            if (modeAiRadio) modeAiRadio.checked = true;
            updateSlider();
            if (searchInput) searchInput.focus();
        });
    });

    // Listen for search mode changes to save if remember is true
    const searchModeRadios = document.querySelectorAll('input[name="search-mode"]');
    searchModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateSlider();
            if (userSettings.rememberSearchMode) {
                userSettings.lastSearchMode = e.target.value;
                saveSettings();
            }
        });
    });

    // Apply remembered search mode on load
    if (userSettings.rememberSearchMode && userSettings.lastSearchMode) {
        const targetRadio = document.getElementById(`mode-${userSettings.lastSearchMode}`);
        if (targetRadio) {
            targetRadio.checked = true;
        }
    }
}

export function updateSlider() {
    const slider = document.querySelector('.mode-slider');
    const checkedRadio = document.querySelector('input[name="search-mode"]:checked');
    if (!slider || !checkedRadio) return;
    
    const activeLabel = checkedRadio.value === 'google' 
        ? document.querySelector('.google-label') 
        : document.querySelector('.ai-dropdown-wrapper');
        
    if (activeLabel) {
        slider.style.width = `${activeLabel.offsetWidth}px`;
        slider.style.transform = `translateX(${activeLabel.offsetLeft}px)`;
    }
}
