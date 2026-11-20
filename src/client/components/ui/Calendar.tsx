import { ptBR } from 'date-fns/locale';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from 'lucide-react';
import type * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from './utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function CalendarChevron({
  orientation = 'left',
  className,
}: {
  orientation?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}) {
  if (orientation === 'right') {
    return <ChevronRight className={cn('h-4 w-4', className)} />;
  }
  if (orientation === 'up') {
    return <ChevronUp className={cn('h-4 w-4', className)} />;
  }
  if (orientation === 'down') {
    return <ChevronDown className={cn('h-4 w-4', className)} />;
  }
  return <ChevronLeft className={cn('h-4 w-4', className)} />;
}

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = ptBR,
  components,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale}
      className={cn('p-3', className)}
      classNames={{
        months: 'relative flex flex-col gap-4 sm:flex-row',
        month: 'flex flex-col gap-4',
        month_caption:
          'relative flex h-7 items-center justify-center px-8 text-sm font-medium capitalize text-slate-900',
        caption_label: 'text-sm font-medium',
        nav: 'pointer-events-none absolute inset-x-0 top-0 z-10 flex h-7 items-center justify-between',
        button_previous:
          'pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:opacity-40',
        button_next:
          'pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:opacity-40',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'w-9 rounded-md text-center text-xs font-normal capitalize text-slate-500',
        weeks: 'mt-2 flex flex-col gap-1',
        week: 'flex w-full',
        day: 'relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20',
        day_button:
          'inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-normal text-slate-900 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950',
        selected:
          '[&>button]:bg-slate-900 [&>button]:text-white [&>button]:hover:bg-slate-900 [&>button]:hover:text-white',
        today: '[&>button]:bg-slate-100 [&>button]:font-semibold',
        outside: '[&>button]:text-slate-400 [&>button]:opacity-60',
        disabled:
          '[&>button]:pointer-events-none [&>button]:text-slate-400 [&>button]:opacity-40',
        range_middle:
          '[&>button]:rounded-none [&>button]:bg-slate-100 [&>button]:text-slate-900',
        range_start: '[&>button]:rounded-r-none',
        range_end: '[&>button]:rounded-l-none',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: CalendarChevron,
        ...components,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';
