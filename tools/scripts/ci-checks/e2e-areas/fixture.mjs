// A tiny repo for the e2e-areas tests: two pages (inbox, payments) behind barrels, a shell, an API module,
// a shared package, the UI strings and an areas map; committed, so a test can diff the bundles against HEAD.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const W = 'apps/web/src';
export const AREAS = {
  areas: {
    inbox: {
      paths: [`${W}/routes/admin/(people)/inbox.tsx`, 'apps/api/src/modules/messaging/inbox/'],
      specs: ['chat.spec.ts'],
    },
    finance: { paths: [`${W}/routes/admin/(finance)/payments.tsx`], specs: ['payments.spec.ts'] },
    paymentsLayout: { paths: [`${W}/routes/admin/payments/route.tsx`], specs: ['layout.spec.ts'] },
    paymentDetail: { paths: [`${W}/routes/admin/payments/$id.tsx`], specs: ['detail.spec.ts'] },
    translations: {
      paths: [`${W}/routes/admin/translations.tsx`],
      specs: ['translations.spec.ts'],
    },
  },
  developOnly: ['db.sql.spec.ts'],
};

export const FILES = {
  [`${W}/routes/admin.tsx`]:
    "import { Nav } from '@/components/shell/Nav';\nexport const Route = Nav;\n",
  [`${W}/routes/admin/(people)/inbox.tsx`]:
    "import { InboxPage } from '@/features/messaging/inbox';\nexport const R = InboxPage;\n",
  [`${W}/routes/admin/(finance)/payments.tsx`]:
    "import { PaymentsPage } from '@/features/finance/payments';\nexport const R = PaymentsPage;\n",
  [`${W}/routes/admin/translations.tsx`]: 'export const R = 1;\n',
  [`${W}/routes/admin/payments/route.tsx`]:
    "import { layout } from '@/features/finance/payments/layout';\nexport const R = layout;\n",
  [`${W}/routes/admin/payments/$id.tsx`]: 'export const R = 1;\n',
  [`${W}/features/finance/payments/layout.ts`]: 'export const layout = 1;\n',
  [`${W}/routeTree.gen.ts`]: "import './routes/admin';\nimport './routes/admin/(people)/inbox';\n",
  [`${W}/components/shell/Nav.tsx`]:
    "import { Badge } from '@/features/messaging/inbox';\nexport const Nav = Badge;\n",
  [`${W}/features/messaging/inbox/index.ts`]:
    "import './register';\nexport { InboxPage } from './InboxPage';\nexport { Bubble } from './Bubble';\nexport { Badge } from './Badge';\n",
  [`${W}/features/messaging/inbox/register.ts`]: 'export const registered = 1;\n',
  [`${W}/features/messaging/inbox/InboxPage.tsx`]:
    "import { Bubble } from './Bubble';\nimport { t } from '@/lib/i18n';\nexport const InboxPage = () => [Bubble, t.inbox.title];\n",
  [`${W}/features/messaging/inbox/Bubble.tsx`]:
    "import { toE164 } from '@ab/shared';\nexport function Bubble() { return toE164; }\n",
  [`${W}/features/messaging/inbox/Badge.tsx`]: 'export const Badge = 1;\n',
  [`${W}/features/messaging/inbox/Bubble.test.tsx`]: "import { Bubble } from './Bubble';\n",
  [`${W}/features/finance/payments/index.ts`]: "export { PaymentsPage } from './PaymentsPage';\n",
  [`${W}/features/finance/payments/PaymentsPage.tsx`]:
    "import { digits, money } from '@ab/shared';\nimport { t } from '@/lib/i18n';\nexport const PaymentsPage = () => [digits, money, t.pay.title];\n",
  [`${W}/lib/i18n.ts`]: "import ar from '@ab/shared/i18n/ar.json';\nexport const t = ar;\n",
  'apps/api/src/app.module.ts':
    "import { InboxService } from './modules/messaging/inbox/inbox.service';\n",
  'apps/api/src/modules/messaging/inbox/inbox.service.ts':
    "import { toE164 } from '@ab/shared';\nexport class InboxService {}\n",
  'apps/api/src/common/auth/guard.ts': 'export const guard = 1;\n',
  'packages/shared/src/index.ts':
    "export * from '@ab/core';\nexport * from './phone.js';\nexport * from './money.js';\n",
  'packages/core/src/index.ts': "export * from './digits.js';\n",
  'packages/core/src/digits.ts': 'export const digits = 1;\n',
  'packages/shared/src/phone.ts': 'export function toE164(s: string) { return s; }\n',
  'packages/shared/src/money.ts': 'export const money = 1;\n',
  'packages/shared/i18n/ar.json':
    '{ "inbox": { "title": "المحادثات" }, "pay": { "title": "المدفوعات" }, "orphan": { "x": "س" } }\n',
  'packages/db/supabase/migrations/1_init.sql': 'select 1;\n',
  'e2e/areas.json': `${JSON.stringify(AREAS, null, 2)}\n`,
  'e2e/tests/chat.spec.ts': "import { open } from '../support/open';\n",
  'e2e/tests/payments.spec.ts': "import { open } from '../support/open';\n",
  'e2e/tests/translations.spec.ts': '\n',
  'e2e/tests/layout.spec.ts': '\n',
  'e2e/tests/detail.spec.ts': '\n',
  'e2e/tests/db.sql.spec.ts': '\n',
  'e2e/support/open.ts': 'export const open = 1;\n',
  'pnpm-lock.yaml': 'lockfileVersion: 9\n',
  'docs/notes.md': '# notes\n',
};

/** A committed copy of FILES (plus `extra`) in a new temp dir; returns its path. */
export function makeRepo(extra = {}) {
  const root = mkdtempSync(join(tmpdir(), 'e2e-areas-'));
  for (const [file, text] of Object.entries({ ...FILES, ...extra })) write(root, file, text);
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  git('init', '-q');
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  return root;
}

export function write(root, file, text) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), text);
}
