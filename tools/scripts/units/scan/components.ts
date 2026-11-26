import { posix } from 'node:path';
import type { FloatingUnit } from './scan.types.ts';
import { componentsOf } from '../components/model/components.ts';
import { parseFile } from '../components/model/source.ts';
import { isTest, stemOf } from './files.ts';

// `units:fold -- --components` (docs/63 §4 phase 1): every component file folds into its own
// folder, whatever its size. Icon sets stay one file (docs/63 Q3); showcases and test helpers
// follow their component.
const FRONTEND = /^(?:apps\/(?:staff|family)-(?:web|mobile)|packages\/(?:web|mobile)-kit)\/src\//;
const PLAIN_TSX = /^[^.]+\.tsx$/;

export const pascalOf = (stem: string): string =>
  stem
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

/** A top-level PascalCase function, or const holding one, whose body has JSX. */
export const holdsComponent = (text: string, path: string): boolean =>
  componentsOf(parseFile(path.replace(/\.ts$/, '.tsx'), text)).length > 0;

const isCandidate = (name: string): boolean =>
  PLAIN_TSX.test(name) && !isTest(name) && !name.endsWith('-icons.tsx');

function unitOf(dir: string, names: readonly string[], stem: string): FloatingUnit[] {
  const name = pascalOf(stem);
  if (posix.basename(dir) === name) return [];
  const files = names.filter((n) => n === `${stem}.tsx` || n.startsWith(`${stem}.`)).toSorted();
  const rename = name === stem ? {} : { rename: name };
  return [{ dir, name: stem, files, tests: files.filter(isTest), action: 'fold', ...rename }];
}

/** The component units of one folder; `holds` tells whether a repo path holds a component. */
export function componentUnitsIn(
  dir: string,
  names: readonly string[],
  holds: (path: string) => boolean,
): FloatingUnit[] {
  if (!FRONTEND.test(`${dir}/`)) return [];
  return names
    .filter(isCandidate)
    .map(stemOf)
    .filter((stem) => holds(posix.join(dir, `${stem}.tsx`)))
    .toSorted()
    .flatMap((stem) => unitOf(dir, names, stem));
}
