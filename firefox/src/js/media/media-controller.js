import { userSettings, saveSettings, onSettingsChanged } from '../settings/index.js';
import { createGlassWindow } from '../ui/window-generator.js';
import { createGlassCard } from '../ui/card-generator.js';
import { appRegistry } from '../ui/app-registry.js';
import { applyDashboardOrder } from '../settings/panels/dashboard-layout.js';

// ─── Storage Keys & Constants ──────────────────────────────────────────────────

const MEDIA_SETTINGS_KEY = 'startpage_media_settings';

// ─── Settings Model ────────────────────────────────────────────────────────────

export function loadMediaConfig() {
    try {
        const stored = JSON.parse(localStorage.getItem(MEDIA_SETTINGS_KEY));
        if (stored && typeof stored === 'object') {
            return {
                enabled: stored.enabled !== false,
                placement: stored.placement || 'vertical', // 'vertical' | 'dashboard' | 'app' | 'horizontal'
                displayMode: stored.displayMode || 'always', // 'always' | 'when_playing'
                selectedTabId: stored.selectedTabId || null
            };
        }
    } catch (e) {}

    // Default configuration: primary on vertical apps, always visible
    const initial = {
        enabled: true,
        placement: 'vertical',
        displayMode: 'always',
        selectedTabId: null
    };
    saveMediaConfig(initial);
    return initial;
}

export function saveMediaConfig(config) {
    localStorage.setItem(MEDIA_SETTINGS_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('media-config-changed', { detail: config }));
}

export function updateMediaConfig(updates = {}) {
    const current = loadMediaConfig();
    const updated = { ...current, ...updates };
    saveMediaConfig(updated);
    renderAllMediaInstances();
    return updated;
}

// ─── Audio / Video Tab Discovery & Detection ───────────────────────────────────

let activeMediaTabs = []; // Array of tab objects
let currentTargetTab = null;
let isPlaybackPlaying = false;

export async function refreshAudibleTabs() {
    if (!window.chrome || !chrome.tabs || !chrome.tabs.query) {
        activeMediaTabs = [];
        return activeMediaTabs;
    }

    try {
        const allTabs = await chrome.tabs.query({});
        const audible = allTabs.filter(t => t.audible);

        // Find tabs that are playing or media candidates:
        // 1. Currently audible
        // 2. Muted tabs (a tab that was muted by the user is still a media tab!)
        // 3. Known media domains (youtube, spotify, soundcloud, netflix, etc.)
        const mediaRegex = /(youtube\.com|spotify\.com|soundcloud\.com|music\.youtube\.com|netflix\.com|pandora\.com|bandcamp\.com|deezer\.com|twitch\.tv|vimeo\.com|apple\.com\/apple-music|bilibili\.com|dailymotion\.com|tidal\.com|audiomack\.com)/i;
        const mediaCandidates = allTabs.filter(t => t.audible || t.mutedInfo?.muted || (t.url && mediaRegex.test(t.url)));
        const webTabs = allTabs.filter(t => t.url && (t.url.startsWith('http://') || t.url.startsWith('https://')));

        const config = loadMediaConfig();
        const validSelected = config.selectedTabId ? allTabs.find(t => t.id === config.selectedTabId) : null;

        activeMediaTabs = audible.length > 0 ? audible : (mediaCandidates.length > 0 ? mediaCandidates : (validSelected ? [validSelected] : webTabs.slice(0, 5)));
        isPlaybackPlaying = audible.length > 0;

        // Auto select tab
        if (config.selectedTabId) {
            const found = allTabs.find(t => t.id === config.selectedTabId);
            if (found) {
                currentTargetTab = found;
            } else {
                currentTargetTab = activeMediaTabs[0] || null;
            }
        } else {
            currentTargetTab = activeMediaTabs[0] || null;
        }

        return activeMediaTabs;
    } catch (err) {
        console.warn('[MediaController] Query error:', err);
        return [];
    }
}

// ─── Playback Control Actions ──────────────────────────────────────────────────

