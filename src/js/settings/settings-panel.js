import { userSettings } from './settings-state.js';
import { initAppearance, applyAppearanceVisuals } from './panels/appearance.js';
import { initNotesSettings, applyNotesVisuals } from './panels/notes.js';
import { initBookmarksSettings } from './panels/bookmarks.js';
import { initWindows, applyWindowsVisuals } from './panels/windows.js';
import { initWidgets } from './panels/widgets.js';
import { initAi } from './panels/ai.js';
import { initVoice } from './panels/voice.js';
import { initVisual } from './panels/visual.js';
import { initKeyboard } from './panels/keyboard.js';
import { initPrivacy } from './panels/privacy.js';
import { initPerformance, applyPerformanceVisuals } from './panels/performance.js';
import { initDeveloper } from './panels/developer.js';
import { initAbout } from './panels/about.js';
import { initPanelsSettings, applyPanelsVisuals } from './panels/panels.js';

const CATEGORY_CONFIG = {
    'personalization': {
        title: 'Personalization',
        tabs: ['appearance', 'windows']
    },
    'widgets': {
        title: 'Widgets & Panels',
        tabs: ['panels', 'widgets', 'notes', 'bookmarks']
    },
    'search-ai': {
        title: 'Search & AI',
        tabs: ['core-search', 'ai', 'voice', 'visual']
    },
    'system': {
        title: 'System & Controls',
        tabs: ['keyboard', 'privacy', 'performance', 'developer']
    },
    'about': {
        title: 'About',
        tabs: ['about']
    }
};

export function applySettingsVisuals() {
    applyAppearanceVisuals();
    applyNotesVisuals();
    applyWindowsVisuals();
    applyPerformanceVisuals();
    applyPanelsVisuals();
}

export function openDockSettings() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    modal.classList.remove('hidden', 'is-minimized');
    localStorage.setItem('startpage_settings_minimized', 'false');

    if (typeof window.openSettingsCategory === 'function') {
        window.openSettingsCategory('widgets', 'panels');
    }

    setTimeout(() => {
        const targetSection = document.getElementById('dock-settings-section') || document.getElementById('dropdown-dock-position')?.closest('.setting-group-section');
        if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetSection.style.transition = 'outline 0.3s ease, box-shadow 0.3s ease';
            targetSection.style.outline = '2px solid var(--accent-color, #3b82f6)';
            targetSection.style.outlineOffset = '4px';
            targetSection.style.borderRadius = '12px';
            setTimeout(() => {
                targetSection.style.outline = 'none';
            }, 2500);
        }
    }, 200);
}

