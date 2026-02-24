# Handoff: Meeting Recording & Transcription

## Context

You are implementing meeting recording and transcription for **Cortex**, an Electron + React desktop app for personal productivity. The app already has:

- Meetings entity with full CRUD
- Semantic search with embeddings (transcripts should integrate)
- SQLite via PowerSync

## Your Task

Add the ability to record meetings (audio), transcribe them locally using Whisper, and make transcripts searchable.

## Design Document

Read `docs/MEETING_RECORDING.md` thoroughly. It covers:
- Audio capture via Electron desktopCapturer
- MediaRecorder for saving audio
- Whisper.cpp for local transcription
- Schema changes
- UI components
- Integration with semantic search

## Key Requirements

1. **Start/stop recording** from meeting detail view
2. **Local transcription** using Whisper (no cloud dependency for MVP)
3. **Timestamped transcript** display with audio playback
4. **Semantic search integration** — transcripts get embedded and are searchable
5. **Recording storage** in app data folder with configurable retention

## Implementation Phases

### Phase 1: Basic Recording (Start Here)
1. Create `src/main/recording/recording-service.ts`
2. Implement microphone capture using MediaRecorder
3. Save recordings as WebM to `{userData}/recordings/`
4. Add IPC handlers for start/stop/status
5. Add `RecordingControls` component to `MeetingDetailView`
6. Store `audio_path` in meeting entity

**Schema migration:**
```sql
ALTER TABLE meetings ADD COLUMN audio_path TEXT;
ALTER TABLE meetings ADD COLUMN recording_duration INTEGER;
```

### Phase 2: Transcription
1. Create `src/main/recording/transcription-service.ts`
2. Integrate Whisper.cpp CLI or use OpenAI API as fallback
3. Add transcription status to meeting (`pending`, `processing`, `completed`, `failed`)
4. Background processing with progress updates via IPC
5. Store transcript text and timestamped segments

**Schema migration:**
```sql
ALTER TABLE meetings ADD COLUMN transcript TEXT;
ALTER TABLE meetings ADD COLUMN transcript_segments TEXT;  -- JSON
ALTER TABLE meetings ADD COLUMN transcription_status TEXT;
```

### Phase 3: Transcript UI
1. Create `TranscriptView` component showing timestamped segments
2. Create `AudioPlayer` component with seek-to-timestamp
3. Click timestamp → seek audio to that point
4. Add to MeetingDetailView

### Phase 4: Search Integration
1. Update `content-extractor.ts` to include `meeting.transcript`
2. Transcripts will be chunked automatically (they're long)
3. Test: record a meeting, transcribe, search for phrases from transcript

### Phase 5: System Audio (Stretch)
1. Use `desktopCapturer` to capture system audio
2. Add source selection UI
3. Merge system + mic streams for full capture

## Technical Notes

### MediaRecorder Pattern
```typescript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

const chunks: Blob[] = [];
recorder.ondataavailable = (e) => chunks.push(e.data);
recorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  // Save to file
};

recorder.start(1000); // Chunk every second
```

### Whisper.cpp Integration
```typescript
import { execFile } from 'child_process';

// Assume whisper CLI is installed or bundled
execFile('whisper', [
  '--model', 'base',
  '--language', 'auto',
  '--output-json',
  audioPath,
], (err, stdout) => {
  const result = JSON.parse(stdout);
  // result.text, result.segments
});
```

### IPC Handlers Needed
```typescript
// recording-handlers.ts
ipcMain.handle('recording:start', async (_, meetingId: string) => { ... });
ipcMain.handle('recording:stop', async () => { ... });
ipcMain.handle('recording:status', async () => { ... });
ipcMain.handle('transcription:start', async (_, meetingId: string) => { ... });
ipcMain.handle('transcription:status', async (_, meetingId: string) => { ... });
```

### Preload Exposure
```typescript
// preload/index.ts
recording: {
  start: (meetingId: string) => ipcRenderer.invoke('recording:start', meetingId),
  stop: () => ipcRenderer.invoke('recording:stop'),
  getStatus: () => ipcRenderer.invoke('recording:status'),
},
transcription: {
  start: (meetingId: string) => ipcRenderer.invoke('transcription:start', meetingId),
  getStatus: (meetingId: string) => ipcRenderer.invoke('transcription:status', meetingId),
},
```

## Existing Code to Reference

- `src/main/search/embedding-service.ts` — Pattern for background processing
- `src/main/ipc/handlers.ts` — IPC handler patterns
- `src/renderer/views/MeetingDetailView.tsx` — Where to add recording UI
- `src/main/search/content-extractor.ts` — Where to add transcript extraction

## Testing

1. Start recording on a meeting, speak for 30 seconds, stop
2. Verify audio file saved to recordings folder
3. Trigger transcription, verify transcript appears
4. Search for a word you said — should find the meeting
5. Click timestamp in transcript — audio should seek

## Out of Scope (for now)

- Speaker diarization
- Action item extraction
- Real-time transcription (streaming)
- Cloud sync of recordings

## Dependencies to Add

```bash
# If using Whisper.cpp bindings
npm install whisper-node  # or similar

# If using OpenAI as fallback
npm install openai
```

Or shell out to whisper CLI (simpler, requires user to have it installed).

---

**Start with Phase 1.** Get basic mic recording working end-to-end before adding transcription.
