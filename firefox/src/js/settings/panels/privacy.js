import { userSettings, saveSettings } from '../settings-state.js';
import { initCustomDropdown } from '../custom-dropdown.js';

export function initPrivacy(modal) {
    const toggleKbdAutofocus = document.getElementById('toggle-kbd-autofocus');
    if (toggleKbdAutofocus) {
        toggleKbdAutofocus.checked = !!userSettings.kbdAutofocus;
        toggleKbdAutofocus.addEventListener('change', (e) => {
            userSettings.kbdAutofocus = e.target.checked;
            saveSettings();
        });
    }

    const toggleRememberSearch = document.getElementById('toggle-remember-search');
    if (toggleRememberSearch) {
        toggleRememberSearch.checked = userSettings.rememberSearchMode;
        toggleRememberSearch.addEventListener('change', (e) => {
            userSettings.rememberSearchMode = e.target.checked;
            saveSettings();
        });
    }

    const dropdownHistoryCount = initCustomDropdown('history-count', (val) => {
        userSettings.historyCount = parseInt(val);
        saveSettings();
    });
    if (dropdownHistoryCount) {
        dropdownHistoryCount.setValue(userSettings.historyCount);
    }

    const dropdownSuggestionsLimit = initCustomDropdown('suggestions-limit', (val) => {
        userSettings.suggestionsLimit = parseInt(val);
        saveSettings();
    });
    if (dropdownSuggestionsLimit) {
        dropdownSuggestionsLimit.setValue(userSettings.suggestionsLimit || 5);
    }

    const toggleAutocomplete = document.getElementById('toggle-autocomplete-suggestions');
    if (toggleAutocomplete) {
        toggleAutocomplete.checked = userSettings.autocompleteSuggestions;
        toggleAutocomplete.addEventListener('change', (e) => {
            userSettings.autocompleteSuggestions = e.target.checked;
            saveSettings();
        });
    }

    const btnClearHistory = document.getElementById('btn-clear-history');
    if (btnClearHistory) {
        btnClearHistory.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear your search history?')) {
                localStorage.removeItem('startpage_search_history');
                alert('Search history cleared!');
            }
        });
    }
}
