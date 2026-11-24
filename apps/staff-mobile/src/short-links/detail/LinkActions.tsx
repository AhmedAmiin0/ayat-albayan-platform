import type { ShortLinkDetail } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t, Button, ButtonRow, ErrorLine, InlineConfirm, Note } from '@ab/mobile-kit';
import { useRevokeLink } from '@/short-links/api/link-hooks';
import { EditSheet } from './EditSheet';
import { ExtendSheet } from './ExtendSheet';

const D = () => t.shortLinks.detail;

type Step = 'idle' | 'confirm' | 'edit' | 'extend';

/** Revoke stops the link at once for everyone and it cannot run again. */
export function LinkActions({ link }: { link: ShortLinkDetail }) {
  const [step, setStep] = useState<Step>('idle');
  const revoke = useRevokeLink();
  const idle = () => setStep('idle');
  const confirm = () => revoke.mutate(link.code, { onSuccess: idle });
  if (link.status === 'revoked') return revoke.isSuccess ? <Note alert>{D().revoked}</Note> : null;
  return (
    <View style={{ gap: 8 }}>
      {step === 'confirm' ? (
        <InlineConfirm
          message={`${D().revokeTitle} ${D().revokeBody}`}
          confirmLabel={D().revokeConfirm}
          tone="danger"
          busy={revoke.isPending}
          onConfirm={confirm}
          onCancel={idle}
        />
      ) : (
        <ButtonRow>
          <Button variant="secondary" label={D().extend} onPress={() => setStep('extend')} />
          <Button variant="secondary" label={t.common.edit} onPress={() => setStep('edit')} />
          <Button variant="danger" label={D().revoke} onPress={() => setStep('confirm')} />
        </ButtonRow>
      )}
      {revoke.isError ? <ErrorLine message={D().errors.generic} /> : null}
      {step === 'edit' ? <EditSheet link={link} onClose={idle} /> : null}
      {step === 'extend' ? <ExtendSheet link={link} onClose={idle} /> : null}
    </View>
  );
}
