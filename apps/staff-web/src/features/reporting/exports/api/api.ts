import { routePath } from '@ab/core';
import { exportRoutes } from '@ab/shared';
import { apiBlob, errorCode } from '@ab/web-kit';
import type { ExportKind, ExportRequest } from './api.types';

// CSV downloads (docs/11 §9 C1–C4, R-RPT-03): the file comes through the shared client with the
// session's token and is handed to the browser as a download.

export function exportPath({ kind, params = {} }: ExportRequest): string {
  const query = new URLSearchParams(params).toString();
  return `${routePath(exportRoutes[kind])}${query ? `?${query}` : ''}`;
}

/** The server's file name, else `<kind>.csv`. */
export function filenameFrom(disposition: string | null, kind: ExportKind): string {
  return /filename="([^"]+)"/.exec(disposition ?? '')?.[1] ?? `${kind}.csv`;
}

/** The API error code of a failed export (range_too_large, invalid_month …), if any. */
export const exportErrorCode = errorCode;

export async function downloadCsv(req: ExportRequest): Promise<void> {
  const { blob, headers } = await apiBlob(exportPath(req));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filenameFrom(headers.get('Content-Disposition'), req.kind);
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
