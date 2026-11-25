// The autofix (fixStyle `separate-type-imports`): a whole declaration becomes `import type`; a
// partly type-only one keeps its values and gains an `import type` line below it.

const isNamed = (specifier) => specifier.type === 'ImportSpecifier';

const textOf = (sourceCode, nodes) => nodes.map((n) => sourceCode.getText(n)).join(', ');

const hasAttributes = (node) => (node.attributes ?? []).length > 0;

/** `import A, { b }` cannot take one `type` keyword; inline `type` markers would need removing. */
function wholeFixable(node) {
  const named = node.specifiers.filter(isNamed);
  const mixed = named.length > 0 && named.length < node.specifiers.length;
  return !mixed && !named.some((s) => s.importKind === 'type') && !hasAttributes(node);
}

export function fixWhole(node) {
  const IMPORT = 'import'.length;
  const at = [node.range[0], node.range[0] + IMPORT];
  return wholeFixable(node) ? (fixer) => fixer.insertTextAfterRange(at, ' type') : null;
}

/** The kept clause: a default import, then the named values in braces. */
function keptClause({ sourceCode, kept }) {
  const head = kept.filter((s) => !isNamed(s));
  const named = kept.filter(isNamed);
  const braces = named.length > 0 ? [`{ ${textOf(sourceCode, named)} }`] : [];
  return [...head.map((s) => sourceCode.getText(s)), ...braces].join(', ');
}

/** Only named, non-inline specifiers move; anything else is left to the author. */
const partFixable = ({ node, types }) => types.every(isNamed) && !hasAttributes(node);

export function fixPart({ sourceCode, node, types }) {
  const kept = node.specifiers.filter((s) => !types.includes(s));
  const from = node.source.raw;
  const text = [
    `import ${keptClause({ sourceCode, kept })} from ${from};`,
    `import type { ${textOf(sourceCode, types)} } from ${from};`,
  ].join('\n');
  return partFixable({ node, types }) ? (fixer) => fixer.replaceText(node, text) : null;
}
