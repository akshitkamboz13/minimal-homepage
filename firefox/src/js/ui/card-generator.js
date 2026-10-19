export function createGlassCard(options = {}) {
    const {
        id,
        title = '',
        width = 400,
        height = null,
        className = ''
    } = options;

    const cardEl = document.createElement('div');
    if (id) cardEl.id = id;
    cardEl.className = `glass-card-wrapper glass-panel ${className}`.trim();
    cardEl.style.width = typeof width === 'number' ? `${width}px` : width;
    if (height != null) {
        cardEl.style.height = typeof height === 'number' ? `${height}px` : height;
    }

    if (title) {
        const headerEl = document.createElement('div');
        headerEl.className = 'glass-card-header';
        
        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        headerEl.appendChild(titleEl);
        
        cardEl.appendChild(headerEl);
    }

    const bodyEl = document.createElement('div');
    bodyEl.className = 'glass-card-body';
    cardEl.appendChild(bodyEl);

    return {
        cardEl,
        bodyEl
    };
}
