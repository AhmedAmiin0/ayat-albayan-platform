import { Animated, StyleSheet, View } from 'react-native';
import { space, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { Button } from '../../../ui/primitives/Button';
import { Mark } from '../../../ui/primitives/Mark';
import type { LockScreenProps } from './LockScreen.types';
import { title, hint } from './lock-screen.helpers';
import { useLockScreen } from './use-lock-screen';

/**
 * The lock: the mark, the user's first name and one primary action, the other
 * way as plain text. It prompts by itself as it first lays out; success dissolves it into the app.
 */
export function LockScreen({ kind, failed }: LockScreenProps) {
  const { color } = useTheme();
  const { bottom, dissolve, leaving, name, B, other, prompt, unlock } = useLockScreen();
  return (
    <Animated.View
      testID="biometric-lock"
      onLayout={prompt}
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
        {kind ? <Button label={B.unlock[kind]} onPress={unlock} /> : null}
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
