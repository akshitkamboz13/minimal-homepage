import { userSettings, saveSettings, onSettingsChanged } from '../../settings/index.js';
import { getAiIcon } from '../../settings/panels/ai.js';

export function updateSlider() {
    const slider = document.querySelector('.mode-slider');
    const checkedRadio = document.querySelector('input[name="search-mode"]:checked');
    if (!slider || !checkedRadio) return;
    
    const activeLabel = checkedRadio.value === 'google' 
        ? document.querySelector('.google-label') 
        : document.querySelector('.ai-dropdown-wrapper');
        
    if (activeLabel) {
        slider.style.width = `${activeLabel.offsetWidth}px`;
        slider.style.transform = `translateX(${activeLabel.offsetLeft}px)`;
    }
}

export function renderAiDropdown() {
    const dropdown = document.querySelector('.ai-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';

    const enabledEngines = userSettings.aiEngines.filter(e => e.enabled);
    enabledEngines.forEach(engine => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ai-option';
        btn.setAttribute('data-ai', engine.id);
        btn.textContent = engine.name;
        dropdown.appendChild(btn);
    });

    // Re-bind listeners for these buttons
    const modeAiRadio = document.getElementById('mode-ai');
    const searchInput = document.getElementById('search-input');
    const aiLabel = document.querySelector('.ai-label');

    const updateAiLabel = () => {
        const activeEngine = userSettings.aiEngines.find(e => e.id === userSettings.selectedAi);
        if (activeEngine && aiLabel) {
            aiLabel.innerHTML = `${getAiIcon(userSettings.selectedAi)} ${activeEngine.name}`;
        }
    };

    dropdown.querySelectorAll('.ai-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const aiId = btn.getAttribute('data-ai');
            const targetEngine = userSettings.aiEngines.find(x => x.id === aiId);
            if (targetEngine) {
                userSettings.selectedAi = targetEngine.id;
                userSettings.selectedAiName = targetEngine.name;
                saveSettings();
                updateAiLabel();
                if (modeAiRadio) modeAiRadio.checked = true;
                updateSlider();
                if (searchInput) searchInput.focus();
            }
        });
    });
}

export function initAiOptions() {
    const aiLabel = document.querySelector('.ai-label');
    const modeAiRadio = document.getElementById('mode-ai');
    const searchInput = document.getElementById('search-input');
    
    const updateAiLabel = () => {
        const activeEngine = userSettings.aiEngines.find(e => e.id === userSettings.selectedAi);
        if (activeEngine && aiLabel) {
            aiLabel.innerHTML = `${getAiIcon(userSettings.selectedAi)} ${activeEngine.name}`;
        }
    };

    renderAiDropdown();
    updateAiLabel();

    // Apply persisted AI search bar visibility
    const aiDropdownWrapper = document.querySelector('.ai-dropdown-wrapper');
    const applyAiToggleVisibility = (show) => {
        if (aiDropdownWrapper) aiDropdownWrapper.style.display = show ? '' : 'none';
        if (modeAiRadio) modeAiRadio.style.display = show ? '' : 'none';
        if (!show) {
            const modeGoogleRadio = document.getElementById('mode-google');
            if (modeGoogleRadio) modeGoogleRadio.checked = true;
        }
    };
    applyAiToggleVisibility(userSettings.showAiToggle !== false);

    window.addEventListener('resize', updateSlider);
    setTimeout(updateSlider, 50);

    if (aiLabel) {
        aiLabel.addEventListener('click', (e) => {
            if (!userSettings.selectedAi) {
                e.preventDefault();
            }
        });
    }

    // Listen for search mode changes to save if remember is true
    const searchModeRadios = document.querySelectorAll('input[name="search-mode"]');
    searchModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateSlider();
            if (userSettings.rememberSearchMode) {
                userSettings.lastSearchMode = e.target.value;
                saveSettings();
            }
        });
    });

    // Apply remembered search mode on load
    if (userSettings.rememberSearchMode && userSettings.lastSearchMode) {
        const targetRadio = document.getElementById(`mode-${userSettings.lastSearchMode}`);
        if (targetRadio) {
            targetRadio.checked = true;
        }
    }

    // Subscribe to settings changes to refresh dropdown items and selected engine labels in real-time
    onSettingsChanged(() => {
        renderAiDropdown();
        updateAiLabel();
        updateSlider();
    });
}
