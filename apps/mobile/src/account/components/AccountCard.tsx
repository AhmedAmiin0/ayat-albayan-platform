import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Notice } from '@/today/Notice';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';

export interface AccountCardProps {
  title: string;
  children: ReactNode;
  /** The section's save; omitted for a card without one (the photo has its own buttons). */
  onSave?: () => void;
  pending?: boolean;
  /** Nothing to save yet (unchanged): the button is off. */
  disabled?: boolean;
  /** Under the button: a failure no field owns, then the success note. */
  error?: string;
  notice?: string;
}

/** One «حسابي» section on a mobile card (docs/07 §4: raised, 1px rule, radius 12, no shadow). */
export function AccountCard({ title, children, onSave, pending = false, ...p }: AccountCardProps) {
  const { color } = useTheme();
  return (
    <View
      style={{
        gap: 16,
        padding: 16,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.raised,
      }}
    >
      <AppText
        accessibilityRole="header"
        style={{
          fontFamily: type.ui[700],
          fontSize: type.size.base,
          lineHeight: type.lineHeight(type.size.base),
          color: color.ink,
        }}
      >
        {title}
      </AppText>
      {children}
      {onSave ? (
        <View style={{ alignItems: 'flex-start' }}>
          {/* Secondary: a screen has one filled button at most (docs/07 §1.4) and this one has five sections. */}
          <Button
            variant="secondary"
            label={pending ? t.account.saving : t.account.save}
            accessibilityLabel={`${t.account.save} — ${title}`}
            onPress={onSave}
            busy={pending}
            disabled={p.disabled}
          />
        </View>
      ) : null}
      {p.error ? <ErrorLine message={p.error} /> : null}
      {p.notice ? <Notice message={p.notice} /> : null}
    </View>
  );
}
