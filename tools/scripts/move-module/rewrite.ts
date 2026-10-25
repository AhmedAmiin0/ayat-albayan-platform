import { Project } from 'ts-morph';
import { formatSpec, resolveSpec, type Resolver } from './resolve.ts';
import { applyEdits, specifierNodes } from './specifiers.ts';

/** Strings a file must contain to possibly import one of the renamed files (skips parsing the rest). */
export function needles(renamed: Map<string, string>): string[] {
  const out = new Set(["'.'", "'..'", '".."', '"."', "'./'", '"./"', "'../'", '"../"']);
  for (const from of renamed.keys()) {
    const base = from.split('/').pop() ?? from;
    const stem = base.replace(/\.(d\.ts|[cm]?[jt]sx?|json)$/, '');
    out.add(stem === 'index' ? (from.split('/').at(-2) ?? stem) : stem);
  }
  return [...out];
}

export interface RewriteInput {
  /** Repo-relative path of the file as it is on disk today. */
  file: string;
  text: string;
}

/** The file's new text with every specifier pointing at its target's new path (same text = no change). */
export function rewriteFile(project: Project, r: Resolver, input: RewriteInput): string {
  const { file, text } = input;
  const sf = project.createSourceFile(`/virtual/${file}`, text, { overwrite: true });
  const newFrom = r.renamed.get(file) ?? file;
  const edits = specifierNodes(sf).flatMap((s) => {
    const target = resolveSpec(r, file, s.value);
    if (target === undefined) return [];
    const newFile = r.renamed.get(target.file) ?? target.file;
    if (newFile === target.file && newFrom === file) return [];
    const value = formatSpec(target, { from: newFrom, file: newFile });
    return value === s.value ? [] : [{ start: s.start, end: s.end, value }];
  });
  project.removeSourceFile(sf);
  return edits.length === 0 ? text : applyEdits(text, edits);
}

export function newProject(): Project {
  return new Project({
    useInMemoryFileSystem: true,
    skipFileDependencyResolution: true,
    compilerOptions: { allowJs: true, jsx: 1 },
  });
}
