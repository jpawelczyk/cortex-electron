import { useState, useEffect, useRef, useCallback, useMemo, type KeyboardEvent } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import type { ProjectStatus } from '@shared/types';
import { useStore } from '../stores';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { TaskList } from '../components/TaskList';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';

const DEBOUNCE_MS = 500;
const STALENESS_DAYS = 14;

const STATUS_OPTIONS: { value: ProjectStatus; label: string; className: string }[] = [
  { value: 'planned', label: 'Planned', className: 'bg-muted-foreground/20 text-muted-foreground' },
  { value: 'active', label: 'Active', className: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'on_hold', label: 'On Hold', className: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'blocked', label: 'Blocked', className: 'bg-red-500/20 text-red-400' },
  { value: 'completed', label: 'Completed', className: 'bg-blue-500/20 text-blue-400' },
  { value: 'archived', label: 'Archived', className: 'bg-muted-foreground/20 text-muted-foreground' },
];

function isStale(updatedAt: string): boolean {
  const updated = new Date(updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= STALENESS_DAYS;
}

interface ProjectDetailViewProps {
  projectId: string;
}

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const contexts = useStore((s) => s.contexts);
  const updateProject = useStore((s) => s.updateProject);
  const deselectProject = useStore((s) => s.deselectProject);
  const createTask = useStore((s) => s.createTask);
  const updateTask = useStore((s) => s.updateTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.selectedTaskId);

  const project = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );

  const [title, setTitle] = useState(project?.title ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [statusOpen, setStatusOpen] = useState(false);
  const [completionWarning, setCompletionWarning] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const projectIdRef = useRef(projectId);

  const context = useMemo(
    () => project?.context_id ? contexts.find((c) => c.id === project.context_id) ?? null : null,
    [project, contexts],
  );

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.project_id === projectId && !t.deleted_at),
    [tasks, projectId],
  );

  const hasIncompleteTasks = useMemo(
    () => projectTasks.some((t) => t.status !== 'logbook' && t.status !== 'cancelled'),
    [projectTasks],
  );

  // --- Debounced saves ---

  const saveTitle = useCallback(
    (value: string) => {
      if (project && value !== project.title) {
        updateProject(projectIdRef.current, { title: value });
      }
    },
    [project, updateProject],
  );

  const saveDescription = useCallback(
    (value: string) => {
      const oldDesc = project?.description ?? '';
      if (value !== oldDesc) {
        updateProject(projectIdRef.current, { description: value || null });
      }
    },
    [project, updateProject],
  );

  const {
    debouncedFn: debouncedSaveTitle,
    flush: flushTitle,
  } = useDebouncedCallback(saveTitle, DEBOUNCE_MS);

  const {
    debouncedFn: debouncedSaveDescription,
    flush: flushDescription,
  } = useDebouncedCallback(saveDescription, DEBOUNCE_MS);

  // Reset local state when project changes; flush pending saves first
  useEffect(() => {
    if (projectIdRef.current !== projectId) {
      flushTitle();
      flushDescription();
      projectIdRef.current = projectId;
    }
    if (project) {
      setTitle(project.title);
      setDescription(project.description ?? '');
    }
  }, [projectId, project, flushTitle, flushDescription]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      flushTitle();
      flushDescription();
    };
  }, [flushTitle, flushDescription]);

  // --- Handlers ---

  const handleTitleChange = (value: string) => {
    setTitle(value);
    debouncedSaveTitle(value);
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    debouncedSaveDescription(value);
  };

  const handleStatusChange = (status: ProjectStatus) => {
    if (status === 'completed' && hasIncompleteTasks) {
      setCompletionWarning(true);
      setStatusOpen(false);
      return;
    }
    updateProject(projectId, { status });
    setStatusOpen(false);
  };

  const handleComplete = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (task?.status === 'logbook') {
        updateTask(id, { status: 'inbox' });
      } else {
        updateTask(id, { status: 'logbook' });
      }
    },
    [tasks, updateTask],
  );

  const handleNewTaskKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = newTaskTitle.trim();
      if (!trimmed) return;
      createTask({ title: trimmed, project_id: projectId });
      setNewTaskTitle('');
    }
    if (e.key === 'Escape') {
      e.currentTarget.blur();
    }
  };

  // --- Not found ---

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const stale = isStale(project.updated_at);
  const currentStatusConfig = STATUS_OPTIONS.find((s) => s.value === project.status);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Back button */}
        <button
          onClick={deselectProject}
          aria-label="Back"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 cursor-default"
        >
          <ArrowLeft className="size-4" />
          <span>Projects</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="flex-1 bg-transparent text-xl font-semibold text-foreground px-0 py-1 border-0 focus:outline-none focus:ring-0"
            />
            {stale && (
              <span className="flex items-center gap-1 text-xs text-yellow-400 shrink-0">
                <Clock className="size-3" strokeWidth={2} />
                Stale
              </span>
            )}
          </div>

          <textarea
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Add a description..."
            rows={2}
            className="w-full bg-transparent text-sm text-muted-foreground px-0 py-1 border-0 focus:outline-none focus:ring-0 resize-none"
          />

          <div className="flex items-center gap-3 mt-3">
            {/* Status selector */}
            <Popover open={statusOpen} onOpenChange={setStatusOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-testid="status-selector"
                  className={`text-xs px-2.5 py-1 rounded-full font-medium cursor-default transition-colors ${currentStatusConfig?.className ?? ''}`}
                >
                  {currentStatusConfig?.label ?? project.status}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="start">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    role="option"
                    aria-label={opt.label}
                    type="button"
                    onClick={() => handleStatusChange(opt.value)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
                  >
                    <span className={`size-2 rounded-full ${opt.className.split(' ')[0]}`} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            {/* Context badge */}
            {context && (
              <span className="text-[10px] bg-accent px-1.5 py-0.5 rounded-full text-muted-foreground">
                {context.name}
              </span>
            )}
          </div>
        </div>

        {/* Completion warning */}
        {completionWarning && (
          <div className="mb-4 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center justify-between">
            <p className="text-sm text-yellow-400">
              Complete or move all tasks before completing this project
            </p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setCompletionWarning(false)}
              className="text-xs text-yellow-400 hover:text-yellow-300 ml-4 cursor-default"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Task creation input */}
        <div className="mb-4">
          <input
            type="text"
            data-project-task-input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleNewTaskKeyDown}
            placeholder="Add a task..."
            className="w-full px-3 py-2 text-[13px] bg-transparent border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Task list */}
        {projectTasks.length === 0 ? (
          <p className="px-3 py-8 text-sm text-muted-foreground text-center">
            No tasks in this project
          </p>
        ) : (
          <TaskList
            tasks={projectTasks}
            onCompleteTask={handleComplete}
            onSelectTask={selectTask}
            selectedTaskId={selectedTaskId}
          />
        )}
      </div>
    </div>
  );
}
