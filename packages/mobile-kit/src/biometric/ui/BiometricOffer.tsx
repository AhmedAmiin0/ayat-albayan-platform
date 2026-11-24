import { useState } from 'react';
import { Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../../lib/i18n/i18n';
import { shape, space, type, useTheme } from '../../theme';
import { AppText } from '../../ui/primitives/AppText';
import { Button } from '../../ui/primitives/Button';
import { useA11yPref } from '../../ui/primitives/use-a11y-pref';
import { bioLock } from '../core/bio-lock';
import type { BioKind } from '../core/device';

/** Shown once after a fresh sign-in; declining (or Android back) never asks again. */
export function BiometricOffer({ kind, visible }: { kind: BioKind; visible: boolean }) {
  const { color } = useTheme();
  const still = useA11yPref('reduceMotion');
  const bottom = useSafeAreaInsets().bottom + space[5];
  const [busy, setBusy] = useState(false);
  const B = t.biometric;
  const enable = () => {
    setBusy(true);
    void bioLock.enable().finally(() => setBusy(false));
  };
  return (
    <Modal
      transparent
      statusBarTranslucent
      visible={visible}
      animationType={still ? 'fade' : 'slide'}
      onRequestClose={bioLock.decline}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: color.scrim }}>
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: color.raised,
            borderTopLeftRadius: shape.radius.lg,
            borderTopRightRadius: shape.radius.lg,
            padding: space[5],
            paddingBottom: bottom,
            gap: space[3],
          }}
        >
          <AppText accessibilityRole="header" style={[title, { color: color.ink }]}>
            {B.offerTitle[kind]}
          </AppText>
          <AppText style={[body, { color: color.ink2 }]}>{B.offerBody}</AppText>
          <Button label={B.enable} onPress={enable} busy={busy} />
          <Button variant="ghost" label={B.notNow} onPress={bioLock.decline} disabled={busy} />
        </View>
      </View>
    </Modal>
  );
}

const title = { fontFamily: type.display, fontSize: type.size.lg } as const;
const body = { fontFamily: type.ui[400], fontSize: type.size.sm } as const;
