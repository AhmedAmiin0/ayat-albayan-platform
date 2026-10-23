import type { Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';

const rel = (file: string): string => relative(process.cwd(), file).split('\\').join('/');

/**
 * CI only, for the shard sizes (tools/scripts/e2e-shards.mjs). Never fails the run.
 *  - E2E_DURATIONS_FILE: milliseconds per spec file and project (uploaded as an artifact; `e2e-shards.mjs
 *    merge` turns a run's files into e2e/shard-durations.json).
 *  - E2E_GROUPS_FILE (with --list): Playwright's shard groups in Playwright's own order, i.e. per project,
 *    by worker hash (a different fixture set starts a new run of groups), then by file.
 */
export default class DurationsReporter implements Reporter {
  private readonly ms: Record<string, Record<string, number>> = {};

  onBegin(_config: unknown, suite: Suite): void {
    const out = process.env['E2E_GROUPS_FILE'];
    if (out) this.write(out, groupsOf(suite));
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const project = test.parent.project()?.name ?? '';
    if (project === 'setup') return;
    const row = (this.ms[rel(test.location.file)] ??= {});
    row[project] = (row[project] ?? 0) + result.duration;
  }

  onEnd(): void {
    const out = process.env['E2E_DURATIONS_FILE'];
    if (out && Object.keys(this.ms).length) this.write(out, this.ms);
  }

  printsToStdio(): boolean {
    return false;
  }

  private write(file: string, data: unknown): void {
    try {
      writeFileSync(file, JSON.stringify(data, null, 1));
    } catch (e) {
      console.warn(`${file} not written: ${String(e)}`);
    }
  }
}

type Group = { project: string; file: string; tests: number };

/** Mirrors Playwright 1.63 createTestGroups (fullyParallel off): Map by worker hash, then by file. */
function groupsOf(root: Suite): Group[] | null {
  const groups: Group[] = [];
  for (const projectSuite of root.suites) {
    const project = projectSuite.project()?.name ?? '';
    if (project === 'setup') continue;
    const byHash = new Map<string, Map<string, Group>>();
    for (const test of projectSuite.allTests()) {
      const hash = (test as unknown as { _workerHash?: string })._workerHash;
      if (typeof hash !== 'string') return null; // internals changed: no sizes, equal split
      const byFile = byHash.get(hash) ?? new Map<string, Group>();
      byHash.set(hash, byFile);
      const file = rel(test.location.file);
      const group = byFile.get(file) ?? { project, file, tests: 0 };
      byFile.set(file, group);
      group.tests += 1;
    }
    for (const byFile of byHash.values()) groups.push(...byFile.values());
  }
  return groups;
}
