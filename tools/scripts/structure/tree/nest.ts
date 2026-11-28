import { posix } from 'node:path';

/** In the api a folder with a controller is its own Nest module (rule 13). */
export function nestProblems(files: readonly string[], root: string): string[] {
  const inside = files.filter((f) => f.startsWith(`${root}/`));
  const withModule = new Set(
    inside.filter((f) => f.endsWith('.module.ts')).map((f) => posix.dirname(f)),
  );
  const controllers = new Set(
    inside.filter((f) => f.endsWith('.controller.ts')).map((f) => posix.dirname(f)),
  );
  return [...controllers]
    .filter((d) => !withModule.has(d))
    .sort()
    .map((d) => `controller without a Nest module: ${d}`);
}
