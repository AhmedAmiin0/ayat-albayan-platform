// docs/62 §4: page queries come from pageQuery and page windows from pageWindow, both in core's
// page unit; nowhere else writes the page math by hand.
const PAGE_UNIT = '/packages/core/src/schemas/page/';
const READS_PAGE_SIZE = /\bpageSize\b/;

const propName = (node) => node?.name ?? node?.value;
const isMember = (node, name) =>
  node?.type === 'MemberExpression' && !node.computed && propName(node.property) === name;
const isOne = (node) => node?.type === 'Literal' && node.value === 1;
const isZ = (node) => node?.type === 'Identifier' && node.name === 'z';
const isZodObject = (call) => isMember(call.callee, 'object') && isZ(call.callee.object);
const hasPageSizeKey = (obj) =>
  obj?.type === 'ObjectExpression' &&
  obj.properties.some((p) => p.type === 'Property' && propName(p.key) === 'pageSize');
const isPageOffset = (node) => node.operator === '-' && isMember(node.left, 'page') && isOne(node.right);

export const noHandPagingRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Page through pageQuery and pageWindow (docs/62 §4).' },
    schema: [],
    messages: {
      range: 'Read the page with readPage or pageWindow (common/db/page, @ab/core).',
      offset: 'Take the page window from pageWindow (@ab/core).',
      schema: 'Spread pageQuery({ size, max }) (@ab/core) into the query schema.',
    },
  },
  create(context) {
    if (context.filename.includes(PAGE_UNIT)) return {};
    const text = (node) => context.sourceCode.getText(node);
    const readsPageSize = (call) =>
      isMember(call.callee, 'range') && call.arguments.some((a) => READS_PAGE_SIZE.test(text(a)));
    const callChecks = [
      { messageId: 'range', matches: readsPageSize },
      { messageId: 'schema', matches: (call) => isZodObject(call) && hasPageSizeKey(call.arguments[0]) },
    ];
    const onCall = (node) =>
      callChecks
        .filter((check) => check.matches(node))
        .forEach(({ messageId }) => context.report({ node, messageId }));
    const onMinus = (node) => isPageOffset(node) && context.report({ node, messageId: 'offset' });
    return { CallExpression: onCall, BinaryExpression: onMinus };
  },
};
