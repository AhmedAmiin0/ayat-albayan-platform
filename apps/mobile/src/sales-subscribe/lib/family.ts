import type { SalesFamilyView, SalesMoneySubscriptionView } from '@ab/shared';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';

// GET /sales/money/family?phone (R-ASST-01): HER students in this chat's family, each with the
// packages still owed. Only hers: an empty list means nothing of the family is hers to sell.

export const familyKey = (phone: string) => ['sales', 'money', 'family', phone] as const;

export function familyPath(phone: string): string {
  return `/sales/money/family?phone=${encodeURIComponent(phone)}`;
}

export function useSalesFamily(phone: string, enabled = true) {
  return useQuery({
    queryKey: familyKey(phone),
    queryFn: () => apiFetch<SalesFamilyView>(familyPath(phone)),
    enabled: enabled && phone !== '',
  });
}

/** Every package still owed, over all her students of the family. */
export function openPackages(family: SalesFamilyView | undefined): SalesMoneySubscriptionView[] {
  return family?.students.flatMap((s) => s.open) ?? [];
}

/**
 * «جدّد الاشتراك» (owner 2026-10-15): one per student of hers due for a renewal (the API's `renew_due`,
 * owner 2026-10-26: the package ended or is down to the renewal alert), naming the child when the
 * family has several of hers.
 */
export function renewTargets(family: SalesFamilyView | undefined): { studentId: string; label: string }[] {
  const students = family?.students ?? [];
  return students
    .filter((s) => s.renew_due)
    .map((s) => ({ studentId: s.id, label: students.length > 1 ? `${t.students.renew} — ${s.name}` : t.students.renew }));
}

/** The picked package while still owed, else the only one owed, else none yet. */
export function chosenOpen(
  open: readonly SalesMoneySubscriptionView[],
  picked: string | undefined,
): SalesMoneySubscriptionView | undefined {
  return open.find((o) => o.id === picked) ?? (open.length === 1 ? open[0] : undefined);
}

/** The package she just created, owed in full: listed before the refetch answers. */
export function withOpenPackage(
  family: SalesFamilyView | undefined,
  sub: SalesMoneySubscriptionView,
): SalesFamilyView | undefined {
  if (!family) return family;
  const students = family.students.map((s) =>
    s.id === sub.student.id && !s.open.some((o) => o.id === sub.id) ? { ...s, open: [...s.open, sub] } : s,
  );
  return { students };
}

/** After a subscription or a transfer: the chat («مشترك») and the family's packages refetch. */
export function refreshFamily(client: QueryClient, phone: string): void {
  void client.invalidateQueries({ queryKey: ['threads'] });
  void client.invalidateQueries({ queryKey: familyKey(phone) });
}
