import {
  renderTemplateBody,
  type TemplateParamsInput,
  type TemplateView,
  threadTemplateSchema,
} from '@ab/shared';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { ErrorLine } from './ErrorLine';
import type { Outgoing } from './use-thread';

type Position = '1' | '2' | '3';
const POSITIONS: readonly Position[] = ['1', '2', '3'];

/** The text the guardian will read: body with the params filled in, then the footer. */
export function templatePreview(template: TemplateView, params: TemplateParamsInput): string {
  const body = renderTemplateBody(template.body_ar, params);
  return template.footer_ar ? `${body}\n\n${template.footer_ar}` : body;
}

/**
 * One approved template's params (docs/12 H4): «المتغير {n}» per {{n}}, the meeting code when it
 * has a link button, and the live preview. Nothing is prefilled: the admin types what is sent.
 */
export function TemplateForm(props: {
  template: TemplateView;
  onBack: () => void;
  onSend: (out: Outgoing) => void;
}) {
  const { template } = props;
  const { color } = useTheme();
  const [params, setParams] = useState<TemplateParamsInput>({});
  const [missing, setMissing] = useState(false);
  const positions = POSITIONS.slice(0, template.params.length);
  const withButton = template.buttons.some((b) => b.type === 'url');
  const set = (key: Position | 'button', value: string) => setParams((p) => ({ ...p, [key]: value }));

  const send = () => {
    const filled = positions.every((n) => params[n]?.trim()) && (!withButton || params.button?.trim());
    const parsed = threadTemplateSchema.safeParse({ key: template.key, params });
    if (!filled || !parsed.success) return setMissing(true);
    const { key, params: clean } = parsed.data;
    props.onSend({ kind: 'template', key, params: clean, preview: templatePreview(template, clean) });
  };

  return (
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      {positions.map((n) => (
        <Field
          key={n}
          label={t.inbox.composer.param.replace('{n}', n)}
          value={params[n] ?? ''}
          onChangeText={(v) => set(n, v)}
        />
      ))}
      {withButton ? (
        <Field
          ltr
          autoCapitalize="none"
          label={t.inbox.composer.button}
          value={params.button ?? ''}
          onChangeText={(v) => set('button', v)}
        />
      ) : null}
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
        <AppText
          style={{ fontFamily: type.ui[600], fontSize: type.size.xs, lineHeight: 20, color: color.ink2 }}
        >
          {t.inbox.composer.preview}
        </AppText>
        <AppText
          style={{
            fontFamily: type.ui[400],
            fontSize: type.size.body,
            lineHeight: type.lineHeight(type.size.body),
            color: color.ink,
          }}
        >
          {templatePreview(template, params)}
        </AppText>
      </View>
      {missing ? <ErrorLine message={t.common.required} /> : null}
      <Button label={t.inbox.composer.send} onPress={send} />
      <Button variant="ghost" label={t.common.back} onPress={props.onBack} />
    </ScrollView>
  );
}
