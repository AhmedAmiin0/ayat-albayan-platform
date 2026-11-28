import { ActivityIndicator, View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { PdfBadge } from '../PdfBadge';
import type { PdfStripProps } from './PdfStrip.types';
import { STRIP } from './pdf-strip.helpers';
import { usePdfStrip } from './use-pdf-strip';

/** The PDF card's top, one fixed height whatever it shows, so the inverted list never jumps. */
export function PdfStrip({ waiting, note, children }: PdfStripProps) {
  const { color } = useTheme();
  const { small } = usePdfStrip();
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
