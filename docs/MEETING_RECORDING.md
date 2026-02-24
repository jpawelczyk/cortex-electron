# Meeting Recording & Transcription

Capture meeting audio and generate searchable transcripts, linked to Cortex meetings.

## Goals

1. **One-click recording** — Start/stop recording from meeting detail view
2. **Automatic transcription** — Local Whisper transcription, no cloud APIs
3. **Searchable transcripts** — Integrated with semantic search (embeddings)
4. **Speaker diarization** — Identify different speakers (stretch goal)
5. **Action item extraction** — LLM pass to pull out todos (stretch goal)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Meeting Detail View                         │
│                    [🔴 Start Recording]                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Click
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Recording Service                             │
│   - desktopCapturer (system audio + mic)                        │
│   - MediaRecorder API                                            │
│   - Save to temp file (WebM/MP3)                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Stop Recording
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Transcription Service                           │
│   - Whisper.cpp (local) OR OpenAI Whisper API                   │
│   - Runs in background, shows progress                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Transcript ready
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Meeting Entity                              │
│   - transcript: string (full text)                              │
│   - audio_path: string (local file reference)                   │
│   - transcript_segments: JSON (timestamped chunks)              │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Auto-embed
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Embedding Queue                               │
│   - Chunk transcript                                             │
│   - Embed for semantic search                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Audio Capture

### Electron desktopCapturer

Electron can capture system audio (Teams, Zoom, browser tabs) and microphone:

```typescript
import { desktopCapturer } from 'electron';

interface AudioSource {
  id: string;
  name: string;
  type: 'screen' | 'window';
}

async function getAudioSources(): Promise<AudioSource[]> {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    fetchWindowIcons: false,
  });
  return sources.map(s => ({ id: s.id, name: s.name, type: s.display_id ? 'screen' : 'window' }));
}

async function startSystemAudioCapture(sourceId: string): Promise<MediaStream> {
  // Request system audio from the selected source
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId,
      },
    } as any,
    video: false,
  });
  return stream;
}

async function startMicCapture(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}
```

### Capture Modes

| Mode | What's Captured | Use Case |
|------|-----------------|----------|
| **System Audio** | App audio (Teams, Zoom, etc.) | Remote meetings |
| **Microphone** | Local mic only | In-person meetings |
| **Both** | System + mic merged | Remote with local speaking |

### MediaRecorder

```typescript
class RecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private meetingId: string | null = null;

  async startRecording(meetingId: string, mode: 'system' | 'mic' | 'both'): Promise<void> {
    this.meetingId = meetingId;
    this.chunks = [];

    let stream: MediaStream;
    if (mode === 'system') {
      const sources = await getAudioSources();
      // Let user pick source, or auto-select screen
      stream = await startSystemAudioCapture(sources[0].id);
    } else if (mode === 'mic') {
      stream = await startMicCapture();
    } else {
      // Merge both streams
      const systemStream = await startSystemAudioCapture(/* ... */);
      const micStream = await startMicCapture();
      stream = mergeStreams(systemStream, micStream);
    }

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.onstop = () => this.saveRecording();

    this.mediaRecorder.start(1000); // Chunk every 1s
  }

  async stopRecording(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) throw new Error('Not recording');
      
      this.mediaRecorder.onstop = async () => {
        const path = await this.saveRecording();
        resolve(path);
      };
      
      this.mediaRecorder.stop();
    });
  }

  private async saveRecording(): Promise<string> {
    const blob = new Blob(this.chunks, { type: 'audio/webm' });
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Save to app data directory
    const filename = `recording-${this.meetingId}-${Date.now()}.webm`;
    const filepath = path.join(app.getPath('userData'), 'recordings', filename);
    
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, buffer);
    
    return filepath;
  }
}
```

## Transcription

### Option A: Whisper.cpp (Local, Recommended)

Run Whisper locally via whisper.cpp Node bindings or CLI:

```typescript
import { execFile } from 'child_process';

interface TranscriptSegment {
  start: number;  // seconds
  end: number;
  text: string;
  speaker?: string;  // if diarization enabled
}

interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
  language: string;
}

async function transcribeLocal(audioPath: string): Promise<TranscriptionResult> {
  // Convert to WAV if needed (Whisper prefers 16kHz WAV)
  const wavPath = await convertToWav(audioPath);
  
  return new Promise((resolve, reject) => {
    // Using whisper.cpp CLI
    execFile('whisper', [
      '--model', 'base',           // or 'small', 'medium' for better quality
      '--language', 'auto',        // auto-detect EN/DE
      '--output-json',
      wavPath,
    ], (error, stdout) => {
      if (error) return reject(error);
      
      const result = JSON.parse(stdout);
      resolve({
        text: result.text,
        segments: result.segments.map((s: any) => ({
          start: s.start,
          end: s.end,
          text: s.text.trim(),
        })),
        language: result.language,
      });
    });
  });
}
```

