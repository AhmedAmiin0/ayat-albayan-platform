import assert from 'node:assert/strict';
import { test } from 'node:test';
import { forbiddenImportsRule } from './eslint-imports.js';
import { webBlocks } from './lint-web.js';
import { testRule } from './rule-testers.js';

const RULE = 'ab/forbidden-imports';
const bansFor = (blocks, file) =>
  blocks.filter((b) => b.rules?.[RULE] && b.files.includes(file)).map((b) => b.rules[RULE][1]);
const app = webBlocks({ root: '/repo/apps/web', module: 'src/features/[^/]+' });
const kit = webBlocks({ root: '/repo/packages/web-kit' });
const [appTsx] = bansFor(app, 'src/**/*.tsx');
const [appTs] = bansFor(app, 'src/**/*.ts');
const [kitTsx] = bansFor(kit, 'src/**/*.tsx');
const err = (n = 1) => Array.from({ length: n }, () => ({ messageId: 'banned' }));

test('an app has one ban list per file kind and the kit bans no kit path', () => {
  assert.equal(bansFor(app, 'src/**/*.tsx').length, 1);
  assert.equal(bansFor(app, 'src/**/*.ts').length, 1);
  assert.deepEqual(bansFor(kit, 'src/**/*.ts'), []);
});

testRule(
  { name: 'web app components', rule: forbiddenImportsRule },
  {
    valid: [
      { code: "import { t, Button } from '@ab/web-kit';", options: [appTsx] },
      { code: "import { ClassroomRoom } from '@ab/web-kit/room';", options: [appTsx] },
      { code: "import { portalFixtures } from '@ab/web-kit/testing';", options: [appTsx] },
    ],
    invalid: [
      { code: "import { apiFetch, t } from '@ab/web-kit';", options: [appTsx], errors: err() },
      { code: "import { apiSend } from '@/lib/http/api';", options: [appTsx], errors: err() },
      {
        code: "import { Button } from '@ab/web-kit/components/ui/form/button';",
        options: [appTsx],
        errors: err(),
      },
      { code: "export * from '@ab/web-kit/lib/clock';", options: [appTsx], errors: err() },
    ],
  },
);

testRule(
  { name: 'web app modules', rule: forbiddenImportsRule },
  {
    valid: [
      { code: "import { apiFetch } from '@ab/web-kit';", options: [appTs] },
      { code: "import { x } from '@ab/web-kit-extra/a';", options: [appTs] },
    ],
    invalid: [
      { code: "import { t } from '@ab/web-kit/lib/i18n/i18n';", options: [appTs], errors: err() },
      { code: "import { r } from '@ab/web-kit/roomy';", options: [appTs], errors: err() },
    ],
  },
);

testRule(
  { name: 'web kit components', rule: forbiddenImportsRule },
  {
    valid: [
      {
        code: "import { Button } from '@ab/web-kit/components/ui/form/button';",
        options: [kitTsx],
      },
    ],
    invalid: [
      {
        code: "import { apiFetch } from '@ab/web-kit/lib/http/api';",
        options: [kitTsx],
        errors: err(),
      },
    ],
  },
);
