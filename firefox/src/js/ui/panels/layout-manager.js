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

    window.addEventListener('layout-targets-changed', () => {
        applyLayoutPositions();
        if (isRearrangeActive) {
            setupDragHandlers();
        }
    });

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
        document.body.classList.remove('freeform-layout');
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
            el.style.removeProperty('width');
            el.style.removeProperty('max-width');
            el.style.removeProperty('overflow-x');
            el.classList.remove('freeform-placed');
        });
        return;
    }

    document.body.classList.add('freeform-layout');

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

            // If bookmarks container, preserve visible folder limit
            if (el.id === 'bookmarks-container' || el.classList.contains('bookmarks-container')) {
                const limit = parseInt(userSettings.bookmarkFoldersLimit, 10);
                if (limit > 0) {
                    el.style.setProperty('--bookmark-folders-visible', limit);
                    el.setAttribute('data-folders-visible', 'true');
                    el.style.width = `calc(${limit} * 260px + (${limit} - 1) * 1.5rem + 1rem)`;
                    el.style.maxWidth = `calc(${limit} * 260px + (${limit} - 1) * 1.5rem + 1rem)`;
                    el.style.overflowX = 'auto';
                } else {
                    el.style.removeProperty('--bookmark-folders-visible');
                    el.removeAttribute('data-folders-visible');
                    el.style.removeProperty('width');
                    el.style.removeProperty('max-width');
                }
            }

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
        document.body.classList.add('rearrange-active');

        // Automatically enable Full Screen Width setting when layout editing is enabled
        userSettings.containerWidth = 'full';
        const toggleWidth = document.getElementById('toggle-container-width');
        if (toggleWidth) toggleWidth.checked = true;
        saveSettings({ notify: false });

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
        document.body.classList.remove('rearrange-active');
        if (toolbar) toolbar.classList.add('hidden');
        toggleGridOverlay(false);
        teardownDragHandlers();
        applyLayoutPositions();
    }
}

export function resetLayoutPositions() {
    document.body.classList.remove('rearrange-active');
    document.body.classList.remove('freeform-layout');
    // Restore all elements to original DOM positions before clearing state
    getLayoutTargets().forEach(el => restoreToOriginalParent(el));
    userSettings.freeformLayout  = false;
    userSettings.layoutPositions = {};
    saveSettings();
    applyLayoutPositions();
}

