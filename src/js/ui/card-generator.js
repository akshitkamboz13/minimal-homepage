export function createGlassCard(options = {}) {
    const {
        id,
        title = '',
        width = 400,
        height = null,
        className = '',
        onEdit = null,
        editUrl = null
    } = options;

    const cardEl = document.createElement('div');
    if (id) cardEl.id = id;
    cardEl.className = `glass-card-wrapper glass-panel ${className}`.trim();
    cardEl.style.width = typeof width === 'number' ? `${width}px` : width;
    if (height != null) {
        cardEl.style.height = typeof height === 'number' ? `${height}px` : height;
    }

    if (title || onEdit || editUrl) {
        const headerEl = document.createElement('div');
        headerEl.className = 'glass-card-header';

        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        headerEl.appendChild(titleEl);

        if (onEdit || editUrl) {
            const editBtn = document.createElement('button');
            editBtn.className = 'glass-card-btn icon-btn';
            editBtn.setAttribute('aria-label', 'Edit Widget');
            editBtn.setAttribute('title', 'Edit Widget');
            editBtn.innerHTML = `
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            `;
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof onEdit === 'function') {
                    onEdit();
                } else if (editUrl) {
                    window.open(editUrl, '_blank');
                }
            });
            headerEl.appendChild(editBtn);
        }

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
