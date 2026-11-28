import { posix } from 'node:path';
import { follow } from '../tree/follow.ts';
import type { Moves } from '../tree/tree.types.ts';

const QUOTED = /'((?:src|app)\/[^'*]*)([^']*)'/g;

/** A folder of the old tree that the moves empty (its files went to different places). */
const gone = (dir: string, m: Moves): boolean =>
  m.folders.has(dir) && [...m.before].every((f) => !f.startsWith(`${dir}/`) || m.files.has(f));

/**
 * A lint.blocks file with its workspace-relative paths (`'src/inbox/send-file.ts'`,
 * `'src/core/http/**'`) following the moves; a path whose files split up is reported.
 */
export function rewriteLintPaths(
  text: string,
  ctx: { workspace: string; moves: Moves },
): { text: string; stale: string[] } {
  const stale: string[] = [];
  const out = text.replace(QUOTED, (whole, base: string, glob: string) => {
    const path = posix.join(ctx.workspace, base.replace(/\/$/, ''));
    const to = follow(path, ctx.moves);
    if (to === undefined) {
      if (gone(path, ctx.moves)) stale.push(`${ctx.workspace}: ${base}${glob}`);
      return whole;
    }
    const rel = posix.relative(ctx.workspace, to) + (base.endsWith('/') ? '/' : '');
    return `'${rel}${glob}'`;
  });
  return { text: out, stale };
}
