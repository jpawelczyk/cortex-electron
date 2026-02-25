import type { Task } from '@shared/types';

/** Numeric rank for priority-based sorting (lower = higher priority). */
export function priorityRank(priority: string | null): number {
  if (priority === 'P1') return 0;
  if (priority === 'P2') return 1;
  if (priority === 'P3') return 2;
  return 3;
}

/**
 * Sort tasks by priority (P1 first, then P2, P3, unprioritized last).
 * Preserves relative order for tasks with the same priority (stable sort).
 */
export function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
}
