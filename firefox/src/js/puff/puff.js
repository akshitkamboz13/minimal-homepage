import { userSettings, saveSettings } from '../settings/index.js';
import { appRegistry } from '../ui/app-registry.js';
import { createGlassWindow } from '../ui/window-generator.js';
import { handleNotesCLI } from '../notes/note-cli.js';
import { handleSearchCLI } from '../search/search-cli.js';
import { handleTodoCLI } from '../todo/todo-cli.js';
import { handleMediaCLI } from '../media/media-cli.js';
import { handleSettingsCLI } from '../settings/settings-cli.js';
import { handleTrackerCLI } from '../tracker/tracker-cli.js';
import { handleBookmarksCLI } from '../bookmarks/bookmarks-cli.js';
import {
    registerCommand,
    unregisterCommand,
    unregisterWidgetCommands,
    getRegisteredCommands,
    getCommandHandler,
    isCommandReserved,
    RESERVED_PUFF_COMMANDS
} from './puff-registry.js';

export {
    registerCommand,
    unregisterCommand,
    unregisterWidgetCommands,
    getRegisteredCommands,
    isCommandReserved,
    RESERVED_PUFF_COMMANDS
};

let puffInstance = null;
let puffWindow = null;
let puffInput = null;
let puffOutputHistory = null;
let commandHistory = [];
let historyIndex = -1;
let isPuffInitialized = false;

const HISTORY_STORAGE_KEY = 'startpage_cli_history';

function loadCommandHistory() {
    try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                commandHistory = parsed;
            }
        }
    } catch (e) {
        commandHistory = [];
    }
    historyIndex = commandHistory.length;
}

function saveCommandHistory() {
    try {
        const slice = commandHistory.slice(-200);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(slice));
    } catch (e) {}
}

export function initPuff() {
    if (typeof window !== 'undefined') {
        window.puff = {
            registerCommand,
            unregisterCommand,
            unregisterWidgetCommands,
            getRegisteredCommands,
            isCommandReserved,
            executeCommand: (cmd) => executePuffCommand(cmd),
            enterCliMode,
            exitCliMode,
            open: openPuffShell,
            close: closePuffShell,
            toggle: togglePuffShell
        };
    }

    if (isPuffInitialized) return;
    isPuffInitialized = true;

    loadCommandHistory();

    puffWindow = document.getElementById('puff-window');
    if (!puffWindow) {
        createPuffDOM();
    }

    restorePuffState();
    setupPuffInputListeners();
}

function createPuffDOM() {
    let savedState = {};
    try {
        savedState = JSON.parse(localStorage.getItem('startpage_puff_state')) || {};
    } catch(e) {}

    puffInstance = createGlassWindow({
        id: 'puff-window',
        title: 'Puff Terminal Shell',
        editableTitle: false,
        resizable: true,
        x: savedState.x !== undefined ? savedState.x : 140,
        y: savedState.y !== undefined ? savedState.y : 140,
        width: savedState.w || userSettings.defaultPuffWidth || 580,
        height: savedState.h || userSettings.defaultPuffHeight || 380,
        minWidth: 320,
        minHeight: 220,
        colorClass: 'color-transparent',
        className: 'puff-window hidden',
        onMinimize: (isMin) => {
            savePuffState();
            appRegistry.updateAppState('puff_shell', { isMinimized: isMin, isHidden: false });
        },
        onClose: () => {
            if (document.body.classList.contains('cli-mode')) {
                exitCliMode();
            }
            closePuffShell();
        },
        onResize: () => {
            savePuffState();
        },
        onDragEnd: () => {
            savePuffState();
        }
    });

    puffWindow = puffInstance.windowEl;

    puffInstance.bodyEl.innerHTML = `
        <div class="puff-body" id="puff-body" style="height: 100%; display: flex; flex-direction: column;">
            <div class="puff-banner">
                <div class="puff-banner-title">Puff Terminal</div>
                <div class="puff-banner-sub">Type 'help' to see available commands or 'gui' to return to graphical interface.</div>
            </div>
            <div class="puff-output-history" id="puff-output-history"></div>
            <div class="puff-prompt-line">
                <span class="puff-cmd-prompt">&gt;</span>
                <input type="text" id="puff-input" class="puff-input" spellcheck="false" autocomplete="off" placeholder="${userSettings.puffPlaceholder || ''}" />
            </div>
        </div>
    `;

    puffInput = puffInstance.bodyEl.querySelector('#puff-input');
    puffOutputHistory = puffInstance.bodyEl.querySelector('#puff-output-history');
}

