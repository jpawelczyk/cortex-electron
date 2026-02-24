import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, MonitorSpeaker, ChevronDown, Loader2, ExternalLink } from 'lucide-react';
import { useStore } from '../stores';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import type { RecordingMode } from '@shared/recording-types';

interface RecordingControlsProps {
  meetingId: string;
  audioPath: string | null;
  onRecordingComplete: () => void;
}

function formatDuration(seconds: number): string {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export function RecordingControls({ meetingId, audioPath, onRecordingComplete }: RecordingControlsProps) {
  const recordingStatus = useStore((s) => s.recordingStatus);
  const recordingMeetingId = useStore((s) => s.recordingMeetingId);
  const recordingDuration = useStore((s) => s.recordingDuration);
  const audioSources = useStore((s) => s.audioSources);
  const startRecording = useStore((s) => s.startRecording);
  const stopRecording = useStore((s) => s.stopRecording);
  const tickRecordingDuration = useStore((s) => s.tickRecordingDuration);
  const fetchAudioSources = useStore((s) => s.fetchAudioSources);
  const updateMeeting = useStore((s) => s.updateMeeting);

  const [modeOpen, setModeOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<RecordingMode | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRecordingThisMeeting = recordingStatus === 'recording' && recordingMeetingId === meetingId;

  // Tick duration every second while recording this meeting
  useEffect(() => {
    if (isRecordingThisMeeting) {
      intervalRef.current = setInterval(() => {
        tickRecordingDuration();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRecordingThisMeeting, tickRecordingDuration]);

  async function handleModeSelect(mode: RecordingMode) {
    setModeOpen(false);
    setPermissionError(false);
    try {
      if (mode === 'mic') {
        await startRecording(meetingId, 'mic');
      } else {
        setPendingMode(mode);
        await fetchAudioSources();
        setSourceOpen(true);
      }
    } catch {
      setPermissionError(true);
    }
  }

  async function handleSourceSelect(sourceId: string) {
    setSourceOpen(false);
    try {
      if (pendingMode) {
        await startRecording(meetingId, pendingMode, sourceId);
        setPendingMode(null);
      }
    } catch {
      setPermissionError(true);
    }
  }

  async function handleStop() {
    const savedPath = await stopRecording();
    if (savedPath) {
      onRecordingComplete();
    }
  }

  async function handleDeleteRecording() {
    if (!audioPath) return;
    try {
      await window.cortex.recording.delete(audioPath);
      await updateMeeting(meetingId, { audio_path: null, recording_duration: null });
      onRecordingComplete();
    } catch (err) {
      console.error('[RecordingControls] delete recording failed:', err);
    }
    setConfirmDelete(false);
  }

  // Stopping — saving in progress
  if (recordingStatus === 'stopping') {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Saving recording...</span>
      </div>
    );
  }

  // Recording in progress for this meeting
  if (isRecordingThisMeeting) {
    return (
      <div className="flex items-center gap-3 py-2">
        <span className="flex items-center gap-1.5 text-sm text-destructive">
          <span className="size-2 rounded-full bg-destructive animate-pulse" />
          Recording
        </span>
        <span className="text-sm font-mono text-muted-foreground" data-testid="recording-duration">
          {formatDuration(recordingDuration)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleStop}
          className="gap-1.5"
          aria-label="Stop recording"
        >
          <Square className="size-3 fill-current" />
          Stop
        </Button>
      </div>
    );
  }

  // Existing recording
  if (audioPath) {
    return (
      <div className="flex items-center gap-3 py-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mic className="size-3.5" />
          Recording saved
        </span>
        {confirmDelete ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Delete recording?</span>
            <button
              onClick={handleDeleteRecording}
              className="text-destructive hover:underline"
              aria-label="Confirm delete recording"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Delete recording"
          >
            <Trash2 className="size-3" />
            Delete recording
          </button>
        )}
      </div>
    );
  }

  // Idle — no recording
  return (
    <div className="flex flex-col gap-2 py-2">
      {permissionError && (
        <div className="flex flex-col gap-1.5 text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
          <span>System audio requires "Screen & System Audio Recording" permission.</span>
          <button
            onClick={() => window.cortex.recording.openSystemPrefs()}
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:text-destructive/80 self-start"
          >
            Open Settings & reveal Electron.app
            <ExternalLink className="size-3" />
          </button>
          <span className="text-muted-foreground">Drag Electron.app from Finder into the settings list, then restart.</span>
        </div>
      )}
      <div className="flex items-center gap-2">
      <Popover open={modeOpen} onOpenChange={setModeOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5" aria-label="Start recording">
            <Mic className="size-3.5" />
            Start Recording
            <ChevronDown className="size-3 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          <button
            onClick={() => handleModeSelect('mic')}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
            aria-label="Mic Only"
          >
            <Mic className="size-3.5 text-muted-foreground" />
            Mic Only
          </button>
          <button
            onClick={() => handleModeSelect('system')}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
            aria-label="System Audio"
          >
            <MonitorSpeaker className="size-3.5 text-muted-foreground" />
            System Audio
          </button>
          <button
            onClick={() => handleModeSelect('both')}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
            aria-label="Both"
          >
            <MonitorSpeaker className="size-3.5 text-muted-foreground" />
            Both
          </button>
        </PopoverContent>
      </Popover>

      {/* Source picker for system/both modes */}
      <Popover open={sourceOpen} onOpenChange={(open) => { setSourceOpen(open); if (!open) setPendingMode(null); }}>
        <PopoverTrigger asChild>
          <span />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-1" align="start">
          <p className="text-xs text-muted-foreground px-2 py-1 font-medium">Select audio source</p>
          {audioSources.map((source) => (
            <button
              key={source.id}
              onClick={() => handleSourceSelect(source.id)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md cursor-pointer"
            >
              <MonitorSpeaker className="size-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{source.name}</span>
            </button>
          ))}
          {audioSources.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-2">No sources found</p>
          )}
        </PopoverContent>
      </Popover>
      </div>
    </div>
  );
}
