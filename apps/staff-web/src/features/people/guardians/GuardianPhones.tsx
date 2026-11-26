import { secondPhoneOf } from '@ab/shared';
import { formatPhone } from '@ab/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Ltr, Button, FormAlert, ApiError, t } from '@ab/web-kit';
import { STUDENTS_KEY } from '@/features/people/students';
import { GUARDIANS_KEY, removeGuardianPhone, type GuardianDetail } from './api';

const G = t.guardians;

interface GuardianPhonesProps {
  guardian: GuardianDetail;
  onDone: (notice: string) => void;
}

const failure = (e: unknown) =>
  e instanceof ApiError && e.status === 404 ? G.phoneNotFound : t.common.error;

/** Removing the second number is admin only; nothing shows without one. */
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
