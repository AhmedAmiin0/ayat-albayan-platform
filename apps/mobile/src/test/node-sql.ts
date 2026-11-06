import type { SqlPort, SqlValue } from '@/inbox/thread/store/sql-port';

// A real SQLite for the store's tests (docs/43 43-6): Node's built-in node:sqlite, in memory,
// behind the same SqlPort the phone gets from expo-sqlite. Each call opens a fresh database.

interface NodeStatement {
  run(...params: SqlValue[]): unknown;
  all(...params: SqlValue[]): unknown[];
}
interface NodeDatabase {
  exec(sql: string): void;
  prepare(sql: string): NodeStatement;
}
interface NodeSqlite {
  DatabaseSync: new (path: string) => NodeDatabase;
}

/** A fresh in-memory database as a SqlPort, plus the raw handle for assertions. */
export function memoryPort(): { port: SqlPort; db: NodeDatabase } {
  const { DatabaseSync } = jest.requireActual<NodeSqlite>('node:sqlite');
  const db = new DatabaseSync(':memory:');
  const port: SqlPort = {
    exec: async (sql) => db.exec(sql),
    run: async (sql, params) => void db.prepare(sql).run(...params),
    // Plain objects (node:sqlite hands null-prototype rows).
    all: async (sql, params) => db.prepare(sql).all(...params).map((r) => ({ ...Object(r) })),
    transaction: async (work) => {
      db.exec('begin');
      try {
        await work();
        db.exec('commit');
      } catch (error) {
        db.exec('rollback');
        throw error;
      }
    },
  };
  return { port, db };
}