export async function executeMediaAction(action, tabId = null) {
    if (!currentTargetTab && activeMediaTabs.length === 0) {
        await refreshAudibleTabs();
    }
    const targetId = tabId || currentTargetTab?.id || activeMediaTabs[0]?.id;
    if (!targetId && action !== 'focus-tab') {
        return { success: false, reason: 'No active media tab found.' };
    }

    // 1. First try chrome.runtime background message handler
    try {
        if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
            const resp = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    type: 'media-control-action',
                    action,
                    tabId: targetId
                }, (response) => {
                    resolve(response);
                });
            });
            if (resp && resp.success) {
                setTimeout(updateMediaState, 200);
                return resp;
            }
            if (resp && !resp.success) {
                return { success: false, reason: resp.reason || resp.error || 'Failed to control media playback.' };
            }
        }
    } catch (e) {}

    // 2. Direct fallback using chrome.scripting or chrome.tabs if available in startpage context
    try {
        if (action === 'toggle-mute') {
            const tab = await chrome.tabs.get(targetId);
            const newMuted = !(tab.mutedInfo && tab.mutedInfo.muted);
            await chrome.tabs.update(targetId, { muted: newMuted });
            setTimeout(updateMediaState, 200);
            return { success: true, muted: newMuted };
        }

        if (action === 'focus-tab') {
            if (targetId) {
                const tab = await chrome.tabs.get(targetId);
                await chrome.tabs.update(targetId, { active: true });
                if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
                return { success: true };
            }
        }
    } catch (err) {}

    return { success: false, reason: 'No active media tab found.' };
}

// ─── DOM Instances Registry & Multi-mount ──────────────────────────────────────

const registeredContainers = new Set();
let openWindowInstance = null;
let openPopupInstance = null; // { panel, container, triggerBtn }
let dashboardCardEl = null;
let verticalBtnEl = null;
let horizontalBtnEl = null;

function registerContainer(el) {
    registeredContainers.add(el);
}

function unregisterContainer(el) {
    registeredContainers.delete(el);
}

export function getMediaControllerState() {
    const tab = currentTargetTab || activeMediaTabs[0] || null;
    return {
        isPlaying: activeMediaTabs.length > 0,
        audibleTabsCount: activeMediaTabs.length,
        currentTab: tab ? {
            id: tab.id,
            title: tab.title || '',
            url: tab.url || '',
            favIconUrl: tab.favIconUrl || '',
            audible: !!tab.audible,
            muted: !!(tab.mutedInfo && tab.mutedInfo.muted),
            service: getTabServiceName(tab.url, tab.title)
        } : null,
        tabs: activeMediaTabs.map(t => ({
            id: t.id,
            title: t.title || '',
            url: t.url || '',
            favIconUrl: t.favIconUrl || '',
            audible: !!t.audible,
            muted: !!(t.mutedInfo && t.mutedInfo.muted),
            service: getTabServiceName(t.url, t.title)
        }))
    };
}

let lastBroadcastMediaSig = '';

export async function updateMediaState() {
    await refreshAudibleTabs();
    handleVisibilityByMode();
    renderAllMediaInstances();

    const state = getMediaControllerState();
    const sig = `${state.isPlaying}_${state.audibleTabsCount}_${state.currentTab?.id}_${state.currentTab?.title}_${state.currentTab?.muted}`;
    if (sig !== lastBroadcastMediaSig) {
        lastBroadcastMediaSig = sig;
        window.dispatchEvent(new CustomEvent('media-state-updated', { detail: state }));
    }
}

function handleVisibilityByMode() {
    const config = loadMediaConfig();
    const shouldHide = config.displayMode === 'when_playing' && activeMediaTabs.length === 0;

    if (verticalBtnEl) {
        verticalBtnEl.style.display = shouldHide ? 'none' : 'flex';
        verticalBtnEl.classList.toggle('is-audible', activeMediaTabs.length > 0);
    }
    if (horizontalBtnEl) {
        horizontalBtnEl.style.display = shouldHide ? 'none' : 'flex';
    }
    if (dashboardCardEl) {
        dashboardCardEl.style.display = shouldHide ? 'none' : 'flex';
    }
}

