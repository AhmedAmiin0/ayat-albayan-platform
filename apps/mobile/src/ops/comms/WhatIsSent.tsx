import type { NotificationAudience } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Section } from '@/more/Section';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Chevron } from '@/core/ui/primitives/Chevron';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { InsetGroup } from '@/core/ui/surface/inset';
import { useCatalogue } from '@/ops/notif-rules/hooks/use-catalogue';
import { useSettings } from '@/ops/settings/use-settings';
import { sentCounts, type SentRow } from './sent-counts';

const h = () => t.communicationsHub;

/** One cell: the audience takes the room (up to two lines), the two counts are narrow and centred. */
function Cell({ text, wide, strong }: { text: string; wide?: boolean; strong?: boolean }) {
  const { color } = useTheme();
  return (
    <AppText
      numberOfLines={wide ? 2 : 1}
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
      style={({ pressed }) => ({ minHeight: shape.control.touch, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, backgroundColor: pressed ? color.sunk : undefined })}
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
 * many do not, from GET /admin/notifications (the column heads say which is which, so no caption).
 * A row opens «الإشعارات» on that audience. With WhatsApp messaging off, a line under the rows says
 * the counted ones are in-app alerts only. The rows sit in one inset card under their column heads
 * (owner 2026-10-28: one container rule).
 */
export function WhatIsSent({ onOpen }: { onOpen: (audience: NotificationAudience) => void }) {
  const query = useCatalogue();
  const data = query.data;
  const settings = useSettings().data;
  return (
    <Section title={h().whatTitle}>
      {data ? (
        <View style={{ gap: 4 }}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingEnd: 40 }}
          >
            <Cell text={h().colAudience} wide strong />
            <Cell text={h().colOn} strong />
            <Cell text={h().colOff} strong />
          </View>
          <InsetGroup>
            {sentCounts(data.entries).map((row) => (
              <Row key={row.audience} row={row} onOpen={onOpen} />
            ))}
          </InsetGroup>
        </View>
      ) : query.isError ? (
        <ErrorState message={t.notificationCatalogue.loadError} onRetry={() => void query.refetch()} />
      ) : (
        <Note>{t.common.loading}</Note>
      )}
      {data && settings && settings.messaging_enabled !== true ? <Note>{h().inAppOnlyNote}</Note> : null}
    </Section>
  );
}
