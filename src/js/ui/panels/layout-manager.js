import { userSettings, saveSettings, onSettingsChanged } from '../../settings/index.js';

let isRearrangeActive = false;
let gridOverlay = null;

// Track original parents so we can restore elements on teardown
const originalParents = new WeakMap();
const originalNextSiblings = new WeakMap();

export function initLayoutManager() {
    applyLayoutPositions();

    // Re-apply when settings change or are loaded
    onSettingsChanged(() => {
        applyLayoutPositions();
    });

    window.addEventListener('start-rearrange-layout', () => enableRearrangeMode(true));
    window.addEventListener('reset-screen-layout',    () => resetLayoutPositions());

    window.addEventListener('resize', () => {
        if (userSettings.freeformLayout) applyLayoutPositions();
    });

    // Re-apply after DOM rendering and image/asset load complete
    requestAnimationFrame(() => {
        applyLayoutPositions();
    });

    setTimeout(() => {
        applyLayoutPositions();
    }, 100);

    window.addEventListener('load', () => {
        applyLayoutPositions();
    });
}

// ─── Grid Overlay (3 Vertical & 3 Horizontal Alignment Lines) ─────────────────
function toggleGridOverlay(show) {
    if (show) {
        if (!gridOverlay) {
            gridOverlay = document.createElement('div');
            gridOverlay.id = 'layout-grid-overlay';
            gridOverlay.className = 'layout-grid-overlay';
            gridOverlay.innerHTML = `
                <div class="grid-line vertical v1" style="left: 25%;"></div>
                <div class="grid-line vertical v2" style="left: 50%;"></div>
                <div class="grid-line vertical v3" style="left: 75%;"></div>
                <div class="grid-line horizontal h1" style="top: 25%;"></div>
                <div class="grid-line horizontal h2" style="top: 50%;"></div>
                <div class="grid-line horizontal h3" style="top: 75%;"></div>
            `;
            document.body.appendChild(gridOverlay);
        }
        requestAnimationFrame(() => gridOverlay.classList.add('visible'));
    } else {
        if (gridOverlay) {
            gridOverlay.classList.remove('visible');
            setTimeout(() => {
                if (gridOverlay) {
                    gridOverlay.remove();
                    gridOverlay = null;
                }
            }, 300);
        }
    }
}

// ─── Apply saved positions (surgical style removal — no flash) ─────────────────
export function applyLayoutPositions() {
    // Restore any accidentally reparented modal header back into settings modal content
    const modalHeader = document.querySelector('.modal-header');
    if (modalHeader && modalHeader.parentElement === document.body) {
        const modalContent = document.querySelector('#settings-modal .modal-content');
        if (modalContent) {
            modalContent.insertBefore(modalHeader, modalContent.firstChild);
        }
        modalHeader.style.cssText = '';
        modalHeader.classList.remove('freeform-placed', 'draggable-layout-item', 'is-dragging');
        const badge = modalHeader.querySelector('.layout-drag-badge');
        if (badge) badge.remove();
    }

    const targets = getLayoutTargets();

    if (!userSettings.freeformLayout || !userSettings.layoutPositions) {
        targets.forEach(el => {
            restoreToOriginalParent(el);
            el.style.removeProperty('position');
            el.style.removeProperty('left');
            el.style.removeProperty('top');
            el.style.removeProperty('margin');
            el.style.removeProperty('transform');
            el.style.removeProperty('transition');
            el.style.removeProperty('z-index');
            el.style.removeProperty('bottom');
            el.style.removeProperty('right');
            el.classList.remove('freeform-placed');
        });
        return;
    }

    targets.forEach(el => {
        const id = el.id;
        const pos = userSettings.layoutPositions[id];
        if (pos) {
            el.style.position   = 'fixed';
            el.style.margin     = '0';
            el.style.transform  = 'none';
            el.style.transition = 'none';
            el.style.left       = `${pos.x}px`;
            el.style.top        = `${pos.y}px`;
            el.style.bottom     = 'auto';
            el.style.right      = 'auto';
            el.style.zIndex     = '90';
            el.classList.add('freeform-placed');

            // Ensure element is a direct body child so .container's
            // animation containing-block doesn't trap it
            if (el.parentElement !== document.body) {
                originalParents.set(el, el.parentElement);
                originalNextSiblings.set(el, el.nextSibling);
                document.body.appendChild(el);
            }
        } else {
            restoreToOriginalParent(el);
            el.style.removeProperty('position');
            el.style.removeProperty('left');
            el.style.removeProperty('top');
            el.style.removeProperty('margin');
            el.style.removeProperty('transform');
            el.style.removeProperty('transition');
            el.style.removeProperty('z-index');
            el.style.removeProperty('bottom');
            el.style.removeProperty('right');
            el.classList.remove('freeform-placed');
        }
    });
}

