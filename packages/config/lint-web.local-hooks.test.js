// docs/63 §3: a component's own hook (`Name/use-name.ts`) is held to the component's ban list.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { webBlocks } from './lint-web.js';
import { packageOverrides } from './oxlint/config.js';
import { rulesFor } from './oxlint/resolve.js';

const RULE = 'ab/forbidden-imports';
const bansOf = (blocks, file) =>
  rulesFor({ rules: {}, ...packageOverrides({ dir: 'pkg', react: true, blocks }) }, `pkg/${file}`)[
    RULE
  ]?.[1]?.bans ?? [];
const names = (bans) => bans.map((b) => b.regex);

test('an app local hook gets the component bans, kit paths included', () => {
  const app = webBlocks({ root: '/repo/apps/web', module: 'src/features/[^/]+' });
  const view = names(bansOf(app, 'src/features/x/Card/Card.tsx'));
  assert.equal(view.length, 3);
  assert.deepEqual(names(bansOf(app, 'src/features/x/Card/use-card.ts')), view);
  assert.equal(names(bansOf(app, 'src/features/x/use-shared.ts')).length, 1);
});

test('a kit local hook bans apiFetch; a shared kit hook does not', () => {
  const kit = webBlocks({ root: '/repo/packages/web-kit' });
  assert.equal(bansOf(kit, 'src/ui/Card/use-card.ts').length, 1);
  assert.deepEqual(bansOf(kit, 'src/ui/use-shared.ts'), []);
});
