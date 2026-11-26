import { readFileSync } from 'node:fs';
import { countLines, countOf } from './count.mjs';
import { parseCounts } from './parse.mjs';

// The extended protocol carries one statement, whatever the text holds.
const ONE_STATEMENT = { simple: false };
// Set inside the transaction, so it also holds behind a pooler that drops session settings.
const TIME_LIMIT = "set local statement_timeout = '30s'";
// Notices can quote values, so they are dropped, and a type lookup's error would escape the
// catch in main.
const DRIVER_OPTIONS = {
  max: 1,
  connect_timeout: 15,
  fetch_types: false,
  onnotice: () => undefined,
};

// A throw inside the driver's own timers never reaches main, and Node would print it.
export const exitQuietly = (proc) => proc.on('uncaughtException', () => proc.exit(1));

// A database error can quote a row value, so every failure becomes a bare null.
const countIn = (sql, statement) =>
  sql
    .begin('read only', async (tx) => {
      await tx.unsafe(TIME_LIMIT, [], ONE_STATEMENT);
      return tx.unsafe(statement, [], ONE_STATEMENT);
    })
    .then(countOf)
    .catch(() => null);

const readItems = (file, warn) => {
  try {
    return parseCounts(readFileSync(file, 'utf8'));
  } catch (error) {
    warn(error instanceof Error ? error.message : 'unreadable counts file');
    return null;
  }
};

const missingUrl = (warn) => {
  warn('the database url is not set');
  return null;
};

const runAll = async (items, url, connect) => {
  const sql = connect(url, DRIVER_OPTIONS);
  try {
    return await Promise.all(items.map((item) => countIn(sql, item.sql)));
  } finally {
    await sql.end().catch(() => undefined);
  }
};

export const main = async ({ file, url, connect, write, warn = console.error }) => {
  const items = url ? readItems(file, warn) : missingUrl(warn);
  if (items === null) return 1;
  // An error from the driver can quote the database url, so a failed connect prints nothing either.
  const values = await runAll(items, url, connect).catch(() => [null]);
  const lines = countLines(items, values);
  (lines ?? []).forEach((line) => write(line));
  return lines === null ? 1 : 0;
};
