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
