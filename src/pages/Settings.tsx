import { createSignal, For, Show, onMount } from 'solid-js';
import { db } from '../db/database';
import { execute } from '../db/sqlite';
import { downloadFile } from '../utils/download';
import { DownloadIcon, UploadIcon } from '../components/Icons';

/** Normalize a timestamp to UTC midnight (strip time component) */
function toUtcMidnight(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

interface ProjectRow {
  id: number;
  name: string;
  archived: boolean;
}

const DOT_COLORS = ['#6b5bd9', '#4a5fd0', '#2e9e7a', '#d9578f', '#ef8a3a', '#9b6bd9', '#3b8fd0', '#c9a227'];

function projectColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DOT_COLORS[Math.abs(hash) % DOT_COLORS.length];
}

export default function Settings() {
  const [newProjectName, setNewProjectName] = createSignal('');
  const [projects, setProjects] = createSignal<ProjectRow[]>([]);
  const [feedback, setFeedback] = createSignal('');
  const [showArchived, setShowArchived] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  let fileInput!: HTMLInputElement;

  async function loadProjects() {
    const all = await db.projects.toArray();
    setProjects(all);
    setLoading(false);
  }

  onMount(() => {
    loadProjects();
  });

  async function createProject() {
    const name = newProjectName().trim();
    if (!name) return;

    await db.projects.add({
      name,
      archived: false,
      createdAt: Date.now(),
    });

    setNewProjectName('');
    loadProjects();
  }

  async function archiveProject(id: number) {
    await db.projects.update(id, { archived: true });
    loadProjects();
  }

  async function unarchiveProject(id: number) {
    await db.projects.update(id, { archived: false });
    loadProjects();
  }

  async function handleExport() {
    const projectsData = await db.projects.toArray();
    const tasksData = await db.tasks.toArray();
    const timeEntriesData = await db.timeEntries.toArray();

    const exportObj = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: projectsData,
      tasks: tasksData,
      timeEntries: timeEntriesData,
    };

    const content = JSON.stringify(exportObj, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadFile(content, `timesheet-backup-${dateStr}.json`, 'application/json');
  }

  async function handleImport(file: File) {
    const text = await file.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      setFeedback('Invalid JSON file.');
      return;
    }

    const obj = data as Record<string, unknown>;
    if (!obj.version || !Array.isArray(obj.projects) || !Array.isArray(obj.tasks) || !Array.isArray(obj.timeEntries)) {
      setFeedback('Invalid backup file structure.');
      return;
    }

    if (!confirm('This will replace all existing data. Are you sure?')) {
      return;
    }

    try {
      // Clear existing data
      await execute('DELETE FROM timeEntries');
      await execute('DELETE FROM tasks');
      await execute('DELETE FROM projects');

      // Insert imported data preserving original IDs
      for (const row of obj.projects) {
        const p = row as Record<string, unknown>;
        await execute(
          'INSERT INTO projects (id, name, archived, createdAt) VALUES (?, ?, ?, ?)',
          [p.id, p.name, p.archived, p.createdAt],
        );
      }
      for (const row of obj.tasks) {
        const t = row as Record<string, unknown>;
        await execute(
          'INSERT INTO tasks (id, projectId, name, isFavorite, deleted, createdAt, lastUsedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [t.id, t.projectId, t.name, t.isFavorite, t.deleted ?? 0, t.createdAt, t.lastUsedAt],
        );
      }
      for (const row of obj.timeEntries) {
        const e = row as Record<string, unknown>;
        await execute(
          'INSERT INTO timeEntries (id, taskId, date, seconds) VALUES (?, ?, ?, ?)',
          [e.id, e.taskId, toUtcMidnight(e.date as number), e.seconds],
        );
      }

      setFeedback('Import successful.');
      loadProjects();
    } catch (err) {
      setFeedback(`Import failed: ${err}`);
    }
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      handleImport(file);
    }
    // Reset so the same file can be re-selected
    target.value = '';
  }

  const activeProjects = () => projects().filter((p) => !p.archived);
  const archivedProjects = () => projects().filter((p) => p.archived);
  const totalActive = () => activeProjects().length;

  const isCreateDisabled = () => newProjectName().trim().length === 0;

  return (
    <div class="page settings-page">
      <h1>Settings</h1>

      {/* Import & Export */}
      <section class="settings-section card">
        <h2 class="settings-section-title">Import &amp; Export</h2>
        <p class="settings-help">Back up your database to a JSON file and restore it on any browser.</p>
        <input type="file" accept=".json,application/json" ref={fileInput} style="display:none" onChange={handleFileSelect} />
        <div class="settings-io-row">
          <button class="btn btn-primary" onClick={handleExport}><DownloadIcon size={15} /> Export Backup</button>
          <button class="btn btn-secondary" onClick={() => fileInput.click()}><UploadIcon size={15} /> Import Backup…</button>
        </div>
        {feedback() && <p class="settings-feedback">{feedback()}</p>}
      </section>

      {/* Create Project */}
      <section class="settings-section card">
        <h2 class="settings-section-title">Create Project</h2>
        <div class="settings-create-row">
          <input
            class="settings-input"
            placeholder="Project name"
            value={newProjectName()}
            onInput={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createProject();
            }}
          />
          <button class="btn btn-primary" onClick={createProject} disabled={isCreateDisabled()}>
            Create Project
          </button>
        </div>
      </section>

      {/* Active Projects */}
      <section class="settings-section card">
        <h2 class="settings-section-title">
          Active Projects
          <span class="settings-count">{totalActive()}</span>
        </h2>
        <Show when={!loading()} fallback={
          <div class="loading-indicator">Loading...</div>
        }>
        {activeProjects().length === 0 ? (
          <p class="no-data">No active projects. Create one above.</p>
        ) : (
          <ul class="settings-project-list">
            <For each={activeProjects()}>
              {(project) => (
                <li class="settings-project-row">
                  <span class="settings-dot" style={{ color: projectColor(project.name) }}>●</span>
                  <span class="settings-project-name">{project.name}</span>
                  <button class="btn btn-secondary settings-action-btn" onClick={() => archiveProject(project.id)}>
                    Archive
                  </button>
                </li>
              )}
            </For>
          </ul>
        )}
        </Show>
      </section>

      {/* Archived Projects (collapsible) */}
      <section class="settings-section card">
        <h2 class="settings-section-title settings-section-title--clickable" onClick={() => setShowArchived(!showArchived())}>
          <span class="settings-chevron">{showArchived() ? '▼' : '▶'}</span>
          Archived Projects
          <span class="settings-count">{archivedProjects().length}</span>
        </h2>
        <Show when={!loading()}>
        {showArchived() && (
          archivedProjects().length === 0 ? (
            <p class="no-data">No archived projects.</p>
          ) : (
            <ul class="settings-project-list">
              <For each={archivedProjects()}>
                {(project) => (
                  <li class="settings-project-row archived">
                    <span class="settings-dot" style={{ color: projectColor(project.name) }}>●</span>
                    <span class="settings-project-name">{project.name}</span>
                    <button class="btn btn-secondary settings-action-btn" onClick={() => unarchiveProject(project.id)}>
                      Unarchive
                    </button>
                  </li>
                )}
              </For>
            </ul>
          )
        )}
        </Show>
      </section>
    </div>
  );
}
