import type { NotificationAudience } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Chevron } from '@/ui/Chevron';
import { ErrorState } from '@/ui/ErrorState';
import { useCatalogue } from '../notif-rules/use-catalogue';
import { sentCounts, type SentRow } from './sent-counts';

const h = () => t.communicationsHub;

/** One cell: the audience takes the room, the two counts are narrow and centred. */
function Cell({ text, wide, strong }: { text: string; wide?: boolean; strong?: boolean }) {
  const { color } = useTheme();
  return (
    <AppText
      numberOfLines={1}
      style={{
        flex: wide ? 2 : 1,
        textAlign: wide ? undefined : 'center',
        fontFamily: strong ? type.ui[600] : type.ui[400],
        fontSize: wide ? type.size.body : type.size.sm,
        lineHeight: type.lineHeight(wide ? type.size.body : type.size.sm),
        color: strong ? color.ink2 : color.ink,
      }}
    >
      {text}
    </AppText>
  );
}

/** What a screen reader says for a row: where it goes, then both counts. */
export const rowLabel = (row: SentRow): string =>
  `${h().openAudience.replace('{audience}', row.label)}: ${h().colOn} ${row.on}${t.common.listSeparator}${h().colOff} ${row.off}`;

function Row({ row, onOpen }: { row: SentRow; onOpen: (audience: NotificationAudience) => void }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rowLabel(row)}
      onPress={() => onOpen(row.audience)}
      style={{ minHeight: shape.control.touch, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: color.rule, backgroundColor: color.raised }}
    >
      <Cell text={row.label} wide />
      <Cell text={String(row.on)} />
      <Cell text={String(row.off)} />
      <Chevron to="next" color={color.ink3} size={16} />
    </Pressable>
  );
}

/**
 * «ماذا يُرسل الآن» (docs/23 §2d mobile): per audience, how many notifications go out now and how
 * many do not, from GET /admin/notifications. A row opens «الإشعارات» on that audience.
 */
export function WhatIsSent({ onOpen }: { onOpen: (audience: NotificationAudience) => void }) {
  const query = useCatalogue();
  const data = query.data;
  return (
    <Section title={h().whatTitle}>
      <Note>{h().whatCaption}</Note>
      {data ? (
        <View style={{ marginHorizontal: -16 }}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 4, paddingEnd: 40 }}
          >
            <Cell text={h().colAudience} wide strong />
            <Cell text={h().colOn} strong />
            <Cell text={h().colOff} strong />
          </View>
          {sentCounts(data.entries).map((row) => (
            <Row key={row.audience} row={row} onOpen={onOpen} />
          ))}
        </View>
      ) : query.isError ? (
        <ErrorState message={t.notificationCatalogue.loadError} onRetry={() => void query.refetch()} />
      ) : (
        <Note>{t.common.loading}</Note>
      )}
    </Section>
  );
}
