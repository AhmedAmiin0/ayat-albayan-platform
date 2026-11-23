// What one code file says about other workspaces: its module specifiers (the move-module walk, so
// text inside a string is never an import), its re-exports and, for the path check, its other
// string literals and `/// <reference path>` targets.
import { Project, ts } from 'ts-morph';
import { specifierNodes } from '../move-module/specifiers.ts';

const STRING = new Set([ts.SyntaxKind.StringLiteral, ts.SyntaxKind.NoSubstitutionTemplateLiteral]);

/** The string literals under `sf` that are not module specifiers (`taken` holds those starts). */
function literalsOf(sf, taken) {
  const source = sf.compilerNode;
  const out = [];
  const visit = (node) => {
    const free = STRING.has(node.kind) && !taken.has(node.getStart(source) + 1);
    out.push(...(free ? [node.text] : []));
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...out, ...sf.getPathReferenceDirectives().map((r) => r.getFileName())];
}

function factsOf(sf, wantLiterals) {
  const specs = specifierNodes(sf);
  const taken = new Set(specs.map((s) => s.start));
  return {
    specs: specs.map((s) => s.value),
    reexports: sf.getExportDeclarations().flatMap((d) => d.getModuleSpecifierValue() ?? []),
    literals: wantLiterals ? literalsOf(sf, taken) : [],
  };
}

/**
 * Parses each of `files` (text from `read`) in one in-memory project without type checking and
 * hands `visit(path, facts)` its facts; each source file is dropped after, so memory stays flat.
 */
export function eachFacts(files, { read, wantLiterals, visit }) {
  const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true } });
  for (const path of files) {
    const sf = project.createSourceFile(`/${path}`, read(path), { overwrite: true });
    visit(path, factsOf(sf, wantLiterals(path)));
    project.removeSourceFile(sf);
  }
}