function restoreToOriginalParent(el) {
    const parent  = originalParents.get(el);
    const sibling = originalNextSiblings.get(el);
    if (parent && el.parentElement !== parent) {
        if (sibling && sibling.parentElement === parent) {
            parent.insertBefore(el, sibling);
        } else {
            parent.appendChild(el);
        }
        originalParents.delete(el);
        originalNextSiblings.delete(el);
    }
}

// ─── Rearrange mode toolbar ────────────────────────────────────────────────────
export function enableRearrangeMode(enable) {
    isRearrangeActive = enable;
    let toolbar = document.getElementById('rearrange-toolbar');

    if (enable) {
        // Automatically enable Full Screen Width setting when layout editing is enabled
        userSettings.containerWidth = 'full';
        const toggleWidth = document.getElementById('toggle-container-width');
        if (toggleWidth) toggleWidth.checked = true;
        saveSettings();

        // Show 3x3 alignment grid overlay
        toggleGridOverlay(true);

        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id        = 'rearrange-toolbar';
            toolbar.className = 'rearrange-toolbar glass-panel';
            toolbar.innerHTML = `
                <div class="toolbar-info">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3"  y="3"  width="7" height="7"></rect>
                        <rect x="14" y="3"  width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3"  y="14" width="7" height="7"></rect>
                    </svg>
                    <span><strong style="display:inline-flex; align-items:center; gap:0.4rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55A2 2 0 0 0 6.512 23h10.976a2 2 0 0 0 1.792-2.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"></path><line x1="8.5" y1="2" x2="15.5" y2="2"></line><line x1="8.5" y1="14" x2="15.5" y2="14"></line></svg> Labs Layout: <span class="labs-badge">Labs</span></strong> Drag elements anywhere on screen.</span>
                </div>
                <div class="toolbar-actions">
                    <button type="button" id="btn-save-layout"  class="action-btn">Save & Lock</button>
                    <button type="button" id="btn-reset-layout" class="action-btn secondary">Reset Default</button>
                </div>
            `;
            document.body.appendChild(toolbar);

            toolbar.querySelector('#btn-save-layout').addEventListener('click', () => {
                userSettings.freeformLayout = true;
                saveSettings();
                enableRearrangeMode(false);
            });

            toolbar.querySelector('#btn-reset-layout').addEventListener('click', () => {
                resetLayoutPositions();
                enableRearrangeMode(false);
            });
        }
        toolbar.classList.remove('hidden');
        setupDragHandlers();

    } else {
        if (toolbar) toolbar.classList.add('hidden');
        toggleGridOverlay(false);
        teardownDragHandlers();
    }
}

export function resetLayoutPositions() {
    // Restore all elements to original DOM positions before clearing state
    getLayoutTargets().forEach(el => restoreToOriginalParent(el));
    userSettings.freeformLayout  = false;
    userSettings.layoutPositions = {};
    saveSettings();
    applyLayoutPositions();
}

// ─── Target elements (Strictly main-header, hero-clock, search, bookmarks, quick-actions-fab) ───
function getLayoutTargets() {
    const hero = document.querySelector('.hero-section');
    const search = document.getElementById('search-form');
    const bookmarks = document.getElementById('bookmarks-container');
    const mainHeader = document.getElementById('main-header');
    const fabContainer = document.querySelector('.fab-container');
    
    if (hero && !hero.id) hero.id = 'hero-clock-section';
    if (mainHeader && !mainHeader.id) mainHeader.id = 'main-header';
    if (fabContainer && !fabContainer.id) fabContainer.id = 'quick-actions-fab';

    return [hero, search, bookmarks, mainHeader, fabContainer].filter(Boolean);
}

