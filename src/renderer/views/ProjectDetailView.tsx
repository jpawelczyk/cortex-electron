import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { parseISO } from 'date-fns';
import { ArrowLeft, Clock, FolderKanban, Plus, Trash2, Check, X, Briefcase, Home, FlaskConical, type LucideIcon } from 'lucide-react';
import type { ProjectStatus } from '@shared/types';
import { useStore } from '../stores';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { TaskList } from '../components/TaskList';
import { InlineTaskCard } from '../components/InlineTaskCard';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { StakeholderPicker } from '../components/StakeholderPicker';

const ICON_MAP: Record<string, LucideIcon> = {
  Briefcase,
  Home,
  FlaskConical,
};

const DEBOUNCE_MS = 500;
const STALENESS_DAYS = 14;
const DISMISS_DELAY_MS = 2500;

const STATUS_OPTIONS: { value: ProjectStatus; label: string; className: string }[] = [
  { value: 'planned', label: 'Planned', className: 'bg-muted-foreground/20 text-muted-foreground' },
  { value: 'active', label: 'Active', className: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'on_hold', label: 'On Hold', className: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'blocked', label: 'Blocked', className: 'bg-red-500/20 text-red-400' },
  { value: 'completed', label: 'Completed', className: 'bg-blue-500/20 text-blue-400' },
  { value: 'archived', label: 'Archived', className: 'bg-muted-foreground/20 text-muted-foreground' },
];

