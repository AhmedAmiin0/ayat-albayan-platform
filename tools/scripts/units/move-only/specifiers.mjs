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

/** Module sources only: the own-folder paths (`new URL`, `join(__dirname, …)`) are not. */
const SOURCES = {
  ...HOLDERS,
  [SyntaxKind.CallExpression]: (n, sf) => {
    const name = callName(n, sf);
    return name === 'import' || PATH_CALLS.test(name) ? texts([n.arguments[0]]) : [];
  },
  [SyntaxKind.NewExpression]: () => [],
};

/** Every path literal under `node`; forEachChild stops at a truthy return, so walk returns none. */
function collect(node, ctx, out) {
  out.push(...(ctx.holders[node.kind]?.(node, ctx.sf) ?? []));
  node.forEachChild((child) => {
    collect(child, ctx, out);
  });
  return out;
}

function mask(text, { file, holders }) {
  const sf = parse(text, file);
  return collect(sf, { sf, holders }, [])
    .map((lit) => ({ start: lit.getStart(sf) + 1, end: lit.getEnd() - 1 }))
    .sort((a, b) => b.start - a.start)
    .reduce((acc, { start, end }) => acc.slice(0, start) + acc.slice(end), text);
}

/** `text` with every path string emptied (quotes kept), so two sides compare without them. */
export const maskSpecifiers = (text, file) => mask(text, { file, holders: HOLDERS });

/** `text` with its module sources emptied: an import rewrite changes nothing else. */
export const maskSources = (text, file) => mask(text, { file, holders: SOURCES });
