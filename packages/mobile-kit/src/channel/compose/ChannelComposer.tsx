import { CHANNEL_BODY_MAX } from '@ab/shared';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { t } from '../lib/i18n/i18n';
import { type, useTheme } from '../theme';
import { AppText } from '../ui/primitives/AppText';
import { Button } from '../ui/primitives/Button';
import { channelInputStyle } from './channel-input-style';
import { useSendChannel, type ChannelRef } from './channel-api';

/** Text only, up to CHANNEL_BODY_MAX characters; the API trims and checks again. */
export function ChannelComposer({ refs }: { refs: ChannelRef }) {
  const { color } = useTheme();
  const send = useSendChannel(refs);
  const [text, setText] = useState('');
  const body = text.trim();
  const tooLong = body.length > CHANNEL_BODY_MAX;
  const over = tooLong ? t.studentChannel.tooLong.replace('{n}', String(CHANNEL_BODY_MAX)) : null;
  const note = send.isError ? t.studentChannel.sendFailed : over;
  const submit = () => {
    if (!body || tooLong || send.isPending) return;
    send.mutateAsync(body).then(
      () => setText(''),
      () => undefined,
    );
  };
  return (
    <View style={{ gap: 8, paddingTop: 8, borderTopWidth: 1, borderColor: color.rule }}>
      {note ? (
        <AppText accessibilityRole="alert" style={{ color: color.bad, fontSize: type.size.xs }}>
          {note}
        </AppText>
      ) : null}
      <TextInput
        accessibilityLabel={t.studentChannel.messageLabel}
        multiline
        value={text}
        onChangeText={setText}
        placeholder={t.studentChannel.placeholder}
        placeholderTextColor={color.ink3}
        style={channelInputStyle(color)}
      />
      <Button
        label={send.isPending ? t.studentChannel.sending : t.studentChannel.send}
        busy={send.isPending}
        disabled={!body || tooLong}
        onPress={submit}
      />
    </View>
  );
}
