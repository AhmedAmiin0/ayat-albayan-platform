import type { ChannelAttachmentView } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { useSmallText } from '../../chat-ui/bubble/use-small-text';
import { PdfBadge } from '../../chat-ui/pdf/PdfBadge';
import { PdfStrip } from '../../chat-ui/pdf/PdfStrip';
import { t } from '../../lib/i18n/i18n';
import { shape, type, useTheme } from '../../theme';
import { AppText } from '../../ui/primitives/AppText';
import { ContentText } from '../../ui/primitives/ContentText';
import { openOutside } from './open-outside';
import { sizeText } from './size-text';

/**
 * A PDF card (ChatXFamilyThread): the strip with «PDF», then its name and «PDF · 240 كيلوبايت».
 * The channel has no page preview yet: a tap opens the file in the phone's own viewer.
 */
export function PdfBubble({ file, url }: { file: ChannelAttachmentView; url: string }) {
  const { color } = useTheme();
  const small = useSmallText();
  const name = file.name || t.inbox.pdf.untitled;
  return (
    <Pressable
      testID="channel-pdf"
      accessibilityRole="button"
      accessibilityLabel={t.inbox.pdf.open.replace('{name}', name)}
      onPress={() => openOutside(url)}
      style={{
        width: 240,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: color.rule,
        borderRadius: shape.radius.md,
        backgroundColor: color.sunk,
      }}
    >
      <PdfStrip waiting={false} note="" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 }}>
        <PdfBadge />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <ContentText
            source={name}
            numberOfLines={2}
            style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}
          >
            {name}
          </ContentText>
          <AppText style={small}>{`${t.inbox.pdf.type} · ${sizeText(file.size)}`}</AppText>
        </View>
      </View>
    </Pressable>
  );
}
