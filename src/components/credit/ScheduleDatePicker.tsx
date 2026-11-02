import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { parseCreditDate } from '../../lib/credit/dates';
import { cn } from '../../lib/utils';

type ScheduleDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  minDate?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
};

const MONTHS = [
  'ianuarie',
  'februarie',
  'martie',
  'aprilie',
  'mai',
  'iunie',
  'iulie',
  'august',
  'septembrie',
  'octombrie',
  'noiembrie',
  'decembrie',
];

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const YEARS_PER_PAGE = 12;

type ViewMode = 'month' | 'year';

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function formatDisplay(value: string): string {
  const date = parseCreditDate(value);
  if (!date) return value;
  return date.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

type NavButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
};

function NavButton({ label, onClick, disabled = false, children }: NavButtonProps) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
      >
        {children}
      </button>
      {!disabled && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
        >
          {label}
        </span>
      )}
    </div>
  );
}

export function ScheduleDatePicker({
  value,
  onChange,
  options,
  placeholder = 'Selectează data',
  minDate,
  align = 'left',
  disabled = false,
}: ScheduleDatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ViewMode>('month');

  const { optionByKey, availableMonths, minMonth, maxMonth, minDateValue } = useMemo(() => {
    const map = new Map<string, string>();
    const months = new Set<string>();
    let min: Date | null = null;
    let max: Date | null = null;

    for (const option of options) {
      const date = parseCreditDate(option);
      if (!date) continue;
      map.set(dateKey(date), option);
      months.add(monthKey(date.getFullYear(), date.getMonth()));
      if (!min || date < min) min = date;
      if (!max || date > max) max = date;
    }

    return {
      optionByKey: map,
      availableMonths: months,
      minMonth: min ? new Date(min.getFullYear(), min.getMonth(), 1) : null,
      maxMonth: max ? new Date(max.getFullYear(), max.getMonth(), 1) : null,
      minDateValue: parseCreditDate(minDate),
    };
  }, [options, minDate]);

  const selectedDate = parseCreditDate(value);
  const fallbackDate = (() => {
    const preferred = selectedDate ?? minDateValue ?? new Date();
    const monthStart = new Date(preferred.getFullYear(), preferred.getMonth(), 1);
    if (minMonth && monthStart < minMonth) return minMonth;
    if (maxMonth && monthStart > maxMonth) return maxMonth;
    return monthStart;
  })();

  const [viewYear, setViewYear] = useState(fallbackDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(fallbackDate.getMonth());
  const [yearPageStart, setYearPageStart] = useState(
    Math.floor(fallbackDate.getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE
  );

  useEffect(() => {
    if (!open) return;
    setMode('month');

    const preferred = parseCreditDate(value) ?? minDateValue ?? new Date();
    const monthStart = new Date(preferred.getFullYear(), preferred.getMonth(), 1);
    const clamped =
      minMonth && monthStart < minMonth
        ? minMonth
        : maxMonth && monthStart > maxMonth
          ? maxMonth
          : monthStart;

    setViewYear(clamped.getFullYear());
    setViewMonth(clamped.getMonth());
    setYearPageStart(Math.floor(clamped.getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE);
  }, [open, value, minDateValue, minMonth, maxMonth]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const viewDate = new Date(viewYear, viewMonth, 1);
  const canGoPrevMonth = minMonth ? viewDate > minMonth : true;
  const canGoNextMonth = maxMonth ? viewDate < maxMonth : true;

  const minYear = minMonth?.getFullYear();
  const maxYear = maxMonth?.getFullYear();

  const selectedKey = selectedDate ? dateKey(selectedDate) : null;

  const cells: Array<Date | null> = useMemo(() => {
    const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const result: Array<Date | null> = Array.from({ length: firstWeekday }, () => null);

    for (let day = 1; day <= daysInMonth; day += 1) {
      result.push(new Date(viewYear, viewMonth, day));
    }
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [viewYear, viewMonth]);

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    if (minMonth && next < minMonth) return;
    if (maxMonth && next > maxMonth) return;
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const jumpToStart = () => {
    if (!minMonth) return;
    setViewYear(minMonth.getFullYear());
    setViewMonth(minMonth.getMonth());
  };

  const jumpToEnd = () => {
    if (!maxMonth) return;
    setViewYear(maxMonth.getFullYear());
    setViewMonth(maxMonth.getMonth());
  };

  const openYearSelect = () => {
    setYearPageStart(Math.floor(viewYear / YEARS_PER_PAGE) * YEARS_PER_PAGE);
    setMode('year');
  };

  const selectYear = (year: number) => {
    let nextMonth = viewMonth;
    if (!availableMonths.has(monthKey(year, nextMonth)) && availableMonths.size > 0) {
      const firstAvailable = [...availableMonths]
        .filter(key => key.startsWith(`${year}-`))
        .sort()[0];
      if (firstAvailable) nextMonth = Number(firstAvailable.split('-')[1]) - 1;
    }
    setViewYear(year);
    setViewMonth(nextMonth);
    setMode('month');
  };

  const handleSelect = (date: Date) => {
    const option = optionByKey.get(dateKey(date));
    if (!option) return;
    if (minDateValue && date < minDateValue) return;
    onChange(option);
    setOpen(false);
  };

  const years = Array.from({ length: YEARS_PER_PAGE }, (_, index) => yearPageStart + index);
  const firstShownYear =
    minYear !== undefined ? Math.max(yearPageStart, minYear) : yearPageStart;
  const lastShownYear =
    maxYear !== undefined
      ? Math.min(yearPageStart + YEARS_PER_PAGE - 1, maxYear)
      : yearPageStart + YEARS_PER_PAGE - 1;
  const yearPageLabel =
    firstShownYear === lastShownYear
      ? `${firstShownYear}`
      : `${firstShownYear} – ${lastShownYear}`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'group flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5',
          'text-left text-sm shadow-sm transition-all duration-150',
          'focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/15',
          open
            ? 'border-blue-500 ring-4 ring-blue-500/10'
            : 'border-slate-200 hover:border-slate-300 hover:shadow',
          value ? 'text-slate-900' : 'text-slate-400',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarDays
            className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              open ? 'text-blue-500' : 'text-slate-400 group-hover:text-blue-500'
            )}
          />
          <span className="truncate font-medium">{value ? formatDisplay(value) : placeholder}</span>
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
            open && 'rotate-180 text-blue-500'
          )}
        />
      </button>

      {open && (
        <div
          role="dialog"
          className={cn(
            'absolute top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl',
            'border border-slate-200 bg-white shadow-xl shadow-slate-900/10',
            'animate-[fadeSlideIn_150ms_ease-out]',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {mode === 'month' ? (
            <>
              <div className="flex items-center justify-between gap-1 rounded-t-2xl border-b border-slate-100 px-2.5 py-2">
                <div className="flex items-center">
                  <NavButton
                    label="Începutul scadențarului"
                    onClick={jumpToStart}
                    disabled={!minMonth || viewDate <= minMonth}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </NavButton>
                  <NavButton
                    label="Luna anterioară"
                    onClick={() => shiftMonth(-1)}
                    disabled={!canGoPrevMonth}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </NavButton>
                </div>

                <button
                  type="button"
                  onClick={openYearSelect}
                  title="Alege anul"
                  className="group/title flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold capitalize text-slate-800 transition-colors hover:bg-slate-100"
                >
                  <span>
                    {MONTHS[viewMonth]} {viewYear}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover/title:text-slate-700" />
                </button>

                <div className="flex items-center">
                  <NavButton
                    label="Luna următoare"
                    onClick={() => shiftMonth(1)}
                    disabled={!canGoNextMonth}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </NavButton>
                  <NavButton
                    label="Sfârșitul scadențarului"
                    onClick={jumpToEnd}
                    disabled={!maxMonth || viewDate >= maxMonth}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </NavButton>
                </div>
              </div>

              <div className="px-3 pb-3 pt-2">
                <div className="mb-1 grid grid-cols-7">
                  {WEEKDAYS.map((day, index) => (
                    <span
                      key={`${day}-${index}`}
                      className="flex h-7 items-center justify-center text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                    >
                      {day}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {cells.map((date, index) => {
                    if (!date) return <span key={`empty-${index}`} className="h-9" />;

                    const option = optionByKey.get(dateKey(date));
                    const isSelected = option !== undefined && dateKey(date) === selectedKey;
                    const belowMin = minDateValue ? date < minDateValue : false;
                    const isAvailable = option !== undefined && !belowMin;

                    return (
                      <button
                        key={dateKey(date)}
                        type="button"
                        onClick={() => handleSelect(date)}
                        disabled={!isAvailable}
                        aria-label={date.toLocaleDateString('ro-RO')}
                        aria-pressed={isSelected}
                        title={isAvailable ? 'Data ratei' : undefined}
                        className={cn(
                          'relative flex h-9 items-center justify-center rounded-lg text-sm transition-all duration-100',
                          isSelected
                            ? 'bg-blue-600 font-semibold text-white shadow-sm shadow-blue-600/30'
                            : isAvailable
                              ? 'font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                              : 'cursor-not-allowed text-slate-300'
                        )}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 rounded-t-2xl border-b border-slate-100 px-2.5 py-2">
                <NavButton
                  label="Anii anteriori"
                  onClick={() => setYearPageStart(start => start - YEARS_PER_PAGE)}
                  disabled={minYear !== undefined && yearPageStart <= minYear}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </NavButton>
                <p className="text-sm font-semibold text-slate-800">{yearPageLabel}</p>
                <NavButton
                  label="Anii următori"
                  onClick={() => setYearPageStart(start => start + YEARS_PER_PAGE)}
                  disabled={
                    maxYear !== undefined &&
                    yearPageStart + YEARS_PER_PAGE > maxYear
                  }
                >
                  <ChevronsRight className="h-4 w-4" />
                </NavButton>
              </div>

              <div className="p-3">
                <div className="grid grid-cols-3 gap-1.5">
                  {years.map(year => {
                    const isSelected = year === viewYear;
                    const isAvailable =
                      (minYear === undefined || year >= minYear) &&
                      (maxYear === undefined || year <= maxYear);

                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => selectYear(year)}
                        disabled={!isAvailable}
                        aria-pressed={isSelected}
                        className={cn(
                          'flex h-9 items-center justify-center rounded-lg text-sm transition-all duration-100',
                          isSelected
                            ? 'bg-blue-600 font-semibold text-white shadow-sm shadow-blue-600/30'
                            : isAvailable
                              ? 'font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                              : 'cursor-not-allowed text-slate-300'
                        )}
                      >
                        {year}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setMode('month')}
                  className="mt-2 w-full rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                >
                  Înapoi la calendar
                </button>
              </div>
            </>
          )}

          <div className="flex items-center gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/70 px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <p className="text-[11px] text-slate-500">Doar datele din scadențar sunt selectabile</p>
          </div>
        </div>
      )}
    </div>
  );
}
