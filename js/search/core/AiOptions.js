import { userSettings, saveSettings } from '../../state/settings.js';

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

export function initAiOptions() {
    const aiLabel = document.querySelector('.ai-label');
    const modeAiRadio = document.getElementById('mode-ai');
    const searchInput = document.getElementById('search-input');
    
    const updateAiLabel = () => {
        if (userSettings.selectedAi && userSettings.selectedAiName && aiLabel) {
            aiLabel.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> ${userSettings.selectedAiName}`;
        }
    };
    updateAiLabel();

    window.addEventListener('resize', updateSlider);
    setTimeout(updateSlider, 50);

    if (aiLabel) {
        aiLabel.addEventListener('click', (e) => {
            if (!userSettings.selectedAi) {
                e.preventDefault();
            }
        });
    }

    const aiOptions = document.querySelectorAll('.ai-option');
    aiOptions.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const aiType = e.target.getAttribute('data-ai');
            const aiName = e.target.textContent;
            
            userSettings.selectedAi = aiType;
            userSettings.selectedAiName = aiName;
            saveSettings();
            
            updateAiLabel();
            if (modeAiRadio) modeAiRadio.checked = true;
            updateSlider();
            if (searchInput) searchInput.focus();
        });
    });

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
}
