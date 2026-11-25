import { readFileSync } from 'node:fs';
import { countLines, countOf } from './count.mjs';
import { parseCounts } from './parse.mjs';

// The extended protocol carries one statement, whatever the text holds.
const ONE_STATEMENT = { simple: false };

// A database error can quote a row value, so every failure becomes a bare null.
const countIn = (sql, statement) =>
  sql
    .begin('read only', (tx) => tx.unsafe(statement, [], ONE_STATEMENT))
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
  const sql = connect(url);
  try {
    return await Promise.all(items.map((item) => countIn(sql, item.sql)));
  } finally {
    await sql.end().catch(() => undefined);
  }
};

export const main = async ({ file, url, connect, write, warn = console.error }) => {
  const items = url ? readItems(file, warn) : missingUrl(warn);
  if (items === null) return 1;
  const lines = countLines(items, await runAll(items, url, connect));
  (lines ?? []).forEach((line) => write(line));
  return lines === null ? 1 : 0;
};
