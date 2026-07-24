import { appRegistry } from '../ui/app-registry.js';
import { createGlassWindow } from '../ui/window-generator.js';
import { onSettingsChanged } from '../settings/index.js';

// Map to hold open custom app instances
const openAppInstances = new Map();

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

// Helper to load sandboxed iframe using sandbox.html and postMessage
function setupSandboxIframe(iframe, widget) {
    const envObj = {};
    if (widget.env) {
        widget.env.split('\n').forEach(line => {
            const index = line.indexOf('=');
            if (index !== -1) {
                const k = line.substring(0, index).trim();
                const v = line.substring(index + 1).trim();
                if (k) envObj[k] = v;
            }
        });
    }

    iframe.onload = () => {
        const accent = getComputedStyle(document.body).getPropertyValue('--accent-color').trim() || '#3b82f6';
        iframe.contentWindow.postMessage({
            type: 'init',
            html: widget.html || '',
            css: widget.css || '',
            js: widget.js || '',
            env: envObj,
            theme: document.body.getAttribute('data-theme') || 'dark',
            accentColor: accent
        }, '*');
    };
    iframe.src = 'sandbox.html';
}

// Launch a custom app widget inside a glass window wrapper
export function launchCustomApp(widget) {
    if (!widget) return;

    // If already open, bring to front
    if (openAppInstances.has(widget.id)) {
        const instance = openAppInstances.get(widget.id);
        instance.bringToFront();
        instance.windowEl.classList.remove('is-minimized');
        appRegistry.updateAppState(widget.id, { isMinimized: false });
        return;
    }

    // Determine dimensions
    const width = widget.defaultW || 400;
    const height = widget.defaultH || 300;
    const minW = widget.minW || 200;
    const minH = widget.minH || 160;

    // Create glass window wrapper
    const instance = createGlassWindow({
        id: `win_${widget.id}`,
        title: widget.name,
        width: width,
        height: height,
        minWidth: minW,
        minHeight: minH,
        colorClass: 'color-transparent',
        onClose: () => {
            instance.destroy();
            appRegistry.unregisterApp(widget.id);
            openAppInstances.delete(widget.id);
        },
        onMinimize: (isMin) => {
            appRegistry.updateAppState(widget.id, { isMinimized: isMin });
        }
    });

    // Create Iframe Sandbox inside the window body
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.background = 'transparent';
    setupSandboxIframe(iframe, widget);

    instance.bodyEl.innerHTML = '';
    instance.bodyEl.appendChild(iframe);
    instance.bodyEl.style.overflow = 'hidden';
    instance.bodyEl.style.padding = '0';

    openAppInstances.set(widget.id, instance);

    // Register inside the app registry for dock layout integrations
    appRegistry.registerApp(widget.id, {
        title: widget.name,
        icon: widget.icon,
        isMinimized: false,
        isHidden: false,
        focus: () => {
            instance.bringToFront();
            instance.windowEl.classList.remove('is-minimized');
            appRegistry.updateAppState(widget.id, { isMinimized: false });
        },
        toggleMinimize: () => {
            const isMin = instance.windowEl.classList.toggle('is-minimized');
            appRegistry.updateAppState(widget.id, { isMinimized: isMin });
        },
        close: () => {
            instance.destroy();
            appRegistry.unregisterApp(widget.id);
            openAppInstances.delete(widget.id);
        }
    });
}

