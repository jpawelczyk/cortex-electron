// Core entity types

export type TaskStatus =
  | 'inbox'
  | 'today'
  | 'upcoming'
  | 'anytime'
  | 'someday'
  | 'stale'
  | 'logbook'
  | 'cancelled';

export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  when_date: string | null;
  deadline: string | null;
  project_id: string | null;
  heading_id: string | null;
  context_id: string | null;
  priority: Priority | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
  stale_at: string | null;
}

export interface CreateTaskInput {
  title: string;
  notes?: string;
  status?: TaskStatus;
  when_date?: string;
  deadline?: string;
  project_id?: string;
  heading_id?: string;
  context_id?: string;
  priority?: Priority;
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string | null;
  status?: TaskStatus;
  when_date?: string | null;
  deadline?: string | null;
  project_id?: string | null;
  heading_id?: string | null;
  context_id?: string | null;
  priority?: Priority | null;
  sort_order?: number;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  context_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
}

export type ProjectStatus = 'planned' | 'active' | 'on_hold' | 'blocked' | 'completed' | 'archived';

export interface CreateProjectInput {
  title: string;
  description?: string;
  status?: ProjectStatus;
  context_id?: string;
}

export interface UpdateProjectInput {
  title?: string;
  description?: string | null;
  status?: ProjectStatus;
  context_id?: string | null;
  sort_order?: number;
}

export interface Context {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateContextInput {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateContextInput {
  name?: string;
  color?: string | null;
  icon?: string | null;
  sort_order?: number;
}

export interface Stakeholder {
  id: string;
  name: string;
  organization: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateStakeholderInput {
  name: string;
  organization?: string;
  role?: string;
  email?: string;
  phone?: string;
  notes?: string;
  avatar_url?: string;
}

export interface UpdateStakeholderInput {
  name?: string;
  organization?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  avatar_url?: string | null;
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateChecklistItemInput {
  task_id: string;
  title: string;
}

export interface UpdateChecklistItemInput {
  title?: string;
  is_done?: boolean;
  sort_order?: number;
}
