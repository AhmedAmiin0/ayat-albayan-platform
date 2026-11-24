import { View } from 'react-native';
import { t, Button } from '@ab/mobile-kit';
import { leaveAnchor } from './use-anchor-param';

const PILL = { position: 'absolute', bottom: 12, start: 0, end: 0, alignItems: 'center' } as const;

/** docs/37. */
export function BackToNewest({ shown }: { shown: boolean }) {
  if (!shown) return null;
  return (
    <View testID="back-to-newest" pointerEvents="box-none" style={PILL}>
      <Button variant="secondary" label={t.inbox.jumpLatest} onPress={leaveAnchor} />
    </View>
  );
}
