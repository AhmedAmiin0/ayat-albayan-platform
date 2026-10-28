import { renderTemplateBody, templateBlock, type TemplateParamsInput, type TemplateView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ContentText } from '@/core/ui/primitives/ContentText';
import { TemplateButtons } from '../messages/template/TemplateButtons';
import { TemplateFrame } from '../messages/template/TemplateFrame';

const PAD = { x: 12, bottom: 12 };

/**
 * «شكل الرسالة»: the live preview under the template's fields, as the family will see it in WhatsApp
 * (owner 2026-10-28): the header, the body with the params filled in (aligned by its own language,
 * ContentText), the grey footer and the buttons under it.
 */
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
