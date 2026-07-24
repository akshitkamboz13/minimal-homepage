// Native Gzip Compression
async function compressString(str) {
    const blob = new Blob([str], { type: 'application/json' });
    const compressionStream = new CompressionStream('gzip');
    const compressedStream = blob.stream().pipeThrough(compressionStream);
    const response = new Response(compressedStream);
    return await response.blob();
}

// Get custom widgets from localStorage
function getCustomWidgets() {
    try {
        return JSON.parse(localStorage.getItem('startpage_custom_widgets')) || [];
    } catch (e) {
        return [];
    }
}

// Save custom widgets to localStorage
function saveCustomWidgets(widgets) {
    localStorage.setItem('startpage_custom_widgets', JSON.stringify(widgets));
}

// Helper to escape HTML characters
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Forms
    const inputName = document.getElementById('widget-name');
    const inputAuthor = document.getElementById('widget-author');
    const inputVersion = document.getElementById('widget-version');
    const inputDesc = document.getElementById('widget-desc');
    const textareaEnv = document.getElementById('widget-env');
    const selectType = document.getElementById('widget-type');
    const textareaIcon = document.getElementById('widget-icon-svg');
    const dimensionsGroup = document.getElementById('dimensions-group');

    // DOM Elements - Dimensions
    const inputDefW = document.getElementById('widget-def-w');
    const inputDefH = document.getElementById('widget-def-h');
    const inputMinW = document.getElementById('widget-min-w');
    const inputMinH = document.getElementById('widget-min-h');
    const inputMaxW = document.getElementById('widget-max-w');
    const inputMaxH = document.getElementById('widget-max-h');

    // DOM Elements - Editors
    const htmlArea = document.querySelector('#editor-html textarea');
    const cssArea = document.querySelector('#editor-css textarea');
    const jsArea = document.querySelector('#editor-js textarea');
    const tabButtons = document.querySelectorAll('.editor-tab');
    const containers = document.querySelectorAll('.editor-container');

    // DOM Elements - Actions & Previews
    const previewIframe = document.getElementById('preview-iframe');
    const btnRefresh = document.getElementById('btn-refresh-preview');
    const btnSave = document.getElementById('btn-save-widget');
    const btnExport = document.getElementById('btn-export-pkg');
    const btnClose = document.getElementById('btn-close-studio');
    const alertEl = document.getElementById('studio-alert');

    // Edit State Variables
    let currentEditId = null;

    // Accent Color Resolver
    function resolveAccentColor() {
        try {
            const settings = JSON.parse(localStorage.getItem('startpage_settings')) || {};
            const preset = settings.accentColor || 'blue';
            let hex = '#3b82f6';
            if (preset === 'custom') {
                hex = settings.customAccentColor || '#3b82f6';
            } else {
                hex = {
                    blue: '#3b82f6',
                    purple: '#a855f7',
                    emerald: '#10b981',
                    amber: '#f59e0b',
                    rose: '#f43f5e'
                }[preset] || '#3b82f6';
            }
            document.body.style.setProperty('--accent-color', hex);
            return hex;
        } catch (e) {
            return '#3b82f6';
        }
    }

    // Theme & Accent Sync Initialization
    const initialTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', initialTheme);
    const previewThemeSelect = document.getElementById('preview-theme-select');
    if (previewThemeSelect) {
        previewThemeSelect.value = initialTheme;
    }
    updatePreviewBackground(initialTheme);
    const initialAccent = resolveAccentColor();

    // Sync theme and settings changes dynamically across tabs
    window.addEventListener('storage', (e) => {
        if (e.key === 'theme') {
            const nextTheme = e.newValue || 'dark';
            document.body.setAttribute('data-theme', nextTheme);
            if (previewThemeSelect) {
                previewThemeSelect.value = nextTheme;
            }
            if (previewIframe && previewIframe.contentWindow) {
                previewIframe.contentWindow.postMessage({
                    type: 'theme-changed',
                    theme: nextTheme,
                    accentColor: resolveAccentColor()
                }, '*');
            }
        } else if (e.key === 'startpage_settings') {
            const hex = resolveAccentColor();
            if (previewIframe && previewIframe.contentWindow) {
                previewIframe.contentWindow.postMessage({
                    type: 'theme-changed',
                    theme: previewThemeSelect ? previewThemeSelect.value : 'dark',
                    accentColor: hex
                }, '*');
            }
        }
    });

    // Check if we are in Edit Mode
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    if (editId) {
        const widgets = getCustomWidgets();
        const widget = widgets.find(w => w.id === editId);
        if (widget) {
            currentEditId = widget.id;
            document.title = `Edit Widget - ${widget.name}`;
            
            // Fill Form
            inputName.value = widget.name || '';
            inputAuthor.value = widget.author || '';
            inputVersion.value = widget.version || '1.0.0';
            inputDesc.value = widget.description || '';
            if (textareaEnv) textareaEnv.value = widget.env || '';
            selectType.value = widget.type || 'app';
            textareaIcon.value = widget.icon || '';
            
            // Dimensions
            inputDefW.value = widget.defaultW || 400;
            inputDefH.value = widget.defaultH || 300;
            inputMinW.value = widget.minW || 200;
            inputMinH.value = widget.minH || 160;
            inputMaxW.value = widget.maxW || 800;
            inputMaxH.value = widget.maxH || 600;

            // Fill Code Areas
            if (htmlArea) htmlArea.value = widget.html || '';
            if (cssArea) cssArea.value = widget.css || '';
            if (jsArea) jsArea.value = widget.js || '';
            
            toggleDimensionsVisibility(widget.type);
        }
    }

    // Toggle dimensions fields visibility based on Type selection
    function toggleDimensionsVisibility(type) {
        if (type === 'app' || type === 'widget') {
            dimensionsGroup.classList.add('active');
        } else {
            dimensionsGroup.classList.remove('active');
        }
    }

    selectType.addEventListener('change', (e) => {
        toggleDimensionsVisibility(e.target.value);
    });

    // Editor Tab switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(t => t.classList.remove('active'));
            containers.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const target = btn.dataset.editor;
            document.getElementById(`editor-${target}`).classList.add('active');
        });
    });

    // Compile and run the preview code inside the sandboxed iframe
    function runPreview() {
        if (!previewIframe) return;

        const html = htmlArea ? htmlArea.value : '';
        const css = cssArea ? cssArea.value : '';
        const js = jsArea ? jsArea.value : '';
        const envVal = textareaEnv ? textareaEnv.value : '';

        // Parse environment variables
        const envObj = {};
        envVal.split('\n').forEach(line => {
            const idx = line.indexOf('=');
            if (idx !== -1) {
                const k = line.substring(0, idx).trim();
                const v = line.substring(idx + 1).trim();
                if (k) envObj[k] = v;
            }
        });

        const themeSelect = document.getElementById('preview-theme-select');
        const activeTheme = themeSelect ? themeSelect.value : 'dark';
        updatePreviewBackground(activeTheme);

        const sendData = () => {
            previewIframe.contentWindow.postMessage({
                type: 'init',
                html: html,
                css: css,
                js: js,
                env: envObj,
                theme: activeTheme,
                accentColor: resolveAccentColor()
            }, '*');
        };

        // Reload iframe source and postMessage on loaded event
        previewIframe.onload = sendData;
        previewIframe.src = 'sandbox.html';
    }

    // Dynamic preview background toggle based on active theme choice
    function updatePreviewBackground(theme) {
        const frameWrapper = document.querySelector('.preview-frame-wrapper');
        const previewBody = document.querySelector('.preview-body');
        if (frameWrapper) {
            if (theme === 'light') {
                frameWrapper.classList.add('theme-light');
                frameWrapper.classList.remove('theme-dark');
            } else {
                frameWrapper.classList.add('theme-dark');
                frameWrapper.classList.remove('theme-light');
            }
        }
        if (previewBody) {
            if (theme === 'light') {
                previewBody.classList.add('theme-light');
                previewBody.classList.remove('theme-dark');
            } else {
                previewBody.classList.add('theme-dark');
                previewBody.classList.remove('theme-light');
            }
        }
    }

    // Listeners for previews
    if (btnRefresh) btnRefresh.addEventListener('click', runPreview);
    
    const themeSelect = document.getElementById('preview-theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            const theme = e.target.value;
            updatePreviewBackground(theme);
            if (previewIframe && previewIframe.contentWindow) {
                previewIframe.contentWindow.postMessage({
                    type: 'theme-changed',
                    theme: theme
                }, '*');
            }
        });
    }
    
    runPreview(); // Initial preview rendering on load

    // Listen for custom widget resize requests from preview sandbox
    window.addEventListener('message', (e) => {
        const data = e.data;
        if (data && data.type === 'resize-widget') {
            if (previewIframe && previewIframe.contentWindow === e.source) {
                const previewContainer = previewIframe.parentElement;
                if (previewContainer) {
                    const maxW = window.innerWidth - 40;
                    const maxH = window.innerHeight - 40;
                    const targetW = Math.min(Math.max(data.width, 100), maxW);
                    const targetH = Math.min(Math.max(data.height, 100), maxH);
                    previewContainer.style.width = `${targetW}px`;
                    previewContainer.style.height = `${targetH}px`;
                }
            }
        }
    });

    // Form builder packages serialization
    function buildWidgetObject() {
        const type = selectType.value;
        return {
            id: currentEditId || `widget_${Date.now()}`,
            name: inputName.value.trim() || 'Untitled Widget',
            author: inputAuthor.value.trim(),
            version: inputVersion.value.trim() || '1.0.0',
            description: inputDesc.value.trim(),
            env: textareaEnv ? textareaEnv.value.trim() : '',
            type: type,
            icon: textareaIcon.value.trim(),
            defaultW: (type === 'app' || type === 'widget') ? parseInt(inputDefW.value) || 400 : null,
            defaultH: (type === 'app' || type === 'widget') ? parseInt(inputDefH.value) || 300 : null,
            minW: (type === 'app' || type === 'widget') ? parseInt(inputMinW.value) || 200 : null,
            minH: (type === 'app' || type === 'widget') ? parseInt(inputMinH.value) || 160 : null,
            maxW: (type === 'app' || type === 'widget') ? parseInt(inputMaxW.value) || 800 : null,
            maxH: (type === 'app' || type === 'widget') ? parseInt(inputMaxH.value) || 600 : null,
            html: htmlArea ? htmlArea.value : '',
            css: cssArea ? cssArea.value : '',
            js: jsArea ? jsArea.value : '',
            enabled: true
        };
    }

    // Save widget logic
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            if (!inputName.value.trim()) {
                showAlert('Error: Widget name is required.', 'error');
                inputName.focus();
                return;
            }

            const newWidget = buildWidgetObject();
            const widgets = getCustomWidgets();

            if (currentEditId) {
                const idx = widgets.findIndex(w => w.id === currentEditId);
                if (idx !== -1) {
                    widgets[idx] = newWidget;
                    showAlert(`Widget "${newWidget.name}" updated successfully!`, 'success');
                }
            } else {
                widgets.push(newWidget);
                currentEditId = newWidget.id;
                showAlert(`Widget "${newWidget.name}" saved successfully!`, 'success');
            }

            saveCustomWidgets(widgets);
        });
    }

    // Export .homewidget compressed binary archive logic
    if (btnExport) {
        btnExport.addEventListener('click', async () => {
            if (!inputName.value.trim()) {
                showAlert('Error: Widget name is required to pack.', 'error');
                inputName.focus();
                return;
            }

            const widget = buildWidgetObject();
            btnExport.textContent = 'Compressing...';
            btnExport.disabled = true;

            try {
                const serialized = JSON.stringify(widget);
                const compressedBlob = await compressString(serialized);
                
                const url = URL.createObjectURL(compressedBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${widget.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.homewidget`;
                document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                
                showAlert('Widget package exported successfully!', 'success');
            } catch (err) {
                console.error(err);
                showAlert('Failed to export compressed package.', 'error');
            } finally {
                btnExport.textContent = 'Export .homewidget';
                btnExport.disabled = false;
            }
        });
    }

    // Close Builder
    if (btnClose) {
        btnClose.addEventListener('click', () => {
            if (confirm('Are you sure you want to close Widget Studio? Unsaved code changes will be lost.')) {
                window.close();
            }
        });
    }

    // Show dynamic alert notification
    function showAlert(text, type) {
        if (!alertEl) return;
        alertEl.textContent = text;
        alertEl.className = `studio-alert ${type} show`;
        setTimeout(() => {
            alertEl.classList.remove('show');
        }, 3000);
    }
});