### Option B: OpenAI Whisper API (Cloud)

Faster setup, costs money, requires internet:

```typescript
import OpenAI from 'openai';

async function transcribeCloud(audioPath: string): Promise<TranscriptionResult> {
  const openai = new OpenAI();
  
  const file = await fs.readFile(audioPath);
  
  const response = await openai.audio.transcriptions.create({
    file: new File([file], 'audio.webm', { type: 'audio/webm' }),
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });
  
  return {
    text: response.text,
    segments: response.segments?.map(s => ({
      start: s.start,
      end: s.end,
      text: s.text,
    })) ?? [],
    language: response.language ?? 'unknown',
  };
}
```

### Model Sizes (Whisper.cpp)

| Model | Size | Speed | Quality | RAM |
|-------|------|-------|---------|-----|
| tiny | 75MB | Very fast | Basic | ~1GB |
| base | 142MB | Fast | Good | ~1GB |
| small | 466MB | Medium | Better | ~2GB |
| medium | 1.5GB | Slow | Great | ~5GB |
| large | 2.9GB | Very slow | Best | ~10GB |

**Recommendation:** Start with `base` for speed, offer `small` or `medium` as quality option.

## Schema Changes

```sql
-- Migration: add recording columns to meetings
ALTER TABLE meetings ADD COLUMN audio_path TEXT;
ALTER TABLE meetings ADD COLUMN transcript TEXT;
ALTER TABLE meetings ADD COLUMN transcript_segments TEXT;  -- JSON array
ALTER TABLE meetings ADD COLUMN transcription_status TEXT;  -- 'pending' | 'processing' | 'completed' | 'failed'
ALTER TABLE meetings ADD COLUMN recording_duration INTEGER;  -- seconds
```

```typescript
// Updated Meeting type
interface Meeting {
  // ... existing fields ...
  audio_path: string | null;
  transcript: string | null;
  transcript_segments: TranscriptSegment[] | null;  // stored as JSON
  transcription_status: 'pending' | 'processing' | 'completed' | 'failed' | null;
  recording_duration: number | null;
}
```

## Recording Storage

### Location

```
{app.getPath('userData')}/
└── recordings/
    ├── recording-{meetingId}-{timestamp}.webm
    ├── recording-{meetingId}-{timestamp}.webm
    └── ...
```

### Cleanup Policy

- Keep recordings for N days (configurable, default 30)
- Option to delete recording after transcription
- Manual delete from meeting detail view

## UI Components

### MeetingDetailView Additions

```tsx
function RecordingControls({ meeting }: { meeting: Meeting }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  
  if (isRecording) {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg">
        <div className="size-3 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm font-medium">{formatDuration(duration)}</span>
        <Button variant="destructive" size="sm" onClick={stopRecording}>
          Stop Recording
        </Button>
      </div>
    );
  }
  
  return (
    <Button variant="outline" onClick={startRecording}>
      <Mic className="size-4 mr-2" />
      Start Recording
    </Button>
  );
}

function TranscriptSection({ meeting }: { meeting: Meeting }) {
  if (meeting.transcription_status === 'processing') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>Transcribing...</span>
      </div>
    );
  }
  
  if (!meeting.transcript) {
    return null;
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Transcript</h3>
      
      {/* Playback controls if audio exists */}
      {meeting.audio_path && (
        <AudioPlayer src={meeting.audio_path} segments={meeting.transcript_segments} />
      )}
      
      {/* Timestamped transcript */}
      <div className="space-y-2">
        {meeting.transcript_segments?.map((segment, i) => (
          <div key={i} className="flex gap-3 text-sm">
            <button 
              className="text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => seekTo(segment.start)}
            >
              {formatTimestamp(segment.start)}
            </button>
            <p>{segment.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Settings

```tsx
// In SettingsView
<SettingsSection title="Recording">
  <SettingsRow label="Transcription engine">
    <Select value={transcriptionEngine} onChange={setTranscriptionEngine}>
      <Option value="local">Local (Whisper.cpp)</Option>
      <Option value="openai">OpenAI API</Option>
    </Select>
  </SettingsRow>
  
  <SettingsRow label="Whisper model" disabled={transcriptionEngine !== 'local'}>
    <Select value={whisperModel} onChange={setWhisperModel}>
      <Option value="base">Base (fast, good)</Option>
      <Option value="small">Small (slower, better)</Option>
      <Option value="medium">Medium (slow, great)</Option>
    </Select>
  </SettingsRow>
  
  <SettingsRow label="Keep recordings">
    <Select value={recordingRetention} onChange={setRecordingRetention}>
      <Option value="7">7 days</Option>
      <Option value="30">30 days</Option>
      <Option value="90">90 days</Option>
      <Option value="forever">Forever</Option>
    </Select>
  </SettingsRow>
  
  <SettingsRow label="Auto-transcribe">
    <Switch checked={autoTranscribe} onChange={setAutoTranscribe} />
  </SettingsRow>
