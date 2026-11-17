import { createSignal, createEffect } from 'solid-js';
import { db } from '../db/database';
import type { Project } from '../db/models';
import { normalizeTaskName } from '../utils/taskName';
import { backdropClose } from '../utils/overlay';

interface CreateTaskDialogProps {
  project: Project;
  initialTaskName?: string;
  onClose: () => void;
  onTaskCreated: (taskId: number) => void;
}

export default function CreateTaskDialog(props: CreateTaskDialogProps) {
  const [taskName, setTaskName] = createSignal(normalizeTaskName(props.initialTaskName || ''));
  const [error, setError] = createSignal('');
  let textareaRef: HTMLTextAreaElement | undefined;

  createEffect(() => {
    textareaRef?.focus();
  });

  async function handleSave() {
    const name = normalizeTaskName(taskName());
    if (!name) {
      setError('Task name is required');
      return;
    }

    // Check for existing task with the same name in this project (including soft-deleted)
    const existing = await db.tasks
      .where({ projectId: props.project.id, name })
      .first();

    let taskId: number;
    if (existing) {
      // Task exists — un-delete if it was soft-deleted
      if (existing.deleted) {
        await db.tasks.update(existing.id, { deleted: false, lastUsedAt: Date.now() });
      }
      taskId = existing.id;
    } else {
      taskId = await db.tasks.add({
        projectId: props.project.id,
        name,
        isFavorite: false,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
      });
    }

    setTaskName('');
    setError('');
    props.onTaskCreated(taskId);
  }

  // Multi-line pastes (e.g. copied from an issue tracker) are turned into
  // "KEY-123 - Title" right away so the user sees what will be saved.
  function handlePaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (!/[\r\n]/.test(text)) return;
    e.preventDefault();
    const el = e.currentTarget as HTMLTextAreaElement;
    const replacesAll = el.selectionStart === 0 && el.selectionEnd === el.value.length;
    const pasted = normalizeTaskName(text);
    if (replacesAll || !el.value.trim()) {
      el.value = pasted;
    } else {
      el.setRangeText(pasted, el.selectionStart, el.selectionEnd, 'end');
    }
    el.setSelectionRange(el.value.length, el.value.length);
    setTaskName(el.value);
    setError('');
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      props.onClose();
    }
  }

  return (
    <div class="dialog-overlay" {...backdropClose(() => props.onClose())}>
      <div class="dialog" onKeyDown={handleKeyDown}>
        <h3>Create New Task</h3>
        <p class="dialog-subtitle">Project: {props.project.name}</p>
        <textarea
          ref={textareaRef}
          class="dialog-input dialog-input-multiline"
          placeholder="Task name"
          value={taskName()}
          onPaste={handlePaste}
          onInput={(e) => {
            setTaskName(e.currentTarget.value);
            setError('');
          }}
          autofocus
        />
        {error() && <span class="dialog-error">{error()}</span>}
        <div class="dialog-actions">
          <button class="btn btn-secondary" onClick={props.onClose}>Cancel</button>
          <button class="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
