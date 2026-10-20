import { userSettings, saveSettings, onSettingsChanged } from '../settings/index.js';
import { createGlassWindow } from '../ui/window-generator.js';
import { createGlassCard } from '../ui/card-generator.js';
import { appRegistry } from '../ui/app-registry.js';
import { applyDashboardOrder } from '../settings/panels/dashboard-layout.js';

// ─── Storage Keys & Constants ──────────────────────────────────────────────────

const TODOS_KEY = 'startpage_todos';
const DEFAULT_LIST_ID = 'todo_default';

// ─── Data Access & Persistence ─────────────────────────────────────────────────

export function loadTodosData() {
    try {
        const stored = JSON.parse(localStorage.getItem(TODOS_KEY));
        if (stored && Array.isArray(stored.lists) && stored.lists.length > 0) {
            return stored;
        }
    } catch (e) {}

    // Default structure: one default list with sample tasks
    const initial = {
        activeListId: DEFAULT_LIST_ID,
        lists: [
            {
                id: DEFAULT_LIST_ID,
                name: 'Tasks',
                placement: 'dashboard', // 'dashboard' | 'app' | 'vertical' | 'horizontal'
                enabled: false,         // Default closed
                filter: 'all',          // 'all' | 'active' | 'completed'
                items: [
                    {
                        id: 'item_1',
                        text: 'Welcome to your Todo Widget! Click checkbox to finish',
                        completed: false,
                        priority: 'high', // 'low' | 'medium' | 'high'
                        createdAt: Date.now() - 3600000
                    },
                    {
                        id: 'item_2',
                        text: 'Add new items or filter by Active / Done',
                        completed: false,
                        priority: 'medium',
                        createdAt: Date.now() - 1800000
                    }
                ]
            }
        ]
    };
    saveTodosData(initial);
    return initial;
}

export function saveTodosData(data) {
    localStorage.setItem(TODOS_KEY, JSON.stringify(data));
}

export function getTodoLists() {
    return loadTodosData().lists;
}

export function getTodoListById(listId) {
    const data = loadTodosData();
    return data.lists.find(l => l.id === listId) || null;
}

// ─── CRUD Operations ───────────────────────────────────────────────────────────

export function createTodoList({ name, placement = 'dashboard' }) {
    const data = loadTodosData();
    const id = `todo_list_${Date.now()}`;
    const newList = {
        id,
        name: name || 'My Tasks',
        placement: placement || 'dashboard',
        enabled: true,
        filter: 'all',
        items: []
    };
    data.lists.push(newList);
    data.activeListId = id;
    saveTodosData(data);
    refreshAllTodoViews();
    return newList;
}

export function updateTodoList(listId, updates = {}) {
    const data = loadTodosData();
    const target = data.lists.find(l => l.id === listId);
    if (!target) return false;
    Object.assign(target, updates);
    saveTodosData(data);
    refreshAllTodoViews();
    return true;
}

export function deleteTodoList(listId) {
    const data = loadTodosData();
    const idx = data.lists.findIndex(l => l.id === listId);
    if (idx === -1) return false;

    // Never remove last list; reset it instead
    if (data.lists.length === 1) {
        data.lists[0].items = [];
        data.lists[0].name = 'Tasks';
        saveTodosData(data);
        refreshAllTodoViews();
        return true;
    }

    data.lists.splice(idx, 1);
    if (data.activeListId === listId) {
        data.activeListId = data.lists[0].id;
    }
    saveTodosData(data);
    refreshAllTodoViews();
    return true;
}

// ─── Item Operations ───────────────────────────────────────────────────────────

