import { createSignal, createEffect } from 'solid-js';
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

  createEffect(() => {
    const r = range();
    const dateKeys = getDatesInRange(r).map((d) => d.getTime());

    (async () => {
      const entries = await db.timeEntries.where('date').anyOf(dateKeys).toArray();
      const tasks = await db.tasks.toArray();
      const taskMap = new Map(tasks.map((t) => [t.id, t]));
      const projects = await db.projects.toArray();
      const projMap = new Map(projects.map((p) => [p.id, p]));

      const result: ExportRow[] = [];
      for (const entry of entries) {
        const task = taskMap.get(entry.taskId);
        const proj = task ? projMap.get(task.projectId) : null;
        if (!task || !proj) continue;
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
