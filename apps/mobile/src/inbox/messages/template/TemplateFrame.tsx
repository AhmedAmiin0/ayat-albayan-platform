import type { MessageTemplateBlock, TemplateHeader } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ContentText } from '@/core/ui/primitives/ContentText';
import { AttachIcon } from '../../shared/chat-icons';
import { DocumentIcon } from '../../shared/composer-icons';

/** A text header in bold; a media one is the message's own file when it has one, else its kind («مستند»). */
function Header({ header, hasMedia }: { header: TemplateHeader | null; hasMedia: boolean }) {
  const { color } = useTheme();
  if (!header || (header.type !== 'text' && hasMedia)) return null;
  if (header.type === 'text') {
    if (!header.text) return null;
    const style = { fontFamily: type.ui[700], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink };
    return (
      <ContentText testID="template-header" source={header.text} style={style}>
        {header.text}
      </ContentText>
    );
  }
  return (
    <View testID="template-header" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: shape.radius.sm, borderWidth: 1, borderColor: color.rule }}>
      {header.type === 'document' ? <DocumentIcon color={color.ink2} size={18} /> : <AttachIcon color={color.ink2} size={18} />}
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink2 }}>
        {t.inbox.templateBubble.header[header.type]}
      </AppText>
    </View>
  );
}

/** The grey footer under the body, in its own language's direction. */
function Footer({ text }: { text: string | null }) {
  const { color } = useTheme();
  if (!text) return null;
  return (
    <ContentText testID="template-footer" source={text} style={{ fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink3 }}>
      {text}
    </ContentText>
  );
}

/** A template's header over its content (the file, the body) and its footer under it; anything else as it is. */
export function TemplateFrame({ block, hasMedia, children }: { block?: MessageTemplateBlock | null; hasMedia: boolean; children: ReactNode }) {
  if (!block) return <>{children}</>;
  return (
    <>
      <Header header={block.header} hasMedia={hasMedia} />
      {children}
      <Footer text={block.footer} />
    </>
  );
}