// ─── Target elements (Auto-identifies every movable screen element) ───
function getLayoutTargets() {
    const targets = [];
    const seen = new Set();

    const addTarget = (el, fallbackId) => {
        if (!el || seen.has(el)) return;
        if (!el.id && fallbackId) el.id = fallbackId;
        if (!el.id) {
            el.id = 'layout-item-' + (el.className || 'elem').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 24);
        }
        seen.add(el);
        targets.push(el);
    };

    // 1. Core Header
    const mainHeader = document.getElementById('main-header') || document.querySelector('header');
    addTarget(mainHeader, 'main-header');

    // 2. Hero Clock & Greeting Section
    const hero = document.querySelector('.hero-section') || document.getElementById('hero-clock-section');
    addTarget(hero, 'hero-clock-section');

    // 3. Search Bar Container
    const search = document.getElementById('search-form') || document.querySelector('.search-container');
    addTarget(search, 'search-form');

    // 4. Bookmarks Bar
    const bookmarks = document.getElementById('bookmarks-container') || document.querySelector('.bookmarks-container');
    addTarget(bookmarks, 'bookmarks-container');

    // 5. Quick Actions FAB
    const fabContainer = document.querySelector('.fab-container') || document.getElementById('quick-actions-fab');
    addTarget(fabContainer, 'quick-actions-fab');

    // 6. Application Dock (if present)
    const dock = document.getElementById('glass-dock') || document.querySelector('.glass-dock');
    if (dock) {
        addTarget(dock, 'glass-dock');
    }

    // 7. Custom Studio Widgets
    document.querySelectorAll('.custom-dashboard-widget, .studio-custom-widget').forEach((w, idx) => {
        addTarget(w, `custom-widget-${idx}`);
    });

    // 8. Native Dashboard Cards & any children inside dashboard-widgets-container
    const widgetsContainer = document.getElementById('dashboard-widgets-container');
    if (widgetsContainer) {
        Array.from(widgetsContainer.children).forEach((child, idx) => {
            if (child.id === 'bookmarks-container' || child.classList.contains('bookmarks-container')) return;
            addTarget(child, `dashboard-card-${idx}`);
        });
    }

    // 9. Floating Notes Container if present
    const notesContainer = document.getElementById('notes-container');
    if (notesContainer && notesContainer.children.length > 0) {
        addTarget(notesContainer, 'notes-container');
    }

    // 10. Any already freeform placed or draggable items
    document.querySelectorAll('.freeform-placed, .draggable-layout-item').forEach(el => {
        if (el.classList.contains('layout-drag-badge') || el.id === 'rearrange-toolbar') return;
        addTarget(el);
    });

    return targets;
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

        // Preserve bookmark visible folder limit if bookmarks container
        if (el.id === 'bookmarks-container' || el.classList.contains('bookmarks-container')) {
            const limit = parseInt(userSettings.bookmarkFoldersLimit, 10);
            if (limit > 0) {
                el.style.setProperty('--bookmark-folders-visible', limit);
                el.setAttribute('data-folders-visible', 'true');
                el.style.width = `calc(${limit} * 260px + (${limit} - 1) * 1.5rem + 1rem)`;
                el.style.maxWidth = `calc(${limit} * 260px + (${limit} - 1) * 1.5rem + 1rem)`;
                el.style.overflowX = 'auto';
            } else {
                el.style.removeProperty('--bookmark-folders-visible');
                el.removeAttribute('data-folders-visible');
                el.style.removeProperty('width');
                el.style.removeProperty('max-width');
            }
        }

        let isDragging = false;
        let currentX   = xOffset;
        let currentY   = yOffset;
        let initialX   = 0;
        let initialY   = 0;

        const dragStart = (e) => {
            if (e.target.closest('input, textarea, select')) return;
            const isInteractive = e.target.closest('a, button');
            const isBadge = e.target.closest('.layout-drag-badge');
            if (isInteractive && !isBadge) return;

            e.stopPropagation();

            const liveRect = el.getBoundingClientRect();
            xOffset = liveRect.left;
            yOffset = liveRect.top;

            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            isDragging = true;
            el.classList.add('is-dragging');
            el.style.zIndex = '1000';
        };

        const drag = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            let targetX = e.clientX - initialX;
            let targetY = e.clientY - initialY;

            // Viewport bounds
            const width  = el.offsetWidth;
            const height = el.offsetHeight;
            const maxX = Math.max(0, window.innerWidth  - width);
            const maxY = Math.max(0, window.innerHeight - height);
            targetX = Math.max(0, Math.min(targetX, maxX));
            targetY = Math.max(0, Math.min(targetY, maxY));

            // Magnetic Snapping
            const SNAP_THRESHOLD = 14;
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

            // Snap X: check center first, then left edge, then right edge
            for (const line of vLines) {
                const lineX = line.pos;
                const centerSnap = lineX - width / 2;
                if (Math.abs(targetX - centerSnap) <= SNAP_THRESHOLD && centerSnap >= 0 && centerSnap <= maxX) {
                    targetX = centerSnap;
                    line.el?.classList.add('snapped');
                    break;
                }
                const leftSnap = lineX;
                if (Math.abs(targetX - leftSnap) <= SNAP_THRESHOLD && leftSnap >= 0 && leftSnap <= maxX) {
                    targetX = leftSnap;
                    line.el?.classList.add('snapped');
                    break;
                }
                const rightSnap = lineX - width;
                if (Math.abs(targetX - rightSnap) <= SNAP_THRESHOLD && rightSnap >= 0 && rightSnap <= maxX) {
                    targetX = rightSnap;
                    line.el?.classList.add('snapped');
                    break;
                }
            }

            // Snap Y: check top edge first, then center, then bottom edge
            for (const line of hLines) {
                const lineY = line.pos;
                const topSnap = lineY;
                if (Math.abs(targetY - topSnap) <= SNAP_THRESHOLD && topSnap >= 0 && topSnap <= maxY) {
                    targetY = topSnap;
                    line.el?.classList.add('snapped');
                    break;
                }
                const centerSnapY = lineY - height / 2;
                if (Math.abs(targetY - centerSnapY) <= SNAP_THRESHOLD && centerSnapY >= 0 && centerSnapY <= maxY) {
                    targetY = centerSnapY;
                    line.el?.classList.add('snapped');
                    break;
                }
                const bottomSnap = lineY - height;
                if (Math.abs(targetY - bottomSnap) <= SNAP_THRESHOLD && bottomSnap >= 0 && bottomSnap <= maxY) {
                    targetY = bottomSnap;
                    line.el?.classList.add('snapped');
                    break;
                }
            }

            currentX = targetX;
            currentY = targetY;

            el.style.left = `${currentX}px`;
            el.style.top  = `${currentY}px`;
        };

        const dragEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            el.classList.remove('is-dragging');
            el.style.zIndex = '90';

            // Clear line snapped highlights
            gridOverlay?.querySelectorAll('.grid-line').forEach(l => l.classList.remove('snapped'));

            // Pin element visually at exact dropped coordinates
            el.style.left = `${currentX}px`;
            el.style.top  = `${currentY}px`;

            // Persist per-drop silently so widgets don't unmount mid-rearrange
            if (!userSettings.layoutPositions) userSettings.layoutPositions = {};
            const existing = userSettings.layoutPositions[id] || {};
            userSettings.layoutPositions[id] = {
                x: Math.round(currentX),
                y: Math.round(currentY),
                w: existing.w,
                h: existing.h
            };
            userSettings.freeformLayout = true;
            saveSettings({ notify: false });
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
