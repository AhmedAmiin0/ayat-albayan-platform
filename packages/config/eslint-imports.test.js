import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Linter, RuleTester } from 'eslint';
import { forbiddenImports } from './eslint-boundaries.js';
import { forbiddenImportsRule } from './eslint-imports.js';

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2024, sourceType: 'module' } });
const db = [{ bans: [{ regex: '(^|/)db\\.module(\\.js)?$', names: ['DB', 'Db'], message: 'repo only' }] }];
const all = [{ bans: [{ regex: '^lodash$', message: 'no lodash' }] }];
const banned = (message) => ({ messageId: 'banned', data: { message } });

tester.run('forbidden-imports', forbiddenImportsRule, {
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
    { code: "import x from 'lodash';", options: all, errors: [banned('no lodash')] },
    { code: "export * from 'lodash';", options: all, errors: [banned('no lodash')] },
  ],
});

test('forbiddenImports: the ban applies to `files`, never to tests or `ignores`', () => {
  const block = forbiddenImports({ files: ['src/**/*.ts'], ignores: ['**/*.repo.ts'], bans: db[0].bans });
  const linter = new Linter({ cwd: '/pkg' });
  const lint = (file) => linter.verify("import { DB } from './db.module.js';", [block], `/pkg/${file}`).filter((m) => m.ruleId).length;
  assert.deepEqual(['src/a.ts', 'src/a.repo.ts', 'src/a.test.ts', 'lib/a.ts'].map(lint), [1, 0, 0, 0]);
});
