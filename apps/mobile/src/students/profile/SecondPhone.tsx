import { type FamilyPhone, formatPhone, secondPhoneOf } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { useHolds } from '@/auth';
import { ApiError, apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { Button } from '@/core/ui/primitives/Button';
import { Ltr, ltr } from '@/core/ui/primitives/Ltr';
import { ErrorLine } from '@/inbox';
import { Note } from '@/more';
import { type, useTheme } from '@/theme';
import { SectionLabel } from '../list/SectionLabel';

/** DELETE /guardians/:id/phones/:phone (204): only the second number; then the file, the families and the chats refetch. */
function useRemoveSecondPhone(guardianId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (phone: string) => apiSend('DELETE', `/guardians/${guardianId}/phones/${encodeURIComponent(phone)}`),
    onSuccess: () => {
      for (const key of [pathKey('/students'), pathKey('/guardians'), pathKey('/threads')]) {
        void client.invalidateQueries({ queryKey: key });
      }
    },
  });
}

/** 404 phone_not_found: no longer this family's second number (removed elsewhere, or the main one). */
const removeError = (error: unknown): string =>
  error instanceof ApiError && error.status === 404 ? t.guardians.phoneNotFound : t.common.error;

/**
 * «الرقم الثاني» of the family (owner 2026-10-29, «ربط بطالب موجود»), LTR, under the guardian's buttons:
 * those stay on the main number. guardians.write (the admin) may remove it after an inline confirm: its
 * chat becomes a lead chat again, and the line says «أُزيل الرقم الثاني» while the file refetches.
 */
export function SecondPhone({ guardianId, phones }: { guardianId: string; phones: readonly FamilyPhone[] }) {
  const { color } = useTheme();
  const canRemove = useHolds('guardians.write');
  const [asking, setAsking] = useState(false);
  const remove = useRemoveSecondPhone(guardianId);
  const phone = secondPhoneOf(phones);
  if (remove.isSuccess) return <Note>{t.guardians.phoneRemoved}</Note>;
  if (!phone) return null;
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>{t.guardians.secondPhone}</SectionLabel>
      <Ltr style={{ alignSelf: 'flex-start', fontFamily: type.ui[500], fontSize: type.size.body, color: color.ink2 }}>
        {formatPhone(phone)}
      </Ltr>
      {!canRemove ? null : asking ? (
        <InlineConfirm
          message={t.guardians.removePhoneConfirm.replace('{phone}', ltr(formatPhone(phone)))}
          confirmLabel={remove.isPending ? t.common.saving : t.guardians.removePhone}
          busy={remove.isPending}
          tone="danger"
          onConfirm={() => remove.mutate(phone)}
          onCancel={() => !remove.isPending && setAsking(false)}
        />
      ) : (
        <Button
          variant="danger"
          label={t.guardians.removePhone}
          onPress={() => {
            remove.reset();
            setAsking(true);
          }}
        />
      )}
      {remove.isError ? <ErrorLine message={removeError(remove.error)} /> : null}
    </View>
  );
}
