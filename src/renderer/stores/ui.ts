import { StateCreator } from 'zustand';
import type { TaskStatus } from '@shared/types';

export interface InlineCreateDefaults {
  when_date?: string;
  status?: TaskStatus;
  project_id?: string;
}

export interface UISlice {
  activeContextId: string | null;
  setActiveContext: (id: string | null) => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  quickCaptureOpen: boolean;
  openQuickCapture: () => void;
  closeQuickCapture: () => void;

  activeModal: string | null;
  modalData: unknown;
  openModal: (modal: string, data?: unknown) => void;
  closeModal: () => void;

  selectedTaskId: string | null;
  selectTask: (id: string) => void;
  deselectTask: () => void;

  selectedProjectId: string | null;
  selectProject: (id: string) => void;
  deselectProject: () => void;

  isInlineCreating: boolean;
  inlineCreateDefaults: InlineCreateDefaults | null;
  startInlineCreate: (defaults?: InlineCreateDefaults) => void;
  cancelInlineCreate: () => void;

  isInlineProjectCreating: boolean;
  startInlineProjectCreate: () => void;
  cancelInlineProjectCreate: () => void;

  isInlineNoteCreating: boolean;
  startInlineNoteCreate: () => void;
  cancelInlineNoteCreate: () => void;

  isInlineStakeholderCreating: boolean;
  startInlineStakeholderCreate: () => void;
  cancelInlineStakeholderCreate: () => void;

  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
}

export const createUISlice: StateCreator<UISlice> = (set, get) => ({
  activeContextId: null,
  setActiveContext: (id) => set({ activeContextId: id }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  quickCaptureOpen: false,
  openQuickCapture: () => set({ quickCaptureOpen: true }),
  closeQuickCapture: () => set({ quickCaptureOpen: false }),

  activeModal: null,
  modalData: null,
  openModal: (modal, data) => set({ activeModal: modal, modalData: data ?? null }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  selectedTaskId: null,
  selectTask: (id) => set({ selectedTaskId: id }),
  deselectTask: () => set({ selectedTaskId: null }),

  selectedProjectId: null,
  selectProject: (id) => set({ selectedProjectId: id }),
  deselectProject: () => set({ selectedProjectId: null }),

  isInlineCreating: false,
  inlineCreateDefaults: null,
  startInlineCreate: (defaults) => {
    if (get().isInlineCreating) return;
    set({ isInlineCreating: true, inlineCreateDefaults: defaults ?? null, selectedTaskId: null });
  },
  cancelInlineCreate: () => set({ isInlineCreating: false, inlineCreateDefaults: null }),

  isInlineProjectCreating: false,
  startInlineProjectCreate: () => {
    if (get().isInlineProjectCreating) return;
    set({ isInlineProjectCreating: true });
  },
  cancelInlineProjectCreate: () => set({ isInlineProjectCreating: false }),

  isInlineNoteCreating: false,
  startInlineNoteCreate: () => {
    if (get().isInlineNoteCreating) return;
    set({ isInlineNoteCreating: true });
  },
  cancelInlineNoteCreate: () => set({ isInlineNoteCreating: false }),

  isInlineStakeholderCreating: false,
  startInlineStakeholderCreate: () => {
    if (get().isInlineStakeholderCreating) return;
    set({ isInlineStakeholderCreating: true });
  },
  cancelInlineStakeholderCreate: () => set({ isInlineStakeholderCreating: false }),

  commandPaletteOpen: false,
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
});
