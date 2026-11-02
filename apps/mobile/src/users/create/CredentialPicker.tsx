import { CREDENTIAL_MODES, DEFAULT_PASSWORD_MIN, type CredentialMode } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Choice } from '@/users/shared/Choice';
import { TextField } from '@/users/shared/TextField';

export interface CredentialPickerProps {
  mode: CredentialMode;
  password: string;
  onMode: (mode: CredentialMode) => void;
  onPassword: (password: string) => void;
  error?: string | undefined;
}

/** How the user gets a password: typed here, generated (shown once) or an invite link (shown once). */
export function CredentialPicker({ mode, password, onMode, onPassword, error }: CredentialPickerProps) {
  const C = t.users.credential;
  return (
    <View style={{ gap: 12 }}>
      <Choice label={C.label} items={CREDENTIAL_MODES.map((m) => ({ value: m, label: C[m] }))} value={mode} onChange={onMode} />
      {mode === 'set' ? (
        <>
          <TextField
            label={C.password}
            required
            ltr
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            error={error}
            value={password}
            onChangeText={onPassword}
          />
          <Note>{C.hint.replace('{n}', String(DEFAULT_PASSWORD_MIN))}</Note>
        </>
      ) : null}
    </View>
  );
}
