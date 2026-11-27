import { Pressable } from 'react-native';
import { AppText, type, useTheme } from '@ab/mobile-kit';
import type { FromReportProps } from './FromReport.types';
import { useFromReport } from './use-from-report';

export function FromReport(props: FromReportProps) {
  const { color } = useTheme();
  const { text, onOpen } = useFromReport(props);
  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={12}
      style={{ minHeight: 44, justifyContent: 'center' }}
      onPress={onOpen}
    >
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.lapis }}>
        {text}
      </AppText>
    </Pressable>
  );
}
