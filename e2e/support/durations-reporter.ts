import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';

/**
 * CI only: milliseconds per spec file and project, written to E2E_DURATIONS_FILE (uploaded as an
 * artifact). `node tools/scripts/e2e-shards.mjs merge <files…>` turns a run's files into
 * e2e/shard-durations.json, which the CI shard plan balances on. Never fails the run.
 */
export default class DurationsReporter implements Reporter {
  private readonly ms: Record<string, Record<string, number>> = {};

  onTestEnd(test: TestCase, result: TestResult): void {
    const project = test.parent.project()?.name ?? '';
    if (project === 'setup') return;
    const file = relative(process.cwd(), test.location.file).split('\\').join('/');
    const row = (this.ms[file] ??= {});
    row[project] = (row[project] ?? 0) + result.duration;
  }

  onEnd(): void {
    const out = process.env['E2E_DURATIONS_FILE'];
    if (!out) return;
    try {
      writeFileSync(out, JSON.stringify(this.ms, null, 1));
      const total = Object.values(this.ms)
        .flatMap((r) => Object.values(r))
        .reduce((a, b) => a + b, 0);
      console.log(
        `e2e durations: ${Object.keys(this.ms).length} files, ${Math.round(total / 1000)} s -> ${out}`,
      );
    } catch (e) {
      console.warn(`e2e durations not written: ${String(e)}`);
    }
  }

  printsToStdio(): boolean {
    return false;
  }
}
