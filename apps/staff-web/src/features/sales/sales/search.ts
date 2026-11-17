const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `?kind=confirmed` opens «مؤكدة»; pending is the default and stays out of the URL. `?history=<id>`
 * (a subscription id, «مؤكدة» only) opens that subscription's history.
 */
export function parseSalesSubscriptionsSearch(s: Record<string, unknown>): { kind?: 'confirmed'; history?: string } {
  if (s['kind'] !== 'confirmed') return {};
  const history = s['history'];
  return typeof history === 'string' && UUID.test(history) ? { kind: 'confirmed', history } : { kind: 'confirmed' };
}

interface StudentsSearch {
  view?: 'mine';
  student?: string;
}

/**
 * /sales/students: `?view=mine` filters to «طلابي»; every student is the default and stays out of
 * the URL. `?student=<uuid>` opens that student's chat (a chat notification, owner 2026-11-16).
 */
export function parseStudentsSearch(s: Record<string, unknown>): StudentsSearch {
  const { student } = s;
  const chat = typeof student === 'string' && UUID.test(student) ? { student } : {};
  return { ...(s['view'] === 'mine' ? { view: 'mine' as const } : {}), ...chat };
}

/** /sales/earnings «محفظتي»: `?view=statements` «الكشوف», `?view=payments` «مدفوعاتي»; «العمولات» is the default. */
export function parseMoneySearch(s: Record<string, unknown>): { view?: 'statements' | 'payments' } {
  const view = s['view'];
  return view === 'payments' || view === 'statements' ? { view } : {};
}
