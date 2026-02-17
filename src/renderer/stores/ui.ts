import { StateCreator } from 'zustand';

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

  isInlineCreating: boolean;
  startInlineCreate: () => void;
  cancelInlineCreate: () => void;
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

  isInlineCreating: false,
  startInlineCreate: () => {
    if (get().isInlineCreating) return;
    set({ isInlineCreating: true, selectedTaskId: null });
  },
  cancelInlineCreate: () => set({ isInlineCreating: false }),
});
