import { userSettings, saveSettings } from '../settings-state.js';

export async function initAbout(modal) {
    try {
        let manifest = null;

        if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getManifest === 'function') {
            manifest = chrome.runtime.getManifest();
        }

        if (!manifest) {
            const response = await fetch('../manifest.json');
            manifest = await response.json();
        }

        const titleEl = modal ? modal.querySelector('.about-app-title') : document.querySelector('.about-app-title');
        const versionEl = modal ? modal.querySelector('.about-app-version') : document.querySelector('.about-app-version');
        const descEl = modal ? modal.querySelector('.about-app-desc') : document.querySelector('.about-app-desc');
        const authorEl = modal ? modal.querySelector('.about-app-author') : document.querySelector('.about-app-author');
        const repoLinkEl = modal ? modal.querySelector('#about-repo-link') : document.querySelector('#about-repo-link');
        const siteLinkEl = modal ? modal.querySelector('#about-site-link') : document.querySelector('#about-site-link');
        const contribLinkEl = modal ? modal.querySelector('#about-contrib-link') : document.querySelector('#about-contrib-link');
        const inputAppName = modal ? modal.querySelector('#setting-app-name') : document.querySelector('#setting-app-name');

        const defaultAppName = (manifest && manifest.name) ? manifest.name : 'Home by si4k';
        const activeName = userSettings.appName || defaultAppName;

        if (titleEl) titleEl.textContent = activeName;
        document.title = activeName;

        if (manifest) {
            if (versionEl && manifest.version) versionEl.textContent = `v${manifest.version}`;
            if (descEl && manifest.description) descEl.textContent = manifest.description;
            if (authorEl) authorEl.textContent = manifest.author || 'Akshit Kamboj (si4k)';
            if (repoLinkEl && manifest.homepage_url) repoLinkEl.href = manifest.homepage_url;
        }

        if (siteLinkEl) siteLinkEl.href = 'https://www.si4k.online/projects/minimalist-homepage';
        if (contribLinkEl) contribLinkEl.href = 'https://www.si4k.online/contribution';

        if (inputAppName) {
            inputAppName.value = userSettings.appName || defaultAppName;
            inputAppName.addEventListener('input', (e) => {
                const val = e.target.value.trim() || defaultAppName;
                userSettings.appName = e.target.value;
                saveSettings();
                if (titleEl) titleEl.textContent = val;
                document.title = val;
            });
        }
    } catch (e) {
        console.warn('Could not sync metadata from manifest.json:', e);
    }
}
