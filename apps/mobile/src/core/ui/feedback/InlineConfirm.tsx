import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { ButtonRow } from '../actions/ButtonRow';
import { Button } from '../primitives/Button';
import { AppText } from '../primitives/AppText';

interface InlineConfirmProps {
  /** The question, e.g. «شكلها طلب توظيف مش طالب.» */
  message: string;
  /** Primary action, named by its verb («نقل لطلبات التوظيف»); defaults to «تأكيد». */
  confirmLabel?: string;
  /** Secondary way out («سيبها هنا»); defaults to «إلغاء». */
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** While the confirm request runs; pass the confirm label that says so. */
  busy?: boolean;
  /** «danger»: the confirm cancels or deletes something, so it is the outlined danger, not green. */
  tone?: 'danger';
}

/**
 * docs/07 §9 inline confirm strip: the question, then ONE ButtonRow (docs/07 §6 «الأزرار»): the confirm
 * (primary) at the reading start, the way out (secondary) beside it; they stack when they do not fit.
 */
export function InlineConfirm(props: InlineConfirmProps) {
  const { message, onConfirm, onCancel, busy = false } = props;
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
          variant={props.tone === 'danger' ? 'danger' : 'primary'}
          label={props.confirmLabel ?? t.common.confirm}
          onPress={onConfirm}
          busy={busy}
        />
        <Button variant="secondary" label={props.cancelLabel ?? t.common.cancel} onPress={onCancel} />
      </ButtonRow>
    </View>
  );
}
