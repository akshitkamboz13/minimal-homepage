import { userSettings, onSettingsChanged } from '../state/settings.js';
import { renderBookmarksSettings } from './BookmarksSettings.js';
import { renderBookmarksGrid } from './BookmarksGrid.js';
import { initBookmarksScroll } from './BookmarksScroll.js';

export function initBookmarks() {
    const folderTogglesList = document.getElementById('folder-toggles-list');
    const bookmarksContainer = document.getElementById('bookmarks-container');

    const renderBookmarks = (bookmarkTreeNodes) => {
        if (!bookmarksContainer) return;
        bookmarksContainer.innerHTML = ''; 
        
        // Track open state of folders in settings before clearing
        const openFolders = [];
        if (folderTogglesList) {
            folderTogglesList.querySelectorAll('details').forEach(details => {
                if (details.open) {
                    const titleEl = details.querySelector('.folder-name');
                    if (titleEl) openFolders.push(titleEl.innerText);
                }
            });
            folderTogglesList.innerHTML = '';
        }
        
        if (!userSettings.showBookmarks) {
            bookmarksContainer.style.display = 'none';
            return;
        } else {
            bookmarksContainer.style.display = 'flex';
        }

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

        // 1. Render the settings UI
        renderBookmarksSettings(folders, openFolders);

        // 2. Render the actual grid
        renderBookmarksGrid(folders, bookmarksContainer);
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

    initBookmarksScroll();
}
