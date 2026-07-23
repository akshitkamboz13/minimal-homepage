import { userSettings, onSettingsChanged } from '../settings/index.js';

let highestNoteZIndex = 9005;

function bringNoteToFront(noteEl) {
    highestNoteZIndex++;
    if (highestNoteZIndex > 9490) highestNoteZIndex = 9005;
    noteEl.style.zIndex = highestNoteZIndex;
}

export function initNotes() {
    class NoteManager {
        constructor() {
            this.notes = JSON.parse(localStorage.getItem('startpage_notes')) || [];
            this.colors = ['color-yellow', 'color-blue', 'color-green', 'color-pink'];
            this.container = document.body;
            this.addBtn = document.getElementById('add-note-btn');
            this.saveTimeouts = {};
            
            this.init();
        }

        init() {
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
                this.notes = [];
                this.saveNotes();
                const allNotes = document.querySelectorAll('.glass-note');
                allNotes.forEach(noteEl => {
                    noteEl.style.transform = 'scale(0.8)';
                    noteEl.style.opacity = '0';
                    noteEl.style.transition = 'all 0.2s';
                    setTimeout(() => noteEl.remove(), 200);
                });
            });
        }

        saveNotes() {
            localStorage.setItem('startpage_notes', JSON.stringify(this.notes));
        }

        createNewNote() {
            const id = Date.now().toString();
            const color = this.colors[Math.floor(Math.random() * this.colors.length)];
            const defaultW = userSettings.defaultNoteWidth || 250;
            const defaultH = userSettings.defaultNoteHeight || 250;
            const x = Math.max(100, window.innerWidth / 2 - defaultW / 2 + (Math.random() * 40 - 20));
            const y = Math.max(100, window.innerHeight / 2 - defaultH / 2 + (Math.random() * 40 - 20));
            
            const noteData = { id, title: '', text: '', color, x, y, w: defaultW, h: defaultH };
            this.notes.push(noteData);
            this.saveNotes();
            this.renderNote(noteData);
        }

        renderNote(noteData) {
            const noteEl = document.createElement('div');
            noteEl.className = `glass-note ${noteData.color}`;
            noteEl.style.left = `${noteData.x}px`;
            noteEl.style.top = `${noteData.y}px`;
            if (noteData.w) noteEl.style.width = `${noteData.w}px`;
            if (noteData.h) noteEl.style.height = `${noteData.h}px`;
            noteEl.dataset.id = noteData.id;
            bringNoteToFront(noteEl);

            noteEl.addEventListener('mousedown', () => bringNoteToFront(noteEl));

            if (noteData.isMinimized) {
                noteEl.classList.add('is-minimized');
            }

            const placeholderText = userSettings.notesPlaceholder;
            noteEl.innerHTML = `
                <div class="note-header">
                    <input type="text" class="note-title" placeholder="Note Title" value="${noteData.title || ''}" readonly spellcheck="false" title="Double click to edit title" aria-label="Note Title" />
                    <div class="note-actions">
                        <button class="note-btn minimize-note-btn" aria-label="Minimize Note" title="Minimize Note">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                        <button class="note-btn cycle-color-btn" aria-label="Change Color" title="Change Color">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z"></path></svg>
                        </button>
                        <button class="note-btn delete-note-btn" aria-label="Delete Note" title="Delete Note">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
                <textarea class="note-content" placeholder="${placeholderText}" spellcheck="false">${noteData.text}</textarea>
            `;

            this.container.appendChild(noteEl);

            const minimizeBtn = noteEl.querySelector('.minimize-note-btn');
            if (minimizeBtn) {
                minimizeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const note = this.notes.find(n => n.id === noteData.id);
                    if (note) {
                        note.isMinimized = true;
                        this.saveNotes();
                    }
                    noteEl.classList.add('is-minimized');
                });
            }

            const titleInput = noteEl.querySelector('.note-title');
            
            titleInput.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                titleInput.removeAttribute('readonly');
                titleInput.classList.add('is-editing');
                titleInput.focus();
                titleInput.select();
            });

            titleInput.addEventListener('blur', () => {
                titleInput.setAttribute('readonly', 'readonly');
                titleInput.classList.remove('is-editing');
                const note = this.notes.find(n => n.id === noteData.id);
                if (note && note.title !== titleInput.value) {
                    note.title = titleInput.value;
                    this.saveNotes();
                }
            });

            titleInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    e.preventDefault();
                    titleInput.blur();
                } else {
                    e.stopPropagation();
                }
            });

            titleInput.addEventListener('input', (e) => {
                const note = this.notes.find(n => n.id === noteData.id);
                if (note) {
                    note.title = e.target.value;
                    
                    // Debounce saving using userSettings.notesAutosave seconds
                    clearTimeout(this.saveTimeouts[`title_${noteData.id}`]);
                    this.saveTimeouts[`title_${noteData.id}`] = setTimeout(() => {
                        this.saveNotes();
                    }, userSettings.notesAutosave * 1000);
                }
            });

            titleInput.addEventListener('mousedown', (e) => {
                if (titleInput.classList.contains('is-editing')) {
                    e.stopPropagation();
                }
            });

            const textarea = noteEl.querySelector('.note-content');
            textarea.addEventListener('input', (e) => {
                const note = this.notes.find(n => n.id === noteData.id);
                if (note) {
                    note.text = e.target.value;
                    
                    // Debounce saving using userSettings.notesAutosave seconds
                    clearTimeout(this.saveTimeouts[noteData.id]);
                    this.saveTimeouts[noteData.id] = setTimeout(() => {
                        this.saveNotes();
                    }, userSettings.notesAutosave * 1000);
                }
            });

            textarea.addEventListener('mousedown', e => e.stopPropagation());
            textarea.addEventListener('wheel', e => e.stopPropagation(), { passive: true });

            let cleanupDrag = this.setupDrag(noteEl, noteEl.querySelector('.note-header'), noteData);
            let resizeObserver = null;

            if (window.ResizeObserver) {
                resizeObserver = new ResizeObserver(() => {
                    const note = this.notes.find(n => n.id === noteData.id);
                    if (note) {
                        const newW = noteEl.offsetWidth;
                        const newH = noteEl.offsetHeight;
                        if (newW && newH && (note.w !== newW || note.h !== newH)) {
                            note.w = newW;
                            note.h = newH;
                            this.saveNotes();
                        }
                    }
                });
                resizeObserver.observe(noteEl);
            }

            const deleteBtn = noteEl.querySelector('.delete-note-btn');
            deleteBtn.addEventListener('click', () => {
                if (this.saveTimeouts[noteData.id]) {
                    clearTimeout(this.saveTimeouts[noteData.id]);
                    delete this.saveTimeouts[noteData.id];
                }
                if (cleanupDrag) cleanupDrag();
                if (resizeObserver) {
                    resizeObserver.unobserve(noteEl);
                    resizeObserver.disconnect();
                }
                noteEl.style.transform = 'scale(0.8)';
                noteEl.style.opacity = '0';
                noteEl.style.transition = 'all 0.2s';
                setTimeout(() => {
                    noteEl.remove();
                    this.notes = this.notes.filter(n => n.id !== noteData.id);
                    this.saveNotes();
                }, 200);
            });

            const colorBtn = noteEl.querySelector('.cycle-color-btn');
            colorBtn.addEventListener('click', () => {
                const note = this.notes.find(n => n.id === noteData.id);
                if (note) {
                    const currentIndex = this.colors.indexOf(note.color);
                    const nextIndex = (currentIndex + 1) % this.colors.length;
                    
                    noteEl.classList.remove(note.color);
                    note.color = this.colors[nextIndex];
                    noteEl.classList.add(note.color);
                    this.saveNotes();
                }
            });
        }

        setupDrag(noteEl, headerEl, noteData) {
            let isDragging = false;
            let currentX;
            let currentY;
            let initialX;
            let initialY;
            let xOffset = noteData.x;
            let yOffset = noteData.y;

            const dragStart = (e) => {
                if (e.target.closest('button')) return;
                if (e.target.closest('.note-title') && e.target.classList.contains('is-editing')) return;
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
                isDragging = true;
                noteEl.classList.add('dragging');
            };

            const drag = (e) => {
                if (isDragging) {
                    e.preventDefault();
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                    
                    currentX = Math.max(0, Math.min(currentX, window.innerWidth - noteEl.offsetWidth));
                    currentY = Math.max(0, Math.min(currentY, window.innerHeight - noteEl.offsetHeight));

                    xOffset = currentX;
                    yOffset = currentY;

                    noteEl.style.left = `${currentX}px`;
                    noteEl.style.top = `${currentY}px`;
                }
            };

            const dragEnd = () => {
                if (!isDragging) return;
                initialX = currentX;
                initialY = currentY;
                isDragging = false;
                noteEl.classList.remove('dragging');

                const note = this.notes.find(n => n.id === noteData.id);
                if (note) {
                    note.x = currentX;
                    note.y = currentY;
                    this.saveNotes();
                }
            };

            headerEl.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);

            return () => {
                headerEl.removeEventListener('mousedown', dragStart);
                document.removeEventListener('mousemove', drag);
                document.removeEventListener('mouseup', dragEnd);
            };
        }
    }

    new NoteManager();
}
