import { userSettings, saveSettings, onSettingsChanged } from '../settings/index.js';
import { createGlassWindow } from '../ui/window-generator.js';
import { createGlassCard } from '../ui/card-generator.js';
import { appRegistry } from '../ui/app-registry.js';
import { applyDashboardOrder } from '../settings/panels/dashboard-layout.js';

// ─── Storage helpers ───────────────────────────────────────────────────────────

const TRACKERS_KEY = 'startpage_trackers';
const LOG_KEY      = 'startpage_tracker_log';

function loadTrackers() {
    try { return JSON.parse(localStorage.getItem(TRACKERS_KEY)) || []; } catch { return []; }
}

function loadLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY)) || {}; } catch { return {}; }
}

function saveTrackers(list) {
    localStorage.setItem(TRACKERS_KEY, JSON.stringify(list));
}

function saveLog(log) {
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// State for an entry for a tracker: 'done' | 'missed' | null
function getDayState(trackerId, key) {
    const log = loadLog();
    return (log[trackerId] && log[trackerId][key]) || null;
}

function setDayState(trackerId, key, state) {
    const log = loadLog();
    if (!log[trackerId]) log[trackerId] = {};
    if (state === null) {
        delete log[trackerId][key];
    } else {
        log[trackerId][key] = state;
    }
    saveLog(log);
}

// ─── In-memory View Navigation Offsets ─────────────────────────────────────────

const navOffsets = new Map(); // trackerId → { dayOffset: 0, weekOffset: 0, monthOffset: 0, yearOffset: 0 }

function getOffsets(trackerId) {
    if (!navOffsets.has(trackerId)) {
        navOffsets.set(trackerId, { dayOffset: 0, weekOffset: 0, monthOffset: 0, yearOffset: 0 });
    }
    return navOffsets.get(trackerId);
}

// ─── Visual Grid Builders ──────────────────────────────────────────────────────

export function buildHabitWidget(tracker) {
    const now = new Date();
    const currentView = tracker.view || 'month'; // 'today' | 'week' | 'month' | 'year'
    const isNegative = tracker.kind === 'negative';

    const wrapper = document.createElement('div');
    wrapper.className = `tracker-widget tracker-view-${currentView}`;
    wrapper.dataset.id = tracker.id;

    // ── Header: Title & View Switcher ──
    const header = document.createElement('div');
    header.className = 'tracker-header';

    const titleRow = document.createElement('div');
    titleRow.className = 'tracker-title-row';

    const nameCol = document.createElement('div');
    nameCol.className = 'tracker-name-col';

    const nameEl = document.createElement('span');
    nameEl.className = 'tracker-name';
    nameEl.textContent = tracker.name;

    const streakVal = computeOverallStreak(tracker.id, now);
    const streakBadge = document.createElement('span');
    streakBadge.className = 'tracker-streak-pill';
    streakBadge.title = 'Current Consecutive Streak';
    streakBadge.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 2c-.5 2.5-2.5 4.5-4 6-2 2-3 4-3 6a7 7 0 0 0 14 0c0-2.5-1.5-5-3-7-.5 2-1.5 3-3 3 0-3-1-5.5-1-8z"/></svg> ${streakVal}d`;

    nameCol.appendChild(nameEl);
    nameCol.appendChild(streakBadge);
    titleRow.appendChild(nameCol);

    // Segmented View Toggle: Today | Week | Month | Year
    const viewToggle = document.createElement('div');
    viewToggle.className = 'tracker-view-toggle';

    const views = [
        { id: 'today', label: 'Today' },
        { id: 'week',  label: 'Week' },
        { id: 'month', label: 'Month' },
        { id: 'year',  label: 'Year' }
    ];

    views.forEach(v => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `tracker-toggle-btn${currentView === v.id ? ' active' : ''}`;
        btn.textContent = v.label;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateTracker(tracker.id, { view: v.id });
        });
        viewToggle.appendChild(btn);
    });

    titleRow.appendChild(viewToggle);
    header.appendChild(titleRow);
    wrapper.appendChild(header);

    // ── Body Rendering based on view ──
    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'tracker-body';

    if (currentView === 'today') {
        bodyContainer.appendChild(renderTodayView(tracker, now, isNegative));
    } else if (currentView === 'week') {
        bodyContainer.appendChild(renderWeekView(tracker, now, isNegative));
    } else if (currentView === 'year') {
        bodyContainer.appendChild(renderYearView(tracker, now, isNegative));
    } else {
        bodyContainer.appendChild(renderMonthView(tracker, now, isNegative));
    }

    wrapper.appendChild(bodyContainer);
    return wrapper;
}

