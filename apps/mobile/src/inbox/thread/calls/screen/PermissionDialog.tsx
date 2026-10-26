import type { CallPermissionState } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, space, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { callErrorText } from '../api/call-error';
import { requestCallPermission } from '../api/calls-api';
import { threadKey } from '../../hooks/thread-cache';

export interface PermissionDialogProps {
  phone: string;
  state: Exclude<CallPermissionState, 'granted'>;
  onClose: () => void;
  /** The request went out (its bubble shows in the chat): the provider says «أُرسل طلب الإذن». */
  onSent: () => void;
}

const TEXT = {
  request: () => t.calls.permission.requestHint,
  needs_template: () => t.calls.permission.needsTemplate,
  limited: () => t.calls.permission.limited,
} as const;

/**
 * No permission to call this number yet (docs/28 §3.1): inside the 24 h window «اطلب إذن الاتصال»
 * sends WhatsApp's own permission request through the outbox; otherwise the sheet says why not.
 */
export function PermissionDialog({ phone, state, onClose, onSent }: PermissionDialogProps) {
  const { color } = useTheme();
  const client = useQueryClient();
  const ask = useMutation({
    mutationFn: () => requestCallPermission(phone),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: threadKey(phone) });
      onSent();
    },
  });
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel={t.common.close} onPress={onClose} style={{ flex: 1, backgroundColor: color.scrim, justifyContent: 'flex-end' }}>
        <Pressable testID="call-permission" accessibilityViewIsModal style={{ backgroundColor: color.raised, borderTopStartRadius: shape.radius.lg, borderTopEndRadius: shape.radius.lg, padding: space[5], gap: space[3] }}>
          <AppText accessibilityRole="header" style={{ fontFamily: type.display, fontSize: type.size.h4, color: color.ink }}>{t.calls.permission.title}</AppText>
          <AppText style={{ fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 }}>{TEXT[state]()}</AppText>
          {ask.isError ? (
            <AppText accessibilityRole="alert" style={{ fontSize: type.size.sm, color: color.bad }}>{callErrorText(ask.error)}</AppText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: space[2], justifyContent: 'flex-end' }}>
            <Button variant="ghost" label={t.common.close} onPress={onClose} />
            {state === 'request' ? <Button label={t.calls.permission.request} busy={ask.isPending} onPress={() => ask.mutate()} /> : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
