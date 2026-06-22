import { query, execute, importDb, exportDb, clearDb } from './sqlite';

export interface MigrationData {
  projects: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  timeEntries: Record<string, unknown>[];
}

/** Normalize a timestamp to UTC midnight (strip time component) */
function toUtcMidnight(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function exportToJson(): Promise<string> {
  const projects = await query('SELECT * FROM projects');
  const tasks = await query('SELECT * FROM tasks');
  const timeEntries = await query('SELECT * FROM timeEntries');

  const data: MigrationData = { projects, tasks, timeEntries };
  return JSON.stringify(data, null, 2);
}

export async function importFromJson(json: string): Promise<void> {
  const data: MigrationData = JSON.parse(json);

  await clearDb();

  for (const row of data.projects) {
    await execute(
      'INSERT INTO projects (id, name, archived, createdAt) VALUES (?, ?, ?, ?)',
      [row.id, row.name, row.archived, row.createdAt],
    );
  }

  for (const row of data.tasks) {
    await execute(
      'INSERT INTO tasks (id, projectId, name, isFavorite, createdAt, lastUsedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [row.id, row.projectId, row.name, row.isFavorite, row.createdAt, row.lastUsedAt],
    );
  }

  for (const row of data.timeEntries) {
    await execute(
      'INSERT INTO timeEntries (id, taskId, date, seconds) VALUES (?, ?, ?, ?)',
      [row.id, row.taskId, toUtcMidnight(row.date as number), row.seconds],
    );
  }
}

export async function getDbBlob(): Promise<Blob> {
  const data = await exportDb();
  return new Blob([data as BlobPart], { type: 'application/octet-stream' });
}

export async function loadDbBlob(blob: Blob): Promise<void> {
  const buffer = await blob.arrayBuffer();
  await importDb(new Uint8Array(buffer));
}

export async function downloadBackup(): Promise<void> {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const json = await exportToJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timesheet-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function uploadBackup(file: File): Promise<void> {
  const text = await file.text();
  await importFromJson(text);
}
