import { loadMediaConfig, updateMediaConfig, refreshAudibleTabs } from '../../media/media-controller.js';

export function initMediaSettings() {
    const container = document.getElementById('tab-media');
    if (!container) return;

    renderMediaSettings();

    window.addEventListener('media-config-changed', () => {
        renderMediaSettings();
    });

    window.addEventListener('media-state-updated', () => {
        updateMediaLiveStatus();
    });
}

function renderMediaSettings() {
    const enabledToggle = document.getElementById('media-toggle-enabled');
    const placementSelect = document.getElementById('media-setting-placement');
    const modeSelect = document.getElementById('media-setting-mode');

    const config = loadMediaConfig();

    if (enabledToggle) {
        enabledToggle.checked = config.enabled !== false;
        enabledToggle.onchange = (e) => {
            updateMediaConfig({ enabled: e.target.checked });
        };
    }

    if (placementSelect) {
        placementSelect.value = config.placement || 'vertical';
        placementSelect.onchange = (e) => {
            updateMediaConfig({ placement: e.target.value });
        };
    }

    if (modeSelect) {
        modeSelect.value = config.displayMode || 'always';
        modeSelect.onchange = (e) => {
            updateMediaConfig({ displayMode: e.target.value });
        };
    }

    updateMediaLiveStatus();
}

async function updateMediaLiveStatus() {
    const statusEl = document.getElementById('media-live-status-desc');
    if (!statusEl) return;

    const tabs = await refreshAudibleTabs();
    if (tabs && tabs.length > 0) {
        statusEl.innerHTML = `<span style="color:#22c55e;font-weight:600;">● Active</span> — ${tabs.length} tab(s) playing sound: <em>${escapeHtml(tabs[0].title || 'Audio')}</em>`;
    } else {
        statusEl.innerHTML = `<span style="color:var(--text-secondary);opacity:0.7;">○ Idle</span> — No audio or video currently playing in browser`;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}
