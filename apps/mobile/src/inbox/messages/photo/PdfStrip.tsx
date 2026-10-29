import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { useSmall } from '../components/MessageMeta';

/** «PDF», white on the brand green: beside the name, and large where page 1 is not shown (WhatsApp's document glyph). */
export function PdfBadge({ large = false }: { large?: boolean }) {
  const { color } = useTheme();
  const size = large ? type.size.base : type.size['2xs'];
  return (
    <View style={{ paddingHorizontal: large ? 12 : 6, paddingVertical: large ? 6 : 2, borderRadius: shape.radius.sm, backgroundColor: color.lapisFill }}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: size, lineHeight: type.lineHeight(size), color: color.onLapis }}>
        {t.inbox.pdf.type}
      </AppText>
    </View>
  );
}

interface PdfStripProps {
  /** A spinner over the strip: page 1's answer or its image is on its way. */
  waiting: boolean;
  /** null: page 1 (or the spinner) fills the strip; else a large «PDF» and this line under it ('' = none). */
  note: string | null;
  /** Page 1's image, from the strip's top. */
  children?: ReactNode;
}

/** The PDF card's top, one fixed height whatever it shows, so the inverted list never jumps. */
export function PdfStrip({ waiting, note, children }: PdfStripProps) {
  const { color } = useTheme();
  const small = useSmall();
  return (
    <View style={{ height: 120, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, backgroundColor: color.raised }}>
      {children}
      {waiting ? <ActivityIndicator accessibilityLabel={t.common.loading} color={color.ink3} /> : null}
      {note === null ? null : <PdfBadge large />}
      {note ? (
        <AppText numberOfLines={2} style={{ ...small, fontFamily: type.ui[600], textAlign: 'center' }}>
          {note}
        </AppText>
      ) : null}
    </View>
  );
}
