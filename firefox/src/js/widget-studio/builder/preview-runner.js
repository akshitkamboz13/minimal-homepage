/**
 * Widget Studio — Sandboxed Live Preview Runner
 */
import { state } from './state.js';
import { saveCurrentEditorContent } from './editor-pane.js';
import { getSelectedPermissions } from './storage-export.js';
import { autoDetectPermissionsFromCode } from './manifest-sync.js';

export function resolveAccentColor() {
    try {
        const s = JSON.parse(localStorage.getItem('startpage_settings')) || {};
        const p = s.accentColor || 'blue';
        let hex = '#3b82f6';
        if (p === 'custom') {
            hex = s.customAccentColor || '#3b82f6';
        } else {
            hex = { blue: '#3b82f6', purple: '#a855f7', emerald: '#10b981',
                    amber: '#f59e0b', rose: '#f43f5e' }[p] || '#3b82f6';
        }
        document.body.style.setProperty('--accent-color', hex);
        return hex;
    } catch (e) { return '#3b82f6'; }
}

export function updatePreviewBackground(theme) {
    const wrapper = document.querySelector('.preview-frame-wrapper');
    const body    = document.querySelector('.preview-body');
    wrapper?.classList.toggle('theme-light', theme === 'light');
    wrapper?.classList.toggle('theme-dark',  theme !== 'light');
    body?.classList.toggle('theme-light', theme === 'light');
    body?.classList.toggle('theme-dark',  theme !== 'light');
}

export function runPreview() {
    const previewIframe   = document.getElementById('preview-iframe');
    const previewThemeSel = document.getElementById('preview-theme-select');
    const textareaEnv     = document.getElementById('widget-env');
    if (!previewIframe) return;

    saveCurrentEditorContent();
    autoDetectPermissionsFromCode();
    const { html, css, js, files } = state.fs.getAggregatedSources();

    const envObj = {};
    (textareaEnv?.value || '').split('\n').forEach(line => {
        const idx = line.indexOf('=');
        if (idx !== -1) {
            const k = line.substring(0, idx).trim();
            const v = line.substring(idx + 1).trim();
            if (k) envObj[k] = v;
        }
    });

    const activeTheme = previewThemeSel?.value || 'dark';
    updatePreviewBackground(activeTheme);

    const sendData = () => {
        if (!previewIframe.contentWindow) return;
        previewIframe.contentWindow.postMessage({
            type:        'init',
            html,
            css,
            js,
            files,
            env:         envObj,
            permissions: getSelectedPermissions(),
            theme:       activeTheme,
            accentColor: resolveAccentColor(),
        }, '*');
    };

    previewIframe.onload = sendData;
    previewIframe.src = 'sandbox.html';
}

export function initPreviewRunner() {
    const btnRefresh      = document.getElementById('btn-refresh-preview');
    const previewThemeSel = document.getElementById('preview-theme-select');
    const previewIframe   = document.getElementById('preview-iframe');

    btnRefresh?.addEventListener('click', runPreview);

    previewThemeSel?.addEventListener('change', e => {
        const theme = e.target.value;
        updatePreviewBackground(theme);
        previewIframe?.contentWindow?.postMessage({ type: 'theme-changed', theme }, '*');
    });

    window.addEventListener('message', e => {
        const data = e.data;
        if (data?.type === 'resize-widget' && previewIframe?.contentWindow === e.source) {
            const container = previewIframe.parentElement;
            if (container) {
                container.style.width  = `${Math.min(Math.max(data.width,  100), window.innerWidth  - 40)}px`;
                container.style.height = `${Math.min(Math.max(data.height, 100), window.innerHeight - 40)}px`;
            }
        } else if (data?.type === 'open-external-url' && data.url) {
            if (window.chrome && chrome.tabs && chrome.tabs.create) {
                chrome.tabs.create({ url: data.url });
            } else {
                window.open(data.url, '_blank', 'noopener,noreferrer');
            }
        }
    });

    const initialTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', initialTheme);
    if (previewThemeSel) previewThemeSel.value = initialTheme;
    updatePreviewBackground(initialTheme);
    resolveAccentColor();

    runPreview();
}
