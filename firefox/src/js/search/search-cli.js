import { saveSearch } from './core/search-engine.js';
import { userSettings } from '../settings/index.js';

const ALIAS_PRESETS = {
    'g': { engine: 'google' },
    'yt': { engine: 'youtube' },
    'gh': { engine: 'github' },
    'ddg': { engine: 'duckduckgo' },
    'br': { engine: 'brave' },
    'gpt': { isAi: true, engine: 'chatgpt' },
    'claude': { isAi: true, engine: 'claude' },
    'gemini': { isAi: true, engine: 'gemini' },
    'ai': { isAi: true }
};

export function handleSearchCLI(rawTokens = [], aliasCmd = 'search') {
    if (!rawTokens || rawTokens.length === 0) {
        if (aliasCmd !== 'search' && ALIAS_PRESETS[aliasCmd]) {
            return { output: `Usage: ${aliasCmd} "query" (e.g. ${aliasCmd} "react hooks")`, isError: true };
        }
        return {
            output: "Usage: search \"query\" (type 'search -h' for help)",
            isError: true
        };
    }

    let isNewTab = false;
    let isAi = false;
    let customEngine = null;

    // Apply alias preset defaults if invoked via shortcut alias (g, yt, gh, gpt, etc.)
    if (aliasCmd && ALIAS_PRESETS[aliasCmd]) {
        const preset = ALIAS_PRESETS[aliasCmd];
        if (preset.isAi) isAi = true;
        if (preset.engine) customEngine = preset.engine;
    }

    const queries = [];

    // Parse flags vs query strings
    for (let i = 0; i < rawTokens.length; i++) {
        const token = rawTokens[i];

        if (token === '-h' || token === '--help' || token === 'help') {
            return {
                output: `Search CLI Commands, Aliases & Flags:
  search "query"                      Perform web search in current tab
  g "query"                           Quick Google search (e.g. g "react hooks")
  yt "query"                          Quick YouTube search (e.g. yt "lofi music")
  gh "query"                          Quick GitHub search (e.g. gh "openai")
  ddg "query"                         Quick DuckDuckGo search (e.g. ddg "privacy")
  gpt "query"                         Quick ChatGPT AI query (e.g. gpt "HTTP/3 guide")
  ai "query"                          Quick default AI search (e.g. ai "Explain CAP theorem")
  search -n, --new "query"            Open search in a new tab (_blank)
  search "q1" "q2" "q3"               Perform multiple batch searches
  search -ai, --ai "query"            Perform AI search (default or custom via -e)
  search -e, --engine <name> "query"  Select search/AI engine (google, youtube, github, chatgpt, gemini, claude, duckduckgo, brave, perplexity)`
            };
        } else if (token === '-n' || token === '--new' || token === '-new') {
            isNewTab = true;
        } else if (token === '-ai' || token === '--ai' || token === '-a') {
            isAi = true;
        } else if (token === '-e' || token === '--engine') {
            if (i + 1 < rawTokens.length) {
                customEngine = rawTokens[i + 1].toLowerCase();
                i++;
            }
        } else {
            queries.push(token);
        }
    }

    if (queries.length === 0) {
        return {
            output: `Error: No search query provided. Example: ${aliasCmd} "minimalist design"`,
            isError: true
        };
    }

    const executed = [];

    queries.forEach((q, idx) => {
        saveSearch(q);
        const encoded = encodeURIComponent(q);
        let url = '';

        if (isAi) {
            // Determine AI engine: customEngine if provided via -e or alias, else userSettings.selectedAi
            const aiEngines = userSettings.aiEngines || [
                { id: 'gemini', url: 'https://www.google.com/search?q={query}&udm=50' },
                { id: 'chatgpt', url: 'https://chatgpt.com/?prompt={query}' },
                { id: 'bing', url: 'https://www.bing.com/copilotsearch?q={query}' },
                { id: 'claude', url: 'https://claude.ai/new?q={query}' },
                { id: 'grok', url: 'https://grok.com/?q={query}' },
                { id: 'perplexity', url: 'https://www.perplexity.ai/search?q={query}' }
            ];

            const targetAiId = customEngine || userSettings.selectedAi || 'gemini';
            let foundEngine = aiEngines.find(e => e.id.toLowerCase() === targetAiId || e.name.toLowerCase().includes(targetAiId));

            if (!foundEngine) {
                const knownAiFallbacks = {
                    chatgpt: 'https://chatgpt.com/?prompt={query}',
                    gemini: 'https://www.google.com/search?q={query}&udm=50',
                    google: 'https://www.google.com/search?q={query}&udm=50',
                    claude: 'https://claude.ai/new?q={query}',
                    bing: 'https://www.bing.com/copilotsearch?q={query}',
                    copilot: 'https://www.bing.com/copilotsearch?q={query}',
                    grok: 'https://grok.com/?q={query}',
                    perplexity: 'https://www.perplexity.ai/search?q={query}'
                };
                if (knownAiFallbacks[targetAiId]) {
                    url = knownAiFallbacks[targetAiId].replace('{query}', encoded).replace('{q}', encoded);
                } else {
                    url = `https://www.google.com/search?q=${encoded}&udm=50`;
                }
            } else {
                url = foundEngine.url.replace('{query}', encoded).replace('{q}', encoded);
            }
        } else if (customEngine) {
            // General Web Search Engine map
            const engineUrls = {
                google: `https://www.google.com/search?q=${encoded}`,
                bing: `https://www.bing.com/search?q=${encoded}`,
                duckduckgo: `https://duckduckgo.com/?q=${encoded}`,
                brave: `https://search.brave.com/search?q=${encoded}`,
                github: `https://github.com/search?q=${encoded}`,
                youtube: `https://www.youtube.com/results?search_query=${encoded}`,
                kagi: `https://kagi.com/search?q=${encoded}`,
                chatgpt: `https://chatgpt.com/?prompt=${encoded}`,
                gemini: `https://www.google.com/search?q=${encoded}&udm=50`,
                claude: `https://claude.ai/new?q=${encoded}`,
                perplexity: `https://www.perplexity.ai/search?q=${encoded}`
            };
            url = engineUrls[customEngine] || `https://www.google.com/search?q=${encoded}`;
        } else {
            url = `https://www.google.com/search?q=${encoded}`;
        }

        // Single query defaults to current tab unless -n is passed. Multiple queries open in _blank
        const targetTab = (isNewTab || queries.length > 1 || idx > 0) ? '_blank' : '_self';
        
        if (targetTab === '_self') {
            window.location.href = url;
        } else {
            window.open(url, '_blank');
        }

        executed.push(`"${q}" -> ${url}`);
    });

    return {
        output: `Executed search (${executed.length}):\n  ${executed.join('\n  ')}`
    };
}
