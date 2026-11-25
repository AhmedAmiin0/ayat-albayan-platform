import type { SourceRow } from '@ab/money';

// API-internal names of the dashboard module; its response shapes (DashboardResponse,
// DashboardWork and the work rows) live in @ab/money (ledger/dashboard-*.ts, docs/52).

export type SourceKey = SourceRow['source'];

/** Items per work list, oldest first. */
export const WORK_ITEMS = 20;
