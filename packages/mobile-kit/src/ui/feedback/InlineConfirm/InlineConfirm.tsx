import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { shape, type, useTheme } from '../../../theme';
import { ButtonRow } from '../../layout/ButtonRow';
import { AppText } from '../../primitives/AppText';
import { Button } from '../../primitives/Button';
import type { InlineConfirmProps } from './InlineConfirm.types';

/** docs/07 §9 and §6: one ButtonRow, confirm first; they stack when they do not fit. */
export function InlineConfirm(props: InlineConfirmProps) {
  const { message, onConfirm, onCancel, busy = false, confirmRef } = props;
  const { color } = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        gap: 10,
        padding: 12,
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderColor: color.goldSoft,
        backgroundColor: color.goldWash,
      }}
    >
      <AppText
        style={{
          fontFamily: type.ui[500],
          fontSize: type.size.sm,
          lineHeight: type.lineHeight(type.size.sm),
          color: color.ink,
        }}
      >
        {message}
      </AppText>
      <ButtonRow>
        <Button
          ref={confirmRef}
          variant={props.tone ?? 'primary'}
          label={props.confirmLabel ?? t.common.confirm}
          onPress={onConfirm}
          busy={busy}
        />
        <Button
          variant="secondary"
          label={props.cancelLabel ?? t.common.cancel}
          onPress={onCancel}
        />
      </ButtonRow>
    </View>
  );
}
