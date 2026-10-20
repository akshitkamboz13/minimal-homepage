// CLI-Based Extension Template
// Handles commands and provides terminal-style interface or Puff Terminal command hooks

const RESERVED_COMMANDS = [
    "help", "cli", "gui", "run", "launch", "open", "clear", "echo",
    "time", "date", "theme", "calc", "apps", "search", "notes",
    "todo", "media", "tracker", "bookmarks", "settings", "exit", "quit"
];

/** Register custom commands with Puff Terminal if running inside Widget Studio runtime */
if (typeof window !== 'undefined' && window.widget && window.widget.registerCommand) {
    window.widget.registerCommand("mycli", {
        description: "Custom CLI-based extension command",
        usage: "mycli [status|run|echo <msg>]",
        category: "Custom",
        execute: (args, rawArgs) => {
            const sub = args[0] ? args[0].toLowerCase() : "";
            if (sub === "status") {
                return "My CLI Extension is running smoothly.";
            } else if (sub === "echo") {
                return args.slice(1).join(" ") || "Echo: (empty message)";
            }
            return `Usage: mycli [status|echo <msg>]\nReceived args: ${args.join(", ") || "(none)"}`;
        }
    });
}

/** Initialize Standalone CLI (if running as dedicated terminal view) */
function initCLI() {
    const cliInput = document.getElementById("cli-input");
    const cliOutput = document.getElementById("cli-output");

    if (!cliInput || !cliOutput) {
        return;
    }

    cliInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const command = cliInput.value.trim();
            cliInput.value = "";
            handleCommand(command);
        }
    });
}

/** Handle CLI Commands */
function handleCommand(command) {
    const cliOutput = document.getElementById("cli-output");
    if (!cliOutput) return;

    const parts = command.split(/\s+/);
    const mainCmd = parts[0]?.toLowerCase();

    if (RESERVED_COMMANDS.includes(mainCmd)) {
        switch (mainCmd) {
            case "help":
                cliOutput.innerHTML += "\nAvailable commands: help, run, exit, mycli";
                break;
            case "exit":
                cliOutput.innerHTML += "\nExiting CLI...\n";
                document.body.classList.remove("cli-enabled");
                break;
            case "clear":
                cliOutput.innerHTML = "";
                break;
            default:
                cliOutput.innerHTML += `\nSystem command '${mainCmd}' invoked.`;
        }
    } else if (mainCmd === "mycli") {
        cliOutput.innerHTML += `\n> mycli output: extension command executed successfully.`;
    } else {
        cliOutput.innerHTML += `\n> ${command}: Command not recognized. Type 'help' for info.`;
    }

    cliOutput.scrollTop = cliOutput.scrollHeight;
}

/** Initialize CLI on page load */
window.addEventListener("DOMContentLoaded", initCLI);