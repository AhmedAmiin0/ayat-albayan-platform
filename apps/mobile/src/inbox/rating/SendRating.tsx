import type { MessageView, TemplateView, ThreadView } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { View } from 'react-native';
import { apiFetch, apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { pathKey } from '@/lib/query-keys';
import { requestId } from '@/lib/request-id';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { ErrorLine } from '../ErrorLine';
import { threadPath } from '../thread-cache';
import { ratingApproved, ratingDone, ratingError } from './rating-words';

const TEMPLATES = '/messaging/templates';

/**
 * «إرسال تقييم الحلقة» (admin, a guardian's thread): POST /threads/:phone/rating. The API picks the
 * children's latest completed lesson (so there is no lesson to choose, as on the web) and sends
 * lesson_rating. One request id per press, kept across a retry (rule 8); off until Meta approves it.
 * TemplatePicker leaves lesson_rating out on purpose: this is its own action.
 */
export function SendRating({ thread }: { thread: Pick<ThreadView, 'phone_e164' | 'guardian_id'> }) {
  const { color } = useTheme();
  const client = useQueryClient();
  const guardian = !!thread.guardian_id;
  const templates = useQuery({
    queryKey: pathKey(TEMPLATES),
    queryFn: () => apiFetch<TemplateView[]>(TEMPLATES),
    enabled: guardian,
  });
  const id = useRef(requestId());
  const send = useMutation({
    mutationFn: () => apiSend<MessageView>('POST', `${threadPath(thread.phone_e164)}/rating`, { clientRequestId: id.current }),
    onSuccess: () => {
      id.current = requestId();
      void client.invalidateQueries({ queryKey: pathKey('/threads') });
    },
  });
  if (!guardian) return null;
  const approved = ratingApproved(templates.data);
  const done = ratingDone(send.data);
  const note = { fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 };
  return (
    <View style={{ gap: 4 }}>
      <Button
        variant="secondary"
        label={send.isPending ? t.inbox.rating.sending : t.inbox.rating.send}
        busy={send.isPending}
        disabled={!approved}
        onPress={() => send.mutate()}
      />
      {templates.isSuccess && !approved ? <AppText style={note}>{t.inbox.rating.notApproved}</AppText> : null}
      {approved && !done ? <AppText style={note}>{t.mobileLeads.ratingHint}</AppText> : null}
      {done ? <AppText accessibilityLiveRegion="polite" style={note}>{done}</AppText> : null}
      {send.isError ? <ErrorLine message={ratingError(send.error)} /> : null}
    </View>
  );
}