</SettingsSection>
```

## Integration with Semantic Search

Transcripts are automatically embedded and searchable:

```typescript
// In embedding-queue.ts, add meeting transcript handling
function getEmbeddableText(entity: Meeting): string {
  const parts = [entity.title];
  
  if (entity.location) parts.push(entity.location);
  if (entity.notes) parts.push(stripHtml(entity.notes));
  if (entity.transcript) parts.push(entity.transcript);  // Include transcript!
  
  return parts.filter(Boolean).join('\n\n');
}
```

Transcripts are chunked (typically longer than notes), so searching "discussed the budget" finds the relevant meeting even if that phrase is buried in a 30-minute transcript.

## Stretch Goals

### Speaker Diarization

Identify who said what using pyannote.audio or similar:

```typescript
interface DiarizedSegment extends TranscriptSegment {
  speaker: string;  // 'SPEAKER_1', 'SPEAKER_2', etc.
}

// Could integrate with stakeholders if we can match voices
```

### Action Item Extraction

Run transcript through LLM to extract action items:

```typescript
async function extractActionItems(transcript: string): Promise<ActionItem[]> {
  const response = await llm.chat({
    messages: [{
      role: 'system',
      content: 'Extract action items from this meeting transcript. Return as JSON array with {task, assignee?, deadline?}.'
    }, {
      role: 'user',
      content: transcript,
    }],
  });
  
  return JSON.parse(response.content);
}

// Auto-create tasks linked to meeting
for (const item of actionItems) {
  await createTask({
    title: item.task,
    project_id: meeting.project_id,
    // Link to meeting somehow
  });
}
```

## File Structure

```
src/
├── main/
│   ├── recording/
│   │   ├── recording-service.ts      # Audio capture
│   │   ├── transcription-service.ts  # Whisper integration
│   │   ├── audio-utils.ts            # Format conversion
│   │   └── cleanup-service.ts        # Old recording deletion
│   └── ipc/
│       └── recording-handlers.ts     # IPC for start/stop/status
├── renderer/
│   └── components/
│       ├── RecordingControls.tsx     # Start/stop UI
│       ├── TranscriptView.tsx        # Display transcript
│       └── AudioPlayer.tsx           # Playback with seek
└── shared/
    └── recording-types.ts            # Shared type definitions
```

## Implementation Plan

### Phase 1: Basic Recording
- [ ] Set up recording service with MediaRecorder
- [ ] Implement mic capture (simplest)
- [ ] Save recordings to app data folder
- [ ] Add recording controls to MeetingDetailView
- [ ] Display recording duration
- [ ] Link audio_path to meeting entity

### Phase 2: Transcription
- [ ] Integrate Whisper.cpp (or start with OpenAI API for speed)
- [ ] Background transcription with progress
- [ ] Store transcript and segments in meeting
- [ ] Display timestamped transcript
- [ ] Basic audio playback

### Phase 3: System Audio
- [ ] Implement desktopCapturer for system audio
- [ ] Source selection UI
- [ ] Merge system + mic streams

### Phase 4: Search Integration
- [ ] Update content extractor to include transcripts
- [ ] Ensure chunking handles long transcripts
- [ ] Test semantic search on transcript content

### Phase 5: Polish
- [ ] Recording retention / cleanup
- [ ] Settings UI
- [ ] Audio player with seek-to-timestamp
- [ ] Error handling (permissions, disk space)

### Stretch
- [ ] Speaker diarization
- [ ] Action item extraction
- [ ] Auto-summarization

## Open Questions

1. **Whisper distribution** — Bundle whisper.cpp binary, or require user install?
2. **Model download** — Download on first use, or bundle with app?
3. **Permissions** — macOS requires screen recording permission for system audio — how to guide user?
4. **Sync** — Should transcripts sync to Supabase, or stay local-only like recordings?
5. **File format** — WebM (native), or convert to MP3 for compatibility?

---

*Last updated: 2026-02-24*