// ─── 1. TODAY VIEW ─────────────────────────────────────────────────────────────

function renderTodayView(tracker, now, isNegative) {
    const container = document.createElement('div');
    container.className = 'tracker-view-container tracker-today-container';

    const offsets = getOffsets(tracker.id);
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + offsets.dayOffset);

    const isActualToday = offsets.dayOffset === 0;
    const isFuture = targetDate > now && !isActualToday;

    const selKey = dateKey(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const selState = getDayState(tracker.id, selKey);

    const doneLabel   = isNegative ? 'Protect' : 'Done';
    const missedLabel = 'Missed';

    // Day navigation subheader
    const subheader = document.createElement('div');
    subheader.className = 'tracker-nav-subheader';

    const navWrap = document.createElement('div');
    navWrap.className = 'tracker-nav-wrap';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'tracker-nav-btn';
    prevBtn.title = 'Previous day';
    prevBtn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>`;
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        offsets.dayOffset--;
        refreshAllInstances(tracker.id);
    });

    const dayText = isActualToday
        ? 'Today'
        : offsets.dayOffset === -1
        ? 'Yesterday'
        : offsets.dayOffset === 1
        ? 'Tomorrow'
        : targetDate.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });

    const dayLabel = document.createElement('span');
    dayLabel.className = `tracker-nav-label${!isActualToday ? ' has-offset' : ''}`;
    dayLabel.textContent = `${dayText} (${targetDate.toLocaleDateString('default', { month: 'short', day: 'numeric' })})`;
    if (!isActualToday) {
        dayLabel.title = 'Click to return to today';
        dayLabel.addEventListener('click', (e) => {
            e.stopPropagation();
            offsets.dayOffset = 0;
            refreshAllInstances(tracker.id);
        });
    }

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'tracker-nav-btn';
    nextBtn.title = 'Next day';
    nextBtn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`;
    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        offsets.dayOffset++;
        refreshAllInstances(tracker.id);
    });

    navWrap.appendChild(prevBtn);
    navWrap.appendChild(dayLabel);
    navWrap.appendChild(nextBtn);
    subheader.appendChild(navWrap);
    container.appendChild(subheader);

    // Big Action Buttons for selected day
    const actionRow = document.createElement('div');
    actionRow.className = 'tracker-today-action-row';

    const btnDone = document.createElement('button');
    btnDone.type = 'button';
    btnDone.disabled = isFuture;
    btnDone.className = `tracker-big-btn tracker-btn-done${selState === 'done' ? ' active' : ''}`;
    btnDone.innerHTML = `
        <div class="tracker-big-btn-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <span class="tracker-big-btn-label">${doneLabel}</span>
    `;

    const btnMissed = document.createElement('button');
    btnMissed.type = 'button';
    btnMissed.disabled = isFuture;
    btnMissed.className = `tracker-big-btn tracker-btn-missed${selState === 'missed' ? ' active' : ''}`;
    btnMissed.innerHTML = `
        <div class="tracker-big-btn-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <span class="tracker-big-btn-label">${missedLabel}</span>
    `;

    const handleAction = (action) => {
        const cur = getDayState(tracker.id, selKey);
        setDayState(tracker.id, selKey, cur === action ? null : action);
        refreshAllInstances(tracker.id);
    };

    btnDone.addEventListener('click', () => handleAction('done'));
    btnMissed.addEventListener('click', () => handleAction('missed'));

    actionRow.appendChild(btnDone);
    actionRow.appendChild(btnMissed);
    container.appendChild(actionRow);

    // Recent 7 Days Mini Trend Strip
    const trendRow = document.createElement('div');
    trendRow.className = 'tracker-recent-strip';

    for (let i = 6; i >= 0; i--) {
        const d = new Date(targetDate);
        d.setDate(targetDate.getDate() - i);
        const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
        const state = getDayState(tracker.id, k);
        const dayLetter = ['S','M','T','W','T','F','S'][d.getDay()];

        const pill = document.createElement('div');
        pill.className = `tracker-mini-pill ${state ? 'state-' + state : ''} ${i === 0 ? 'is-today' : ''}`;
        pill.title = `${d.toDateString()}: ${state || 'unrecorded'}`;
        pill.innerHTML = `<span class="pill-day">${dayLetter}</span><span class="pill-dot"></span>`;

        pill.addEventListener('click', () => {
            const cur = getDayState(tracker.id, k);
            let next = cur === null ? 'done' : cur === 'done' ? 'missed' : null;
            setDayState(tracker.id, k, next);
            refreshAllInstances(tracker.id);
        });
        trendRow.appendChild(pill);
    }
    container.appendChild(trendRow);

    return container;
}

