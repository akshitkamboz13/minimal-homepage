// offscreen.js — runs in an offscreen document where Web Speech API works

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let isListening = false;
let accumulatedTranscript = '';

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onstart = () => {
        isListening = true;
        chrome.runtime.sendMessage({ type: 'voice-status', status: 'listening' });
    };

    recognition.onresult = (event) => {
        let sessionFinal = '';
        let sessionInterim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                sessionFinal += t;
            } else {
                sessionInterim += t;
            }
        }

        if (sessionFinal) {
            accumulatedTranscript += sessionFinal;
        }

        chrome.runtime.sendMessage({
            type: 'voice-result',
            text: accumulatedTranscript + sessionInterim
        });
    };

    recognition.onerror = (e) => {
        const fatal = ['not-allowed', 'service-not-allowed', 'language-not-supported'];
        if (fatal.includes(e.error)) {
            isListening = false;
            accumulatedTranscript = '';
            chrome.runtime.sendMessage({ type: 'voice-status', status: 'stopped' });
            chrome.runtime.sendMessage({ type: 'voice-error', error: e.error });
        }
        // non-fatal (no-speech, aborted) — let onend handle restart
    };

    recognition.onend = () => {
        if (isListening) {
            // Auto-restart on silence timeout
            setTimeout(() => {
                if (isListening) {
                    try { recognition.start(); } catch(e) {}
                }
            }, 50);
        } else {
            chrome.runtime.sendMessage({ type: 'voice-status', status: 'stopped' });
        }
    };
}

// Listen for commands from the service worker
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'voice-start') {
        if (recognition && !isListening) {
            accumulatedTranscript = '';
            try {
                recognition.start();
            } catch(e) {
                chrome.runtime.sendMessage({ type: 'voice-error', error: 'start-failed' });
            }
        }
    } else if (msg.type === 'voice-stop') {
        if (recognition && isListening) {
            isListening = false;
            accumulatedTranscript = '';
            try { recognition.stop(); } catch(e) {}
        }
    }
});
