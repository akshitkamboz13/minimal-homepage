import { userSettings, onSettingsChanged } from '../settings/index.js';
import { createGlassWindow } from '../ui/window-generator.js';
import { isMarkdownTitle, renderMarkdown, toggleTaskCheckboxInMarkdown } from './markdown.js';

let activeNoteManager = null;

export function getNotesList() {
    return activeNoteManager ? activeNoteManager.notes : (JSON.parse(localStorage.getItem('startpage_notes')) || []);
}

export function createNoteWithData({ title = '', text = '', color = null }) {
    if (activeNoteManager) {
        return activeNoteManager.createNoteFromData({ title, text, color });
    } else {
        const notes = JSON.parse(localStorage.getItem('startpage_notes')) || [];
        const id = Date.now().toString();
        const colors = ['color-yellow', 'color-blue', 'color-green', 'color-pink'];
        const chosenColor = color || colors[Math.floor(Math.random() * colors.length)];
        const defaultW = userSettings.defaultNoteWidth || 250;
        const defaultH = userSettings.defaultNoteHeight || 250;
        const x = Math.max(100, window.innerWidth / 2 - defaultW / 2 + (Math.random() * 40 - 20));
        const y = Math.max(100, window.innerHeight / 2 - defaultH / 2 + (Math.random() * 40 - 20));

        const noteData = { id, title, text, color: chosenColor, x, y, w: defaultW, h: defaultH };
        notes.push(noteData);
        localStorage.setItem('startpage_notes', JSON.stringify(notes));
        return noteData;
    }
}

export function deleteNoteById(id) {
    if (activeNoteManager) {
        return activeNoteManager.deleteNote(id);
    }
    return false;
}

export function deleteAllNotes() {
    if (activeNoteManager) {
        activeNoteManager.deleteAll();
    }
}

export function updateNoteData(id, updates) {
    if (activeNoteManager) {
        return activeNoteManager.updateNote(id, updates);
    }
    return false;
}

