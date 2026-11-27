import type { TemplateView, ThreadView } from '@ab/shared';
import { lessonRatingCalls } from '@ab/client-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import {
  usePermissions,
  apiFetch,
  apiSend,
  t,
  pathKey,
  type,
  useTheme,
  AppText,
  Button,
  ErrorLine,
} from '@ab/mobile-kit';
import { requestId } from '@/core/lib/http/request-id';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { refreshInbox } from '@/inbox/thread/hooks/inbox-sync';
import { markOwnSend } from '@/inbox/thread/anchor/own-send';
import { ratingApproved, ratingDone, ratingError } from './rating-words';

const TEMPLATES = '/messaging/templates';
const ratings = lessonRatingCalls({ apiFetch, apiSend });

/** Idempotent: one request id per confirmed attempt kept across retries (rule 8). */
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
    mutationFn: () => ratings.send({ phone: thread.phone_e164 }, { clientRequestId: id.current }),
    onMutate: () => markOwnSend(thread.phone_e164),
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
      {templates.isSuccess && !approved ? (
        <AppText style={note}>{t.inbox.rating.notApproved}</AppText>
      ) : null}
      {templates.isError ? <ErrorLine message={t.mobileLeads.ratingTemplatesFailed} /> : null}
      {approved && !done ? <AppText style={note}>{t.mobileLeads.ratingHint}</AppText> : null}
      {done && !done.error ? <AppText accessibilityLiveRegion="polite" style={note}>{done.text}</AppText> : null}
      {done?.error ? <ErrorLine message={done.text} /> : null}
      {send.isError ? <ErrorLine message={ratingError(send.error)} /> : null}
    </View>
  );
}