export function initSettingsPanel() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    // Apply initial visuals on load
    applySettingsVisuals();

    // Restore saved settings modal dimensions if any
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        try {
            const savedSize = JSON.parse(localStorage.getItem('startpage_settings_size'));
            if (savedSize && savedSize.w && savedSize.h) {
                modalContent.style.width = `${savedSize.w}px`;
                modalContent.style.height = `${savedSize.h}px`;
            }
        } catch (e) {
            // Ignore parse error
        }

        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => {
                const w = modalContent.offsetWidth;
                const h = modalContent.offsetHeight;
                if (w && h) {
                    localStorage.setItem('startpage_settings_size', JSON.stringify({ w, h }));
                }
            });
            resizeObserver.observe(modalContent);
        }
    }

    const mainSidebar = document.getElementById('sidebar-main-menu');
    const subSidebar = document.getElementById('sidebar-sub-menu');
    const backBtn = document.getElementById('btn-back-categories');
    const currentCategoryTitle = document.getElementById('current-category-title');
    const searchInput = document.getElementById('settings-search');

    const categoryMenuItems = modal.querySelectorAll('.category-menu-item');
    const categoryCards = modal.querySelectorAll('.category-card');
    const menuItems = modal.querySelectorAll('.menu-item');
    const panes = modal.querySelectorAll('.settings-pane');

    let currentCategory = null;

    function resetToLevel1() {
        currentCategory = null;
        if (searchInput) searchInput.value = '';

        // Show main menu in sidebar, hide sub-menu
        if (mainSidebar) mainSidebar.classList.remove('hidden');
        if (subSidebar) subSidebar.classList.add('hidden');
        if (backBtn) backBtn.style.display = 'inline-flex';

        // Clear active states
        categoryMenuItems.forEach(item => item.classList.remove('active'));
        menuItems.forEach(item => {
            item.classList.remove('active');
            item.style.display = 'flex';
        });

        // Activate overview pane
        panes.forEach(pane => pane.classList.remove('active'));
        const overviewPane = modal.querySelector('#tab-overview');
        if (overviewPane) overviewPane.classList.add('active');
    }

    function openCategory(categoryId, defaultTab = null) {
        const config = CATEGORY_CONFIG[categoryId];
        if (!config) return;

        currentCategory = categoryId;

        // Update sidebar state: Hide Level 1, Show Level 2
        if (mainSidebar) mainSidebar.classList.add('hidden');
        if (subSidebar) subSidebar.classList.remove('hidden');
        if (backBtn) backBtn.style.display = 'inline-flex';
        if (currentCategoryTitle) currentCategoryTitle.textContent = config.title;

        // Highlight category menu item
        categoryMenuItems.forEach(item => {
            if (item.getAttribute('data-category') === categoryId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Filter Level 2 menu items
        menuItems.forEach(item => {
            const tabId = item.getAttribute('data-tab');
            if (config.tabs.includes(tabId)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });

        // Determine target tab to activate
        const targetTabId = defaultTab && config.tabs.includes(defaultTab) ? defaultTab : config.tabs[0];
        activateTab(targetTabId);
    }

    window.openSettingsCategory = openCategory;

    function activateTab(tabId) {
        menuItems.forEach(mi => {
            if (mi.getAttribute('data-tab') === tabId) {
                mi.classList.add('active');
            } else {
                mi.classList.remove('active');
            }
        });

        panes.forEach(pane => pane.classList.remove('active'));
        const activePane = modal.querySelector(`#tab-${tabId}`);
        if (activePane) activePane.classList.add('active');

        // Persist last active category and tab state
        try {
            if (currentCategory && tabId) {
                localStorage.setItem('startpage_settings_last_tab', JSON.stringify({
                    categoryId: currentCategory,
                    tabId: tabId
                }));
            }
        } catch (e) {}
    }

    // 1. Level 1 Event Listeners (Category Cards & Category Sidebar Items)
    categoryMenuItems.forEach(item => {
        item.addEventListener('click', () => {
            const catId = item.getAttribute('data-category');
            openCategory(catId);
        });
    });

    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const catId = card.getAttribute('data-category');
            openCategory(catId);
        });
    });

    // 2. Back Button Listener
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            resetToLevel1();
        });
    }

    // 3. Level 2 Tab Switching
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            activateTab(targetTab);
        });
    });

    // 4. Live Search in Sidebar
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();

            if (query.length > 0) {
                // In search mode, show sub-menu sidebar and hide main menu
                if (mainSidebar) mainSidebar.classList.add('hidden');
                if (subSidebar) subSidebar.classList.remove('hidden');
                if (backBtn) backBtn.style.display = 'none';
                if (currentCategoryTitle) currentCategoryTitle.textContent = 'Search Results';

                let firstMatchedTab = null;
                menuItems.forEach(item => {
                    const text = item.textContent.toLowerCase();
                    const matched = text.includes(query);
                    item.style.display = matched ? 'flex' : 'none';
                    if (matched && !firstMatchedTab) {
                        firstMatchedTab = item.getAttribute('data-tab');
                    }
                });

                if (firstMatchedTab) {
                    activateTab(firstMatchedTab);
                }
            } else {
                // If search query is cleared, restore current category or Level 1 overview
                if (currentCategory) {
                    openCategory(currentCategory);
                } else {
                    resetToLevel1();
                }
            }
        });
    }

    function restoreLastState() {
        try {
            const savedState = JSON.parse(localStorage.getItem('startpage_settings_last_tab'));
            if (savedState && savedState.categoryId && savedState.tabId) {
                openCategory(savedState.categoryId, savedState.tabId);
                return true;
            }
        } catch (e) {}
        return false;
    }

    // 5. Restore last category/tab state whenever modal becomes visible
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                const isHidden = modal.classList.contains('hidden');
                if (!isHidden) {
                    if (!restoreLastState()) {
                        resetToLevel1();
                    }
                }
            }
        });
    });
    observer.observe(modal, { attributes: true });

    // 6. Initialize sub-panels
    initAppearance(modal);
    initNotesSettings(modal);
    initBookmarksSettings(modal);
    initWindows(modal);
    initWidgets(modal);
    initPanelsSettings(modal);
    initAi(modal);
    initVoice(modal);
    initVisual(modal);
    initKeyboard(modal);
    initPrivacy(modal);
    initPerformance(modal);
    initDeveloper(modal);
    initAbout(modal);
}
