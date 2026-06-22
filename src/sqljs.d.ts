declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  interface QueryExecResult {
    columns: string[];
    values: (string | number | null)[][];
  }

  interface Statement {
    bind(params?: (string | number | null | Uint8Array)[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): boolean;
  }

  interface Database {
    run(sql: string, params?: (string | number | null | Uint8Array)[]): void;
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
    getRowsModified(): number;
  }

  export type { Database };

  export default function initSqlJs(
    config?: { locateFile?: (file: string) => string },
  ): Promise<SqlJsStatic>;
}
