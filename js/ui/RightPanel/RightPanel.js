export function initRightPanel() {
    const imageSearchTrigger = document.getElementById('image-search-trigger');
    const visualSearchPanel = document.getElementById('visual-search-panel');
    const googleAppsTrigger = document.getElementById('google-apps-trigger');
    const googleAppsPanel = document.getElementById('google-apps-panel');

    if (imageSearchTrigger && visualSearchPanel) {
        imageSearchTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            visualSearchPanel.classList.toggle('active');
            imageSearchTrigger.classList.toggle('active');
            if (googleAppsPanel) googleAppsPanel.classList.remove('active');
            if (googleAppsTrigger) googleAppsTrigger.classList.remove('active');
        });
    }

    if (googleAppsTrigger && googleAppsPanel) {
        googleAppsTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            googleAppsPanel.classList.toggle('active');
            googleAppsTrigger.classList.toggle('active');
            if (visualSearchPanel) visualSearchPanel.classList.remove('active');
            if (imageSearchTrigger) imageSearchTrigger.classList.remove('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (visualSearchPanel && visualSearchPanel.classList.contains('active') && 
            !visualSearchPanel.contains(e.target) && 
            !(imageSearchTrigger && imageSearchTrigger.contains(e.target))) {
            visualSearchPanel.classList.remove('active');
            if (imageSearchTrigger) imageSearchTrigger.classList.remove('active');
        }
        if (googleAppsPanel && googleAppsPanel.classList.contains('active') && 
            !googleAppsPanel.contains(e.target) && 
            !(googleAppsTrigger && googleAppsTrigger.contains(e.target))) {
            googleAppsPanel.classList.remove('active');
            if (googleAppsTrigger) googleAppsTrigger.classList.remove('active');
        }
    });

    // Add title attributes to Google Apps items for tooltip on hover
    document.querySelectorAll('.google-apps-panel .app-item').forEach(item => {
        const span = item.querySelector('span');
        if (span && span.textContent) {
            item.title = span.textContent.trim();
        }
    });
}
