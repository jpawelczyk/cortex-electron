import type { CreateAction } from './getCreateAction';
import type { InlineCreateDefaults } from '../stores/ui';
import type { SidebarView } from '../components/Sidebar';

export interface CreateDispatchers {
  setActiveView: (view: SidebarView) => void;
  startInlineCreate: (defaults?: InlineCreateDefaults) => void;
  startInlineProjectCreate: () => void;
  startInlineNoteCreate: () => void;
  startInlineStakeholderCreate: () => void;
}

export function executeCreateAction(action: CreateAction, dispatchers: CreateDispatchers): void {
  switch (action.type) {
    case 'task':
      dispatchers.startInlineCreate(action.defaults);
      break;
    case 'project':
      dispatchers.startInlineProjectCreate();
      break;
    case 'note':
      dispatchers.startInlineNoteCreate();
      break;
    case 'stakeholder':
      dispatchers.startInlineStakeholderCreate();
      break;
    case 'none':
      dispatchers.setActiveView('inbox');
      dispatchers.startInlineCreate();
      break;
  }
}
