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
            url: 'offscreen.html',
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

// Trigger rule registration on startup, install and immediate loading
chrome.runtime.onInstalled.addListener(registerNetRules);
chrome.runtime.onStartup.addListener(registerNetRules);
registerNetRules();

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

// Trigger rule registration on startup, install and immediate loading
chrome.runtime.onInstalled.addListener(registerNetRules);
chrome.runtime.onStartup.addListener(registerNetRules);
registerNetRules();
