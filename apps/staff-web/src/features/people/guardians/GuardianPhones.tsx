import { formatPhone, secondPhoneOf } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Ltr } from '@/components/ui/display/ltr';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { STUDENTS_KEY } from '@/features/people/students';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { GUARDIANS_KEY, removeGuardianPhone, type GuardianDetail } from './api';

const G = t.guardians;

interface GuardianPhonesProps {
  guardian: GuardianDetail;
  /** «أُزيل الرقم الثاني»: the dialog closes and shows it, like a save. */
  onDone: (notice: string) => void;
}

const failure = (e: unknown) => (e instanceof ApiError && e.status === 404 ? G.phoneNotFound : t.common.error);

/**
 * The family's numbers (owner 2026-10-29): the main one, then the second one that «ربط بطالب موجود» added from a
 * lead chat, with «إزالة الرقم الثاني» and an inline confirm (DELETE /guardians/:id/phones/:phone, admin only).
 * The main number is edited in the form below. Nothing shows while the family has no second number.
 */
export function GuardianPhones({ guardian, onDone }: GuardianPhonesProps) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const second = secondPhoneOf(guardian.phones);
  const remove = useMutation({
    mutationFn: removeGuardianPhone,
    onSuccess: async () => {
      // Its chat is a lead chat again (v_threads), so the inbox refetches too.
      for (const queryKey of [GUARDIANS_KEY, STUDENTS_KEY, ['threads']]) await queryClient.invalidateQueries({ queryKey });
      onDone(G.phoneRemoved);
    },
  });
  if (!second) return null;
  // The number is an LTR island inside the Arabic sentence.
  const [confirmBefore, confirmAfter] = G.removePhoneConfirm.split('{phone}');
  const row = 'flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 text-sm';
  return (
    <section aria-label={G.secondPhone} className="mb-5 grid gap-2 border-b border-rule pb-4">
      <dl className="grid gap-1">
        <div className={row}>
          <dt className="text-xs text-ink-3">{G.mainPhone}</dt>
          <dd className="text-ink-2">
            <Ltr>{formatPhone(guardian.phone_e164)}</Ltr>
          </dd>
        </div>
        <div className={row}>
          <dt className="text-xs text-ink-3">{G.secondPhone}</dt>
          <dd className="flex flex-1 flex-wrap items-center gap-x-3 text-ink-2">
            <Ltr>{formatPhone(second)}</Ltr>
            {!confirming && (
              <Button type="button" size="sm" variant="danger-quiet" className="ms-auto" onClick={() => setConfirming(true)}>
                {G.removePhone}
              </Button>
            )}
          </dd>
        </div>
      </dl>
      {confirming && (
        <div role="group" aria-label={G.removePhone} className="grid gap-2 rounded-md border border-gold-soft bg-page px-3 py-2.5 text-sm">
          <p className="text-ink">
            {confirmBefore}
            <Ltr>{formatPhone(second)}</Ltr>
            {confirmAfter}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              {t.common.cancel}
            </Button>
            <Button type="button" size="sm" variant="danger" disabled={remove.isPending} onClick={() => remove.mutate({ id: guardian.id, phone: second })}>
              {remove.isPending ? t.common.saving : G.removePhone}
            </Button>
          </div>
        </div>
      )}
      {remove.isError && <FormAlert>{failure(remove.error)}</FormAlert>}
    </section>
  );
}
