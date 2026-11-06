import * as SQLite from 'expo-sqlite';
import type { SqlPort } from './sql-port';

/** One file for the phone's inbox store; its rows belong to sync_state.owner (store-owner.ts). */
export const STORE_DB = 'ab-inbox.db';

/** The expo-sqlite connection behind the store (native: APK 0.5.0 and later). */
export async function openExpoPort(): Promise<SqlPort> {
  const db = await SQLite.openDatabaseAsync(STORE_DB);
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params) => {
      await db.runAsync(sql, [...params]);
    },
    all: (sql, params) => db.getAllAsync<unknown>(sql, [...params]),
    transaction: (work) => db.withTransactionAsync(work),
  };
}

/** Sign-out: the whole file goes (nothing of the account stays on the phone). */
export async function deleteStoreFile(): Promise<void> {
  await SQLite.deleteDatabaseAsync(STORE_DB);
}
