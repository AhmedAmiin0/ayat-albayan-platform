import type { SalesFamilyView, SalesMoneySubscriptionView } from '@ab/shared';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from '@ab/mobile-kit';

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

/** With sales.renew_any others are listed too (docs/16 row 38); some actions stay hers only. */
export function ownStudents<S extends { mine?: boolean }>(students: readonly S[]): S[] {
  return students.filter((s) => s.mine !== false);
}

/** Every package still owed, over all her students of the family. */
export function openPackages(family: SalesFamilyView | undefined): SalesMoneySubscriptionView[] {
  return family?.students.flatMap((s) => s.open) ?? [];
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

export function refreshFamily(client: QueryClient, phone: string): void {
  void client.invalidateQueries({ queryKey: ['threads'] });
  void client.invalidateQueries({ queryKey: familyKey(phone) });
}
