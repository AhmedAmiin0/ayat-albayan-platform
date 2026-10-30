import { canPickTrialDate, type SalesFamilyStudent, type ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';
import { useHolds } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { MenuSheet } from '@/core/ui/feedback/MenuSheet';
import { Button } from '@/core/ui/primitives/Button';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { ownStudents, useSalesFamily } from '@/sales-subscribe/lib/family';
import { chatTrialHref } from '../lib/trial-href';

/** iOS shows one modal at a time: the trial-date screen waits for the sheet to close. */
const AFTER_SHEET_MS = Platform.OS === 'ios' ? 350 : 0;

const childLabel = (s: SalesFamilyStudent) => (s.code ? `${s.name} · ${s.code}` : s.name);

/**
 * Over a salesperson's family chat (R-ASST-01): ONE «موعد تجريبي جديد» (owner 2026-10-29: one pill per
 * child crowded the strip). One of her students in the family with no running subscription: it opens
 * that child's trial-date screen (the history and the wizard) inside the chat's group; several: a sheet
 * «لأيّ طالب؟» names each. A subscriber gets none: the screen and the student file say why. Same gate and
 * cached family query as SalesChatMoney.
 */
export function SalesTrialPills({ thread }: { thread: ThreadView | null }) {
  const money = useHolds('self.sales_money');
  const base = useTreeBase();
  const [open, setOpen] = useState(false);
  const phone = thread?.guardian_id ? thread.phone_e164 : '';
  const family = useSalesFamily(phone, money);
  const students = ownStudents(family.data?.students ?? []).filter((s) => canPickTrialDate(s.status));
  const go = (s: SalesFamilyStudent) => router.push(inTree(base, chatTrialHref({ studentId: s.id, name: s.name })));
  const [only] = students;
  if (!only) return null;
  if (students.length === 1) {
    return <PillButton label={t.trialDate.action} accessibilityLabel={`${t.trialDate.action} — ${only.name}`} onPress={() => go(only)} />;
  }
  const pick = (s: SalesFamilyStudent) => {
    setOpen(false);
    setTimeout(() => go(s), AFTER_SHEET_MS);
  };
  return (
    <>
      <PillButton label={t.trialDate.action} onPress={() => setOpen(true)} />
      <MenuSheet open={open} label={t.trialDate.mobile.pickStudent} testID="trial-student-sheet" onClose={() => setOpen(false)}>
        {students.map((s) => (
          <Button key={s.id} variant="secondary" label={childLabel(s)} onPress={() => pick(s)} />
        ))}
        <Button variant="secondary" label={t.common.cancel} onPress={() => setOpen(false)} />
      </MenuSheet>
    </>
  );
}
