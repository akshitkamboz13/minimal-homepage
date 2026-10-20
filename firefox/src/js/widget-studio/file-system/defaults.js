/**
 * Widget Studio — File System Starter Templates
 * Locked HTML shell and default starter templates for index.html, style.css, and script.js.
 */

export const INDEX_LOCKED_HEAD =
`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="style.css">
    <!-- Widget sandbox runtime injected by Widget Studio -->
</head>
<body class="widget">`;

export const INDEX_LOCKED_FOOT = `\n</body>\n</html>`;

export const DEFAULT_HTML_BODY =
`<div class="widget-container">
    <div class="widget-header">
        <h2>My Widget</h2>
    </div>
    <div class="widget-body">
        <p id="widget-text">Hello, World!</p>
        <button type="button" id="btn-click">Click Me</button>
    </div>
</div>`;

export const DEFAULT_CSS =
`/* Widget Styles */
.widget-container {
    width: 100%;
    height: 100%;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.widget-header h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
}

.widget-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

#btn-click {
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    background: #3b82f6;
    color: white;
    font-weight: 500;
    transition: opacity 0.2s;
}

#btn-click:hover {
    opacity: 0.85;
}`;

export const DEFAULT_JS =
`// Widget Script — runs in a sandboxed iframe
const btn  = document.getElementById('btn-click');
const text = document.getElementById('widget-text');
let count = 0;

if (btn && text) {
    btn.addEventListener('click', () => {
        count++;
        text.textContent = \`Clicked \${count} time\${count !== 1 ? 's' : ''}!\`;
    });
}

// Optional: Register a companion terminal command with Puff Terminal
if (window.widget && window.widget.registerCommand) {
    window.widget.registerCommand('mywidget', {
        description: 'Interacts with My Widget',
        usage: 'mywidget [click|status]',
        execute: (args) => {
            const sub = args[0] ? args[0].toLowerCase() : '';
            if (sub === 'click') {
                count++;
                if (text) text.textContent = \`Clicked \${count} time\${count !== 1 ? 's' : ''}!\`;
                return \`Incremented count to \${count}.\`;
            }
            return \`My Widget count is currently \${count}.\`;
        }
    });
}`;
