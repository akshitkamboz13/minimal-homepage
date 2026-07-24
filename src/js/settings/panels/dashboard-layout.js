import { userSettings, saveSettings } from '../settings-state.js';
import { applyLayoutSettings } from '../../ui/panels/top-panel.js';

let draggedElement = null;

export function applyDashboardOrder() {
    const container = document.getElementById('dashboard-widgets-container');
    if (!container) return;
    
    const order = userSettings.dashboardOrder || [];
    if (order.length === 0) return;
    
    const children = Array.from(container.children);
    children.sort((a, b) => {
        const indexA = order.indexOf(a.id);
        const indexB = order.indexOf(b.id);
        
        const posA = indexA === -1 ? 9999 : indexA;
        const posB = indexB === -1 ? 9999 : indexB;
        
        return posA - posB;
    });
    
    children.forEach(child => container.appendChild(child));
}

export function renderWidgetsOrderList() {
    const listContainer = document.getElementById('dashboard-widgets-order-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    // 1. Get active dashboard items
    const items = [
        { id: 'bookmarks-container', name: 'Bookmarks Bar' }
    ];
    
    let customWidgetsList = [];
    try {
        customWidgetsList = JSON.parse(localStorage.getItem('startpage_custom_widgets')) || [];
    } catch (e) {}
    
    const activeCustomWidgets = customWidgetsList.filter(w => w.enabled !== false && w.type === 'widget');
    activeCustomWidgets.forEach(w => {
        items.push({
            id: `layout_widget_${w.id}`,
            name: w.name || 'Custom Widget'
        });
    });
    
    // 2. Sort items by userSettings.dashboardOrder
    const order = userSettings.dashboardOrder || [];
    items.sort((a, b) => {
        const indexA = order.indexOf(a.id);
        const indexB = order.indexOf(b.id);
        
        const posA = indexA === -1 ? 9999 : indexA;
        const posB = indexB === -1 ? 9999 : indexB;
        
        return posA - posB;
    });
    
    // Sync current list sequence
    userSettings.dashboardOrder = items.map(item => item.id);
    saveSettings();
    applyDashboardOrder();
    
    // 3. Render rows
    items.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'settings-order-item';
        row.setAttribute('draggable', 'true');
        row.setAttribute('data-id', item.id);
        
        row.innerHTML = `
            <svg class="drag-handle-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="9" y1="5" x2="9" y2="19"></line>
                <line x1="15" y1="5" x2="15" y2="19"></line>
            </svg>
            <span style="font-weight: 500; font-size: 0.9rem; color: var(--text-color);">${item.name}</span>
        `;
        
        // Drag events
        row.addEventListener('dragstart', (e) => {
            draggedElement = row;
            row.classList.add('is-dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const target = e.target.closest('.settings-order-item');
            if (target && target !== draggedElement) {
                const rect = target.getBoundingClientRect();
                const next = (e.clientY - rect.top) > (rect.height / 2);
                listContainer.insertBefore(draggedElement, next ? target.nextSibling : target);
            }
        });
        
        row.addEventListener('dragend', () => {
            row.classList.remove('is-dragging');
            draggedElement = null;
            
            // Re-map children IDs in DOM after drag completes
            const newOrder = Array.from(listContainer.children).map(child => child.getAttribute('data-id')).filter(Boolean);
            userSettings.dashboardOrder = newOrder;
            saveSettings();
            applyDashboardOrder();
        });
        
        listContainer.appendChild(row);
    });
}

export function initDashboardLayout(modal) {
    const toggleDashboardWidgets = document.getElementById('toggle-dashboard-widgets');
    if (toggleDashboardWidgets) {
        toggleDashboardWidgets.checked = userSettings.showDashboardWidgets !== false;
        toggleDashboardWidgets.addEventListener('change', (e) => {
            userSettings.showDashboardWidgets = e.target.checked;
            saveSettings();
            applyLayoutSettings();
        });
    }

    renderWidgetsOrderList();
    
    window.addEventListener('widgets-reloaded', () => {
        renderWidgetsOrderList();
    });
}
