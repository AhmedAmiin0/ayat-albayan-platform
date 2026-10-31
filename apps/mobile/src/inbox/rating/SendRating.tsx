import type { MessageView, TemplateView, ThreadView } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { usePermissions } from '@/auth/use-permissions';
import { apiFetch, apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { requestId } from '@/core/lib/http/request-id';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { refreshInbox } from '@/inbox/thread/hooks/inbox-sync';
import { threadPath } from '@/inbox/thread/hooks/thread-cache';
import { ratingApproved, ratingDone, ratingError } from './rating-words';

const TEMPLATES = '/messaging/templates';

/**
 * «إرسال تقييم الحلقة» (feedback.write, a guardian's thread whose 24 h window is closed, as on the
 * web): POST /threads/:phone/rating. The API picks the children's latest completed lesson (no
 * lesson to choose). It asks first, naming the guardian; one request id per confirmed attempt, kept
 * across a retry (rule 8) and the button is off once it went out. Off until Meta approves it.
 */
export function SendRating({ thread }: { thread: Pick<ThreadView, 'phone_e164' | 'guardian_id' | 'display_name'> }) {
  const { color } = useTheme();
  const client = useQueryClient();
  const allowed = usePermissions()('feedback.write');
  const guardian = !!thread.guardian_id && allowed;
  const [asking, setAsking] = useState(false);
  const templates = useQuery({
    queryKey: pathKey(TEMPLATES),
    queryFn: () => apiFetch<TemplateView[]>(TEMPLATES),
    enabled: guardian,
  });
  const id = useRef(requestId());
  const send = useMutation({
    mutationFn: () => apiSend<MessageView>('POST', `${threadPath(thread.phone_e164)}/rating`, { clientRequestId: id.current }),
    onSuccess: (row) => {
      // A row Meta refused is a finished attempt: asking again is a new one.
      if (row.status === 'failed') id.current = requestId();
      void refreshInbox(client, thread.phone_e164);
    },
    onSettled: () => setAsking(false),
  });
  if (!guardian) return null;
  const approved = ratingApproved(templates.data);
  const done = ratingDone(send.data);
  const out = !!done && !done.error;
  const note = { fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 };
  const name = thread.display_name ?? thread.phone_e164;
  return (
    <View style={{ gap: 4 }}>
      {asking ? (
        <InlineConfirm
          message={t.mobileLeads.ratingConfirm.replace('{name}', name)}
          confirmLabel={send.isPending ? t.inbox.rating.sending : t.inbox.rating.send}
          busy={send.isPending}
          onConfirm={() => send.mutate()}
          onCancel={() => !send.isPending && setAsking(false)}
        />
      ) : (
        <Button
          variant="secondary"
          label={t.inbox.rating.send}
          disabled={!approved || out}
          onPress={() => {
            send.reset();
            setAsking(true);
          }}
        />
      )}
      {templates.isSuccess && !approved ? <AppText style={note}>{t.inbox.rating.notApproved}</AppText> : null}
      {templates.isError ? <ErrorLine message={t.mobileLeads.ratingTemplatesFailed} /> : null}
      {approved && !done ? <AppText style={note}>{t.mobileLeads.ratingHint}</AppText> : null}
      {done && !done.error ? <AppText accessibilityLiveRegion="polite" style={note}>{done.text}</AppText> : null}
      {done?.error ? <ErrorLine message={done.text} /> : null}
      {send.isError ? <ErrorLine message={ratingError(send.error)} /> : null}
    </View>
  );
}
