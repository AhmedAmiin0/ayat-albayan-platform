import { ActivityIndicator, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Section } from '@/more/Section';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
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

/**
 * «مزامنة Google» (docs/24 §3): connection, switch, mode, queue counts and the last error, on
 * GET /admin/google/status. Read-only: no switch and no OAuth here; the web admin manages it.
 */
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
