import { userSettings, saveSettings, onSettingsChanged } from '../state/settings.js';

export function initBookmarks() {
    const folderTogglesList = document.getElementById('folder-toggles-list');
    const bookmarksContainer = document.getElementById('bookmarks-container');

    const renderBookmarks = (bookmarkTreeNodes) => {
        if (!bookmarksContainer) return;
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

            if (userSettings.hiddenFolders.includes(folder.title)) return;

            const visibleLinks = folderLinks.filter(link => {
                const linkId = link.id || link.url;
                return !userSettings.hiddenLinks.includes(linkId);
            });
            
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

                    const defaultFavicon = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';

                    let img = null;
                    if (window.chrome && chrome.runtime && chrome.runtime.getURL) {
                        const urlObj = new URL(chrome.runtime.getURL("/_favicon/"));
                        urlObj.searchParams.set("pageUrl", link.url);
                        urlObj.searchParams.set("size", "64");
                        
                        img = document.createElement('img');
                        img.src = urlObj.toString();
                        img.onerror = () => { img.src = defaultFavicon; };
                        img.alt = link.title;
                        img.className = 'favicon';
                    }

                    const span = document.createElement('span');
                    span.textContent = link.title; 

                    if (img) a.appendChild(img);
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
                    try {
                        a.title = new URL(link.url).hostname;
                    } catch(e) {
                        a.title = link.url;
                    }

                    const defaultFavicon = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';

                    if (window.chrome && chrome.runtime && chrome.runtime.getURL) {
                        const urlObj = new URL(chrome.runtime.getURL("/_favicon/"));
                        urlObj.searchParams.set("pageUrl", link.url);
                        urlObj.searchParams.set("size", "64");
                        
                        const img = document.createElement('img');
                        img.src = urlObj.toString();
                        img.onerror = () => { img.src = defaultFavicon; };
                        img.className = 'favicon';
                        a.appendChild(img);
                    } else {
                        a.innerHTML = `<img src="${defaultFavicon}" class="favicon" />`;
                    }

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
            if (bookmarksContainer) {
                bookmarksContainer.innerHTML = `
                    <div class="bookmark-group glass-panel" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                        <h3>Extension Required</h3>
                        <p style="color: var(--text-secondary); margin-top: 1rem;">
                            Load this folder as an "Unpacked Extension" in Chrome via <code>chrome://extensions</code> to view your actual bookmarks.
                        </p>
                    </div>
                `;
            }
        }
    };

    loadAndRenderBookmarks();

    onSettingsChanged(() => {
        loadAndRenderBookmarks();
    });

    // Map global vertical scroll to horizontal scroll for bookmarks
    window.addEventListener('wheel', (e) => {
        if (e.deltaY === 0) return;

        const isInsideBookmarkLinks = e.target.closest('.bookmark-links');
        const isInsideSettingsModal = e.target.closest('.modal-content');
        const isInsideGoogleApps = e.target.closest('.google-apps-panel');
        
        if (isInsideBookmarkLinks || isInsideSettingsModal || isInsideGoogleApps) {
            return;
        }

        if (bookmarksContainer) {
            bookmarksContainer.scrollLeft += e.deltaY;
            e.preventDefault(); 
        }
    }, { passive: false });
}
