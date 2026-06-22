import { createSignal, For, Show } from 'solid-js';
import {
  getMonday,
  getSunday,
  getToday,
  isSameDay,
  formatDateShort,
  prevWeek,
  nextWeek,
  getMonthRange,
} from '../utils/dateUtils';
import type { DateRange } from '../utils/dateUtils';

interface DateRangePickerProps {
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

type SelectMode = 'start' | 'end';
type PresetMode = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

interface MonthData {
  year: number;
  month: number;
  grid: (number | null)[];
  weeks: (number | null)[][] ;
}

function buildMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));

  let startDow = firstDay.getUTCDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const daysInMonth = lastDay.getUTCDate();
  const grid: (number | null)[] = [];

  for (let i = 0; i < startDow; i++) {
    grid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push(d);
  }

  const remainder = grid.length % 7;
  if (remainder > 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      grid.push(null);
    }
  }

  return grid;
}

function gridToWeeks(grid: (number | null)[]): (number | null)[][] {
  const rows: (number | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) {
    rows.push(grid.slice(i, i + 7));
  }
  return rows;
}

function nextMonthYear(year: number, month: number): { year: number; month: number } {
  if (month === 11) return { year: year + 1, month: 0 };
  return { year, month: month + 1 };
}

function prevMonthYear(year: number, month: number): { year: number; month: number } {
  if (month === 0) return { year: year - 1, month: 11 };
  return { year, month: month - 1 };
}

