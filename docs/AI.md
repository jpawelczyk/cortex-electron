# AI Integration

AI-native but never AI-dependent. The app works fully without AI.

## Philosophy

```
┌─────────────────────────────────────────┐
│         AI Layer (optional)             │
│                                          │
│  ┌───────────┐  ┌─────────────────────┐ │
│  │ Local LLM │  │ Cloud API (opt-in)  │ │
│  │ (Ollama)  │  │ (user's API key)    │ │
│  └───────────┘  └─────────────────────┘ │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ External Agent API (OpenClaw, etc) │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          Core App (AI-free)             │
│       SQLite │ Electron │ React         │
└─────────────────────────────────────────┘
```

**Principles:**
- Core app has zero AI dependencies
- All AI features are opt-in
- User controls what data (if any) leaves the device
- External agents access via authenticated API

## AI Settings

```typescript
interface AISettings {
  enabled: boolean;

  // Local AI (Ollama)
  local: {
    enabled: boolean;
    provider: 'ollama' | null;
    model: string;           // e.g., 'llama3.2'
    endpoint: string;        // e.g., 'http://localhost:11434'
  };

  // Cloud AI (user's own API key)
  cloud: {
    enabled: boolean;
    provider: 'openai' | 'anthropic' | null;
    apiKey: string;          // encrypted at rest
    model: string;           // e.g., 'gpt-4o'
  };

  // Agent API (for external agents like OpenClaw)
  agentApi: {
    enabled: boolean;
    port: number;            // e.g., 21234
    apiKey: string;          // for authentication
  };
}
```

## Agent API

Local HTTP server (off by default) for external AI agents:

### Endpoints

```typescript
// Context endpoints (read-only, GET)
GET /api/context/today        // Today's tasks, meetings, daily note
GET /api/context/week         // Week overview
GET /api/context/project/:id  // Project deep-dive
GET /api/context/stakeholder/:id
GET /api/search?q=...         // Full-text search

// CRUD endpoints
GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id

GET    /api/projects
POST   /api/projects
PATCH  /api/projects/:id
DELETE /api/projects/:id

// Similar for: notes, meetings, stakeholders, contexts, daily-notes
```

### Authentication

```typescript
// All requests require API key header
const API_KEY_HEADER = 'x-api-key';

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.headers[API_KEY_HEADER];
  if (!key || key !== settings.agentApi.apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
```

### Response Format

```typescript
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "Error message", "details": { ... } }
```

### Context: Today

```typescript
GET /api/context/today

{
  "date": "2026-02-17",
  "tasks": {
    "today": [...],
    "overdue": [...],
    "completed_today": [...]
  },
  "meetings": [...],
  "daily_note": { ... }
}
```

## Local LLM (Ollama)

For privacy-preserving AI features:

```typescript
interface OllamaClient {
  generate(prompt: string): Promise<string>;
  embed(text: string): Promise<number[]>;
}

async function summarize(text: string): Promise<string> {
  if (!settings.local.enabled) return '';
  
  const response = await fetch(`${settings.local.endpoint}/api/generate`, {
    method: 'POST',
    body: JSON.stringify({
      model: settings.local.model,
      prompt: `Summarize this:\n\n${text}`,
    }),
  });
  
  return response.json().then(r => r.response);
}
```

### Use Cases

| Feature | Local LLM | Cloud LLM |
|---------|-----------|-----------|
| Summarize meeting notes | ✓ | ✓ |
| Extract action items | ✓ | ✓ |
| Smart search (semantic) | ✓ | ✓ |
| Meeting briefing prep | ✓ | ✓ |
| Writing assistance | Limited | ✓ |

## Cloud AI (Optional)

User provides their own API key:

```typescript
async function generateWithCloud(prompt: string): Promise<string> {
  if (!settings.cloud.enabled || !settings.cloud.apiKey) {
    throw new Error('Cloud AI not configured');
  }

  // User explicitly opted in, using their own key
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.cloud.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.cloud.model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  return response.json().then(r => r.choices[0].message.content);
}
```

**Privacy note:** API key is encrypted at rest. User explicitly consents to sending data to cloud provider.

## Future: Proactive Intelligence

Post-MVP features that leverage AI:

| Feature | Description |
|---------|-------------|
| **Meeting briefing** | Auto-generate context before meetings |
| **Smart inbox** | Suggest task categorization |
| **Stale project detection** | "You haven't touched X in 2 weeks" |
| **Daily summary** | Morning briefing of what's ahead |
| **Action item extraction** | Parse meeting notes for tasks |

All proactive features will be:
- Off by default
- Configurable per-feature
- Able to use local or cloud AI
