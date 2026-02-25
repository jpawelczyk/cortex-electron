import { useEffect, useState } from 'react';
import { Download, Trash2, Loader2, X } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Switch } from '@renderer/components/ui/switch';
import { useStore } from '../../stores';
import type { WhisperModelInfo, WhisperModel, TranscriptionProvider, RecordingMode } from '@shared/recording-types';

export function RecordingTranscriptionSettings() {
  const transcriptionProvider = useStore((s) => s.transcriptionProvider);
  const setTranscriptionProvider = useStore((s) => s.setTranscriptionProvider);
  const openaiApiKey = useStore((s) => s.openaiApiKey);
  const setOpenaiApiKey = useStore((s) => s.setOpenaiApiKey);
  const whisperModel = useStore((s) => s.whisperModel);
  const setWhisperModel = useStore((s) => s.setWhisperModel);
  const defaultRecordingMode = useStore((s) => s.defaultRecordingMode);
  const setDefaultRecordingMode = useStore((s) => s.setDefaultRecordingMode);
  const autoTranscribe = useStore((s) => s.autoTranscribe);
  const setAutoTranscribe = useStore((s) => s.setAutoTranscribe);

  // Local API key state for dirty pattern
  const [apiKeyDraft, setApiKeyDraft] = useState(openaiApiKey);
  const apiKeyDirty = apiKeyDraft !== openaiApiKey;

  // Model list state
  const [models, setModels] = useState<WhisperModelInfo[]>([]);
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    loadModels();
    const cleanup = window.cortex.transcription.onDownloadProgress((data) => {
      setDownloadProgress(data.progress);
    });
    return cleanup;
  }, []);

  async function loadModels() {
    try {
      const list = await window.cortex.transcription.listModels();
      setModels(list);
    } catch {
      // Models unavailable
    }
  }

  async function handleDownload(name: WhisperModel) {
    setDownloadingModel(name);
    setDownloadProgress(0);
    try {
      await window.cortex.transcription.downloadModel(name);
      await loadModels();
    } catch (err) {
      console.error('Model download failed:', err);
    } finally {
      setDownloadingModel(null);
    }
  }

  async function handleDelete(name: WhisperModel) {
    try {
      await window.cortex.transcription.deleteModel(name);
      await loadModels();
    } catch (err) {
      console.error('Model delete failed:', err);
    }
  }

  const providerOptions: { value: TranscriptionProvider; label: string }[] = [
    { value: 'local', label: 'Local' },
    { value: 'api', label: 'OpenAI API' },
  ];

  const modeOptions: { value: RecordingMode; label: string }[] = [
    { value: 'mic', label: 'Mic' },
    { value: 'system', label: 'System Audio' },
    { value: 'both', label: 'Both' },
  ];

  return (
    <div className="rounded-lg border border-border p-4 space-y-6">
      {/* Transcription Provider */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Transcription Provider</Label>
        <div className="flex gap-1">
          {providerOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTranscriptionProvider(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                transcriptionProvider === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* API Key (shown when API selected) */}
      {transcriptionProvider === 'api' && (
        <div className="space-y-2">
          <Label htmlFor="openaiApiKey" className="text-xs text-muted-foreground">OpenAI API Key</Label>
          <div className="flex gap-2">
            <Input
              id="openaiApiKey"
              type="password"
              value={apiKeyDraft}
              onChange={(e) => setApiKeyDraft(e.target.value)}
              placeholder="sk-..."
              className="flex-1"
            />
            {apiKeyDirty && (
              <Button size="sm" onClick={() => setOpenaiApiKey(apiKeyDraft.trim())}>
                Save
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Whisper Model (shown when Local selected) */}
      {transcriptionProvider === 'local' && models.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Whisper Model</Label>
          <div className="space-y-1.5">
            {models.map((model) => (
              <div
                key={model.name}
                className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                  whisperModel === model.name ? 'border-primary' : 'border-border'
                }`}
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => model.downloaded && setWhisperModel(model.name)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{model.name}</span>
                    <span className="text-xs text-muted-foreground">{model.size}</span>
                    {whisperModel === model.name && model.downloaded && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/70">{model.description}</p>
                </button>
                <div className="ml-3 shrink-0">
                  {downloadingModel === model.name ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.round(downloadProgress)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {Math.round(downloadProgress)}%
                      </span>
                    </div>
                  ) : model.downloaded ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                      onClick={() => handleDelete(model.name)}
                      aria-label={`Delete ${model.name} model`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDownload(model.name)}
                      aria-label={`Download ${model.name} model`}
                    >
                      <Download className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Default Recording Mode */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Default Recording Mode</Label>
        <div className="flex gap-1">
          {modeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDefaultRecordingMode(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                defaultRecordingMode === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-Transcribe */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm">Auto-Transcribe</Label>
          <p className="text-xs text-muted-foreground">
            Automatically transcribe recordings when they finish
          </p>
        </div>
        <Switch
          checked={autoTranscribe}
          onCheckedChange={setAutoTranscribe}
          aria-label="Toggle auto-transcribe"
        />
      </div>
    </div>
  );
}
