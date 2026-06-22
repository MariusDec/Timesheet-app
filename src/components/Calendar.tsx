import { createSignal, For, Show } from 'solid-js';
import {
  getMonday,
  getSunday,
  getToday,
  isSameDay,
  formatDateShort,
  prevWeek,
} from '../utils/dateUtils';

interface CalendarProps {
  selectedWeekStart: Date;
  onSelectWeek: (weekStart: Date) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function Calendar(props: CalendarProps) {
  const today = getToday();
  const [viewMonth, setViewMonth] = createSignal(props.selectedWeekStart.getUTCMonth());
  const [viewYear, setViewYear] = createSignal(props.selectedWeekStart.getUTCFullYear());
  const [hoveredDate, setHoveredDate] = createSignal<Date | null>(null);

  function getDaysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  }

  function getMonthGrid(): (number | null)[] {
    const year = viewYear();
    const month = viewMonth();
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

  function getWeekOfDate(day: number | null): Date | null {
    if (day === null) return null;
    return new Date(Date.UTC(viewYear(), viewMonth(), day));
  }

  function getHoveredWeekStart(): Date | null {
    const hd = hoveredDate();
    if (!hd) return null;
    return getMonday(hd);
  }

  function getSelectedWeekStart(): Date {
    return getMonday(props.selectedWeekStart);
  }

  function isDayInHoveredWeek(day: number | null): boolean {
    if (day === null) return false;
    const hwStart = getHoveredWeekStart();
    if (!hwStart) return false;
    const d = new Date(Date.UTC(viewYear(), viewMonth(), day));
    const dMonday = getMonday(d);
    return dMonday.getTime() === hwStart.getTime();
  }

  function isDayInSelectedWeek(day: number | null): boolean {
    if (day === null) return false;
    const swStart = getSelectedWeekStart();
    const d = new Date(Date.UTC(viewYear(), viewMonth(), day));
    const dMonday = getMonday(d);
    return dMonday.getTime() === swStart.getTime();
  }

  function isToday(day: number | null): boolean {
    if (day === null) return false;
    const d = new Date(Date.UTC(viewYear(), viewMonth(), day));
    return isSameDay(d, today);
  }

  function isWeekend(day: number | null): boolean {
    if (day === null) return false;
    const d = new Date(Date.UTC(viewYear(), viewMonth(), day));
    const dow = d.getUTCDay();
    return dow === 0 || dow === 6;
  }

  function handleDayClick(day: number | null) {
    if (day === null) return;
    const clicked = new Date(Date.UTC(viewYear(), viewMonth(), day));
    const weekStart = getMonday(clicked);
    props.onSelectWeek(weekStart);
    props.onClose();
  }

  function handlePrevMonth() {
    if (viewMonth() === 0) {
      setViewMonth(11);
      setViewYear(viewYear() - 1);
    } else {
      setViewMonth(viewMonth() - 1);
    }
  }

  function handleNextMonth() {
    if (viewMonth() === 11) {
      setViewMonth(0);
      setViewYear(viewYear() + 1);
    } else {
      setViewMonth(viewMonth() + 1);
    }
  }

  function handleThisWeek() {
    const monday = getMonday(today);
    props.onSelectWeek(monday);
    props.onClose();
  }

  function handleLastWeek() {
    const thisWeekMon = getMonday(today);
    const lastWeekMon = prevWeek({ start: thisWeekMon, end: getSunday(today) }).start;
    props.onSelectWeek(lastWeekMon);
    props.onClose();
  }

  const grid = () => getMonthGrid();
  const weeks = () => {
    const g = grid();
    const rows: (number | null)[][] = [];
    for (let i = 0; i < g.length; i += 7) {
      rows.push(g.slice(i, i + 7));
    }
    return rows;
  };

  return (
    <div class="calendar" onClick={(e) => e.stopPropagation()}>
      <div class="calendar-quick-selects">
        <button class="calendar-quick-btn" onClick={handleLastWeek}>Last Week</button>
        <button class="calendar-quick-btn" onClick={handleThisWeek}>This Week</button>
      </div>

      <div class="calendar-header">
        <button class="calendar-nav-btn" onClick={handlePrevMonth}>&#9664;</button>
        <span class="calendar-title">
          {MONTH_NAMES[viewMonth()]} {viewYear()}
        </span>
        <button class="calendar-nav-btn" onClick={handleNextMonth}>&#9654;</button>
      </div>

      <div class="calendar-grid">
        <div class="calendar-day-labels">
          <For each={DAY_LABELS}>
            {(label) => <div class="calendar-day-label">{label}</div>}
          </For>
        </div>

        <For each={weeks()}>
          {(week) => {
            const weekStart = () => {
              const firstDay = week.find((d) => d !== null);
              if (firstDay === undefined) return null;
              return getMonday(new Date(Date.UTC(viewYear(), viewMonth(), firstDay)));
            };

            const isHoveredWeek = () => {
              const ws = weekStart();
              const hw = getHoveredWeekStart();
              if (!ws || !hw) return false;
              return ws.getTime() === hw.getTime();
            };

            const isSelectedWeek = () => {
              const ws = weekStart();
              const sw = getSelectedWeekStart();
              if (!ws) return false;
              return ws.getTime() === sw.getTime();
            };

            return (
              <div
                class="calendar-week-row"
                classList={{
                  'calendar-week-hovered': isHoveredWeek(),
                  'calendar-week-selected': isSelectedWeek(),
                }}
              >
                <For each={week}>
                  {(day) => (
                    <button
                      class="calendar-day no-hover-effect"
                      classList={{
                        'calendar-day-empty': day === null,
                        'calendar-day-today': isToday(day),
                        'calendar-day-weekend': isWeekend(day),
                        'calendar-day-in-hovered': isDayInHoveredWeek(day),
                        'calendar-day-in-selected': isDayInSelectedWeek(day),
                      }}
                      disabled={day === null}
                      onClick={() => handleDayClick(day)}
                      onMouseEnter={() => {
                        const d = getWeekOfDate(day);
                        if (d) setHoveredDate(d);
                      }}
                      onMouseLeave={() => setHoveredDate(null)}
                    >
                      {day !== null ? day : ''}
                    </button>
                  )}
                </For>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
