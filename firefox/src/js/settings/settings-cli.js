import { userSettings, saveSettings } from './settings-state.js';

export function handleSettingsCLI(rawTokens = []) {
    if (!rawTokens || rawTokens.length === 0) {
        return openSettingsVisualCLI();
    }

    const sub = rawTokens[0].toLowerCase();

    if (sub === '-h' || sub === '--help' || sub === 'help') {
        return showSettingsHelp();
    }

    if (sub === 'open' || sub === 'gui') {
        return openSettingsVisualCLI();
    }

    if (sub === 'list' || sub === 'all' || sub === 'ls') {
        return listSettingsCLI(rawTokens[1]);
    }

    if (sub === 'get') {
        const key = rawTokens[1];
        if (!key) {
            return { output: 'Error: Please specify setting key. Usage: settings get <key>', isError: true };
        }
        if (!(key in userSettings)) {
            return { output: `Error: Setting key '${key}' does not exist. Type 'settings list' to view keys.`, isError: true };
        }
        const val = userSettings[key];
        const formatted = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
        return { output: `${key} = ${formatted}` };
    }

    if (sub === 'set') {
        const key = rawTokens[1];
        const rawVal = rawTokens.slice(2).join(' ');

        if (!key || rawVal === undefined || rawVal === '') {
            return { output: 'Error: Usage: settings set <key> <value>', isError: true };
        }

        if (!(key in userSettings)) {
            return { output: `Error: Setting key '${key}' is not recognized. Type 'settings list' to see available keys.`, isError: true };
        }

        let parsedVal = rawVal;
        if (rawVal.toLowerCase() === 'true') parsedVal = true;
        else if (rawVal.toLowerCase() === 'false') parsedVal = false;
        else if (!isNaN(Number(rawVal)) && rawVal.trim() !== '') parsedVal = Number(rawVal);
        else {
            try {
                if ((rawVal.startsWith('{') && rawVal.endsWith('}')) || (rawVal.startsWith('[') && rawVal.endsWith(']'))) {
                    parsedVal = JSON.parse(rawVal);
                }
            } catch (e) {}
        }

        userSettings[key] = parsedVal;
        saveSettings();
        return { output: `Updated '${key}' = ${JSON.stringify(parsedVal)}` };
    }

    if (sub === 'reset') {
        const key = rawTokens[1];
        if (key && key in userSettings) {
            delete userSettings[key];
            saveSettings();
            return { output: `Reset '${key}' to default.` };
        }
        return { output: 'Usage: settings reset <key>' };
    }

    return {
        output: `Unknown settings command: '${sub}'. Type 'settings help' for usage.`,
        isError: true
    };
}

function openSettingsVisualCLI() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('hidden', 'is-minimized');
        if (document.body.classList.contains('cli-mode')) {
            modal.classList.add('cli-top-window');
            modal.style.zIndex = '1000010';
        }
    }
    return { output: 'Opened System Settings modal.' };
}

function showSettingsHelp() {
    return {
        output: `System Settings CLI:
  settings open                 Open System Settings visual modal
  settings list [filter]        List current settings and values
  settings get <key>            Get value of a setting key
  settings set <key> <val>      Update setting value
  settings reset <key>          Reset a specific setting
  settings help                 Show this help guide

Examples:
  settings open
  settings set theme dark
  settings set accentColor emerald
  settings set clockFormat 24
  settings set dockPosition top
  settings set showBookmarks true`
    };
}

function listSettingsCLI(filter = '') {
    const filterLower = filter ? filter.toLowerCase() : '';
    const keys = Object.keys(userSettings).sort();
    const lines = ['Current System Settings:\n'];

    keys.forEach(k => {
        if (filterLower && !k.toLowerCase().includes(filterLower)) return;
        const val = userSettings[k];
        let valStr = '';
        if (typeof val === 'object' && val !== null) {
            valStr = Array.isArray(val) ? `[Array of ${val.length} items]` : '{Object}';
        } else {
            valStr = String(val);
        }
        lines.push(`  ${k.padEnd(26)} : ${valStr}`);
    });

    if (lines.length === 1) {
        return { output: `No settings matching '${filter}'.` };
    }

    lines.push('\nUse "settings set <key> <value>" to modify any setting.');
    return { output: lines.join('\n') };
}
