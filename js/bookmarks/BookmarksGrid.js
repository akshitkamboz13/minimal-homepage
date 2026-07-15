import { userSettings } from '../state/Settings.js';

export function renderBookmarksGrid(folders, bookmarksContainer) {
    folders.forEach(folder => {
        const folderLinks = folder.children;
        if (folderLinks.length === 0 && !folder.isPseudo) return;
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
}
