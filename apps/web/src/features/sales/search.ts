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
