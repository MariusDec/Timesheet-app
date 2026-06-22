/**
 * Parses user input string to total seconds.
 * Formats supported:
 *   - Pure number: hours = floor(n/100), minutes = n%100 (with overflow carry)
 *     e.g. 30→30min, 70→1h10m, 100→1h, 170→2h10m, 120→1h20m
 *   - Jira: `2h`, `10m`, `2h 10m`
 *   - Clock: `hh:mm` or `hh:mm:ss`
 */
export function parseTime(input: string): number | null {
  if (!input.trim()) return null;

  const trimmed = input.trim();

  // Jira format: contains h or m
  if (/[hm]/i.test(trimmed)) {
    return parseJira(trimmed);
  }

  // Clock format: contains :
  if (trimmed.includes(':')) {
    return parseClock(trimmed);
  }

  // Pure number format
  if (/^\d+$/.test(trimmed)) {
    return parseNumber(parseInt(trimmed, 10));
  }

  return null;
}

function parseJira(input: string): number | null {
  // Match decimal hours: 2h, 0.5h, .5h, 1.75h
  const hoursMatch = input.match(/(\d*\.?\d+)\s*h/i);
  const minutesMatch = input.match(/(\d+)\s*m/i);

  let total = 0;
  if (hoursMatch) total += parseFloat(hoursMatch[1]) * 3600;
  if (minutesMatch) total += parseInt(minutesMatch[1], 10) * 60;

  if (hoursMatch === null && minutesMatch === null) return null;
  return total;
}

function parseClock(input: string): number | null {
  const parts = input.split(':');
  if (parts.length < 2 || parts.length > 3) return null;

  const hh = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  const ss = parts.length === 3 ? parseInt(parts[2], 10) : 0;

  if (isNaN(hh) || isNaN(mm) || isNaN(ss)) return null;

  return hh * 3600 + mm * 60 + ss;
}

function parseNumber(n: number): number {
  let hours = Math.floor(n / 100);
  let minutes = n % 100;
  // Overflow: minutes >= 60 carry into hours
  hours += Math.floor(minutes / 60);
  minutes = minutes % 60;
  return hours * 3600 + minutes * 60;
}
