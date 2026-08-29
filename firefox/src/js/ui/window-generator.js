let highestWindowZIndex = 9005;

export function bringWindowToFront(windowEl) {
    highestWindowZIndex++;
    if (highestWindowZIndex > 9490) highestWindowZIndex = 9005;
    if (windowEl) windowEl.style.zIndex = highestWindowZIndex;
}

export function createGlassWindow(options = {}) {
    const {
        id,
        title = 'Window',
        editableTitle = false,
        titlePlaceholder = 'Window Title',
        onTitleChange = null,
        x = 120,
        y = 120,
        width = 340,
        height = 280,
        minWidth = 200,
        minHeight = 160,
        colorClass = '',
        className = '',
        resizable = true,
        showMinimizeBtn = true,
        showCloseBtn = true,
        extraHeaderButtons = [],
        onMinimize = null,
        onClose = null,
        onResize = null,
        onDragEnd = null,
        onWheel = null
    } = options;

    // Build main wrapper DOM
    const windowEl = document.createElement('div');
    if (id) windowEl.id = id;
    windowEl.className = `glass-window-wrapper ${colorClass} ${className}`.trim();
    
    windowEl.style.left = `${x}px`;
    windowEl.style.top = `${y}px`;
    if (width) windowEl.style.width = `${width}px`;
    if (height) windowEl.style.height = `${height}px`;
    if (minWidth) windowEl.style.minWidth = `${minWidth}px`;
    if (minHeight) windowEl.style.minHeight = `${minHeight}px`;
    if (resizable) windowEl.style.resize = 'both';

    bringWindowToFront(windowEl);

    // Build Header DOM
    const headerEl = document.createElement('div');
    headerEl.className = 'glass-window-header';

    // Title area
    const titleEl = document.createElement('div');
    titleEl.className = 'glass-window-title';

    let titleInputEl = null;
    if (editableTitle) {
        titleInputEl = document.createElement('input');
        titleInputEl.type = 'text';
        titleInputEl.className = 'glass-window-title-input';
        titleInputEl.placeholder = titlePlaceholder;
        titleInputEl.value = title;
        titleInputEl.readOnly = true;
        titleInputEl.spellcheck = false;

        titleInputEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            titleInputEl.readOnly = false;
            titleInputEl.classList.add('editing');
            titleInputEl.focus();
            titleInputEl.select();
        });

        const finishEditing = () => {
            if (!titleInputEl.readOnly) {
                titleInputEl.readOnly = true;
                titleInputEl.classList.remove('editing');
                if (onTitleChange) onTitleChange(titleInputEl.value);
            }
        };

        titleInputEl.addEventListener('blur', finishEditing);
        titleInputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finishEditing();
        });

        titleEl.appendChild(titleInputEl);
    } else {
        const titleSpan = document.createElement('span');
        titleSpan.textContent = title;
        titleEl.appendChild(titleSpan);
    }

    headerEl.appendChild(titleEl);

    // Controls area
    const controlsEl = document.createElement('div');
    controlsEl.className = 'glass-window-controls';

    // Extra Header Buttons (Color cycle, Pin, etc.)
    extraHeaderButtons.forEach(btnConfig => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `glass-window-btn ${btnConfig.className || ''}`.trim();
        if (btnConfig.id) btn.id = btnConfig.id;
        if (btnConfig.title) {
            btn.title = btnConfig.title;
            btn.setAttribute('aria-label', btnConfig.title);
        }
        btn.innerHTML = btnConfig.icon || '';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (btnConfig.onClick) btnConfig.onClick(e, windowEl);
        });
        controlsEl.appendChild(btn);
    });

    // Minimize button
    if (showMinimizeBtn) {
        const minBtn = document.createElement('button');
        minBtn.type = 'button';
        minBtn.className = 'glass-window-btn minimize-btn';
        minBtn.title = 'Minimize';
        minBtn.setAttribute('aria-label', 'Minimize Window');
        minBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
        minBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isMin = windowEl.classList.toggle('is-minimized');
            if (onMinimize) onMinimize(isMin);
        });
        controlsEl.appendChild(minBtn);
    }

    // Close button
    if (showCloseBtn) {
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'glass-window-btn close-btn';
        closeBtn.title = 'Close';
        closeBtn.setAttribute('aria-label', 'Close Window');
        closeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (onClose) onClose();
        });
        controlsEl.appendChild(closeBtn);
    }

    headerEl.appendChild(controlsEl);
    windowEl.appendChild(headerEl);

    // Body Area
    const bodyEl = document.createElement('div');
    bodyEl.className = 'glass-window-body';
    
    // Mouse wheel scroll handling for window body
    bodyEl.addEventListener('wheel', (e) => {
        e.stopPropagation();
        if (onWheel) onWheel(e);
    }, { passive: true });

    windowEl.appendChild(bodyEl);

    // Focus window on click
    windowEl.addEventListener('mousedown', () => bringWindowToFront(windowEl));

    // Dragging setup
    let isDragging = false;
    let initialX, initialY, currentX, currentY;

    headerEl.addEventListener('mousedown', (e) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        const xOffset = parseInt(windowEl.style.left, 10) || x;
        const yOffset = parseInt(windowEl.style.top, 10) || y;
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        isDragging = true;
        bringWindowToFront(windowEl);
    });

    const onMouseMove = (e) => {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            const maxX = Math.max(0, window.innerWidth - windowEl.offsetWidth);
            const maxY = Math.max(0, window.innerHeight - windowEl.offsetHeight);

            currentX = Math.max(0, Math.min(currentX, maxX));
            currentY = Math.max(0, Math.min(currentY, maxY));

            windowEl.style.left = `${currentX}px`;
            windowEl.style.top = `${currentY}px`;
        }
    };

    const onMouseUp = () => {
        if (isDragging) {
            isDragging = false;
            if (onDragEnd) {
                onDragEnd({
                    x: parseInt(windowEl.style.left, 10),
                    y: parseInt(windowEl.style.top, 10)
                });
            }
        }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Resizing Observer setup
    let resizeObserver = null;
    if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver(() => {
            if (onResize) {
                onResize({
                    w: windowEl.offsetWidth,
                    h: windowEl.offsetHeight
                });
            }
        });
        resizeObserver.observe(windowEl);
    }

    document.body.appendChild(windowEl);

    return {
        windowEl,
        headerEl,
        bodyEl,
        titleInputEl,
        bringToFront: () => bringWindowToFront(windowEl),
        destroy: () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            if (resizeObserver) resizeObserver.disconnect();
            windowEl.remove();
        }
    };
}