// ─── 2. WEEK VIEW ──────────────────────────────────────────────────────────────

function renderWeekView(tracker, now, isNegative) {
    const container = document.createElement('div');
    container.className = 'tracker-view-container tracker-week-container';

    const offsets = getOffsets(tracker.id);
    const isCurrentWeek = offsets.weekOffset === 0;

    // Week range: Monday to Sunday based on offset
    const currentDow = (now.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDow + (offsets.weekOffset * 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    // Subheader with week navigation (< Oct 19 - 25 >)
    const subheader = document.createElement('div');
    subheader.className = 'tracker-week-subheader';

    const navWrap = document.createElement('div');
    navWrap.className = 'tracker-nav-wrap';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'tracker-nav-btn';
    prevBtn.title = 'Previous week';
    prevBtn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>`;
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        offsets.weekOffset--;
        refreshAllInstances(tracker.id);
    });

    const mMonth = monday.toLocaleString('default', { month: 'short' });
    const sMonth = sunday.toLocaleString('default', { month: 'short' });
    const rangeText = mMonth === sMonth
        ? `${mMonth} ${monday.getDate()}–${sunday.getDate()}, ${monday.getFullYear()}`
        : `${mMonth} ${monday.getDate()} – ${sMonth} ${sunday.getDate()}`;

    const weekLabel = document.createElement('span');
    weekLabel.className = `tracker-nav-label${!isCurrentWeek ? ' has-offset' : ''}`;
    weekLabel.textContent = rangeText;
    if (!isCurrentWeek) {
        weekLabel.title = 'Click to return to current week';
        weekLabel.addEventListener('click', (e) => {
            e.stopPropagation();
            offsets.weekOffset = 0;
            refreshAllInstances(tracker.id);
        });
    }

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'tracker-nav-btn';
    nextBtn.title = 'Next week';
    nextBtn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`;
    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        offsets.weekOffset++;
        refreshAllInstances(tracker.id);
    });

    navWrap.appendChild(prevBtn);
    navWrap.appendChild(weekLabel);
    navWrap.appendChild(nextBtn);
    subheader.appendChild(navWrap);

    // Week stats counter
    let weekDone = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
        if (getDayState(tracker.id, k) === 'done') weekDone++;
    }
    const statPill = document.createElement('span');
    statPill.className = 'tracker-week-stats-pill';
    statPill.textContent = `${weekDone}/7 ${isNegative ? 'protected' : 'done'}`;
    subheader.appendChild(statPill);
    container.appendChild(subheader);

    // 7 Columns
    const daysRow = document.createElement('div');
    daysRow.className = 'tracker-week-row';

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);

        const y = dayDate.getFullYear();
        const m = dayDate.getMonth();
        const d = dayDate.getDate();
        const k = dateKey(y, m, d);
        const state = getDayState(tracker.id, k);
        const isToday = dayDate.toDateString() === now.toDateString();
        const isFuture = dayDate > now && !isToday;

        const dayCol = document.createElement('div');
        dayCol.className = `tracker-week-col${isToday ? ' is-today' : ''}${isFuture ? ' is-future' : ''}${state ? ' is-' + state : ''}`;
        dayCol.title = `${dayLabels[i]} ${dayDate.toLocaleDateString()}: ${state || 'unmarked'}`;

        dayCol.innerHTML = `
            <span class="week-col-name">${dayLabels[i]}</span>
            <span class="week-col-num">${d}</span>
            <div class="week-col-indicator">
                ${state === 'done' ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' :
                  state === 'missed' ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' : ''}
            </div>
        `;

        if (!isFuture) {
            dayCol.addEventListener('click', () => {
                const cur = getDayState(tracker.id, k);
                let next = cur === null ? 'done' : cur === 'done' ? 'missed' : null;
                setDayState(tracker.id, k, next);
                refreshAllInstances(tracker.id);
            });
        }

        daysRow.appendChild(dayCol);
    }

    container.appendChild(daysRow);

    // Quick Action Bar for Today below the week
    const todKey = todayKey();
    const todState = getDayState(tracker.id, todKey);
    const doneLabel = isNegative ? 'Protect Today' : 'Done Today';

    const quickBar = document.createElement('div');
    quickBar.className = 'tracker-week-quickbar';

    const btnDone = document.createElement('button');
    btnDone.type = 'button';
    btnDone.className = `tracker-btn tracker-btn-done compact${todState === 'done' ? ' active' : ''}`;
    btnDone.textContent = doneLabel;
    btnDone.addEventListener('click', () => {
        const cur = getDayState(tracker.id, todKey);
        setDayState(tracker.id, todKey, cur === 'done' ? null : 'done');
        refreshAllInstances(tracker.id);
    });

    const btnMissed = document.createElement('button');
    btnMissed.type = 'button';
    btnMissed.className = `tracker-btn tracker-btn-missed compact${todState === 'missed' ? ' active' : ''}`;
    btnMissed.textContent = 'Missed';
    btnMissed.addEventListener('click', () => {
        const cur = getDayState(tracker.id, todKey);
        setDayState(tracker.id, todKey, cur === 'missed' ? null : 'missed');
        refreshAllInstances(tracker.id);
    });

    quickBar.appendChild(btnDone);
    quickBar.appendChild(btnMissed);
    container.appendChild(quickBar);

    return container;
}

