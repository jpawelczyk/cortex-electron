import type { Task, Project } from '@shared/types';

type TaskLike = Pick<Task, 'context_id' | 'project_id'>;
type ProjectLike = Pick<Project, 'id' | 'context_id'>;

export function getEffectiveContextId(
  task: TaskLike,
  projects: ProjectLike[],
): string | null {
  if (task.project_id) {
    const project = projects.find((p) => p.id === task.project_id);
    if (project) return project.context_id ?? task.context_id;
  }
  return task.context_id;
}

export function filterTasksByContext<T extends TaskLike>(
  tasks: T[],
  activeContextIds: string[],
  projects: ProjectLike[],
): T[] {
  if (activeContextIds.length === 0) return tasks;
  return tasks.filter((t) => {
    const effectiveId = getEffectiveContextId(t, projects);
    return effectiveId !== null && activeContextIds.includes(effectiveId);
  });
}

export function filterProjectsByContext<T extends Pick<Project, 'context_id'>>(
  projects: T[],
  activeContextIds: string[],
): T[] {
  if (activeContextIds.length === 0) return projects;
  return projects.filter(
    (p) => p.context_id !== null && activeContextIds.includes(p.context_id),
  );
}
