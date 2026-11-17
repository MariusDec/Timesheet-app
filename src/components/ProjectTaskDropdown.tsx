import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import CreateTaskDialog from './CreateTaskDialog';
import { db } from '../db/database';
import type { Project, Task } from '../db/models';
import { normalizeTaskName } from '../utils/taskName';
import { backdropClose } from '../utils/overlay';

interface ProjectTaskDropdownProps {
  buttonRect: DOMRect;
  onClose: (projectName: string, taskId: number) => void;
}

export default function ProjectTaskDropdown(props: ProjectTaskDropdownProps) {
  const [search, setSearch] = createSignal('');
  const [projects, setProjects] = createSignal<Project[]>([]);
  const [tasks, setTasks] = createSignal<Task[]>([]);
  const [searchedTasks, setSearchedTasks] = createSignal<Task[]>([]);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  const [expandedProjects, setExpandedProjects] = createSignal<Set<number>>(new Set());
  const [sortBy, setSortBy] = createSignal<'name' | 'lastUsed'>('lastUsed');
  const [createDialog, setCreateDialog] = createSignal<{ project: Project; initialTaskName: string } | null>(null);
  const [contextMenuTask, setContextMenuTask] = createSignal<Task | null>(null);
  const [contextMenuPos, setContextMenuPos] = createSignal<{ x: number; y: number } | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = createSignal<Task | null>(null);
  const [editTask, setEditTask] = createSignal<Task | null>(null);
  const [editTaskName, setEditTaskName] = createSignal('');
  const [dropdownStyle, setDropdownStyle] = createSignal<Record<string, string>>({});
  const [loading, setLoading] = createSignal(true);
  let dropdownRef: HTMLDivElement | undefined;
  let searchRef: HTMLInputElement | undefined;

  function updatePosition() {
    const btn = props.buttonRect;
    const gap = 4;
    const padding = 8;
    const dropdownW = dropdownRef?.offsetWidth ?? 480;
    const dropdownH = dropdownRef?.offsetHeight ?? 400;

    const spaceBelow = window.innerHeight - btn.bottom - gap;
    const spaceAbove = btn.top - gap;
    const openBelow = spaceBelow >= spaceAbove || spaceBelow >= dropdownH;

    const maxH = Math.max(100, openBelow ? spaceBelow : spaceAbove);
    const top = openBelow
      ? btn.bottom + gap
      : Math.max(padding, btn.top - Math.min(dropdownH, maxH) - gap);
    const left = Math.max(padding, Math.min(btn.left, window.innerWidth - dropdownW - padding));

    setDropdownStyle({
      top: `${top}px`,
      left: `${left}px`,
      'max-height': `${maxH}px`,
      transform: 'none',
    });
  }

  // Position on mount and when buttonRect changes
  createEffect(() => {
    // Access buttonRect to track it
    props.buttonRect;
    // First frame: let the browser lay out the dropdown so we can measure it
    requestAnimationFrame(() => {
      updatePosition();
    });
  });

  async function loadProjects() {
    const projs = await db.projects.where('archived').equals(0).sortBy('name');
    setProjects(projs);
    if (projs.length === 1) {
      setExpandedProjects(new Set([projs[0].id]));
    }
  }

  async function loadTasks(projectId?: number) {
    let filtered: Task[];
    if (projectId !== undefined) {
      filtered = await db.tasks.where('projectId').equals(projectId).toArray();
    } else {
      filtered = await db.tasks.toArray();
    }
    const visible = filtered.filter(t => !t.deleted);
    visible.sort((a, b) => {
      if (sortBy() === 'name') return a.name.localeCompare(b.name);
      return (b.lastUsedAt || 0) - (a.lastUsedAt || 0);
    });
    setTasks(visible);
  }

  createEffect(() => {
    setLoading(true);
    Promise.all([loadProjects(), loadTasks()]).then(() => setLoading(false));
  });

  createEffect(() => {
    const q = search().toLowerCase();
    clearTimeout(searchTimer);
    if (!q) {
      setSearchedTasks([]);
      return;
    }
    searchTimer = setTimeout(async () => {
      const results = await db.tasks.where('name').contains(q).limit(50).toArray();
      setSearchedTasks(results.filter(t => !t.deleted));
    }, 300);
  });

  onCleanup(() => clearTimeout(searchTimer));

  createEffect(() => {
    searchRef?.focus();
  });

  // Global Esc handler — works regardless of which element has focus
  createEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Don't interfere when a dialog is open
      if (editTask() || confirmDeleteTask() || createDialog()) return;
      if (search()) {
        setSearch('');
      } else {
        props.onClose('', 0);
      }
    };
    window.addEventListener('keydown', handler);
    onCleanup(() => window.removeEventListener('keydown', handler));
  });

  function toggleExpand(projectId: number) {
    const expanded = new Set(expandedProjects());
    if (expanded.has(projectId)) {
      // Collapse if already expanded
      expanded.delete(projectId);
    } else {
      // Accordion: only one project expanded at a time
      expanded.clear();
      expanded.add(projectId);
    }
    setExpandedProjects(expanded);
  }

  async function toggleFavorite(taskId: number) {
    const task = await db.tasks.get(taskId);
    if (task) {
      await db.tasks.update(taskId, { isFavorite: !task.isFavorite });
      await loadTasks(task.projectId);
    }
  }

  async function selectTask(task: Task) {
    const project = await db.projects.get(task.projectId);
    if (project) {
      // Update lastUsedAt
      await db.tasks.update(task.id, { lastUsedAt: Date.now() });
      props.onClose(project.name, task.id);
    }
  }

  const handleTaskCreated = async (taskId: number) => {
    const dialog = createDialog();
    if (!dialog) return;
    const { project } = dialog;
    setCreateDialog(null);
    // Update lastUsedAt so the task sorts correctly before selecting
    await db.tasks.update(taskId, { lastUsedAt: Date.now() });
    await loadTasks();
    const newTask = tasks().find(t => t.id === taskId);
    if (newTask) {
      await selectTask(newTask);
    }
  };

  function getTasksForProject(projectId: number): Task[] {
    return tasks().filter((t) => t.projectId === projectId);
  }

  function filteredTasks(projectId: number): Task[] {
    const searchLower = search().toLowerCase();

    let filtered: Task[];
    if (searchLower) {
      filtered = searchedTasks().filter((t) => t.projectId === projectId);
    } else {
      filtered = getTasksForProject(projectId);
    }

    // Favorites first
    const favorites = filtered.filter((t) => t.isFavorite);
    const nonFavorites = filtered.filter((t) => !t.isFavorite);

    // Sort non-favorites
    nonFavorites.sort((a, b) => {
      if (sortBy() === 'name') return a.name.localeCompare(b.name);
      return (b.lastUsedAt || 0) - (a.lastUsedAt || 0);
    });

    // Sort favorites by name
    favorites.sort((a, b) => {
      if (sortBy() === 'name') return a.name.localeCompare(b.name);
      return (b.lastUsedAt || 0) - (a.lastUsedAt || 0);
    });

    const sorted = [...favorites, ...nonFavorites];

    if (!searchLower) {
      const projectCount = projects().length;
      if (projectCount > 0) {
        const perProjectLimit = Math.max(10, Math.floor(50 / projectCount));
        return sorted.slice(0, perProjectLimit);
      }
    }

    return sorted;
  }

  function handleContextMenu(e: MouseEvent, task: Task) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuTask(task);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  }

  function closeContextMenu() {
    setContextMenuTask(null);
    setContextMenuPos(null);
  }

  function handleEditClick() {
    const task = contextMenuTask();
    if (task) {
      setEditTaskName(task.name);
      setEditTask(task);
      closeContextMenu();
    }
  }

  async function handleEditSave() {
    const task = editTask();
    const name = normalizeTaskName(editTaskName());
    if (!task || !name) return;
    await db.tasks.update(task.id, { name });
    await loadTasks(task.projectId);
    setEditTask(null);
    setEditTaskName('');
  }

  function handleDeleteClick() {
    const task = contextMenuTask();
    if (task) {
      setConfirmDeleteTask(task);
      closeContextMenu();
    }
  }

  async function confirmDelete() {
    const task = confirmDeleteTask();
    if (task) {
      await db.tasks.update(task.id, { deleted: true });
      await loadTasks(task.projectId);
      setConfirmDeleteTask(null);
    }
  }

  return (
    <>
      <div class="dropdown-overlay" onClick={() => props.onClose('', 0)} />
      <div
        ref={dropdownRef}
        class="project-task-dropdown"
        style={dropdownStyle()}
      >
        <div class="dropdown-search-wrapper">
          <span class="dropdown-search-icon">🔍</span>
          <input
            ref={searchRef}
            class="dropdown-search"
            placeholder="Search Project or Task"
            value={search()}
            onInput={(e) => setSearch(e.target.value?.trim() ?? '')}
            onPaste={(e) => {
              const text = e.clipboardData?.getData('text/plain') ?? '';
              if (!/[\r\n]/.test(text)) return;
              e.preventDefault();
              const el = e.currentTarget;
              el.setRangeText(normalizeTaskName(text), el.selectionStart ?? 0, el.selectionEnd ?? 0, 'end');
              setSearch(el.value.trim());
            }}
          />
        </div>

        <div class="dropdown-toolbar">
          <span class="dropdown-sort-label">SORT BY:</span>
          <button
            class={`dropdown-sort-btn ${sortBy() === 'lastUsed' ? 'active' : ''}`}
            onClick={() => setSortBy('lastUsed')}
          >
            Last Used
          </button>
          <button
            class={`dropdown-sort-btn ${sortBy() === 'name' ? 'active' : ''}`}
            onClick={() => setSortBy('name')}
          >
            Name
          </button>
        </div>

        <div class="dropdown-list">
          <Show when={!loading()} fallback={
            <div class="loading-indicator">Loading...</div>
          }>
          {projects().map((project) => {
            const projTasks = filteredTasks(project.id);
            return (
              <div class="dropdown-project">
                <div
                  class="dropdown-project-header"
                  onClick={() => toggleExpand(project.id)}
                >
                  <span class={`dropdown-project-dot ${expandedProjects().has(project.id) ? 'expanded' : ''}`} />
                  <span class="dropdown-project-name">{project.name}</span>
                  <span class="dropdown-count">
                    {projTasks.length} Tasks <span class="dropdown-count-chevron">▾</span>
                  </span>
                </div>

                <Show when={expandedProjects().has(project.id)}>
                  <div class="dropdown-tasks">
                    <button
                        class="dropdown-create-task"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreateDialog({ project, initialTaskName: search() });
                        }}
                    >
                      <span class="create-icon">⊕</span> Create new task
                    </button>
                    {projTasks.map((task) => (
                      <div
                        class="dropdown-task"
                        onClick={() => selectTask(task)}
                        onContextMenu={(e) => handleContextMenu(e, task)}
                      >
                        <span class="dropdown-task-name">{task.name}</span>
                        <span
                          class="dropdown-star"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(task.id);
                          }}
                        >
                          {task.isFavorite ? '★' : '☆'}
                        </span>
                      </div>
                    ))}
                  </div>
                </Show>
              </div>
            );
          })}
          </Show>
        </div>
      </div>

      <Show when={createDialog()}>
        <CreateTaskDialog
          project={createDialog()!.project}
          initialTaskName={createDialog()!.initialTaskName}
          onClose={() => setCreateDialog(null)}
          onTaskCreated={handleTaskCreated}
        />
      </Show>

      <Show when={contextMenuTask() && contextMenuPos()}>
        <div class="dropdown-overlay" onClick={closeContextMenu} />
        <div
          class="context-menu"
          style={{
            top: `${contextMenuPos()!.y}px`,
            left: `${contextMenuPos()!.x}px`,
          }}
        >
          <div class="context-menu-item" onClick={handleEditClick}>
            Edit
          </div>
          <div class="context-menu-separator" />
          <div class="context-menu-item context-menu-item-danger" onClick={handleDeleteClick}>
            Delete task
          </div>
        </div>
      </Show>

      <Show when={confirmDeleteTask()}>
        <div class="confirm-overlay" {...backdropClose(() => setConfirmDeleteTask(null))}>
          <div class="confirm-dialog">
            <p class="confirm-text">
              Are you sure you want to delete <strong>{confirmDeleteTask()?.name}</strong>?
            </p>
            <p class="confirm-note">Time entries will be preserved.</p>
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

      <Show when={editTask()}>
        <div class="dialog-overlay" {...backdropClose(() => { setEditTask(null); setEditTaskName(''); })}>
          <div class="dialog" onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleEditSave();
            }
            if (e.key === 'Escape') {
              setEditTask(null);
              setEditTaskName('');
            }
          }}>
            <h3>Edit Task</h3>
            <p class="dialog-subtitle">Project: {projects().find(p => p.id === editTask()?.projectId)?.name}</p>
            <textarea
              class="dialog-input dialog-input-multiline"
              placeholder="Task name"
              value={editTaskName()}
              onInput={(e) => setEditTaskName(e.currentTarget.value)}
              autofocus
            />
            <div class="dialog-actions">
              <button class="btn btn-secondary" onClick={() => { setEditTask(null); setEditTaskName(''); }}>Cancel</button>
              <button class="btn btn-primary" onClick={handleEditSave}>Save</button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}
