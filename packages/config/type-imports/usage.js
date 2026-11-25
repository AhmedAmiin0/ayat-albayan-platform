// Whether an import is only ever used as a type (the reading of typescript-eslint's
// consistent-type-imports): `typeof A` in a type counts as a type use.
import { inMetadata } from './metadata.js';

/** `typeof A` / `typeof A.b`: a value reference that only feeds a type. */
function inTypeQuery(identifier) {
  let node = identifier.parent;
  while (node?.type === 'TSQualifiedName') node = node.parent;
  return node?.type === 'TSTypeQuery';
}

const isTypeUse = (ref) => (ref.isValueReference ? inTypeQuery(ref.identifier) : true);

/**
 * True when `specifier` is used, and every use is a type that does not become decorator
 * metadata (`ranges`, metadata.js).
 */
export function onlyTypes({ sourceCode, specifier, ranges }) {
  const refs = sourceCode.getDeclaredVariables(specifier).flatMap((v) => v.references);
  const typeOnly = (ref) => isTypeUse(ref) && !inMetadata(ranges, ref.identifier);
  return refs.length > 0 && refs.every(typeOnly);
}

export const isInlineType = (specifier) => specifier.importKind === 'type';
