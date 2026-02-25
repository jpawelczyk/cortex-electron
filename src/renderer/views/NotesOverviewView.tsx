import React, { useState, useMemo, useEffect } from 'react';
import { parseISO } from 'date-fns';
import { FileText, Pin, Plus } from 'lucide-react';
import { useStore } from '../stores';
import type { Note, Context } from '../../shared/types';

type NoteSort = 'updated' | 'created' | 'title';

function getPreview(content: string | null, maxLength = 100): string {
  if (!content) return '';
  return content
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_`~[\]()>-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function formatRelativeTime(iso: string): string {
  const date = parseISO(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const NoteRow = React.memo(function NoteRow({ note, onClick, contexts }: { note: Note; onClick: () => void; contexts: Context[] }) {
  const ctx = note.context_id ? contexts.find(c => c.id === note.context_id) : null;
  const preview = getPreview(note.content);
  return (
    <div
      data-testid="note-row"
      onClick={onClick}
      className="flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-accent/40 cursor-default transition-colors"
    >
      {note.is_pinned && <Pin className="size-3.5 text-primary mt-1 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{note.title}</span>
          {ctx && (
            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-accent/50 text-muted-foreground shrink-0">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: ctx.color ?? undefined }} />
              {ctx.name}
            </span>
          )}
        </div>
        {preview && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{preview}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{formatRelativeTime(note.updated_at)}</span>
    </div>
  );
});

export function NotesOverviewView() {
  const notes = useStore(s => s.notes);
  const contexts = useStore(s => s.contexts) as Context[];
  const activeContextIds = useStore(s => s.activeContextIds);
  const fetchNotes = useStore(s => s.fetchNotes);
  const createNote = useStore(s => s.createNote);
  const navigateTab = useStore(s => s.navigateTab);
  const setAutoFocusNoteTitle = useStore(s => s.setAutoFocusNoteTitle);
  const isInlineNoteCreating = useStore(s => s.isInlineNoteCreating);
  const cancelInlineNoteCreate = useStore(s => s.cancelInlineNoteCreate);

  const [sort, setSort] = useState<NoteSort>('updated');

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // When Cmd+N triggers note creation, create immediately and open it
  useEffect(() => {
    if (!isInlineNoteCreating) return;
    cancelInlineNoteCreate();
    createNote({ title: 'Untitled' }).then((note) => {
      setAutoFocusNoteTitle(true);
      navigateTab({ view: 'notes', entityId: note.id, entityType: 'note' });
    });
  }, [isInlineNoteCreating, cancelInlineNoteCreate, createNote, navigateTab, setAutoFocusNoteTitle]);

  const filteredNotes = useMemo(() => {
    let result = notes.filter(n => !n.deleted_at);

    // Context filter
    if (activeContextIds.length > 0) {
      result = result.filter(n => n.context_id !== null && activeContextIds.includes(n.context_id));
    }

    // Sort
    const sorted = [...result].sort((a, b) => {
      // Pinned always first
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;

      switch (sort) {
        case 'created': return parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime();
        case 'title': return a.title.localeCompare(b.title);
        default: return parseISO(b.updated_at).getTime() - parseISO(a.updated_at).getTime();
      }
    });

    return sorted;
  }, [notes, activeContextIds, sort]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Notes</h2>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as NoteSort)}
            className="text-xs bg-accent/50 text-foreground border-0 rounded-md px-2 py-1 cursor-default outline-none"
            data-testid="notes-sort"
          >
            <option value="updated">Recently updated</option>
            <option value="created">Recently created</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>

        <button
          type="button"
          data-testid="new-note-trigger"
          onClick={async () => {
            const note = await createNote({ title: 'Untitled' });
            setAutoFocusNoteTitle(true);
            navigateTab({ view: 'notes', entityId: note.id, entityType: 'note' });
          }}
          className="flex items-center gap-3 w-full px-4 py-3 mb-4 rounded-lg border border-dashed border-border/60 bg-card/20 text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/30 hover:border-border transition-colors cursor-pointer"
        >
          <Plus className="size-4" strokeWidth={1.5} />
          <span className="text-[13px] font-medium">New Note</span>
        </button>

        {/* Notes list */}
        {filteredNotes.map(note => (
          <NoteRow key={note.id} note={note} onClick={() => navigateTab({ view: 'notes', entityId: note.id, entityType: 'note' })} contexts={contexts} />
        ))}

        {/* Empty state */}
        {filteredNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground" data-testid="notes-empty">
            <FileText className="size-10 mb-3 opacity-30" strokeWidth={1.25} />
            <p className="text-sm">No notes yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
