import { appendFileSync } from 'node:fs';
import postgres from 'postgres';
import { exitQuietly, main } from './main.mjs';
import { throughPooler } from './pooler.mjs';

const summary = process.env.GITHUB_STEP_SUMMARY;

const write = (line) => {
  console.log(line);
  if (summary) appendFileSync(summary, `${line}\n`);
};

exitQuietly(process);

process.exitCode = await main({
  file: process.argv[2] ?? '',
  url: throughPooler(process.env.PROD_READONLY_DATABASE_URL ?? ''),
  connect: postgres,
  write,
});
