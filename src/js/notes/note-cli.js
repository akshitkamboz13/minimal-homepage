import { userSettings, saveSettings } from '../settings/index.js';
import { createNoteWithData, deleteNoteById, deleteAllNotes, getNotesList, updateNoteData } from './notes.js';

export function handleNotesCLI(rawTokens = []) {
    if (!rawTokens || rawTokens.length === 0) {
        return listNotes();
    }

    const first = rawTokens[0];

    if (first === '-h' || first === '--help' || first === 'help') {
        return {
            output: `Notes CLI Commands & Options:
  notes                             List all active sticky notes
  notes -h, --help                  Show this help guide
  notes "content text"              Create a new note with content
  notes -t "title" "content text"   Create a new note with title and content
  notes -t "title"                  Create a blank note with title
  notes -d <id|all>                 Delete note by ID or delete all notes
  notes -c <id> <yellow|blue|green|pink> Change note color theme
  notes -m <id|all>                 Minimize note(s)
  notes -u <id|all>                 Unminimize/restore note(s)`
        };
    }

    if (first === 'list') {
        return listNotes();
    }

    if (first === '-d' || first === '--delete' || first === 'delete' || first === 'rm') {
        const id = rawTokens[1];
        if (!id) {
            return { output: "Error: Please specify note ID or 'all'. Usage: notes -d <id|all>", isError: true };
        }
        if (id.toLowerCase() === 'all') {
            deleteAllNotes();
            return { output: "Deleted all sticky notes." };
        } else {
            const success = deleteNoteById(id);
            return success
                ? { output: `Deleted note [${id}].` }
                : { output: `Error: Note with ID [${id}] not found.`, isError: true };
        }
    }

    if (first === '-m' || first === '--minimize') {
        const id = rawTokens[1] || 'all';
        return setNotesMinimized(id, true);
    }

    if (first === '-u' || first === '--unminimize') {
        const id = rawTokens[1] || 'all';
        return setNotesMinimized(id, false);
    }

    if (first === '-c' || first === '--color') {
        const id = rawTokens[1];
        const color = rawTokens[2];
        if (!id || !color) {
            return { output: "Error: Usage: notes -c <id> <yellow|blue|green|pink>", isError: true };
        }
        const success = changeColor(id, color);
        return success
            ? { output: `Updated note [${id}] color to '${color}'.` }
            : { output: `Error: Note [${id}] not found or invalid color.`, isError: true };
    }

    if (first === '-t' || first === '--title') {
        const title = rawTokens[1] || '';
        const text = rawTokens[2] || '';
        const note = createNoteWithData({ title, text });
        return {
            output: `Created note [${note.id}] ${title ? `'${title}'` : ''}.`
        };
    }

    // Default: treating input string as note text content
    const textContent = rawTokens.join(' ');
    const note = createNoteWithData({ title: '', text: textContent });
    return {
        output: `Created note [${note.id}] with content: "${textContent}".`
    };
}

function listNotes() {
    const list = getNotesList();
    if (list.length === 0) {
        return { output: "No active sticky notes. Type 'notes \"my content\"' to create one." };
    }

    let out = `Active Sticky Notes (${list.length}):\n`;
    list.forEach((n, idx) => {
        const title = n.title ? `'${n.title}'` : '(Untitled)';
        const snippet = n.text ? ` - "${n.text.substring(0, 30)}${n.text.length > 30 ? '...' : ''}"` : '';
        const status = n.isMinimized ? ' [minimized]' : '';
        out += `  [${n.id}] ${title}${snippet}${status}\n`;
    });
    return { output: out.trimEnd() };
}

function setNotesMinimized(targetId, isMin) {
    const list = getNotesList();
    if (list.length === 0) {
        return { output: "No sticky notes found." };
    }

    if (targetId.toLowerCase() === 'all') {
        list.forEach(n => {
            updateNoteData(n.id, { isMinimized: isMin });
        });
        return { output: isMin ? "Minimized all sticky notes." : "Restored all sticky notes." };
    } else {
        const success = updateNoteData(targetId, { isMinimized: isMin });
        return success
            ? { output: `${isMin ? 'Minimized' : 'Restored'} note [${targetId}].` }
            : { output: `Error: Note [${targetId}] not found.`, isError: true };
    }
}

function changeColor(id, colorName) {
    const validColors = {
        'yellow': 'color-yellow',
        'blue': 'color-blue',
        'green': 'color-green',
        'pink': 'color-pink'
    };
    const targetClass = validColors[colorName.toLowerCase()] || colorName;
    return updateNoteData(id, { color: targetClass });
}
