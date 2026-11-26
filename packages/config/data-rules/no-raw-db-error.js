// docs/62 §4: where a database client is allowed, a Postgres error is answered through pgError
// (common/db/errors), never as a raw 500 that carries the database's text.
const ERRORS_UNIT = '/common/db/errors/';
const READS_ERROR_TEXT = /\berror\??\.message\b/;
const UNIQUE_VIOLATION = '23505';

const calleeName = (node) => (node?.type === 'Identifier' ? node.name : undefined);
const isDbErrorCall = (arg) => arg?.type === 'CallExpression' && calleeName(arg.callee) === 'dbError';
const isNewError = (arg) => arg?.type === 'NewExpression' && calleeName(arg.callee) === 'Error';

export const noRawDbErrorRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Answer database errors through pgError (docs/62 §4).' },
    schema: [],
    messages: {
      raw: 'Throw pgError(error) (common/db/errors): it maps the SQLSTATE and logs the text.',
      unique: 'Check a unique violation with isUniqueViolation or uniqueViolationOn (common/db/errors).',
    },
  },
  create(context) {
    const text = (node) => context.sourceCode.getText(node);
    const readsErrorText = (arg) =>
      isNewError(arg) && arg.arguments.some((a) => READS_ERROR_TEXT.test(text(a)));
    const isRaw = (arg) => isDbErrorCall(arg) || readsErrorText(arg);
    const isUniqueCode = (node) =>
      node.value === UNIQUE_VIOLATION && !context.filename.includes(ERRORS_UNIT);
    const onThrow = (node) => isRaw(node.argument) && context.report({ node, messageId: 'raw' });
    const onLiteral = (node) => isUniqueCode(node) && context.report({ node, messageId: 'unique' });
    return { ThrowStatement: onThrow, Literal: onLiteral };
  },
};
