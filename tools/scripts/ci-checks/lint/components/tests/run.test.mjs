import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { test } from 'node:test';
import { gitRepo } from '../../../../units/move-only/git-repo.testing.mjs';
import { gate } from '../run.mjs';
import { COMPLIANT, DIR } from './fixtures.mjs';

const P = 'apps/staff-web/src/p';
const TWO =
  "import { x } from './x';\nexport function Card() {\n  return <b>{x}</b>;\n}\nexport function Tag() {\n  return <i />;\n}\n";
const BASE = { ...COMPLIANT, [`${P}/Card.tsx`]: TWO, [`${P}/x.ts`]: 'export const x = 1;\n' };
const OFFENDER = 'export function Loose() {\n  const [a] = useState(1);\n  return <b>{a}</b>;\n}\n';

function run(edit, { argv = [], strict = [], push = false } = {}) {
  const cwd = gitRepo({ base: BASE, branch: 'feat/x', edit });
  if (push) execFileSync('git', ['update-ref', 'refs/remotes/origin/develop', 'HEAD'], { cwd });
  const lines = [];
  const code = gate({ argv, env: {}, cwd, log: (l) => lines.push(l), strict });
  rmSync(cwd, { recursive: true, force: true });
  return { code, out: lines.join('\n') };
}

test('an added offender fails, naming the component and the check', () => {
  const { code, out } = run(({ write }) => write({ [`${P}/Loose.tsx`]: OFFENDER }));
  assert.equal(code, 1, out);
  assert.match(out, /Loose\.tsx::Loose: check 1/);
});

test('a regressed component fails', () => {
  const file = COMPLIANT[`${DIR}/RoleDialog.tsx`].replace('return (', 'const n = 1;\n  return (');
  const { code, out } = run(({ write }) => write({ [`${DIR}/RoleDialog.tsx`]: file }));
  assert.equal(code, 1, out);
  assert.match(out, /RoleDialog\.tsx::RoleDialog: check 5/);
});

test('an old offender that is only edited passes; in a STRICT workspace it fails', () => {
  const edit = ({ write }) => write({ [`${P}/Card.tsx`]: TWO.replace('<i />', '<i>t</i>') });
  assert.equal(run(edit).code, 0);
  assert.equal(run(edit, { strict: ['apps/staff-web'] }).code, 1);
});

test('a small fold whose only import changed maps to its base file through pairs', () => {
  const { code, out } = run(({ write, move }) => {
    move(`${P}/Card.tsx`, `${P}/Card/Card.tsx`);
    write({
      [`${P}/Card/Card.tsx`]: TWO.replace("'./x'", "'@/p/x'"),
      [`${P}/Card/index.ts`]: "export { Card, Tag } from './Card';\n",
    });
  });
  assert.equal(code, 0, out);
});

test('--whole <ws> counts every offender of the workspace', () => {
  const { code, out } = run(({ write }) => write({}), { argv: ['--whole', 'staff-web'] });
  assert.equal(code, 1);
  assert.match(out, /staff-web: 2 offenders/);
});

test('with no base (a develop push) it prints a notice and exits 0', () => {
  const { code, out } = run(({ write }) => write({ [`${P}/Loose.tsx`]: OFFENDER }), { push: true });
  assert.equal(code, 0);
  assert.match(out, /::notice::guard:components: 3 offenders/);
});
