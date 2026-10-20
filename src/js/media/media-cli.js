import { executeMediaAction, refreshAudibleTabs, getMediaControllerState } from './media-controller.js';

export async function handleMediaCLI(rawTokens = []) {
    if (!rawTokens || rawTokens.length === 0) {
        return showMediaStatusCLI();
    }

    const cmd = rawTokens[0].toLowerCase();

    if (cmd === '-h' || cmd === '--help' || cmd === 'help') {
        return {
            output: `Media Controller CLI Commands:
  media                      Show active media status & playing tabs
  media play | pause         Toggle playback on active media tab
  media next                 Skip forward (+10s or next track)
  media prev                 Skip backward (-10s or prev track)
  media mute                 Toggle audio mute on active media tab
  media open                 Open Media Controller window
  media focus [tabId]        Focus browser tab playing media`
        };
    }

    const targetTabId = rawTokens[1] && !isNaN(parseInt(rawTokens[1], 10)) ? parseInt(rawTokens[1], 10) : null;

    if (cmd === 'play' || cmd === 'pause' || cmd === 'playpause' || cmd === 'toggle') {
        const res = await executeMediaAction('play-pause', targetTabId);
        return {
            output: res?.success ? 'Playback toggled.' : `Failed: ${res?.reason || res?.error || 'No active media tab found.'}`,
            isError: !res?.success
        };
    }

    if (cmd === 'next' || cmd === 'skip') {
        const res = await executeMediaAction('next', targetTabId);
        return {
            output: res?.success ? 'Skipped forward / next track.' : `Failed: ${res?.reason || res?.error || 'No active media tab found.'}`,
            isError: !res?.success
        };
    }

    if (cmd === 'prev' || cmd === 'back') {
        const res = await executeMediaAction('prev', targetTabId);
        return {
            output: res?.success ? 'Skipped backward / prev track.' : `Failed: ${res?.reason || res?.error || 'No active media tab found.'}`,
            isError: !res?.success
        };
    }

    if (cmd === 'mute' || cmd === 'unmute') {
        const res = await executeMediaAction('toggle-mute', targetTabId);
        return {
            output: res?.success ? `Mute toggled (${res.muted ? 'Muted' : 'Unmuted'}).` : `Failed: ${res?.reason || res?.error || 'No active media tab found.'}`,
            isError: !res?.success
        };
    }

    if (cmd === 'focus') {
        const tabId = targetTabId || (rawTokens[1] ? parseInt(rawTokens[1], 10) : null);
        const res = await executeMediaAction('focus-tab', tabId);
        return {
            output: res?.success ? 'Tab focused.' : `Failed: ${res?.reason || res?.error || 'Could not focus tab.'}`,
            isError: !res?.success
        };
    }

    if (cmd === 'open' || cmd === 'app') {
        window.dispatchEvent(new CustomEvent('launch-media-app'));
        return { output: 'Opened Media Controller window.' };
    }

    return showMediaStatusCLI();
}

async function showMediaStatusCLI() {
    const tabs = await refreshAudibleTabs();
    const state = getMediaControllerState();

    if (!tabs || tabs.length === 0) {
        return {
            output: `No media currently playing in browser tabs.
Type 'media open' to launch the controller window or 'media -h' for help.`
        };
    }

    const lines = [
        `Active Media: ${tabs.length} tab(s) playing sound\n`
    ];

    tabs.forEach((tab, i) => {
        const isCurrent = state.currentTab?.id === tab.id;
        const prefix = isCurrent ? '▶ [Active]' : '  ';
        const muted = tab.mutedInfo?.muted ? ' (Muted)' : '';
        lines.push(`${prefix} Tab ${tab.id}: "${tab.title || 'Untitled'}"${muted}`);
    });

    lines.push('\nUse "media play", "media next", "media prev", "media mute" to control.');
    return { output: lines.join('\n') };
}