function renderAllMediaInstances() {
    registeredContainers.forEach(container => {
        if (container.isConnected) {
            renderMediaWidget(container);
        }
    });
}

// ─── HTML Sanitization ─────────────────────────────────────────────────────────

function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getTabServiceName(url = '', title = '') {
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtube.com')) return 'YouTube';
        if (u.hostname.includes('spotify.com')) return 'Spotify';
        if (u.hostname.includes('soundcloud.com')) return 'SoundCloud';
        if (u.hostname.includes('music.apple.com')) return 'Apple Music';
        if (u.hostname.includes('netflix.com')) return 'Netflix';
        if (u.hostname.includes('twitch.tv')) return 'Twitch';
        return u.hostname.replace(/^www\./i, '');
    } catch (e) {
        return 'Browser Audio';
    }
}

// ─── Component Markup & Event Binding ──────────────────────────────────────────

export function renderMediaWidget(container) {
    const isPlaying = activeMediaTabs.length > 0;
    const tab = currentTargetTab || activeMediaTabs[0];

    const serviceName = tab ? getTabServiceName(tab.url, tab.title) : 'Audio / Video';
    const trackTitle = tab && tab.title ? tab.title : 'No Media Playing';
    const isMuted = tab?.mutedInfo?.muted || false;
    const faviconUrl = tab?.favIconUrl || '';
    const tabsCount = activeMediaTabs.length;
    const tabId = tab?.id || 0;

    const signature = `${isPlaying}_${tabId}_${trackTitle}_${serviceName}_${isMuted}_${faviconUrl}_${tabsCount}`;
    if (container._mediaSig === signature && container.firstElementChild) {
        return;
    }
    container._mediaSig = signature;

    container.innerHTML = `
        <div class="media-widget">
            <!-- Main Track Row -->
            <div class="media-main-row">
                <div class="media-track-art-wrap ${isPlaying ? 'is-playing' : ''}">
                    ${faviconUrl ? `
                        <img class="media-track-art" src="${escapeHtml(faviconUrl)}" alt="${escapeHtml(serviceName)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                        <svg style="display:none;" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                    ` : `
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                    `}
                </div>

                <div class="media-track-details">
                    <span class="media-track-title" title="${escapeHtml(trackTitle)}">${escapeHtml(trackTitle)}</span>
                    <div class="media-track-sub">
                        <span class="media-service-tag">${escapeHtml(serviceName)}</span>
                        ${isPlaying ? `
                            <span class="media-sub-dot">•</span>
                            <span class="media-live-tag">LIVE</span>
                        ` : ''}
                    </div>
                </div>

                <div class="media-top-actions">
                    <div class="media-mini-wave ${isPlaying ? 'is-playing' : ''}" title="${isPlaying ? 'Playing' : 'Paused'}">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>

            <!-- Transport Controls Row -->
            <div class="media-controls-row">
                <button type="button" class="media-ctrl-btn media-ctrl-prev" title="Previous / Seek -10s" aria-label="Previous">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="19 20 9 12 19 4 19 20"></polygon>
                        <line x1="5" y1="19" x2="5" y2="5"></line>
                    </svg>
                </button>

                <button type="button" class="media-ctrl-btn media-ctrl-playpause" title="${isPlaying ? 'Pause' : 'Play / Resume'}" aria-label="Play/Pause">
                    ${isPlaying ? `
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                            <rect x="14" y="4" width="4" height="16" rx="1"></rect>
                        </svg>
                    ` : `
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="margin-left: 2px;">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    `}
                </button>

                <button type="button" class="media-ctrl-btn media-ctrl-next" title="Next / Seek +10s" aria-label="Next">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="5 4 15 12 5 20 5 4"></polygon>
                        <line x1="19" y1="5" x2="19" y2="19"></line>
                    </svg>
                </button>
            </div>

            <!-- Bottom Row: Tab Selector / Jump, Mute, & Settings -->
            <div class="media-bottom-row">
                <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;">
                    <button type="button" class="media-btn-icon media-btn-mute ${isMuted ? 'is-muted' : ''}" title="${isMuted ? 'Unmute Tab' : 'Mute Tab'}">
                        ${isMuted ? `
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                        ` : `
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                        `}
                    </button>

                    ${activeMediaTabs.length > 1 ? `
                        <div class="media-tabs-pill-wrap">
                            <select class="media-tab-selector" title="Select audio tab">
                                ${activeMediaTabs.map(t => `
                                    <option value="${t.id}" ${t.id === tab?.id ? 'selected' : ''}>${escapeHtml(t.title || 'Tab')}</option>
                                `).join('')}
                            </select>
                            <svg class="media-select-arrow" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                    ` : (tab ? `
                        <button type="button" class="media-btn-icon media-btn-focus" title="Jump to tab in browser">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </button>
                    ` : `
                        <div class="media-quick-links-row">
                            <a href="https://www.youtube.com" target="_blank" class="media-quick-link" title="Open YouTube">YT</a>
                            <a href="https://open.spotify.com" target="_blank" class="media-quick-link" title="Open Spotify">Spotify</a>
                        </div>
                    `)}
                </div>

                <div style="display:flex;align-items:center;gap:4px;">
                    <button type="button" class="media-btn-icon media-btn-settings" title="Media Settings">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    // ── Bind Interactive Events ──

    // Play / Pause
    const playPauseBtn = container.querySelector('.media-ctrl-playpause');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await executeMediaAction('play-pause');
        });
    }

    // Next Track
    const nextBtn = container.querySelector('.media-ctrl-next');
    if (nextBtn) {
        nextBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await executeMediaAction('next');
        });
    }

    // Prev Track
    const prevBtn = container.querySelector('.media-ctrl-prev');
    if (prevBtn) {
        prevBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await executeMediaAction('prev');
        });
    }

    // Mute Button
    const muteBtn = container.querySelector('.media-btn-mute');
    if (muteBtn) {
        muteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await executeMediaAction('toggle-mute');
        });
    }

    // Focus Tab / Jump
    const focusBtn = container.querySelector('.media-btn-focus');
    if (focusBtn) {
        focusBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (tab && tab.id) {
                await executeMediaAction('focus-tab', tab.id);
            } else {
                window.open('https://www.youtube.com', '_blank');
            }
        });
    }

    // Settings Quick Link
    const settingsBtn = container.querySelector('.media-btn-settings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllMediaPopups();
            if (typeof window.openSettingsCategory === 'function') {
                window.openSettingsCategory('widgets', 'media');
            }
            const modal = document.getElementById('settings-modal');
            if (modal) {
                modal.classList.remove('hidden', 'is-minimized');
            }
        });
    }

    // Tab Selector Dropdown (when multiple audio tabs are active)
    const tabSelector = container.querySelector('.media-tab-selector');
    if (tabSelector) {
        tabSelector.addEventListener('change', (e) => {
            e.stopPropagation();
            const tid = parseInt(e.target.value, 10);
            updateMediaConfig({ selectedTabId: tid });
            currentTargetTab = activeMediaTabs.find(t => t.id === tid) || null;
            renderAllMediaInstances();
        });
    }
}

// ─── Placement Mount Handlers ──────────────────────────────────────────────────

function mountDashboardCard() {
    const widgetsContainer = document.getElementById('dashboard-widgets-container') || document.querySelector('main');
    if (!widgetsContainer) return;

    const { cardEl, bodyEl } = createGlassCard({
        id: 'media-dashboard-card',
        title: '',
        width: 380,
        className: 'media-dashboard-card custom-dashboard-widget'
    });

    bodyEl.style.padding = '0';
    bodyEl.style.overflow = 'hidden';

    const container = document.createElement('div');
    container.className = 'media-card-inner';
    bodyEl.appendChild(container);

    widgetsContainer.appendChild(cardEl);
    dashboardCardEl = cardEl;

    registerContainer(container);
    renderMediaWidget(container);
}

export function launchMediaWindow() {
    if (openWindowInstance) {
        openWindowInstance.bringToFront();
        return;
    }

    openWindowInstance = createGlassWindow({
        id: 'media_window_app',
        title: 'Music & Audio Controller',
        width: 380,
        height: 250,
        minWidth: 300,
        minHeight: 220,
        onClose: () => {
            const container = openWindowInstance.bodyEl.querySelector('.media-window-body');
            if (container) unregisterContainer(container);
            appRegistry.unregisterApp('app_media_controller');
            openWindowInstance = null;
        }
    });

    openWindowInstance.bodyEl.style.padding = '0';
    openWindowInstance.bodyEl.style.overflow = 'hidden';

    const container = document.createElement('div');
    container.className = 'media-window-body';
    openWindowInstance.bodyEl.appendChild(container);

    registerContainer(container);
    renderMediaWidget(container);

    appRegistry.registerApp({
        id: 'app_media_controller',
        name: 'Music & Audio',
        icon: mediaSVGIcon(24),
        focus: () => openWindowInstance.bringToFront(),
        close: () => openWindowInstance.destroy()
    });
}

function toggleMediaPopup(triggerBtn) {
    if (openPopupInstance) {
        const { panel } = openPopupInstance;
        const wasActive = panel.classList.contains('active');
        closeAllMediaPopups();
        if (!wasActive) {
            positionMediaPanel(panel, triggerBtn);
            panel.classList.add('active');
            triggerBtn.classList.add('active');
        }
        return;
    }

    closeAllMediaPopups();

    const panel = document.createElement('div');
    panel.id = 'media-popup-panel';
    panel.className = 'media-popup glass-panel';
    panel.style.width = '310px';
    panel.style.height = '155px';

    const header = document.createElement('div');
    header.className = 'media-popup-header';
    const titleEl = document.createElement('h3');
    titleEl.className = 'media-popup-title';
    titleEl.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> Now Playing`;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'media-popup-close';
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.remove('active');
        triggerBtn.classList.remove('active');
    });
    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const container = document.createElement('div');
    container.className = 'media-popup-body';
    panel.appendChild(container);

    document.body.appendChild(panel);
    openPopupInstance = { triggerBtn, panel, container };

    registerContainer(container);
    renderMediaWidget(container);

    setTimeout(() => {
        positionMediaPanel(panel, triggerBtn);
        panel.classList.add('active');
        triggerBtn.classList.add('active');
    }, 0);

    const outsideClick = (e) => {
        if (!panel.contains(e.target) && !triggerBtn.contains(e.target)) {
            panel.classList.remove('active');
            triggerBtn.classList.remove('active');
            document.removeEventListener('click', outsideClick);
        }
    };
    setTimeout(() => document.addEventListener('click', outsideClick), 50);
}

