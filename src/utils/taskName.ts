// Matches an issue key such as "SDLA-6213" or "ABC2-17".
const TICKET_KEY = /^[A-Z][A-Z0-9]*-\d+$/;
const NUMBER_ONLY = /^\d+$/;

/**
 * Normalizes a (possibly multi-line, pasted) task name into a single line.
 *
 * Text copied from an issue tracker usually looks like
 *
 *     SDLA-6228
 *
 *     3
 *     Issue title
 *
 * which becomes "SDLA-6228 - Issue title": blank lines are dropped, stray
 * number-only lines after the key (vote/comment counters) are removed and the
 * key is joined to the title with " - ". Anything else is just collapsed to
 * a single line with single spaces.
 */
export function normalizeTaskName(raw: string): string {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (lines.length === 0) return '';

  const [first, ...rest] = lines;
  if (TICKET_KEY.test(first) && rest.length > 0) {
    const title = rest.filter((l) => !NUMBER_ONLY.test(l)).join(' ');
    if (title) return `${first} - ${title}`;
  }
  return lines.join(' ');
}
