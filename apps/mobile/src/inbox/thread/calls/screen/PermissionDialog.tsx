import { permissionHint, permissionReplyText, type PermissionAsk } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, space, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { callErrorText } from '../api/call-error';
import { callApi } from '../api/calls-api';
import { threadKey } from '../../hooks/thread-cache';
import { leadAge } from '../../../shared/format';

interface PermissionDialogProps {
  ask: PermissionAsk;
  onClose: () => void;
  /** The request went out (its bubble shows in the chat): the provider says «أُرسل طلب الإذن». */
  onSent: () => void;
}

/**
 * No permission to call this number yet (docs/28 §3.1): inside the 24 h window «اطلب إذن الاتصال»
 * sends WhatsApp's own permission request; from a calls number (docs/28 §10) outside its window, the
 * approved template of the settings (unset: no button, the sheet says why). The family's last answer on
 * the calls number shows under it. Nothing is sent until the button is pressed.
 */
export function PermissionDialog({ ask: sheet, onClose, onSent }: PermissionDialogProps) {
  const { phone, state } = sheet;
  const { color } = useTheme();
  const client = useQueryClient();
  const ask = useMutation({
    mutationFn: () => callApi.requestCallPermission(phone),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: threadKey(phone) });
      onSent();
    },
  });
  const reply = permissionReplyText(sheet.reply, { text: t.calls.permission, at: (iso) => leadAge(iso) });
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel={t.common.close} onPress={onClose} style={{ flex: 1, backgroundColor: color.scrim, justifyContent: 'flex-end' }}>
        <Pressable testID="call-permission" accessibilityViewIsModal style={{ backgroundColor: color.raised, borderTopStartRadius: shape.radius.lg, borderTopEndRadius: shape.radius.lg, padding: space[5], gap: space[3] }}>
          <AppText accessibilityRole="header" style={{ fontFamily: type.display, fontSize: type.size.h4, color: color.ink }}>{t.calls.permission.title}</AppText>
          <AppText style={{ fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 }}>{permissionHint(sheet, t.calls.permission)}</AppText>
          {reply ? <AppText style={{ fontSize: type.size.sm, color: color.ink3 }}>{reply}</AppText> : null}
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
