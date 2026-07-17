import { userSettings, saveSettings } from '../settings-state.js';
import { initCustomDropdown } from '../custom-dropdown.js';

export function initAi(modal) {
    const dropdownAiProvider = initCustomDropdown('ai-provider', (val) => {
        const options = { gemini: 'Google AI', chatgpt: 'ChatGPT', claude: 'Claude', grok: 'Grok' };
        userSettings.selectedAi = val;
        userSettings.selectedAiName = options[val] || val;
        saveSettings();
        
        // Sync display name with search panel
        const aiLabel = document.querySelector('.ai-label');
        if (aiLabel) {
            aiLabel.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> ${userSettings.selectedAiName}`;
        }
    });
    if (dropdownAiProvider) {
        dropdownAiProvider.setValue(userSettings.selectedAi || 'gemini');
    }

    const toggleAiDirect = document.getElementById('toggle-ai-direct');
    if (toggleAiDirect) {
        toggleAiDirect.checked = userSettings.aiDirect;
        toggleAiDirect.addEventListener('change', (e) => {
            userSettings.aiDirect = e.target.checked;
            saveSettings();
        });
    }

    const inputAiPrompt = document.getElementById('setting-ai-custom-prompt');
    if (inputAiPrompt) {
        inputAiPrompt.value = userSettings.aiCustomPrompt || '';
        inputAiPrompt.addEventListener('input', (e) => {
            userSettings.aiCustomPrompt = e.target.value;
            saveSettings();
        });
    }
}
