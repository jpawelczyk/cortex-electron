import { useState, type ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '../lib/utils';

interface DatePickerButtonProps {
  value: string | null;
  onChange: (date: string | null) => void;
  icon: ReactNode;
  label: string;
  className?: string;
}

export function DatePickerButton({ value, onChange, icon, label, className }: DatePickerButtonProps) {
  const [open, setOpen] = useState(false);

  const selected = value ? parseISO(value) : undefined;

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(format(day, 'yyyy-MM-dd'));
    } else {
      onChange(null);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("group/date inline-flex items-center rounded-md text-xs text-muted-foreground hover:bg-accent/60 transition-colors", className)}>
        {value && (
          <button
            type="button"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={handleClear}
            className="inline-flex items-center justify-center pl-1 py-1 text-muted-foreground/0 group-hover/date:text-muted-foreground/60 hover:!text-muted-foreground transition-colors cursor-pointer"
          >
            <X className="size-3" />
          </button>
        )}
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex items-center gap-1 px-1.5 py-1 cursor-pointer"
          >
            {icon}
            {value && <span>{format(parseISO(value), 'MMM d')}</span>}
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}
