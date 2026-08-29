import { userSettings, onSettingsChanged } from '../settings/index.js';
import { createGlassWindow } from '../ui/window-generator.js';

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
                }
                if (updates.text !== undefined) {
                    const ta = winInst.bodyEl.querySelector('textarea');
                    if (ta) ta.value = updates.text;
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
            const winInstance = createGlassWindow({
                id: `glass-note-${noteData.id}`,
                title: noteData.title || '',
                editableTitle: true,
                titlePlaceholder: 'Note Title',
                onTitleChange: (newTitle) => {
                    const note = this.notes.find(n => n.id === noteData.id);
                    if (note && note.title !== newTitle) {
                        note.title = newTitle;
                        this.saveNotes();
                    }
                },
                x: noteData.x,
                y: noteData.y,
                width: noteData.w || userSettings.defaultNoteWidth || 250,
                height: noteData.h || userSettings.defaultNoteHeight || 250,
                colorClass: `${noteData.color} glass-note`,
                extraHeaderButtons: [
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

            textarea.addEventListener('mousedown', e => e.stopPropagation());
            textarea.addEventListener('wheel', e => e.stopPropagation(), { passive: true });

            winInstance.bodyEl.appendChild(textarea);
        }
    }

    new NoteManager();
}
