import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { AppText } from '../../../ui/primitives/AppText';
import { ContentText } from '../../../ui/primitives/ContentText';
import { PDF_LINE } from '../use-current-page';
import type { PdfViewerHeadProps } from './PdfViewerHead.types';
import { NAME } from './pdf-viewer-head.helpers';

export function PdfViewerHead({ name, meta, current, pages }: PdfViewerHeadProps) {
  const at = t.inbox.pdf.pageOf.replace('{n}', String(current)).replace('{total}', String(pages));
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
      <ContentText source={name} numberOfLines={1} style={NAME}>
        {name}
      </ContentText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12 }}>
        <AppText style={PDF_LINE}>{meta}</AppText>
        <AppText testID="pdf-current" style={PDF_LINE}>
          {at}
        </AppText>
      </View>
      <AppText style={PDF_LINE}>{t.inbox.pdf.zoomHint}</AppText>
    </View>
  );
}
