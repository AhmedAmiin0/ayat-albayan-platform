import type { Locale } from '@ab/shared';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { locale } from '../../lib/i18n/locale';
import { chooseLocale } from '../../lib/i18n/profile-locale';
import { shape, type, useTheme } from '../../theme';
import { ErrorLine } from '../feedback/ErrorLine';
import { InlineConfirm } from '../feedback/InlineConfirm';
import { ListRow } from '../layout/ListRow';
import { AppText } from '../primitives/AppText';
import { pressScale } from '../primitives/Button';
import { InsetGroup } from '../surface/inset';
import { Section } from '../surface/Section';

/** What a switch that did not restart says: nothing, reopen the app (saved), or the error. */
const NOTE: Record<Awaited<ReturnType<typeof chooseLocale>>, () => string | null> = {
  reloading: () => null,
  restart: () => t.language.restartManually,
  error: () => t.common.error,
};

interface LanguageRowProps {
  /** Signed out: one quiet text button, no heading or row. */
  compact?: boolean;
}

/**
 * The signed-out switch: centred ink-2 text at the 44pt touch size, so it never reads as a second
 * sign-in action beside the green ghost buttons. The name is spoken in its own language (iOS).
 */
function QuietSwitch({ other, onPress }: { other: Locale; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLanguage={other}
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: 'center',
        justifyContent: 'center',
        minHeight: shape.control.touch,
        paddingHorizontal: 16,
        borderRadius: shape.radius.md,
        backgroundColor: pressed ? color.sunk : 'transparent',
        transform: [{ scale: pressScale(pressed, false) }],
      })}
    >
      <AppText
        style={{
          fontFamily: type.ui[500],
          fontSize: type.size.sm,
          lineHeight: type.lineHeight(type.size.sm),
          color: color.ink2,
        }}
      >
        {t.language[other]}
      </AppText>
    </Pressable>
  );
}

/** Strings load once at start, so switching restarts the app; signed in, the profile goes first. */
export function LanguageRow({ compact }: LanguageRowProps) {
  const other = locale === 'ar' ? 'en' : 'ar';
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const ask = () => setAsking(true);
  const confirm = () => {
    setBusy(true);
    void chooseLocale(other).then((r) => {
      setBusy(false);
      setNote(NOTE[r]());
    });
  };
  const body = (
    <>
      {compact ? (
        <QuietSwitch other={other} onPress={ask} />
      ) : (
        <InsetGroup>
          <ListRow title={t.language[other]} onPress={ask} />
        </InsetGroup>
      )}
      {asking ? (
        <InlineConfirm
          message={t.language.restart}
          onConfirm={confirm}
          onCancel={() => setAsking(false)}
          busy={busy}
          tone={compact ? 'secondary' : undefined}
        />
      ) : null}
      {note ? <ErrorLine message={note} /> : null}
    </>
  );
  return compact ? (
    <View style={{ gap: 8 }}>{body}</View>
  ) : (
    <Section title={t.language.label}>{body}</Section>
  );
}
