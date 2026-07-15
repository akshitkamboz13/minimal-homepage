import { userSettings, saveSettings } from '../state/settings.js';

export function renderBookmarksSettings(folders, openFolders) {
    const folderTogglesList = document.getElementById('folder-toggles-list');
    if (!folderTogglesList) return;

    folders.forEach(folder => {
        const folderLinks = folder.children;
        if (folderLinks.length === 0 && !folder.isPseudo) return;

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
    });
}
