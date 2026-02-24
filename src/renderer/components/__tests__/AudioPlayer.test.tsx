// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { createRef } from 'react';
import { AudioPlayer, type AudioPlayerHandle } from '../AudioPlayer';

// Minimal HTMLMediaElement mock — jsdom doesn't implement media APIs
function mockAudioElement() {
  const proto = window.HTMLMediaElement.prototype;

  Object.defineProperty(proto, 'duration', {
    configurable: true,
    get() {
      return this._duration ?? NaN;
    },
  });

  Object.defineProperty(proto, 'currentTime', {
    configurable: true,
    get() {
      return this._currentTime ?? 0;
    },
    set(v) {
      this._currentTime = v;
    },
  });

  Object.defineProperty(proto, 'paused', {
    configurable: true,
    get() {
      return this._paused !== false;
    },
  });

  proto.play = vi.fn().mockImplementation(function (this: HTMLMediaElement & { _paused: boolean }) {
    this._paused = false;
    return Promise.resolve();
  });

  proto.pause = vi.fn().mockImplementation(function (this: HTMLMediaElement & { _paused: boolean }) {
    this._paused = true;
  });
}

describe('AudioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioElement();
  });

  it('renders play button initially', () => {
    render(<AudioPlayer src="file:///recordings/test.webm" />);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('does not show pause button initially', () => {
    render(<AudioPlayer src="file:///recordings/test.webm" />);
    expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
  });

  it('shows time display', () => {
    render(<AudioPlayer src="file:///recordings/test.webm" />);
    // Should show 00:00 / 00:00 initially
    expect(screen.getByTestId('audio-current-time')).toHaveTextContent('00:00');
    expect(screen.getByTestId('audio-duration')).toHaveTextContent('00:00');
  });

  it('shows pause button after play is clicked', async () => {
    render(<AudioPlayer src="file:///recordings/test.webm" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /play/i }));
    });
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('calls play on the audio element when play is clicked', async () => {
    render(<AudioPlayer src="file:///recordings/test.webm" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /play/i }));
    });
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  });

  it('calls pause on the audio element when pause is clicked', async () => {
    render(<AudioPlayer src="file:///recordings/test.webm" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /play/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    });
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce();
  });

  it('updates current time display on timeupdate event', () => {
    render(<AudioPlayer src="file:///recordings/test.webm" />);
    const audio = document.querySelector('audio') as HTMLMediaElement & { _currentTime: number };
    audio._currentTime = 65;
    act(() => {
      fireEvent(audio, new Event('timeupdate'));
    });
    expect(screen.getByTestId('audio-current-time')).toHaveTextContent('01:05');
  });

  it('updates duration display on loadedmetadata event', () => {
    render(<AudioPlayer src="file:///recordings/test.webm" />);
    const audio = document.querySelector('audio') as HTMLMediaElement & { _duration: number };
    audio._duration = 125;
    act(() => {
      fireEvent(audio, new Event('loadedmetadata'));
    });
    expect(screen.getByTestId('audio-duration')).toHaveTextContent('02:05');
  });

  it('resets to play button when audio ends', async () => {
    render(<AudioPlayer src="file:///recordings/test.webm" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /play/i }));
    });
    act(() => {
      const audio = document.querySelector('audio')!;
      fireEvent(audio, new Event('ended'));
    });
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('calls onTimeUpdate callback with current time', () => {
    const onTimeUpdate = vi.fn();
    render(<AudioPlayer src="file:///recordings/test.webm" onTimeUpdate={onTimeUpdate} />);
    const audio = document.querySelector('audio') as HTMLMediaElement & { _currentTime: number };
    audio._currentTime = 10;
    act(() => {
      fireEvent(audio, new Event('timeupdate'));
    });
    expect(onTimeUpdate).toHaveBeenCalledWith(10);
  });

  it('exposes seekTo via ref', () => {
    const ref = createRef<AudioPlayerHandle>();
    render(<AudioPlayer src="file:///recordings/test.webm" ref={ref} />);
    const audio = document.querySelector('audio') as HTMLMediaElement & { _currentTime: number };
    act(() => {
      ref.current?.seekTo(30);
    });
    expect(audio.currentTime).toBe(30);
  });

  it('renders a progress bar', () => {
    render(<AudioPlayer src="file:///recordings/test.webm" />);
    expect(screen.getByRole('slider', { name: /seek/i })).toBeInTheDocument();
  });
});
