import { ActivityIndicator, View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { useTheme } from '../../../theme';
import { Sheet } from '../../../ui/feedback/Sheet';
import { AppText } from '../../../ui/primitives/AppText';
import { Button } from '../../../ui/primitives/Button';
import { ReadsList } from '../ReadsList';
import type { ReadsSheetProps } from './ReadsSheet.types';
import { useReadsSheet } from './use-reads-sheet';

/**
 * A long press on my ticks (owner: «a long press on the ticks shows who read it and when»): those
 * who read it with the time, then those who have not yet.
 */
export function ReadsSheet({ refs, messageId, onClose }: ReadsSheetProps) {
  const { color } = useTheme();
  const { reads, rowOf, data, r } = useReadsSheet({ refs, messageId });
  return (
    <Sheet
      open={messageId !== null}
      label={r.title}
      testID="channel-reads"
      onClose={onClose}
      scroll
    >
      {reads.isLoading ? (
        <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} />
      ) : null}
      {reads.isError ? (
        <AppText accessibilityRole="alert" style={{ color: color.bad }}>
          {r.failed}
        </AppText>
      ) : null}
      {reads.isSuccess ? (
        <View style={{ gap: 12 }}>
          <ReadsList title={r.read} rows={data.read.map(rowOf)} />
          <ReadsList title={r.unread} rows={data.unread.map(rowOf)} />
        </View>
      ) : null}
      <Button variant="secondary" label={t.common.close} onPress={onClose} />
    </Sheet>
  );
}
