import { View } from 'react-native';
import { LazyList } from '@/core/ui/lists/LazyList';
import type { TodayPageProps } from './TodayPage.types';

/** The page is one block of cards, so the list holds it as its only row. */
const ONE_ROW = ['page'] as const;
/** Bleeds to the screen's edge and pads back the 16pt gutter: the cards' ring is not clipped. */
const BLEED = { flex: 1, marginHorizontal: -16 } as const;
const GUTTER = { paddingHorizontal: 16 } as const;

/**
 * Today's scroller: a list rather than a plain scroll view for its pull to refresh and keyboard
 * behaviour. The page is a row, not the list's header: a header over no rows left FlashList work
 * running after unmount in the app-router tests (push.flow).
 */
export function TodayPage({ header, refreshing, onRefresh }: TodayPageProps) {
  return (
    <View style={BLEED}>
      <LazyList
        testID="today-list"
        inset={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        data={ONE_ROW}
        keyExtractor={String}
        renderItem={() => <View style={GUTTER}>{header}</View>}
      />
    </View>
  );
}
