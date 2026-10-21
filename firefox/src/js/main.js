import { initApp } from './app.js';

// If DOM is already parsed or ready, initialize immediately; otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
