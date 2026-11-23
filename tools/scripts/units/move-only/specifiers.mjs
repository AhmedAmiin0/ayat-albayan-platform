// The strings a move may change: module paths (import, export, `import()`, `import('x').T`,
// require, vi / jest mocks) and paths read from the file's own folder (`new URL(p,
// import.meta.url)`, `join(__dirname, p)`), as tools/scripts/units/write rewrites them.
import { parse, SyntaxKind } from '../../ci-checks/comment-only/source.mjs';

const PATH_CALLS =
  /^(?:(?:vi|jest)\.(?:mock|doMock|unmock|doUnmock|importActual|importMock|requireActual|requireMock|createMockFromModule)|require|require\.resolve)$/;
const JOINS = /(?:^|\.)(?:join|resolve)$/;
const DIRNAMES = new Set(['__dirname', 'import.meta.dirname']);
const TEXT = new Set([SyntaxKind.StringLiteral, SyntaxKind.NoSubstitutionTemplateLiteral]);

const texts = (nodes) => (nodes ?? []).filter((n) => n !== undefined && TEXT.has(n.kind));

const callName = (node, sf) =>
  node.expression.kind === SyntaxKind.ImportKeyword ? 'import' : node.expression.getText(sf);

function callPaths(node, sf) {
  const name = callName(node, sf);
  const [first, ...rest] = node.arguments;
  if (name === 'import' || PATH_CALLS.test(name)) return texts([first]);
  return JOINS.test(name) && DIRNAMES.has(first?.getText(sf)) ? texts(rest) : [];
}

function newPaths(node, sf) {
  const [path, base] = node.arguments ?? [];
  const url = node.expression.getText(sf) === 'URL' && base?.getText(sf) === 'import.meta.url';
  return url ? texts([path]) : [];
}

/** Each node kind that holds a path, with the literals it holds. */
const HOLDERS = {
  [SyntaxKind.ImportDeclaration]: (n) => texts([n.moduleSpecifier]),
  [SyntaxKind.ExportDeclaration]: (n) => texts([n.moduleSpecifier]),
  [SyntaxKind.ExternalModuleReference]: (n) => texts([n.expression]),
  [SyntaxKind.LiteralType]: (n) =>
    n.parent?.kind === SyntaxKind.ImportType ? texts([n.literal]) : [],
  [SyntaxKind.CallExpression]: callPaths,
  [SyntaxKind.NewExpression]: newPaths,
};

/** Every path literal under `node`; forEachChild stops at a truthy return, so walk returns none. */
function collect(node, sf, out) {
  out.push(...(HOLDERS[node.kind]?.(node, sf) ?? []));
  node.forEachChild((child) => {
    collect(child, sf, out);
  });
  return out;
}

/** `text` with every path string emptied (quotes kept), so two sides compare without them. */
export function maskSpecifiers(text, file) {
  const sf = parse(text, file);
  return collect(sf, sf, [])
    .map((lit) => ({ start: lit.getStart(sf) + 1, end: lit.getEnd() - 1 }))
    .sort((a, b) => b.start - a.start)
    .reduce((acc, { start, end }) => acc.slice(0, start) + acc.slice(end), text);
}
