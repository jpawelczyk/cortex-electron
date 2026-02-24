import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, CheckSquare, FolderKanban, FileText, ArrowRight, Brain, Calendar, User, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@renderer/components/ui/dialog';
import { useStore } from '../stores';
import type { Task } from '@shared/types';
import type { SidebarView } from './Sidebar';
import type { SearchResult } from '@shared/search-types';

interface CommandPaletteProps {
  onNavigateToTask: (task: Task) => void;
  onNavigateToProject: (projectId: string) => void;
  onNavigateToNote: (noteId: string) => void;
  onNavigateToView: (view: SidebarView) => void;
  onCreateTask: () => void;
  onCreateProject: () => void;
  onCreateNote: () => void;
}

interface ResultItem {
  id: string;
  type: 'task' | 'project' | 'note' | 'action' | 'semantic';
  title: string;
  preview?: string;
  entityType?: string;
  data?: unknown;
}

const matches = (text: string, query: string) =>
  text.toLowerCase().includes(query.toLowerCase());

export function CommandPalette({
  onNavigateToTask,
  onNavigateToProject,
  onNavigateToNote,
  onNavigateToView,
  onCreateTask,
  onCreateProject,
  onCreateNote,
}: CommandPaletteProps) {
  const tasks = useStore((s) => s.tasks as Task[]);
  const projects = useStore((s) => s.projects as { id: string; title: string; deleted_at: string | null }[]);
  const notes = useStore((s) => s.notes as { id: string; title: string; deleted_at: string | null }[]);
  const open = useStore((s) => s.commandPaletteOpen as boolean);
  const closeCommandPalette = useStore((s) => s.closeCommandPalette as () => void);
  const searchResults = useStore((s) => s.searchResults);
  const searchLoading = useStore((s) => s.searchLoading);
  const performSearch = useStore((s) => s.performSearch);
  const clearSearch = useStore((s) => s.clearSearch);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!query || query.length < 2) {
      clearSearch();
      return;
    }
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch, clearSearch]);

  const filteredTasks = useMemo(
    () =>
      query
        ? tasks.filter((t) => !t.deleted_at && matches(t.title, query)).slice(0, 5)
        : [],
    [tasks, query]
  );

  const filteredProjects = useMemo(
    () =>
      query
        ? projects.filter((p) => !p.deleted_at && matches(p.title, query)).slice(0, 5)
        : [],
    [projects, query]
  );

  const filteredNotes = useMemo(
    () =>
      query
        ? notes.filter((n) => !n.deleted_at && matches(n.title, query)).slice(0, 5)
        : [],
    [notes, query]
  );

  const semanticItems: ResultItem[] = useMemo(() => {
    if (!searchResults?.semantic?.length) return [];
    return searchResults.semantic.map((r: SearchResult) => ({
      id: `semantic-${r.entityId}`,
      type: 'semantic' as const,
      title: r.title,
      preview: r.preview,
      entityType: r.entityType,
      data: r,
    }));
  }, [searchResults]);

  const allItems: ResultItem[] = useMemo(() => {
    if (query) {
      const items: ResultItem[] = [];
      filteredTasks.forEach((t) => items.push({ id: t.id, type: 'task', title: t.title, data: t }));
      filteredProjects.forEach((p) => items.push({ id: p.id, type: 'project', title: p.title }));
      filteredNotes.forEach((n) => items.push({ id: n.id, type: 'note', title: n.title }));
      semanticItems.forEach((s) => items.push(s));
      return items;
    }
    return [
      { id: 'new-task', type: 'action' as const, title: 'New Task' },
      { id: 'new-project', type: 'action' as const, title: 'New Project' },
      { id: 'new-note', type: 'action' as const, title: 'New Note' },
      { id: 'go-inbox', type: 'action' as const, title: 'Go to Inbox' },
      { id: 'go-today', type: 'action' as const, title: 'Go to Today' },
      { id: 'go-upcoming', type: 'action' as const, title: 'Go to Upcoming' },
    ];
  }, [query, filteredTasks, filteredProjects, filteredNotes, semanticItems]);

  const handleSelect = useCallback(
    (item: ResultItem) => {
      closeCommandPalette();
      switch (item.type) {
        case 'task':
          onNavigateToTask(item.data as Task);
          break;
        case 'project':
          onNavigateToProject(item.id);
          break;
        case 'note':
          onNavigateToNote(item.id);
          break;
        case 'semantic': {
          const result = item.data as SearchResult;
          if (result.entityType === 'task') {
            // Navigate using entityId — we only have id here, no full Task object
            onNavigateToTask({ id: result.entityId, title: result.title } as Task);
          } else if (result.entityType === 'project') {
            onNavigateToProject(result.entityId);
          } else if (result.entityType === 'note') {
            onNavigateToNote(result.entityId);
          }
          // meeting and stakeholder: just close the palette for now
          break;
        }
        case 'action':
          if (item.id === 'new-task') onCreateTask();
          else if (item.id === 'new-project') onCreateProject();
          else if (item.id === 'new-note') onCreateNote();
          else if (item.id.startsWith('go-')) {
            const view = item.id.replace('go-', '') as SidebarView;
            onNavigateToView(view);
          }
          break;
      }
    },
    [
      closeCommandPalette,
      onNavigateToTask,
      onNavigateToProject,
      onNavigateToNote,
      onNavigateToView,
      onCreateTask,
      onCreateProject,
      onCreateNote,
    ]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && allItems.length > 0) {
        e.preventDefault();
        handleSelect(allItems[selectedIndex]);
      }
    },
    [allItems, selectedIndex, handleSelect]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  const iconForEntityType = (entityType: string) => {
    switch (entityType) {
      case 'task': return <CheckSquare className="size-4 text-muted-foreground shrink-0" />;
      case 'project': return <FolderKanban className="size-4 text-muted-foreground shrink-0" />;
      case 'note': return <FileText className="size-4 text-muted-foreground shrink-0" />;
      case 'meeting': return <Calendar className="size-4 text-muted-foreground shrink-0" />;
      case 'stakeholder': return <User className="size-4 text-muted-foreground shrink-0" />;
      default: return null;
    }
  };

  const iconForType = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckSquare className="size-4 text-muted-foreground" />;
      case 'project':
        return <FolderKanban className="size-4 text-muted-foreground" />;
      case 'note':
        return <FileText className="size-4 text-muted-foreground" />;
      case 'action':
        return <ArrowRight className="size-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const taskResults = allItems.filter((i) => i.type === 'task');
  const projectResults = allItems.filter((i) => i.type === 'project');
  const noteResults = allItems.filter((i) => i.type === 'note');
  const actionResults = allItems.filter((i) => i.type === 'action');

  // semanticItems are rendered separately — they follow in-memory items in keyboard order
  const inMemoryCount = taskResults.length + projectResults.length + noteResults.length;

  let globalIndex = 0;

  const renderGroup = (label: string, items: ResultItem[]) => {
    if (items.length === 0) return null;
    const startIdx = globalIndex;
    globalIndex += items.length;
    return (
      <div key={label}>
        <div className="px-4 py-1.5 text-xs text-muted-foreground font-medium">{label}</div>
        {items.map((item, i) => {
          const idx = startIdx + i;
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={item.id}
              data-selected={isSelected || undefined}
              className={`flex items-center gap-3 w-full px-4 py-2 text-sm text-left transition-colors duration-75 cursor-default ${
                isSelected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent/40'
              }`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              {iconForType(item.type)}
              <span className="truncate">{item.title}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderSemanticSection = () => {
    if (!searchLoading && semanticItems.length === 0) return null;
    const startIdx = inMemoryCount;
    return (
      <div>
        <div className="px-4 py-1.5 text-xs text-muted-foreground font-medium flex items-center gap-1.5">
          <Brain className="size-3" />
          <span>Semantic Matches</span>
          {searchLoading && <Loader2 className="size-3 animate-spin ml-1" />}
        </div>
        {semanticItems.map((item, i) => {
          const idx = startIdx + i;
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={item.id}
              data-selected={isSelected || undefined}
              className={`flex items-start gap-3 w-full px-4 py-2 text-sm text-left transition-colors duration-75 cursor-default ${
                isSelected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent/40'
              }`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              {iconForEntityType(item.entityType ?? '')}
              <div className="min-w-0 flex-1">
                <div className="truncate">{item.title}</div>
                {item.preview && (
                  <div className="truncate text-xs text-muted-foreground mt-0.5">{item.preview}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) closeCommandPalette(); }}>
      <DialogContent className="p-0 gap-0 max-w-lg border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl" showCloseButton={false}>
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <DialogDescription className="sr-only">Search tasks, projects, and notes</DialogDescription>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            placeholder="Search tasks, projects, notes..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {query ? (
            <>
              {renderGroup('Tasks', taskResults)}
              {renderGroup('Projects', projectResults)}
              {renderGroup('Notes', noteResults)}
              {renderSemanticSection()}
              {allItems.length === 0 && !searchLoading && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              )}
            </>
          ) : (
            renderGroup('Quick Actions', actionResults)
          )}
        </div>
        <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border flex items-center gap-3">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
