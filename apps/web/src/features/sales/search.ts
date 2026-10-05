/** `?kind=confirmed` opens «مؤكدة»; pending is the default and stays out of the URL. */
export function parseSalesSubscriptionsSearch(s: Record<string, unknown>): { kind?: 'confirmed' } {
  return s['kind'] === 'confirmed' ? { kind: 'confirmed' } : {};
}
