import { useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../../lib/i18n/i18n';
import { useMyProfile } from '../../lib/profile/my-profile';
import { signOutDevice } from '../../lib/session/sign-out';
import { space, type, useTheme } from '../../theme';
import { AppText } from '../../ui/primitives/AppText';
import { Button } from '../../ui/primitives/Button';
import { Mark } from '../../ui/primitives/Mark';
import { bioLock } from '../core/bio-lock';
import type { BioKind } from '../core/device';
import { useDissolve } from './use-dissolve';

interface LockScreenProps {
  /** Null means biometrics are gone; only the other sign-in way is left (fails closed). */
  kind: BioKind | null;
  /** The last prompt was cancelled or failed: say so, wait for a tap. */
  failed: boolean;
}

const firstName = (full: string | undefined) => full?.trim().split(/\s+/)[0] ?? '';

/**
 * The lock (owner 2026-11-15): the mark, the user's first name and one primary action, the other
 * way as plain text. It prompts by itself as it first lays out; success dissolves it into the app.
 */
export function LockScreen({ kind, failed }: LockScreenProps) {
  const { color } = useTheme();
  const bottom = useSafeAreaInsets().bottom + space[6];
  const dissolve = useDissolve();
  const [leaving, setLeaving] = useState(false);
  const name = firstName(useMyProfile().data?.full_name);
  const B = t.biometric;
  const open = (result: string) => {
    if (result === 'success') dissolve.run(bioLock.finish);
  };
  const other = () => {
    setLeaving(true);
    void signOutDevice().finally(() => setLeaving(false));
  };
  return (
    <Animated.View
      testID="biometric-lock"
      onLayout={() => void bioLock.autoPrompt().then(open)}
      style={[StyleSheet.absoluteFill, { backgroundColor: color.margin }, dissolve.style]}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3] }}>
        <Mark size={88} labelled />
        {name ? (
          <AppText accessibilityRole="header" style={[title, { color: color.ink }]}>
            {B.greeting.replace('{name}', name)}
          </AppText>
        ) : null}
        <AppText style={[hint, { color: color.ink3 }]}>{B.locked}</AppText>
      </View>
      <View style={{ paddingHorizontal: space[5], paddingBottom: bottom, gap: space[2] }}>
        {failed ? (
          <AppText accessibilityLiveRegion="polite" style={[hint, { color: color.bad }]}>
            {B.failed}
          </AppText>
        ) : null}
        {kind ? (
          <Button label={B.unlock[kind]} onPress={() => void bioLock.unlock().then(open)} />
        ) : null}
        <Button
          variant={kind ? 'ghost' : 'primary'}
          label={B.otherWay}
          onPress={other}
          busy={leaving}
        />
      </View>
    </Animated.View>
  );
}

const title = { fontFamily: type.display, fontSize: type.size.h3, textAlign: 'center' } as const;
const hint = { fontFamily: type.ui[500], fontSize: type.size.sm, textAlign: 'center' } as const;
