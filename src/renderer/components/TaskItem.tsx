import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Circle, CheckCircle2, Calendar, Flag, Trash2, Check, X, Cloud, Layers, User } from 'lucide-react';
import type { Task } from '@shared/types';
import { useStore } from '../stores';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { DatePickerButton, type DatePickerAction } from './DatePickerButton';
import { ChecklistList } from './ChecklistList';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '../lib/utils';

const DEBOUNCE_MS = 500;

function getDeadlineUrgency(deadline: string | null): string | undefined {
  if (!deadline) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline + 'T00:00:00');
  const diffDays = Math.round((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'text-red-500 border-red-500/30 hover:bg-red-500/10';
  if (diffDays === 0) return 'text-red-500 hover:bg-red-500/10';
  if (diffDays === 1) return 'text-orange-500';
  return undefined;
}

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'text-red-500',
  P1: 'text-orange-500',
  P2: 'text-yellow-500',
  P3: 'text-blue-500',
};

interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
  isExpanded?: boolean;
  isCompleted?: boolean;
}

function TaskItem({ task, onComplete, onSelect, isSelected, isExpanded, isCompleted: isCompletedProp }: TaskItemProps) {
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const deselectTask = useStore((s) => s.deselectTask);
  const projects = useStore((s) => s.projects);
  const contexts = useStore((s) => s.contexts);
  const fetchProjects = useStore((s) => s.fetchProjects);
  const agents = useStore((s) => s.agents);
  const fetchAgents = useStore((s) => s.fetchAgents);
  const authUser = useStore((s) => s.authUser) as { id: string } | null;

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const isCompleted = isCompletedProp ?? (task.status === 'logbook');
  const cardRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Local state for debounced fields
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const taskIdRef = useRef(task.id);

  const saveTitle = useCallback(
    (value: string) => {
      if (value !== task.title) {
        updateTask(taskIdRef.current, { title: value });
      }
    },
    [task.title, updateTask],
  );

  const saveNotes = useCallback(
    (value: string) => {
      const oldNotes = task.notes ?? '';
      if (value !== oldNotes) {
        updateTask(taskIdRef.current, { notes: value });
      }
    },
    [task.notes, updateTask],
  );

  const {
    debouncedFn: debouncedSaveTitle,
    flush: flushTitle,
  } = useDebouncedCallback(saveTitle, DEBOUNCE_MS);

  const {
    debouncedFn: debouncedSaveNotes,
    flush: flushNotes,
  } = useDebouncedCallback(saveNotes, DEBOUNCE_MS);

  // Sync local state when task prop changes
  useEffect(() => {
    if (taskIdRef.current !== task.id) {
      flushTitle();
      flushNotes();
      taskIdRef.current = task.id;
    }
    setTitle(task.title);
    setNotes(task.notes ?? '');
  }, [task.id, task.title, task.notes, flushTitle, flushNotes]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      flushTitle();
      flushNotes();
    };
  }, [flushTitle, flushNotes]);

  const autoResizeNotes = useCallback(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Auto-resize notes textarea when content or expansion changes
  useEffect(() => {
    if (isExpanded) autoResizeNotes();
  }, [isExpanded, notes, autoResizeNotes]);

  const handleDelete = useCallback(() => {
    flushTitle();
    flushNotes();
    deleteTask(task.id);
  }, [flushTitle, flushNotes, deleteTask, task.id]);

  // Click-outside handler
  useEffect(() => {
    if (!isExpanded) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        flushTitle();
        flushNotes();
        // If clicking another task, let its handler set the new selection
        // directly (avoids a layout shift that would swallow the click event)
        const el = e.target as Element;
        const clickedTask = el.closest?.('[data-testid="task-item"]');
        const clickedPopover = el.closest?.('[data-radix-popper-content-wrapper]');
        if (!clickedTask && !clickedPopover) {
          deselectTask();
        }
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isExpanded, flushTitle, flushNotes, deselectTask]);

  // Keyboard shortcuts for expanded card
  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        flushTitle();
        flushNotes();
        deselectTask();
      }
      if (e.key === 'Backspace' && e.metaKey) {
        e.preventDefault();
        handleDelete();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, flushTitle, flushNotes, deselectTask, handleDelete]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    debouncedSaveTitle(value);
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    debouncedSaveNotes(value);
  };

  const handleWhenDateChange = (value: string | null) => {
    updateTask(task.id, { when_date: value });
  };

  const handleDeadlineChange = (value: string | null) => {
    updateTask(task.id, { deadline: value });
  };

  const whenDateActions: DatePickerAction[] = useMemo(() => [
    {
      label: 'Anytime',
      icon: <Layers className="size-3" />,
      onClick: () => updateTask(task.id, { status: 'anytime' }),
      active: task.status === 'anytime',
    },
    {
      label: 'Someday',
      icon: <Cloud className="size-3" />,
      onClick: () => updateTask(task.id, { status: 'someday' }),
      active: task.status === 'someday',
    },
  ], [task.id, task.status, updateTask]);

  // Fetch projects on mount if not loaded
  useEffect(() => {
    if (projects.length === 0) {
      fetchProjects();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally only on mount

  // Fetch agents on mount if not loaded
  useEffect(() => {
    if (agents.length === 0) {
      fetchAgents();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally only on mount

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== 'completed' && p.status !== 'archived'),
    [projects],
  );

  const currentProject = useMemo(
    () => projects.find((p) => p.id === task.project_id) ?? null,
    [projects, task.project_id],
  );

  const inheritedContext = useMemo(
    () => currentProject?.context_id ? contexts.find((c) => c.id === currentProject.context_id) ?? null : null,
    [currentProject, contexts],
  );

  const isContextInherited = !!currentProject?.context_id;

  const effectiveContext = useMemo(() => {
    const contextId = currentProject?.context_id ?? task.context_id;
    return contextId ? contexts.find((c) => c.id === contextId) ?? null : null;
  }, [currentProject, task.context_id, contexts]);

  const handleProjectChange = (projectId: string | null) => {
    updateTask(task.id, { project_id: projectId });
    setProjectOpen(false);
  };

  const handleContextChange = (contextId: string | null) => {
    updateTask(task.id, { context_id: contextId });
    setContextOpen(false);
  };

  const activeAgents = useMemo(
    () => agents.filter((a) => !a.revoked_at),
    [agents],
  );

  const assigneeLabel = useMemo(() => {
    if (!task.assignee_id) return 'Unassigned';
    if (authUser && task.assignee_id === authUser.id) return 'Me';
    const agent = agents.find((a) => a.id === task.assignee_id);
    return agent ? agent.name : 'Unassigned';
  }, [task.assignee_id, authUser, agents]);

  const handleAssigneeChange = (assigneeId: string | null) => {
    updateTask(task.id, { assignee_id: assigneeId });
    setAssigneeOpen(false);
  };

  const handleRowClick = () => {
    if (!isExpanded) {
      onSelect?.(task.id);
    }
  };

  return (
    <div
      ref={cardRef}
      data-testid="task-item"
      onClick={handleRowClick}
      className={cn(
        'rounded-xl cursor-default border',
        'transition-[background-color,border-color,box-shadow] duration-200 ease-out',
        isExpanded
          ? 'bg-card border-border shadow-sm my-2'
          : cn(
              'group border-transparent',
              isSelected ? 'bg-accent' : 'hover:bg-accent/40',
            ),
      )}
    >
      {/* Title row */}
      <div className="flex items-center gap-3 px-4 py-2">
        <button
          role="checkbox"
          aria-checked={isCompleted}
          onClick={(e) => {
            e.stopPropagation();
            onComplete(task.id);
          }}
          className="shrink-0 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
        >
          {isCompleted ? (
            <CheckCircle2 className="size-[18px] text-primary" strokeWidth={1.5} />
          ) : (
            <Circle
              className={`size-[18px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors duration-100 ${
                task.priority ? PRIORITY_COLORS[task.priority] : ''
              }`}
              strokeWidth={1.5}
            />
          )}
        </button>

        {isExpanded ? (
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="flex-1 bg-transparent text-[13px] leading-snug text-foreground font-medium outline-none min-w-0"
            autoFocus
          />
        ) : (
          <span
            className={`flex-1 text-[13px] leading-snug truncate transition-[color,text-decoration-line,text-decoration-color] duration-300 ${isCompleted ? 'line-through text-muted-foreground decoration-muted-foreground' : 'text-foreground'}`}
          >
            {task.title}
          </span>
        )}

        {!isExpanded && task.priority && !isCompleted && (
          <span
            data-testid="priority-indicator"
            className={`text-[10px] font-medium tracking-wide ${PRIORITY_COLORS[task.priority]}`}
          >
            {task.priority}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span data-testid="when-date">
            <DatePickerButton
              value={task.when_date}
              onChange={handleWhenDateChange}
              icon={task.status === 'anytime' ? <Layers className="size-3.5" /> : task.status === 'someday' ? <Cloud className="size-3.5" /> : <Calendar className="size-3.5" />}
              label="When date"
              actions={whenDateActions}
            />
          </span>
          <span data-testid="deadline-badge">
            <DatePickerButton
              value={task.deadline}
              onChange={handleDeadlineChange}
              icon={<Flag className="size-3.5" />}
              label="Deadline"
              className={getDeadlineUrgency(task.deadline)}
            />
          </span>
        </div>
      </div>

      {/* Expandable section — always in DOM for CSS grid height animation */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="pr-4" style={{ paddingLeft: 46 }}>
            <ChecklistList taskId={task.id} isExpanded={isExpanded} />
            <textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Notes"
              rows={1}
              tabIndex={isExpanded ? 0 : -1}
              className="w-full bg-transparent text-[13px] text-foreground/80 placeholder:text-muted-foreground/40 outline-none resize-none leading-snug overflow-hidden min-w-0"
            />
            <div className="flex items-center justify-between pt-1 pb-2.5">
              <div className="flex items-center gap-1">
              <Popover open={projectOpen} onOpenChange={setProjectOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Project"
                    tabIndex={isExpanded ? 0 : -1}
                    className="-ml-1.5 inline-flex items-center gap-1.5 px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent/60 rounded-md transition-colors cursor-pointer"
                  >
                    <span>{currentProject ? currentProject.title : 'No project'}</span>
                    {inheritedContext && (
                      <span className="text-[10px] bg-accent px-1.5 py-0.5 rounded-full">
                        {inheritedContext.name}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1" align="start">
                  <button
                    role="option"
                    aria-label="None"
                    type="button"
                    onClick={() => handleProjectChange(null)}
                    className="flex items-center w-full px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-md cursor-pointer"
                  >
                    None
                  </button>
                  {activeProjects.map((p) => {
                    const ctx = p.context_id ? contexts.find((c) => c.id === p.context_id) : null;
                    return (
                      <button
                        key={p.id}
                        role="option"
                        aria-label={p.title}
                        type="button"
                        onClick={() => handleProjectChange(p.id)}
                        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
                      >
                        <span>{p.title}</span>
                        {ctx && (
                          <span className="text-[10px] bg-accent px-1.5 py-0.5 rounded-full">
                            {ctx.name}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>
              {isContextInherited ? (
                <div className="inline-flex items-center gap-1.5 px-1.5 py-1 text-xs text-muted-foreground">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: effectiveContext?.color ?? undefined }}
                  />
                  <span>{effectiveContext?.name}</span>
                  <span className="text-muted-foreground/50">(project)</span>
                </div>
              ) : (
                <Popover open={contextOpen} onOpenChange={setContextOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Context"
                      tabIndex={isExpanded ? 0 : -1}
                      className="inline-flex items-center gap-1.5 px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent/60 rounded-md transition-colors cursor-pointer"
                    >
                      {effectiveContext ? (
                        <>
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: effectiveContext.color ?? undefined }}
                          />
                          <span>{effectiveContext.name}</span>
                        </>
                      ) : (
                        <span>No context</span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1" align="start">
                    <button
                      role="option"
                      aria-label="None"
                      type="button"
                      onClick={() => handleContextChange(null)}
                      className="flex items-center w-full px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-md cursor-pointer"
                    >
                      None
                    </button>
                    {contexts.map((ctx) => (
                      <button
                        key={ctx.id}
                        role="option"
                        aria-label={ctx.name}
                        type="button"
                        onClick={() => handleContextChange(ctx.id)}
                        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
                      >
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: ctx.color ?? undefined }}
                        />
                        <span>{ctx.name}</span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
              <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Assignee"
                    tabIndex={isExpanded ? 0 : -1}
                    className="inline-flex items-center gap-1.5 px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent/60 rounded-md transition-colors cursor-pointer"
                  >
                    <User className="size-3" />
                    <span>{assigneeLabel}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="start">
                  <button
                    role="option"
                    aria-label="Unassigned"
                    type="button"
                    onClick={() => handleAssigneeChange(null)}
                    className="flex items-center w-full px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-md cursor-pointer"
                  >
                    Unassigned
                  </button>
                  {authUser && (
                    <button
                      role="option"
                      aria-label="Me"
                      type="button"
                      onClick={() => handleAssigneeChange(authUser.id)}
                      className="flex items-center w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
                    >
                      Me
                    </button>
                  )}
                  {activeAgents.map((agent) => (
                    <button
                      key={agent.id}
                      role="option"
                      aria-label={agent.name}
                      type="button"
                      onClick={() => handleAssigneeChange(agent.id)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
                    >
                      <span>{agent.name}</span>
                      <span className="text-[10px] text-muted-foreground">AI</span>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              </div>
              {confirmingDelete ? (
                <div className="flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1">
                  <span className="text-sm text-muted-foreground mr-1">Confirm?</span>
                  <button
                    aria-label="Confirm delete task"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                      setConfirmingDelete(false);
                    }}
                    className="p-1 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    aria-label="Cancel delete task"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmingDelete(false);
                    }}
                    className="p-1 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  aria-label="Delete task"
                  tabIndex={isExpanded ? 0 : -1}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmingDelete(true);
                  }}
                  className="p-1 rounded text-muted-foreground/40 hover:text-destructive transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const MemoTaskItem = React.memo(TaskItem);
export { MemoTaskItem as TaskItem };
export default MemoTaskItem;