// Main loader function
export function loadActiveWidgets() {
    // 1. Cleanup previously active custom widgets
    const oldWidgets = document.querySelectorAll('.custom-dashboard-widget');
    oldWidgets.forEach(el => el.remove());

    const oldPanelBtns = document.querySelectorAll('.custom-panel-btn');
    oldPanelBtns.forEach(el => el.remove());

    // Close any open custom app windows
    openAppInstances.forEach(instance => instance.destroy());
    openAppInstances.clear();

    // 2. Fetch custom widgets list
    let list = [];
    try {
        list = JSON.parse(localStorage.getItem('startpage_custom_widgets')) || [];
    } catch (e) {
        return;
    }

    const activeWidgets = list.filter(w => w.enabled !== false);
    const mainEl = document.querySelector('main');
    const fabCustom = document.getElementById('fab-custom-items');
    const headerCustom = document.getElementById('header-custom-items');

    activeWidgets.forEach(widget => {
        if (widget.type === 'widget') {
            // Dashboard layout widget
            if (!mainEl) return;

            const container = document.createElement('div');
            container.className = 'custom-dashboard-widget glass-panel';
            container.id = `layout_widget_${widget.id}`;
            container.style.width = `${widget.defaultW || 400}px`;
            container.style.height = `${widget.defaultH || 300}px`;
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.overflow = 'hidden';
            container.style.borderRadius = '16px';
            container.style.border = '1px solid var(--glass-border)';
            container.style.background = 'var(--glass-bg)';
            container.style.backdropFilter = 'blur(12px)';

            // Optional Header for Dashboard Widget to drag
            const header = document.createElement('div');
            header.style.padding = '8px 12px';
            header.style.fontSize = '0.8rem';
            header.style.fontWeight = '600';
            header.style.opacity = '0.7';
            header.style.borderBottom = '1px solid var(--glass-border)';
            header.style.cursor = 'grab';
            header.textContent = widget.name;
            container.appendChild(header);

            const iframe = document.createElement('iframe');
            iframe.setAttribute('sandbox', 'allow-scripts');
            iframe.style.flex = '1';
            iframe.style.width = '100%';
            iframe.style.border = 'none';
            iframe.style.background = 'transparent';
            setupSandboxIframe(iframe, widget);

            container.appendChild(iframe);
            mainEl.appendChild(container);

        } else if (widget.type === 'vertical') {
            // Vertical Panel Shortcut
            if (!fabCustom) return;

            const btn = document.createElement('button');
            btn.className = 'floating-action-btn custom-panel-btn';
            btn.setAttribute('aria-label', widget.name);
            btn.setAttribute('title', widget.name);
            btn.style.cursor = 'pointer';

            btn.innerHTML = widget.icon && widget.icon.trim().startsWith('<svg') 
                ? widget.icon 
                : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;

            btn.addEventListener('click', () => {
                launchCustomApp(widget);
            });

            fabCustom.appendChild(btn);

        } else if (widget.type === 'horizontal') {
            // Horizontal Panel Shortcut
            if (!headerCustom) return;

            const btn = document.createElement('button');
            btn.className = 'glass-btn custom-panel-btn';
            btn.setAttribute('aria-label', widget.name);
            btn.setAttribute('title', widget.name);
            btn.style.cursor = 'pointer';

            btn.innerHTML = widget.icon && widget.icon.trim().startsWith('<svg') 
                ? widget.icon 
                : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;

            btn.addEventListener('click', () => {
                launchCustomApp(widget);
            });

            headerCustom.appendChild(btn);
        }
    });

    // Notify layout-manager that dynamic widgets may have been added/removed
    window.dispatchEvent(new CustomEvent('layout-targets-changed'));
}

export function initWidgetRuntime() {
    // 1. Setup event listener for custom app launches
    window.addEventListener('launch-custom-widget', (e) => {
        const widgetId = e.detail.id;
        try {
            const list = JSON.parse(localStorage.getItem('startpage_custom_widgets')) || [];
            const widget = list.find(w => w.id === widgetId);
            if (widget) {
                launchCustomApp(widget);
            }
        } catch (err) {}
    });

    // 2. Setup reload listeners
    window.addEventListener('widgets-reloaded', loadActiveWidgets);
    window.addEventListener('storage', (e) => {
        if (e.key === 'startpage_custom_widgets') {
            loadActiveWidgets();
        }
    });

    // 3. Initial load of widgets
    loadActiveWidgets();
}

// Register theme change listener to update active widgets inside iframe sandboxes dynamically
onSettingsChanged((settings) => {
    let resolvedTheme = settings.theme;
    if (resolvedTheme === 'system') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    const accent = getComputedStyle(document.body).getPropertyValue('--accent-color').trim() || '#3b82f6';
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        try {
            iframe.contentWindow.postMessage({ 
                type: 'theme-changed', 
                theme: resolvedTheme,
                accentColor: accent
            }, '*');
        } catch(e) {}
    });
});

// Listen for custom widget requests from the sandbox (resize, close, minimize)
window.addEventListener('message', (e) => {
    const data = e.data;
    if (data) {
        if (data.type === 'resize-widget' || data.type === 'close-widget' || data.type === 'minimize-widget') {
            const iframes = document.querySelectorAll('iframe');
            let targetIframe = null;
            for (const iframe of iframes) {
                if (iframe.contentWindow === e.source) {
                    targetIframe = iframe;
                    break;
                }
            }
            if (targetIframe) {
                for (const [widgetId, instance] of openAppInstances.entries()) {
                    if (instance.bodyEl.contains(targetIframe)) {
                        if (data.type === 'resize-widget') {
                            // Cap dimensions to browser window size minus a safe padding offset
                            const maxW = window.innerWidth - 40;
                            const maxH = window.innerHeight - 40;
                            const targetW = Math.min(Math.max(data.width, 100), maxW);
                            const targetH = Math.min(Math.max(data.height, 100), maxH);

                            instance.windowEl.style.width = `${targetW}px`;
                            instance.windowEl.style.height = `${targetH}px`;
                        } else if (data.type === 'close-widget') {
                            instance.destroy();
                            appRegistry.unregisterApp(widgetId);
                            openAppInstances.delete(widgetId);
                        } else if (data.type === 'minimize-widget') {
                            instance.windowEl.classList.add('is-minimized');
                            appRegistry.updateAppState(widgetId, { isMinimized: true });
                        }
                        break;
                    }
                }
            }
        }
    }
});
