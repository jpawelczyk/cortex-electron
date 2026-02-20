import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { useStore } from '../stores';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function CompletedProjectsView() {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const updateProject = useStore((s) => s.updateProject);
  const selectProject = useStore((s) => s.selectProject);

  const completedProjects = useMemo(() => {
    return projects
      .filter((p) => p.status === 'completed' && !p.deleted_at)
      .sort((a, b) => {
        const dateA = a.completed_at || a.updated_at;
        const dateB = b.completed_at || b.updated_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
  }, [projects]);

  const taskCountsByProject = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of tasks) {
      if (task.project_id && !task.deleted_at) {
        counts[task.project_id] = (counts[task.project_id] || 0) + 1;
      }
    }
    return counts;
  }, [tasks]);

  if (completedProjects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">No completed projects</p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {completedProjects.map((project) => {
        const taskCount = taskCountsByProject[project.id] || 0;
        const dateStr = formatDate(project.completed_at || project.updated_at);

        return (
          <div
            key={project.id}
            role="button"
            tabIndex={0}
            data-testid="project-card"
            onClick={() => selectProject(project.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectProject(project.id); }}
            className="group/card rounded-lg border border-border bg-card/40 backdrop-blur-xl p-4 transition-colors hover:bg-accent/40 text-left cursor-default"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="text-sm font-medium text-foreground truncate">{project.title}</h3>
              <button
                type="button"
                aria-label="Reopen project"
                onClick={(e) => {
                  e.stopPropagation();
                  updateProject(project.id, { status: 'active' });
                }}
                className="p-0.5 rounded text-muted-foreground/0 group-hover/card:text-muted-foreground/60 hover:!text-foreground transition-colors"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/15 text-primary/70">
                Completed
              </span>
              <span className="text-xs text-muted-foreground">
                {dateStr}
              </span>
              <span className="text-xs text-muted-foreground">
                {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
