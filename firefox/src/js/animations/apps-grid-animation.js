/**
 * Animations — Apps Grid Opening & Closing Manager
 * Handles ultra-smooth glass overlay transitions, container spring scaling,
 * and staggered tile entrance animations.
 */

let isTransitioning = false;

/**
 * Animate the opening of the Apps Grid overlay
 * @param {HTMLElement} overlayEl - The #apps-grid-overlay element
 * @param {HTMLElement} containerEl - The .apps-grid-container element
 * @param {Function} onOpened - Optional callback after opening completes
 */
export function animateOpenAppsGrid(overlayEl, containerEl, onOpened) {
    if (!overlayEl) return;
    if (isTransitioning && overlayEl.classList.contains('is-open')) return;

    isTransitioning = true;

    // Reset closed/hidden states, pointer events & z-index
    overlayEl.classList.remove('hidden', 'is-closing');
    overlayEl.style.display = 'flex';
    overlayEl.style.pointerEvents = 'auto';
    overlayEl.style.zIndex = '10000';
    
    // Force reflow so transition triggers cleanly
    void overlayEl.offsetWidth;

    // Trigger CSS state transition
    overlayEl.classList.add('is-open');

    // Staggered entrance animation for app tiles
    const tiles = overlayEl.querySelectorAll('.app-tile');
    tiles.forEach((tile, index) => {
        const delay = Math.min(index * 25, 250); // cap max stagger delay at 250ms
        tile.style.animation = 'none';
        void tile.offsetWidth;
        tile.style.animation = `appTileEntrance 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`;
    });

    const handleOpenedEnd = (e) => {
        if (e && e.target !== overlayEl) return;
        overlayEl.removeEventListener('transitionend', handleOpenedEnd);
        isTransitioning = false;
        if (typeof onOpened === 'function') onOpened();
    };

    overlayEl.addEventListener('transitionend', handleOpenedEnd);
    setTimeout(() => {
        if (isTransitioning) handleOpenedEnd();
    }, 320);
}

/**
 * Animate the closing of the Apps Grid overlay
 * @param {HTMLElement} overlayEl - The #apps-grid-overlay element
 * @param {Function} onClosed - Optional callback after closing completes
 */
export function animateCloseAppsGrid(overlayEl, onClosed) {
    if (!overlayEl) return;
    if (overlayEl.classList.contains('hidden') || !overlayEl.classList.contains('is-open')) {
        overlayEl.classList.add('hidden');
        overlayEl.style.pointerEvents = 'none';
        if (typeof onClosed === 'function') onClosed();
        return;
    }

    isTransitioning = true;

    // Immediately disable pointer events & lower z-index so any target windows,
    // modals, or notes open ON TOP of the fading overlay!
    overlayEl.style.pointerEvents = 'none';
    overlayEl.style.zIndex = '8000';

    overlayEl.classList.remove('is-open');
    overlayEl.classList.add('is-closing');

    const handleClosedEnd = (e) => {
        if (e && e.target !== overlayEl) return;
        overlayEl.removeEventListener('transitionend', handleClosedEnd);
        overlayEl.classList.remove('is-closing');
        overlayEl.classList.add('hidden');
        overlayEl.style.display = 'none';
        overlayEl.style.zIndex = '';
        overlayEl.style.pointerEvents = '';
        isTransitioning = false;
        if (typeof onClosed === 'function') onClosed();
    };

    overlayEl.addEventListener('transitionend', handleClosedEnd);
    setTimeout(() => {
        if (isTransitioning) handleClosedEnd();
    }, 320);
}
