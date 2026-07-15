export function initBookmarksScroll() {
    const bookmarksContainer = document.getElementById('bookmarks-container');

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