function closeAllMediaPopups() {
    document.querySelectorAll('.media-popup').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.media-panel-btn').forEach(b => b.classList.remove('active'));
}

function positionMediaPanel(panel, trigger) {
    const tRect = trigger.getBoundingClientRect();
    const pW = 310, pH = 155, pad = 12;
    let top = tRect.bottom + pad <= window.innerHeight - pH ? tRect.bottom + pad : tRect.top - pH - pad;
    top = Math.max(pad, Math.min(top, window.innerHeight - pH - pad));
    let left = tRect.left + (tRect.width / 2) - (pW / 2);
    left = Math.max(pad, Math.min(left, window.innerWidth - pW - pad));

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
}

function makeMediaBtn(placement) {
    const isVertical = placement === 'vertical';
    const btn = document.createElement('button');
    btn.className = isVertical
        ? 'floating-action-btn media-panel-btn'
        : 'glass-btn media-panel-btn';
    btn.setAttribute('aria-label', 'Music & Audio Controller');
    btn.setAttribute('title', 'Music & Audio Controller');

    const sz = isVertical ? '22' : '18';
    btn.innerHTML = `
        ${mediaSVGIcon(sz)}
        ${isVertical ? `
            <div class="media-fab-wave">
                <span class="media-fab-bar"></span>
                <span class="media-fab-bar"></span>
                <span class="media-fab-bar"></span>
            </div>
        ` : ''}
    `;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMediaPopup(btn);
    });

    return btn;
}

