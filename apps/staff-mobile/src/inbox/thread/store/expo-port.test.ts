import * as SQLite from 'expo-sqlite';
import { deleteStoreFile, openExpoPort, STORE_DB } from './expo-port';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(), deleteDatabaseAsync: jest.fn() }));

const db = {
  execAsync: jest.fn(async () => undefined),
  runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 })),
  getAllAsync: jest.fn(async () => [{ x: 1 }]),
  withTransactionAsync: jest.fn(async (work: () => Promise<void>) => work()),
  closeAsync: jest.fn(async () => undefined),
};

test('the store file through expo-sqlite: exec, run, all and a transaction', async () => {
  jest.mocked(SQLite.openDatabaseAsync).mockResolvedValue(db as unknown as SQLite.SQLiteDatabase);
  const port = await openExpoPort();
  expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith(STORE_DB);
  await port.exec('select 1');
  await port.run('insert', ['a', 1]);
  expect(await port.all('select', [null])).toEqual([{ x: 1 }]);
  const work = jest.fn(async () => undefined);
  await port.transaction(work);
  expect(db.execAsync).toHaveBeenCalledWith('select 1');
  expect(db.runAsync).toHaveBeenCalledWith('insert', ['a', 1]);
  expect(db.getAllAsync).toHaveBeenCalledWith('select', [null]);
  expect(work).toHaveBeenCalledTimes(1);
  await port.close();
  expect(db.closeAsync).toHaveBeenCalledTimes(1);
});

test('sign-out deletes the whole file', async () => {
  await deleteStoreFile();
  expect(SQLite.deleteDatabaseAsync).toHaveBeenCalledWith(STORE_DB);
});