function restorePuffState() {
    if (!puffWindow) return;
    try {
        const saved = JSON.parse(localStorage.getItem('startpage_puff_state'));
        if (saved) {
            if (saved.isMinimized) {
                puffWindow.classList.remove('hidden');
                puffWindow.classList.add('is-minimized');
            } else if (!saved.isHidden) {
                puffWindow.classList.remove('hidden', 'is-minimized');
            }

            if (!saved.isHidden) {
                appRegistry.registerApp('puff_shell', {
                    title: 'Puff Terminal',
                    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#22c55e" stroke-width="2.2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
                    isMinimized: !!saved.isMinimized,
                    isHidden: false,
                    focus: openPuffShell,
                    toggleMinimize: togglePuffMinimize,
                    close: closePuffShell
                });
            }
        }
    } catch (e) {}

    try {
        if (localStorage.getItem('startpage_cli_mode') === 'true') {
            enterCliMode();
        }
    } catch (e) {}
}

function savePuffState() {
    if (!puffWindow || document.body.classList.contains('cli-mode')) return;
    try {
        const state = {
            x: parseInt(puffWindow.style.left, 10) || 140,
            y: parseInt(puffWindow.style.top, 10) || 140,
            w: puffWindow.offsetWidth,
            h: puffWindow.offsetHeight,
            isMinimized: puffWindow.classList.contains('is-minimized'),
            isHidden: puffWindow.classList.contains('hidden')
        };
        localStorage.setItem('startpage_puff_state', JSON.stringify(state));
    } catch (e) {}
}

function setupPuffInputListeners() {
    if (!puffInput) return;

    puffWindow.addEventListener('mousedown', () => {
        if (puffInstance) puffInstance.bringToFront();
        if (puffInput && !puffWindow.classList.contains('is-minimized')) {
            puffInput.focus();
        }
    });

    document.addEventListener('click', () => {
        if (document.body.classList.contains('cli-mode')) {
            if (puffInput && document.activeElement !== puffInput) {
                puffInput.focus();
            }
        }
    });

    puffInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const cmd = puffInput.value.trim();
            if (cmd.length > 0) {
                if (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== cmd) {
                    commandHistory.push(cmd);
                    saveCommandHistory();
                }
                historyIndex = commandHistory.length;
                executePuffCommand(cmd);
            }
            puffInput.value = '';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length > 0 && historyIndex > 0) {
                historyIndex--;
                puffInput.value = commandHistory[historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                puffInput.value = commandHistory[historyIndex];
            } else {
                historyIndex = commandHistory.length;
                puffInput.value = '';
            }
        }
    });
}

export function openPuffShell() {
    if (!puffWindow) initPuff();

    puffWindow.classList.remove('hidden', 'is-minimized');
    if (puffInstance) puffInstance.bringToFront();
    if (puffInput) {
        setTimeout(() => puffInput.focus(), 50);
    }
    savePuffState();
    
    appRegistry.registerApp('puff_shell', {
        title: 'Puff Terminal',
        icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#22c55e" stroke-width="2.2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
        isMinimized: false,
        isHidden: false,
        focus: openPuffShell,
        toggleMinimize: togglePuffMinimize,
        close: closePuffShell
    });
}

