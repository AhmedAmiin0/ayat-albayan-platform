import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { useSmallText } from '../../bubble/use-small-text';
import { PdfBadge } from '../PdfBadge';

interface PdfStripProps {
  /** A spinner over the strip: page 1's answer or its image is on its way. */
  waiting: boolean;
  /**
   * null: page 1 (or the spinner) fills the strip; else a large «PDF» and this line ('' = none).
   */
  note: string | null;
  /** Page 1's image, from the strip's top. */
  children?: ReactNode;
}

const STRIP = {
  height: 120,
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  paddingHorizontal: 12,
} as const;

/** The PDF card's top, one fixed height whatever it shows, so the inverted list never jumps. */
export function PdfStrip({ waiting, note, children }: PdfStripProps) {
  const { color } = useTheme();
  const small = useSmallText();
  return (
    <View style={{ ...STRIP, backgroundColor: color.raised }}>
      {children}
      {waiting ? (
        <ActivityIndicator accessibilityLabel={t.common.loading} color={color.ink3} />
      ) : null}
      {note === null ? null : <PdfBadge large />}
      {note ? (
        <AppText
          numberOfLines={2}
          style={{ ...small, fontFamily: type.ui[600], textAlign: 'center' }}
        >
          {note}
        </AppText>
      ) : null}
    </View>
  );
}
