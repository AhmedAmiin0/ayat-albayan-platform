import { Modal, View } from 'react-native';
import { shape, space, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { Button } from '../../../ui/primitives/Button';
import { bioLock } from '../../core/bio-lock';
import type { BiometricOfferProps } from './BiometricOffer.types';
import { title, body } from './biometric-offer.helpers';
import { useBiometricOffer } from './use-biometric-offer';

/** Shown once after a fresh sign-in; declining (or Android back) never asks again. */
export function BiometricOffer({ kind, visible }: BiometricOfferProps) {
  const { color } = useTheme();
  const { still, bottom, busy, B, enable } = useBiometricOffer();
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
