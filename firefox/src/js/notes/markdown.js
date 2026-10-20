// ─── High-Performance Markdown Parser & Renderer for Notes ──────────────────

export function isMarkdownTitle(title) {
    if (!title || typeof title !== 'string') return false;
    return title.trim().toLowerCase().endsWith('.md');
}

// Safely escape HTML characters
function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Strip optional markdown title attribute (e.g. url "title" or url &quot;title&quot;)
function stripUrlTitle(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw.trim().split(/\s+(&quot;|&#39;|["'])/)[0];
}

// Sanitize link URLs: only allow http, https, mailto, relative paths, or anchor links.
// Explicitly block javascript:, vbscript:, and data: schemes.
function sanitizeLinkUrl(raw) {
    const url = stripUrlTitle(raw);
    if (/^(https?:\/\/|mailto:|\/|#|\.\/|\.\.\/)/i.test(url) && !/^(javascript|vbscript|data):/i.test(url)) {
        return escapeHtml(url);
    }
    return '#';
}

// Sanitize image URLs: only allow http, https, relative paths, or safe raster base64 images (png, jpeg, gif, webp).
// Explicitly block javascript:, vbscript:, and data:image/svg+xml (which can execute scripts).
function sanitizeImageUrl(raw) {
    const url = stripUrlTitle(raw);
    if (/^(https?:\/\/|\/|\.\/|\.\.\/|data:image\/(png|jpeg|jpg|gif|webp);base64,)/i.test(url) && !/^(javascript|vbscript):/i.test(url)) {
        return escapeHtml(url);
    }
    return '#';
}

// Fast, linear inline formatting parser (bold, italic, strikethrough, code, links, images)
function parseInline(text) {
    // 1. Inline code (using placeholders to avoid nested parsing)
    const codeTokens = [];
    text = text.replace(/`([^`\n]+)`/g, (match, code) => {
        const token = `__CODE_TOKEN_${codeTokens.length}__`;
        // Code is already escaped from input, wrap cleanly without double-escaping
        codeTokens.push(`<code class="md-inline-code">${code}</code>`);
        return token;
    });

    // 2. Images: ![alt](url "title")
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, urlPart) => {
        return `<img class="md-img" src="${sanitizeImageUrl(urlPart)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
    });

    // 3. Links: [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, urlPart) => {
        return `<a class="md-link" href="${sanitizeLinkUrl(urlPart)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
    });

    // 4. Bold + Italic: ***text*** or ___text___
    text = text.replace(/(\*\*\*|___)([^*\n_]+)\1/g, '<strong><em>$2</em></strong>');

    // 5. Bold: **text** or __text__
    text = text.replace(/(\*\*|__)([^*\n_]+)\1/g, '<strong>$2</strong>');

    // 6. Italic: *text* or _text_ (non-backtracking character classes)
    text = text.replace(/(^|[^\w*])\*([^*\s\n][^*\n]*?)\*(?=[^\w*]|$)/g, '$1<em>$2</em>');
    text = text.replace(/(^|[^\w_])_([^_\s\n][^_\n]*?)_(?=[^\w_]|$)/g, '$1<em>$2</em>');

    // 7. Strikethrough: ~~text~~
    text = text.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

    // 8. Restore inline code
    codeTokens.forEach((codeHtml, idx) => {
        text = text.replace(`__CODE_TOKEN_${idx}__`, codeHtml);
    });

    return text;
}

export function renderMarkdown(markdown) {
    if (!markdown || typeof markdown !== 'string') {
        return '<p class="md-empty"><em>Empty note</em></p>';
    }

    const lines = markdown.split(/\r?\n/);
    const html = [];
    let i = 0;
    let taskCheckboxIndex = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // 1. Blank lines
        if (!trimmed) {
            i++;
            continue;
        }

        // 2. Code blocks (``` or ~~~)
        if (/^```|~~~/.test(trimmed)) {
            const fence = trimmed.slice(0, 3);
            const lang = trimmed.slice(3).trim();
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith(fence)) {
                codeLines.push(escapeHtml(lines[i]));
                i++;
            }
            if (i < lines.length) i++; // skip closing fence
            html.push(
                `<pre class="md-code-block${lang ? ' lang-' + escapeHtml(lang) : ''}"><code>${codeLines.join('\n')}</code></pre>`
            );
            continue;
        }

        // 3. Horizontal Rule (---, ***, ___)
        if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(trimmed)) {
            html.push('<hr class="md-hr" />');
            i++;
            continue;
        }

        // 4. Headings (# to ######)
        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const content = parseInline(escapeHtml(headingMatch[2].trim()));
            html.push(`<h${level} class="md-h md-h${level}">${content}</h${level}>`);
            i++;
            continue;
        }

        // 5. Blockquotes (> ...)
        if (/^>\s?/.test(line)) {
            const quoteLines = [];
            while (i < lines.length && /^>\s?/.test(lines[i])) {
                quoteLines.push(lines[i].replace(/^>\s?/, ''));
                i++;
            }
            const innerHtml = renderMarkdown(quoteLines.join('\n'));
            html.push(`<blockquote class="md-blockquote">${innerHtml}</blockquote>`);
            continue;
        }

        // 6. Tables (| col 1 | col 2 |)
        if (/^\|(.+)\|$/.test(trimmed) && i + 1 < lines.length && /^\|[-:\s|]+\|$/.test(lines[i + 1].trim())) {
            const headerCells = trimmed.slice(1, -1).split('|').map(c => c.trim());
            i += 2; // skip header + divider
            const rowList = [];
            while (i < lines.length && /^\|(.+)\|$/.test(lines[i].trim())) {
                const cells = lines[i].trim().slice(1, -1).split('|').map(c => c.trim());
                rowList.push(cells);
                i++;
            }
            let tableHtml = '<div class="md-table-wrapper"><table class="md-table"><thead><tr>';
            headerCells.forEach(hc => {
                tableHtml += `<th>${parseInline(escapeHtml(hc))}</th>`;
            });
            tableHtml += '</tr></thead><tbody>';
            rowList.forEach(row => {
                tableHtml += '<tr>';
                row.forEach(cell => {
                    tableHtml += `<td>${parseInline(escapeHtml(cell))}</td>`;
                });
                tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table></div>';
            html.push(tableHtml);
            continue;
        }

        // 7. Lists (Task lists, Unordered, Ordered)
        const isTask = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.test(line);
        const isUl = /^\s*[-*+]\s+(.*)$/.test(line);
        const isOl = /^\s*\d+\.\s+(.*)$/.test(line);

        if (isTask || isUl || isOl) {
            const listType = isOl && !isTask ? 'ol' : 'ul';
            const listClass = isTask ? 'md-task-list' : `md-${listType}`;
            html.push(`<${listType} class="${listClass}">`);

            while (i < lines.length) {
                const curLine = lines[i];
                const taskMatch = curLine.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
                const ulMatch = curLine.match(/^\s*[-*+]\s+(.*)$/);
                const olMatch = curLine.match(/^\s*\d+\.\s+(.*)$/);

                if (taskMatch) {
                    const checked = taskMatch[1].toLowerCase() === 'x';
                    const content = parseInline(escapeHtml(taskMatch[2].trim()));
                    const currentIndex = taskCheckboxIndex++;
                    html.push(
                        `<li class="md-task-item${checked ? ' is-completed' : ''}">` +
                        `<input type="checkbox" class="md-task-checkbox" data-task-idx="${currentIndex}" ${checked ? 'checked' : ''} />` +
                        `<span class="md-task-text">${content}</span></li>`
                    );
                    i++;
                } else if (listType === 'ul' && ulMatch) {
                    const content = parseInline(escapeHtml(ulMatch[1].trim()));
                    html.push(`<li class="md-li">${content}</li>`);
                    i++;
                } else if (listType === 'ol' && olMatch) {
                    const content = parseInline(escapeHtml(olMatch[1].trim()));
                    html.push(`<li class="md-li">${content}</li>`);
                    i++;
                } else if (/^\s{2,}\S/.test(curLine) && lines[i - 1]) {
                    // Indented sub-line continuation
                    const continuation = parseInline(escapeHtml(curLine.trim()));
                    html.push(`<div class="md-li-sub">${continuation}</div>`);
                    i++;
                } else {
                    break;
                }
            }

            html.push(`</${listType}>`);
            continue;
        }

        // 8. Paragraphs: collect until blank line or block structure
        const pLines = [];
        while (
            i < lines.length &&
            lines[i].trim() &&
            !lines[i].match(/^(#{1,6}\s|```|~~~|>|\||---|[*]{3,}|_{3,}|\s*[-*+]\s|\s*\d+\.\s)/)
        ) {
            pLines.push(parseInline(escapeHtml(lines[i].trim())));
            i++;
        }

        if (pLines.length > 0) {
            html.push(`<p class="md-p">${pLines.join('<br />')}</p>`);
        } else {
            // Guaranteed fallback progress
            html.push(`<p class="md-p">${parseInline(escapeHtml(lines[i].trim()))}</p>`);
            i++;
        }
    }

    return html.join('\n');
}

// ─── Interactive Checkbox Toggler ──────────────────────────────────────────────

export function toggleTaskCheckboxInMarkdown(markdownText, targetIdx) {
    if (!markdownText) return markdownText;
    let currentIdx = 0;
    const lines = markdownText.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^(\s*[-*]\s+\[)([ xX])(\]\s+.*)$/);
        if (match) {
            if (currentIdx === targetIdx) {
                const currentStatus = match[2].toLowerCase() === 'x';
                const newStatus = currentStatus ? ' ' : 'x';
                lines[i] = `${match[1]}${newStatus}${match[3]}`;
                break;
            }
            currentIdx++;
        }
    }

    return lines.join('\n');
}
