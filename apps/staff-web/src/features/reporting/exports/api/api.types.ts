import type { exportRoutes } from '@ab/shared';

export type ExportKind = keyof typeof exportRoutes;

export interface ExportRequest {
  kind: ExportKind;
  /** `from`/`to` (Riyadh days) for lessons and payments, `month` (YYYY-MM) for payouts. */
  params?: Record<string, string>;
}
