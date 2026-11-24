import { z } from 'zod';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pending is the default and stays out of the URL; `?history=<id>` applies to confirmed only. */
export function parseSalesSubscriptionsSearch(s: Record<string, unknown>): { kind?: 'confirmed'; history?: string } {
  if (s['kind'] !== 'confirmed') return {};
  const history = s['history'];
  return typeof history === 'string' && UUID.test(history) ? { kind: 'confirmed', history } : { kind: 'confirmed' };
}

/** /sales/students search: anything malformed is dropped (`.catch`), never an error page. */
const studentsSearch = z.object({
  view: z.literal('mine').optional().catch(undefined),
  student: z.string().regex(UUID).optional().catch(undefined),
});
type StudentsSearch = z.infer<typeof studentsSearch>;

/** Every student is the default and stays out of the URL; `?student=<uuid>` opens that chat. */
export function parseStudentsSearch(s: Record<string, unknown>): StudentsSearch {
  const { view, student } = studentsSearch.parse(s);
  return { ...(view ? { view } : {}), ...(student ? { student } : {}) };
}

/** Commissions is the default view. */
export function parseMoneySearch(s: Record<string, unknown>): { view?: 'statements' | 'payments' } {
  const view = s['view'];
  return view === 'payments' || view === 'statements' ? { view } : {};
}
