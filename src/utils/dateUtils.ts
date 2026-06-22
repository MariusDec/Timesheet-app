/**
 * Utility functions for date calculations.
 */

export interface DateRange {
  start: Date; // inclusive start
  end: Date;   // inclusive end
}

/**
 * Get the Monday of the week containing the given date.
 * Week runs Monday to Sunday.
 * All dates are UTC midnight.
 */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // adjust when Sunday
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Get Sunday of the week containing the given date.
 */
export function getSunday(date: Date): Date {
  const mon = getMonday(date);
  return new Date(Date.UTC(mon.getUTCFullYear(), mon.getUTCMonth(), mon.getUTCDate() + 6));
}

/**
 * Get the date range for the week containing the given date.
 */
export function getWeekRange(date: Date): DateRange {
  return { start: getMonday(date), end: getSunday(date) };
}

/**
 * Get the date range for the month containing the given date.
 */
export function getMonthRange(date: Date): DateRange {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start, end };
}

/**
 * Get next week's date range.
 */
export function nextWeek(range: DateRange): DateRange {
  const next = new Date(Date.UTC(range.end.getUTCFullYear(), range.end.getUTCMonth(), range.end.getUTCDate() + 1));
  return getWeekRange(next);
}

/**
 * Get previous week's date range.
 */
export function prevWeek(range: DateRange): DateRange {
  const prev = new Date(Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth(), range.start.getUTCDate() - 1));
  return getWeekRange(prev);
}

/**
 * Get next month's date range.
 */
export function nextMonth(range: DateRange): DateRange {
  const next = new Date(Date.UTC(range.end.getUTCFullYear(), range.end.getUTCMonth(), range.end.getUTCDate() + 1));
  const nextDate = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), 1));
  const end = new Date(Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, 0));
  return { start: nextDate, end };
}

/**
 * Get previous month's date range.
 */
export function prevMonth(range: DateRange): DateRange {
  const prev = new Date(Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth() - 1, 1));
  return { start: prev, end: new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 0)) };
}

/**
 * Format a date as "DD/MM/YYYY".
 */
export function formatDateShort(d: Date): string {
  return (
    String(d.getUTCDate()).padStart(2, '0') +
    '/' +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    '/' +
    d.getUTCFullYear()
  );
}

/**
 * Format a date as "Mo, May 4" for day headers.
 */
export function formatDayHeader(d: Date): string {
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${days[d.getUTCDay()]}, ${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/**
 * Format a date as "YYYY-MM-DD".
 */
export function formatDateISO(d: Date): string {
  return (
    d.getUTCFullYear() +
    '-' +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getUTCDate()).padStart(2, '0')
  );
}

/**
 * Parse "YYYY-MM-DD" string to Date (UTC midnight).
 */
export function parseDateISO(iso: string): Date | null {
  const parts = iso.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const date = new Date(Date.UTC(y, m, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

/**
 * Generate the labels for a week navigator dropdown.
 */
export function getWeekNavigatorLabels(currentDate: Date): {
  label: string;
  quickSelect: 'thisWeek' | 'lastWeek' | 'custom';
  startDate: Date;
  endDate: Date;
} {
  const today = getToday();
  const monday = getMonday(currentDate);
  const sunday = getSunday(currentDate);

  const todayStart = getTodayStart();
  const thisWeekMon = getMonday(today);
  const lastWeekMon = prevWeek({ start: thisWeekMon, end: getSunday(today) }).start;

  const isThisWeek = monday.getTime() === thisWeekMon.getTime();
  const isLastWeek = monday.getTime() === lastWeekMon.getTime();

  if (isThisWeek) {
    return { label: 'This Week', quickSelect: 'thisWeek', startDate: thisWeekMon, endDate: getSunday(today) };
  }
  if (isLastWeek) {
    return { label: 'Last Week', quickSelect: 'lastWeek', startDate: lastWeekMon, endDate: getSunday(lastWeekMon) };
  }

  return {
    label: `${formatDateShort(monday)} - ${formatDateShort(sunday)}`,
    quickSelect: 'custom',
    startDate: monday,
    endDate: sunday,
  };
}

/**
 * Generate labels for the export range navigator.
 */
export function getExportNavigatorLabels(currentDate: Date): {
  label: string;
  quickSelect: 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';
  startDate: Date;
  endDate: Date;
} {
  const today = getToday();
  const monday = getMonday(currentDate);
  const sunday = getSunday(currentDate);

  const thisWeekMon = getMonday(today);
  const lastWeekMon = prevWeek({ start: thisWeekMon, end: getSunday(today) }).start;

  const thisMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const thisMonthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
  const lastMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const lastMonthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));

  const isThisWeek = monday.getTime() === thisWeekMon.getTime();
  const isLastWeek = monday.getTime() === lastWeekMon.getTime();

  // Check month range by comparing dates
  const currentDateStartOfMonth = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1));
  const currentDateEndOfMonth = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 0));
  const isThisMonth =
    currentDateStartOfMonth.getTime() === thisMonthStart.getTime() &&
    currentDateEndOfMonth.getTime() === thisMonthEnd.getTime();

  const lastMonthStartDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const lastMonthEndDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  const isLastMonth =
    currentDateStartOfMonth.getTime() === lastMonthStartDate.getTime() &&
    currentDateEndOfMonth.getTime() === lastMonthEndDate.getTime();

  if (isThisWeek) {
    return { label: 'This Week', quickSelect: 'thisWeek', startDate: thisWeekMon, endDate: getSunday(today) };
  }
  if (isLastWeek) {
    return { label: 'Last Week', quickSelect: 'lastWeek', startDate: lastWeekMon, endDate: getSunday(lastWeekMon) };
  }
  if (isThisMonth) {
    return { label: 'This Month', quickSelect: 'thisMonth', startDate: thisMonthStart, endDate: thisMonthEnd };
  }
  if (isLastMonth) {
    return { label: 'Last Month', quickSelect: 'lastMonth', startDate: lastMonthStart, endDate: lastMonthEnd };
  }

  return {
    label: `${formatDateShort(monday)} - ${formatDateShort(sunday)}`,
    quickSelect: 'custom',
    startDate: monday,
    endDate: sunday,
  };
}

/**
 * Get today's date as a UTC midnight Date.
 * Uses local calendar to determine "today", then stores as UTC midnight.
 */
export function getToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function getTodayStart(): Date {
  return new Date(getToday().getTime());
}

/**
 * Get all dates between start and end (inclusive).
 */
export function getDatesInRange(range: DateRange): Date[] {
  const dates: Date[] = [];
  const current = new Date(Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth(), range.start.getUTCDate()));
  const end = new Date(Date.UTC(range.end.getUTCFullYear(), range.end.getUTCMonth(), range.end.getUTCDate()));
  while (current <= end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Check if two dates are the same day.
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Check if a date falls within a range (inclusive).
 */
export function isDateInRange(date: Date, range: DateRange): boolean {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const s = new Date(Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth(), range.start.getUTCDate()));
  const e = new Date(Date.UTC(range.end.getUTCFullYear(), range.end.getUTCMonth(), range.end.getUTCDate()));
  return d >= s && d <= e;
}
