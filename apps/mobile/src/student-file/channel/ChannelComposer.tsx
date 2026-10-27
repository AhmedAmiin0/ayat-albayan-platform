import { CHANNEL_BODY_MAX } from '@ab/shared';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';

interface Props {
  pending: boolean;
  failed: boolean;
  onSend: (body: string) => Promise<unknown>;
}

/** Text only, up to CHANNEL_BODY_MAX characters; the API trims and checks again. */
export function ChannelComposer({ pending, failed, onSend }: Props) {
  const { color } = useTheme();
  const [text, setText] = useState('');
  const body = text.trim();
  const tooLong = body.length > CHANNEL_BODY_MAX;
  const note = failed ? t.studentChannel.sendFailed : tooLong ? t.studentChannel.tooLong.replace('{n}', String(CHANNEL_BODY_MAX)) : null;
  const send = () => {
    if (!body || tooLong || pending) return;
    onSend(body).then(() => setText(''), () => undefined);
  };
  return (
    <View style={{ gap: 8, paddingTop: 8, borderTopWidth: 1, borderColor: color.rule }}>
      {note ? <AppText accessibilityRole="alert" style={{ color: color.bad, fontSize: type.size.xs }}>{note}</AppText> : null}
      <TextInput
        accessibilityLabel={t.studentChannel.messageLabel}
        multiline
        value={text}
        onChangeText={setText}
        placeholder={t.studentChannel.placeholder}
        placeholderTextColor={color.ink3}
        style={{
          minHeight: 44,
          maxHeight: 140,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: color.ruleInput,
          borderRadius: shape.radius.md,
          backgroundColor: color.raised,
          color: color.ink,
          fontFamily: type.ui[400],
          fontSize: type.size.body,
        }}
      />
      <Button label={pending ? t.studentChannel.sending : t.studentChannel.send} busy={pending} disabled={!body || tooLong} onPress={send} />
    </View>
  );
}
