// docs/62 part 2 §4 rule A: a const table of literal values typed with a hand-written Record whose
// key or value is not a bare primitive is an enum value map, written as a decoded zod record.
const PRIMITIVE = new Set(['TSStringKeyword', 'TSNumberKeyword', 'TSBooleanKeyword']);
const WRAPPERS = new Set(['Partial', 'Readonly']);

const nameOf = (type) => (type?.type === 'TSTypeReference' ? type.typeName?.name : undefined);
const argsOf = (type) => type.typeArguments?.params ?? type.typeParameters?.params ?? [];

/** The `Record<K, V>` inside `type`, bare or under Partial/Readonly, or null. */
function recordOf(type) {
  const name = nameOf(type);
  if (WRAPPERS.has(name ?? '')) return recordOf(argsOf(type)[0]);
  return name === 'Record' ? argsOf(type) : null;
}

const isNegativeNumber = (v) =>
  v.type === 'UnaryExpression' && v.operator === '-' && typeof v.argument.value === 'number';
const isLiteral = (v) => (v.type === 'Literal' && !v.regex) || isNegativeNumber(v);
const isLiteralTable = (obj) =>
  obj?.type === 'ObjectExpression' &&
  obj.properties.length > 0 &&
  obj.properties.every((p) => p.type === 'Property' && isLiteral(p.value));

const isAsConst = (node) =>
  node.type === 'TSAsExpression' && nameOf(node.typeAnnotation) === 'const';
const unwrapConst = (node) => (isAsConst(node) ? node.expression : node);

/** The table's literal and its hand-written type, from an annotation or a non-const satisfies. */
function tableOf(decl) {
  const annotated = decl.id.typeAnnotation?.typeAnnotation;
  if (annotated) return { obj: unwrapConst(decl.init), type: annotated };
  const sat = decl.init.type === 'TSSatisfiesExpression' && !isAsConst(decl.init.expression);
  return sat ? { obj: decl.init.expression, type: decl.init.typeAnnotation } : null;
}

const isTyped = (args) => args.length === 2 && !args.every((t) => PRIMITIVE.has(t.type));

export const noTypedValueTableRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Write an enum value table as a decoded zod record (docs/62 part 2 §4).' },
    schema: [],
    messages: {
      typed:
        'Write this table as z.record(fromSchema, toSchema).readonly().decode({…}) (null for ' +
        'no mapping), with its type from the schemas; keep it beside its readers.',
    },
  },
  create(context) {
    const check = (decl) => {
      if (decl.parent.kind !== 'const' || !decl.init) return;
      const table = tableOf(decl);
      const args = table && isLiteralTable(table.obj) ? recordOf(table.type) : null;
      if (args && isTyped(args)) context.report({ node: decl, messageId: 'typed' });
    };
    return { VariableDeclarator: check };
  },
};
