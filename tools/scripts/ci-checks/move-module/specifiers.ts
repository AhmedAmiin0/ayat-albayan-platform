import { Node, SyntaxKind, type SourceFile } from 'ts-morph';

/** A module specifier string in a source file: its text span (quotes excluded) and value. */
export interface SpecNode {
  start: number;
  end: number;
  value: string;
}

/** Calls whose first string argument is a module path (mocks, require, dynamic import). */
const PATH_CALLS =
  /^(?:(?:vi|jest)\.(?:mock|doMock|unmock|doUnmock|importActual|importMock|requireActual|requireMock|createMockFromModule)|require|require\.resolve)$/;

function literal(node: Node | undefined): SpecNode | undefined {
  if (node === undefined) return undefined;
  if (!Node.isStringLiteral(node) && !Node.isNoSubstitutionTemplateLiteral(node)) return undefined;
  return { start: node.getStart() + 1, end: node.getEnd() - 1, value: node.getLiteralValue() };
}

function callSpec(node: Node): SpecNode | undefined {
  if (!Node.isCallExpression(node)) return undefined;
  const callee = node.getExpression();
  const name = callee.getKind() === SyntaxKind.ImportKeyword ? 'import' : callee.getText();
  if (name !== 'import' && !PATH_CALLS.test(name)) return undefined;
  return literal(node.getArguments()[0]);
}

function typeSpec(node: Node): SpecNode | undefined {
  if (!Node.isImportTypeNode(node)) return undefined;
  const arg = node.getArgument();
  return Node.isLiteralTypeNode(arg) ? literal(arg.getLiteral()) : undefined;
}

function declSpec(node: Node): SpecNode | undefined {
  if (Node.isImportDeclaration(node) || Node.isExportDeclaration(node)) {
    return literal(node.getModuleSpecifier());
  }
  if (Node.isExternalModuleReference(node)) return literal(node.getExpression());
  return undefined;
}

/** Every import, re-export, `import()`, `import('x').T`, require and vi/jest mock path in the file. */
export function specifierNodes(sf: SourceFile): SpecNode[] {
  const out: SpecNode[] = [];
  sf.forEachDescendant((node) => {
    const spec = declSpec(node) ?? callSpec(node) ?? typeSpec(node);
    if (spec !== undefined) out.push(spec);
  });
  return out;
}

/** Applies span replacements (from the end, so earlier spans keep their offsets). */
export function applyEdits(text: string, edits: { start: number; end: number; value: string }[]): string {
  return [...edits]
    .sort((a, b) => b.start - a.start)
    .reduce((acc, e) => acc.slice(0, e.start) + e.value + acc.slice(e.end), text);
}
