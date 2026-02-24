import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from './ui/button';

export interface AudioPlayerHandle {
  seekTo(seconds: number): void;
}

interface AudioPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '00:00';
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  function AudioPlayer({ src, onTimeUpdate }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useImperativeHandle(ref, () => ({
      seekTo(seconds: number) {
        if (audioRef.current) {
          audioRef.current.currentTime = seconds;
        }
      },
    }));

    function handlePlayPause() {
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setIsPlaying(false);
        });
      }
    }

    function handleTimeUpdate() {
      const audio = audioRef.current;
      if (!audio) return;
      setCurrentTime(audio.currentTime);
      // WebM from MediaRecorder often resolves real duration during playback
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      onTimeUpdate?.(audio.currentTime);
    }

    function handleLoadedMetadata() {
      const audio = audioRef.current;
      if (!audio) return;
      setDuration(audio.duration);
    }

    function handleEnded() {
      setIsPlaying(false);
      setCurrentTime(0);
    }

    function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
      const audio = audioRef.current;
      if (!audio) return;
      const value = Number(e.target.value);
      audio.currentTime = value;
      setCurrentTime(value);
    }

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div className="flex items-center gap-3 w-full">
        {/* Hidden native audio element */}
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          preload="metadata"
        />

        {/* Play/Pause button */}
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="size-3.5 fill-current" />
          ) : (
            <Play className="size-3.5 fill-current" />
          )}
        </Button>

        {/* Progress bar */}
        <input
          type="range"
          role="slider"
          aria-label="Seek"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1 accent-foreground cursor-pointer"
          style={{
            background: `linear-gradient(to right, hsl(var(--foreground)) ${progress}%, hsl(var(--muted)) ${progress}%)`,
          }}
        />

        {/* Time display */}
        <span className="text-xs font-mono text-muted-foreground shrink-0 tabular-nums">
          <span data-testid="audio-current-time">{formatTime(currentTime)}</span>
          {' / '}
          <span data-testid="audio-duration">{formatTime(duration)}</span>
        </span>
      </div>
    );
  }
);
