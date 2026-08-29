// Centralized Active Applications Registry for Dock, Taskbars, and Launchers
class ActiveAppRegistry {
    constructor() {
        this.apps = new Map();
        this.listeners = new Set();
    }

    registerApp(appId, appConfig) {
        this.apps.set(appId, {
            id: appId,
            title: appConfig.title || appId,
            icon: appConfig.icon || '',
            isMinimized: !!appConfig.isMinimized,
            isHidden: !!appConfig.isHidden,
            action: appConfig.action || null,
            focus: appConfig.focus || (() => {}),
            toggleMinimize: appConfig.toggleMinimize || (() => {}),
            close: appConfig.close || (() => {})
        });
        this.notifyListeners();
    }

    updateAppState(appId, updates) {
        if (!this.apps.has(appId)) return;
        const app = this.apps.get(appId);
        Object.assign(app, updates);
        this.notifyListeners();
    }

    unregisterApp(appId) {
        if (this.apps.has(appId)) {
            this.apps.delete(appId);
            this.notifyListeners();
        }
    }

    getActiveApps() {
        return Array.from(this.apps.values()).filter(app => !app.isHidden);
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners() {
        const activeList = this.getActiveApps();
        this.listeners.forEach(cb => {
            try { cb(activeList); } catch(e) {}
        });
        window.dispatchEvent(new CustomEvent('active-apps-changed', { detail: activeList }));
    }
}

export const appRegistry = new ActiveAppRegistry();
