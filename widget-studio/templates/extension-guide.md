# Widget Studio Extension Creation Guide

Widget Studio provides the tools to create Chrome and Firefox extensions with modular interface models:

- **CLI-based Extensions**: Keyboard-driven extensions that operate inside Puff Terminal or full-screen CLI mode.
- **GUI-only Extensions**: Graphical desktop windows, dashboard widgets, or panel icons.
- **GUI+CLI Hybrid Extensions**: Combines graphical widgets with companion commands registered directly into Puff Terminal.

---

## Step-by-Step Guide

### 1. Open Widget Studio

From the main menu, select **Create New Extension** or open `widget-studio.html`. Under the **Widget Type** dropdown, select your architecture:

- **Window Application (`app`)**: Desktop floating glass window.
- **Dashboard Layout Widget (`widget`)**: Pinned widget on the startpage wallpaper.
- **Vertical / Horizontal Panel (`vertical` / `horizontal`)**: Panel launcher icon and flyout.
- **CLI-based Extension (`cli`)**: Terminal-focused extension with zero-GUI overhead.
- **GUI + CLI Hybrid Extension (`hybrid`)**: Visual interface plus companion terminal commands.

### 2. Configure Your Extension

- **Manifest Settings**:
  - Set extension name, author, description, and version.
  - Set permissions (`network (fetch)`, `notifications`, `clipboard`, `storage`, `popups / links`).
  - Configure default, minimum, and maximum dimensions for sized widgets.

- **JavaScript Logic & Terminal Commands**:
  - In `script.js`, write widget logic and register CLI commands using `widget.registerCommand(name, handlerOrConfig)`.
  - Registered commands appear in Puff Terminal's `help` and `apps` listings automatically.

### 3. Reserved Command Rules

Puff Terminal maintains collision protection against core system commands:
- `help`, `cli`, `gui`, `run`, `launch`, `open`, `clear`, `echo`, `time`, `date`, `theme`, `calc`
- `notes`, `todo`, `media`, `music`, `audio`, `tracker`, `habit`, `bookmarks`, `settings`, `exit`, `quit`
- Search keywords: `search`, `g`, `yt`, `gh`, `ddg`, `br`, `gpt`, `claude`, `gemini`, `ai`

Use custom names like `weather`, `timer`, `github`, `reddit`, etc.

### 4. Code Example

```javascript
// Register a companion command in Puff Terminal
if (window.widget && window.widget.registerCommand) {
    window.widget.registerCommand('hello', {
        description: 'Greets the user from your custom widget',
        usage: 'hello [name]',
        execute: (args) => {
            const name = args.join(' ') || 'World';
            return `Hello, ${name}!`;
        }
    });
}
```

### 5. Testing and Distribution

- **Test in Browser**: Test your extension directly in the Widget Studio live preview pane, or load the unpacked directory in `chrome://extensions` or `about:debugging` in Firefox.
- **Export**: Click **Export Package** (`.homewidget`) or download project files for publishing to the Chrome Web Store or Firefox Add-ons.

---

For complete API specifications and syntax examples, see `developer-notes.md`.
