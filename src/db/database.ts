import type { Project, Task, TimeEntry } from './models';
import { query, execute } from './sqlite';

class QueryResult<T> {
  private tableName: string;
  private conditions: string[];
  private params: unknown[];
  private orderField = '';
  private limitCount = 0;

  constructor(tableName: string, conditions: string[], params: unknown[]) {
    this.tableName = tableName;
    this.conditions = conditions;
    this.params = params;
  }

  sortBy(field: string): Promise<T[]> {
    this.orderField = field;
    return this._exec();
  }

  async toArray(): Promise<T[]> {
    return this._exec();
  }

  limit(n: number): this {
    this.limitCount = n;
    return this;
  }

  async first(): Promise<T | undefined> {
    this.limitCount = 1;
    const results = await this._exec();
    return results[0];
  }

  async delete(): Promise<void> {
    if (this.conditions.length === 0) return;
    const sql = `DELETE FROM ${this.tableName} WHERE ${this.conditions.join(' AND ')}`;
    await execute(sql, this.params);
  }

  async modify(changes: Record<string, unknown>): Promise<void> {
    if (this.conditions.length === 0) return;
    const setEntries = Object.entries(changes);
    if (setEntries.length === 0) return;
    const setClause = setEntries.map(([k]) => `${k} = ?`).join(', ');
    const setValues = setEntries.map(([, v]) => v);
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.conditions.join(' AND ')}`;
    await execute(sql, [...setValues, ...this.params]);
  }

  private async _exec(): Promise<T[]> {
    let sql = `SELECT * FROM ${this.tableName}`;
    if (this.conditions.length > 0) {
      sql += ` WHERE ${this.conditions.join(' AND ')}`;
    }
    if (this.orderField) {
      sql += ` ORDER BY ${this.orderField}`;
    }
    if (this.limitCount > 0) {
      sql += ` LIMIT ${this.limitCount}`;
    }
    return query<T>(sql, this.params);
  }
}

class WhereField<T> {
  constructor(
    private tableName: string,
    private field: string,
  ) {}

  equals(value: unknown): QueryResult<T> {
    return new QueryResult<T>(this.tableName, [`${this.field} = ?`], [value]);
  }

  anyOf(values: unknown[]): QueryResult<T> {
    const placeholders = values.map(() => '?').join(', ');
    return new QueryResult<T>(
      this.tableName,
      [`${this.field} IN (${placeholders})`],
      values,
    );
  }

  contains(value: string): QueryResult<T> {
    return new QueryResult<T>(this.tableName, [`${this.field} LIKE ?`], [`%${value}%`]);
  }
}

class Table<T extends { id: number }> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async toArray(): Promise<T[]> {
    return query<T>(`SELECT * FROM ${this.tableName}`);
  }

  async add(item: Record<string, unknown>): Promise<number> {
    const { id: _id, ...data } = item;
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const result = await execute(
      `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`,
      values,
    );
    return result.lastInsertRowid;
  }

  async update(id: number, changes: Record<string, unknown>): Promise<void> {
    const keys = Object.keys(changes);
    const values = Object.values(changes);
    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    await execute(
      `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`,
      [...values, id],
    );
  }

  async get(id: number): Promise<T | undefined> {
    const results = await query<T>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id],
    );
    return results[0];
  }

  where(field: string): WhereField<T>;
  where(field: Record<string, unknown>): QueryResult<T>;
  where(field: string | Record<string, unknown>): WhereField<T> | QueryResult<T> {
    if (typeof field === 'object') {
      const entries = Object.entries(field);
      const conditions = entries.map(([k]) => `${k} = ?`);
      const params = entries.map(([, v]) => v);
      return new QueryResult<T>(this.tableName, conditions, params);
    }
    return new WhereField<T>(this.tableName, field);
  }
}

export const db = {
  projects: new Table<Project>('projects'),
  tasks: new Table<Task>('tasks'),
  timeEntries: new Table<TimeEntry>('timeEntries'),
};
