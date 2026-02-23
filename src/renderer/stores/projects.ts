import { StateCreator } from 'zustand';
import type { Project, CreateProjectInput, UpdateProjectInput, ProjectStatus } from '../../shared/types';

export interface ProjectSlice {
  projects: Project[];
  projectsLoading: boolean;
  projectsError: string | null;

  fetchProjects: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (id: string, input: UpdateProjectInput) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;

  getProjectsByStatus: (status: ProjectStatus) => Project[];
  getProjectsByContext: (contextId: string) => Project[];
}

export const createProjectSlice: StateCreator<ProjectSlice> = (set, get) => ({
  projects: [],
  projectsLoading: false,
  projectsError: null,

  fetchProjects: async () => {
    set({ projectsLoading: true, projectsError: null });
    try {
      const projects = await window.cortex.projects.list() as Project[];
      set({ projects, projectsLoading: false });
    } catch (err) {
      console.error('[ProjectSlice] fetchProjects failed:', err);
      set({ projectsError: err instanceof Error ? err.message : 'Unknown error', projectsLoading: false });
    }
  },

  createProject: async (input) => {
    const project = await window.cortex.projects.create(input) as Project;
    set((state) => ({ projects: [...state.projects, project] }));
    return project;
  },

  updateProject: async (id, input) => {
    const project = await window.cortex.projects.update(id, input) as Project;
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? project : p)),
    }));
    return project;
  },

  deleteProject: async (id) => {
    await window.cortex.projects.delete(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    }));
  },

  getProjectsByStatus: (status) => get().projects.filter((p) => p.status === status),
  getProjectsByContext: (contextId) => get().projects.filter((p) => p.context_id === contextId),
});
