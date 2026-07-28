/**
 * Widget Studio — SVG Icons & Language Icon Renderers
 */

export const SVG_NEW_FILE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="18" x2="12" y2="12"/>
    <line x1="9"  y1="15" x2="15" y2="15"/>
</svg>`;

export const SVG_RENAME = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
</svg>`;

export const SVG_TRASH = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
</svg>`;

export const SVG_LOCK = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
</svg>`;

export const SVG_PEN = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.5" stroke-linecap="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
</svg>`;

/**
 * Return an SVG string representing the file type for use as an icon.
 * Colors match VS Code's Material Icon Theme conventions.
 */
export function fileIconSVG(language, size = 16) {
    const s = size;
    switch (language) {
        case 'html':
            return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path fill="#e44d26" d="M5 3l1.87 21.17L16 27l9.12-2.83L27 3z"/>
  <path fill="#f16529" d="M16 25.28V5H5.73l1.6 18.16z"/>
  <path fill="#ebebeb" d="M10 10h6v3h-3l.2 2H16v3h-5.5l-.5-5.67zm.3 8.5H13l.15 1.73L16 21v3.16l-5.5-1.54z"/>
  <path fill="#fff" d="M16 10h6l-.5 5.67H16v-3h2.7l.2-2H16zm0 8.5v3.16l5.5-1.54.7-7.62H16v3l2.85-.01.15 1.73-3 .01z"/>
</svg>`;
        case 'css':
            return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path fill="#1572b6" d="M5 3l1.87 21.17L16 27l9.12-2.83L27 3z"/>
  <path fill="#33a9dc" d="M16 25.28V5H5.73l1.6 18.16z"/>
  <path fill="#ebebeb" d="M10 10h6v3H10zm-.5 5h6.5v3H13l.2 1.73 2.8.77V22.9l-5.5-1.54z"/>
  <path fill="#fff" d="M16 10h6v3h-6zm0 5h6l-.5 5.67-5.5 1.54v-3.11l2.85-.77.2-2.33H16z"/>
</svg>`;
        case 'js':
            return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="28" height="28" x="2" y="2" rx="2" fill="#f7df1e"/>
  <path fill="#323330" d="M20.48 22.72c.52.87 1.2 1.51 2.4 1.51 1.01 0 1.65-.5 1.65-1.2 0-.83-.66-1.13-1.77-1.61l-.61-.26c-1.75-.74-2.92-1.68-2.92-3.65 0-1.82 1.38-3.2 3.54-3.2 1.54 0 2.64.53 3.43 1.93l-1.88 1.2c-.41-.74-.86-1.03-1.55-1.03-.7 0-1.15.45-1.15 1.03 0 .72.45 1.01 1.49 1.46l.61.26c2.06.88 3.25 1.79 3.25 3.81 0 2.18-1.72 3.38-4.02 3.38-2.26 0-3.72-1.07-4.43-2.48zm-9.12.22c.38.67.72 1.24 1.55 1.24.79 0 1.29-.31 1.29-1.51v-8.15h2.32v8.18c0 2.49-1.46 3.62-3.6 3.62-1.93 0-3.05-1-3.62-2.2z"/>
</svg>`;
        case 'json':
            return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path fill="#34d399" d="M8 4C5.8 4 4 5.8 4 8c0 1.5.8 2.8 2 3.5V20.5C4.8 21.2 4 22.5 4 24c0 2.2 1.8 4 4 4 1.1 0 2.1-.5 2.8-1.2l3.2 2c0 1.7 1.3 3.2 3 3.2s3-1.5 3-3.2l3.2-2c.7.7 1.7 1.2 2.8 1.2 2.2 0 4-1.8 4-4 0-1.5-.8-2.8-2-3.5V11.5c1.2-.7 2-2 2-3.5 0-2.2-1.8-4-4-4-1.1 0-2.1.5-2.8 1.2L16 3c0-1.7-1.3-3-3-3s-3 1.3-3 3l-2.2-1.8C7.1 4.5 6.1 4 5 4z" opacity=".2"/>
  <text x="16" y="22" text-anchor="middle" font-family="monospace" font-size="14" font-weight="700" fill="#34d399">{}</text>
</svg>`;
        case 'markdown':
            return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="30" height="20" x="1" y="6" rx="3" fill="#94a3b8" opacity=".25"/>
  <path fill="#94a3b8" d="M4 10h2v12H4zm5 0l3 4 3-4h2v12h-2v-8.5l-3 4-3-4V22H7V10zm14 0h2l-5 12h-2z"/>
</svg>`;
        default:
            return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="#64748b"
  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
  <polyline points="13 2 13 9 20 9"/>
</svg>`;
    }
}
