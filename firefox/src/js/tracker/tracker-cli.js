import { createTracker, deleteTracker } from './tracker.js';

const TRACKERS_KEY = 'startpage_trackers';
const LOG_KEY = 'startpage_tracker_log';

function getTrackers() {
    try { return JSON.parse(localStorage.getItem(TRACKERS_KEY)) || []; } catch { return []; }
}

function getLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY)) || {}; } catch { return {}; }
}

function saveLog(log) {
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function handleTrackerCLI(rawTokens = []) {
    if (!rawTokens || rawTokens.length === 0) {
        return listTrackersCLI();
    }

    const first = rawTokens[0].toLowerCase();

    if (first === '-h' || first === '--help' || first === 'help') {
        return {
            output: `Habit Tracker CLI:
  tracker                          List all habits and today's status
  tracker add "habit name"         Create a new habit tracker
  tracker check <id|name>          Mark habit as completed today
  tracker miss <id|name>           Mark habit as missed today
  tracker uncheck <id|name>        Reset habit status for today
  tracker rm <id|name>             Delete a habit tracker
  tracker -h, --help               Show this help guide`
        };
    }

    if (first === 'list' || first === 'ls') {
        return listTrackersCLI();
    }

    if (first === 'open' || first === 'gui') {
        const target = rawTokens.slice(1).join(' ').trim();
        const trackers = getTrackers();
        let tracker = null;
        if (target) {
            tracker = trackers.find(t => t.id === target || t.name.toLowerCase() === target.toLowerCase());
        }
        if (!tracker && trackers.length > 0) {
            tracker = trackers[0];
        }
        if (tracker) {
            window.dispatchEvent(new CustomEvent('launch-tracker-app', { detail: { id: tracker.id } }));
            return { output: `Opened habit tracker window ['${tracker.name}'].` };
        }
        return { output: "No habit trackers found. Type 'tracker add \"Habit\"' to create one.", isError: true };
    }

    if (first === 'add') {
        const name = rawTokens.slice(1).join(' ').trim();
        if (!name) {
            return { output: 'Usage: tracker add "habit name"', isError: true };
        }
        const id = createTracker({ name, kind: 'positive', placement: 'dashboard', view: 'week' });
        return { output: `Created habit tracker [${id}]: "${name}".` };
    }

    if (first === 'check' || first === 'done' || first === 'complete') {
        const target = rawTokens.slice(1).join(' ').trim();
        return setTrackerStatus(target, 'done');
    }

    if (first === 'miss' || first === 'missed') {
        const target = rawTokens.slice(1).join(' ').trim();
        return setTrackerStatus(target, 'missed');
    }

    if (first === 'uncheck' || first === 'reset' || first === 'clear') {
        const target = rawTokens.slice(1).join(' ').trim();
        return setTrackerStatus(target, null);
    }

    if (first === 'rm' || first === 'delete') {
        const target = rawTokens.slice(1).join(' ').trim();
        if (!target) {
            return { output: 'Usage: tracker rm <id|name>', isError: true };
        }
        const trackers = getTrackers();
        const found = trackers.find(t => t.id === target || t.name.toLowerCase() === target.toLowerCase());
        if (!found) {
            return { output: `Error: Tracker '${target}' not found.`, isError: true };
        }
        deleteTracker(found.id);
        return { output: `Deleted habit tracker [${found.id}]: "${found.name}".` };
    }

    // Default: treating input as habit name to add if not matching
    const name = rawTokens.join(' ').trim();
    const id = createTracker({ name, kind: 'positive', placement: 'dashboard', view: 'week' });
    return { output: `Created habit tracker [${id}]: "${name}".` };
}

function listTrackersCLI() {
    const trackers = getTrackers();
    if (trackers.length === 0) {
        return { output: "No habit trackers yet. Type 'tracker add \"Read 20 mins\"' to start tracking!" };
    }

    const log = getLog();
    const today = todayKey();
    const lines = [`Habit Trackers (${trackers.length} active) [${today}]:\n`];

    trackers.forEach((t) => {
        const tLog = log[t.id] || {};
        const state = tLog[today];
        let statusBadge = '[ ] Pending';
        if (state === 'done') statusBadge = '[✓] Completed';
        else if (state === 'missed') statusBadge = '[-] Missed';

        // Calculate current streak
        let streak = 0;
        let d = new Date();
        while (true) {
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (tLog[k] === 'done') {
                streak++;
                d.setDate(d.getDate() - 1);
            } else if (k === today && !tLog[k]) {
                // Today not yet logged, check yesterday for active streak
                d.setDate(d.getDate() - 1);
            } else {
                break;
            }
        }

        const streakStr = streak > 0 ? ` (${streak} day streak 🔥)` : '';
        lines.push(`  ${statusBadge.padEnd(16)} [${t.id}] "${t.name}"${streakStr}`);
    });

    lines.push('\nUse "tracker check <id>", "tracker miss <id>", or "tracker add <name>" to manage.');
    return { output: lines.join('\n') };
}

function setTrackerStatus(target, state) {
    if (!target) {
        return { output: 'Please specify habit ID or name. Usage: tracker check <id|name>', isError: true };
    }

    const trackers = getTrackers();
    const found = trackers.find(t => t.id === target || t.name.toLowerCase() === target.toLowerCase());
    if (!found) {
        return { output: `Error: Habit '${target}' not found. Type 'tracker' to see all IDs.`, isError: true };
    }

    const log = getLog();
    if (!log[found.id]) log[found.id] = {};
    const today = todayKey();

    if (state === null) {
        delete log[found.id][today];
    } else {
        log[found.id][today] = state;
    }
    saveLog(log);

    // Dispatch update so any background UI is synced
    window.dispatchEvent(new CustomEvent('tracker-log-updated', { detail: { id: found.id, today, state } }));

    const label = state === 'done' ? 'Completed' : (state === 'missed' ? 'Missed' : 'Reset');
    return { output: `Marked "${found.name}" as ${label} for today (${today}).` };
}
