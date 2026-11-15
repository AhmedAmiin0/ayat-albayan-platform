/** A value bound into a statement (the store binds text and integers only). */
export type SqlValue = string | number | null;

/**
 * The slice of a SQLite connection the message store uses (docs/43 43-6): expo-sqlite on the
 * phone (expo-port.ts), node:sqlite in tests (src/test/node-sql.ts). Rows come back unknown:
 * the store parses them with zod (rule 12).
 */
export interface SqlPort {
  exec(sql: string): Promise<void>;
  run(sql: string, params: readonly SqlValue[]): Promise<void>;
  all(sql: string, params: readonly SqlValue[]): Promise<unknown[]>;
  /** Runs `work` in one transaction: all of its writes land, or none. */
  transaction(work: () => Promise<void>): Promise<void>;
  /** The connection closed (a stopped session). */
  close(): Promise<void>;
}
