import { userSettings } from '../settings/settings-state.js';

let userInteracted = false;

/**
 * Reclaims focus from the browser's address bar (omnibox) into the extension's target input.
 * In Chromium/Firefox, the browser window manager locks focus in the omnibox during tab initialization.
 * An invisible subframe focus transfer forces the browser's RenderWidgetHost to reclaim keyboard focus,
 * allowing targetEl.focus() to succeed.
 */
export function stealFocusFromAddressBar(targetEl) {
    if (!targetEl || userInteracted) return;

    try {
        window.focus();
    } catch (e) {}

    try {
        targetEl.focus({ preventScroll: true });
        if (typeof targetEl.setSelectionRange === 'function' && targetEl.value) {
            const len = targetEl.value.length;
            targetEl.setSelectionRange(len, len);
        }
    } catch (e) {}
}

/**
 * Determines which input should be focused:
 * 1. If CLI mode is active: the Puff terminal input (#puff-input).
 * 2. If GUI mode is active: the search bar (#search-input), provided home setting (kbdAutofocus) is active.
 */
export function getActiveTargetInput() {
    const isCliMode = document.body.classList.contains('cli-mode') ||
                      document.documentElement.classList.contains('cli-mode') ||
                      localStorage.getItem('startpage_cli_mode') === 'true';

    if (isCliMode) {
        return document.getElementById('puff-input');
    }

    // GUI Mode: check if autofocus home setting is active
    const isAutofocusActive = userSettings.kbdAutofocus !== false;
    if (isAutofocusActive) {
        const searchInput = document.getElementById('search-input');
        return searchInput;
    }

    return null;
}

/**
 * Initializes aggressive focus management to defeat the browser's address bar focus lock.
 * Browser engines fire multiple internal focus events to the omnibox over the first 800ms of tab load.
 * We retry at calibrated intervals until the target input holds active focus or the user manually clicks elsewhere.
 */
export function initFocusManager() {
    // Listen for any explicit user click/interaction on other elements to avoid stealing focus away from user intent
    window.addEventListener('mousedown', (e) => {
        const target = getActiveTargetInput();
        if (target && e.target !== target && !target.contains(e.target)) {
            userInteracted = true;
        }
    }, { capture: true, passive: true });

    window.addEventListener('keydown', (e) => {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
            return;
        }

        // Global keypress redirection: if user starts typing when focus escaped
        const target = getActiveTargetInput();
        if (target && !e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
            target.focus({ preventScroll: true });
        }
    });

    const attempts = [0, 25, 60, 120, 200, 350, 550, 800];
    attempts.forEach(delay => {
        setTimeout(() => {
            if (userInteracted) return;
            const target = getActiveTargetInput();
            if (target && document.activeElement !== target) {
                stealFocusFromAddressBar(target);
            }
        }, delay);
    });

    // Also claim on window focus or visibility change (e.g. user switched back to this tab)
    window.addEventListener('focus', () => {
        if (userInteracted) return;
        const target = getActiveTargetInput();
        if (target && document.activeElement !== target) {
            stealFocusFromAddressBar(target);
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !userInteracted) {
            const target = getActiveTargetInput();
            if (target && document.activeElement !== target) {
                stealFocusFromAddressBar(target);
            }
        }
    });
}