// ─── 3. MONTH VIEW ─────────────────────────────────────────────────────────────

function renderMonthView(tracker, now, isNegative) {
    const container = document.createElement('div');
    container.className = 'tracker-view-container tracker-month-container';

    const offsets = getOffsets(tracker.id);
    const targetDate = new Date(now.getFullYear(), now.getMonth() + offsets.monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const isCurrentMonth = offsets.monthOffset === 0;
    const today = isCurrentMonth ? now.getDate() : -1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDowRaw = new Date(year, month, 1).getDay(); // 0=Sun
    const firstDow = (firstDowRaw + 6) % 7; // Monday = 0

    // Top Sub-header: Month nav & Today quick actions
    const subheader = document.createElement('div');
    subheader.className = 'tracker-month-subheader';

    const navWrap = document.createElement('div');
    navWrap.className = 'tracker-nav-wrap';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'tracker-nav-btn';
    prevBtn.title = 'Previous month';
    prevBtn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>`;
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        offsets.monthOffset--;
        refreshAllInstances(tracker.id);
    });

    const monthLabel = document.createElement('span');
    monthLabel.className = `tracker-nav-label${!isCurrentMonth ? ' has-offset' : ''}`;
    monthLabel.textContent = `${targetDate.toLocaleString('default', { month: 'short' })} ${year}`;
    if (!isCurrentMonth) {
        monthLabel.title = 'Click to return to current month';
        monthLabel.addEventListener('click', (e) => {
            e.stopPropagation();
            offsets.monthOffset = 0;
            refreshAllInstances(tracker.id);
        });
    }

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'tracker-nav-btn';
    nextBtn.title = 'Next month';
    nextBtn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`;
    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        offsets.monthOffset++;
        refreshAllInstances(tracker.id);
    });

    navWrap.appendChild(prevBtn);
    navWrap.appendChild(monthLabel);
    navWrap.appendChild(nextBtn);
    subheader.appendChild(navWrap);

    // Quick Today status buttons
    const todKey = todayKey();
    const todState = getDayState(tracker.id, todKey);
    const doneLabel = isNegative ? 'Protect' : 'Done';

    const miniActions = document.createElement('div');
    miniActions.className = 'tracker-mini-actions';

    const btnDone = document.createElement('button');
    btnDone.type = 'button';
    btnDone.className = `tracker-btn-mini btn-done${todState === 'done' ? ' active' : ''}`;
    btnDone.textContent = doneLabel;
    btnDone.addEventListener('click', () => {
        const cur = getDayState(tracker.id, todKey);
        setDayState(tracker.id, todKey, cur === 'done' ? null : 'done');
        refreshAllInstances(tracker.id);
    });

    const btnMissed = document.createElement('button');
    btnMissed.type = 'button';
    btnMissed.className = `tracker-btn-mini btn-missed${todState === 'missed' ? ' active' : ''}`;
    btnMissed.textContent = 'Missed';
    btnMissed.addEventListener('click', () => {
        const cur = getDayState(tracker.id, todKey);
        setDayState(tracker.id, todKey, cur === 'missed' ? null : 'missed');
        refreshAllInstances(tracker.id);
    });

    miniActions.appendChild(btnDone);
    miniActions.appendChild(btnMissed);
    subheader.appendChild(miniActions);
    container.appendChild(subheader);

    // Day of week labels (M T W T F S S)
    const dowRow = document.createElement('div');
    dowRow.className = 'tracker-dow-row';
    ['M','T','W','T','F','S','S'].forEach(d => {
        const el = document.createElement('span');
        el.className = 'tracker-dow-label';
        el.textContent = d;
        dowRow.appendChild(el);
    });
    container.appendChild(dowRow);

    // Month Grid
    const grid = document.createElement('div');
    grid.className = 'tracker-grid';

    for (let i = 0; i < firstDow; i++) {
        const blank = document.createElement('div');
        blank.className = 'tracker-cell tracker-cell-empty';
        grid.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const key = dateKey(year, month, d);
        const state = getDayState(tracker.id, key);
        const cellDate = new Date(year, month, d);
        const isTod = isCurrentMonth && d === today;
        const isFut = cellDate > now;

        const cell = document.createElement('div');
        cell.className = 'tracker-cell';
        if (isTod) cell.classList.add('tracker-cell-today');
        if (isFut) cell.classList.add('tracker-cell-future');
        if (state === 'done') cell.classList.add('tracker-cell-done');
        if (state === 'missed') cell.classList.add('tracker-cell-missed');

        cell.title = `${targetDate.toLocaleString('default', { month: 'short' })} ${d}: ${state || 'unmarked'}`;
        cell.textContent = d;

        if (!isFut) {
            cell.addEventListener('click', () => {
                const cur = getDayState(tracker.id, key);
                let next = cur === null ? 'done' : cur === 'done' ? 'missed' : null;
                setDayState(tracker.id, key, next);
                refreshAllInstances(tracker.id);
            });
        }

        grid.appendChild(cell);
    }

    container.appendChild(grid);
    return container;
}

