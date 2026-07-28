/**
 * Widget Studio — Storage, Save & Export Utilities
 */
import { state } from './state.js';

export function compressString(str) {
    const blob = new Blob([str], { type: 'application/json' });
    const cs   = blob.stream().pipeThrough(new CompressionStream('gzip'));
    return new Response(cs).blob();
}

export function getCustomWidgets() {
    try { return JSON.parse(localStorage.getItem('startpage_custom_widgets')) || []; }
    catch (e) { return []; }
}

export function saveCustomWidgets(widgets) {
    localStorage.setItem('startpage_custom_widgets', JSON.stringify(widgets));
}

export function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, t =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t)
    );
}

export function showAlert(text, type) {
    const alertEl = document.getElementById('studio-alert');
    if (!alertEl) return;
    alertEl.textContent = text;
    alertEl.className = `studio-alert ${type} show`;
    setTimeout(() => alertEl.classList.remove('show'), 3000);
}

export function getSelectedPermissions() {
    return ['fetch', 'notifications', 'clipboard', 'storage'].filter(p =>
        document.getElementById(`perm-${p}`)?.checked
    );
}
