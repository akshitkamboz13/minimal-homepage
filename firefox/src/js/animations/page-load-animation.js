/**
 * Animations — Initial Page Load Veil & Reveal Manager
 * Eliminates background/setting application flash on new tab opening
 * by displaying a themed backdrop loader until all components are ready.
 */

let loaderDismissed = false;

/**
 * Smoothly dismiss the initial page load overlay once app initialization is complete.
 */
export function dismissPageLoader() {
    if (loaderDismissed) return;
    loaderDismissed = true;

    const loaderEl = document.getElementById('page-loader-overlay');
    if (!loaderEl) return;

    requestAnimationFrame(() => {
        setTimeout(() => {
            loaderEl.classList.add('is-loaded');
            setTimeout(() => {
                loaderEl.style.display = 'none';
            }, 450);
        }, 80);
    });
}
