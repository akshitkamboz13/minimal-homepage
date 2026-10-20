// background.js — service worker that bridges offscreen doc ↔ new tab page

// Forward all voice messages between offscreen doc and the active tab
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'voice-start' || msg.type === 'voice-stop') {
        // From new-tab page → forward to offscreen document
        ensureOffscreen().then(() => {
            chrome.runtime.sendMessage(msg);
        });
    } else if (msg.type === 'voice-result' || msg.type === 'voice-status' || msg.type === 'voice-error') {
        // From offscreen doc → forward to the active new-tab page
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                // Runtime broadcast
            }
        });
    } else if (msg.type === 'media-control-action') {
        handleMediaControl(msg.action, msg.tabId).then(res => {
            sendResponse(res);
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true; // Keep message channel open for async response
    }
});

// Helper function to execute media control on target tab
async function handleMediaControl(action, targetTabId) {
    let tabId = targetTabId;
    if (!tabId) {
        // Query all tabs to find currently audible, muted, or known streaming tabs
        const allTabs = await chrome.tabs.query({});
        const audibleTabs = allTabs.filter(t => t.audible);
        const mutedTabs = allTabs.filter(t => t.mutedInfo && t.mutedInfo.muted);
        const mediaRegex = /(youtube\.com|spotify\.com|soundcloud\.com|music\.youtube\.com|netflix\.com|pandora\.com|bandcamp\.com|deezer\.com|twitch\.tv|vimeo\.com|apple\.com\/apple-music|bilibili\.com|dailymotion\.com|tidal\.com|audiomack\.com)/i;
        const mediaCandidates = allTabs.filter(t => t.url && mediaRegex.test(t.url));
        const webTabs = allTabs.filter(t => t.url && (t.url.startsWith('http://') || t.url.startsWith('https://')));

        tabId = audibleTabs[0]?.id || mutedTabs[0]?.id || mediaCandidates[0]?.id || webTabs[0]?.id;
    }
    if (!tabId) return { success: false, reason: 'No active media tab found' };

    if (action === 'toggle-mute') {
        const tab = await chrome.tabs.get(tabId);
        const newMuted = !(tab.mutedInfo && tab.mutedInfo.muted);
        await chrome.tabs.update(tabId, { muted: newMuted });
        return { success: true, muted: newMuted };
    }

    if (action === 'focus-tab') {
        const tab = await chrome.tabs.get(tabId);
        await chrome.tabs.update(tabId, { active: true });
        if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
        return { success: true };
    }

    // Playback control via chrome.scripting
    if (chrome.scripting && chrome.scripting.executeScript) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId },
                func: (act) => {
                    const host = location.hostname.toLowerCase();

                    // 1. YouTube & YouTube Music
                    if (host.includes('youtube.com')) {
                        if (act === 'play-pause') {
                            const btn = document.querySelector('.ytp-play-button') || document.querySelector('#play-pause-button');
                            if (btn) { btn.click(); return { handled: true }; }
                        } else if (act === 'next') {
                            const btn = document.querySelector('.ytp-next-button') || document.querySelector('.next-button');
                            if (btn) { btn.click(); return { handled: true }; }
                        } else if (act === 'prev') {
                            const btn = document.querySelector('.ytp-prev-button') || document.querySelector('.previous-button');
                            if (btn) { btn.click(); return { handled: true }; }
                        }
                    }

                    // 2. Spotify Web
                    if (host.includes('spotify.com')) {
                        if (act === 'play-pause') {
                            const btn = document.querySelector('[data-testid="control-button-playpause"]');
                            if (btn) { btn.click(); return { handled: true }; }
                        } else if (act === 'next') {
                            const btn = document.querySelector('[data-testid="control-button-skip-forward"]');
                            if (btn) { btn.click(); return { handled: true }; }
                        } else if (act === 'prev') {
                            const btn = document.querySelector('[data-testid="control-button-skip-back"]');
                            if (btn) { btn.click(); return { handled: true }; }
                        }
                    }

                    // 3. SoundCloud
                    if (host.includes('soundcloud.com')) {
                        if (act === 'play-pause') {
                            const btn = document.querySelector('.playControl') || document.querySelector('[title="Play current track"]') || document.querySelector('[title="Pause current track"]');
                            if (btn) { btn.click(); return { handled: true }; }
                        } else if (act === 'next') {
                            const btn = document.querySelector('.skipControl__next');
                            if (btn) { btn.click(); return { handled: true }; }
                        } else if (act === 'prev') {
                            const btn = document.querySelector('.skipControl__previous');
                            if (btn) { btn.click(); return { handled: true }; }
                        }
                    }

                    // 4. Bandcamp
                    if (host.includes('bandcamp.com')) {
                        if (act === 'play-pause') {
                            const btn = document.querySelector('.playbutton') || document.querySelector('.play-btn');
                            if (btn) { btn.click(); return { handled: true }; }
                        } else if (act === 'next') {
                            const btn = document.querySelector('.nextbutton');
                            if (btn) { btn.click(); return { handled: true }; }
                        } else if (act === 'prev') {
                            const btn = document.querySelector('.prevbutton');
                            if (btn) { btn.click(); return { handled: true }; }
                        }
                    }

                    // 5. Generic HTML5 Video / Audio
                    const mediaEls = Array.from(document.querySelectorAll('video, audio'));
                    if (mediaEls.length > 0) {
                        const playing = mediaEls.find(m => !m.paused);
                        const target = playing || mediaEls[0];

                        if (act === 'play-pause') {
                            if (target.paused) {
                                target.play();
                            } else {
                                target.pause();
                            }
                            return { handled: true, paused: target.paused };
                        } else if (act === 'next') {
                            target.currentTime = Math.min(target.duration || (target.currentTime + 10), target.currentTime + 10);
                            return { handled: true };
                        } else if (act === 'prev') {
                            target.currentTime = Math.max(0, target.currentTime - 10);
                            return { handled: true };
                        }
                    }

                    return { handled: false };
                },
                args: [action]
            });
            const scriptRes = results?.[0]?.result;
            return { success: true, result: scriptRes };
        } catch (e) {
            return { success: false, reason: e.message };
        }
    }

    return { success: false, reason: 'Scripting API not available' };
}

