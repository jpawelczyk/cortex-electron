# Testing Strategy

TDD-first development with comprehensive coverage. Every feature is bulletproof before merging.

## Philosophy

| Principle | Meaning |
|-----------|---------|
| **TDD** | Write tests first, then implementation |
| **Fast feedback** | Unit tests run in <5 seconds |
| **Bulletproof core** | Task system has near-100% coverage |
| **Test behavior, not implementation** | Tests survive refactoring |
| **Readable tests** | Tests document expected behavior |

## Stack

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit + integration tests (fast, ESM-native) |
| **Playwright** | E2E tests |
| **Testing Library** | React component tests |
| **MSW** | API mocking (for AI layer tests) |

## Test Types

### Unit Tests

Test individual functions/modules in isolation.

```
src/
├── main/
│   └── services/
│       ├── task.service.ts
│       └── task.service.test.ts    ← Unit tests
├── renderer/
│   └── stores/
│       ├── tasks.ts
│       └── tasks.test.ts           ← Store unit tests
└── shared/
    └── validation/
        ├── task.ts
        └── task.test.ts            ← Validation unit tests
```

**Coverage:** Business logic, validation, pure functions.

### Integration Tests

Test modules working together (e.g., service + database).

```
tests/
└── integration/
    ├── task-crud.test.ts           ← Service + DB
    ├── task-context-inheritance.test.ts
    └── project-task-cascade.test.ts
```

**Coverage:** IPC handlers, database operations, store + IPC.

### E2E Tests

Test full user flows through the UI.

```
tests/
└── e2e/
    ├── quick-capture.spec.ts
    ├── task-lifecycle.spec.ts
    ├── context-filtering.spec.ts
    └── keyboard-navigation.spec.ts
```

**Coverage:** Critical user journeys, keyboard flows.

## Coverage Requirements

| Layer | Min Coverage | Notes |
|-------|--------------|-------|
| **Services (main)** | 90% | Core business logic |
| **Validation (shared)** | 95% | Input sanitization |
| **Stores (renderer)** | 80% | State management |
| **Components** | 70% | UI behavior |
| **E2E critical paths** | 100% | Task CRUD, context switch |

## TDD Workflow

### 1. Red: Write failing test first

```typescript
// task.service.test.ts
describe('TaskService', () => {
  describe('create', () => {
    it('should create task with generated UUID', async () => {
      const task = await taskService.create({ title: 'Test task' });
      
      expect(task.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(task.title).toBe('Test task');
      expect(task.status).toBe('inbox');
      expect(task.created_at).toBeDefined();
    });

    it('should inherit context from project', async () => {
      const project = await projectService.create({ 
        title: 'Work project',
        context_id: workContextId 
      });
      
      const task = await taskService.create({ 
        title: 'Task',
        project_id: project.id 
      });
      
      expect(task.context_id).toBe(workContextId);
    });
  });
});
```

### 2. Green: Write minimal implementation

```typescript
// task.service.ts
export const taskService = {
  create(input: CreateTaskInput): Task {
    const project = input.project_id 
      ? projectService.get(input.project_id) 
      : null;
    
    return db.tasks.insert({
      id: generateId(),
      ...input,
      context_id: project?.context_id ?? input.context_id ?? null,
      status: 'inbox',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
};
```

### 3. Refactor: Clean up, tests still pass

## File Organization

```
cortex-electron/
├── src/
│   ├── main/
│   │   └── services/
│   │       ├── task.service.ts
│   │       └── task.service.test.ts      ← Co-located unit tests
│   ├── renderer/
│   │   ├── components/
│   │   │   └── TaskItem/
│   │   │       ├── TaskItem.tsx
│   │   │       └── TaskItem.test.tsx     ← Component tests
│   │   └── stores/
│   │       ├── tasks.ts
│   │       └── tasks.test.ts
│   └── shared/
│       └── validation/
│           ├── task.ts
│           └── task.test.ts
├── tests/
│   ├── integration/                       ← Cross-module tests
│   │   └── *.test.ts
│   ├── e2e/                              ← Playwright tests
│   │   └── *.spec.ts
│   ├── fixtures/                         ← Test data
│   │   ├── tasks.ts
│   │   └── projects.ts
│   └── helpers/                          ← Test utilities
│       ├── db.ts
│       └── ipc-mock.ts
└── vitest.config.ts
```

## Mocking Strategy

### Database (Integration Tests)

Use in-memory SQLite for fast, isolated tests:

```typescript
// tests/helpers/db.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '@/main/database/schema';

export function createTestDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  
  // Run migrations
  migrate(db, { migrationsFolder: './migrations' });
  
  return db;
}

// In tests
beforeEach(() => {
  testDb = createTestDb();
  taskService = createTaskService(testDb);
});
```

### IPC (Renderer Tests)

Mock the `window.cortex` API:

```typescript
// tests/helpers/ipc-mock.ts
export function mockIpc(overrides: Partial<typeof window.cortex> = {}) {
  const mock = {
    tasks: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((input) => ({
        id: 'test-uuid',
        ...input,
        created_at: new Date().toISOString(),
      })),
      update: vi.fn(),
      delete: vi.fn(),
    },
    // ... other namespaces
    ...overrides,
  };
  
  vi.stubGlobal('window', { cortex: mock });
  
  return mock;
}

// In tests
const ipc = mockIpc();
await store.createTask({ title: 'Test' });
expect(ipc.tasks.create).toHaveBeenCalledWith({ title: 'Test' });
```

### External Services (AI Layer)

Use MSW for HTTP mocking:

