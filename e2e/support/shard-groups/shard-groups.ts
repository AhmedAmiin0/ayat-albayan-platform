import { relative } from 'node:path';
import type { Group, ProjectSuiteLike, TestLike } from './shard-groups.types';

export const rel = (file: string): string => relative(process.cwd(), file).split('\\').join('/');

export const projectOf = (suite: ProjectSuiteLike): string => suite.project()?.name ?? '';

export function projectGroups(project: string, tests: TestLike[]): Group[] | null {
  const byHash = new Map<string, Map<string, Group>>();
  for (const test of tests) {
    const hash = test._workerHash;
    if (typeof hash !== 'string') return null;
    const byFile = byHash.get(hash) ?? new Map<string, Group>();
    byHash.set(hash, byFile);
    const file = rel(test.location.file);
    const group = byFile.get(file) ?? { project, file, tests: 0 };
    byFile.set(file, group);
    group.tests += 1;
  }
  return [...byHash.values()].flatMap((byFile) => [...byFile.values()]);
}
