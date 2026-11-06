import { normalizePhone } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { Note } from '@/core/ui/feedback/Note';
import { Field } from '@/core/ui/form/Field';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { Button } from '@/core/ui/primitives/Button';
import { type FoundNumber, useLookupNumber } from './use-new-chat';

interface PhoneStepProps {
  /** The typed number: kept by the sheet, so «رجوع» from the templates finds it again. */
  value: string;
  onChange: (value: string) => void;
  onFound: (found: FoundNumber) => void;
  onClose: () => void;
}

/** Step 1: the family's WhatsApp number; «التالي» reads it (GET /threads/:phone) as E.164. */
export function PhoneStep({ value, onChange, onFound, onClose }: PhoneStepProps) {
  const lookup = useLookupNumber();
  const [error, setError] = useState<string | null>(null);
  const next = () => {
    const phone = normalizePhone(value);
    setError(phone.ok ? null : t.common.phoneErrors[phone.reason]);
    if (phone.ok) lookup.mutate(phone.e164, { onSuccess: onFound });
  };
  const line = error ?? (lookup.isError ? t.common.error : null);
  const checking = lookup.isPending;
  return (
    <>
      <ScreenHeader
        title={t.inbox.newChat.title}
        trailing={<Button variant="ghost" label={t.common.close} onPress={onClose} />}
      />
      <View style={{ gap: 12 }}>
        <Field
          ltr
          label={t.inbox.newChat.phone}
          placeholder={t.inbox.newChat.placeholder}
          keyboardType="phone-pad"
          autoComplete="off"
          value={value}
          onChangeText={onChange}
          onSubmitEditing={next}
        />
        {line ? <ErrorLine message={line} /> : <Note>{t.inbox.newChat.hint}</Note>}
        <Button
          label={checking ? t.inbox.newChat.checking : t.inbox.newChat.next}
          busy={checking}
          onPress={next}
        />
      </View>
    </>
  );
}