export function mediaSVGIcon(sz = 20) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18V5l12-2v13"></path>
        <circle cx="6" cy="18" r="3"></circle>
        <circle cx="18" cy="16" r="3"></circle>
    </svg>`;
}

// ─── Lifecycle & Cleanup ───────────────────────────────────────────────────────

function cleanupAll() {
    if (dashboardCardEl) {
        dashboardCardEl.remove();
        dashboardCardEl = null;
    }
    if (openWindowInstance) {
        openWindowInstance.destroy();
        openWindowInstance = null;
    }
    if (openPopupInstance) {
        unregisterContainer(openPopupInstance.container);
        openPopupInstance.panel.remove();
        openPopupInstance = null;
    }
    if (verticalBtnEl) {
        verticalBtnEl.remove();
        verticalBtnEl = null;
    }
    if (horizontalBtnEl) {
        horizontalBtnEl.remove();
        horizontalBtnEl = null;
    }
    registeredContainers.clear();
}

export function loadActiveMediaWidget() {
    cleanupAll();

    const config = loadMediaConfig();
    if (config.enabled === false) return;

    const fabCustom = document.getElementById('fab-custom-items');
    const headerCustom = document.getElementById('header-custom-items');

    const placement = config.placement || 'vertical';

    if (placement === 'vertical') {
        if (fabCustom) {
            verticalBtnEl = makeMediaBtn('vertical');
            fabCustom.appendChild(verticalBtnEl);
        }
    } else if (placement === 'dashboard') {
        mountDashboardCard();
    } else if (placement === 'horizontal') {
        if (headerCustom) {
            horizontalBtnEl = makeMediaBtn('horizontal');
            headerCustom.appendChild(horizontalBtnEl);
        }
    } else if (placement === 'app') {
        // Appears in Apps Grid, launches window on click
    }

    updateMediaState();
    applyDashboardOrder();
    window.dispatchEvent(new CustomEvent('layout-targets-changed'));
}

export function initMediaController() {
    loadActiveMediaWidget();

    // Debounce media updates to avoid burst IPC thrashing during tab browsing
    let mediaDebounceTimer = null;
    const scheduleMediaUpdate = (delay = 300) => {
        if (mediaDebounceTimer) clearTimeout(mediaDebounceTimer);
        mediaDebounceTimer = setTimeout(() => {
            if (!document.hidden) {
                updateMediaState();
            }
        }, delay);
    };

    // Listen for tab audio updates via chrome.tabs if available
    if (window.chrome && chrome.tabs) {
        if (chrome.tabs.onUpdated) {
            chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
                if (changeInfo.audible !== undefined || changeInfo.title || changeInfo.status === 'complete') {
                    scheduleMediaUpdate(300);
                }
            });
        }
        if (chrome.tabs.onRemoved) {
            chrome.tabs.onRemoved.addListener(() => {
                scheduleMediaUpdate(300);
            });
        }
    }

    // Polling backup every 15s for audio detection (skips completely when tab is hidden)
    setInterval(() => {
        if (!document.hidden) {
            updateMediaState();
        }
    }, 15000);

    // Refresh audio detection when user switches back to this tab
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateMediaState();
        }
    });

    window.addEventListener('launch-media-app', () => {
        launchMediaWindow();
    });

    let lastShowDashboard = userSettings.showDashboardWidgets;
    onSettingsChanged((settings) => {
        if (settings.showDashboardWidgets !== lastShowDashboard) {
            lastShowDashboard = settings.showDashboardWidgets;
            loadActiveMediaWidget();
        }
    });
}
