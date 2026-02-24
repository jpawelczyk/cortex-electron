import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '../lib/utils';

interface TimePickerButtonProps {
  value: string; // "HH:mm"
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
  'data-testid'?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

export function TimePickerButton({ value, onChange, placeholder = 'Time', className, ...props }: TimePickerButtonProps) {
  const [open, setOpen] = useState(false);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  const [hour, minute] = value ? value.split(':') : ['', ''];

  // Scroll to selected values when popover opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        const hourEl = hourRef.current?.querySelector('[data-selected="true"]');
        hourEl?.scrollIntoView({ block: 'center' });
        const minEl = minuteRef.current?.querySelector('[data-selected="true"]');
        minEl?.scrollIntoView({ block: 'center' });
      });
    }
  }, [open]);

  const handleHour = (h: string) => {
    const m = minute || '00';
    onChange(`${h}:${m}`);
  };

  const handleMinute = (m: string) => {
    const h = hour || '09';
    onChange(`${h}:${m}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={props['data-testid']}
          className={cn(
            'inline-flex items-center gap-1 text-xs text-muted-foreground hover:bg-accent/60 rounded-md px-1.5 py-1 transition-colors cursor-default',
            value && 'text-foreground',
            className,
          )}
        >
          <Clock className="size-3.5" />
          {value || placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-0" align="start">
        <div className="flex divide-x divide-border">
          <div ref={hourRef} className="flex-1 h-48 overflow-y-auto py-1 scroll-smooth">
            {HOURS.map(h => (
              <button
                key={h}
                data-selected={h === hour}
                onClick={() => handleHour(h)}
                className={cn(
                  'w-full px-3 py-1 text-sm text-center hover:bg-accent cursor-pointer transition-colors',
                  h === hour ? 'bg-primary/15 text-primary font-medium' : 'text-foreground',
                )}
              >
                {h}
              </button>
            ))}
          </div>
          <div ref={minuteRef} className="flex-1 h-48 overflow-y-auto py-1 scroll-smooth">
            {MINUTES.map(m => (
              <button
                key={m}
                data-selected={m === minute || (!minute && m === '00')}
                onClick={() => handleMinute(m)}
                className={cn(
                  'w-full px-3 py-1 text-sm text-center hover:bg-accent cursor-pointer transition-colors',
                  m === minute ? 'bg-primary/15 text-primary font-medium' : 'text-foreground',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
