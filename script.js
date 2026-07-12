document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggling
    const themeToggleBtn = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    
    // Check local storage or system preference
    const currentTheme = localStorage.getItem('theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    const setTheme = (theme) => {
        if (theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            document.body.removeAttribute('data-theme');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
        localStorage.setItem('theme', theme);
    };

    setTheme(currentTheme);

    themeToggleBtn.addEventListener('click', () => {
        let theme = document.body.getAttribute('data-theme');
        setTheme(theme === 'dark' ? 'light' : 'dark');
    });

    // Live Clock & Greeting
    const clockElement = document.getElementById('clock');
    const greetingElement = document.getElementById('greeting');
    
    const updateTimeAndGreeting = () => {
        const now = new Date();
        const hour = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        
        clockElement.textContent = `${hour.toString().padStart(2, '0')}:${minutes}`;

        let greeting = 'Good evening.';
        if (hour >= 5 && hour < 12) {
            greeting = 'Good morning.';
        } else if (hour >= 12 && hour < 18) {
            greeting = 'Good afternoon.';
        }
        greetingElement.textContent = greeting;
    };

    updateTimeAndGreeting();
    setInterval(updateTimeAndGreeting, 1000 * 60); // Update every minute

    // Search Handling & Autocomplete
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const suggestionsBox = document.getElementById('search-suggestions');
    
    // Auto-focus search on global type
    document.addEventListener('keydown', (e) => {
        // Ignore if user is already focused on an input element
        if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        
        // Ignore modifier key combos or special keys (like Esc, F5, etc.)
        if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) return;

        // Focus search input
        searchInput.focus();
    });

    let searchHistory = JSON.parse(localStorage.getItem('startpage_search_history')) || [];
    let currentFocus = -1;

    const saveSearch = (query) => {
        if (!query) return;
        searchHistory = searchHistory.filter(q => q !== query); // Remove duplicates
        searchHistory.unshift(query); // Add to front
        if (searchHistory.length > 5) searchHistory.pop(); // Keep only last 5
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
        const searchMode = document.querySelector('input[name="search-mode"]:checked').value;
        if (searchMode === 'ai') {
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}&udm=50&aep=1&ntc=1&csuir=1`;
        } else {
            if (chrome && chrome.search && chrome.search.query) {
                chrome.search.query({ text: query, disposition: 'CURRENT_TAB' });
            } else {
                window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            }
        }
    };

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const imageSearchInput = document.getElementById('image-search-input');
        const hasImage = imageSearchInput && imageSearchInput.files.length > 0;
        const query = searchInput.value.trim();
        
        if (hasImage) {
            document.getElementById('lens-form').submit();
        } else if (query) {
            doSearch(query);
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
                searchInput.value = item.text;
                doSearch(item.text);
            });

            suggestionsBox.appendChild(div);
        });

        suggestionsBox.classList.remove('hidden');
    };

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        clearTimeout(debounceTimer);

        if (!val) {
            // Show just history if empty
            if (searchHistory.length > 0) {
                renderSuggestions(searchHistory.map(q => ({ text: q, isHistory: true })));
            } else {
                suggestionsBox.classList.add('hidden');
            }
            return;
        }

        debounceTimer = setTimeout(() => {
            fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(val)}`)
                .then(response => response.json())
                .then(data => {
                    const results = data[1] || [];
                    
                    // Filter history matches
                    const historyMatches = searchHistory
                        .filter(q => q.toLowerCase().includes(val.toLowerCase()))
                        .map(q => ({ text: q, isHistory: true }));

                    // API matches (excluding ones already in history)
                    const apiMatches = results
                        .filter(q => !historyMatches.some(h => h.text === q))
                        .map(q => ({ text: q, isHistory: false }))
                        .slice(0, 6);

                    renderSuggestions([...historyMatches, ...apiMatches]);
                })
                .catch(() => {
                    // Fallback to history only if offline
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
        if (!searchForm.contains(e.target)) {
            suggestionsBox.classList.add('hidden');
        }
    });

    searchInput.addEventListener('keydown', (e) => {
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

    const addActive = (items) => {
        if (!items) return;
        for (let i = 0; i < items.length; i++) items[i].classList.remove('active');
        if (currentFocus >= items.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = items.length - 1;
        items[currentFocus].classList.add('active');
        searchInput.value = items[currentFocus].querySelector('.suggestion-text').textContent;
    };

    // AI Options Handling
    const aiOptions = document.querySelectorAll('.ai-option');
    aiOptions.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const aiType = e.target.getAttribute('data-ai');
            const query = searchInput.value.trim();
            let url = '';
            
            const encodedQuery = encodeURIComponent(query);
            
            switch(aiType) {
                case 'chatgpt':
                    url = query ? `https://chatgpt.com/?q=${encodedQuery}` : 'https://chatgpt.com/';
                    break;
                case 'gemini':
                    url = query ? `https://gemini.google.com/app?q=${encodedQuery}` : 'https://gemini.google.com/';
                    break;
                case 'claude':
                    url = query ? `https://claude.ai/new?q=${encodedQuery}` : 'https://claude.ai/new';
                    break;
                case 'grok':
                    url = query ? `https://grok.com/?q=${encodedQuery}` : 'https://grok.com/';
                    break;
            }
            
            if (url) {
                if (query) saveSearch(query);
                window.location.href = url;
            }
        });
    });

    // Google Dropdown Handling
    const voiceSearchBtn = document.getElementById('voice-search-btn');
    const imageSearchBtn = document.getElementById('image-search-btn');
    const imageSearchInput = document.getElementById('image-search-input');
    const lensForm = document.getElementById('lens-form');

    if (voiceSearchBtn) {
        let isListening = false;

        // Listen for results from the offscreen document via service worker
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg.type === 'voice-result') {
                searchInput.value = msg.text;
            } else if (msg.type === 'voice-status') {
                if (msg.status === 'listening') {
                    isListening = true;
                    searchInput.placeholder = 'Listening... click mic to stop';
                    voiceSearchBtn.classList.add('listening');
                } else if (msg.status === 'stopped') {
                    isListening = false;
                    searchInput.placeholder = 'What are you looking for?';
                    voiceSearchBtn.classList.remove('listening');
                    searchInput.focus();
                }
            } else if (msg.type === 'voice-error') {
                isListening = false;
                searchInput.placeholder = 'What are you looking for?';
                voiceSearchBtn.classList.remove('listening');
            }
        });

        voiceSearchBtn.addEventListener('click', () => {
            document.getElementById('mode-google').checked = true;
            if (isListening) {
                chrome.runtime.sendMessage({ type: 'voice-stop' });
            } else {
                searchInput.value = '';
                chrome.runtime.sendMessage({ type: 'voice-start' });
            }
        });
    }

    if (imageSearchBtn && imageSearchInput) {
        const imagePreviewContainer = document.getElementById('image-preview-container');
        const imagePreview = document.getElementById('image-preview');
        const clearImageBtn = document.getElementById('clear-image-btn');
        const searchModeWrapper = document.querySelector('.search-mode-wrapper');
        const modeGoogle = document.getElementById('mode-google');

        imageSearchBtn.addEventListener('click', () => {
            imageSearchInput.click();
        });

        imageSearchInput.addEventListener('change', () => {
            if (imageSearchInput.files.length > 0) {
                const file = imageSearchInput.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    imagePreviewContainer.classList.remove('hidden');
                    
                    searchModeWrapper.classList.add('disabled-ai');
                    modeGoogle.checked = true;
                    
                    searchInput.focus();
                };
                reader.readAsDataURL(file);
            }
        });

        if (clearImageBtn) {
            clearImageBtn.addEventListener('click', () => {
                imageSearchInput.value = '';
                imagePreview.src = '';
                imagePreviewContainer.classList.add('hidden');
                searchModeWrapper.classList.remove('disabled-ai');
            });
        }
    }

    // --- Settings & Bookmarks State ---
    const settingsBtn = document.getElementById('settings-toggle');
    const closeSettingsBtn = document.getElementById('close-settings');
    const settingsModal = document.getElementById('settings-modal');
    const toggleAllBookmarks = document.getElementById('toggle-all-bookmarks');
    const toggleContainerWidth = document.getElementById('toggle-container-width');
    const toggleTileWidth = document.getElementById('toggle-tile-width');
    const toggleRememberSearch = document.getElementById('toggle-remember-search');
    const folderTogglesList = document.getElementById('folder-toggles-list');
    const bookmarksContainer = document.getElementById('bookmarks-container');

    // Default settings
    let userSettings = JSON.parse(localStorage.getItem('startpage_settings')) || {
        showBookmarks: true,
        containerWidth: 'full', // 'full' | 'contained'
        tileWidth: 'fixed', // 'fixed' | 'auto'
        hiddenFolders: [], // Array of folder titles that are hidden
        hiddenLinks: [], // Array of link IDs that are hidden
        rememberSearchMode: false,
        lastSearchMode: 'google'
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

    const applyLayoutSettings = () => {
        if (userSettings.containerWidth === 'contained') {
            document.body.setAttribute('data-container-width', 'contained');
        } else {
            document.body.removeAttribute('data-container-width');
        }

        if (userSettings.tileWidth === 'auto') {
            document.body.setAttribute('data-tile-width', 'auto');
        } else {
            document.body.removeAttribute('data-tile-width');
        }
        
        const fabContainer = document.querySelector('.fab-container');
        const visualSearchBtn = document.getElementById('image-search-trigger');
        const googleAppsBtn = document.querySelector('.google-apps-btn');
        
        if (visualSearchBtn) {
            visualSearchBtn.style.display = userSettings.showVisualSearch ? 'flex' : 'none';
        }
        
        if (googleAppsBtn) {
            googleAppsBtn.style.display = userSettings.showGoogleApps ? 'flex' : 'none';
        }

        if (fabContainer) {
            fabContainer.style.display = (userSettings.showVisualSearch || userSettings.showGoogleApps) ? 'flex' : 'none';
        }
        
        const visualSearchPanel = document.getElementById('visual-search-panel');
        if (!userSettings.showVisualSearch && visualSearchPanel) {
            visualSearchPanel.classList.remove('active');
        }
    };

    const saveSettings = () => {
        localStorage.setItem('startpage_settings', JSON.stringify(userSettings));
        applyLayoutSettings();
        loadAndRenderBookmarks();
    };

    // Modal Togglers
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });
    }
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.add('hidden');
            }
        });
    }

    // Master Toggle Event
    if (toggleAllBookmarks) {
        toggleAllBookmarks.checked = userSettings.showBookmarks;
        toggleAllBookmarks.addEventListener('change', (e) => {
            userSettings.showBookmarks = e.target.checked;
            saveSettings();
        });
    }

    // Container Width Toggle Event
    if (toggleContainerWidth) {
        toggleContainerWidth.checked = userSettings.containerWidth === 'full';
        toggleContainerWidth.addEventListener('change', (e) => {
            userSettings.containerWidth = e.target.checked ? 'full' : 'contained';
            saveSettings();
        });
    }

    // Tile Width Toggle Event
    if (toggleTileWidth) {
        toggleTileWidth.checked = userSettings.tileWidth === 'auto';
        toggleTileWidth.addEventListener('change', (e) => {
            userSettings.tileWidth = e.target.checked ? 'auto' : 'fixed';
            saveSettings();
        });
    }

    // Remember Search Mode Toggle Event
    if (toggleRememberSearch) {
        toggleRememberSearch.checked = userSettings.rememberSearchMode;
        toggleRememberSearch.addEventListener('change', (e) => {
            userSettings.rememberSearchMode = e.target.checked;
            if (!userSettings.rememberSearchMode) {
                userSettings.lastSearchMode = 'google'; // Reset to google
                const googleMode = document.getElementById('mode-google');
                if (googleMode) googleMode.checked = true;
            } else {
                const checkedMode = document.querySelector('input[name="search-mode"]:checked');
                if (checkedMode) userSettings.lastSearchMode = checkedMode.value;
            }
            saveSettings();
        });
    }

    // Listen for search mode changes to save if remember is true
    const searchModeRadios = document.querySelectorAll('input[name="search-mode"]');
    searchModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
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

    const renderBookmarks = (bookmarkTreeNodes) => {
        bookmarksContainer.innerHTML = ''; // Clear container
        
        // Track open state of folders in settings before clearing
        const openFolders = [];
        if (folderTogglesList) {
            folderTogglesList.querySelectorAll('details').forEach(details => {
                if (details.open) {
                    const titleEl = details.querySelector('.folder-name');
                    if (titleEl) openFolders.push(titleEl.innerText);
                }
            });
            folderTogglesList.innerHTML = ''; // Clear settings list
        }
        if (!userSettings.showBookmarks) {
            bookmarksContainer.style.display = 'none';
            return;
        } else {
            bookmarksContainer.style.display = 'flex';
        }

        // Helper to find the "Bookmarks Bar"
        let mainFolder = null;
        if (bookmarkTreeNodes[0] && bookmarkTreeNodes[0].children) {
            const children = bookmarkTreeNodes[0].children;
            mainFolder = children.find(node => node.title === 'Bookmarks Bar' || node.title === 'Bookmarks bar') || children[0];
        }

        if (!mainFolder || !mainFolder.children) {
            bookmarksContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; width: 100%;">No bookmarks found.</p>';
            return;
        }

        const folders = [];
        const extractFolders = (node, path = '') => {
            const currentPath = path ? `${path} / ${node.title}` : node.title;
            const links = node.children ? node.children.filter(child => child.url) : [];
            const subFolders = node.children ? node.children.filter(child => child.children) : [];
            
            if (links.length > 0) {
                folders.push({
                    title: currentPath,
                    children: links,
                    isPseudo: false
                });
            }
            
            subFolders.forEach(sub => extractFolders(sub, currentPath));
        };

        mainFolder.children.forEach(child => {
            if (child.children) {
                extractFolders(child, '');
            }
        });
        
        // Find loose links
        const looseLinks = mainFolder.children.filter(node => node.url);
        if (looseLinks.length > 0) {
            folders.push({
                title: 'Other Bookmarks',
                children: looseLinks,
                isPseudo: true
            });
        }
        
        if (folders.length === 0) {
            bookmarksContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; width: 100%;">Please create some bookmark folders or add bookmarks in your Bookmarks Bar.</p>';
            return;
        }

        folders.forEach(folder => {
            const folderLinks = folder.children;
            if (folderLinks.length === 0 && !folder.isPseudo) return;

            // Build the settings toggle for this folder
            if (folderTogglesList) {
                const isHidden = userSettings.hiddenFolders.includes(folder.title);
                
                const details = document.createElement('details');
                details.className = 'folder-settings';
                if (openFolders.includes(folder.title)) {
                    details.open = true;
                }
                
                const summary = document.createElement('summary');
                
                const headerDiv = document.createElement('div');
                headerDiv.style.display = 'flex';
                headerDiv.style.justifyContent = 'space-between';
                headerDiv.style.flex = '1';
                headerDiv.style.alignItems = 'center';
                headerDiv.style.marginRight = '1rem';
                
                headerDiv.innerHTML = `
                    <span class="folder-name">${folder.title}</span>
                    <label class="switch" onclick="event.stopPropagation()">
                        <input type="checkbox" value="${folder.title}" ${!isHidden ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                `;

                const arrowSpan = document.createElement('span');
                arrowSpan.className = 'folder-arrow';
                arrowSpan.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

                summary.appendChild(headerDiv);
                summary.appendChild(arrowSpan);
                details.appendChild(summary);

                const folderCheckbox = headerDiv.querySelector('input');
                folderCheckbox.addEventListener('change', (e) => {
                    const title = e.target.value;
                    if (e.target.checked) {
                        userSettings.hiddenFolders = userSettings.hiddenFolders.filter(f => f !== title);
                    } else {
                        if (!userSettings.hiddenFolders.includes(title)) userSettings.hiddenFolders.push(title);
                    }
                    saveSettings();
                });

                // Add individual links underneath
                const nestedList = document.createElement('div');
                nestedList.className = 'nested-links-list';

                folderLinks.forEach(link => {
                    // Provide a fallback ID for links if Chrome's ID is missing for some reason
                    const linkId = link.id || link.url;
                    const isLinkHidden = userSettings.hiddenLinks.includes(linkId);
                    
                    const linkItem = document.createElement('div');
                    linkItem.className = 'setting-item';
                    linkItem.innerHTML = `
                        <span title="${link.title}">${link.title}</span>
                        <label class="switch small">
                            <input type="checkbox" data-link-id="${linkId}" ${!isLinkHidden ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    `;

                    const linkCheckbox = linkItem.querySelector('input');
                    linkCheckbox.addEventListener('change', (e) => {
                        const id = e.target.getAttribute('data-link-id');
                        if (e.target.checked) {
                            userSettings.hiddenLinks = userSettings.hiddenLinks.filter(l => l !== id);
                        } else {
                            if (!userSettings.hiddenLinks.includes(id)) userSettings.hiddenLinks.push(id);
                        }
                        saveSettings();
                    });

                    nestedList.appendChild(linkItem);
                });

                details.appendChild(nestedList);
                folderTogglesList.appendChild(details);
            }

            // Only render if not hidden by user
            if (userSettings.hiddenFolders.includes(folder.title)) return;

            const visibleLinks = folderLinks.filter(link => {
                const linkId = link.id || link.url;
                return !userSettings.hiddenLinks.includes(linkId);
            });
            
            // If all links are toggled off inside this folder, hide the whole tile
            if (visibleLinks.length === 0) return;

            const groupDiv = document.createElement('div');
            groupDiv.className = 'bookmark-group glass-panel';

            const title = document.createElement('h3');
            title.textContent = folder.title;
            groupDiv.appendChild(title);

            const titledLinks = visibleLinks.filter(link => link.title.trim() !== '');
            const untitledLinks = visibleLinks.filter(link => link.title.trim() === '');

            if (titledLinks.length > 0) {
                const linksDiv = document.createElement('div');
                linksDiv.className = 'bookmark-links';

                titledLinks.forEach(link => {
                    const a = document.createElement('a');
                    a.href = link.url;
                    a.className = 'bookmark-link';

                    let domain = '';
                    try {
                        domain = new URL(link.url).hostname;
                    } catch (e) {}

                    const defaultFavicon = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';

                    const urlObj = new URL(chrome.runtime.getURL("/_favicon/"));
                    urlObj.searchParams.set("pageUrl", link.url);
                    urlObj.searchParams.set("size", "64");
                    
                    const img = document.createElement('img');
                    img.src = urlObj.toString();
                    img.onerror = () => { img.src = defaultFavicon; };
                    img.alt = link.title;
                    img.className = 'favicon';

                    const span = document.createElement('span');
                    span.textContent = link.title; 

                    a.appendChild(img);
                    a.appendChild(span);
                    linksDiv.appendChild(a);
                });
                groupDiv.appendChild(linksDiv);
            }

            if (untitledLinks.length > 0) {
                const gridDiv = document.createElement('div');
                gridDiv.className = 'bookmark-icons-grid';

                untitledLinks.forEach(link => {
                    const a = document.createElement('a');
                    a.href = link.url;
                    a.className = 'bookmark-icon-only';
                    a.title = new URL(link.url).hostname; // Fallback tooltip for icon only

                    let domain = '';
                    try {
                        domain = new URL(link.url).hostname;
                    } catch (e) {}

                    const defaultFavicon = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';

                    const urlObj = new URL(chrome.runtime.getURL("/_favicon/"));
                    urlObj.searchParams.set("pageUrl", link.url);
                    urlObj.searchParams.set("size", "64");
                    
                    const img = document.createElement('img');
                    img.src = urlObj.toString();
                    img.onerror = () => { img.src = defaultFavicon; };
                    img.className = 'favicon';

                    a.appendChild(img);
                    gridDiv.appendChild(a);
                });
                groupDiv.appendChild(gridDiv);
            }

            bookmarksContainer.appendChild(groupDiv);
        });
    };

    const loadAndRenderBookmarks = () => {
        if (window.chrome && chrome.bookmarks) {
            chrome.bookmarks.getTree(renderBookmarks);
        } else {
            bookmarksContainer.innerHTML = `
                <div class="bookmark-group glass-panel" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <h3>Extension Required</h3>
                    <p style="color: var(--text-secondary); margin-top: 1rem;">
                        Load this folder as an "Unpacked Extension" in Chrome via <code>chrome://extensions</code> to view your actual bookmarks.
                    </p>
                </div>
            `;
        }
    };

    // Initial load
    applyLayoutSettings();
    loadAndRenderBookmarks();

    // Map global vertical scroll to horizontal scroll for bookmarks
    window.addEventListener('wheel', (e) => {
        // Ignore pure horizontal scrolls
        if (e.deltaY === 0) return;

        // Check if user is scrolling inside a vertical scroll container (like the bookmark links)
        const isInsideBookmarkLinks = e.target.closest('.bookmark-links');
        const isInsideSettingsModal = e.target.closest('.modal-content');
        
        // If inside a vertical scrolling area, don't hijack the scroll
        if (isInsideBookmarkLinks || isInsideSettingsModal) {
            return;
        }

        // Otherwise, map vertical scroll to horizontal scroll on the container
        if (bookmarksContainer) {
            bookmarksContainer.scrollLeft += e.deltaY;
            e.preventDefault(); // Prevent default vertical scroll
        }
    }, { passive: false });

    // FAB Buttons Settings Toggles
    const toggleVisualSearch = document.getElementById('toggle-visual-search');
    if (toggleVisualSearch) {
        toggleVisualSearch.checked = userSettings.showVisualSearch;
        toggleVisualSearch.addEventListener('change', (e) => {
            userSettings.showVisualSearch = e.target.checked;
            saveSettings();
        });
    }

    const toggleGoogleApps = document.getElementById('toggle-google-apps');
    if (toggleGoogleApps) {
        toggleGoogleApps.checked = userSettings.showGoogleApps;
        toggleGoogleApps.addEventListener('change', (e) => {
            userSettings.showGoogleApps = e.target.checked;
            saveSettings();
        });
    }

    // Panels Logic
    const imageSearchTrigger = document.getElementById('image-search-trigger');
    const visualSearchPanel = document.getElementById('visual-search-panel');
    const googleAppsTrigger = document.getElementById('google-apps-trigger');
    const googleAppsPanel = document.getElementById('google-apps-panel');
    const modalDragDrop = document.getElementById('modal-drag-drop');
    const modalDragContent = document.getElementById('modal-drag-content');
    const modalPreviewContainer = document.getElementById('modal-preview-container');
    const modalImagePreview = document.getElementById('modal-image-preview');
    const modalClearImageBtn = document.getElementById('modal-clear-image-btn');
    const modalTextInput = document.getElementById('modal-text-input');
    const providerBtns = document.querySelectorAll('.search-provider-btn');
    // Note: imageSearchInput and lensForm are already defined earlier

    if (imageSearchTrigger && visualSearchPanel) {
        imageSearchTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            visualSearchPanel.classList.toggle('active');
            imageSearchTrigger.classList.toggle('active');
            if (googleAppsPanel) googleAppsPanel.classList.remove('active');
            if (googleAppsTrigger) googleAppsTrigger.classList.remove('active');
        });
    }

    if (googleAppsTrigger && googleAppsPanel) {
        googleAppsTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            googleAppsPanel.classList.toggle('active');
            googleAppsTrigger.classList.toggle('active');
            if (visualSearchPanel) visualSearchPanel.classList.remove('active');
            if (imageSearchTrigger) imageSearchTrigger.classList.remove('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (visualSearchPanel && visualSearchPanel.classList.contains('active') && 
            !visualSearchPanel.contains(e.target) && 
            !(imageSearchTrigger && imageSearchTrigger.contains(e.target))) {
            visualSearchPanel.classList.remove('active');
            if (imageSearchTrigger) imageSearchTrigger.classList.remove('active');
        }
        if (googleAppsPanel && googleAppsPanel.classList.contains('active') && 
            !googleAppsPanel.contains(e.target) && 
            !(googleAppsTrigger && googleAppsTrigger.contains(e.target))) {
            googleAppsPanel.classList.remove('active');
            if (googleAppsTrigger) googleAppsTrigger.classList.remove('active');
        }
    });

    if (modalDragDrop && imageSearchInput) {
        modalDragDrop.addEventListener('click', (e) => {
            if (e.target !== modalClearImageBtn && !modalClearImageBtn.contains(e.target)) {
                imageSearchInput.click();
            }
        });

        modalDragDrop.addEventListener('dragover', (e) => {
            e.preventDefault();
            modalDragDrop.classList.add('drag-over');
        });

        modalDragDrop.addEventListener('dragleave', () => {
            modalDragDrop.classList.remove('drag-over');
        });

        modalDragDrop.addEventListener('drop', (e) => {
            e.preventDefault();
            modalDragDrop.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    imageSearchInput.files = dt.files;
                    imageSearchInput.dispatchEvent(new Event('change'));
                }
            }
        });

        imageSearchInput.addEventListener('change', () => {
            if (imageSearchInput.files.length > 0) {
                const file = imageSearchInput.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (modalImagePreview) modalImagePreview.src = e.target.result;
                    if (modalDragContent) modalDragContent.classList.add('hidden');
                    if (modalPreviewContainer) modalPreviewContainer.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });

        if (modalClearImageBtn) {
            modalClearImageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                imageSearchInput.value = '';
                if (modalImagePreview) modalImagePreview.src = '';
                if (modalPreviewContainer) modalPreviewContainer.classList.add('hidden');
                if (modalDragContent) modalDragContent.classList.remove('hidden');
            });
        }
    }

    const getBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    if (providerBtns && lensForm) {
        providerBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const provider = btn.getAttribute('data-provider');
                const hasImage = imageSearchInput.files.length > 0;
                const textQuery = modalTextInput ? modalTextInput.value.trim() : '';
                
                if (!hasImage) {
                    if (textQuery && typeof doSearch === 'function') doSearch(textQuery);
                    return;
                }

                const file = imageSearchInput.files[0];
                const oldHiddens = lensForm.querySelectorAll('input[type="hidden"]');
                oldHiddens.forEach(el => el.remove());

                if (provider === 'google') {
                    lensForm.action = 'https://lens.google.com/upload';
                    imageSearchInput.name = 'encoded_image';
                    lensForm.submit();
                } else if (provider === 'bing') {
                    try {
                        const base64DataUrl = await getBase64(file);
                        const base64Str = base64DataUrl.split(',')[1];
                        
                        lensForm.action = 'https://www.bing.com/images/search?view=detailv2&iss=sbiupload';
                        imageSearchInput.removeAttribute('name');
                        
                        const cbirInput = document.createElement('input');
                        cbirInput.type = 'hidden';
                        cbirInput.name = 'cbir';
                        cbirInput.value = 'sbi';
                        lensForm.appendChild(cbirInput);
                        
                        const imgBinInput = document.createElement('input');
                        imgBinInput.type = 'hidden';
                        imgBinInput.name = 'imageBin';
                        imgBinInput.value = base64Str;
                        lensForm.appendChild(imgBinInput);
                        
                        lensForm.submit();
                    } catch (err) {
                        console.error("Error processing image for Bing", err);
                    }
                } else if (provider === 'yandex') {
                    try {
                        const formData = new FormData();
                        formData.append('upfile', file);
                        
                        const requestJson = JSON.stringify({blocks: [{block: "b-page_type_search-by-image__link"}]});
                        const res = await fetch(`https://yandex.com/images/search?rpt=imageview&format=json&request=${encodeURIComponent(requestJson)}`, {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (res.ok) {
                            const data = await res.json();
                            const cbirId = data?.blocks?.[0]?.params?.cbirId;
                            if (cbirId) {
                                window.location.href = `https://yandex.com/images/search?rpt=imageview&cbir_id=${cbirId}`;
                            } else {
                                console.error("No cbirId returned from Yandex");
                            }
                        }
                    } catch (err) {
                        console.error("Yandex upload error:", err);
                    }
                }
            });
        });
    }

});
