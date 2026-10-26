import { renderTemplateBody, type TemplateParamsInput, type TemplateView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

/** The text the guardian will read: body with the params filled in, then the footer. */
function templatePreview(template: TemplateView, params: TemplateParamsInput): string {
  const body = renderTemplateBody(template.body_ar, params);
  return template.footer_ar ? `${body}\n\n${template.footer_ar}` : body;
}

/** «شكل الرسالة»: the live preview under the template's fields. */
export function TemplatePreview({ template, params }: { template: TemplateView; params: TemplateParamsInput }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        gap: 4,
        padding: 12,
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.lapisWash,
      }}
    >
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, lineHeight: 20, color: color.ink2 }}>
        {t.inbox.composer.preview}
      </AppText>
      <AppText
        style={{
          fontFamily: type.ui[400],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: color.ink,
          writingDirection: 'auto',
        }}
      >
        {templatePreview(template, params)}
      </AppText>
    </View>
  );
}
