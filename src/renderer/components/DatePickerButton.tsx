import { useState, type ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '../lib/utils';

export interface DatePickerAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface DatePickerButtonProps {
  value: string | null;
  onChange: (date: string | null) => void;
  icon: ReactNode;
  label: string;
  className?: string;
  actions?: DatePickerAction[];
}

export function DatePickerButton({ value, onChange, icon, label, className, actions }: DatePickerButtonProps) {
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

  const handleClear = () => {
    onChange(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("inline-flex items-center rounded-md border border-transparent text-xs text-muted-foreground hover:bg-accent/60 transition-colors", className)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className={cn("inline-flex items-center gap-1 px-1.5 py-1 cursor-pointer", value && "w-[4.5rem] justify-center")}
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
        {(actions?.length || value) && (
          <div className="border-t border-border overflow-hidden rounded-b-lg">
            {actions?.map((action) => (
              <button
                key={action.label}
                type="button"
                aria-label={action.label}
                onClick={() => {
                  action.onClick();
                  setOpen(false);
                }}
                className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
            {value && (
              <button
                type="button"
                aria-label={`Clear ${label.toLowerCase()}`}
                onClick={handleClear}
                className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                <X className="size-3" />
                Clear
              </button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
