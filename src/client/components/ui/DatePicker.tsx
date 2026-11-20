import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from './Button';
import { Calendar, type CalendarProps } from './Calendar';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { cn } from './utils';

export type { DateRange };

export function parseIsoDate(isoDate: string): Date | undefined {
  if (!isoDate) return undefined;
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return undefined;
  }
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
}

export function formatIsoDate(date: Date | undefined): string {
  return date ? format(date, 'yyyy-MM-dd') : '';
}

export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  dateFormat?: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
  align?: 'start' | 'center' | 'end';
  calendarProps?: Omit<CalendarProps, 'mode' | 'selected' | 'onSelect'>;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecione uma data',
  dateFormat = 'dd/MM/yyyy',
  disabled = false,
  id,
  'aria-label': ariaLabel,
  className,
  align = 'start',
  calendarProps,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (selectedDate: Date | undefined) => {
    onChange?.(selectedDate);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'w-[220px] justify-start text-left text-sm font-normal',
            !value && 'text-slate-500',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-slate-500" />
          <span>
            {value ? format(value, dateFormat, { locale: ptBR }) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          defaultMonth={value}
          {...calendarProps}
        />
      </PopoverContent>
    </Popover>
  );
}
DatePicker.displayName = 'DatePicker';

export interface DatePickerWithRangeProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  dateFormat?: string;
  numberOfMonths?: number;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
  align?: 'start' | 'center' | 'end';
  calendarProps?: Omit<
    CalendarProps,
    'mode' | 'selected' | 'onSelect' | 'numberOfMonths'
  >;
}

export function DatePickerWithRange({
  value,
  onChange,
  placeholder = 'Selecione o período',
  dateFormat = 'dd/MM/yyyy',
  numberOfMonths = 2,
  disabled = false,
  id,
  'aria-label': ariaLabel,
  className,
  align = 'start',
  calendarProps,
}: DatePickerWithRangeProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'w-[260px] justify-start text-left text-sm font-normal',
            !value?.from && 'text-slate-500',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-slate-500" />
          <span className="truncate">
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, dateFormat, { locale: ptBR })} -{' '}
                  {format(value.to, dateFormat, { locale: ptBR })}
                </>
              ) : (
                format(value.from, dateFormat, { locale: ptBR })
              )
            ) : (
              placeholder
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange}
          numberOfMonths={numberOfMonths}
          {...calendarProps}
        />
      </PopoverContent>
    </Popover>
  );
}
DatePickerWithRange.displayName = 'DatePickerWithRange';
