export async function handleBookmarksCLI(rawTokens = []) {
    if (!window.chrome || !chrome.bookmarks) {
        return {
            output: 'Bookmarks API is only available inside browser extension mode.',
            isError: true
        };
    }

    if (!rawTokens || rawTokens.length === 0) {
        return listAllBookmarksCLI();
    }

    const first = rawTokens[0].toLowerCase();

    if (first === '-h' || first === '--help' || first === 'help') {
        return {
            output: `Bookmarks CLI Commands:
  bookmarks                      List bookmark folders and links
  bookmarks search <query>       Search bookmarks by title or URL
  bookmarks open <query|url>     Open bookmark matching query or URL
  bookmarks -h, --help           Show this help guide

Aliases: bm <query>`
        };
    }

    if (first === 'list' || first === 'ls') {
        return listAllBookmarksCLI(rawTokens[1]);
    }

    if (first === 'search' || first === 'find') {
        const query = rawTokens.slice(1).join(' ');
        if (!query) {
            return { output: 'Usage: bookmarks search <query>', isError: true };
        }
        return searchBookmarksCLI(query);
    }

    if (first === 'open') {
        const target = rawTokens.slice(1).join(' ');
        if (!target) {
            return { output: 'Usage: bookmarks open <query|url>', isError: true };
        }
        return openBookmarkCLI(target);
    }

    // Default: treat input as search query
    const query = rawTokens.join(' ');
    return searchBookmarksCLI(query);
}

function getBookmarkTreeAsync() {
    return new Promise((resolve) => {
        if (!window.chrome || !chrome.bookmarks) return resolve([]);
        chrome.bookmarks.getTree((nodes) => {
            resolve(nodes || []);
        });
    });
}

function searchBookmarksAsync(query) {
    return new Promise((resolve) => {
        if (!window.chrome || !chrome.bookmarks) return resolve([]);
        chrome.bookmarks.search(query, (nodes) => {
            resolve(nodes || []);
        });
    });
}

async function listAllBookmarksCLI(folderFilter = '') {
    const tree = await getBookmarkTreeAsync();
    if (!tree || tree.length === 0) {
        return { output: 'No bookmarks found.' };
    }

    const links = [];
    const traverse = (node, path) => {
        const currentPath = path ? `${path} / ${node.title}` : node.title;
        if (node.url) {
            links.push({ title: node.title || node.url, url: node.url, folder: path });
        }
        if (node.children) {
            node.children.forEach(c => traverse(c, currentPath));
        }
    };

    tree.forEach(root => traverse(root, ''));

    if (links.length === 0) {
        return { output: 'No bookmarks found.' };
    }

    let filtered = links;
    if (folderFilter) {
        const fLower = folderFilter.toLowerCase();
        filtered = links.filter(l => l.folder && l.folder.toLowerCase().includes(fLower));
    }

    const lines = [`Bookmarks (${filtered.length} total):\n`];
    filtered.slice(0, 40).forEach((b, i) => {
        lines.push(`  [${i + 1}] ${b.title}`);
        lines.push(`      ${b.url}`);
    });

    if (filtered.length > 40) {
        lines.push(`\n... and ${filtered.length - 40} more bookmarks. Use 'bookmarks search <keyword>' to filter.`);
    }

    return { output: lines.join('\n') };
}

async function searchBookmarksCLI(query) {
    const results = await searchBookmarksAsync(query);
    const valid = (results || []).filter(r => r.url);

    if (valid.length === 0) {
        return { output: `No bookmarks matching '${query}'.` };
    }

    const lines = [`Found ${valid.length} bookmark(s) matching '${query}':\n`];
    valid.slice(0, 25).forEach((b, i) => {
        lines.push(`  [${i + 1}] ${b.title || b.url}`);
        lines.push(`      ${b.url}`);
    });

    if (valid.length > 25) {
        lines.push(`\n... and ${valid.length - 25} more.`);
    }

    lines.push(`\nType 'bookmarks open "${valid[0].title || valid[0].url}"' to launch in browser.`);
    return { output: lines.join('\n') };
}

async function openBookmarkCLI(target) {
    if (target.startsWith('http://') || target.startsWith('https://')) {
        window.open(target, '_blank');
        return { output: `Opening ${target}...` };
    }

    const results = await searchBookmarksAsync(target);
    const found = (results || []).find(r => r.url);
    if (found) {
        window.open(found.url, '_blank');
        return { output: `Opening [${found.title}]: ${found.url}...` };
    }

    return { output: `No bookmark matching '${target}' found.`, isError: true };
}
