import { initApp } from './app.js';

// ES Modules with `type="module"` in index.html are deferred by default, 
// so the DOM is guaranteed to be parsed at this point.
// However, adding DOMContentLoaded provides an extra safety net.
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});
