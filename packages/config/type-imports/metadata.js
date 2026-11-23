// The places `emitDecoratorMetadata` turns a type into a runtime value (design:paramtypes,
// design:type, design:returntype): Nest reads them to inject a class, so an import named there must
// stay a value import even when the code only uses it as a type.

const hasDecorators = (node) => (node.decorators ?? []).length > 0;

/** A parameter property (`private readonly a: A`) wraps the parameter that holds the type. */
const annotationOf = (param) => (param.type === 'TSParameterProperty' ? param.parameter : param);

const paramAnnotations = (fn) => fn.params.map((p) => annotationOf(p).typeAnnotation);

const anyParamDecorated = (fn) => fn.params.some(hasDecorators);

const isConstructor = (member) => member.kind === 'constructor';

/** A constructor's parameter types are emitted when the class or one parameter is decorated. */
function constructorTypes(classNode, member) {
  const emitted = hasDecorators(classNode) || anyParamDecorated(member.value);
  return emitted ? paramAnnotations(member.value) : [];
}

/** A method's (or accessor's) parameter and return types are emitted when it is decorated. */
function methodTypes(member) {
  const emitted = hasDecorators(member) || anyParamDecorated(member.value);
  return emitted ? [...paramAnnotations(member.value), member.value.returnType] : [];
}

const propertyTypes = (member) => (hasDecorators(member) ? [member.typeAnnotation] : []);

/**
 * The names TypeScript serialises: a type reference's name (not its type arguments: `Map<K, A>`
 * emits `Map`); a union is read member by member, which also keeps `A | null` (emitted as `A`).
 */
function emittedNames(type) {
  const EMITTED = {
    TSTypeReference: (t) => [t.typeName.range],
    TSUnionType: (t) => t.types.flatMap(emittedNames),
  };
  return EMITTED[type.type]?.(type) ?? [];
}

const METHODS = new Set(['MethodDefinition', 'TSAbstractMethodDefinition']);

function memberTypes(classNode, member) {
  const ofMethod = isConstructor(member) ? constructorTypes : (_, m) => methodTypes(m);
  return METHODS.has(member.type) ? ofMethod(classNode, member) : propertyTypes(member);
}

/** The `[start, end]` ranges of every type name in `classNode` that becomes metadata. */
export function metadataRanges(classNode) {
  return classNode.body.body
    .flatMap((member) => memberTypes(classNode, member))
    .filter((annotation) => annotation !== undefined && annotation !== null)
    .flatMap((annotation) => emittedNames(annotation.typeAnnotation));
}

/** A reference whose identifier lies inside one of `ranges`. */
export const inMetadata = (ranges, identifier) =>
  ranges.some(([start, end]) => identifier.range[0] >= start && identifier.range[1] <= end);
