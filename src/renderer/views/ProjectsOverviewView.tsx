import { useEffect, useMemo, useState } from 'react';
import { parseISO } from 'date-fns';
import { Clock, Plus, Trash2, Check, X, Briefcase, Home, FlaskConical, type LucideIcon } from 'lucide-react';
import type { Project, ProjectStatus } from '@shared/types';
import { useStore } from '../stores';
import { InlineProjectCard } from '../components/InlineProjectCard';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { filterProjectsByContext } from '../lib/contextFilter';
import { CompletedProjectsView } from './CompletedProjectsView';
import { ArchivedProjectsView } from './ArchivedProjectsView';

const ICON_MAP: Record<string, LucideIcon> = {
  Briefcase,
  Home,
  FlaskConical,
};

type ProjectsTab = 'active' | 'completed' | 'archived';

const TABS: { key: ProjectsTab; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'archived', label: 'Archived' },
];

const ACTIVE_STATUSES: ProjectStatus[] = ['planned', 'active', 'on_hold', 'blocked'];
const STALENESS_DAYS = 14;

const STATUS_OPTIONS: { value: ProjectStatus; label: string; className: string }[] = [
  { value: 'planned', label: 'Planned', className: 'bg-muted-foreground/20 text-muted-foreground' },
  { value: 'active', label: 'Active', className: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'on_hold', label: 'On Hold', className: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'blocked', label: 'Blocked', className: 'bg-red-500/20 text-red-400' },
  { value: 'completed', label: 'Completed', className: 'bg-blue-500/20 text-blue-400' },
  { value: 'archived', label: 'Archived', className: 'bg-muted-foreground/20 text-muted-foreground' },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = Object.fromEntries(
  STATUS_OPTIONS.map((opt) => [opt.value, { label: opt.label, className: opt.className }]),
);

function isStale(project: Project): boolean {
  const updatedAt = parseISO(project.updated_at);
  const now = new Date();
  const diffMs = now.getTime() - updatedAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= STALENESS_DAYS;
}

export function ProjectsOverviewView() {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const contexts = useStore((s) => s.contexts);
  const activeContextIds = useStore((s) => s.activeContextIds);
  const fetchProjects = useStore((s) => s.fetchProjects);
  const updateProject = useStore((s) => s.updateProject);
  const isInlineProjectCreating = useStore((s) => s.isInlineProjectCreating);
  const cancelInlineProjectCreate = useStore((s) => s.cancelInlineProjectCreate);
  const navigateTab = useStore((s) => s.navigateTab);
  const deleteProject = useStore((s) => s.deleteProject);
  const [activeTab, setActiveTab] = useState<ProjectsTab>('active');
  const [isLocalCreating, setIsLocalCreating] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [statusOpenId, setStatusOpenId] = useState<string | null>(null);
  const [contextOpenId, setContextOpenId] = useState<string | null>(null);

  const isCreating = isLocalCreating || isInlineProjectCreating;

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const activeProjects = useMemo(() => {
    const statusFiltered = projects
      .filter((p) => ACTIVE_STATUSES.includes(p.status) && !p.deleted_at);
    const contextFiltered = filterProjectsByContext(statusFiltered, activeContextIds);
    return contextFiltered
      .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime());
  }, [projects, activeContextIds]);

  const taskCountsByProject = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of tasks) {
      if (
        task.project_id &&
        task.status !== 'logbook' &&
        task.status !== 'cancelled' &&
        !task.deleted_at
      ) {
        counts[task.project_id] = (counts[task.project_id] || 0) + 1;
      }
    }
    return counts;
  }, [tasks]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-semibold text-foreground">Projects</h2>
          <div className="flex gap-1 ml-auto">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                data-testid={`projects-tab-${key}`}
                aria-selected={activeTab === key}
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'completed' && <CompletedProjectsView />}
        {activeTab === 'archived' && <ArchivedProjectsView />}

        {activeTab === 'active' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isCreating ? (
            <InlineProjectCard onClose={() => { setIsLocalCreating(false); cancelInlineProjectCreate(); }} />
          ) : (
            <button
              type="button"
              data-testid="new-project-trigger"
              onClick={() => setIsLocalCreating(true)}
              className="rounded-lg border border-dashed border-border/60 bg-card/20 p-4 transition-colors hover:bg-accent/30 hover:border-border cursor-pointer flex items-center gap-3 text-muted-foreground/60 hover:text-muted-foreground"
            >
              <Plus className="size-4" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">New Project</span>
            </button>
          )}

          {activeProjects.map((project) => {
            const taskCount = taskCountsByProject[project.id] || 0;
            const stale = isStale(project);
            const config = STATUS_CONFIG[project.status];

            const isConfirmingDelete = confirmingDeleteId === project.id;

            return (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                data-testid="project-card"
                onClick={() => navigateTab({ view: 'projects', entityId: project.id, entityType: 'project' })}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigateTab({ view: 'projects', entityId: project.id, entityType: 'project' }); }}
                className="group/card rounded-lg border border-border bg-card/40 backdrop-blur-xl p-4 transition-colors hover:bg-accent/40 text-left cursor-default"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-sm font-medium text-foreground truncate">{project.title}</h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {stale && (
                      <span className="flex items-center gap-1 text-xs text-yellow-400">
                        <Clock className="size-3" strokeWidth={2} />
                        Stale
                      </span>
                    )}
                    {isConfirmingDelete ? (
                      <div
                        className="flex items-center gap-1 rounded-lg bg-accent px-2 py-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-xs text-muted-foreground mr-0.5">Confirm?</span>
                        <button
                          type="button"
                          aria-label="Confirm delete project"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(project.id);
                            setConfirmingDeleteId(null);
                          }}
                          className="p-0.5 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                        >
                          <Check className="size-3" />
                        </button>
                        <button
                          type="button"
                          aria-label="Cancel delete project"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmingDeleteId(null);
                          }}
                          className="p-0.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label="Delete project"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingDeleteId(project.id);
                        }}
                        className="p-0.5 rounded text-muted-foreground/0 group-hover/card:text-muted-foreground/40 hover:!text-destructive transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Popover open={statusOpenId === project.id} onOpenChange={(open) => setStatusOpenId(open ? project.id : null)}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        data-testid={`status-picker-${project.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-default transition-colors ${config?.className ?? ''}`}
                      >
                        {config?.label ?? project.status}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="start" onClick={(e) => e.stopPropagation()}>
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          role="option"
                          aria-label={opt.label}
                          type="button"
                          onClick={() => {
                            updateProject(project.id, { status: opt.value });
                            setStatusOpenId(null);
                          }}
                          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
                        >
                          <span className={`size-2 rounded-full ${opt.className.split(' ')[0]}`} />
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                  {(() => {
                    const ctx = project.context_id
                      ? contexts.find((c) => c.id === project.context_id) ?? null
                      : null;
                    const Icon = ctx?.icon ? ICON_MAP[ctx.icon] : null;
                    const isEmoji = ctx?.icon && !Icon;
                    return (
                      <Popover open={contextOpenId === project.id} onOpenChange={(open) => setContextOpenId(open ? project.id : null)}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            data-testid={`context-picker-${project.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium transition-all ${
                              ctx
                                ? 'bg-accent/50 text-foreground hover:bg-accent'
                                : 'bg-transparent text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50'
                            }`}
                          >
                            {ctx ? (
                              <>
                                <span
                                  className="size-2 rounded-full shrink-0"
                                  style={{ backgroundColor: ctx.color ?? undefined }}
                                />
                                {Icon && <Icon className="size-3.5" />}
                                {isEmoji && <span>{ctx.icon}</span>}
                                {ctx.name}
                              </>
                            ) : (
                              'No context'
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1" align="start" onClick={(e) => e.stopPropagation()}>
                          <button
                            role="option"
                            aria-label="None"
                            type="button"
                            onClick={() => {
                              updateProject(project.id, { context_id: null });
                              setContextOpenId(null);
                            }}
                            className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-md cursor-pointer"
                          >
                            None
                          </button>
                          {contexts.map((c) => {
                            const CIcon = c.icon ? ICON_MAP[c.icon] : null;
                            const cIsEmoji = c.icon && !CIcon;
                            return (
                              <button
                                key={c.id}
                                role="option"
                                aria-label={c.name}
                                type="button"
                                onClick={() => {
                                  updateProject(project.id, { context_id: c.id });
                                  setContextOpenId(null);
                                }}
                                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
                              >
                                <span
                                  className="size-2 rounded-full shrink-0"
                                  style={{ backgroundColor: c.color ?? 'currentColor' }}
                                />
                                {CIcon && <CIcon className="size-3.5" />}
                                {cIsEmoji && <span>{c.icon}</span>}
                                <span>{c.name}</span>
                              </button>
                            );
                          })}
                        </PopoverContent>
                      </Popover>
                    );
                  })()}
                  <span className="text-xs text-muted-foreground">
                    {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>}

        {activeTab === 'active' && !isCreating && activeProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground" data-testid="projects-empty">
            <Briefcase className="size-10 mb-3 opacity-30" strokeWidth={1.25} />
            <p className="text-sm">No projects yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
