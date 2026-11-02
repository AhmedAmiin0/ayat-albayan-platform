import { CHANNEL_BODY_MAX } from '@ab/shared';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ButtonRow } from '@/core/ui/actions/ButtonRow';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { channelInputStyle } from '@/student-file/channel/channel-input-style';
import { type, useTheme } from '@/theme';

interface ChannelEditFormProps {
  initial: string;
  busy: boolean;
  /** The API's refusal in words, or null. */
  problem: string | null;
  onSave: (body: string) => void;
  onCancel: () => void;
}

/** «تعديل الرسالة»: the text prefilled, up to CHANNEL_BODY_MAX; the API trims and checks again. */
export function ChannelEditForm({
  initial,
  busy,
  problem,
  onSave,
  onCancel,
}: ChannelEditFormProps) {
  const { color } = useTheme();
  const [text, setText] = useState(initial);
  const body = text.trim();
  const tooLong = body.length > CHANNEL_BODY_MAX;
  const over = tooLong ? t.studentChannel.tooLong.replace('{n}', String(CHANNEL_BODY_MAX)) : null;
  const note = problem ?? over;
  return (
    <View style={{ gap: 8 }}>
      {note ? (
        <AppText accessibilityRole="alert" style={{ color: color.bad, fontSize: type.size.xs }}>
          {note}
        </AppText>
      ) : null}
      <TextInput
        accessibilityLabel={t.studentChannel.actions.editTitle}
        multiline
        autoFocus
        value={text}
        onChangeText={setText}
        style={channelInputStyle(color)}
      />
      <ButtonRow>
        <Button
          label={busy ? t.studentChannel.actions.saving : t.studentChannel.actions.save}
          busy={busy}
          disabled={!body || tooLong || body === initial.trim()}
          onPress={() => onSave(body)}
        />
        <Button variant="secondary" label={t.common.cancel} onPress={onCancel} />
      </ButtonRow>
    </View>
  );
}
