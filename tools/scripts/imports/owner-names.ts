// The facade's names and who owns them (CLAUDE.md rule 23, docs/32 R7). Read from source: every
// domain index re-exports only its own files, so no build output is needed.
import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { type Node, Project, ts } from 'ts-morph';

export const DOMAINS = ['core', 'i18n', 'time', 'catalog', 'settings', 'money', 'schedule'];
const SHARED_INDEX = 'packages/shared/src/index.ts';
const RELATIVE_EXPORT = /^export\s.*\sfrom\s+['"]\.{1,2}\//;

function sourceProject(): Project {
  return new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noLib: true,
      types: [],
    },
  });
}

const exportedNames = (project: Project, path: string, text: string): string[] => [
  ...project.createSourceFile(path, text, { overwrite: true }).getExportedDeclarations().keys(),
];

function claim(out: Map<string, string>, name: string, owner: string): void {
  const held = out.get(name);
  if (held !== undefined) throw new Error(`${name}: ${held} and ${owner} both export it`);
  out.set(name, owner);
}

/** Each name a domain package's index exports → that package; a name exported twice throws. */
export function ownerNames(root: string): Map<string, string> {
  const project = sourceProject();
  const out = new Map<string, string>();
  const present = DOMAINS.filter((d) =>
    existsSync(posix.join(root, 'packages', d, 'src/index.ts')),
  );
  for (const dir of present) {
    const path = posix.join(root, 'packages', dir, 'src/index.ts');
    const owner = `@ab/${dir}`;
    for (const name of exportedNames(project, path, readFileSync(path, 'utf8'))) {
      claim(out, name, owner);
    }
  }
  return out;
}

/**
 * The names @ab/shared declares in its own files. Its relative export lines may re-export a domain
 * package (schemas/index.ts does), so a name counts only when declared under its src, or a built
 * dist would turn every name of that package into a shared-own one.
 */
export function sharedOwnNames(root: string): Set<string> {
  const path = posix.join(root, SHARED_INDEX);
  if (!existsSync(path)) return new Set();
  const own = readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => RELATIVE_EXPORT.test(line))
    .join('\n');
  const src = `${posix.dirname(path)}/`;
  const virtual = posix.join(src, '__own_exports__.ts');
  const sf = sourceProject().createSourceFile(virtual, own, { overwrite: true });
  const inShared = (n: Node): boolean => n.getSourceFile().getFilePath().startsWith(src);
  return new Set(
    [...sf.getExportedDeclarations()].filter(([, ds]) => ds.some(inShared)).map(([name]) => name),
  );
}

/** The names a facade import may move: owner names that no shared-own name shadows. */
export function facadeOwners(root: string): Map<string, string> {
  const own = sharedOwnNames(root);
  return new Map([...ownerNames(root)].filter(([name]) => !own.has(name)));
}
