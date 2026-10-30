/** `?a=1&b=x` from defined, non-empty values only (RN's URLSearchParams is partial, so no dependency on it). */
export function toQueryString(params: Record<string, string | number | undefined>): string {
  const parts = Object.entries(params)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}
