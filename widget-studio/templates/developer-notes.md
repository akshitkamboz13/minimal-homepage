# Widget Studio: Extension Developer Notes

## Predefined Rules & Architecture Modes
Widget Studio enables building Chrome and Firefox extensions with three distinct interface modes:

- **CLI-based Extension**: A keyboard-driven, terminal-focused extension. Operates natively inside Puff Terminal or full-screen CLI mode with zero-GUI overhead.
- **GUI-only Extension**: Drag-and-drop visual widgets, windows, or panel shortcuts without command-line dependencies.
- **GUI+CLI Hybrid Extension**: Combines visual glassmorphic dashboard cards or desktop windows with companion terminal commands registered into Puff Terminal.

---

## Reserved CLI Commands
The following command names are reserved by the core startpage and Puff Terminal system. Custom widgets cannot overwrite these keywords:

| Category | Reserved Keywords |
| :--- | :--- |
| **System Navigation** | `help`, `cli`, `gui`, `clear`, `exit`, `quit` |
| **Runner & App Launch** | `run`, `launch`, `open`, `apps` |
| **Utilities** | `echo`, `time`, `date`, `theme`, `calc`, `math`, `=` |
| **Core Zero-GUI Apps** | `notes`, `todo`, `media`, `music`, `audio`, `tracker`, `habit`, `bookmarks`, `bm`, `settings` |
| **Search Engines & AI** | `search`, `g`, `yt`, `gh`, `ddg`, `br`, `gpt`, `claude`, `gemini`, `ai` |

Attempting to register a command using any of these reserved names will return an error and fail collision checks.

---

## Terminal Command Registration API (`widget.cli` / `widget.registerCommand`)

Sandboxed widgets and hybrid extensions can dynamically register custom commands into Puff Terminal.

### 1. `widget.registerCommand(name, handlerOrConfig)`
Registers a command in Puff Terminal.

#### Parameters:
- `name` *(string)*: Alphanumeric command name (lowercase, dashes/underscores allowed, e.g. `'weather'`, `'pomodoro'`, `'sysinfo'`).
- `handlerOrConfig` *(Function | Object)*:
  - If a function: `(args, rawArgs) => string | { output: string, isError?: boolean } | Promise<any>`
  - If an object:
    - `description` *(string)*: Brief one-line summary displayed in `help` and `apps` listings.
    - `usage` *(string)*: Command invocation syntax (e.g. `'pomodoro [start|stop|status]'`).
    - `category` *(string)*: Optional category tag (default: `'Widget'`).
    - `execute(args, rawArgs)` *(Function)*: Execution handler receiving parsed arguments array and raw arguments string.

#### Return Value in `execute`:
- Return a `string` for standard terminal output.
- Or return an object `{ output: "...", isError: true }` to highlight an error state in red.

### 2. `widget.unregisterCommand(name)`
Unregisters a command previously registered by this widget.

### 3. `widget.cli` Helper Namespace
- `widget.cli.registerCommand(name, handlerOrConfig)`: Alias to `widget.registerCommand`.
- `widget.cli.unregisterCommand(name)`: Alias to `widget.unregisterCommand`.
- `widget.cli.listCommands()`: Returns an array of command names registered by this widget.

---

## Example Implementations

### Example 1: CLI-Based Companion Command
```javascript
// Register a custom terminal command in Puff Terminal
if (window.widget && window.widget.registerCommand) {
    window.widget.registerCommand('pomodoro', {
        description: 'Pomodoro focus timer controller',
        usage: 'pomodoro [start|pause|reset|status]',
        category: 'Productivity',
        execute: (args, rawArgs) => {
            const action = args[0] ? args[0].toLowerCase() : 'status';
            if (action === 'start') {
                return 'Pomodoro session started (25 minutes). Stay focused!';
            } else if (action === 'pause') {
                return 'Timer paused.';
            } else if (action === 'reset') {
                return 'Timer reset to 25:00.';
            } else if (action === 'status') {
                return 'Status: 18:42 remaining in current session.';
            }
            return {
                output: `Invalid subcommand '${action}'. Usage: pomodoro [start|pause|reset|status]`,
                isError: true
            };
        }
    });
}
```

### Example 2: GUI + CLI Hybrid Interaction
A widget card that updates its visual UI when commands are executed from the terminal:

```javascript
let count = 0;
const countEl = document.getElementById('count-display');

function updateCount(val) {
    count = val;
    if (countEl) countEl.textContent = count;
}

// Visual button click
document.getElementById('btn-add')?.addEventListener('click', () => {
    updateCount(count + 1);
});

// Terminal command integration
if (window.widget && window.widget.registerCommand) {
    window.widget.registerCommand('counter', {
        description: 'Read or update the Counter widget state',
        usage: 'counter [get|add <n>|reset]',
        execute: (args) => {
            const sub = args[0] ? args[0].toLowerCase() : 'get';
            if (sub === 'get') {
                return `Current counter value: ${count}`;
            } else if (sub === 'add') {
                const delta = parseInt(args[1], 10) || 1;
                updateCount(count + delta);
                return `Added ${delta}. New count: ${count}`;
            } else if (sub === 'reset') {
                updateCount(0);
                return 'Counter reset to 0.';
            }
            return `Unknown action. Usage: counter [get|add <n>|reset]`;
        }
    });
}
```
