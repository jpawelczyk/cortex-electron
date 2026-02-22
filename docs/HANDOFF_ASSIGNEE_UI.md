# Handoff: Task Assignee UI

## Context

Tasks have an `assignee_id` field but no UI to set it. Need a simple selector to assign tasks to AI agents.

## What to Build

### 1. Fetch AI Agents in Store

Add to `src/renderer/stores/ai-agents.ts` (or create if not exists):

```typescript
import { create } from 'zustand';
import { useDatabase } from '../hooks/useDatabase';

interface AIAgent {
  id: string;
  name: string;
}

interface AIAgentsStore {
  agents: AIAgent[];
  loading: boolean;
  fetchAgents: () => Promise<void>;
}

export const useAIAgentsStore = create<AIAgentsStore>((set) => ({
  agents: [],
  loading: false,
  fetchAgents: async () => {
    set({ loading: true });
    const db = useDatabase();
    const agents = await db.getAll<AIAgent>(
      'SELECT id, name FROM ai_agents WHERE revoked_at IS NULL ORDER BY name'
    );
    set({ agents, loading: false });
  },
}));
```

### 2. Add Assignee Selector to Task Detail

In `src/renderer/views/TaskDetailView.tsx` (or wherever task editing happens):

```typescript
import { useAIAgentsStore } from '../stores/ai-agents';

// In component:
const { agents } = useAIAgentsStore();
const currentUser = useAuthStore((s) => s.user);

// In the form:
<div className="space-y-2">
  <Label>Assignee</Label>
  <Select 
    value={task.assignee_id ?? 'unassigned'} 
    onValueChange={(val) => updateTask({ assignee_id: val === 'unassigned' ? null : val })}
  >
    <SelectTrigger>
      <SelectValue placeholder="Unassigned" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="unassigned">Unassigned</SelectItem>
      <SelectItem value={currentUser?.id}>Me</SelectItem>
      {agents.map((agent) => (
        <SelectItem key={agent.id} value={agent.id}>
          {agent.name} (AI)
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### 3. Show Assignee in Task List (Optional)

In `TaskItem.tsx`, show a small badge if assigned to AI:

```typescript
{task.assignee_id && task.assignee_id !== currentUser?.id && (
  <Badge variant="secondary" className="text-xs">
    🤖 AI
  </Badge>
)}
```

## Files to Modify

- `src/renderer/stores/ai-agents.ts` — Fetch agents
- `src/renderer/views/TaskDetailView.tsx` — Add assignee selector
- `src/renderer/components/TaskItem.tsx` — Optional: show assignee badge

## Success Criteria

1. User can see dropdown with "Unassigned", "Me", and AI agents
2. Selecting an agent sets `assignee_id` on the task
3. Task syncs to Supabase with assignee_id
4. Agent daemon detects the assignment

## Notes

- Keep it simple — just a dropdown, no fancy UI
- The AI agents list comes from `ai_agents` table (already syncing)
- Make sure to fetch agents on mount or when opening task detail
