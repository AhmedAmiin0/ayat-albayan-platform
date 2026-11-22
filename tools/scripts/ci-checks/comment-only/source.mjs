// The TypeScript parse both checks share: one source file per text, children without JSDoc nodes.
import ts from 'typescript';

const KINDS = {
  ts: ts.ScriptKind.TS,
  mts: ts.ScriptKind.TS,
  cts: ts.ScriptKind.TS,
  tsx: ts.ScriptKind.TSX,
  jsx: ts.ScriptKind.JSX,
};

const scriptKind = (file) => KINDS[/\.([^.]+)$/.exec(file)?.[1] ?? ''] ?? ts.ScriptKind.JS;

export const parse = (text, file) =>
  ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind(file));

const isJsDoc = (node) =>
  node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode;

/** Every child node and token of `node`; a JSDoc block is a comment, not code. */
export const childrenOf = (node, sf) => node.getChildren(sf).filter((child) => !isJsDoc(child));

/** `SyntaxKind` names; the enum's `FirstX`/`LastX` aliases would hide the real ones. */
export const KIND_NAMES = Object.entries(ts.SyntaxKind)
  .filter(([name, kind]) => typeof kind === 'number' && !/^(?:First|Last)[A-Z]/.test(name))
  .reduce((names, [name, kind]) => ({ [kind]: name, ...names }), {});

export const { SyntaxKind } = ts;

export const leadingComments = (text, pos) => ts.getLeadingCommentRanges(text, pos) ?? [];

export const trailingComments = (text, pos) => ts.getTrailingCommentRanges(text, pos) ?? [];

/** The parser's own syntax errors, as text. */
export const syntaxErrorsOf = (text, file) =>
  parse(text, file).parseDiagnostics.map((d) =>
    ts.flattenDiagnosticMessageText(d.messageText, ' '),
  );
