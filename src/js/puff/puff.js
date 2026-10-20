import { userSettings, saveSettings } from '../settings/index.js';
import { appRegistry } from '../ui/app-registry.js';
import { createGlassWindow } from '../ui/window-generator.js';
import { handleNotesCLI } from '../notes/note-cli.js';
import { handleSearchCLI } from '../search/search-cli.js';
import { handleTodoCLI } from '../todo/todo-cli.js';
import { handleMediaCLI } from '../media/media-cli.js';

let puffInstance = null;
let puffWindow = null;
let puffInput = null;
let puffOutputHistory = null;
let commandHistory = [];
let historyIndex = -1;
let isPuffInitialized = false;

export function initPuff() {
    if (isPuffInitialized) return;
    isPuffInitialized = true;

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
                <div class="puff-banner-title">Puff</div>
                <div class="puff-banner-sub">Type 'help' to see available commands.</div>
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
}

function savePuffState() {
    if (!puffWindow) return;
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

    puffInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const cmd = puffInput.value.trim();
            if (cmd.length > 0) {
                commandHistory.push(cmd);
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
        case 'help':
            outputText = `Available Commands & Shortcuts:
  help           Show this list of available commands
  clear          Clear output screen
  echo [text]    Display a line of text
  time           Print current date and time
  theme [mode]   Switch theme ('dark', 'light', or 'system')
  search [args]  Web Search CLI (type 'search -h' for flags)
  g "query"      Quick Google search (e.g. g "react hooks")
  yt "query"     Quick YouTube search (e.g. yt "lofi music")
  gh "query"     Quick GitHub search (e.g. gh "openai")
  ddg "query"    Quick DuckDuckGo search (e.g. ddg "privacy")
  gpt "query"    Quick ChatGPT AI search (e.g. gpt "HTTP/3 guide")
  ai "query"     Quick AI search (e.g. ai "Explain CAP theorem")
  notes [args]   Sticky Notes CLI (type 'notes -h' for flags)
  todo [args]    Todo List CLI (type 'todo -h' for flags)
  media [args]   Music & Audio Controller (type 'media -h' for flags)
  settings       Open System Settings panel
  exit / quit    Close Puff terminal shell`;
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

        case 'settings':
            const modal = document.getElementById('settings-modal');
            if (modal) modal.classList.remove('hidden', 'is-minimized');
            outputText = `Opened System Settings.`;
            break;

        case 'exit':
        case 'quit':
            closePuffShell();
            return;

        default:
            isError = true;
            outputText = `Puff: command not found: '${mainCmd}'. Type 'help' to see available commands.`;
            break;
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
