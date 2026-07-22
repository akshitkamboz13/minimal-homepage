import { userSettings, onSettingsChanged } from '../settings/index.js';

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
            
            const noteData = { id, text: '', color, x, y, w: defaultW, h: defaultH };
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

            const placeholderText = userSettings.notesPlaceholder;
            noteEl.innerHTML = `
                <div class="note-header">
                    <div class="note-drag-handle" style="flex:1; height:100%;"></div>
                    <div class="note-actions">
                        <button class="note-btn cycle-color-btn" aria-label="Change Color" title="Change Color">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                        </button>
                        <button class="note-btn delete-note-btn" aria-label="Delete Note" title="Delete Note">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
                <textarea class="note-content" placeholder="${placeholderText}" spellcheck="false">${noteData.text}</textarea>
            `;

            this.container.appendChild(noteEl);

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

            const deleteBtn = noteEl.querySelector('.delete-note-btn');
            deleteBtn.addEventListener('click', () => {
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

            this.setupDrag(noteEl, noteEl.querySelector('.note-header'), noteData);

            if (window.ResizeObserver) {
                const resizeObserver = new ResizeObserver(() => {
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
        }
    }

    new NoteManager();
}