export default function DateRangePicker(props: DateRangePickerProps) {
  const today = getToday();
  const [open, setOpen] = createSignal(false);

  // viewMonth/viewYear represent the LEFT month of the pair
  const [viewMonth, setViewMonth] = createSignal(props.range.start.getUTCMonth());
  const [viewYear, setViewYear] = createSignal(props.range.start.getUTCFullYear());
  const [selectMode, setSelectMode] = createSignal<SelectMode>('start');
  const [presetMode, setPresetMode] = createSignal<PresetMode>('thisMonth');
  const [tempStart, setTempStart] = createSignal<Date | null>(null);
  const [hoveredDate, setHoveredDate] = createSignal<Date | null>(null);

  // Left month data
  const leftMonth = (): MonthData => {
    const y = viewYear();
    const m = viewMonth();
    const grid = buildMonthGrid(y, m);
    return { year: y, month: m, grid, weeks: gridToWeeks(grid) };
  };

  // Right month data (left + 1)
  const rightMonth = (): MonthData => {
    const { year, month } = nextMonthYear(viewYear(), viewMonth());
    const grid = buildMonthGrid(year, month);
    return { year, month, grid, weeks: gridToWeeks(grid) };
  };

  function dateFromDay(year: number, month: number, day: number | null): Date | null {
    if (day === null) return null;
    return new Date(Date.UTC(year, month, day));
  }

  function isDayInSelectedRange(year: number, month: number, day: number | null): boolean {
    const d = dateFromDay(year, month, day);
    if (!d) return false;

    // During selection (has temp start, waiting for end)
    const ts = tempStart();
    if (ts && selectMode() === 'end') {
      const hd = hoveredDate();
      if (hd) {
        const rangeStart = ts < hd ? ts : hd;
        const rangeEnd = ts < hd ? hd : ts;
        return d > rangeStart && d < rangeEnd;
      }
      return false;
    }

    // After selection (both start and end are set)
    return d > props.range.start && d < props.range.end;
  }

  function isDayRangeStart(year: number, month: number, day: number | null): boolean {
    const d = dateFromDay(year, month, day);
    if (!d) return false;

    const ts = tempStart();
    if (ts && selectMode() === 'end') {
      return isSameDay(d, ts);
    }
    return isSameDay(d, props.range.start);
  }

  function isDayRangeEnd(year: number, month: number, day: number | null): boolean {
    const d = dateFromDay(year, month, day);
    if (!d) return false;

    const ts = tempStart();
    if (ts && selectMode() === 'end') {
      const hd = hoveredDate();
      if (hd) {
        const rangeEnd = ts < hd ? hd : ts;
        return isSameDay(d, rangeEnd);
      }
      return false;
    }
    return isSameDay(d, props.range.end);
  }

  function isToday(year: number, month: number, day: number | null): boolean {
    const d = dateFromDay(year, month, day);
    if (!d) return false;
    return isSameDay(d, today);
  }

  function isWeekendFull(year: number, month: number, day: number | null): boolean {
    const d = dateFromDay(year, month, day);
    if (!d) return false;
    const dow = d.getUTCDay();
    return dow === 0 || dow === 6;
  }

  function handleDayClick(year: number, month: number, day: number | null) {
    const d = dateFromDay(year, month, day);
    if (!d) return;

    if (selectMode() === 'start') {
      setTempStart(d);
      setSelectMode('end');
      // Show the picked date's month as the left panel
      setViewMonth(d.getUTCMonth());
      setViewYear(d.getUTCFullYear());
    } else {
      // End selection
      const start = tempStart()!;
      let rangeStart: Date;
      let rangeEnd: Date;
      if (d < start) {
        rangeStart = d;
        rangeEnd = start;
      } else {
        rangeStart = start;
        rangeEnd = d;
      }
      rangeStart = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate()));
      rangeEnd = new Date(Date.UTC(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth(), rangeEnd.getUTCDate()));

      props.onRangeChange({ start: rangeStart, end: rangeEnd });
      setPresetMode('custom');
      setTempStart(null);
      setSelectMode('start');
      setHoveredDate(null);
      setOpen(false);
    }
  }

  function handlePrevMonth() {
    const prev = prevMonthYear(viewYear(), viewMonth());
    setViewMonth(prev.month);
    setViewYear(prev.year);
  }

  function handleNextMonth() {
    // Move left month forward so the pair shifts
    const next = nextMonthYear(viewYear(), viewMonth());
    setViewMonth(next.month);
    setViewYear(next.year);
  }

  function handleThisWeek() {
    const monday = getMonday(today);
    const sunday = getSunday(today);
    setViewMonth(monday.getUTCMonth());
    setViewYear(monday.getUTCFullYear());
    setPresetMode('thisWeek');
    props.onRangeChange({ start: monday, end: sunday });
    setOpen(false);
  }

  function handleLastWeek() {
    const thisWeekMon = getMonday(today);
    const lastWeek = prevWeek({ start: thisWeekMon, end: getSunday(today) });
    setViewMonth(lastWeek.start.getUTCMonth());
    setViewYear(lastWeek.start.getUTCFullYear());
    setPresetMode('lastWeek');
    props.onRangeChange({ start: lastWeek.start, end: lastWeek.end });
    setOpen(false);
  }

  function handleThisMonth() {
    const range = getMonthRange(today);
    setViewMonth(today.getUTCMonth());
    setViewYear(today.getUTCFullYear());
    setPresetMode('thisMonth');
    props.onRangeChange(range);
    setOpen(false);
  }

  function handleLastMonth() {
    const lastMonthDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const range = getMonthRange(lastMonthDate);
    setViewMonth(lastMonthDate.getUTCMonth());
    setViewYear(lastMonthDate.getUTCFullYear());
    setPresetMode('lastMonth');
    props.onRangeChange(range);
    setOpen(false);
  }

  function handlePrevRange() {
    const preset = presetMode();
    if (preset === 'thisWeek' || preset === 'lastWeek') {
      const prev = prevWeek(props.range);
      setViewMonth(prev.start.getUTCMonth());
      setViewYear(prev.start.getUTCFullYear());
      props.onRangeChange(prev);
    } else if (preset === 'thisMonth' || preset === 'lastMonth') {
      const startOfMonth = new Date(Date.UTC(props.range.start.getUTCFullYear(), props.range.start.getUTCMonth() - 1, 1));
      const endOfMonth = new Date(Date.UTC(startOfMonth.getUTCFullYear(), startOfMonth.getUTCMonth() + 1, 0));
      setViewMonth(startOfMonth.getUTCMonth());
      setViewYear(startOfMonth.getUTCFullYear());
      props.onRangeChange({ start: startOfMonth, end: endOfMonth });
    } else {
      const start = props.range.start;
      const end = props.range.end;
      const durationMs = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - durationMs - 86400000);
      const prevEnd = new Date(prevStart.getTime() + durationMs);
      setViewMonth(prevStart.getUTCMonth());
      setViewYear(prevStart.getUTCFullYear());
      props.onRangeChange({ start: prevStart, end: prevEnd });
    }
  }

  function handleNextRange() {
    const preset = presetMode();
    if (preset === 'thisWeek' || preset === 'lastWeek') {
      const next = nextWeek(props.range);
      setViewMonth(next.start.getUTCMonth());
      setViewYear(next.start.getUTCFullYear());
      props.onRangeChange(next);
    } else if (preset === 'thisMonth' || preset === 'lastMonth') {
      const startOfMonth = new Date(Date.UTC(props.range.start.getUTCFullYear(), props.range.start.getUTCMonth() + 1, 1));
      const endOfMonth = new Date(Date.UTC(startOfMonth.getUTCFullYear(), startOfMonth.getUTCMonth() + 1, 0));
      setViewMonth(startOfMonth.getUTCMonth());
      setViewYear(startOfMonth.getUTCFullYear());
      props.onRangeChange({ start: startOfMonth, end: endOfMonth });
    } else {
      const start = props.range.start;
      const end = props.range.end;
      const durationMs = end.getTime() - start.getTime();
      const nextStart = new Date(start.getTime() + durationMs + 86400000);
      const nextEnd = new Date(nextStart.getTime() + durationMs);
      setViewMonth(nextStart.getUTCMonth());
      setViewYear(nextStart.getUTCFullYear());
      props.onRangeChange({ start: nextStart, end: nextEnd });
    }
  }

  function handleToggle() {
    if (open()) {
      setTempStart(null);
      setSelectMode('start');
      setHoveredDate(null);
    }
    setOpen((v) => !v);
  }

  function handleClose() {
    setTempStart(null);
    setSelectMode('start');
    setHoveredDate(null);
    setOpen(false);
  }

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
  }

  function matchesThisWeek(): boolean {
    const monday = getMonday(today);
    const sunday = getSunday(today);
    return isSameDay(props.range.start, monday) && isSameDay(props.range.end, sunday);
  }

  function matchesLastWeek(): boolean {
    const thisWeekMon = getMonday(today);
    const lastWeek = prevWeek({ start: thisWeekMon, end: getSunday(today) });
    return isSameDay(props.range.start, lastWeek.start) && isSameDay(props.range.end, lastWeek.end);
  }

  function matchesThisMonth(): boolean {
    const range = getMonthRange(today);
    return isSameDay(props.range.start, range.start) && isSameDay(props.range.end, range.end);
  }

  function matchesLastMonth(): boolean {
    const lastMonthDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const range = getMonthRange(lastMonthDate);
    return isSameDay(props.range.start, range.start) && isSameDay(props.range.end, range.end);
  }

  function getRangeLabel(): string {
    if (matchesThisWeek()) return 'This Week';
    if (matchesLastWeek()) return 'Last Week';
    if (matchesThisMonth()) return 'This Month';
    if (matchesLastMonth()) return 'Last Month';
    return `${formatDateShort(props.range.start)} - ${formatDateShort(props.range.end)}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderMonth(m: MonthData, side: 'left' | 'right') {
    return (
      <div class="drp-month">
        <div class="drp-month-title">
          {MONTH_NAMES[m.month]} {m.year}
        </div>
        <div class="calendar-day-labels">
          <For each={DAY_LABELS}>
            {(label) => <div class="calendar-day-label">{label}</div>}
          </For>
        </div>
        <For each={m.weeks}>
          {(week) => (
            <div class="calendar-week-row">
              <For each={week}>
                {(day) => (
                  <button
                    class="calendar-day"
                    classList={{
                      'calendar-day-empty': day === null,
                      'calendar-day-today': isToday(m.year, m.month, day),
                      'calendar-day-weekend': isWeekendFull(m.year, m.month, day),
                      'drp-in-range': isDayInSelectedRange(m.year, m.month, day),
                      'drp-range-start': isDayRangeStart(m.year, m.month, day),
                      'drp-range-end': isDayRangeEnd(m.year, m.month, day),
                    }}
                    disabled={day === null}
                    onClick={() => handleDayClick(m.year, m.month, day)}
                    onMouseEnter={() => {
                      const d = dateFromDay(m.year, m.month, day);
                      if (d) setHoveredDate(d);
                    }}
                    onMouseLeave={() => setHoveredDate(null)}
                  >
                    {day !== null ? day : ''}
                  </button>
                )}
              </For>
            </div>
          )}
        </For>
      </div>
    );
  }

  return (
    <div class="date-range-picker">
      <button class="nav-arrow-btn" title="Previous period" onClick={handlePrevRange}>
        &#8249;
      </button>
      <div class="week-label-wrap">
        <button class="date-range-picker-btn" onClick={handleToggle}>
          <span class="date-range-picker-icon">&#x1F4C5;</span>
          <span class="date-range-picker-label">{getRangeLabel()}</span>
        </button>

        {open() && (
          <>
            <div class="dropdown-overlay" onClick={handleClose} />
            <div class="date-range-picker-dropdown" onClick={handleClick}>
              {/* Quick selects */}
              <div class="date-range-picker-quick-selects">
                <button class="calendar-quick-btn" onClick={handleLastWeek}>Last Week</button>
                <button class="calendar-quick-btn" onClick={handleThisWeek}>This Week</button>
                <button class="calendar-quick-btn" onClick={handleLastMonth}>Last Month</button>
                <button class="calendar-quick-btn" onClick={handleThisMonth}>This Month</button>
              </div>

              {/* Selection hint */}
              <Show when={selectMode() === 'end'}>
                <div class="date-range-picker-hint">
                  Select end date
                </div>
              </Show>

              {/* Navigation header */}
              <div class="drp-nav-header">
                <button class="calendar-nav-btn" onClick={handlePrevMonth}>&#9664;</button>
                <div class="drp-nav-spacer" />
                <button class="calendar-nav-btn" onClick={handleNextMonth}>&#9654;</button>
              </div>

              {/* Side-by-side months */}
              <div class="drp-months">
                {renderMonth(leftMonth(), 'left')}
                {renderMonth(rightMonth(), 'right')}
              </div>
            </div>
          </>
        )}
      </div>
      <button class="nav-arrow-btn" title="Next period" onClick={handleNextRange}>
        &#8250;
      </button>
    </div>
  );
}
