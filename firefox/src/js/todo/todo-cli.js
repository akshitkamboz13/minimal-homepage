import { getTodoLists, addTodoItem, toggleTodoItem, deleteTodoItem, clearCompletedTodos } from './todo.js';

export function handleTodoCLI(rawTokens = []) {
    if (!rawTokens || rawTokens.length === 0) {
        return listTodosCLI();
    }

    const first = rawTokens[0];

    if (first === '-h' || first === '--help' || first === 'help') {
        return {
            output: `Todo CLI Commands & Options:
  todo                              List all tasks
  todo -h, --help                   Show this help guide
  todo "task description"           Add a task to the default list
  todo add "text" [low|med|high]    Add a task with priority
  todo check <item_id>              Toggle completion for a task
  todo rm <item_id>                 Delete a task
  todo clear                        Clear all completed tasks`
        };
    }

    if (first === 'list') {
        return listTodosCLI();
    }

    if (first === 'open' || first === 'gui') {
        const listNameOrId = rawTokens.slice(1).join(' ').trim();
        const lists = getTodoLists();
        let targetList = null;
        if (listNameOrId) {
            targetList = lists.find(l => l.id === listNameOrId || l.name.toLowerCase() === listNameOrId.toLowerCase());
        }
        if (!targetList && lists.length > 0) {
            targetList = lists[0];
        }
        if (targetList) {
            window.dispatchEvent(new CustomEvent('launch-todo-app', { detail: { id: targetList.id } }));
            return { output: `Opened Todo list window ['${targetList.name}'].` };
        }
        return { output: "No todo list found. Type 'todo \"task\"' to create a task.", isError: true };
    }

    if (first === 'clear') {
        const lists = getTodoLists();
        if (lists.length > 0) {
            clearCompletedTodos(lists[0].id);
            return { output: "Cleared completed tasks." };
        }
        return { output: "No todo lists found." };
    }

    if (first === 'check' || first === 'toggle' || first === 'done') {
        const itemId = rawTokens[1];
        if (!itemId) {
            return { output: "Error: Please specify task ID. Usage: todo check <id>", isError: true };
        }
        const lists = getTodoLists();
        for (const list of lists) {
            const item = (list.items || []).find(i => i.id === itemId);
            if (item) {
                toggleTodoItem(list.id, itemId);
                return { output: `Toggled task [${itemId}].` };
            }
        }
        return { output: `Error: Task with ID [${itemId}] not found.`, isError: true };
    }

    if (first === 'rm' || first === 'delete' || first === '-d') {
        const itemId = rawTokens[1];
        if (!itemId) {
            return { output: "Error: Please specify task ID. Usage: todo rm <id>", isError: true };
        }
        const lists = getTodoLists();
        for (const list of lists) {
            const item = (list.items || []).find(i => i.id === itemId);
            if (item) {
                deleteTodoItem(list.id, itemId);
                return { output: `Deleted task [${itemId}].` };
            }
        }
        return { output: `Error: Task with ID [${itemId}] not found.`, isError: true };
    }

    if (first === 'add') {
        const text = rawTokens[1];
        const priority = rawTokens[2] || 'medium';
        if (!text) {
            return { output: "Error: Task text cannot be empty. Usage: todo add \"task text\" [low|med|high]", isError: true };
        }
        const lists = getTodoLists();
        const list = lists[0];
        if (!list) return { output: "Error: No active todo list.", isError: true };
        const item = addTodoItem(list.id, text, priority);
        return { output: `Added task [${item.id}]: "${text}" (${priority} priority).` };
    }

    // Default: treating tokens as task description to add
    const fullText = rawTokens.join(' ');
    const lists = getTodoLists();
    const list = lists[0];
    if (!list) return { output: "Error: No active todo list.", isError: true };
    const item = addTodoItem(list.id, fullText, 'medium');
    return { output: `Added task [${item.id}]: "${fullText}".` };
}

function listTodosCLI() {
    const lists = getTodoLists();
    if (!lists || lists.length === 0) {
        return { output: "No todo lists. Type 'todo \"buy milk\"' to add a task." };
    }

    let out = '';
    lists.forEach(list => {
        const items = list.items || [];
        out += `[${list.name}] (${items.filter(i => i.completed).length}/${items.length} done):\n`;
        if (items.length === 0) {
            out += `  (empty)\n`;
        } else {
            items.forEach(i => {
                const mark = i.completed ? '[x]' : '[ ]';
                const prio = i.priority ? `(${i.priority.charAt(0).toUpperCase()})` : '';
                out += `  ${mark} [${i.id}] ${i.text} ${prio}\n`;
            });
        }
    });

    return { output: out.trimEnd() };
}
