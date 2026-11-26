import { testRule } from '../../rule-testers.js';
import { noHandPagingRule } from '../index.js';

const range = { messageId: 'range' };
const offset = { messageId: 'offset' };
const schema = { messageId: 'schema' };
const PAGE_UNIT = '/repo/packages/core/src/schemas/page/page.schemas.ts';

testRule({ name: 'no-hand-paging', rule: noHandPagingRule, lang: 'ts' }, {
  valid: [
    'q.range(from, to);',
    'q.range(0, 0);',
    'q.range(from, from + CHUNK - 1);',
    'onPage(page - 1);',
    'const shown = total - (page - 1) * size;',
    'const prev = lesson.order - 1;',
    'z.object({ page: z.number().int() });',
    'z.object({ limit: z.number().int() });',
    'const fixture = { page: 1, pageSize: 25 };',
    'z.object({ ...pageQuery({ size: 25 }), q: z.string() });',
    {
      code: 'const shape = z.object({ pageSize: z.coerce.number() });',
      filename: PAGE_UNIT,
    },
  ],
  invalid: [
    { code: 'q.range(from, from + input.pageSize - 1);', errors: [range] },
    { code: 'q.range(0, pageSize - 1);', errors: [range] },
    { code: 'const from = (input.page - 1) * input.pageSize;', errors: [offset] },
    { code: 'const from = (q.page - 1) * size;', errors: [offset] },
    { code: 'z.object({ pageSize: z.coerce.number() });', errors: [schema] },
    { code: "z.object({ 'pageSize': z.number(), q: z.string() });", errors: [schema] },
  ],
});
