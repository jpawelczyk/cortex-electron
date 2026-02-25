import { StateCreator } from 'zustand';
import type { Project, CreateProjectInput, UpdateProjectInput } from '../../shared/types';

export interface ProjectSlice {
  projects: Project[];
  projectsLoading: boolean;
  projectsError: string | null;

  fetchProjects: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (id: string, input: UpdateProjectInput) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
}

export const createProjectSlice: StateCreator<ProjectSlice> = (set) => ({
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
    try {
      const project = await window.cortex.projects.create(input) as Project;
      set((state) => ({ projects: [...state.projects, project] }));
      return project;
    } catch (err) {
      console.error('[ProjectSlice] createProject failed:', err);
      set({ projectsError: err instanceof Error ? err.message : 'Unknown error' });
      return null as unknown as Project;
    }
  },

  updateProject: async (id, input) => {
    try {
      const project = await window.cortex.projects.update(id, input) as Project;
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? project : p)),
      }));
      return project;
    } catch (err) {
      console.error('[ProjectSlice] updateProject failed:', err);
      set({ projectsError: err instanceof Error ? err.message : 'Unknown error' });
      return null as unknown as Project;
    }
  },

  deleteProject: async (id) => {
    try {
      await window.cortex.projects.delete(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
      }));
    } catch (err) {
      console.error('[ProjectSlice] deleteProject failed:', err);
      set({ projectsError: err instanceof Error ? err.message : 'Unknown error' });
    }
  },
});