// ─── 4. YEAR VIEW ──────────────────────────────────────────────────────────────

function renderYearView(tracker, now, isNegative) {
    const container = document.createElement('div');
    container.className = 'tracker-view-container tracker-year-container';

    const offsets = getOffsets(tracker.id);
    const targetYear = now.getFullYear() + offsets.yearOffset;
    const isCurrentYear = offsets.yearOffset === 0;

    // Year Overview Header with navigation (< 2026 >)
    const subheader = document.createElement('div');
    subheader.className = 'tracker-year-subheader';

    const navWrap = document.createElement('div');
    navWrap.className = 'tracker-nav-wrap';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'tracker-nav-btn';
    prevBtn.title = 'Previous year';
    prevBtn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>`;
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        offsets.yearOffset--;
        refreshAllInstances(tracker.id);
    });

    const yearLabel = document.createElement('span');
    yearLabel.className = `tracker-nav-label${!isCurrentYear ? ' has-offset' : ''}`;
    yearLabel.textContent = `${targetYear}`;
    if (!isCurrentYear) {
        yearLabel.title = 'Click to return to current year';
        yearLabel.addEventListener('click', (e) => {
            e.stopPropagation();
            offsets.yearOffset = 0;
            refreshAllInstances(tracker.id);
        });
    }

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'tracker-nav-btn';
    nextBtn.title = 'Next year';
    nextBtn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`;
    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        offsets.yearOffset++;
        refreshAllInstances(tracker.id);
    });

    navWrap.appendChild(prevBtn);
    navWrap.appendChild(yearLabel);
    navWrap.appendChild(nextBtn);
    subheader.appendChild(navWrap);

    const yearStats = computeYearStats(tracker.id, targetYear, now);
    const statsPill = document.createElement('span');
    statsPill.className = 'tracker-year-stats-pill';
    statsPill.textContent = `${yearStats.done} ${isNegative ? 'protected' : 'completed'} / ${yearStats.totalDays}d`;
    subheader.appendChild(statsPill);
    container.appendChild(subheader);

    // 12 Months Heatmap Mini Blocks (3 rows of 4 months)
    const monthsGrid = document.createElement('div');
    monthsGrid.className = 'tracker-year-months-grid';

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    for (let m = 0; m < 12; m++) {
        const isCurrentMonth = isCurrentYear && m === now.getMonth();
        const monthCard = document.createElement('div');
        monthCard.className = `tracker-year-month-card${isCurrentMonth ? ' is-current-month' : ''}`;

        const mTitle = document.createElement('div');
        mTitle.className = 'year-month-title';
        mTitle.textContent = monthNames[m];
        monthCard.appendChild(mTitle);

        // Dot cluster for this month
        const dotsWrap = document.createElement('div');
        dotsWrap.className = 'year-month-dots';

        const daysCount = new Date(targetYear, m + 1, 0).getDate();
        let mDone = 0;
        let mPassed = 0;

        for (let d = 1; d <= daysCount; d++) {
            const k = dateKey(targetYear, m, d);
            const st = getDayState(tracker.id, k);
            const thisDate = new Date(targetYear, m, d);
            const isPassed = thisDate <= now;

            if (isPassed) mPassed++;
            if (st === 'done') mDone++;

            const dot = document.createElement('span');
            dot.className = `year-dot${st ? ' is-' + st : ''}${thisDate.toDateString() === now.toDateString() ? ' is-today' : ''}`;
            dot.title = `${monthNames[m]} ${d}, ${targetYear}: ${st || 'unmarked'}`;

            if (isPassed) {
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const cur = getDayState(tracker.id, k);
                    let next = cur === null ? 'done' : cur === 'done' ? 'missed' : null;
                    setDayState(tracker.id, k, next);
                    refreshAllInstances(tracker.id);
                });
            }

            dotsWrap.appendChild(dot);
        }

        monthCard.appendChild(dotsWrap);

        // Progress bar for the month
        const pct = mPassed > 0 ? Math.round((mDone / mPassed) * 100) : 0;
        const bar = document.createElement('div');
        bar.className = 'year-month-bar';
        bar.innerHTML = `<div class="year-month-progress" style="width:${pct}%;"></div>`;
        monthCard.appendChild(bar);

        monthsGrid.appendChild(monthCard);
    }

    container.appendChild(monthsGrid);
    return container;
}

