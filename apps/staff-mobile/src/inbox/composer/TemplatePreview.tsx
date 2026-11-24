import { renderTemplateBody, templateBlock, type TemplateParamsInput, type TemplateView } from '@ab/shared';
import { View } from 'react-native';
import { t, shape, type, useTheme, AppText } from '@ab/mobile-kit';
import { ContentText } from '@/core/ui/primitives/ContentText';
import { TemplateButtons } from '@/inbox/messages/template/TemplateButtons';
import { TemplateFrame } from '@/inbox/messages/template/TemplateFrame';

const PAD = { x: 12, bottom: 12 };

export function TemplatePreview({ template, params }: { template: TemplateView; params: TemplateParamsInput }) {
  const { color } = useTheme();
  const text = renderTemplateBody(template.body_ar, params);
  const block = templateBlock(template, params);
  return (
    <View
      style={{
        gap: 4,
        paddingHorizontal: PAD.x,
        paddingTop: 12,
        paddingBottom: PAD.bottom,
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.lapisWash,
        overflow: 'hidden',
      }}
    >
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, lineHeight: 20, color: color.ink2 }}>
        {t.inbox.composer.preview}
      </AppText>
      <TemplateFrame block={block} hasMedia={false}>
        <ContentText
          source={text}
          style={{ fontFamily: type.ui[400], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink }}
        >
          {text}
        </ContentText>
      </TemplateFrame>
      <TemplateButtons buttons={block.buttons} inset={PAD} />
    </View>
  );
}
