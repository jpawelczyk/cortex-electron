import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { createTaskSlice, TaskSlice } from './tasks';
import { createProjectSlice, ProjectSlice } from './projects';
import { createContextSlice, ContextSlice } from './contexts';
import { createUISlice, UISlice } from './ui';

export type StoreState = TaskSlice & ProjectSlice & ContextSlice & UISlice;

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...a) => ({
        ...createTaskSlice(...a),
        ...createProjectSlice(...a),
        ...createContextSlice(...a),
        ...createUISlice(...a),
      }),
      {
        name: 'cortex-store',
        partialize: (state) => ({
          activeContextId: state.activeContextId,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    )
  )
);
