import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { after, test } from 'node:test';
import { makeRepo, write } from './fixture.mjs';
import { selectSpecs } from './select.mjs';

const root = makeRepo();
after(() => rmSync(root, { recursive: true, force: true }));
const pick = (...files) => selectSpecs({ root, files, base: 'HEAD' });
const W = 'apps/web/src/features';

test('a chat-only change runs the chat specs only', () => {
  assert.deepEqual(pick(`${W}/messaging/inbox/InboxPage.tsx`), {
    full: false,
    reason: '1 spec file(s) from the changed areas',
    specs: ['chat.spec.ts'],
  });
});

test('an API module change runs its area; the registry importing it does not widen it', () => {
  assert.deepEqual(pick('apps/api/src/modules/messaging/inbox/inbox.service.ts').specs, [
    'chat.spec.ts',
  ]);
});

test('a shared file runs every page that imports it by name, through the barrel', () => {
  assert.deepEqual(pick('packages/shared/src/money.ts').specs, ['payments.spec.ts']);
  assert.deepEqual(pick('packages/shared/src/phone.ts').specs, ['chat.spec.ts']);
});

test('a file of a package cut from shared runs its pages through the @ab/shared facade', () => {
  assert.deepEqual(pick('packages/core/src/digits.ts'), {
    full: false,
    reason: '1 spec file(s) from the changed areas',
    specs: ['payments.spec.ts'],
  });
});

test('a file the shell reaches runs everything', () => {
  const r = pick(`${W}/messaging/inbox/Badge.tsx`);
  assert.equal(r.full, true);
  assert.match(r.reason, /routes\/admin\.tsx/);
});

test('a migration, the lockfile, a common API file, an e2e helper or the workflow run everything', () => {
  for (const f of [
    'packages/db/supabase/migrations/2_more.sql',
    'pnpm-lock.yaml',
    'apps/web/package.json',
    'apps/api/src/common/auth/guard.ts',
    'apps/api/src/app.module.ts',
    'e2e/support/open.ts',
    'e2e/playwright.config.ts',
    '.github/workflows/ci.yml',
    'tools/scripts/ci-checks/e2e-shards.mjs',
    'tools/scripts/ci-checks/e2e-areas/select.mjs',
    'apps/web/src/components/shell/Nav.tsx',
  ])
    assert.equal(pick(f).full, true, f);
});

test('a file no area lists runs everything', () => {
  write(
    root,
    'apps/web/src/routes/admin/unmapped.tsx',
    "import { InboxPage } from '@/features/messaging/inbox';\n",
  );
  try {
    const r = selectSpecs({
      root,
      files: ['apps/web/src/routes/admin/unmapped.tsx'],
      base: 'HEAD',
    });
    assert.equal(r.full, true);
    assert.match(r.reason, /unmapped\.tsx/);
  } finally {
    rmSync(`${root}/apps/web/src/routes/admin/unmapped.tsx`);
  }
  assert.equal(pick('apps/web/src/features/x/style.css').full, true);
});

test('docs, unit tests, baselines and the mobile app run no e2e spec', () => {
  assert.deepEqual(
    pick(
      'docs/notes.md',
      `${W}/messaging/inbox/Bubble.test.tsx`,
      'refactor/folder-cap/web.json',
      'apps/mobile/src/a.tsx',
    ),
    {
      full: false,
      reason: '0 spec file(s) from the changed areas',
      specs: [],
    },
  );
});

test('a changed spec runs itself; a deleted page file is followed through its changed importers', () => {
  assert.deepEqual(pick('e2e/tests/db.sql.spec.ts').specs, ['db.sql.spec.ts']);
  assert.deepEqual(pick(`${W}/messaging/inbox/Gone.tsx`).specs, []);
});

test('a broken or missing areas map throws (the CLI turns any throw into the full suite)', () => {
  const broken = makeRepo({ 'e2e/areas.json': '{ "areas": { "inbox": { "paths": [] } } }' });
  try {
    assert.throws(
      () => selectSpecs({ root: broken, files: [`${W}/messaging/inbox/InboxPage.tsx`] }),
      /needs paths and specs/,
    );
  } finally {
    rmSync(broken, { recursive: true, force: true });
  }
});

test('an edited barrel runs everyone importing from it (re-pointed or renamed re-exports)', () => {
  const r = pick(`${W}/messaging/inbox/index.ts`);
  assert.equal(r.full, true, 'the shell imports from this barrel');
  assert.deepEqual(pick('packages/shared/src/index.ts').specs, [
    'chat.spec.ts',
    'payments.spec.ts',
  ]);
});

test("a barrel's side-effect import reaches whoever imports from the barrel", () => {
  assert.equal(pick(`${W}/messaging/inbox/register.ts`).full, true, 'the shell imports from it');
});

test('a layout route also runs the specs of the pages it renders', () => {
  assert.deepEqual(pick(`${W}/finance/payments/layout.ts`).specs, [
    'detail.spec.ts',
    'layout.spec.ts',
  ]);
});
