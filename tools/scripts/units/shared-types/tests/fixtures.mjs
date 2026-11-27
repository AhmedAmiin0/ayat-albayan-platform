// A small monorepo: one api type a client imports, a same-shape enum in two apps, one name in two
// workspaces with different shapes, and component props.
export const FILES = new Map(
  Object.entries({
    'apps/api/src/modules/sales/leads/lead.types.ts':
      'export interface LeadRow { id: string; name: string }\n' +
      "export type LeadStage = 'new' | 'won';\n",
    'apps/staff-web/src/features/sales/leads/stage.ts':
      "export const leadStage = z.enum(['won', 'new']);\n",
    'apps/staff-mobile/src/sales/leads/stage.ts':
      "import { leadStage } from '@/sales/leads';\n" +
      'export type Total = { amount: number; currency: string };\n',
    'packages/shared/src/finance/total.ts':
      'export interface Total { amount: string; currency: string }\n',
    'packages/web-kit/src/Badge/Badge.types.ts':
      'export interface BadgeProps { tone: string; label: string }\n',
    'packages/mobile-kit/src/Badge/Badge.types.ts':
      'export interface BadgeProps { tone: string; label: string }\n',
    'apps/staff-web/src/features/finance/total.ts': "import type { Total } from '@ab/shared';\n",
    'apps/staff-web/src/broken.ts': 'export interface Broken { a: string',
    'apps/staff-web/src/x.test.ts': 'export interface Hidden { a: string; b: string }\n',
  }),
);
