/**
 * Widget Studio — Manifest & Language Detection Helpers
 */

export function detectLanguage(name) {
    if (!name) return 'text';
    const ext = name.split('.').pop().toLowerCase();
    return (
        { html: 'html', htm: 'html', css: 'css', js: 'js', mjs: 'js',
          cjs: 'js', json: 'json', md: 'markdown', txt: 'text' }[ext] || 'text'
    );
}

/**
 * Build the default manifest.json content object.
 * @param {object} props - Optional property overrides.
 * @returns {string} Prettified JSON string.
 */
export function buildManifestContent(props = {}) {
    const manifest = {
        name:        props.name        ?? 'Untitled Widget',
        author:      props.author      ?? '',
        version:     props.version     ?? '1.0.0',
        description: props.description ?? '',
        type:        props.type        ?? 'app',
        permissions: props.permissions ?? [],
        env:         props.env         ?? '',
        icon:        props.icon        ?? '',
        dimensions: {
            defaultW: props.defaultW ?? 400,
            defaultH: props.defaultH ?? 300,
            minW:     props.minW     ?? 200,
            minH:     props.minH     ?? 160,
            maxW:     props.maxW     ?? 800,
            maxH:     props.maxH     ?? 600,
        },
    };
    return JSON.stringify(manifest, null, 2);
}
