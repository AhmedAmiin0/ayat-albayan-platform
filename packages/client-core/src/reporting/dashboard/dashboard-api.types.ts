import type { DashboardResponse, DashboardWork, DateRangeQuery } from '@ab/money';

export interface DashboardCalls {
  summary: (query: DateRangeQuery) => Promise<DashboardResponse>;
  work: () => Promise<DashboardWork>;
}