```typescript
// tests/helpers/msw.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  http.post('http://localhost:11434/api/generate', () => {
    return HttpResponse.json({ response: 'Mocked AI response' });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Test Fixtures

Reusable test data:

```typescript
// tests/fixtures/tasks.ts
export const fixtures = {
  inboxTask: {
    id: 'task-1',
    title: 'Inbox task',
    status: 'inbox',
    context_id: null,
    project_id: null,
  },
  
  workTask: {
    id: 'task-2', 
    title: 'Work task',
    status: 'today',
    context_id: 'context-work',
    project_id: 'project-1',
  },
  
  // Factory function for custom tasks
  createTask: (overrides = {}) => ({
    id: `task-${Date.now()}`,
    title: 'Test task',
    status: 'inbox',
    context_id: null,
    project_id: null,
    when_date: null,
    deadline: null,
    priority: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  }),
};
```

## Component Testing

Using Testing Library for React components:

```typescript
// TaskItem.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskItem } from './TaskItem';

describe('TaskItem', () => {
  it('renders task title', () => {
    render(<TaskItem task={fixtures.inboxTask} />);
    expect(screen.getByText('Inbox task')).toBeInTheDocument();
  });

  it('shows checkbox unchecked for non-completed tasks', () => {
    render(<TaskItem task={fixtures.inboxTask} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('calls onComplete when checkbox clicked', () => {
    const onComplete = vi.fn();
    render(<TaskItem task={fixtures.inboxTask} onComplete={onComplete} />);
    
    fireEvent.click(screen.getByRole('checkbox'));
    
    expect(onComplete).toHaveBeenCalledWith('task-1');
  });

  it('shows priority badge when priority set', () => {
    const task = fixtures.createTask({ priority: 'P0' });
    render(<TaskItem task={task} />);
    expect(screen.getByText('P0')).toBeInTheDocument();
  });
});
```

## E2E Testing

Playwright for full user flows:

```typescript
// tests/e2e/task-lifecycle.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Task Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Start with clean database
    await page.evaluate(() => window.testHelpers.resetDb());
  });

  test('quick capture creates inbox task', async ({ page }) => {
    // Trigger quick capture
    await page.keyboard.press('Meta+n');
    
    // Type task title
    await page.getByPlaceholder('New task...').fill('Buy groceries');
    await page.keyboard.press('Enter');
    
    // Verify task appears in inbox
    await expect(page.getByText('Buy groceries')).toBeVisible();
    
    // Verify it's in inbox section
    const inbox = page.getByTestId('inbox-section');
    await expect(inbox.getByText('Buy groceries')).toBeVisible();
  });

  test('move task from inbox to today', async ({ page }) => {
    // Create task via quick capture
    await page.keyboard.press('Meta+n');
    await page.getByPlaceholder('New task...').fill('Review docs');
    await page.keyboard.press('Enter');
    
    // Select task
    await page.getByText('Review docs').click();
    
    // Move to today (keyboard shortcut)
    await page.keyboard.press('Meta+t');
    
    // Verify task moved to Today section
    const today = page.getByTestId('today-section');
    await expect(today.getByText('Review docs')).toBeVisible();
  });

  test('complete task moves to logbook', async ({ page }) => {
    // Setup: create a today task
    await page.keyboard.press('Meta+n');
    await page.getByPlaceholder('New task...').fill('Finish report');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Meta+t'); // Move to today
    
    // Complete the task
    await page.getByText('Finish report')
      .locator('..')
      .getByRole('checkbox')
      .click();
    
    // Task should disappear from today
    const today = page.getByTestId('today-section');
    await expect(today.getByText('Finish report')).not.toBeVisible();
    
    // Navigate to logbook
    await page.getByRole('link', { name: 'Logbook' }).click();
    
    // Task should be there
    await expect(page.getByText('Finish report')).toBeVisible();
  });
});
```

## Keyboard Shortcut Testing

Critical for keyboard-first UX:

```typescript
// tests/e2e/keyboard-navigation.spec.ts
test.describe('Keyboard Navigation', () => {
  test('j/k navigates task list', async ({ page }) => {
    // Setup: create multiple tasks
    await createTasks(['Task 1', 'Task 2', 'Task 3']);
    
    // Press j to move down
    await page.keyboard.press('j');
    await expect(page.getByText('Task 1').locator('..')).toHaveClass(/selected/);
    
    await page.keyboard.press('j');
    await expect(page.getByText('Task 2').locator('..')).toHaveClass(/selected/);
    
    // Press k to move up
    await page.keyboard.press('k');
    await expect(page.getByText('Task 1').locator('..')).toHaveClass(/selected/);
  });

  test('/ opens search', async ({ page }) => {
    await page.keyboard.press('/');
    await expect(page.getByPlaceholder('Search...')).toBeFocused();
  });
});
```

## CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Unit + Integration Tests
        run: npm run test:coverage
      
      - name: E2E Tests
        run: npm run test:e2e
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v4
```

## Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/node_modules/**', '**/tests/**'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
    setupFiles: ['./tests/helpers/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Best Practices

### Do

- ✅ Test one thing per test
- ✅ Use descriptive test names (`it('should inherit context from project')`)
- ✅ Test edge cases (null, empty, boundary values)
- ✅ Test error cases
- ✅ Keep tests fast (<100ms per unit test)

### Don't

- ❌ Test implementation details (internal state, private methods)
- ❌ Use vague names (`it('works')`)
- ❌ Have tests depend on each other
- ❌ Mock everything (test real integrations where practical)
- ❌ Skip tests instead of fixing them
