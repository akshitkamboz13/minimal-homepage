/**
 * Puff Terminal — Custom Command Registry API
 * Allows internal modules and third-party Widget Studio widgets to dynamically
 * register custom commands into Puff Terminal.
 */

export const RESERVED_PUFF_COMMANDS = new Set([
    'help', 'cli', 'gui', 'run', 'launch', 'open', 'clear', 'echo',
    'time', 'date', 'theme', 'calc', 'math', '=', 'apps',
    'search', 'g', 'yt', 'gh', 'ddg', 'br', 'gpt', 'claude', 'gemini', 'ai',
    'notes', 'todo', 'media', 'music', 'audio', 'tracker', 'habit',
    'bookmarks', 'bm', 'settings', 'exit', 'quit'
]);

const customCommands = new Map();

/**
 * Checks if a command name is reserved by Puff system.
 * @param {string} name
 * @returns {boolean}
 */
export function isCommandReserved(name) {
    if (!name || typeof name !== 'string') return false;
    return RESERVED_PUFF_COMMANDS.has(name.trim().toLowerCase());
}

/**
 * Registers a custom command in Puff Terminal.
 * @param {string} name - Command name (lowercase alphanumeric + hyphens)
 * @param {Function|object} handlerOrConfig - Async/sync function(args, rawArgs) OR config object:
 *   {
 *     description?: string,
 *     usage?: string,
 *     category?: string,
 *     execute: (args: string[], rawArgs: string) => string | { output: string, isError?: boolean } | Promise<any>
 *   }
 * @returns {{ success: boolean, error?: string }}
 */
export function registerCommand(name, handlerOrConfig) {
    if (!name || typeof name !== 'string') {
        return { success: false, error: 'Command name must be a non-empty string.' };
    }

    const cleanName = name.trim().toLowerCase();

    if (!/^[a-z0-9_-]+$/.test(cleanName)) {
        return { success: false, error: `Invalid command name '${cleanName}'. Use alphanumeric characters, dashes, or underscores.` };
    }

    if (RESERVED_PUFF_COMMANDS.has(cleanName)) {
        return { success: false, error: `Command '${cleanName}' is a reserved Puff system command and cannot be overwritten.` };
    }

    if (typeof handlerOrConfig === 'function') {
        customCommands.set(cleanName, {
            name: cleanName,
            description: 'Custom registered command',
            usage: cleanName,
            execute: handlerOrConfig
        });
    } else if (handlerOrConfig && typeof handlerOrConfig.execute === 'function') {
        customCommands.set(cleanName, {
            name: cleanName,
            description: handlerOrConfig.description || 'Custom registered command',
            usage: handlerOrConfig.usage || cleanName,
            category: handlerOrConfig.category || 'Custom',
            execute: handlerOrConfig.execute
        });
    } else {
        return { success: false, error: 'Handler must be a function or an object with an execute() function.' };
    }

    return { success: true };
}

/**
 * Unregisters a previously registered custom command.
 * @param {string} name
 * @returns {boolean}
 */
export function unregisterCommand(name) {
    if (!name || typeof name !== 'string') return false;
    const cleanName = name.trim().toLowerCase();
    return customCommands.delete(cleanName);
}

/**
 * Unregisters all commands associated with a specific widget ID.
 * @param {string} widgetId
 */
export function unregisterWidgetCommands(widgetId) {
    if (!widgetId) return;
    for (const [name, cmd] of customCommands.entries()) {
        if (cmd.widgetId === widgetId) {
            customCommands.delete(name);
        }
    }
}

/**
 * Returns a list of all custom registered commands with metadata.
 * @returns {Array<{ name: string, description: string, usage: string }>}
 */
export function getRegisteredCommands() {
    const list = [];
    for (const cmd of customCommands.values()) {
        list.push({
            name: cmd.name,
            description: cmd.description,
            usage: cmd.usage,
            category: cmd.category || 'Custom',
            widgetId: cmd.widgetId
        });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Gets a registered command handler config if one exists.
 * @param {string} name
 * @returns {object|null}
 */
export function getCommandHandler(name) {
    if (!name || typeof name !== 'string') return null;
    return customCommands.get(name.trim().toLowerCase()) || null;
}
