import { userSettings, saveSettings } from '../settings-state.js';
import { applyLayoutSettings } from '../../ui/panels/top-panel.js';
import { getCustomBackground, saveCustomBackground, deleteCustomBackground } from '../background-db.js';
import { initCustomDropdown } from '../custom-dropdown.js';

export function applyAppearanceVisuals() {
    // 1. Accent Color
    if (userSettings.accentColor === 'custom') {
        document.body.setAttribute('data-accent', 'custom');
        document.body.style.setProperty('--accent-color', userSettings.customAccentColor);
    } else {
        document.body.style.removeProperty('--accent-color');
        document.body.setAttribute('data-accent', userSettings.accentColor);
    }

    // 2. Background Visuals
    applyBackgroundVisuals();
}

export async function applyBackgroundVisuals() {
    const mesh = document.querySelector('.background-mesh');
    const imgLayer = document.getElementById('background-image-layer');
    if (!mesh || !imgLayer) return;

    const bgType = userSettings.backgroundType || 'mesh-default';

    // Clear custom mesh inline variables by default
    document.body.style.removeProperty('--blob-1');
    document.body.style.removeProperty('--blob-2');
    document.body.style.removeProperty('--blob-3');

    if (bgType.startsWith('mesh-')) {
        imgLayer.classList.remove('active');
        mesh.style.display = 'block';
        
        if (bgType === 'mesh-custom') {
            document.body.removeAttribute('data-mesh');
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.body.style.setProperty('--blob-1', userSettings.customMeshBlob1Dark);
                document.body.style.setProperty('--blob-2', userSettings.customMeshBlob2Dark);
                document.body.style.setProperty('--blob-3', userSettings.customMeshBlob3Dark);
            } else {
                document.body.style.setProperty('--blob-1', userSettings.customMeshBlob1Light);
                document.body.style.setProperty('--blob-2', userSettings.customMeshBlob2Light);
                document.body.style.setProperty('--blob-3', userSettings.customMeshBlob3Light);
            }
        } else {
            const meshName = bgType.replace('mesh-', '');
            if (meshName === 'default') {
                document.body.removeAttribute('data-mesh');
            } else {
                document.body.setAttribute('data-mesh', meshName);
            }
        }
    } else if (bgType === 'custom') {
        document.body.removeAttribute('data-mesh');
        let bgSrc = '';
        try {
            bgSrc = await getCustomBackground();
        } catch (e) {
            console.error('Failed to load custom bg from IndexedDB', e);
        }
        if (!bgSrc && userSettings.customBackgroundUrl) {
            bgSrc = userSettings.customBackgroundUrl;
        }

        if (bgSrc) {
            imgLayer.style.backgroundImage = `url("${bgSrc}")`;
            imgLayer.classList.add('active');
            mesh.style.display = 'none';
        } else {
            // fallback
            imgLayer.classList.remove('active');
            mesh.style.display = 'block';
        }
    } else {
        // Preset (use relative prefix ../assets/ since we run inside src/)
        document.body.removeAttribute('data-mesh');
        imgLayer.style.backgroundImage = `url("../assets/backgrounds/${bgType}.png")`;
        imgLayer.classList.add('active');
        mesh.style.display = 'none';
    }
}

