import { type ChannelAttachmentView, fileSizeText } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { useSmallText } from '../../../chat-ui/bubble/use-small-text';
import { PdfBadge } from '../../../chat-ui/pdf/PdfBadge';
import { PdfStrip } from '../../../chat-ui/pdf/PdfStrip';
import { t } from '../../../lib/i18n/i18n';
import { shape, type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { ContentText } from '../../../ui/primitives/ContentText';
import { menuA11y } from '../../bubble/menu-a11y';
import { openOutside } from '../open-outside';

interface PdfBubbleProps {
  file: ChannelAttachmentView;
  url: string;
  /** The message's menu. */
  onLongPress?: () => void;
}

/** The channel has no page preview yet: a tap opens the file in the phone's viewer. */
export function PdfBubble({ file, url, onLongPress }: PdfBubbleProps) {
  const { color } = useTheme();
  const small = useSmallText('ink3');
  const name = file.name || t.inbox.pdf.untitled;
  const meta = `${t.inbox.pdf.type} · ${fileSizeText(file.size, t.inbox.pdf)}`;
  return (
    <Pressable
      testID="channel-pdf"
      accessibilityRole="button"
      accessibilityLabel={`${t.inbox.pdf.open.replace('{name}', name)} · ${meta}`}
      onPress={() => openOutside(url)}
      onLongPress={onLongPress}
      delayLongPress={350}
      {...menuA11y(onLongPress)}
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
            style={{
              fontFamily: type.ui[600],
              fontSize: type.size.sm,
              lineHeight: 22,
              color: color.ink,
            }}
          >
            {name}
          </ContentText>
          <AppText style={small}>{meta}</AppText>
        </View>
      </View>
    </Pressable>
  );
}