// ─── Stats & Streak Calculation Helpers ────────────────────────────────────────

function computeOverallStreak(trackerId, now) {
    let streak = 0;
    const checkDate = new Date(now);

    // If today is not marked done yet, check starting yesterday or today
    const todKey = todayKey();
    if (getDayState(trackerId, todKey) === 'done') {
        streak++;
    }

    // Check backwards from yesterday
    checkDate.setDate(checkDate.getDate() - 1);
    while (true) {
        const k = dateKey(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
        if (getDayState(trackerId, k) === 'done') {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

function computeYearStats(trackerId, year, now) {
    const log = loadLog();
    const entries = log[trackerId] || {};
    let done = 0, missed = 0, totalDays = 0;

    const start = new Date(year, 0, 1);
    const end = new Date(Math.min(now.getTime(), new Date(year, 11, 31).getTime()));

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        totalDays++;
        const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
        if (entries[k] === 'done') done++;
        if (entries[k] === 'missed') missed++;
    }

    return { done, missed, totalDays };
}

// ─── Instance Registry ─────────────────────────────────────────────────────────

const instances = new Map(); // trackerId → Set of { containerEl }

function refreshAllInstances(trackerId) {
    if (!instances.has(trackerId)) return;
    for (const inst of instances.get(trackerId)) {
        renderIntoContainer(inst.containerEl, trackerId);
    }
}

function registerInstance(trackerId, containerEl) {
    if (!instances.has(trackerId)) instances.set(trackerId, new Set());
    instances.get(trackerId).add({ containerEl });
}

function unregisterContainer(trackerId, containerEl) {
    if (!instances.has(trackerId)) return;
    const set = instances.get(trackerId);
    for (const inst of set) {
        if (inst.containerEl === containerEl) { set.delete(inst); break; }
    }
}

function renderIntoContainer(containerEl, trackerId) {
    const trackers = loadTrackers();
    const tracker  = trackers.find(t => t.id === trackerId);
    if (!tracker) return;
    containerEl.innerHTML = '';
    containerEl.appendChild(buildHabitWidget(tracker));
}

// ─── Open Window Instances (App placement) ────────────────────────────────────

const openWindows = new Map(); // trackerId → glassWindow instance

function launchTrackerWindow(tracker) {
    if (openWindows.has(tracker.id)) {
        const inst = openWindows.get(tracker.id);
        inst.bringToFront();
        inst.windowEl.classList.remove('is-minimized');
        return;
    }

    const container = document.createElement('div');
    container.className = 'tracker-window-body';

    const inst = createGlassWindow({
        id: `tracker-win-${tracker.id}`,
        title: tracker.name,
        width: 380,
        height: 244,
        minWidth: 320,
        minHeight: 220,
        colorClass: 'color-transparent',
        onClose: () => {
            unregisterContainer(tracker.id, container);
            appRegistry.unregisterApp(`tracker_${tracker.id}`);
            openWindows.delete(tracker.id);
            inst.destroy();
        },
        onMinimize: (isMin) => {
            appRegistry.updateAppState(`tracker_${tracker.id}`, { isMinimized: isMin });
        }
    });

    inst.bodyEl.style.padding = '0';
    inst.bodyEl.style.overflow = 'hidden';
    inst.bodyEl.appendChild(container);
    openWindows.set(tracker.id, inst);

    registerInstance(tracker.id, container);
    renderIntoContainer(container, tracker.id);

    appRegistry.registerApp(`tracker_${tracker.id}`, {
        title: tracker.name,
        icon: trackerSVGIcon(),
        isMinimized: false,
        isHidden: false,
        focus: () => {
            inst.bringToFront();
            inst.windowEl.classList.remove('is-minimized');
        },
        toggleMinimize: () => {
            const isMin = inst.windowEl.classList.toggle('is-minimized');
            appRegistry.updateAppState(`tracker_${tracker.id}`, { isMinimized: isMin });
        },
        close: () => {
            unregisterContainer(tracker.id, container);
            appRegistry.unregisterApp(`tracker_${tracker.id}`);
            openWindows.delete(tracker.id);
            inst.destroy();
        }
    });
}

function trackerSVGIcon() {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="4" x2="9" y2="9"/><line x1="15" y1="4" x2="15" y2="9"/></svg>`;
}

// ─── Popup Panels (Vertical/Horizontal placements) ────────────────────────────

const openPopups = new Map();

function toggleTrackerPopup(tracker, triggerBtn) {
    if (openPopups.has(tracker.id)) {
        const { panel, container } = openPopups.get(tracker.id);
        const wasActive = panel.classList.contains('active');
        closeAllTrackerPopups();
        if (!wasActive) {
            renderIntoContainer(container, tracker.id);
            positionTrackerPanel(panel, triggerBtn);
            panel.classList.add('active');
            triggerBtn.classList.add('active');
        }
        return;
    }

    closeAllTrackerPopups();

    const panel = document.createElement('div');
    panel.id = `tracker-popup-${tracker.id}`;
    panel.className = 'tracker-popup glass-panel';
    panel.style.width  = '380px';
    panel.style.height = '244px';

    const header = document.createElement('div');
    header.className = 'tracker-popup-header';
    const titleEl = document.createElement('h3');
    titleEl.textContent = tracker.name;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tracker-popup-close';
    closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.remove('active');
        triggerBtn.classList.remove('active');
    });
    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const container = document.createElement('div');
    container.className = 'tracker-popup-body';
    panel.appendChild(container);

    document.body.appendChild(panel);
    openPopups.set(tracker.id, { btn: triggerBtn, panel, container });

    registerInstance(tracker.id, container);
    renderIntoContainer(container, tracker.id);

    setTimeout(() => {
        positionTrackerPanel(panel, triggerBtn);
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

function closeAllTrackerPopups() {
    document.querySelectorAll('.tracker-popup').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tracker-panel-btn').forEach(b => b.classList.remove('active'));
}

function positionTrackerPanel(panel, trigger) {
    const tRect  = trigger.getBoundingClientRect();
    const pW = 380, pH = 244, pad = 12;
    let top  = tRect.bottom + pad <= window.innerHeight - pH ? tRect.bottom + pad : tRect.top - pH - pad;
    top = Math.max(pad, Math.min(top, window.innerHeight - pH - pad));

    let left = tRect.left < window.innerWidth / 2 ? tRect.left : tRect.right - pW;
    left = Math.max(pad, Math.min(left, window.innerWidth - pW - pad));

    panel.style.cssText += `position:fixed;top:${top}px;left:${left}px;z-index:12000;`;
}

// ─── Dashboard Card Placement ─────────────────────────────────────────────────

const dashboardCards = new Map();

function mountDashboardCard(tracker) {
    const widgetsContainer = document.getElementById('dashboard-widgets-container') || document.querySelector('main');
    if (!widgetsContainer) return;

    const { cardEl, bodyEl } = createGlassCard({
        id: `tracker-card-${tracker.id}`,
        title: '',
        width: 380,
        className: 'tracker-dashboard-card custom-dashboard-widget'
    });

    bodyEl.style.padding = '0';
    bodyEl.style.overflow = 'hidden';

    const container = document.createElement('div');
    container.className = 'tracker-card-inner';
    bodyEl.appendChild(container);

    widgetsContainer.appendChild(cardEl);
    dashboardCards.set(tracker.id, { cardEl, container });

    registerInstance(tracker.id, container);
    renderIntoContainer(container, tracker.id);
}

// ─── Panel Button Creation ────────────────────────────────────────────────────

function makeTrackerBtn(tracker, placement) {
    const btn = document.createElement('button');
    const isVertical = placement === 'vertical';
    btn.className = isVertical
        ? 'floating-action-btn tracker-panel-btn'
        : 'glass-btn tracker-panel-btn';
    btn.setAttribute('aria-label', tracker.name);
    btn.setAttribute('title', tracker.name);
    const sz = isVertical ? '20' : '18';
    btn.innerHTML = trackerSVGIcon().replace('width="20" height="20"', `width="${sz}" height="${sz}"`);
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTrackerPopup(tracker, btn);
    });
    return btn;
}

// ─── Main Load/Unload ─────────────────────────────────────────────────────────

function cleanupAll() {
    dashboardCards.forEach(({ cardEl }) => cardEl.remove());
    dashboardCards.clear();

    openWindows.forEach((inst, tid) => {
        const container = inst.bodyEl.querySelector('.tracker-window-body');
        if (container) unregisterContainer(tid, container);
        appRegistry.unregisterApp(`tracker_${tid}`);
        inst.destroy();
    });
    openWindows.clear();

    openPopups.forEach(({ panel, container }, tid) => {
        unregisterContainer(tid, container);
        panel.remove();
    });
    openPopups.clear();

    document.querySelectorAll('.tracker-panel-btn').forEach(b => b.remove());
    instances.clear();
}

export function loadActiveTrackers() {
    cleanupAll();

    const trackers = loadTrackers();
    const active   = trackers.filter(t => t.enabled !== false);

    const fabCustom    = document.getElementById('fab-custom-items');
    const headerCustom = document.getElementById('header-custom-items');

    active.forEach(tracker => {
        const placement = tracker.placement || 'dashboard';

        if (placement === 'dashboard') {
            mountDashboardCard(tracker);
        } else if (placement === 'app') {
            // Rendered in Apps Grid
        } else if (placement === 'vertical') {
            if (fabCustom) fabCustom.appendChild(makeTrackerBtn(tracker, 'vertical'));
        } else if (placement === 'horizontal') {
            if (headerCustom) headerCustom.appendChild(makeTrackerBtn(tracker, 'horizontal'));
        }
    });

    applyDashboardOrder();
    window.dispatchEvent(new CustomEvent('layout-targets-changed'));
}

export function initTracker() {
    loadActiveTrackers();

    window.addEventListener('trackers-reloaded', loadActiveTrackers);

    window.addEventListener('storage', (e) => {
        if (e.key === TRACKERS_KEY || e.key === LOG_KEY) loadActiveTrackers();
    });

    let lastShowDashboard = userSettings.showDashboardWidgets;
    onSettingsChanged((settings) => {
        if (settings.showDashboardWidgets !== lastShowDashboard) {
            lastShowDashboard = settings.showDashboardWidgets;
            loadActiveTrackers();
        }
    });

    window.addEventListener('launch-tracker-app', (e) => {
        const tid = e.detail?.id;
        if (!tid) return;
        const tracker = loadTrackers().find(t => t.id === tid);
        if (tracker) launchTrackerWindow(tracker);
    });
}

// ─── Public API for Settings ──────────────────────────────────────────────────

export function getTrackers() { return loadTrackers(); }

export function createTracker({ name, kind, placement, view }) {
    const list = loadTrackers();
    const id = `tracker_${Date.now()}`;
    list.push({
        id,
        name: name || 'My Habit',
        kind: kind || 'positive',
        placement: placement || 'dashboard',
        view: view || 'week',
        enabled: true
    });
    saveTrackers(list);
    loadActiveTrackers();
    return id;
}

export function updateTracker(id, updates) {
    const list = loadTrackers();
    const idx  = list.findIndex(t => t.id === id);
    if (idx === -1) return;
    list[idx] = { ...list[idx], ...updates };
    saveTrackers(list);
    loadActiveTrackers();
}

export function deleteTracker(id) {
    let list = loadTrackers();
    list = list.filter(t => t.id !== id);
    saveTrackers(list);
    const log = loadLog();
    delete log[id];
    saveLog(log);
    loadActiveTrackers();
}
