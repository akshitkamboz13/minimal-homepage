import { userSettings, saveSettings } from '../settings-state.js';

export function initKeyboard(modal) {
    const toggleKbdAutofocus = document.getElementById('toggle-kbd-autofocus');
    if (toggleKbdAutofocus) {
        toggleKbdAutofocus.checked = userSettings.kbdAutofocus;
        toggleKbdAutofocus.addEventListener('change', (e) => {
            userSettings.kbdAutofocus = e.target.checked;
            saveSettings();
        });
    }

    const toggleKbdEsc = document.getElementById('toggle-kbd-esc-clear');
    if (toggleKbdEsc) {
        toggleKbdEsc.checked = userSettings.kbdEscClear;
        toggleKbdEsc.addEventListener('change', (e) => {
            userSettings.kbdEscClear = e.target.checked;
            saveSettings();
        });
    }

    const searchInput = document.getElementById('search-input');
    
    // Focus search input automatically on load if enabled
    if (searchInput && userSettings.kbdAutofocus) {
        // Use a tiny timeout to ensure styling and transitions are settled
        setTimeout(() => {
            searchInput.focus();
        }, 50);
    }

    // Register global keyboard listener for shortcuts
    window.addEventListener('keydown', (e) => {
        const isEditing = e.target.tagName === 'INPUT' || 
                          e.target.tagName === 'TEXTAREA' || 
                          e.target.tagName === 'SELECT' || 
                          e.target.isContentEditable;

        // Escape: clear input if focused, otherwise close modals/panels
        if (e.key === 'Escape') {
            let processed = false;

            if (isEditing && e.target === searchInput && userSettings.kbdEscClear) {
                if (searchInput.value !== '') {
                    searchInput.value = '';
                    // trigger change & input event to clear suggestions
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                    processed = true;
                }
            }

            if (!processed) {
                const settingsModal = document.getElementById('settings-modal');
                const visualSearchPanel = document.getElementById('visual-search-panel');
                const googleAppsPanel = document.getElementById('google-apps-panel');
                const imageSearchTrigger = document.getElementById('image-search-trigger');
                const googleAppsTrigger = document.getElementById('google-apps-trigger');

                if (settingsModal && !settingsModal.classList.contains('hidden')) {
                    settingsModal.classList.add('hidden');
                    processed = true;
                }
                if (visualSearchPanel && visualSearchPanel.classList.contains('active')) {
                    visualSearchPanel.classList.remove('active');
                    if (imageSearchTrigger) imageSearchTrigger.classList.remove('active');
                    processed = true;
                }
                if (googleAppsPanel && googleAppsPanel.classList.contains('active')) {
                    googleAppsPanel.classList.remove('active');
                    if (googleAppsTrigger) googleAppsTrigger.classList.remove('active');
                    processed = true;
                }
            }

            if (processed) {
                e.preventDefault();
            }
            return;
        }

        // Alt + S: Open System Settings
        if (e.altKey && (e.key === 's' || e.key === 'S')) {
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) {
                settingsModal.classList.remove('hidden');
                e.preventDefault();
            }
            return;
        }

        // Focus search bar on any printable character key press
        if (!isEditing && userSettings.kbdAutofocus) {
            // Only capture single characters, ignoring control combinations
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                if (searchInput) {
                    searchInput.focus();
                }
            }
        }
    });
}
