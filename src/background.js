// background.js — service worker that bridges offscreen doc ↔ new tab page

// Forward all voice messages between offscreen doc and the active tab
chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.type === 'voice-start' || msg.type === 'voice-stop') {
        // From new-tab page → forward to offscreen document
        ensureOffscreen().then(() => {
            chrome.runtime.sendMessage(msg);
        });
    } else if (msg.type === 'voice-result' || msg.type === 'voice-status' || msg.type === 'voice-error') {
        // From offscreen doc → forward to the active new-tab page
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                // Can't sendMessage to a new-tab override page via tabs.sendMessage,
                // but runtime.sendMessage broadcasts to all extension pages including the new tab
                // The offscreen doc already sends via runtime.sendMessage, so the new tab page
                // will receive it if it's also listening on runtime.onMessage.
                // No need to re-forward — the new tab page listens on runtime.onMessage directly.
            }
        });
    }
});

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

