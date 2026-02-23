import { describe, it, expect } from 'vitest';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskIdSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectIdSchema,
  CreateContextSchema,
  UpdateContextSchema,
  ContextIdSchema,
  CreateStakeholderSchema,
  UpdateStakeholderSchema,
  StakeholderIdSchema,
  CreateChecklistItemSchema,
  UpdateChecklistItemSchema,
  ChecklistItemIdSchema,
  CreateNoteSchema,
  UpdateNoteSchema,
  NoteIdSchema,
  CreateAIAgentSchema,
  AIAgentIdSchema,
} from './validation';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('TaskIdSchema', () => {
  it('accepts a valid UUID', () => {
    expect(TaskIdSchema.parse(VALID_UUID)).toBe(VALID_UUID);
  });
  it('rejects a non-UUID', () => {
    expect(() => TaskIdSchema.parse('not-a-uuid')).toThrow();
  });
});

describe('CreateTaskSchema', () => {
  it('accepts minimal input (title only)', () => {
    const result = CreateTaskSchema.parse({ title: 'Buy milk' });
    expect(result.title).toBe('Buy milk');
  });

  it('accepts full valid input', () => {
    const result = CreateTaskSchema.parse({
      title: 'Full task',
      notes: 'Some notes',
      status: 'today',
      when_date: '2026-02-23',
      deadline: '2026-03-01',
      project_id: VALID_UUID,
      context_id: VALID_UUID,
      priority: 'P1',
    });
    expect(result.title).toBe('Full task');
    expect(result.status).toBe('today');
    expect(result.priority).toBe('P1');
  });

  it('rejects missing title', () => {
    expect(() => CreateTaskSchema.parse({})).toThrow();
  });

  it('rejects empty title', () => {
    expect(() => CreateTaskSchema.parse({ title: '' })).toThrow();
  });

  it('rejects invalid status', () => {
    expect(() => CreateTaskSchema.parse({ title: 'T', status: 'invalid' })).toThrow();
  });

  it('rejects invalid priority', () => {
    expect(() => CreateTaskSchema.parse({ title: 'T', priority: 'P9' })).toThrow();
  });

  it('rejects invalid project_id format', () => {
    expect(() => CreateTaskSchema.parse({ title: 'T', project_id: 'not-a-uuid' })).toThrow();
  });
});

describe('UpdateTaskSchema', () => {
  it('accepts empty object', () => {
    expect(() => UpdateTaskSchema.parse({})).not.toThrow();
  });

  it('accepts null for nullable fields', () => {
    const result = UpdateTaskSchema.parse({
      project_id: null,
      context_id: null,
      priority: null,
      assignee_id: null,
    });
    expect(result.project_id).toBeNull();
  });

  it('rejects empty title', () => {
    expect(() => UpdateTaskSchema.parse({ title: '' })).toThrow();
  });

  it('rejects invalid status', () => {
    expect(() => UpdateTaskSchema.parse({ status: 'bad' })).toThrow();
  });
});

describe('ProjectIdSchema', () => {
  it('accepts a valid UUID', () => {
    expect(ProjectIdSchema.parse(VALID_UUID)).toBe(VALID_UUID);
  });
  it('rejects a non-UUID', () => {
    expect(() => ProjectIdSchema.parse('bad')).toThrow();
  });
});

describe('CreateProjectSchema', () => {
  it('accepts minimal input', () => {
    const result = CreateProjectSchema.parse({ title: 'My Project' });
    expect(result.title).toBe('My Project');
  });

  it('accepts all fields', () => {
    const result = CreateProjectSchema.parse({
      title: 'Project',
      description: 'Desc',
      status: 'active',
      context_id: VALID_UUID,
    });
    expect(result.status).toBe('active');
  });

  it('rejects missing title', () => {
    expect(() => CreateProjectSchema.parse({})).toThrow();
  });

  it('rejects invalid status', () => {
    expect(() => CreateProjectSchema.parse({ title: 'P', status: 'nope' })).toThrow();
  });
});

describe('UpdateProjectSchema', () => {
  it('accepts empty object', () => {
    expect(() => UpdateProjectSchema.parse({})).not.toThrow();
  });

  it('accepts null description', () => {
    const result = UpdateProjectSchema.parse({ description: null });
    expect(result.description).toBeNull();
  });

  it('rejects empty title', () => {
    expect(() => UpdateProjectSchema.parse({ title: '' })).toThrow();
  });
});

describe('ContextIdSchema', () => {
  it('accepts a valid UUID', () => {
    expect(ContextIdSchema.parse(VALID_UUID)).toBe(VALID_UUID);
  });
  it('rejects a non-UUID', () => {
    expect(() => ContextIdSchema.parse('bad')).toThrow();
  });
});

describe('CreateContextSchema', () => {
  it('accepts minimal input', () => {
    const result = CreateContextSchema.parse({ name: 'Work' });
    expect(result.name).toBe('Work');
  });

  it('accepts optional fields', () => {
    const result = CreateContextSchema.parse({ name: 'Home', color: '#ff0000', icon: 'home' });
    expect(result.color).toBe('#ff0000');
  });

  it('rejects missing name', () => {
    expect(() => CreateContextSchema.parse({})).toThrow();
  });

  it('rejects empty name', () => {
    expect(() => CreateContextSchema.parse({ name: '' })).toThrow();
  });
});

