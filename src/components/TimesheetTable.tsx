import { createSignal, createEffect, on, Show, createMemo } from 'solid-js';
import { db } from '../db/database';
import { execute } from '../db/sqlite';
import type { Project, Task, TimeEntry } from '../db/models';
import {
  getDatesInRange,
  formatDateShort,
  formatDayHeader,
  isSameDay,
  getToday,
} from '../utils/dateUtils';
import { isRomanianHoliday, getHolidayName } from '../utils/holidays';
import TimeInput from './TimeInput';
import ProjectTaskDropdown from './ProjectTaskDropdown';
import { formatTime } from '../utils/timeFormatter';

interface TimesheetTableProps {
  weekStart: Date;
}

interface ActiveTask {
  project: Project;
  task: Task;
}

export default function TimesheetTable(props: TimesheetTableProps) {
  const [projects, setProjects] = createSignal<Project[]>([]);
  const [tasks, setTasks] = createSignal<Task[]>([]);
  const [activeTasks, setActiveTasks] = createSignal<ActiveTask[]>([]);
  const [dropdownOpen, setDropdownOpen] = createSignal(false);
  const [buttonRect, setButtonRect] = createSignal<DOMRect | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = createSignal<ActiveTask | null>(null);
  let addBtnRef: HTMLDivElement | undefined;

  // Load projects and tasks
  async function load() {
    const projs = await db.projects.where('archived').equals(0).sortBy('name');
    const allTasks = await db.tasks.toArray();
    setProjects(projs);
    setTasks(allTasks);
  }
  load();

  // Load time entries for the week
  const [timeEntries, setTimeEntries] = createSignal<TimeEntry[]>([]);
  const [reloadKey, setReloadKey] = createSignal(0);

  createEffect(
    on(
      () => [props.weekStart.toISOString().slice(0, 10), reloadKey()],
      async () => {
        const dates = getDatesInRange({
          start: props.weekStart,
          end: new Date(props.weekStart.getTime() + 6 * 86400000),
        });
        const dateKeys = dates.map((d) => d.getTime());
        const entries = await db.timeEntries.where('date').anyOf(dateKeys).toArray();
        setTimeEntries(entries);

        // Derive active tasks from entries for this week
        const taskIds = [...new Set(entries.map((e) => e.taskId))];
        const active: ActiveTask[] = [];
        for (const taskId of taskIds) {
          const task = await db.tasks.get(taskId);
          if (task && !task.deleted) {
            const project = await db.projects.get(task.projectId);
            if (project) {
              active.push({ project, task });
            }
          }
        }
        active.sort((a, b) => {
          const projCmp = a.project.name.localeCompare(b.project.name);
          if (projCmp !== 0) return projCmp;
          return a.task.name.localeCompare(b.task.name);
        });
        setActiveTasks(active);
      },
    ),
  );

  const weekDates = () =>
    getDatesInRange({
      start: props.weekStart,
      end: new Date(props.weekStart.getTime() + 6 * 86400000),
    });

  // Helper: determine CSS class for a day column
  function getDayColumnClass(day: Date): string {
    const classes: string[] = ['col-day'];
    const dayOfWeek = day.getUTCDay(); // 0=Sun, 6=Sat
    const today = getToday();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      classes.push('col-day-weekend');
    }

    if (isSameDay(day, today)) {
      classes.push('col-day-today');
    }

    if (isRomanianHoliday(day)) {
      classes.push('col-day-holiday');
    }

    return classes.join(' ');
  }

  // Helper: determine header class for weekend columns
  function getDayHeaderClass(day: Date): string {
    const classes: string[] = ['col-day'];
    const dayOfWeek = day.getUTCDay();
    const today = getToday();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      classes.push('col-day-weekend', 'th-weekend');
    }

    if (isSameDay(day, today)) {
      classes.push('col-day-today');
    }

    if (isRomanianHoliday(day)) {
      classes.push('col-day-holiday');
    }

    return classes.join(' ');
  }

  // Helper: get tooltip for day header
  function getDayTooltip(day: Date): string {
    const holidayName = getHolidayName(day);
    if (holidayName) return holidayName;
    const dayOfWeek = day.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 'Weekend';
    return '';
  }

  function getSeconds(taskId: number, date: number): number {
    return timeEntries().find((e) => e.taskId === taskId && e.date === date)?.seconds || 0;
  }

  async function updateEntry(taskId: number, date: number, seconds: number) {
    if (seconds === 0) {
      await db.timeEntries.where({ taskId, date }).delete();
      setTimeEntries((prev) => prev.filter((e) => !(e.taskId === taskId && e.date === date)));
    } else {
      const existing = await db.timeEntries.where({ taskId, date }).first();
      if (existing) {
        await db.timeEntries.update(existing.id, { seconds });
        setTimeEntries((prev) =>
          prev.map((e) => (e.taskId === taskId && e.date === date ? { ...e, seconds } : e)),
        );
      } else {
        const newId = await db.timeEntries.add({ taskId, date, seconds });
        setTimeEntries((prev) => [...prev, { id: newId, taskId, date, seconds }]);
      }
    }
  }

  function handleDayUpdate(activeTask: ActiveTask, day: Date, seconds: number) {
    updateEntry(activeTask.task.id, day.getTime(), seconds);
  }

  function deleteRow(activeTask: ActiveTask) {
    setConfirmDeleteTask(activeTask);
  }

  async function confirmDelete() {
    const activeTask = confirmDeleteTask();
    if (!activeTask) return;
    const dateKeys = weekDates().map((d) => d.getTime());
    const placeholders = dateKeys.map(() => '?').join(', ');
    await execute(
      `DELETE FROM timeEntries WHERE taskId = ? AND date IN (${placeholders})`,
      [activeTask.task.id, ...dateKeys],
    );
    setConfirmDeleteTask(null);
    setReloadKey((k) => k + 1);
  }

  async function handleSelectTask(projectName: string, taskId: number) {
    setDropdownOpen(false);
    if (!projectName || !taskId) return;

    const task = await db.tasks.get(taskId);
    if (!task) return;

    const proj = await db.projects.get(task.projectId);
    if (!proj) return;

    // Check if already added
    const exists = activeTasks().some((at) => at.task.id === task.id);
    if (exists) return;

    setActiveTasks((prev) => [...prev, { project: proj, task }]);
  }

  function openDropdown() {
    if (addBtnRef) {
      setButtonRect(addBtnRef.getBoundingClientRect());
    }
    setDropdownOpen(true);
  }

  // Compute per-day totals
  const dayTotals = () =>
    weekDates().map((day) => {
      const dateKey = day.getTime();
      return activeTasks().reduce(
        (sum, at) => sum + getSeconds(at.task.id, dateKey),
        0
      );
    });

  const grandTotal = () => dayTotals().reduce((sum, s) => sum + s, 0);

  return (
    <div class="timesheet-table-wrapper">
      <table class="timesheet-table">
        <thead>
          <tr>
            <th class="col-task">Projects</th>
            {weekDates().map((day) => (
              <th class={getDayHeaderClass(day)} title={getDayTooltip(day)}>
                <div class="day-header">{formatDayHeader(day)}</div>
              </th>
            ))}
            <th class="col-total">Total</th>
            <th class="col-action"></th>
          </tr>
        </thead>
        <tbody>
          {activeTasks().map((at) => {
            return (
              <tr data-task-id={at.task.id}>
                <td class="col-task">
                  <span class="task-label">
                    <span class="task-project">{at.project.name}</span>
                    <span class="task-name">{at.task.name}</span>
                  </span>
                </td>
                {weekDates().map((day) => (
                  <td class={getDayColumnClass(day)}>
                    <TimeInput
                      seconds={getSeconds(at.task.id, day.getTime())}
                      onSecondsChange={(s) => handleDayUpdate(at, day, s)}
                    />
                  </td>
                ))}
                <td class="col-total">{formatTime(weekDates().reduce((sum, day) => sum + getSeconds(at.task.id, day.getTime()), 0))}</td>
                <td class="col-action">
                  <button class="delete-btn" onClick={() => deleteRow(at)} title="Delete row">
                    &#x2715;
                  </button>
                </td>
              </tr>
            );
          })}
          {/* Select project row */}
          <tr>
            <td class="col-task" style={{ padding: 0, border: 'none' }}>
                <div class="select-project-row" ref={addBtnRef} onClick={openDropdown}>
                  <span class="select-project-icon">+</span>
                  Select project
                </div>
            </td>
            {weekDates().map((day) => (
              <td class={getDayColumnClass(day)} style={{ padding: 0, border: 'none' }} />
            ))}
            <td class="col-total" style={{ padding: 0, border: 'none' }} />
            <td class="col-action" style={{ padding: 0, border: 'none' }} />
          </tr>
        </tbody>
        <tfoot>
          <tr class="ts-footer">
            <td></td>
            {dayTotals().map((total, i) => (
              <td class={getDayColumnClass(weekDates()[i])}>{formatTime(total)}</td>
            ))}
            <td>{formatTime(grandTotal())}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <Show when={dropdownOpen() && buttonRect()}>
        <ProjectTaskDropdown
          buttonRect={buttonRect()!}
          onClose={(projectName, taskId) => {
            setDropdownOpen(false);
            setButtonRect(null);
            handleSelectTask(projectName, taskId);
          }}
        />
      </Show>

      <Show when={confirmDeleteTask()}>
        <div class="confirm-overlay" onClick={() => setConfirmDeleteTask(null)}>
          <div class="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p class="confirm-text">
              Are you sure you want to delete the time entries for <strong>{confirmDeleteTask()?.task.name}</strong> for {formatDateShort(props.weekStart)} - {formatDateShort(new Date(props.weekStart.getTime() + 6 * 86400000))}?
            </p>
            <p class="confirm-note">This action cannot be undone.</p>
            <div class="confirm-actions">
              <button class="btn btn-secondary" onClick={() => setConfirmDeleteTask(null)}>
                Cancel
              </button>
              <button class="btn btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
