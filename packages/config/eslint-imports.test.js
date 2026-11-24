import assert from 'node:assert/strict';
import { test } from 'node:test';
import { forbiddenImports } from './eslint-boundaries.js';
import { forbiddenImportsRule } from './eslint-imports.js';
import { lintCode, withCode } from './oxlint/testing/lint-code.js';
import { testRule } from './rule-testers.js';

const db = [{ bans: [{ regex: '(^|/)db\\.module(\\.js)?$', names: ['DB', 'Db'], message: 'repo only' }] }];
const all = [{ bans: [{ regex: '^lodash$', message: 'no lodash' }] }];
const banned = (message) => ({ messageId: 'banned', data: { message } });

testRule({ name: 'forbidden-imports', rule: forbiddenImportsRule }, {
  valid: [
    { code: "import { DbModule } from '../common/db/db.module.js';", options: db },
    { code: "import { DB } from './db.modules.js';", options: db },
    { code: "import x from 'lodash-es';", options: all },
  ],
  invalid: [
    {
      code: "import { DB, DbModule, Db } from '../../common/db/db.module.js';",
      options: db,
      errors: [banned('repo only'), banned('repo only')],
    },
    { code: "export { DB } from './db.module';", options: db, errors: [banned('repo only')] },
    { code: "import * as db from './db.module.js';", options: db, errors: [banned('repo only')] },
    { code: "export * from './db.module.js';", options: db, errors: [banned('repo only')] },
    { code: "export * as db from './db.module.js';", options: db, errors: [banned('repo only')] },
    { code: "import x from 'lodash';", options: all, errors: [banned('no lodash')] },
    { code: "export * from 'lodash';", options: all, errors: [banned('no lodash')] },
  ],
});

test('forbiddenImports: the ban applies to `files`, never to tests or `ignores`', () => {
  const block = forbiddenImports({ files: ['src/**/*.ts'], ignores: ['**/*.repo.ts'], bans: db[0].bans });
  const files = ['src/a.ts', 'src/a.repo.ts', 'src/a.test.ts', 'lib/a.ts'];
  const code = "import { DB } from './db.module.js';\nexport { DB };\n";
  const found = lintCode({ blocks: [block], files: withCode(files, code) });
  const lint = (file) => found.filter((d) => d.file === file).length;
  assert.deepEqual(files.map(lint), [1, 0, 0, 0]);
});