export function initNotes() {
    class NoteManager {
        constructor() {
            this.notes = JSON.parse(localStorage.getItem('startpage_notes')) || [];
            this.colors = ['color-yellow', 'color-blue', 'color-green', 'color-pink', 'color-transparent'];
            this.addBtn = document.getElementById('add-note-btn');
            this.saveTimeouts = {};
            this.windowsMap = new Map();

            this.init();
        }

        init() {
            activeNoteManager = this;
            if (this.addBtn) {
                this.addBtn.addEventListener('click', () => this.createNewNote());
            }
            this.notes.forEach(noteData => this.renderNote(noteData));

            onSettingsChanged(() => {
                const textareas = document.querySelectorAll('.glass-note textarea');
                textareas.forEach(ta => {
                    ta.placeholder = userSettings.notesPlaceholder;
                });
            });

            window.addEventListener('clear-all-notes', () => {
                this.deleteAll();
            });
        }

        saveNotes() {
            localStorage.setItem('startpage_notes', JSON.stringify(this.notes));
        }

        deleteAll() {
            this.notes = [];
            this.saveNotes();
            const allNotes = document.querySelectorAll('.glass-note');
            allNotes.forEach(noteEl => {
                noteEl.style.transform = 'scale(0.8)';
                noteEl.style.opacity = '0';
                noteEl.style.transition = 'all 0.2s';
                setTimeout(() => noteEl.remove(), 200);
            });
        }

        deleteNote(id) {
            const note = this.notes.find(n => n.id === id);
            if (!note) return false;

            if (this.saveTimeouts[id]) {
                clearTimeout(this.saveTimeouts[id]);
                delete this.saveTimeouts[id];
            }

            const winInst = this.windowsMap.get(id);
            const noteEl = winInst ? winInst.windowEl : document.getElementById(`glass-note-${id}`);
            if (noteEl) {
                noteEl.style.transform = 'scale(0.8)';
                noteEl.style.opacity = '0';
                noteEl.style.transition = 'all 0.2s';
                setTimeout(() => {
                    if (winInst) winInst.destroy();
                    else noteEl.remove();
                }, 200);
            }
            this.notes = this.notes.filter(n => n.id !== id);
            this.windowsMap.delete(id);
            this.saveNotes();
            return true;
        }

        updateNote(id, updates) {
            const note = this.notes.find(n => n.id === id);
            if (!note) return false;
            Object.assign(note, updates);
            this.saveNotes();

            const winInst = this.windowsMap.get(id);
            if (winInst && winInst.windowEl) {
                if (updates.isMinimized !== undefined) {
                    if (updates.isMinimized) winInst.windowEl.classList.add('is-minimized');
                    else winInst.windowEl.classList.remove('is-minimized');
                }
                if (updates.color !== undefined) {
                    winInst.windowEl.className = `glass-window-wrapper ${updates.color} glass-note`;
                }
                if (updates.title !== undefined && winInst.titleInputEl) {
                    winInst.titleInputEl.value = updates.title;
                    if (winInst._onTitleUpdated) winInst._onTitleUpdated(updates.title);
                }
                if (updates.text !== undefined) {
                    const ta = winInst.bodyEl.querySelector('textarea');
                    if (ta) ta.value = updates.text;
                    if (winInst._refreshMarkdown) winInst._refreshMarkdown();
                }
            }
            return true;
        }

        createNoteFromData({ title = '', text = '', color = null }) {
            const id = Date.now().toString();
            const chosenColor = color || this.colors[Math.floor(Math.random() * this.colors.length)];
            const defaultW = userSettings.defaultNoteWidth || 250;
            const defaultH = userSettings.defaultNoteHeight || 250;
            const x = Math.max(100, window.innerWidth / 2 - defaultW / 2 + (Math.random() * 40 - 20));
            const y = Math.max(100, window.innerHeight / 2 - defaultH / 2 + (Math.random() * 40 - 20));

            const noteData = { id, title, text, color: chosenColor, x, y, w: defaultW, h: defaultH };
            this.notes.push(noteData);
            this.saveNotes();
            this.renderNote(noteData);
            return noteData;
        }

        createNewNote() {
            return this.createNoteFromData({ title: '', text: '' });
        }

        renderNote(noteData) {
            let isMd = isMarkdownTitle(noteData.title);
            // If markdown with text, start in rendered preview; if empty, start in edit mode
            let isPreviewMode = isMd && Boolean(noteData.text && noteData.text.trim());

            const PENCIL_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
            const EYE_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

            let toggleModeBtnEl = null;

            const winInstance = createGlassWindow({
                id: `glass-note-${noteData.id}`,
                title: noteData.title || '',
                editableTitle: true,
                titlePlaceholder: 'Note Title (end with .md for Markdown)',
                onTitleChange: (newTitle) => {
                    const note = this.notes.find(n => n.id === noteData.id);
                    if (note && note.title !== newTitle) {
                        note.title = newTitle;
                        this.saveNotes();
                        handleTitleChange(newTitle);
                    }
                },
                x: noteData.x,
                y: noteData.y,
                width: noteData.w || userSettings.defaultNoteWidth || 250,
                height: noteData.h || userSettings.defaultNoteHeight || 250,
                colorClass: `${noteData.color} glass-note`,
                extraHeaderButtons: [
                    {
                        id: `toggle-mode-${noteData.id}`,
                        title: isPreviewMode ? 'Edit Note' : 'Preview Markdown',
                        className: 'note-md-toggle-btn',
                        icon: isPreviewMode ? PENCIL_ICON : EYE_ICON,
                        onClick: () => {
                            if (!isMd) return;
                            setPreviewMode(!isPreviewMode);
                        }
                    },
                    {
                        id: `cycle-color-${noteData.id}`,
                        title: 'Change Color',
                        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z"></path></svg>`,
                        onClick: () => {
                            const note = this.notes.find(n => n.id === noteData.id);
                            if (note) {
                                const currentIndex = this.colors.indexOf(note.color);
                                const nextIndex = (currentIndex + 1) % this.colors.length;
                                const oldColor = note.color;
                                note.color = this.colors[nextIndex];
                                winInstance.windowEl.classList.remove(oldColor);
                                winInstance.windowEl.classList.add(note.color);
                                this.saveNotes();
                            }
                        }
                    }
                ],
                onMinimize: (isMin) => {
                    const note = this.notes.find(n => n.id === noteData.id);
                    if (note) {
                        note.isMinimized = isMin;
                        this.saveNotes();
                    }
                },
                onClose: () => {
                    if (this.saveTimeouts[noteData.id]) {
                        clearTimeout(this.saveTimeouts[noteData.id]);
                        delete this.saveTimeouts[noteData.id];
                    }
                    winInstance.windowEl.style.transform = 'scale(0.8)';
                    winInstance.windowEl.style.opacity = '0';
                    winInstance.windowEl.style.transition = 'all 0.2s';
                    setTimeout(() => {
                        winInstance.destroy();
                        this.notes = this.notes.filter(n => n.id !== noteData.id);
                        this.saveNotes();
                    }, 200);
                },
                onResize: ({ w, h }) => {
                    const note = this.notes.find(n => n.id === noteData.id);
                    if (note && (note.w !== w || note.h !== h)) {
                        note.w = w;
                        note.h = h;
                        this.saveNotes();
                    }
                },
                onDragEnd: ({ x, y }) => {
                    const note = this.notes.find(n => n.id === noteData.id);
                    if (note) {
                        note.x = x;
                        note.y = y;
                        this.saveNotes();
                    }
                }
            });

            this.windowsMap.set(noteData.id, winInstance);

            if (noteData.isMinimized) {
                winInstance.windowEl.classList.add('is-minimized');
            }

            // Find toggle button element in header
            toggleModeBtnEl = winInstance.windowEl.querySelector(`#toggle-mode-${noteData.id}`);
            if (toggleModeBtnEl) {
                toggleModeBtnEl.style.display = isMd ? 'inline-flex' : 'none';
            }

            // Container for both textarea and markdown rendered view
            const bodyWrapper = document.createElement('div');
            bodyWrapper.className = 'note-body-wrapper';
            bodyWrapper.style.width = '100%';
            bodyWrapper.style.height = '100%';
            bodyWrapper.style.display = 'flex';
            bodyWrapper.style.flexDirection = 'column';
            bodyWrapper.style.overflow = 'hidden';

            // 1. Textarea
            const placeholderText = userSettings.notesPlaceholder;
            const textarea = document.createElement('textarea');
            textarea.className = 'note-content';
            textarea.placeholder = placeholderText;
            textarea.spellcheck = false;
            textarea.value = noteData.text || '';
            textarea.style.width = '100%';
            textarea.style.height = '100%';
            textarea.style.border = 'none';
            textarea.style.outline = 'none';
            textarea.style.background = 'transparent';
            textarea.style.resize = 'none';
            textarea.style.color = 'inherit';
            textarea.style.fontFamily = 'inherit';
            textarea.style.padding = '0.75rem';
            textarea.style.display = isPreviewMode ? 'none' : 'block';

            // 2. Markdown View
            const mdView = document.createElement('div');
            mdView.className = 'note-markdown-view';
            mdView.style.display = isPreviewMode ? 'block' : 'none';

            const updateMdContent = () => {
                const note = this.notes.find(n => n.id === noteData.id);
                const currentText = note ? note.text : textarea.value;
                mdView.innerHTML = renderMarkdown(currentText || '');
            };

            updateMdContent();

            // Toggle preview mode helper
            const setPreviewMode = (preview) => {
                isPreviewMode = preview;
                if (isPreviewMode) {
                    updateMdContent();
                    textarea.style.display = 'none';
                    mdView.style.display = 'block';
                    if (toggleModeBtnEl) {
                        toggleModeBtnEl.innerHTML = PENCIL_ICON;
                        toggleModeBtnEl.title = 'Edit Note';
                    }
                } else {
                    textarea.style.display = 'block';
                    mdView.style.display = 'none';
                    textarea.focus();
                    if (toggleModeBtnEl) {
                        toggleModeBtnEl.innerHTML = EYE_ICON;
                        toggleModeBtnEl.title = 'Preview Markdown';
                    }
                }
            };

            // Double clicking markdown view switches to edit mode
            mdView.addEventListener('dblclick', (e) => {
                // Don't trigger if clicked on an interactive element like a link or checkbox
                if (e.target.closest('.md-task-checkbox') || e.target.closest('.md-link')) return;
                setPreviewMode(false);
            });

            // Interactive task checkboxes inside markdown view
            mdView.addEventListener('click', (e) => {
                const checkbox = e.target.closest('.md-task-checkbox');
                if (checkbox) {
                    e.stopPropagation();
                    const taskIdx = parseInt(checkbox.dataset.taskIdx, 10);
                    const note = this.notes.find(n => n.id === noteData.id);
                    if (note && !isNaN(taskIdx)) {
                        note.text = toggleTaskCheckboxInMarkdown(note.text, taskIdx);
                        textarea.value = note.text;
                        this.saveNotes();
                        updateMdContent();
                    }
                    return;
                }
            });

            // Textarea input and autosave
            textarea.addEventListener('input', (e) => {
                const note = this.notes.find(n => n.id === noteData.id);
                if (note) {
                    note.text = e.target.value;
                    clearTimeout(this.saveTimeouts[noteData.id]);
                    this.saveTimeouts[noteData.id] = setTimeout(() => {
                        this.saveNotes();
                    }, userSettings.notesAutosave * 1000);
                }
            });

            // When title changes dynamically
            const handleTitleChange = (newTitle) => {
                isMd = isMarkdownTitle(newTitle);
                if (toggleModeBtnEl) {
                    toggleModeBtnEl.style.display = isMd ? 'inline-flex' : 'none';
                }
                if (isMd) {
                    winInstance.windowEl.classList.add('is-md-note');
                    // If switching to markdown and note has text, show rendered preview
                    const note = this.notes.find(n => n.id === noteData.id);
                    if (note && note.text && note.text.trim()) {
                        setPreviewMode(true);
                    }
                } else {
                    winInstance.windowEl.classList.remove('is-md-note');
                    setPreviewMode(false);
                }
            };

            if (isMd) {
                winInstance.windowEl.classList.add('is-md-note');
            }

            // Expose internal refresh callbacks on winInstance for external updates
            winInstance._onTitleUpdated = handleTitleChange;
            winInstance._refreshMarkdown = () => {
                updateMdContent();
                if (isMd && isPreviewMode) {
                    mdView.style.display = 'block';
                    textarea.style.display = 'none';
                }
            };

            textarea.addEventListener('mousedown', e => e.stopPropagation());
            textarea.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
            mdView.addEventListener('mousedown', e => e.stopPropagation());
            mdView.addEventListener('wheel', e => e.stopPropagation(), { passive: true });

            bodyWrapper.appendChild(textarea);
            bodyWrapper.appendChild(mdView);
            winInstance.bodyEl.appendChild(bodyWrapper);
        }
    }

    new NoteManager();
}