describe('UpdateContextSchema', () => {
  it('accepts empty object', () => {
    expect(() => UpdateContextSchema.parse({})).not.toThrow();
  });

  it('accepts null color and icon', () => {
    const result = UpdateContextSchema.parse({ color: null, icon: null });
    expect(result.color).toBeNull();
    expect(result.icon).toBeNull();
  });
});

describe('StakeholderIdSchema', () => {
  it('accepts a valid UUID', () => {
    expect(StakeholderIdSchema.parse(VALID_UUID)).toBe(VALID_UUID);
  });
  it('rejects a non-UUID', () => {
    expect(() => StakeholderIdSchema.parse('bad')).toThrow();
  });
});

describe('CreateStakeholderSchema', () => {
  it('accepts minimal input', () => {
    const result = CreateStakeholderSchema.parse({ name: 'Alice' });
    expect(result.name).toBe('Alice');
  });

  it('accepts all optional fields', () => {
    const result = CreateStakeholderSchema.parse({
      name: 'Bob',
      organization: 'Acme',
      role: 'CTO',
      email: 'bob@example.com',
      phone: '+1234567890',
      notes: 'Important contact',
      avatar_url: 'https://example.com/avatar.png',
    });
    expect(result.email).toBe('bob@example.com');
  });

  it('rejects missing name', () => {
    expect(() => CreateStakeholderSchema.parse({})).toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => CreateStakeholderSchema.parse({ name: 'X', email: 'not-an-email' })).toThrow();
  });

  it('rejects invalid avatar_url', () => {
    expect(() => CreateStakeholderSchema.parse({ name: 'X', avatar_url: 'not-a-url' })).toThrow();
  });
});

describe('UpdateStakeholderSchema', () => {
  it('accepts empty object', () => {
    expect(() => UpdateStakeholderSchema.parse({})).not.toThrow();
  });

  it('accepts null for nullable fields', () => {
    const result = UpdateStakeholderSchema.parse({ email: null, phone: null });
    expect(result.email).toBeNull();
  });

  it('rejects invalid email', () => {
    expect(() => UpdateStakeholderSchema.parse({ email: 'bad' })).toThrow();
  });
});

describe('ChecklistItemIdSchema', () => {
  it('accepts a valid UUID', () => {
    expect(ChecklistItemIdSchema.parse(VALID_UUID)).toBe(VALID_UUID);
  });
  it('rejects a non-UUID', () => {
    expect(() => ChecklistItemIdSchema.parse('bad')).toThrow();
  });
});

describe('CreateChecklistItemSchema', () => {
  it('accepts valid input', () => {
    const result = CreateChecklistItemSchema.parse({ task_id: VALID_UUID, title: 'Step 1' });
    expect(result.title).toBe('Step 1');
  });

  it('rejects missing task_id', () => {
    expect(() => CreateChecklistItemSchema.parse({ title: 'Step 1' })).toThrow();
  });

  it('rejects invalid task_id', () => {
    expect(() => CreateChecklistItemSchema.parse({ task_id: 'bad', title: 'Step 1' })).toThrow();
  });

  it('rejects empty title', () => {
    expect(() => CreateChecklistItemSchema.parse({ task_id: VALID_UUID, title: '' })).toThrow();
  });
});

describe('UpdateChecklistItemSchema', () => {
  it('accepts empty object', () => {
    expect(() => UpdateChecklistItemSchema.parse({})).not.toThrow();
  });

  it('accepts valid fields', () => {
    const result = UpdateChecklistItemSchema.parse({ title: 'Updated', is_done: true, sort_order: 2 });
    expect(result.is_done).toBe(true);
  });

  it('rejects empty title', () => {
    expect(() => UpdateChecklistItemSchema.parse({ title: '' })).toThrow();
  });
});

describe('NoteIdSchema', () => {
  it('accepts a valid UUID', () => {
    expect(NoteIdSchema.parse(VALID_UUID)).toBe(VALID_UUID);
  });
  it('rejects a non-UUID', () => {
    expect(() => NoteIdSchema.parse('bad')).toThrow();
  });
});

describe('CreateNoteSchema', () => {
  it('accepts minimal input', () => {
    const result = CreateNoteSchema.parse({ title: 'My Note' });
    expect(result.title).toBe('My Note');
  });

  it('rejects missing title', () => {
    expect(() => CreateNoteSchema.parse({})).toThrow();
  });

  it('rejects empty title', () => {
    expect(() => CreateNoteSchema.parse({ title: '' })).toThrow();
  });
});

describe('UpdateNoteSchema', () => {
  it('accepts empty object', () => {
    expect(() => UpdateNoteSchema.parse({})).not.toThrow();
  });

  it('accepts null content', () => {
    const result = UpdateNoteSchema.parse({ content: null });
    expect(result.content).toBeNull();
  });
});

describe('CreateAIAgentSchema', () => {
  it('accepts minimal input', () => {
    const result = CreateAIAgentSchema.parse({ name: 'Agent 1' });
    expect(result.name).toBe('Agent 1');
  });

  it('rejects missing name', () => {
    expect(() => CreateAIAgentSchema.parse({})).toThrow();
  });
});

describe('AIAgentIdSchema', () => {
  it('accepts a valid UUID', () => {
    expect(AIAgentIdSchema.parse(VALID_UUID)).toBe(VALID_UUID);
  });
  it('rejects a non-UUID', () => {
    expect(() => AIAgentIdSchema.parse('bad')).toThrow();
  });
});
