import { useState, useEffect } from 'react';
import { ArrowLeft, Pin, Trash2, Check, X } from 'lucide-react';
import { useStore } from '../stores';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';

interface NoteDetailViewProps {
  noteId: string;
}

export function NoteDetailView({ noteId }: NoteDetailViewProps) {
  const notes = useStore((s) => s.notes);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const deselectNote = useStore((s) => s.deselectNote);
  const contexts = useStore((s) => s.contexts);
  const projects = useStore((s) => s.projects);

  const note = notes.find((n) => n.id === noteId);

  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  // Sync local state when note changes (e.g. after save)
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content ?? '');
    }
  }, [noteId]); // eslint-disable-line react-hooks/exhaustive-deps -- Only sync on note ID change, not on every note update

  const { debouncedFn: debouncedSaveTitle } = useDebouncedCallback(
    (newTitle: string) => updateNote(noteId, { title: newTitle }),
    500,
  );

  const { debouncedFn: debouncedSaveContent } = useDebouncedCallback(
    (newContent: string) => updateNote(noteId, { content: newContent }),
    500,
  );

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Note not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-12 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={deselectNote}
            data-testid="back-to-notes"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Notes
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateNote(noteId, { is_pinned: !note.is_pinned })}
              data-testid="pin-toggle"
              className={`p-1.5 rounded-md transition-colors ${
                note.is_pinned ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
              aria-label={note.is_pinned ? 'Unpin note' : 'Pin note'}
            >
              <Pin className="size-4" />
            </button>
            {confirmingDelete ? (
              <div className="flex items-center gap-1 rounded-lg bg-accent px-2 py-1">
                <span className="text-xs text-muted-foreground mr-1">Delete?</span>
                <button
                  data-testid="confirm-delete"
                  onClick={async () => { await deleteNote(noteId); deselectNote(); }}
                  className="p-0.5 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                  aria-label="Confirm delete"
                >
                  <Check className="size-3" />
                </button>
                <button
                  data-testid="cancel-delete"
                  onClick={() => setConfirmingDelete(false)}
                  className="p-0.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Cancel delete"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                data-testid="delete-note"
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
                aria-label="Delete note"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <input
          value={title}
          data-testid="note-title-input"
          onChange={(e) => {
            setTitle(e.target.value);
            debouncedSaveTitle(e.target.value);
          }}
          className="w-full text-2xl font-bold bg-transparent border-0 outline-none mb-4 text-foreground placeholder:text-muted-foreground/50"
          placeholder="Note title"
        />

        {/* Metadata row - context and project pickers */}
        <div className="flex items-center gap-3 mb-6">
          {/* Context picker */}
          <Popover open={contextOpen} onOpenChange={setContextOpen}>
            <PopoverTrigger asChild>
              <button
                data-testid="note-context-picker"
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium transition-all ${
                  note.context_id
                    ? 'bg-accent/50 text-foreground hover:bg-accent'
                    : 'bg-transparent text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50'
                }`}
              >
                {(() => {
                  const ctx = note.context_id ? contexts.find(c => c.id === note.context_id) : null;
                  if (!ctx) return 'No context';
                  return (
                    <>
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: ctx.color ?? undefined }} />
                      {ctx.name}
                    </>
                  );
                })()}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              <button
                role="option"
                aria-label="None"
                onClick={() => { updateNote(noteId, { context_id: null }); setContextOpen(false); }}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-md cursor-pointer"
              >
                None
              </button>
              {contexts.map(c => (
                <button
                  key={c.id}
                  role="option"
                  aria-label={c.name}
                  onClick={() => { updateNote(noteId, { context_id: c.id }); setContextOpen(false); }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
                >
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: c.color ?? 'currentColor' }} />
                  {c.name}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Project picker */}
          <Popover open={projectOpen} onOpenChange={setProjectOpen}>
            <PopoverTrigger asChild>
              <button
                data-testid="note-project-picker"
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium transition-all ${
                  note.project_id
                    ? 'bg-accent/50 text-foreground hover:bg-accent'
                    : 'bg-transparent text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50'
                }`}
              >
                {(() => {
                  const proj = note.project_id ? projects.find(p => p.id === note.project_id) : null;
                  return proj ? proj.title : 'No project';
                })()}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              <button
                role="option"
                aria-label="None"
                onClick={() => { updateNote(noteId, { project_id: null }); setProjectOpen(false); }}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-md cursor-pointer"
              >
                None
              </button>
              {projects.filter(p => !p.deleted_at).map(p => (
                <button
                  key={p.id}
                  role="option"
                  aria-label={p.title}
                  onClick={() => { updateNote(noteId, { project_id: p.id }); setProjectOpen(false); }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
                >
                  {p.title}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* Editor */}
        <MarkdownEditor
          key={noteId}
          value={content}
          onChange={(md) => {
            setContent(md);
            debouncedSaveContent(md);
          }}
        />
      </div>
    </div>
  );
}
