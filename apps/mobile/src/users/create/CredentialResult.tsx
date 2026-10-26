import type { IssuedCredential } from '@ab/shared';
import { Share, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';

export interface CredentialResultProps {
  title: string;
  /** null = the admin typed the password: nothing to show. */
  credential: IssuedCredential | null;
  onClose: () => void;
}

/**
 * The password or invite link, shown ONCE: it lives in the caller's state only (never the query
 * cache or storage) and is gone when this closes. Selectable text (long-press to copy) and the
 * phone's share sheet are the ways to keep it (no clipboard module: the app ships by OTA).
 */
export function CredentialResult({ title, credential, onClose }: CredentialResultProps) {
  const R = t.users.result;
  const { color } = useTheme();
  const share = () => {
    if (credential) Share.share({ message: credential.value }).catch(() => undefined);
  };
  return (
    <Section title={title}>
      {credential ? (
        <View style={{ gap: 10 }}>
          <AppText accessibilityRole="alert" style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink }}>
            {R.once}
          </AppText>
          <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink2 }}>
            {credential.kind === 'password' ? R.password : R.link}
          </AppText>
          <AppText
            selectable
            testID="issued-credential"
            style={{
              writingDirection: 'ltr',
              padding: 10,
              borderWidth: 1,
              borderColor: color.rule,
              borderRadius: shape.radius.md,
              backgroundColor: color.sunk,
              fontSize: type.size.base,
              color: color.ink,
            }}
          >
            {credential.value}
          </AppText>
          <Note>{t.mobileUsers.copyHint}</Note>
          <Button variant="secondary" label={t.mobileUsers.share} onPress={share} />
        </View>
      ) : (
        <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.sm, color: color.ink }}>{R.setDone}</AppText>
      )}
      <Button label={R.close} onPress={onClose} />
    </Section>
  );
}