let creating = null;

async function ensureOffscreen() {
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    if (existingContexts.length > 0) return;

    if (creating) {
        await creating;
    } else {
        creating = chrome.offscreen.createDocument({
            url: 'src/offscreen.html',
            reasons: ['USER_MEDIA'],
            justification: 'Speech recognition requires a document context'
        });
        await creating;
        creating = null;
    }
}

// Register declarativeNetRequest rules to remove Referer/Origin headers for Yandex and Bing uploads
async function registerNetRules() {
    const rules = [
        {
            id: 1,
            priority: 1,
            action: {
                type: "modifyHeaders",
                requestHeaders: [
                    { header: "referer", operation: "remove" },
                    { header: "origin", operation: "remove" }
                ]
            },
            condition: {
                urlFilter: "*://*.yandex.com/*",
                resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest", "other"]
            }
        },
        {
            id: 2,
            priority: 1,
            action: {
                type: "modifyHeaders",
                requestHeaders: [
                    { header: "referer", operation: "remove" },
                    { header: "origin", operation: "remove" }
                ]
            },
            condition: {
                urlFilter: "*://*.yandex.ru/*",
                resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest", "other"]
            }
        },
        {
            id: 3,
            priority: 1,
            action: {
                type: "modifyHeaders",
                requestHeaders: [
                    { header: "referer", operation: "remove" },
                    { header: "origin", operation: "remove" }
                ]
            },
            condition: {
                urlFilter: "*://*.bing.com/*",
                resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest", "other"]
            }
        }
    ];

    try {
        const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
        const oldRuleIds = oldRules.map(rule => rule.id);
        
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: oldRuleIds,
            addRules: rules
        });
        console.log("Visual search header modification rules registered successfully.");
    } catch (e) {
        console.error("Failed to register declarativeNetRequest rules:", e);
    }
}

// Register Chrome Context Menus ("Add Site to Home")
function initExtensionContextMenus() {
    if (!chrome || !chrome.contextMenus) return;

    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'add_site_to_home_parent',
            title: 'Add Site to Home',
            contexts: ['all']
        }, () => { const err = chrome.runtime.lastError; });

        chrome.contextMenus.create({
            id: 'add_to_dock',
            parentId: 'add_site_to_home_parent',
            title: 'Add to Application Dock',
            contexts: ['all']
        }, () => { const err = chrome.runtime.lastError; });

        chrome.contextMenus.create({
            id: 'add_to_vertical',
            parentId: 'add_site_to_home_parent',
            title: 'Add to Vertical Panel (FAB)',
            contexts: ['all']
        }, () => { const err = chrome.runtime.lastError; });

        chrome.contextMenus.create({
            id: 'add_to_horizontal',
            parentId: 'add_site_to_home_parent',
            title: 'Add to Horizontal Panel (Header)',
            contexts: ['all']
        }, () => { const err = chrome.runtime.lastError; });
    });
}

// Register on install and startup
chrome.runtime.onInstalled.addListener(() => {
    registerNetRules();
    initExtensionContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
    registerNetRules();
    initExtensionContextMenus();
});

registerNetRules();

if (chrome.contextMenus) {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        const targetUrl = info.linkUrl || info.pageUrl || (tab ? tab.url : '');
        if (!targetUrl) return;

        let targetTitle = info.selectionText || (tab && tab.title ? tab.title : '');
        if (!targetTitle || targetTitle === targetUrl) {
            try {
                targetTitle = new URL(targetUrl).hostname.replace(/^www\./i, '');
            } catch (e) {
                targetTitle = 'Shortcut';
            }
        }

        let panel = 'dock';
        if (info.menuItemId === 'add_to_vertical') panel = 'vertical';
        if (info.menuItemId === 'add_to_horizontal') panel = 'horizontal';

        const newtabUrl = chrome.runtime.getURL("src/index.html");

        chrome.tabs.query({}, (tabs) => {
            const openStartpageTab = tabs.find(t => t.url && (t.url.startsWith(newtabUrl) || t.url.startsWith('chrome://newtab')));
            if (openStartpageTab) {
                chrome.tabs.update(openStartpageTab.id, { active: true }, () => {
                    if (openStartpageTab.windowId) {
                        chrome.windows.update(openStartpageTab.windowId, { focused: true });
                    }
                    chrome.tabs.sendMessage(openStartpageTab.id, {
                        type: 'open-add-site-modal',
                        url: targetUrl,
                        title: targetTitle,
                        panel: panel
                    });
                });
            } else {
                const targetAppUrl = `${newtabUrl}?add_site=true&url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(targetTitle)}&panel=${encodeURIComponent(panel)}`;
                chrome.tabs.create({ url: targetAppUrl });
            }
        });
    });
}

