import { ApiError } from '@/lib/api';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

// CSV downloads (docs/11 §9 C1–C4, R-RPT-03). apiFetch parses JSON, so a file is fetched here with
// the same bearer token and handed to the browser as a download.

export type ExportKind = 'students' | 'lessons' | 'payments' | 'payouts';

export interface ExportRequest {
  kind: ExportKind;
  /** `from`/`to` (Riyadh days) for lessons and payments, `month` (YYYY-MM) for payouts. */
  params?: Record<string, string>;
}

export function exportPath({ kind, params = {} }: ExportRequest): string {
  const query = new URLSearchParams(params).toString();
  return `/exports/${kind}.csv${query ? `?${query}` : ''}`;
}

/** The server's file name, else `<kind>.csv`. */
export function filenameFrom(disposition: string | null, kind: ExportKind): string {
  return /filename="([^"]+)"/.exec(disposition ?? '')?.[1] ?? `${kind}.csv`;
}

/** The API error code of a failed export (range_too_large, invalid_month …), if any. */
export function exportErrorCode(e: unknown): string | null {
  if (!(e instanceof ApiError) || typeof e.body !== 'object' || e.body === null) return null;
  const code = (e.body as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

export async function downloadCsv(req: ExportRequest): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers();
  if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  const res = await fetch(`${env.apiUrl}${exportPath(req)}`, { headers });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filenameFrom(res.headers.get('Content-Disposition'), req.kind);
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
