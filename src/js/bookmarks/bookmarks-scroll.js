export function initBookmarksScroll() {
    const bookmarksContainer = document.getElementById('bookmarks-container');
    let isScrolling = false;

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
            e.preventDefault();
            if (isScrolling) return;

            isScrolling = true;
            // Scroll by one card column step: card width (260px) + gap (24px) = 284px
            const scrollAmount = e.deltaY > 0 ? 284 : -284;
            bookmarksContainer.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });

            setTimeout(() => {
                isScrolling = false;
            }, 300); // Debounce duration to align with scroll animation
        }
    }, { passive: false });
}
