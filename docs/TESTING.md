# Testing Strategy

We test **behavior**, not React. Service layer = high value. "Renders X" = noise.

## Philosophy

### Test Behavior, Not Implementation

We test what the system **does**, not how it looks or how it's wired:

| HIGH VALUE (write these) | LOW VALUE (don't write these) |
|--------------------------|-------------------------------|
| Business logic (services) | "renders X" / DOM presence checks |
| Status transitions, context inheritance | `expect(getByText('Title')).toBeInTheDocument()` |
| Complex interactions (debounce, race conditions) | Store IPC passthrough (`expect(ipc).toHaveBeenCalledWith(...)`) |
| Multi-step flows (delete confirmation, inline creation) | Snapshot tests |
| Filtering/sorting logic | Initial state / default value tests |
| Keyboard navigation | Trivial setter tests (`set(true)` / `set(false)`) |
| Validation (form guards, empty input) | Anything you'd catch in 2 seconds of manual dev |

**The litmus test:** "What breaks if I delete this test?" If nothing meaningful, don't write it.

### Test-Driven, Not "With Tests"

| ❌ "With Tests" | ✅ Test-Driven |
|-----------------|----------------|
| Write code, then add tests | Write test first, then code |
| Tests validate what you built | Tests define what to build |
| Tests bend to match implementation | Implementation bends to pass tests |
| "How do I test this code?" | "What behavior do I need?" |

**The rule:** If you're writing implementation before tests, stop. Write the test first.

### No Gaming the Tests

When a test fails after code changes:

| ❌ Wrong response | ✅ Right response |
|-------------------|-------------------|
| "The test is wrong, let me fix it" | "The code broke expected behavior" |
| Change assertion to match output | Fix the code to match the test |
| Delete the "flaky" test | Understand why it's failing |

**The rule:** Tests are the spec. If you change a test, you're changing the spec — that requires justification, not convenience.

### Meaningful > Coverage Percentage

| ❌ Gaming coverage | ✅ Meaningful coverage |
|--------------------|------------------------|
| 95% coverage, tests assert nothing | 70% coverage, every test has purpose |
| `expect(result).toBeDefined()` | `expect(task.context_id).toBe(project.context_id)` |
| Testing getters/setters | Testing business rules |
| One test per function (checkbox) | Tests per behavior/edge case |

**The rule:** Every test should answer "what breaks if this test is deleted?" If nothing meaningful breaks, delete the test.

### Core Principles

| Principle | Meaning |
|-----------|---------|
| **Tests are specs** | Tests define correct behavior; code conforms to tests |
| **Fast feedback** | Unit tests run in <5 seconds |
| **Test behavior** | What it does, not how it does it |
| **Survive refactoring** | Internal changes shouldn't break tests |
| **Readable as docs** | Test names describe expected behavior |

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

## Coverage Philosophy

**Coverage is a smell detector, not a goal.**

High coverage with bad tests is worse than lower coverage with good tests. Use coverage to find untested code paths, not as a metric to maximize.

### What Must Be Tested

| Area | Why |
|------|-----|
| **Task status transitions** | Core business rules |
| **Context inheritance** | Easy to break, hard to debug |
| **Validation boundaries** | Security + data integrity |
| **Edge cases** | Nulls, empty strings, boundaries |
| **Error paths** | What happens when things fail |

### What We Don't Test

| Area | Why |
|------|-----|
| **"Renders X" / DOM presence** | Visual verification, not behavior. Caught instantly in dev. |
| **Store IPC passthrough** | `store.doThing()` → `expect(ipc).toHaveBeenCalledWith()` just tests Zustand wiring |
| **Initial state / default values** | Trivial, caught by any usage |
| **Trivial setters** | `set(true)` / `set(false)` — no logic to test |
| **Duplicate shared behavior** | Shared hooks (e.g., completion flow) tested once, not per-view |
| **Button → handler wiring** | "Click Bold → editor.toggleBold() called" tests framework, not logic |
| **Simple pass-through** | No logic to test |
| **Framework code** | Trust Electron/React to work |
| **Styling / layout** | Visual review, not unit tests |

### Coverage Guidelines (Not Requirements)

| Layer | Guideline | Focus |
|-------|-----------|-------|
| **Services** | High | Business logic, rules, edge cases |
| **Validation** | High | Every rule, every boundary |
| **Stores** | Low | Only non-trivial logic (toggle, guard, side effects). Skip IPC passthrough and error pattern tests. |
| **Components** | Low | Complex interactions only (debounce, race, keyboard, multi-step). Skip render checks. |
| **Views** | Low | Filtering logic, context inheritance. Test shared behavior (completion flow) once, not per-view. |
| **E2E** | Critical paths only | User journeys that must not break |

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

Using Testing Library for React components. **Test behavior, not rendering:**

```typescript
// Good: tests debounce, race conditions, multi-step flows
describe('TaskItem', () => {
  it('debounces title saves', async () => {
    vi.useFakeTimers();
    render(<TaskItem task={fakeTask()} />);

    const input = screen.getByDisplayValue('Test task');
    await userEvent.clear(input);
    await userEvent.type(input, 'Updated title');

    expect(mockUpdateTask).not.toHaveBeenCalled(); // Not called yet
    act(() => { vi.advanceTimersByTime(500); });
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { title: 'Updated title' });
  });

  it('saves correct task when switching rapidly between tasks', async () => {
    // Race condition test: ensures debounced save targets the right task
  });

  it('shows delete confirmation before deleting', () => {
    // Multi-step flow: first click shows confirm, second click deletes
  });
});

// Bad: don't write these
describe('TaskItem', () => {
  it('renders task title', () => { /* DOM presence check — caught in 2s of dev */ });
  it('shows checkbox', () => { /* Visual verification — no behavior tested */ });
  it('renders priority badge', () => { /* Pure render check */ });
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

- ✅ Write the test BEFORE the implementation
- ✅ Ask "what behavior am I specifying?" before writing
- ✅ Test one behavior per test
- ✅ Use descriptive names (`it('inherits context from project when task added')`)
- ✅ Test edge cases that matter (nulls, boundaries, errors)
- ✅ Let failing tests drive code changes
- ✅ Delete tests that don't justify their existence

### Don't

- ❌ Write code first, tests after
- ❌ Change tests to match broken implementation
- ❌ Write tests just to hit coverage numbers
- ❌ Test implementation details (internal state, private methods)
- ❌ Write "renders X" / DOM presence tests
- ❌ Write store tests that only verify IPC was called
- ❌ Write initial state tests or trivial setter tests
- ❌ Duplicate shared behavior tests across multiple views
- ❌ Use vague assertions (`toBeDefined()`, `toBeTruthy()` without reason)
- ❌ Have tests depend on each other
- ❌ Skip tests instead of understanding why they fail

### The Litmus Test

Before committing any test, ask:

1. **Did I write this test before the implementation?** If no, consider rewriting.
2. **What breaks if I delete this test?** If nothing meaningful, delete it.
3. **Would I change this test if I refactored internals?** If yes, you're testing implementation, not behavior.
4. **Would I catch this in 2 seconds of manual testing?** If yes, skip the test.
