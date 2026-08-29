export function initVoiceSearch() {
    const voiceSearchBtn = document.getElementById('voice-search-btn');
    const searchInput = document.getElementById('search-input');

    if (!voiceSearchBtn || !searchInput) return;

    let isListening = false;

    if (window.chrome && chrome.runtime && chrome.runtime.onMessage) {
        // Listen for results from the offscreen document via service worker
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg.type === 'voice-result') {
                searchInput.value = msg.text;
            } else if (msg.type === 'voice-status') {
                if (msg.status === 'listening') {
                    isListening = true;
                    searchInput.placeholder = 'Listening... click mic to stop';
                    voiceSearchBtn.classList.add('listening');
                } else if (msg.status === 'stopped') {
                    isListening = false;
                    searchInput.placeholder = 'What are you looking for?';
                    voiceSearchBtn.classList.remove('listening');
                    searchInput.focus();
                }
            } else if (msg.type === 'voice-error') {
                isListening = false;
                searchInput.placeholder = 'What are you looking for?';
                voiceSearchBtn.classList.remove('listening');
            }
        });
    }

    voiceSearchBtn.addEventListener('click', () => {
        const modeGoogle = document.getElementById('mode-google');
        if (modeGoogle) modeGoogle.checked = true;
        
        if (isListening) {
            if (window.chrome && chrome.runtime) {
                chrome.runtime.sendMessage({ type: 'voice-stop' });
            }
        } else {
            searchInput.value = '';
            if (window.chrome && chrome.runtime) {
                chrome.runtime.sendMessage({ type: 'voice-start' });
            }
        }
    });
}
