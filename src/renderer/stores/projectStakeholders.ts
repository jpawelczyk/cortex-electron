import { StateCreator } from 'zustand';

interface ProjectStakeholderLink {
  project_id: string;
  stakeholder_id: string;
  created_at: string;
}

export interface ProjectStakeholderSlice {
  projectStakeholderLinks: ProjectStakeholderLink[];
  fetchProjectStakeholders: (projectId: string) => Promise<void>;
  linkStakeholderToProject: (projectId: string, stakeholderId: string) => Promise<void>;
  unlinkStakeholderFromProject: (projectId: string, stakeholderId: string) => Promise<void>;
}

export const createProjectStakeholderSlice: StateCreator<ProjectStakeholderSlice> = (set) => ({
  projectStakeholderLinks: [],

  fetchProjectStakeholders: async (projectId) => {
    try {
      const links = await window.cortex.projectStakeholders.list(projectId) as ProjectStakeholderLink[];
      set((state) => ({
        projectStakeholderLinks: [
          ...state.projectStakeholderLinks.filter(l => l.project_id !== projectId),
          ...links,
        ],
      }));
    } catch (err) {
      console.error('[ProjectStakeholderSlice] fetchProjectStakeholders failed:', err);
    }
  },

  linkStakeholderToProject: async (projectId, stakeholderId) => {
    try {
      const link = await window.cortex.projectStakeholders.link({ project_id: projectId, stakeholder_id: stakeholderId }) as ProjectStakeholderLink;
      set((state) => ({
        projectStakeholderLinks: [...state.projectStakeholderLinks, link],
      }));
    } catch (err) {
      console.error('[ProjectStakeholderSlice] linkStakeholderToProject failed:', err);
    }
  },

  unlinkStakeholderFromProject: async (projectId, stakeholderId) => {
    try {
      await window.cortex.projectStakeholders.unlink({ project_id: projectId, stakeholder_id: stakeholderId });
      set((state) => ({
        projectStakeholderLinks: state.projectStakeholderLinks.filter(
          l => !(l.project_id === projectId && l.stakeholder_id === stakeholderId)
        ),
      }));
    } catch (err) {
      console.error('[ProjectStakeholderSlice] unlinkStakeholderFromProject failed:', err);
    }
  },
});
