export function initBookmarksScroll() {
    const bookmarksContainer = document.getElementById('bookmarks-container');

    // Map global vertical scroll to horizontal scroll for bookmarks
    window.addEventListener('wheel', (e) => {
        if (e.deltaY === 0) return;

        const isInsideBookmarks = e.target.closest('#bookmarks-container');
        const isInsideBookmarkLinks = e.target.closest('.bookmark-links');
        
        // Only scroll bookmarks horizontally when hovering over the bookmarks container,
        // but not when scrolling the vertical links list inside folders.
        if (!isInsideBookmarks || isInsideBookmarkLinks) {
            return;
        }

        if (bookmarksContainer) {
            bookmarksContainer.scrollLeft += e.deltaY;
            e.preventDefault(); 
        }
    }, { passive: false });
}
