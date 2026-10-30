import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Test paths from the monorepo root, never counted `../` from the test file: a module folder
// can move (docs/32 a23, correction 6) and every SQL / source path its tests read still holds.

/** The nearest folder at or above `from` that holds pnpm-workspace.yaml. */
export function findRepoRoot(from: string): string {
  let dir = from;
  while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`pnpm-workspace.yaml not found above ${from}`);
    dir = parent;
  }
  return dir;
}

export const REPO_ROOT = findRepoRoot(__dirname);

/** apps/api/src */
export const API_SRC = join(REPO_ROOT, 'apps', 'api', 'src');

/** packages/db/supabase/migrations */
export const MIGRATIONS_DIR = join(REPO_ROOT, 'packages', 'db', 'supabase', 'migrations');

/** One migration file by its file name (with `.sql`). */
export const migrationPath = (file: string): string => join(MIGRATIONS_DIR, file);
