import { userSettings, saveSettings } from '../settings-state.js';
import { initCustomDropdown } from '../custom-dropdown.js';

export function getAiIcon(aiType) {
    // Return standard SVG icon as requested
    return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ai-icon-img"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
}

export function initAi(modal) {
    const listContainer = document.getElementById('ai-engines-list');
    const btnAdd = document.getElementById('btn-add-custom-ai');
    const inputName = document.getElementById('add-ai-name');
    const inputUrl = document.getElementById('add-ai-url');

    const updateAiLabel = () => {
        const activeEngine = userSettings.aiEngines.find(e => e.id === userSettings.selectedAi);
        if (activeEngine) {
            userSettings.selectedAiName = activeEngine.name;
        }
        
        // Sync display name with search panel
        const aiLabel = document.querySelector('.ai-label');
        if (aiLabel && activeEngine) {
            aiLabel.innerHTML = `${getAiIcon(userSettings.selectedAi)} ${activeEngine.name}`;
        }
    };

    const setupAiProviderDropdown = () => {
        const dropdownEl = modal.querySelector('#dropdown-ai-provider');
        const dropdownMenu = modal.querySelector('#dropdown-ai-provider .dropdown-menu');
        const triggerLabel = modal.querySelector('#dropdown-ai-provider .dropdown-selected-label');
        if (!dropdownMenu) return;

        dropdownMenu.innerHTML = '';
        const enabled = userSettings.aiEngines.filter(e => e.enabled);

        // Ensure selectedAi is in the enabled list, otherwise default to first enabled
        let activeId = userSettings.selectedAi;
        if (!enabled.some(e => e.id === activeId) && enabled.length > 0) {
            activeId = enabled[0].id;
            userSettings.selectedAi = activeId;
            const activeEngine = enabled[0];
            userSettings.selectedAiName = activeEngine.name;
            saveSettings();
        }

        enabled.forEach(engine => {
            const li = document.createElement('li');
            li.className = `dropdown-item ${engine.id === activeId ? 'active' : ''}`;
            li.setAttribute('data-value', engine.id);
            li.setAttribute('role', 'option');
            li.textContent = engine.name;
            dropdownMenu.appendChild(li);
        });

        // Clone trigger to clear previous event listeners before re-initializing dropdown
        const trigger = dropdownEl.querySelector('.dropdown-trigger');
        if (trigger) {
            trigger.parentNode.replaceChild(trigger.cloneNode(true), trigger);
        }

        const dropdownController = initCustomDropdown('ai-provider', (val) => {
            userSettings.selectedAi = val;
            const engine = userSettings.aiEngines.find(e => e.id === val);
            if (engine) {
                userSettings.selectedAiName = engine.name;
            }
            saveSettings();
            updateAiLabel();
        });

        if (dropdownController) {
            dropdownController.setValue(activeId);
        }
    };

    const renderEnginesList = () => {
        if (!listContainer) return;
        listContainer.innerHTML = '';

        userSettings.aiEngines.forEach((engine) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';
            row.style.padding = '0.5rem';
            row.style.background = 'rgba(255, 255, 255, 0.02)';
            row.style.borderRadius = '6px';
            row.style.border = '1px solid var(--glass-border)';

            // Left: Checkbox + Name
            const left = document.createElement('div');
            left.style.display = 'flex';
            left.style.alignItems = 'center';
            left.style.gap = '0.5rem';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = engine.enabled;
            
            // Prevent disabling all engines
            const enabledCount = userSettings.aiEngines.filter(e => e.enabled).length;
            if (engine.enabled && enabledCount <= 1) {
                checkbox.disabled = true;
            }

            checkbox.addEventListener('change', (e) => {
                engine.enabled = e.target.checked;
                saveSettings();
                renderEnginesList();
                setupAiProviderDropdown();
            });

            const name = document.createElement('span');
            name.textContent = engine.name;
            name.style.fontSize = '0.9rem';
            name.style.color = 'var(--text-color)';

            left.appendChild(checkbox);
            left.appendChild(name);

            row.appendChild(left);

            // Right: Delete button for custom engines
            if (engine.isCustom) {
                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.style.padding = '0.25rem';
                delBtn.style.color = 'var(--text-secondary)';
                delBtn.style.background = 'transparent';
                delBtn.style.border = 'none';
                delBtn.style.cursor = 'pointer';
                delBtn.style.display = 'flex';
                delBtn.style.alignItems = 'center';
                delBtn.style.justifyContent = 'center';
                delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
                
                delBtn.addEventListener('click', () => {
                    userSettings.aiEngines = userSettings.aiEngines.filter(x => x.id !== engine.id);
                    // If we deleted the active default AI, change it to first available
                    if (userSettings.selectedAi === engine.id) {
                        const remaining = userSettings.aiEngines.filter(x => x.enabled);
                        if (remaining.length > 0) {
                            userSettings.selectedAi = remaining[0].id;
                            userSettings.selectedAiName = remaining[0].name;
                        }
                    }
                    saveSettings();
                    renderEnginesList();
                    setupAiProviderDropdown();
                });
                row.appendChild(delBtn);
            }

            listContainer.appendChild(row);
        });
    };

    // Add Custom AI click listener
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            const nameVal = inputName ? inputName.value.trim() : '';
            const urlVal = inputUrl ? inputUrl.value.trim() : '';

            if (!nameVal || !urlVal) {
                alert('Please enter both name and query URL for the custom AI.');
                return;
            }

            const id = 'custom_' + Date.now();
            userSettings.aiEngines.push({
                id,
                name: nameVal,
                url: urlVal,
                enabled: true,
                isCustom: true
            });
            saveSettings();

            if (inputName) inputName.value = '';
            if (inputUrl) inputUrl.value = '';

            renderEnginesList();
            setupAiProviderDropdown();
        });
    }

    // Initialize list and dropdown
    renderEnginesList();
    setupAiProviderDropdown();
    updateAiLabel();

    // Show AI toggle on search bar
    const aiDropdownWrapper = document.querySelector('.ai-dropdown-wrapper');
    const modeAiRadio = document.getElementById('mode-ai');

    const applyAiToggleVisibility = (show) => {
        if (aiDropdownWrapper) {
            aiDropdownWrapper.style.display = show ? '' : 'none';
        }
        if (modeAiRadio) {
            modeAiRadio.style.display = show ? '' : 'none';
        }
        // If hiding, switch search back to Google
        if (!show) {
            const modeGoogleRadio = document.getElementById('mode-google');
            if (modeGoogleRadio) modeGoogleRadio.checked = true;
        }
    };

    const toggleShowAi = document.getElementById('toggle-show-ai');
    if (toggleShowAi) {
        toggleShowAi.checked = userSettings.showAiToggle;
        applyAiToggleVisibility(userSettings.showAiToggle);
        toggleShowAi.addEventListener('change', (e) => {
            userSettings.showAiToggle = e.target.checked;
            saveSettings();
            applyAiToggleVisibility(e.target.checked);
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