export function togglePuffShell() {
    if (!puffWindow) initPuff();

    if (puffWindow.classList.contains('is-minimized')) {
        openPuffShell();
    } else if (!puffWindow.classList.contains('hidden')) {
        togglePuffMinimize();
    } else {
        openPuffShell();
    }
}

export function togglePuffMinimize() {
    if (!puffWindow) return;
    const isMin = !puffWindow.classList.contains('is-minimized');
    if (isMin) {
        puffWindow.classList.add('is-minimized');
    } else {
        puffWindow.classList.remove('is-minimized', 'hidden');
        if (puffInstance) puffInstance.bringToFront();
        if (puffInput) setTimeout(() => puffInput.focus(), 50);
    }
    savePuffState();
    appRegistry.updateAppState('puff_shell', { isMinimized: isMin, isHidden: false });
}

export function closePuffShell() {
    if (!puffWindow) return;
    puffWindow.classList.add('hidden');
    puffWindow.classList.remove('is-minimized');
    savePuffState();
    appRegistry.unregisterApp('puff_shell');
}

export function enterCliMode() {
    document.body.classList.add('cli-mode');
    try {
        localStorage.setItem('startpage_cli_mode', 'true');
    } catch(e) {}

    if (!puffWindow) initPuff();
    if (puffWindow) {
        puffWindow.classList.remove('hidden', 'is-minimized');
    }
    if (puffInstance) puffInstance.bringToFront();
    if (puffInput) {
        setTimeout(() => puffInput.focus(), 50);
    }
}

export function exitCliMode() {
    document.body.classList.remove('cli-mode');
    try {
        localStorage.removeItem('startpage_cli_mode');
    } catch(e) {}

    if (puffWindow) {
        try {
            const savedState = JSON.parse(localStorage.getItem('startpage_puff_state')) || {};
            if (savedState.w) puffWindow.style.width = savedState.w + 'px';
            if (savedState.h) puffWindow.style.height = savedState.h + 'px';
            if (savedState.x !== undefined) puffWindow.style.left = savedState.x + 'px';
            if (savedState.y !== undefined) puffWindow.style.top = savedState.y + 'px';
        } catch(e) {}
    }
    if (puffInput) {
        setTimeout(() => puffInput.focus(), 50);
    }
}

function notifyDockStateChanged() {
    window.dispatchEvent(new CustomEvent('dock-state-changed'));
}

function tokenizeCommand(str) {
    const tokens = [];
    const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
        tokens.push(match[1] !== undefined ? match[1] : (match[2] !== undefined ? match[2] : match[3]));
    }
    return tokens;
}

