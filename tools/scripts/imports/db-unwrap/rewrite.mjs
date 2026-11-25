// One api file: each `if (error) throw dbError(error)` site becomes rows/one/maybe/done when
// sites.mjs proves the shape, any other dbError call becomes pgError with the same map, and the
// import follows. A dbError reference that is not a call is reported and keeps its import.
import { SyntaxKind } from 'ts-morph';
import { readHelper, siteOf } from './sites.mjs';

const DEFAULT_SOURCES = new Set(['@/common/http/http', './http/http']);
const PEOPLE_SOURCES = new Set([
  '@/modules/people/guardians',
  '@/modules/people/guardians/http',
  './http',
]);
const ERRORS_SOURCE = '@/common/db/errors';
const NAMES = ['rows', 'one', 'maybe', 'done', 'pgError', 'peopleErrors'];

function dbErrorImport(sf) {
  const decl = sf
    .getImportDeclarations()
    .find((d) => d.getNamedImports().some((n) => n.getName() === 'dbError'));
  if (decl === undefined) return null;
  const source = decl.getModuleSpecifierValue();
  const people = PEOPLE_SOURCES.has(source);
  return DEFAULT_SOURCES.has(source) || people
    ? { decl, people }
    : { decl, people, unknown: source };
}

const mapArg = (people, call) => {
  const code = call.getArguments()[1]?.getText();
  return people ? `, peopleErrors(${code ?? ''})` : '';
};

const isDbErrorCall = (node) =>
  node.getKind() === SyntaxKind.CallExpression && node.getExpression().getText() === 'dbError';

/** The dbError call of `if (error) throw dbError(error[, code])` with no else, or null. */
function thrownCall(ifStmt) {
  const thrown = ifStmt.getThenStatement();
  const call = thrown.getKind() === SyntaxKind.ThrowStatement ? thrown.getExpression() : null;
  const plain = ifStmt.getExpression().getText() === 'error' && !ifStmt.getElseStatement();
  const ofError =
    call !== null && isDbErrorCall(call) && call.getArguments()[0]?.getText() === 'error';
  return plain && ofError ? call : null;
}

const adjacent = (site, ifStmt) =>
  ifStmt.getSourceFile().getFullText().slice(site.statement.getEnd(), ifStmt.getStart()).trim() ===
  '';

const helperOf = (site) => (site.data === '' ? 'done' : readHelper(site.awaited));

function siteEdit(ifStmt, ctx) {
  const call = thrownCall(ifStmt);
  const site = call && siteOf(ifStmt);
  const helper = site && adjacent(site, ifStmt) ? helperOf(site) : null;
  if (!helper || ctx.taken.has(helper)) return null;
  ctx.used.add(helper);
  const value = `${helper}(await ${site.awaited.getText()}${mapArg(ctx.people, call)})`;
  const text = site.data === '' ? `${value};` : `const ${site.data} = ${value};`;
  return { start: site.statement.getStart(), end: ifStmt.getEnd(), value: text, covers: call };
}

function callEdit(call, ctx) {
  ctx.used.add('pgError');
  const value = `pgError(${call.getArguments()[0].getText()}${mapArg(ctx.people, call)})`;
  return { start: call.getStart(), end: call.getEnd(), value };
}

export { ERRORS_SOURCE, NAMES, callEdit, dbErrorImport, isDbErrorCall, siteEdit };
