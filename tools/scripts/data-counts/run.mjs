import { appendFileSync } from 'node:fs';
import postgres from 'postgres';
import { main } from './main.mjs';

const summary = process.env.GITHUB_STEP_SUMMARY;

const write = (line) => {
  console.log(line);
  if (summary) appendFileSync(summary, `${line}\n`);
};

// Notices can quote values, so they are dropped instead of logged.
const dropNotice = () => undefined;

// No type lookup either: its error would escape main's own handling.
const connect = (url) =>
  postgres(url, { max: 1, connect_timeout: 15, fetch_types: false, onnotice: dropNotice });

process.exitCode = await main({
  file: process.argv[2] ?? '',
  url: process.env.PROD_READONLY_DATABASE_URL ?? '',
  connect,
  write,
});
