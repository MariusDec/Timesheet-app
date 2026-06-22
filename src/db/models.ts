export interface Project {
  id: number;
  name: string;
  archived: boolean;
  createdAt: number;
}

export interface Task {
  id: number;
  projectId: number;
  name: string;
  isFavorite: boolean;
  createdAt: number;
  lastUsedAt: number;
  deleted: boolean;
}

export interface TimeEntry {
  id: number;
  taskId: number;
  date: number; // epoch ms
  seconds: number;
}