export function addTodoItem(listId, text, priority = 'medium') {
    if (!text || !text.trim()) return null;
    const data = loadTodosData();
    const list = data.lists.find(l => l.id === listId) || data.lists[0];
    if (!list) return null;

    const newItem = {
        id: `todo_item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        text: text.trim(),
        completed: false,
        priority: priority || 'medium',
        createdAt: Date.now()
    };
    list.items.unshift(newItem);
    saveTodosData(data);
    renderListInstances(list.id);
    return newItem;
}

export function toggleTodoItem(listId, itemId) {
    const data = loadTodosData();
    const list = data.lists.find(l => l.id === listId);
    if (!list) return;
    const item = list.items.find(i => i.id === itemId);
    if (!item) return;

    item.completed = !item.completed;
    item.completedAt = item.completed ? Date.now() : null;
    saveTodosData(data);
    renderListInstances(list.id);
}

export function deleteTodoItem(listId, itemId) {
    const data = loadTodosData();
    const list = data.lists.find(l => l.id === listId);
    if (!list) return;
    list.items = list.items.filter(i => i.id !== itemId);
    saveTodosData(data);
    renderListInstances(list.id);
}

export function clearCompletedTodos(listId) {
    const data = loadTodosData();
    const list = data.lists.find(l => l.id === listId);
    if (!list) return;
    list.items = list.items.filter(i => !i.completed);
    saveTodosData(data);
    renderListInstances(list.id);
}

export function setTodoListFilter(listId, filter) {
    const data = loadTodosData();
    const list = data.lists.find(l => l.id === listId);
    if (!list) return;
    list.filter = filter;
    saveTodosData(data);
    renderListInstances(list.id);
}

// ─── DOM Instances Registry & Multi-mount Rendering ────────────────────────────

const registeredContainers = new Map(); // listId -> Set<HTMLElement>
const openWindows = new Map();          // listId -> windowInstance
const openPopups  = new Map();          // listId -> { panel, container, triggerBtn }
const dashboardCards = new Map();       // listId -> { cardEl, container }

function registerContainer(listId, containerEl) {
    if (!registeredContainers.has(listId)) {
        registeredContainers.set(listId, new Set());
    }
    registeredContainers.get(listId).add(containerEl);
}

function unregisterContainer(listId, containerEl) {
    if (registeredContainers.has(listId)) {
        registeredContainers.get(listId).delete(containerEl);
    }
}

function renderListInstances(listId) {
    const targets = registeredContainers.get(listId);
    if (!targets) return;
    targets.forEach(container => {
        if (container.isConnected) {
            renderTodoWidget(container, listId);
        }
    });
}

function refreshAllTodoViews() {
    loadActiveTodos();
    const event = new CustomEvent('todos-updated');
    window.dispatchEvent(event);
}

// ─── HTML Sanitization ─────────────────────────────────────────────────────────

function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ─── Component Markup & Event Binding ──────────────────────────────────────────

export function renderTodoWidget(container, listId) {
    const list = getTodoListById(listId);
    if (!list) {
        container.innerHTML = '<div class="todo-empty-state">List not found</div>';
        return;
    }

    const items = list.items || [];
    const totalCount = items.length;
    const completedCount = items.filter(i => i.completed).length;
    const activeCount = totalCount - completedCount;
    const filter = list.filter || 'all';

    let displayItems = items;
    if (filter === 'active') {
        displayItems = items.filter(i => !i.completed);
    } else if (filter === 'completed') {
        displayItems = items.filter(i => i.completed);
    }

    container.innerHTML = `
        <div class="todo-widget">
            <!-- Header Row -->
            <div class="todo-header">
                <div class="todo-title-row">
                    <div class="todo-title-wrap">
                        <svg class="todo-title-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 11 12 14 22 4"></polyline>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                        </svg>
                        <span class="todo-title-text" title="${escapeHtml(list.name)}">${escapeHtml(list.name)}</span>
                        <span class="todo-badge-count" title="${completedCount} of ${totalCount} completed">${completedCount}/${totalCount}</span>
                    </div>

                    <!-- Filter buttons -->
                    <div class="todo-filters">
                        <button type="button" class="todo-filter-btn ${filter === 'all' ? 'active' : ''}" data-filter="all">All</button>
                        <button type="button" class="todo-filter-btn ${filter === 'active' ? 'active' : ''}" data-filter="active">Active</button>
                        <button type="button" class="todo-filter-btn ${filter === 'completed' ? 'active' : ''}" data-filter="completed">Done</button>
                    </div>
                </div>

                <!-- Input Row -->
                <div class="todo-input-row">
                    <input type="text" class="todo-add-input" placeholder="Add a new task..." aria-label="Add task" maxlength="160" />
                    <select class="todo-priority-select" title="Priority">
                        <option value="low">Low</option>
                        <option value="medium" selected>Med</option>
                        <option value="high">High</option>
                    </select>
                    <button type="button" class="todo-add-btn" title="Add Task">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>
            </div>

            <!-- Items List -->
            <div class="todo-items-scroll">
                ${displayItems.length === 0 ? `
                    <div class="todo-empty-state">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.6">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="m9 12 2 2 4-4"></path>
                        </svg>
                        <span>${filter === 'completed' ? 'No completed tasks yet' : filter === 'active' ? 'All caught up! No active tasks' : 'No tasks in this list. Add one above!'}</span>
                    </div>
                ` : `
                    <ul class="todo-items-list">
                        ${displayItems.map(item => `
                            <li class="todo-item ${item.completed ? 'is-completed' : ''}" data-item-id="${item.id}">
                                <label class="todo-checkbox-wrap">
                                    <input type="checkbox" class="todo-checkbox" ${item.completed ? 'checked' : ''} />
                                    <span class="todo-checkmark"></span>
                                </label>
                                <span class="todo-item-priority priority-${item.priority || 'medium'}" title="Priority: ${item.priority || 'medium'}"></span>
                                <span class="todo-item-text" title="${escapeHtml(item.text)}">${escapeHtml(item.text)}</span>
                                <button type="button" class="todo-item-delete" title="Delete Task" aria-label="Delete">
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </li>
                        `).join('')}
                    </ul>
                `}
            </div>

            <!-- Footer stats / actions -->
            ${completedCount > 0 ? `
                <div class="todo-footer">
                    <span class="todo-footer-text">${activeCount} active task${activeCount === 1 ? '' : 's'} remaining</span>
                    <button type="button" class="todo-clear-completed-btn">Clear Done</button>
                </div>
            ` : ''}
        </div>
    `;

    // ── Bind Events ──
    const inputEl = container.querySelector('.todo-add-input');
    const prioritySelect = container.querySelector('.todo-priority-select');
    const addBtn = container.querySelector('.todo-add-btn');

    const handleAdd = () => {
        if (!inputEl) return;
        const text = inputEl.value;
        const prio = prioritySelect ? prioritySelect.value : 'medium';
        if (text && text.trim()) {
            addTodoItem(listId, text, prio);
            inputEl.value = '';
        }
    };

    if (addBtn) {
        addBtn.addEventListener('click', handleAdd);
    }
    if (inputEl) {
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
            }
        });
    }

    // Filter Buttons
    container.querySelectorAll('.todo-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const chosen = btn.dataset.filter;
            setTodoListFilter(listId, chosen);
        });
    });

    // Checkbox and Delete delegations
    const listEl = container.querySelector('.todo-items-list');
    if (listEl) {
        listEl.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.todo-item-delete');
            if (deleteBtn) {
                e.stopPropagation();
                const itemEl = deleteBtn.closest('.todo-item');
                const itemId = itemEl?.dataset.itemId;
                if (itemId) deleteTodoItem(listId, itemId);
                return;
            }

            const checkbox = e.target.closest('.todo-checkbox');
            if (checkbox) {
                const itemEl = checkbox.closest('.todo-item');
                const itemId = itemEl?.dataset.itemId;
                if (itemId) toggleTodoItem(listId, itemId);
            }
        });
    }

    // Clear completed
    const clearBtn = container.querySelector('.todo-clear-completed-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearCompletedTodos(listId);
        });
    }
}

// ─── Dashboard Card Mounting ───────────────────────────────────────────────────

function mountDashboardCard(list) {
    const widgetsContainer = document.getElementById('dashboard-widgets-container') || document.querySelector('main');
    if (!widgetsContainer) return;

    const { cardEl, bodyEl } = createGlassCard({
        id: `todo-card-${list.id}`,
        title: '',
        width: 380,
        className: 'todo-dashboard-card custom-dashboard-widget'
    });

    bodyEl.style.padding = '0';
    bodyEl.style.overflow = 'hidden';

    const container = document.createElement('div');
    container.className = 'todo-card-inner';
    bodyEl.appendChild(container);

    widgetsContainer.appendChild(cardEl);
    dashboardCards.set(list.id, { cardEl, container });

    registerContainer(list.id, container);
    renderTodoWidget(container, list.id);
}

// ─── Window / Popups ───────────────────────────────────────────────────────────

export function launchTodoWindow(list) {
    if (!list) return;

    if (openWindows.has(list.id)) {
        openWindows.get(list.id).bringToFront();
        return;
    }

    const winInstance = createGlassWindow({
        id: `todo_win_${list.id}`,
        title: `Todo — ${list.name}`,
        width: 420,
        height: 380,
        minWidth: 320,
        minHeight: 280,
        onClose: () => {
            const container = winInstance.bodyEl.querySelector('.todo-window-body');
            if (container) unregisterContainer(list.id, container);
            appRegistry.unregisterApp(`todo_${list.id}`);
            openWindows.delete(list.id);
        }
    });

    winInstance.bodyEl.style.padding = '0';
    winInstance.bodyEl.style.overflow = 'hidden';

    const container = document.createElement('div');
    container.className = 'todo-window-body';
    winInstance.bodyEl.appendChild(container);

    registerContainer(list.id, container);
    renderTodoWidget(container, list.id);
    openWindows.set(list.id, winInstance);

    appRegistry.registerApp({
        id: `todo_${list.id}`,
        name: list.name,
        icon: todoSVGIcon(),
        focus: () => winInstance.bringToFront(),
        close: () => winInstance.destroy()
    });
}

function toggleTodoPopup(list, triggerBtn) {
    if (openPopups.has(list.id)) {
        const { panel, container } = openPopups.get(list.id);
        const wasActive = panel.classList.contains('active');
        closeAllTodoPopups();
        if (!wasActive) {
            renderTodoWidget(container, list.id);
            positionTodoPanel(panel, triggerBtn);
            panel.classList.add('active');
            triggerBtn.classList.add('active');
        }
        return;
    }

    closeAllTodoPopups();

    const panel = document.createElement('div');
    panel.id = `todo-popup-${list.id}`;
    panel.className = 'todo-popup glass-panel';
    panel.style.width = '380px';
    panel.style.height = '280px';

    const header = document.createElement('div');
    header.className = 'todo-popup-header';
    const titleEl = document.createElement('h3');
    titleEl.textContent = list.name;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'todo-popup-close';
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.remove('active');
        triggerBtn.classList.remove('active');
    });
    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const container = document.createElement('div');
    container.className = 'todo-popup-body';
    panel.appendChild(container);

    document.body.appendChild(panel);
    openPopups.set(list.id, { triggerBtn, panel, container });

    registerContainer(list.id, container);
    renderTodoWidget(container, list.id);

    setTimeout(() => {
        positionTodoPanel(panel, triggerBtn);
        panel.classList.add('active');
        triggerBtn.classList.add('active');
    }, 0);

    const outsideClick = (e) => {
        if (!panel.contains(e.target) && !triggerBtn.contains(e.target)) {
            panel.classList.remove('active');
            triggerBtn.classList.remove('active');
            document.removeEventListener('click', outsideClick);
        }
    };
    setTimeout(() => document.addEventListener('click', outsideClick), 50);
}

function closeAllTodoPopups() {
    document.querySelectorAll('.todo-popup').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.todo-panel-btn').forEach(b => b.classList.remove('active'));
}

function positionTodoPanel(panel, trigger) {
    const tRect = trigger.getBoundingClientRect();
    const pW = 380, pH = 280, pad = 12;
    let top = tRect.bottom + pad <= window.innerHeight - pH ? tRect.bottom + pad : tRect.top - pH - pad;
    top = Math.max(pad, Math.min(top, window.innerHeight - pH - pad));
    let left = tRect.left + (tRect.width / 2) - (pW / 2);
    left = Math.max(pad, Math.min(left, window.innerWidth - pW - pad));

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
}

function makeTodoBtn(list, placement) {
    const btn = document.createElement('button');
    const isVertical = placement === 'vertical';
    btn.className = isVertical
        ? 'floating-action-btn todo-panel-btn'
        : 'glass-btn todo-panel-btn';
    btn.setAttribute('aria-label', list.name);
    btn.setAttribute('title', list.name);
    const sz = isVertical ? '20' : '18';
    btn.innerHTML = todoSVGIcon(sz);
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTodoPopup(list, btn);
    });
    return btn;
}

export function todoSVGIcon(sz = 20) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </svg>`;
}

// ─── Lifecycle & Setup ─────────────────────────────────────────────────────────

function cleanupAll() {
    dashboardCards.forEach(({ cardEl }) => cardEl.remove());
    dashboardCards.clear();

    openWindows.forEach((inst, listId) => {
        const container = inst.bodyEl.querySelector('.todo-window-body');
        if (container) unregisterContainer(listId, container);
        appRegistry.unregisterApp(`todo_${listId}`);
        inst.destroy();
    });
    openWindows.clear();

    openPopups.forEach(({ panel, container }, listId) => {
        unregisterContainer(listId, container);
        panel.remove();
    });
    openPopups.clear();

    document.querySelectorAll('.todo-panel-btn').forEach(b => b.remove());
    registeredContainers.clear();
}

export function loadActiveTodos() {
    cleanupAll();

    const data = loadTodosData();
    const active = data.lists.filter(l => l.enabled !== false);

    const fabCustom = document.getElementById('fab-custom-items');
    const headerCustom = document.getElementById('header-custom-items');

    active.forEach(list => {
        const placement = list.placement || 'dashboard';
        if (placement === 'dashboard') {
            mountDashboardCard(list);
        } else if (placement === 'app') {
            // Rendered dynamically in Apps Grid
        } else if (placement === 'vertical') {
            if (fabCustom) fabCustom.appendChild(makeTodoBtn(list, 'vertical'));
        } else if (placement === 'horizontal') {
            if (headerCustom) headerCustom.appendChild(makeTodoBtn(list, 'horizontal'));
        }
    });

    applyDashboardOrder();
    window.dispatchEvent(new CustomEvent('layout-targets-changed'));
}

export function initTodo() {
    loadActiveTodos();

    window.addEventListener('todos-reloaded', loadActiveTodos);
    window.addEventListener('storage', (e) => {
        if (e.key === TODOS_KEY) loadActiveTodos();
    });

    onSettingsChanged(() => loadActiveTodos());

    window.addEventListener('launch-todo-app', (e) => {
        const listId = e.detail?.id;
        if (!listId) return;
        const list = getTodoListById(listId);
        if (list) launchTodoWindow(list);
    });
}