export function initAppearance(modal) {
    // Initialize Custom Dropdown for Theme
    const dropdownTheme = initCustomDropdown('theme', (val) => {
        userSettings.theme = val;
        saveSettings();
    });
    if (dropdownTheme) {
        dropdownTheme.setValue(userSettings.theme);
    }

    const toggleWidth = document.getElementById('toggle-container-width');
    if (toggleWidth) {
        toggleWidth.checked = userSettings.containerWidth === 'full';
        toggleWidth.addEventListener('change', (e) => {
            userSettings.containerWidth = e.target.checked ? 'full' : 'contained';
            saveSettings();
            applyLayoutSettings();
        });
    }

    // Color Dots (Accent colors)
    const colorDots = modal.querySelectorAll('.color-dot');
    const customAccentInput = modal.querySelector('#setting-accent-custom');
    const customAccentWrapper = modal.querySelector('#custom-accent-wrapper');

    const updateAccentActiveState = (accentType) => {
        colorDots.forEach(d => {
            if (d.getAttribute('data-color') === accentType) {
                d.classList.add('active');
            } else {
                d.classList.remove('active');
            }
        });
        if (accentType === 'custom') {
            customAccentWrapper.classList.add('active');
        } else {
            customAccentWrapper.classList.remove('active');
        }
    };

    colorDots.forEach(dot => {
        dot.addEventListener('click', () => {
            const color = dot.getAttribute('data-color');
            userSettings.accentColor = color;
            saveSettings();
            applyAppearanceVisuals();
            updateAccentActiveState(color);
        });
    });

    if (customAccentInput) {
        customAccentInput.value = userSettings.customAccentColor || '#3b82f6';
        customAccentInput.addEventListener('input', (e) => {
            const selectedVal = e.target.value;
            userSettings.accentColor = 'custom';
            userSettings.customAccentColor = selectedVal;
            saveSettings();
            applyAppearanceVisuals();
            updateAccentActiveState('custom');
        });
        
        customAccentWrapper.addEventListener('click', () => {
            customAccentInput.click();
        });
    }

    // Initial state setup for accent dots
    updateAccentActiveState(userSettings.accentColor);

    // Background Theme selection presets
    const bgPresetCards = modal.querySelectorAll('.bg-preset-card');
    const customBgControls = modal.querySelector('#custom-bg-controls');
    const customMeshControls = modal.querySelector('#custom-mesh-controls');
    const customBgUrlInput = modal.querySelector('#custom-bg-url');
    const btnApplyBgUrl = modal.querySelector('#btn-apply-bg-url');
    const customBgFileInput = modal.querySelector('#custom-bg-file');

    // Custom Mesh pickers
    const meshLightBlob1 = modal.querySelector('#mesh-light-blob-1');
    const meshLightBlob2 = modal.querySelector('#mesh-light-blob-2');
    const meshLightBlob3 = modal.querySelector('#mesh-light-blob-3');
    const meshDarkBlob1 = modal.querySelector('#mesh-dark-blob-1');
    const meshDarkBlob2 = modal.querySelector('#mesh-dark-blob-2');
    const meshDarkBlob3 = modal.querySelector('#mesh-dark-blob-3');

    const updateControlsVisibility = (bgType) => {
        if (bgType === 'custom') {
            customBgControls.classList.remove('hidden');
        } else {
            customBgControls.classList.add('hidden');
        }

        if (bgType === 'mesh-custom') {
            customMeshControls.classList.remove('hidden');
        } else {
            customMeshControls.classList.add('hidden');
        }
    };

    // Pre-fill fields
    if (customBgUrlInput) {
        customBgUrlInput.value = userSettings.customBackgroundUrl || '';
    }

    if (meshLightBlob1) meshLightBlob1.value = userSettings.customMeshBlob1Light;
    if (meshLightBlob2) meshLightBlob2.value = userSettings.customMeshBlob2Light;
    if (meshLightBlob3) meshLightBlob3.value = userSettings.customMeshBlob3Light;
    if (meshDarkBlob1) meshDarkBlob1.value = userSettings.customMeshBlob1Dark;
    if (meshDarkBlob2) meshDarkBlob2.value = userSettings.customMeshBlob2Dark;
    if (meshDarkBlob3) meshDarkBlob3.value = userSettings.customMeshBlob3Dark;

    // Set initial active card
    const initialBg = userSettings.backgroundType || 'mesh-default';
    bgPresetCards.forEach(card => {
        if (card.getAttribute('data-bg') === initialBg) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
    updateControlsVisibility(initialBg);

    // Add click event for preset cards
    bgPresetCards.forEach(card => {
        card.addEventListener('click', () => {
            bgPresetCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            const selectedBg = card.getAttribute('data-bg');
            userSettings.backgroundType = selectedBg;
            saveSettings();
            applyAppearanceVisuals();
            updateControlsVisibility(selectedBg);
        });
    });

    // Apply custom URL
    if (btnApplyBgUrl && customBgUrlInput) {
        btnApplyBgUrl.addEventListener('click', async () => {
            const urlVal = customBgUrlInput.value.trim();
            if (urlVal) {
                // Clear any IndexedDB uploaded custom background to resolve URL vs Upload conflict
                try {
                    await deleteCustomBackground();
                } catch (e) {
                    console.error(e);
                }

                userSettings.customBackgroundUrl = urlVal;
                userSettings.backgroundType = 'custom';
                saveSettings();
                applyAppearanceVisuals();
                
                // Set custom card as active visual state
                bgPresetCards.forEach(c => {
                    if (c.getAttribute('data-bg') === 'custom') {
                        c.classList.add('active');
                    } else {
                        c.classList.remove('active');
                    }
                });
            }
        });
    }

    // Apply uploaded file
    if (customBgFileInput) {
        customBgFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const dataUrl = event.target.result;
                    try {
                        await saveCustomBackground(dataUrl);
                        
                        // Clear URL setting to avoid visual conflicts
                        userSettings.customBackgroundUrl = '';
                        if (customBgUrlInput) customBgUrlInput.value = '';

                        userSettings.backgroundType = 'custom';
                        saveSettings();
                        applyAppearanceVisuals();
                        
                        // Set custom card as active visual state
                        bgPresetCards.forEach(c => {
                            if (c.getAttribute('data-bg') === 'custom') {
                                c.classList.add('active');
                            } else {
                                c.classList.remove('active');
                            }
                        });
                    } catch (err) {
                        console.error('Failed to save uploaded background', err);
                        alert('Could not save background image.');
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Custom mesh gradient color inputs
    const registerMeshPicker = (inputEl, settingKey) => {
        if (inputEl) {
            inputEl.addEventListener('input', (e) => {
                userSettings[settingKey] = e.target.value;
                saveSettings();
                applyAppearanceVisuals();
            });
        }
    };

    registerMeshPicker(meshLightBlob1, 'customMeshBlob1Light');
    registerMeshPicker(meshLightBlob2, 'customMeshBlob2Light');
    registerMeshPicker(meshLightBlob3, 'customMeshBlob3Light');
    registerMeshPicker(meshDarkBlob1, 'customMeshBlob1Dark');
    registerMeshPicker(meshDarkBlob2, 'customMeshBlob2Dark');
    registerMeshPicker(meshDarkBlob3, 'customMeshBlob3Dark');
}
