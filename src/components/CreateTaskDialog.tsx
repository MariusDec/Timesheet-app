import { createSignal, createEffect } from 'solid-js';
import { db } from '../db/database';
import type { Project } from '../db/models';

interface CreateTaskDialogProps {
  project: Project;
  initialTaskName?: string;
  onClose: () => void;
  onTaskCreated: (taskId: number) => void;
}

export default function CreateTaskDialog(props: CreateTaskDialogProps) {
  const [taskName, setTaskName] = createSignal(props.initialTaskName || '');
  const [error, setError] = createSignal('');
  let textareaRef: HTMLTextAreaElement | undefined;

  createEffect(() => {
    textareaRef?.focus();
  });

  async function handleSave() {
    const name = taskName()
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
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
    <div class="dialog-overlay" onClick={props.onClose}>
      <div class="dialog" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <h3>Create New Task</h3>
        <p class="dialog-subtitle">Project: {props.project.name}</p>
        <textarea
          ref={textareaRef}
          class="dialog-input dialog-input-multiline"
          placeholder="Task name"
          value={taskName()}
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
