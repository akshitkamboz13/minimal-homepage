import { initCustomDropdown } from '../custom-dropdown.js';
import { getTrackers, createTracker, updateTracker, deleteTracker } from '../../tracker/tracker.js';

export function initTrackerSettings() {
    const container = document.getElementById('tracker-settings-list');
    if (!container) return;

    renderTrackerList(container);

    const btnCreate = document.getElementById('btn-create-tracker');
    if (btnCreate) {
        btnCreate.addEventListener('click', () => {
            const nameInput = document.getElementById('tracker-new-name');
            const kindSelect = document.getElementById('tracker-new-kind');
            const placementSelect = document.getElementById('tracker-new-placement');
            const viewSelect = document.getElementById('tracker-new-view');

            const name = nameInput?.value.trim();
            if (!name) {
                nameInput?.focus();
                return;
            }
            const kind      = kindSelect?.value || 'positive';
            const placement = placementSelect?.value || 'dashboard';
            const view      = viewSelect?.value || 'week';

            createTracker({ name, kind, placement, view });
            if (nameInput) nameInput.value = '';
            renderTrackerList(container);
        });
    }
}

function renderTrackerList(container) {
    container.innerHTML = '';
    const list = getTrackers();

    if (list.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'tracker-empty-state';
        empty.textContent = 'No habit trackers yet. Create one above to get started.';
        container.appendChild(empty);
        return;
    }

    list.forEach(tracker => {
        container.appendChild(buildTrackerItem(tracker, container));
    });
}

function buildTrackerItem(tracker, listContainer) {
    const item = document.createElement('div');
    item.className = 'tracker-settings-item';
    item.dataset.id = tracker.id;

    // ── Header row: name + kind badge + delete ──
    const headerRow = document.createElement('div');
    headerRow.className = 'tracker-settings-item-header';

    const nameEl = document.createElement('span');
    nameEl.className = 'tracker-settings-item-name';
    nameEl.textContent = tracker.name;

    const kindBadge = document.createElement('span');
    kindBadge.className = 'tracker-settings-item-kind';
    kindBadge.textContent = tracker.kind === 'negative' ? 'Negative (protect)' : 'Positive (habit)';

    const actionsEl = document.createElement('div');
    actionsEl.className = 'tracker-settings-item-actions';

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'switch';
    toggleLabel.title = 'Enable / disable';
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = tracker.enabled !== false;
    toggleInput.addEventListener('change', (e) => {
        updateTracker(tracker.id, { enabled: e.target.checked });
    });
    const toggleSpan = document.createElement('span');
    toggleSpan.className = 'slider round';
    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(toggleSpan);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'action-btn danger';
    delBtn.style.cssText = 'font-size:0.75rem;padding:4px 10px;';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
        if (confirm(`Delete habit tracker "${tracker.name}"? All recorded data will be lost.`)) {
            deleteTracker(tracker.id);
            renderTrackerList(listContainer);
        }
    });

    actionsEl.appendChild(toggleLabel);
    actionsEl.appendChild(delBtn);
    headerRow.appendChild(nameEl);
    headerRow.appendChild(kindBadge);
    headerRow.appendChild(actionsEl);
    item.appendChild(headerRow);

    // ── Name edit row ──
    item.appendChild(makeRow('Name', buildTextInput(tracker.name, (val) => {
        updateTracker(tracker.id, { name: val });
        nameEl.textContent = val;
    })));

    // ── Kind row ──
    item.appendChild(makeRow('Type', buildSelect(
        [['positive', 'Positive (habit tracker)'], ['negative', 'Negative (sobriety / protect)']],
        tracker.kind || 'positive',
        (val) => {
            updateTracker(tracker.id, { kind: val });
            kindBadge.textContent = val === 'negative' ? 'Negative (protect)' : 'Positive (habit)';
        }
    )));

    // ── Default View row ──
    item.appendChild(makeRow('Default View', buildSelect(
        [
            ['today', 'Today (Big focus)'],
            ['week',  'Week (7-day column)'],
            ['month', 'Month (Calendar)'],
            ['year',  'Year (Annual overview)']
        ],
        tracker.view || 'week',
        (val) => updateTracker(tracker.id, { view: val })
    )));

    // ── Placement row ──
    item.appendChild(makeRow('Placement', buildSelect(
        [
            ['dashboard', 'Dashboard card'],
            ['app',       'Window app (dock)'],
            ['vertical',  'Vertical panel button'],
            ['horizontal','Horizontal panel button']
        ],
        tracker.placement || 'dashboard',
        (val) => updateTracker(tracker.id, { placement: val })
    )));

    return item;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRow(labelText, control) {
    const row = document.createElement('div');
    row.className = 'tracker-settings-item-row';
    const lbl = document.createElement('label');
    lbl.textContent = labelText;
    row.appendChild(lbl);
    row.appendChild(control);
    return row;
}

function buildTextInput(value, onChange) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'custom-input';
    input.style.cssText = 'width:200px;';
    input.value = value;
    let debounce;
    input.addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => onChange(e.target.value.trim()), 400);
    });
    return input;
}

function buildSelect(options, current, onChange) {
    const sel = document.createElement('select');
    sel.className = 'custom-select';
    sel.style.cssText = 'width:200px;';
    options.forEach(([val, label]) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label;
        if (val === current) opt.selected = true;
        sel.appendChild(opt);
    });
    sel.addEventListener('change', (e) => onChange(e.target.value));
    return sel;
}
