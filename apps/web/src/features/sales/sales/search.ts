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

/** /sales/students: `?view=mine` filters to «طلابي»; every student is the default and stays out of the URL. */
export const parseStudentsSearch = (s: Record<string, unknown>): { view?: 'mine' } =>
  s['view'] === 'mine' ? { view: 'mine' } : {};

/** /sales/earnings «محفظتي»: `?view=statements` «الكشوف», `?view=payments` «مدفوعاتي»; «العمولات» is the default. */
export function parseMoneySearch(s: Record<string, unknown>): { view?: 'statements' | 'payments' } {
  const view = s['view'];
  return view === 'payments' || view === 'statements' ? { view } : {};
}
