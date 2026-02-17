import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { cn } from '../../lib/utils';
import { buttonVariants } from './button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col',
        month: '-mt-7',
        month_caption: 'flex justify-center items-center h-7',
        caption_label: 'text-sm font-medium',
        nav: 'relative z-10 flex items-center justify-between h-7',
        button_previous:
          'h-7 w-7 inline-flex items-center justify-center rounded-md opacity-50 hover:opacity-100 hover:bg-accent transition-colors',
        button_next:
          'h-7 w-7 inline-flex items-center justify-center rounded-md opacity-50 hover:opacity-100 hover:bg-accent transition-colors',
        month_grid: 'w-full border-collapse space-y-1 mt-4',
        weekdays: 'flex',
        weekday:
          'text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] flex items-center justify-center',
        week: 'flex w-full mt-2',
        day: 'relative p-0 w-8 h-8 text-center text-sm focus-within:relative focus-within:z-20',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-8 w-8 p-0 font-normal aria-selected:opacity-100',
        ),
        range_end: 'day-range-end',
        selected:
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground [&>button]:focus:bg-primary [&>button]:focus:text-primary-foreground',
        today: '[&>button]:bg-accent [&>button]:text-accent-foreground',
        outside:
          'day-outside text-muted-foreground/50 [&>button]:aria-selected:bg-accent/50 [&>button]:aria-selected:text-muted-foreground',
        disabled: 'text-muted-foreground/50',
        range_middle:
          '[&>button]:aria-selected:bg-accent [&>button]:aria-selected:text-accent-foreground',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