async function executePuffCommand(rawCmd) {
    if (!puffOutputHistory) return;

    const tokens = tokenizeCommand(rawCmd.trim());
    if (tokens.length === 0) return;

    const mainCmd = tokens[0].toLowerCase();
    const args = tokens.slice(1);

    let outputText = '';
    let isError = false;

    switch (mainCmd) {
        case 'help': {
            const customCmds = getRegisteredCommands();
            let customHelp = '';
            if (customCmds.length > 0) {
                customHelp = '\n\nCustom & Widget Commands:\n' + customCmds.map(c => {
                    const pad = ' '.repeat(Math.max(2, 18 - c.name.length));
                    return `  ${c.name}${pad}${c.description || 'Custom registered command'}`;
                }).join('\n');
            }

            outputText = `Available Commands & Zero-GUI Apps:
  help              Show this list of available commands
  cli               Switch to full-screen CLI terminal mode
  gui               Return to full graphical user interface (GUI)
  run <app> [args]  Launch visual app on top (e.g. run settings, run notes new, run media)
  clear             Clear output screen
  echo [text]       Display a line of text
  time              Print current date and time
  theme [mode]      Switch theme ('dark', 'light', or 'system')
  calc <math>       Math calculator (e.g. calc 14 * 25, calc sqrt(256))
  settings [args]   System Settings CLI (type 'settings help' for usage)
  tracker [args]    Habit Tracker CLI (type 'tracker help' for usage)
  bookmarks [args]  Bookmarks CLI & search (type 'bookmarks help')
  notes [args]      Sticky Notes CLI (type 'notes -h' for flags)
  todo [args]       Todo List CLI (type 'todo -h' for flags)
  media [args]      Music & Audio Controller (type 'media -h' for flags)
  search [args]     Web Search CLI (type 'search -h' for flags)
  apps              List available system apps & commands
  install <widget>  Install widget from Hub or URL (e.g. install weather)
  exit / quit       Close Puff terminal shell${customHelp}`;
            break;
        }

        case 'run':
        case 'launch':
        case 'open':
            if (args.length === 0) {
                outputText = `Usage: run <app> [subcommand]
Examples:
  run settings           Launch System Settings modal on top
  run notes new [title]  Create and open a new sticky note
  run media              Launch Music & Audio Controller window
  run todo               Launch Todo List app
  run tracker            Launch Habit Tracker app
  run calc               Launch Calculator widget`;
                break;
            }
            const targetApp = args[0].toLowerCase();
            const subArgs = args.slice(1);

            if (targetApp === 'settings' || targetApp === 'setting' || targetApp === 'prefs') {
                const res = handleSettingsCLI(['open', ...subArgs]);
                outputText = res.output || 'Opened System Settings on top.';
                if (res.isError) isError = true;
            } else if (targetApp === 'notes' || targetApp === 'note') {
                const noteCmd = subArgs.length > 0 ? subArgs : ['new'];
                const res = handleNotesCLI(noteCmd);
                outputText = res.output || 'Opened Sticky Notes on top.';
                if (res.isError) isError = true;
            } else if (targetApp === 'media' || targetApp === 'music' || targetApp === 'audio') {
                const res = await handleMediaCLI(['open', ...subArgs]);
                outputText = res.output || 'Opened Media Controller on top.';
                if (res.isError) isError = true;
            } else if (targetApp === 'todo' || targetApp === 'tasks') {
                const res = handleTodoCLI(['open', ...subArgs]);
                outputText = res.output || 'Opened Todo List on top.';
                if (res.isError) isError = true;
            } else if (targetApp === 'tracker' || targetApp === 'habits' || targetApp === 'habit') {
                const res = handleTrackerCLI(['open', ...subArgs]);
                outputText = res.output || 'Opened Habit Tracker on top.';
                if (res.isError) isError = true;
            } else if (targetApp === 'bookmarks' || targetApp === 'bm') {
                const res = await handleBookmarksCLI(subArgs);
                outputText = res.output || '';
                if (res.isError) isError = true;
            } else {
                let customLaunched = false;
                try {
                    const customWidgets = JSON.parse(localStorage.getItem('startpage_custom_widgets') || '[]');
                    const matchedWidget = customWidgets.find(w =>
                        w.id.toLowerCase() === targetApp ||
                        w.name.toLowerCase() === targetApp ||
                        (targetApp === 'calc' && (w.name.toLowerCase().includes('calc') || w.id.toLowerCase().includes('calc'))) ||
                        (targetApp === 'calculator' && (w.name.toLowerCase().includes('calc') || w.id.toLowerCase().includes('calc')))
                    );
                    if (matchedWidget) {
                        window.dispatchEvent(new CustomEvent('launch-custom-widget', { detail: { id: matchedWidget.id } }));
                        outputText = `Launched custom app '${matchedWidget.name}' on top.`;
                        customLaunched = true;
                    }
                } catch(e) {}

                if (!customLaunched) {
                    if (targetApp === 'calc' || targetApp === 'calculator') {
                        if (subArgs.length > 0) {
                            await executePuffCommand(`calc ${subArgs.join(' ')}`);
                            return;
                        } else {
                            outputText = `Calculator: Usage: calc <expression> (e.g. calc 14 * 25). Install custom calculator widget from Studio or Webstore for visual calculator.`;
                        }
                    } else {
                        isError = true;
                        outputText = `Unknown application '${targetApp}'. Type 'apps' to see available applications.`;
                    }
                }
            }
            break;

        case 'cli':
            enterCliMode();
            outputText = `Switched to CLI mode. Full page is now terminal-focused.\nType 'gui' to return to graphical interface.`;
            break;

        case 'gui':
            exitCliMode();
            outputText = `Exited CLI mode. Full graphical interface restored.`;
            break;

        case 'clear':
            puffOutputHistory.innerHTML = '';
            return;

        case 'echo':
            outputText = args.join(' ');
            break;

        case 'time':
        case 'date':
            outputText = new Date().toLocaleString();
            break;

        case 'theme':
            if (args[0] === 'light' || args[0] === 'dark' || args[0] === 'system') {
                userSettings.theme = args[0];
                saveSettings();
                outputText = `Theme updated to '${args[0]}'.`;
            } else {
                outputText = `Current theme: '${userSettings.theme || 'dark'}'. Usage: theme [dark|light|system]`;
            }
            break;

        case 'calc':
        case 'math':
        case '=':
            const expr = (mainCmd === '=' ? [args.join(' ')] : args).join(' ').trim();
            if (!expr) {
                outputText = 'Usage: calc <expression> (e.g. calc 24 * 60, calc sqrt(144))';
            } else {
                try {
                    const sanitized = expr
                        .replace(/sqrt\(/gi, 'Math.sqrt(')
                        .replace(/pow\(/gi, 'Math.pow(')
                        .replace(/sin\(/gi, 'Math.sin(')
                        .replace(/cos\(/gi, 'Math.cos(')
                        .replace(/tan\(/gi, 'Math.tan(')
                        .replace(/log\(/gi, 'Math.log(')
                        .replace(/abs\(/gi, 'Math.abs(')
                        .replace(/round\(/gi, 'Math.round(')
                        .replace(/floor\(/gi, 'Math.floor(')
                        .replace(/ceil\(/gi, 'Math.ceil(')
                        .replace(/\bpi\b/gi, 'Math.PI')
                        .replace(/\be\b/gi, 'Math.E');

                    if (!/^[0-9+\-*/().,%^ MathPIE]+$/.test(sanitized)) {
                        throw new Error('Invalid characters');
                    }
                    const cleanExpr = sanitized.replace(/\^/g, '**');
                    const result = Function(`"use strict"; return (${cleanExpr})`)();
                    outputText = `${expr} = ${result}`;
                } catch (e) {
                    isError = true;
                    outputText = `Math error: Could not evaluate '${expr}'.`;
                }
            }
            break;

        case 'apps': {
            const registeredApps = getRegisteredCommands();
            let customAppsList = '';
            if (registeredApps.length > 0) {
                customAppsList = '\n' + registeredApps.map(c => `  ${c.name} [args]       ${c.description}`).join('\n');
            }
            outputText = `System Applications & Commands:
  notes [args]       Sticky notes manager
  todo [args]        Todo task lists
  tracker [args]     Habit tracker
  media [args]       Audio/video player controller
  bookmarks [args]   Browser bookmarks
  settings [args]    System settings manager
  search [args]      Multi-engine search
  calc <expression>  Math calculator${customAppsList}`;
            break;
        }

        case 'search':
        case 'g':
        case 'yt':
        case 'gh':
        case 'ddg':
        case 'br':
        case 'gpt':
        case 'claude':
        case 'gemini':
        case 'ai':
            const searchResult = handleSearchCLI(args, mainCmd);
            outputText = searchResult.output || '';
            if (searchResult.isError) isError = true;
            break;

        case 'notes':
            const cliResult = handleNotesCLI(args);
            outputText = cliResult.output || '';
            if (cliResult.isError) isError = true;
            break;

        case 'todo':
            const todoResult = handleTodoCLI(args);
            outputText = todoResult.output || '';
            if (todoResult.isError) isError = true;
            break;

        case 'media':
        case 'music':
        case 'audio':
            const mediaResult = await handleMediaCLI(args);
            outputText = mediaResult.output || '';
            if (mediaResult.isError) isError = true;
            break;

        case 'tracker':
        case 'habit':
            const trackerResult = handleTrackerCLI(args);
            outputText = trackerResult.output || '';
            if (trackerResult.isError) isError = true;
            break;

        case 'bookmarks':
        case 'bm':
            const bmResult = await handleBookmarksCLI(args);
            outputText = bmResult.output || '';
            if (bmResult.isError) isError = true;
            break;

        case 'settings':
            const settingsResult = handleSettingsCLI(args);
            outputText = settingsResult.output || '';
            if (settingsResult.isError) isError = true;
            break;

        case 'install':
        case 'pkg': {
            if (args.length === 0) {
                outputText = `Usage: install <widget-id | url | uri>
Examples:
  install github-profile    Install GitHub Profile Viewer
  install open-weather      Install Live Weather (Open-Meteo)
  install pomodoro-timer    Install Pomodoro Focus Timer
  install https://raw.githubusercontent.com/akshitkamboz13/minimal-homepage/main/widgetstore/widgets/github-profile.homewidget
  install homewidget:install?url=...`;
                break;
            }

            const target = args[0];
            try {
                const { installWidgetFromUrl } = await import('../settings/panels/widget-studio.js');
                const res = await installWidgetFromUrl(target);
                if (res.success) {
                    outputText = `Successfully installed widget "${res.widget.name}" (v${res.widget.version})!\nType '${res.widget.id}' or check dock/dashboard to use it.`;
                } else {
                    isError = true;
                    outputText = `Failed to install widget: ${res.error || (res.cancelled ? 'Cancelled' : 'Unknown error')}`;
                }
            } catch (err) {
                isError = true;
                outputText = `Install error: ${err.message || err}`;
            }
            break;
        }

        case 'exit':
        case 'quit':
            if (document.body.classList.contains('cli-mode')) {
                exitCliMode();
            }
            closePuffShell();
            return;

        default: {
            const customCmd = getCommandHandler(mainCmd);
            if (customCmd) {
                try {
                    const handler = customCmd.execute;
                    const rawArgs = rawCmd.trim().replace(/^\S+\s*/, '');
                    const res = await handler(args, rawArgs);
                    if (typeof res === 'object' && res !== null) {
                        outputText = res.output !== undefined ? res.output : (res.text !== undefined ? res.text : '');
                        isError = !!res.isError;
                    } else {
                        outputText = String(res ?? '');
                    }
                } catch (err) {
                    isError = true;
                    outputText = `Error executing '${mainCmd}': ${err.message || err}`;
                }
            } else {
                isError = true;
                outputText = `Puff: command not found: '${mainCmd}'. Type 'help' to see available commands.`;
            }
            break;
        }
    }

    // Append to terminal history
    const entry = document.createElement('div');
    entry.className = 'puff-history-line';
    entry.innerHTML = `
        <div class="puff-cmd-entry">
            <span class="puff-cmd-prompt">&gt;</span>
            <span class="puff-cmd-text">${escapeHTML(rawCmd)}</span>
        </div>
        ${outputText ? `<div class="puff-cmd-result ${isError ? 'error' : ''}">${escapeHTML(outputText)}</div>` : ''}
    `;

    puffOutputHistory.appendChild(entry);

    // Scroll to bottom
    const puffBody = puffWindow.querySelector('#puff-body');
    if (puffBody) puffBody.scrollTop = puffBody.scrollHeight;
}

function escapeHTML(str) {
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
