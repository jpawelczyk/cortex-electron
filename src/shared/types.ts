// Core entity types

export type TaskStatus = 
  | 'inbox' 
  | 'today' 
  | 'upcoming' 
  | 'anytime' 
  | 'someday' 
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
  status: 'active' | 'completed' | 'archived';
  context_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
}

export type ProjectStatus = 'active' | 'completed' | 'archived';

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
