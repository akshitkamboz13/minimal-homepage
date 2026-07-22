export function initRightPanel() {
    const imageSearchTrigger = document.getElementById('image-search-trigger');
    const visualSearchPanel = document.getElementById('visual-search-panel');
    const googleAppsTrigger = document.getElementById('google-apps-trigger');
    const googleAppsPanel = document.getElementById('google-apps-panel');

    function positionPanelNextToTrigger(panel, trigger) {
        if (!panel || !trigger) return;

        const tRect = trigger.getBoundingClientRect();
        const pWidth = panel.offsetWidth || 320;
        const pHeight = panel.offsetHeight || 380;
        const padding = 12;

        let top;
        // Prefer placing below trigger if space allows, otherwise above
        if (tRect.bottom + pHeight + padding <= window.innerHeight) {
            top = tRect.bottom + padding;
        } else if (tRect.top - pHeight - padding >= 0) {
            top = tRect.top - pHeight - padding;
        } else {
            top = Math.max(padding, window.innerHeight - pHeight - padding);
        }

        // Prefer aligning right edge of panel with right edge of trigger button
        let left = tRect.right - pWidth;
        if (left < padding) left = padding;
        if (left + pWidth > window.innerWidth - padding) {
            left = window.innerWidth - pWidth - padding;
        }

        panel.style.position = 'fixed';
        panel.style.top = `${top}px`;
        panel.style.left = `${left}px`;
        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
        panel.style.margin = '0';
        panel.style.zIndex = '10000';
    }

    if (imageSearchTrigger && visualSearchPanel) {
        imageSearchTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const willBeActive = !visualSearchPanel.classList.contains('active');
            if (willBeActive) {
                positionPanelNextToTrigger(visualSearchPanel, imageSearchTrigger);
            }
            visualSearchPanel.classList.toggle('active');
            imageSearchTrigger.classList.toggle('active');
            if (googleAppsPanel) googleAppsPanel.classList.remove('active');
            if (googleAppsTrigger) googleAppsTrigger.classList.remove('active');
        });
    }

    if (googleAppsTrigger && googleAppsPanel) {
        googleAppsTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const willBeActive = !googleAppsPanel.classList.contains('active');
            if (willBeActive) {
                positionPanelNextToTrigger(googleAppsPanel, googleAppsTrigger);
            }
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
