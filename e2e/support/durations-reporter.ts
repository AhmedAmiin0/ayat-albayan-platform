import type { Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { writeFileSync } from 'node:fs';
import { projectGroups, projectOf, rel, type Group, type ProjectSuiteLike } from './shard-groups';

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
    const out = process.env.E2E_GROUPS_FILE;
    if (out) this.write(out, groupsOf(suite));
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const project = test.parent.project()?.name ?? '';
    if (project === 'setup') return;
    const row = (this.ms[rel(test.location.file)] ??= {});
    row[project] = (row[project] ?? 0) + result.duration;
  }

  onEnd(): void {
    const out = process.env.E2E_DURATIONS_FILE;
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

/** Mirrors Playwright 1.63 createTestGroups (fullyParallel off): Map by worker hash, then by file. */
export function groupsOf(root: { suites: ProjectSuiteLike[] }): Group[] | null {
  const groups: Group[] = [];
  for (const projectSuite of root.suites.filter((s) => projectOf(s) !== 'setup')) {
    const found = projectGroups(projectOf(projectSuite), projectSuite.allTests());
    if (!found) return null; // internals changed: no sizes, equal split
    groups.push(...found);
  }
  return groups;
}
