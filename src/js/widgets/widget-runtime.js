import { appRegistry } from '../ui/app-registry.js';
import { createGlassWindow } from '../ui/window-generator.js';
import { createGlassCard } from '../ui/card-generator.js';
import { applyDashboardOrder } from '../settings/panels/dashboard-layout.js';
import { userSettings, onSettingsChanged } from '../settings/index.js';

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

    if (userSettings.showDashboardWidgets === false) {
        return;
    }

    // 2. Fetch custom widgets list
    let list = [];
    try {
        list = JSON.parse(localStorage.getItem('startpage_custom_widgets')) || [];
    } catch (e) {
        return;
    }

    const activeWidgets = list.filter(w => w.enabled !== false);
    const mainEl = document.querySelector('main');
    const widgetsContainer = document.getElementById('dashboard-widgets-container') || mainEl;
    const fabCustom = document.getElementById('fab-custom-items');
    const headerCustom = document.getElementById('header-custom-items');

    activeWidgets.forEach(widget => {
        if (widget.type === 'widget') {
            // Dashboard layout widget
            if (!widgetsContainer) return;

            const { cardEl, bodyEl } = createGlassCard({
                id: `layout_widget_${widget.id}`,
                title: widget.name,
                width: widget.defaultW || 400,
                height: 244,
                className: 'custom-dashboard-widget'
            });

            const iframe = document.createElement('iframe');
            iframe.setAttribute('sandbox', 'allow-scripts');
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.style.background = 'transparent';
            setupSandboxIframe(iframe, widget);

            bodyEl.appendChild(iframe);
            widgetsContainer.appendChild(cardEl);

        } else if (widget.type === 'vertical') {
            // Vertical Panel Shortcut
            if (!fabCustom) return;

            const btn = document.createElement('button');
            btn.className = 'floating-action-btn custom-panel-btn';
            btn.setAttribute('aria-label', widget.name);
            btn.setAttribute('title', widget.name);
            btn.style.cursor = 'pointer';

            let iconMarkup = '';
            if (widget.icon && widget.icon.trim().startsWith('<')) {
                iconMarkup = widget.icon;
            } else if (widget.icon && widget.icon.trim()) {
                iconMarkup = `<img src="${widget.icon.trim()}" alt="${widget.name}" style="width: 24px; height: 24px; object-fit: contain; border-radius: 4px;" onerror="this.onerror=null; this.parentNode.innerHTML='<span style=\\'font-size: 20px;\\'>${widget.icon.trim().substring(0,2)}</span>';" />`;
            } else {
                iconMarkup = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
            }
            btn.innerHTML = iconMarkup;

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleCustomPopupPanel(widget, btn);
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

            let iconMarkup = '';
            if (widget.icon && widget.icon.trim().startsWith('<')) {
                iconMarkup = widget.icon;
            } else if (widget.icon && widget.icon.trim()) {
                iconMarkup = `<img src="${widget.icon.trim()}" alt="${widget.name}" style="width: 18px; height: 18px; object-fit: contain; border-radius: 4px;" onerror="this.onerror=null; this.parentNode.innerHTML='<span style=\\'font-size: 16px;\\'>${widget.icon.trim().substring(0,2)}</span>';" />`;
            } else {
                iconMarkup = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
            }
            btn.innerHTML = iconMarkup;

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleCustomPopupPanel(widget, btn);
            });

            headerCustom.appendChild(btn);
        }
    });

    // Apply saved dashboard layout flow sort order
    applyDashboardOrder();

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
    loadActiveWidgets();

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
                let matched = false;
                for (const [widgetId, instance] of openAppInstances.entries()) {
                    if (instance.bodyEl.contains(targetIframe)) {
                        matched = true;
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

                // If not matched in open window instances, check if it is a popup card panel
                if (!matched) {
                    const popupPanel = targetIframe.closest('.custom-popup-panel');
                    if (popupPanel) {
                        if (data.type === 'close-widget' || data.type === 'minimize-widget') {
                            popupPanel.classList.remove('active');
                            document.querySelectorAll('.custom-panel-btn').forEach(btn => {
                                btn.classList.remove('active');
                            });
                        }
                    }
                }
            }
        }
    }
});

function toggleCustomPopupPanel(widget, triggerBtn) {
    const panelId = `custom-popup-panel-${widget.id}`;
    let panel = document.getElementById(panelId);
    
    if (panel) {
        const wasActive = panel.classList.contains('active');
        closeAllCustomPopupPanels();
        
        if (!wasActive) {
            positionCustomPanel(panel, triggerBtn, widget);
            panel.classList.add('active');
            triggerBtn.classList.add('active');
        }
        return;
    }
    
    closeAllCustomPopupPanels();
    
    panel = document.createElement('div');
    panel.id = panelId;
    panel.className = 'custom-popup-panel glass-panel';
    panel.style.width = `${widget.defaultW || 340}px`;
    panel.style.height = `${widget.defaultH || 380}px`;
    
    const header = document.createElement('div');
    header.className = 'custom-popup-header';
    
    const title = document.createElement('h3');
    title.textContent = widget.name;
    header.appendChild(title);
    
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'custom-popup-close-btn';
    closeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    `;
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.remove('active');
        triggerBtn.classList.remove('active');
    });
    header.appendChild(closeBtn);
    panel.appendChild(header);
    
    const body = document.createElement('div');
    body.className = 'custom-popup-body';
    
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.background = 'transparent';
    setupSandboxIframe(iframe, widget);
    
    body.appendChild(iframe);
    panel.appendChild(body);
    
    document.body.appendChild(panel);
    
    setTimeout(() => {
        positionCustomPanel(panel, triggerBtn, widget);
        panel.classList.add('active');
        triggerBtn.classList.add('active');
    }, 0);
    
    const outsideClickListener = (e) => {
        if (!panel.contains(e.target) && !triggerBtn.contains(e.target)) {
            panel.classList.remove('active');
            triggerBtn.classList.remove('active');
            document.removeEventListener('click', outsideClickListener);
        }
    };
    setTimeout(() => {
        document.addEventListener('click', outsideClickListener);
    }, 50);
}

function closeAllCustomPopupPanels() {
    document.querySelectorAll('.custom-popup-panel').forEach(p => {
        p.classList.remove('active');
    });
    document.querySelectorAll('.custom-panel-btn').forEach(b => {
        b.classList.remove('active');
    });
}

function positionCustomPanel(panel, trigger, widget) {
    if (!panel || !trigger) return;
    
    const tRect = trigger.getBoundingClientRect();
    const pWidth = parseInt(panel.style.width) || 340;
    const pHeight = parseInt(panel.style.height) || 380;
    const padding = 12;
    
    let top;
    if (tRect.bottom + pHeight + padding <= window.innerHeight) {
        top = tRect.bottom + padding;
    } else if (tRect.top - pHeight - padding >= 0) {
        top = tRect.top - pHeight - padding;
    } else {
        top = Math.max(padding, window.innerHeight - pHeight - padding);
    }
    
    let left;
    if (tRect.left < window.innerWidth / 2) {
        left = tRect.left;
    } else {
        left = tRect.right - pWidth;
    }
    
    if (left < padding) left = padding;
    if (left + pWidth > window.innerWidth - padding) {
        left = window.innerWidth - pWidth - padding;
    }
    
    panel.style.position = 'fixed';
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    panel.style.zIndex = '12000';
}
