import { useEffect, useMemo, useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import type { Project, ProjectStatus } from '@shared/types';
import { useStore } from '../stores';
import { InlineProjectCard } from '../components/InlineProjectCard';

const ACTIVE_STATUSES: ProjectStatus[] = ['planned', 'active', 'on_hold', 'blocked'];
const STALENESS_DAYS = 14;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  planned: { label: 'Planned', className: 'bg-muted-foreground/20 text-muted-foreground' },
  active: { label: 'Active', className: 'bg-emerald-500/20 text-emerald-400' },
  on_hold: { label: 'On Hold', className: 'bg-yellow-500/20 text-yellow-400' },
  blocked: { label: 'Blocked', className: 'bg-red-500/20 text-red-400' },
};

function isStale(project: Project): boolean {
  const updatedAt = new Date(project.updated_at);
  const now = new Date();
  const diffMs = now.getTime() - updatedAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= STALENESS_DAYS;
}

export function ProjectsOverviewView() {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const fetchProjects = useStore((s) => s.fetchProjects);
  const isInlineProjectCreating = useStore((s) => s.isInlineProjectCreating);
  const cancelInlineProjectCreate = useStore((s) => s.cancelInlineProjectCreate);
  const [isLocalCreating, setIsLocalCreating] = useState(false);

  const isCreating = isLocalCreating || isInlineProjectCreating;

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const activeProjects = useMemo(() => {
    return projects
      .filter((p) => ACTIVE_STATUSES.includes(p.status) && !p.deleted_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [projects]);

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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

            return (
              <div
                key={project.id}
                data-testid="project-card"
                className="rounded-lg border border-border bg-card/40 backdrop-blur-xl p-4 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-sm font-medium text-foreground truncate">{project.title}</h3>
                  {stale && (
                    <span className="flex items-center gap-1 text-xs text-yellow-400 shrink-0">
                      <Clock className="size-3" strokeWidth={2} />
                      Stale
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {config && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.className}`}>
                      {config.label}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
