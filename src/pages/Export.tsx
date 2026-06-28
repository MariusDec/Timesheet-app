import { createSignal, createEffect, Show } from 'solid-js';
import { For } from 'solid-js';
import {
  getMonday,
  getToday,
  getDatesInRange,
  formatDateShort,
  getWeekRange,
  getMonthRange,
} from '../utils/dateUtils';
import type { DateRange } from '../utils/dateUtils';
import { formatTime } from '../utils/timeFormatter';
import { db } from '../db/database';
import type { TimeEntry } from '../db/models';
import DateRangePicker from '../components/DateRangePicker';
import { downloadFile } from '../utils/download';

interface ExportRow {
  date: string;
  time: string;
  timeDecimal: number;
  seconds: number;
  project: string;
  task: string;
}

export default function Export() {
  const today = getToday();
  const [range, setRange] = createSignal<DateRange>(
    getMonthRange(today)
  );
  const [rows, setRows] = createSignal<ExportRow[]>([]);
  const [loading, setLoading] = createSignal(true);

  createEffect(() => {
    const r = range();
    const dateKeys = getDatesInRange(r).map((d) => d.getTime());

    (async () => {
      setLoading(true);
      const [entries, tasks, projects] = await Promise.all([
        db.timeEntries.where('date').anyOf(dateKeys).toArray(),
        db.tasks.toArray(),
        db.projects.toArray(),
      ]);
      const taskMap = new Map(tasks.map((t) => [t.id, t]));
      const projMap = new Map(projects.map((p) => [p.id, p]));

      const result: ExportRow[] = [];
      const seen = new Map<string, TimeEntry>();
      for (const entry of entries) {
        const key = `${entry.taskId}-${entry.date}`;
        const prev = seen.get(key);
        if (!prev || entry.seconds > prev.seconds) {
          seen.set(key, entry);
        }
      }
      for (const entry of seen.values()) {
        const task = taskMap.get(entry.taskId);
        const proj = task ? projMap.get(task.projectId) : null;
        if (!task || task.deleted || !proj) continue;
        const entryDate = new Date(entry.date);
        const decimalHours = Math.round((entry.seconds / 3600) * 100) / 100;
        result.push({
          date: formatDateShort(entryDate),
          time: formatTime(entry.seconds),
          timeDecimal: decimalHours,
          seconds: entry.seconds,
          project: proj.name,
          task: task.name,
        });
      }

      result.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.project !== b.project) return a.project.localeCompare(b.project);
        return a.task.localeCompare(b.task);
      });

      setRows(result);
      setLoading(false);
    })();
  });

  function handleRangeChange(newRange: DateRange) {
    setRange(newRange);
  }

  function escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  function exportCSVData() {
    const rowList = rows();
    let csv = 'Date,Time,Project,Task\n';
    for (const row of rowList) {
      csv += [
        row.date,
        row.timeDecimal.toFixed(2),
        escapeCsvField(row.project),
        escapeCsvField(row.task),
      ].join(',') + '\n';
    }
    const now = new Date();
    const dateStr = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    downloadFile(csv, `Timesheet-${dateStr}.csv`, 'text/csv');
  }

  return (
    <div class="page export-page">
      <div class="export-header">
        <h1>Export</h1>
        <DateRangePicker
          range={range()}
          onRangeChange={handleRangeChange}
        />
      </div>

      <div class="export-controls">
        <button class="btn btn-primary export-btn" onClick={exportCSVData}>
          &#x21E9; Export CSV
        </button>
      </div>

      <div class="export-table-wrap">
        <table class="export-table">
          <thead>
            <tr>
              <th width={120}>Date</th>
              <th width={100}>Time</th>
              <th width={180}>Project</th>
              <th>Task</th>
            </tr>
          </thead>
          <tbody>
            <Show when={!loading()} fallback={
              <tr><td colspan="4" class="loading-cell">Loading...</td></tr>
            }>
            <For each={rows()}>
              {(row) => (
                <tr>
                  <td>{row.date}</td>
                  <td>{row.time}</td>
                  <td>{row.project}</td>
                  <td>{row.task}</td>
                </tr>
              )}
            </For>
            {rows().length === 0 && (
              <tr>
                <td colspan="4" class="no-data">No data found for the selected range.</td>
              </tr>
            )}
            </Show>
          </tbody>
          {rows().length > 0 && (
            <tfoot>
              <tr class="export-total-row">
                <td>TOTAL</td>
                <td>{formatTime(rows().reduce((sum, r) => sum + r.seconds, 0))}</td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