function isStale(updatedAt: string): boolean {
  const updated = parseISO(updatedAt);
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
  const deleteProject = useStore((s) => s.deleteProject);
  const deselectProject = useStore((s) => s.deselectProject);
  const updateTask = useStore((s) => s.updateTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const isInlineCreating = useStore((s) => s.isInlineCreating);
  const startInlineCreate = useStore((s) => s.startInlineCreate);
  const stakeholders = useStore((s) => s.stakeholders);
  const projectStakeholderLinks = useStore((s) => s.projectStakeholderLinks);
  const fetchProjectStakeholders = useStore((s) => s.fetchProjectStakeholders);
  const linkStakeholderToProject = useStore((s) => s.linkStakeholderToProject);
  const unlinkStakeholderFromProject = useStore((s) => s.unlinkStakeholderFromProject);

  const project = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );

  const [title, setTitle] = useState(project?.title ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [statusOpen, setStatusOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [completionWarning, setCompletionWarning] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // --- Completion animation state (same as InboxView / TodayView) ---
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const everCompletedIds = useRef(new Set<string>());
  const dismissTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const completedIdsRef = useRef(completedIds);
  completedIdsRef.current = completedIds;

  useEffect(() => {
    const timers = dismissTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const projectIdRef = useRef(projectId);

  const context = useMemo(
    () => project?.context_id ? contexts.find((c) => c.id === project.context_id) ?? null : null,
    [project, contexts],
  );

  const projectTasks = useMemo(() => {
    return tasks.filter((t) =>
      t.project_id === projectId &&
      !t.deleted_at &&
      !dismissedIds.has(t.id) &&
      (t.status !== 'logbook' || everCompletedIds.current.has(t.id)),
    );
  }, [tasks, projectId, dismissedIds]);

  const hasIncompleteTasks = useMemo(
    () => projectTasks.some((t) => t.status !== 'logbook' && t.status !== 'cancelled'),
    [projectTasks],
  );

  const projectStakeholderIds = useMemo(
    () => projectStakeholderLinks.filter(l => l.project_id === projectId).map(l => l.stakeholder_id),
    [projectStakeholderLinks, projectId]
  );

  useEffect(() => {
    fetchProjectStakeholders(projectId);
  }, [projectId, fetchProjectStakeholders]);

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
      if (completedIdsRef.current.has(id)) {
        // Uncomplete
        updateTask(id, { status: 'inbox' });
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        const existing = dismissTimers.current.get(id);
        if (existing) {
          clearTimeout(existing);
          dismissTimers.current.delete(id);
        }
        setDismissedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        // Complete
        updateTask(id, { status: 'logbook' });
        setCompletedIds((prev) => new Set(prev).add(id));
        everCompletedIds.current.add(id);
        const timer = setTimeout(() => {
          setDismissedIds((prev) => new Set(prev).add(id));
          dismissTimers.current.delete(id);
        }, DISMISS_DELAY_MS);
        dismissTimers.current.set(id, timer);
      }
    },
    [updateTask],
  );

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
        {/* Top bar: back + delete */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={deselectProject}
            aria-label="Back"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-default"
          >
            <ArrowLeft className="size-4" />
            <span>Projects</span>
          </button>

          {confirmingDelete ? (
            <div className="flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1">
              <span className="text-sm text-muted-foreground mr-1">Confirm?</span>
              <button
                type="button"
                aria-label="Confirm delete project"
                onClick={() => {
                  deleteProject(projectId);
                  deselectProject();
                }}
                className="p-1 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
              >
                <Check className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Cancel delete project"
                onClick={() => setConfirmingDelete(false)}
                className="p-1 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label="Delete project"
              onClick={() => setConfirmingDelete(true)}
              className="p-1 rounded text-muted-foreground/40 hover:text-destructive transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>

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

            {/* Context selector */}
            <Popover open={contextOpen} onOpenChange={setContextOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-testid="context-selector"
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium cursor-default transition-all ${
                    context
                      ? 'bg-accent/50 text-foreground hover:bg-accent'
                      : 'bg-transparent text-muted-foreground hover:bg-accent/50'
                  }`}
                >
                  {context ? (
                    <>
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: context.color ?? undefined }}
                      />
                      {context.icon && ICON_MAP[context.icon] ? (
                        (() => { const Icon = ICON_MAP[context.icon!]; return <Icon className="size-3.5" />; })()
                      ) : context.icon ? (
                        <span>{context.icon}</span>
                      ) : null}
                      {context.name}
                    </>
                  ) : (
                    'No context'
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="start">
                <button
                  role="option"
                  aria-label="None"
                  type="button"
                  onClick={() => {
                    updateProject(projectId, { context_id: null });
                    setContextOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-md cursor-pointer"
                >
                  None
                </button>
                {contexts.map((ctx) => (
                  <button
                    key={ctx.id}
                    role="option"
                    aria-label={ctx.name}
                    type="button"
                    onClick={() => {
                      updateProject(projectId, { context_id: ctx.id });
                      setContextOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
                  >
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: ctx.color ?? 'currentColor' }}
                    />
                    <span>{ctx.name}</span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            {/* Owner selector */}
            <Popover open={ownerOpen} onOpenChange={setOwnerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-testid="owner-selector"
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium cursor-default transition-all ${
                    project.owner_type === 'stakeholder' && project.owner_stakeholder_id
                      ? 'bg-accent/50 text-foreground hover:bg-accent'
                      : 'bg-transparent text-muted-foreground hover:bg-accent/50'
                  }`}
                >
                  {(() => {
                    if (project.owner_type === 'stakeholder' && project.owner_stakeholder_id) {
                      const owner = stakeholders.find(s => s.id === project.owner_stakeholder_id);
                      return owner ? owner.name : 'Unknown';
                    }
                    return 'Me (owner)';
                  })()}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="start">
                <button
                  role="option"
                  aria-label="Me"
                  type="button"
                  onClick={() => {
                    updateProject(projectId, { owner_type: 'user', owner_stakeholder_id: null });
                    setOwnerOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
                >
                  Me
                </button>
                {stakeholders.filter(s => !s.deleted_at).map(s => (
                  <button
                    key={s.id}
                    role="option"
                    aria-label={s.name}
                    type="button"
                    onClick={() => {
                      updateProject(projectId, { owner_type: 'stakeholder', owner_stakeholder_id: s.id });
                      setOwnerOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
                  >
                    {s.name}
                  </button>
                ))}
                {stakeholders.filter(s => !s.deleted_at).length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-1.5">No stakeholders yet</p>
                )}
              </PopoverContent>
            </Popover>

          </div>
        </div>

        {/* Stakeholders */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Stakeholders</h3>
          <StakeholderPicker
            selectedIds={projectStakeholderIds}
            onLink={(stakeholderId) => linkStakeholderToProject(projectId, stakeholderId)}
            onUnlink={(stakeholderId) => unlinkStakeholderFromProject(projectId, stakeholderId)}
          />
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

        {/* Inline task creation (same as other views) */}
        {isInlineCreating && <InlineTaskCard />}

        {/* Task list */}
        {!isInlineCreating && projectTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FolderKanban className="size-10 mb-3 opacity-30" strokeWidth={1.25} />
            <p className="text-sm">No tasks in this project</p>
            <button
              type="button"
              data-testid="empty-state-cta"
              onClick={() => startInlineCreate({ project_id: projectId })}
              className="mt-4 flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors cursor-default"
            >
              <Plus className="size-4" />
              <span>Add a task</span>
            </button>
          </div>
        ) : projectTasks.length > 0 ? (
          <TaskList
            tasks={projectTasks}
            onCompleteTask={handleComplete}
            onSelectTask={selectTask}
            selectedTaskId={selectedTaskId}
            completedIds={completedIds}
          />
        ) : null}
      </div>
    </div>
  );
}
