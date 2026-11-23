import type { FamilyRequestView } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t, AppText, StatusChip, type, useTheme, type ViewerClock } from '@ab/mobile-kit';
import { requestChange, requestWho } from './request-text';

interface RequestRowProps {
  request: FamilyRequestView;
  viewer: ViewerClock;
  onOpen: (request: FamilyRequestView) => void;
}

export function RequestRow({ request, viewer, onOpen }: RequestRowProps) {
  const { color } = useTheme();
  const who = requestWho(request);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t.lessons.proposal.open}
      onPress={() => onOpen(request)}
      style={({ pressed }) => ({ paddingVertical: 12, gap: 4, opacity: pressed ? 0.7 : 1 })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AppText style={{ flex: 1, fontFamily: type.ui[600], color: color.ink }}>{who}</AppText>
        <StatusChip tone="act" glyph="half" label={t.lessons.proposal.waiting} size="sm" />
      </View>
      <AppText style={{ fontSize: type.size.sm, color: color.ink2, fontVariant: ['tabular-nums'] }}>
        {requestChange(request, viewer)}
      </AppText>
    </Pressable>
  );
}
