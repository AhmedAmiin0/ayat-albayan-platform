import { testRule } from '../../rule-testers.js';
import { noRawDbErrorRule } from '../index.js';

const raw = { messageId: 'raw' };
const unique = { messageId: 'unique' };
const ERRORS_UNIT = '/repo/apps/api/src/common/db/errors/pg-error.ts';

testRule({ name: 'no-raw-db-error', rule: noRawDbErrorRule, lang: 'ts' }, {
  valid: [
    'if (error) throw pgError(error);',
    'if (error) throw pgError(error, { otherwise: toNotFound });',
    "throw new Error('missing row');",
    'throw new Error(`upload failed: ${res.status}`);',
    'throw new NotFoundException(error.code);',
    "const code = '23503';",
    'if (isUniqueViolation(error)) return null;',
    { code: "export const UNIQUE_VIOLATION = '23505';", filename: ERRORS_UNIT },
  ],
  invalid: [
    { code: 'if (error) throw dbError(error);', errors: [raw] },
    { code: 'if (error) throw new Error(error.message);', errors: [raw] },
    { code: 'throw new Error(`read failed: ${error.message}`);', errors: [raw] },
    { code: 'if (res.error) throw new Error(res.error.message);', errors: [raw] },
    { code: "throw new Error('db: ' + error.message);", errors: [raw] },
    { code: "if (error?.code === '23505') return null;", errors: [unique] },
  ],
});
