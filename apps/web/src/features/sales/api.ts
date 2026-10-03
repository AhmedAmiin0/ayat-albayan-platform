import type { LessonStatus } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';

export type SubscriptionKind = 'pending' | 'confirmed';

/** One of my subscriptions. Never carries a price or a payment (the salesperson sees no money). */
export interface SalesSubscription {
  id: string;
  student: { id: string; code: string; name: string };
  package: string;
  status: string;
  starts_on: string | null;
  lessons_total: number;
}

export interface SalesMeeting {
  lesson_id: string;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  teacher_name: string;
  lead_or_student_name: string | null;
}

export interface SalesPerson {
  id: string;
  name: string;
  open_leads: number;
}

/** GET /sales/subscriptions?kind= — my pending or my confirmed subscriptions, one list per kind. */
export const salesSubscriptionsQuery = (kind: SubscriptionKind) =>
  queryOptions({
    queryKey: ['sales', 'subscriptions', kind],
    queryFn: () => apiFetch<SalesSubscription[]>(`/sales/subscriptions?kind=${kind}`),
  });

/** GET /sales/meetings?from&to — my meetings in [from, to). */
export const salesMeetingsQuery = (day: { from: string; to: string }) =>
  queryOptions({
    queryKey: ['sales', 'meetings', day.from],
    queryFn: () => apiFetch<SalesMeeting[]>(`/sales/meetings?${new URLSearchParams(day)}`),
  });

/** GET /sales/people (admin): the salespeople with their open-lead counts. */
export const salesPeopleQuery = queryOptions({
  queryKey: ['sales', 'people'],
  queryFn: () => apiFetch<SalesPerson[]>('/sales/people'),
});

/** POST /leads/:id/assign (admin): hand a lead to a salesperson, or null to take it back. */
export const assignLead = ({ leadId, profileId }: { leadId: string; profileId: string | null }) =>
  apiSend<unknown>('POST', `/leads/${leadId}/assign`, { profileId });

/** POST /leads/assign-unassigned (admin): spread every ownerless lead over the salespeople. */
export const assignUnassigned = () => apiSend<{ assigned: number }>('POST', '/leads/assign-unassigned');
