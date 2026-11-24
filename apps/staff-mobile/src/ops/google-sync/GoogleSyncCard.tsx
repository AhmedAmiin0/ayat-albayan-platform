import { ActivityIndicator, View } from 'react-native';
import { t, shape, type, useTheme, AppText, ErrorState, StatusChip, Section } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { googleStatusText, useGoogleStatus, type GoogleStatusText } from './google-status';

function Line({ children, tone }: { children: string; tone?: 'bad' }) {
  const { color } = useTheme();
  return (
    <AppText
      style={{
        fontFamily: type.ui[500],
        fontSize: type.size.sm,
        lineHeight: type.lineHeight(type.size.sm),
        color: tone === 'bad' ? color.bad : color.ink,
      }}
    >
      {children}
    </AppText>
  );
}

function Body({ text }: { text: GoogleStatusText }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row' }}>
        <StatusChip {...text.chip} size="sm" />
      </View>
      {text.email ? <Line>{text.email}</Line> : null}
      <Line>{text.sync}</Line>
      <Line>{text.mode}</Line>
      <Line>{text.counts}</Line>
      <Line tone={text.failing ? 'bad' : undefined}>{text.lastError}</Line>
    </View>
  );
}

/** docs/24 §3: read-only; switching and OAuth stay on the web admin. */
export function GoogleSyncCard() {
  const { color } = useTheme();
  const query = useGoogleStatus();
  return (
    <Section title={t.googleSync.mobile.title}>
      <View
        testID="google-sync-card"
        style={{
          gap: 8,
          padding: 12,
          borderRadius: shape.radius.md,
          borderWidth: 1,
          borderColor: color.rule,
          backgroundColor: color.raised,
        }}
      >
        {query.data ? (
          <Body text={googleStatusText(query.data)} />
        ) : query.isError ? (
          <ErrorState message={t.googleSync.mobile.loadError} onRetry={() => void query.refetch()} />
        ) : (
          <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} />
        )}
        <Note>{t.googleSync.mobile.webOnly}</Note>
      </View>
    </Section>
  );
}
