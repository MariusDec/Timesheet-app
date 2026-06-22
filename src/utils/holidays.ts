/**
 * Romania public holidays utility.
 * Includes fixed holidays and calculates variable holidays (Easter-based).
 * All dates use UTC midnight for timezone-independent storage.
 */

interface Holiday {
  month: number; // 1-12
  day: number;
  name: string;
  isEasterRelated?: boolean;
  easterOffset?: number; // days relative to Orthodox Easter
}

// Fixed holidays (same date every year)
const FIXED_HOLIDAYS: Holiday[] = [
  { month: 1, day: 1, name: "Anul Nou (New Year's Day)" },
  { month: 1, day: 2, name: "Anul Nou (New Year's Day)" },
  { month: 1, day: 24, name: "Ziua Unirii Principatelor Române (Union Day)" },
  { month: 5, day: 1, name: "Ziua Muncii (Labour Day)" },
  { month: 8, day: 15, name: "Adormirea Maicii Domnului (Assumption Day)" },
  { month: 11, day: 30, name: "Sfântul Andrei (St. Andrew's Day)" },
  { month: 12, day: 1, name: "Ziua Națională (National Day)" },
  { month: 12, day: 25, name: "Crăciunul (Christmas Day)" },
  { month: 12, day: 26, name: "Crăciunul (Christmas Day)" },
];

// Easter-related holidays (offset from Orthodox Easter)
const EASTER_HOLIDAYS: Holiday[] = [
  { month: 0, day: 0, name: "Paștele (Easter Sunday)", isEasterRelated: true, easterOffset: 0 },
  { month: 0, day: 0, name: "A doua zi de Paște (Easter Monday)", isEasterRelated: true, easterOffset: 1 },
  { month: 0, day: 0, name: "Rusaliile (Whit Sunday)", isEasterRelated: true, easterOffset: 49 },
  { month: 0, day: 0, name: "A doua zi de Rusalii (Whit Monday)", isEasterRelated: true, easterOffset: 50 },
];

/**
 * Calculate Orthodox Easter date for a given year.
 * Uses the algorithm for the Julian calendar (adopted by the Orthodox Church).
 * Returns a UTC midnight Date.
 */
function calculateOrthodoxEaster(year: number): Date {
  // Anonymous Gregorian algorithm adapted for Julian calendar
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  
  // Julian to Gregorian conversion (for years 1900-2099, add 13 days)
  const julianDate = new Date(Date.UTC(year, month - 1, day));
  const gregorianDate = new Date(julianDate.getTime() + 13 * 24 * 60 * 60 * 1000);
  // Normalize to UTC midnight (the 13-day offset preserves UTC midnight)
  return new Date(Date.UTC(gregorianDate.getUTCFullYear(), gregorianDate.getUTCMonth(), gregorianDate.getUTCDate()));
}

/**
 * Get all Romanian holidays for a given year.
 * All dates are UTC midnight.
 */
export function getHolidaysForYear(year: number): { date: Date; name: string }[] {
  const holidays: { date: Date; name: string }[] = [];
  
  // Add fixed holidays
  for (const h of FIXED_HOLIDAYS) {
    holidays.push({
      date: new Date(Date.UTC(year, h.month - 1, h.day)),
      name: h.name,
    });
  }
  
  // Calculate Easter and add Easter-related holidays
  const easter = calculateOrthodoxEaster(year);
  for (const h of EASTER_HOLIDAYS) {
    const holidayDate = new Date(easter.getTime() + (h.easterOffset || 0) * 24 * 60 * 60 * 1000);
    holidays.push({
      date: new Date(Date.UTC(holidayDate.getUTCFullYear(), holidayDate.getUTCMonth(), holidayDate.getUTCDate())),
      name: h.name,
    });
  }
  
  return holidays;
}

/**
 * Check if a date is a Romanian public holiday.
 */
export function isRomanianHoliday(date: Date): boolean {
  const year = date.getUTCFullYear();
  const holidays = getHolidaysForYear(year);
  
  return holidays.some(
    (h) =>
      h.date.getUTCFullYear() === date.getUTCFullYear() &&
      h.date.getUTCMonth() === date.getUTCMonth() &&
      h.date.getUTCDate() === date.getUTCDate()
  );
}

/**
 * Get the name of the Romanian holiday for a given date, or null if not a holiday.
 */
export function getHolidayName(date: Date): string | null {
  const year = date.getUTCFullYear();
  const holidays = getHolidaysForYear(year);
  
  const holiday = holidays.find(
    (h) =>
      h.date.getUTCFullYear() === date.getUTCFullYear() &&
      h.date.getUTCMonth() === date.getUTCMonth() &&
      h.date.getUTCDate() === date.getUTCDate()
  );
  
  return holiday ? holiday.name : null;
}