let activeDragCleanup = [];

// ─── Setup drag handlers ───────────────────────────────────────────────────────
function setupDragHandlers() {
    teardownDragHandlers();

    getLayoutTargets().forEach(el => {
        el.classList.add('draggable-layout-item');

        if (!el.querySelector('.layout-drag-badge')) {
            const badge = document.createElement('div');
            badge.className = 'layout-drag-badge';
            badge.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9"  cy="5"  r="1"/><circle cx="9"  cy="12" r="1"/><circle cx="9"  cy="19" r="1"/>
                    <circle cx="15" cy="5"  r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
                </svg>
                <span>Move</span>
            `;
            el.prepend(badge);
        }

        const id = el.id;

        // Read live screen position BEFORE reparenting
        const rect = el.getBoundingClientRect();
        const savedPos = userSettings.layoutPositions?.[id];
        let xOffset = savedPos ? savedPos.x : rect.left;
        let yOffset = savedPos ? savedPos.y : rect.top;

        // ── REPARENT to body — escapes .container's animation containing block ──
        if (el.parentElement !== document.body) {
            originalParents.set(el, el.parentElement);
            originalNextSiblings.set(el, el.nextSibling);
            document.body.appendChild(el);
        }

        // Pin at exact visual position
        el.style.position   = 'fixed';
        el.style.margin     = '0';
        el.style.transform  = 'none';
        el.style.transition = 'none';
        el.style.left       = `${xOffset}px`;
        el.style.top        = `${yOffset}px`;
        el.style.bottom     = 'auto';
        el.style.right      = 'auto';
        el.style.zIndex     = '90';

        // ── State vars — identical to notes.js ──
        let isDragging = false;
        let currentX   = xOffset;
        let currentY   = yOffset;
        let initialX;
        let initialY;

        const dragStart = (e) => {
            if (e.target.closest('input, textarea')) return;
            if (e.target.closest('button') && !e.target.closest('.layout-drag-badge')) return;

            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            isDragging = true;
            el.classList.add('is-dragging');
            el.style.zIndex = '1000';
        };

        const drag = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            // Viewport bounds
            const width  = el.offsetWidth;
            const height = el.offsetHeight;
            currentX = Math.max(0, Math.min(currentX, window.innerWidth  - width));
            currentY = Math.max(0, Math.min(currentY, window.innerHeight - height));

            // ── Magnetic Snapping to 3 Vertical & 3 Horizontal Lines ──
            const SNAP_THRESHOLD = 16;
            const vLines = [
                { pos: window.innerWidth * 0.25, el: gridOverlay?.querySelector('.v1') },
                { pos: window.innerWidth * 0.50, el: gridOverlay?.querySelector('.v2') },
                { pos: window.innerWidth * 0.75, el: gridOverlay?.querySelector('.v3') },
            ];
            const hLines = [
                { pos: window.innerHeight * 0.25, el: gridOverlay?.querySelector('.h1') },
                { pos: window.innerHeight * 0.50, el: gridOverlay?.querySelector('.h2') },
                { pos: window.innerHeight * 0.75, el: gridOverlay?.querySelector('.h3') },
            ];

            // Clear snapped state
            vLines.forEach(l => l.el?.classList.remove('snapped'));
            hLines.forEach(l => l.el?.classList.remove('snapped'));

            // Snap X (Vertical lines: check left edge, center, right edge)
            for (const line of vLines) {
                const targetX = line.pos;
                // Left edge snap
                if (Math.abs(currentX - targetX) <= SNAP_THRESHOLD) {
                    currentX = targetX;
                    line.el?.classList.add('snapped');
                    break;
                }
                // Center snap
                if (Math.abs((currentX + width / 2) - targetX) <= SNAP_THRESHOLD) {
                    currentX = targetX - width / 2;
                    line.el?.classList.add('snapped');
                    break;
                }
                // Right edge snap
                if (Math.abs((currentX + width) - targetX) <= SNAP_THRESHOLD) {
                    currentX = targetX - width;
                    line.el?.classList.add('snapped');
                    break;
                }
            }

            // Snap Y (Horizontal lines: check top edge, middle, bottom edge)
            for (const line of hLines) {
                const targetY = line.pos;
                // Top edge snap
                if (Math.abs(currentY - targetY) <= SNAP_THRESHOLD) {
                    currentY = targetY;
                    line.el?.classList.add('snapped');
                    break;
                }
                // Middle snap
                if (Math.abs((currentY + height / 2) - targetY) <= SNAP_THRESHOLD) {
                    currentY = targetY - height / 2;
                    line.el?.classList.add('snapped');
                    break;
                }
                // Bottom edge snap
                if (Math.abs((currentY + height) - targetY) <= SNAP_THRESHOLD) {
                    currentY = targetY - height;
                    line.el?.classList.add('snapped');
                    break;
                }
            }

            xOffset = currentX;
            yOffset = currentY;

            el.style.left = `${currentX}px`;
            el.style.top  = `${currentY}px`;
        };

        const dragEnd = () => {
            if (!isDragging) return;
            initialX   = currentX;
            initialY   = currentY;
            isDragging = false;
            el.classList.remove('is-dragging');
            el.style.zIndex = '90';

            // Clear line snapped highlights
            gridOverlay?.querySelectorAll('.grid-line').forEach(l => l.classList.remove('snapped'));

            // Resolve overlaps on drop — push siblings apart without blocking drag
            const resolved = resolveCollisions(el, xOffset, yOffset);
            xOffset  = resolved.x;
            yOffset  = resolved.y;
            currentX = resolved.x;
            currentY = resolved.y;
            el.style.left = `${resolved.x}px`;
            el.style.top  = `${resolved.y}px`;

            // Persist per-drop so Save&Lock just hides toolbar
            if (!userSettings.layoutPositions) userSettings.layoutPositions = {};
            userSettings.layoutPositions[id] = { x: Math.round(xOffset), y: Math.round(yOffset) };
            saveSettings();
        };

        el.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        activeDragCleanup.push(() => {
            el.removeEventListener('mousedown', dragStart);
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', dragEnd);
        });
    });
}

// ─── Teardown — restores elements to original DOM position ────────────────────
function teardownDragHandlers() {
    activeDragCleanup.forEach(fn => fn());
    activeDragCleanup = [];

    getLayoutTargets().forEach(el => {
        el.classList.remove('draggable-layout-item', 'is-dragging');
        const badge = el.querySelector('.layout-drag-badge');
        if (badge) badge.remove();

        // If NOT in saved freeform mode, restore to original container position
        if (!userSettings.freeformLayout) {
            restoreToOriginalParent(el);
        }
    });
}

// ─── AABB collision resolver — runs on drop only ───────────────────────────────
function resolveCollisions(dragged, candidateX, candidateY) {
    const w   = dragged.offsetWidth;
    const h   = dragged.offsetHeight;
    const GAP = 8;
    let x = candidateX;
    let y = candidateY;

    getLayoutTargets().forEach(other => {
        if (other === dragged) return;
        const or = other.getBoundingClientRect();
        const overlapX = (x < or.left + or.width + GAP) && (x + w + GAP > or.left);
        const overlapY = (y < or.top  + or.height + GAP) && (y + h + GAP > or.top);
        if (!overlapX || !overlapY) return;

        const pushLeft  = (or.left + or.width  + GAP) - x;
        const pushRight = (x + w + GAP) - or.left;
        const pushDown  = (or.top  + or.height + GAP) - y;
        const pushUp    = (y + h + GAP) - or.top;
        const minH = Math.min(pushLeft, pushRight);
        const minV = Math.min(pushDown, pushUp);

        if (minH <= minV) {
            x += (pushLeft < pushRight) ? pushLeft : -pushRight;
        } else {
            y += (pushDown < pushUp)    ? pushDown : -pushUp;
        }

        x = Math.max(0, Math.min(x, window.innerWidth  - w));
        y = Math.max(0, Math.min(y, window.innerHeight - h));
    });

    return { x, y };
}
