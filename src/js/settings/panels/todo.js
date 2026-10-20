import { getTodoLists, createTodoList, updateTodoList, deleteTodoList } from '../../todo/todo.js';

export function initTodoSettings() {
    const container = document.getElementById('todo-settings-list');
    if (!container) return;

    renderTodoList(container);

    const btnCreate = document.getElementById('btn-create-todo-list');
    if (btnCreate) {
        btnCreate.addEventListener('click', () => {
            const nameInput = document.getElementById('todo-new-name');
            const placementSelect = document.getElementById('todo-new-placement');

            const name = nameInput?.value.trim();
            if (!name) {
                nameInput?.focus();
                return;
            }
            const placement = placementSelect?.value || 'dashboard';

            createTodoList({ name, placement });
            if (nameInput) nameInput.value = '';
            renderTodoList(container);
        });
    }

    window.addEventListener('todos-updated', () => {
        renderTodoList(container);
    });
}

function renderTodoList(container) {
    container.innerHTML = '';
    const lists = getTodoLists();

    if (lists.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'todo-empty-state';
        empty.textContent = 'No todo lists created. Create one above to get started.';
        container.appendChild(empty);
        return;
    }

    lists.forEach(list => {
        container.appendChild(buildTodoItem(list, container));
    });
}

function buildTodoItem(list, container) {
    const el = document.createElement('div');
    el.className = 'todo-setting-item';

    const items = list.items || [];
    const completed = items.filter(i => i.completed).length;
    const total = items.length;

    el.innerHTML = `
        <div class="todo-setting-info">
            <span class="todo-setting-title">${escapeHtml(list.name)}</span>
            <span class="todo-setting-meta">${completed}/${total} completed • Placement: <strong>${escapeHtml(list.placement || 'dashboard')}</strong></span>
        </div>
        <div class="todo-setting-actions">
            <select class="custom-select todo-edit-placement" style="font-size:0.8rem;padding:3px 8px;">
                <option value="dashboard" ${list.placement === 'dashboard' ? 'selected' : ''}>Dashboard</option>
                <option value="app" ${list.placement === 'app' ? 'selected' : ''}>Apps Grid</option>
                <option value="vertical" ${list.placement === 'vertical' ? 'selected' : ''}>Vertical</option>
                <option value="horizontal" ${list.placement === 'horizontal' ? 'selected' : ''}>Horizontal</option>
            </select>
            <label class="switch" title="Toggle visibility">
                <input type="checkbox" class="todo-toggle-enabled" ${list.enabled !== false ? 'checked' : ''}>
                <span class="slider round"></span>
            </label>
            <button type="button" class="icon-btn todo-btn-delete" title="Delete List">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        </div>
    `;

    // Placement select
    const placementSelect = el.querySelector('.todo-edit-placement');
    if (placementSelect) {
        placementSelect.addEventListener('change', (e) => {
            updateTodoList(list.id, { placement: e.target.value });
            renderTodoList(container);
        });
    }

    // Toggle enabled
    const toggleEnabled = el.querySelector('.todo-toggle-enabled');
    if (toggleEnabled) {
        toggleEnabled.addEventListener('change', (e) => {
            updateTodoList(list.id, { enabled: e.target.checked });
            renderTodoList(container);
        });
    }

    // Delete
    const deleteBtn = el.querySelector('.todo-btn-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (confirm(`Delete todo list "${list.name}"?`)) {
                deleteTodoList(list.id);
                renderTodoList(container);
            }
        });
    }

    return el;
}

function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
