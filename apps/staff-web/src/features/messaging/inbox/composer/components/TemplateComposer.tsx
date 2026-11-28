import { needsLesson, sendsAllTemplates, type TemplateView } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Button, Field, FormAlert, Select, meQuery, t } from '@ab/web-kit';
import { templatesQuery } from '@/features/messaging/templates/api';
import { allowedTemplates, noneAllowedText, useNoneAllowed, useReadsMessaging } from '@/features/messaging/inbox/composer/lib/allowed-templates';
import { sendTemplate } from '@/features/messaging/inbox/api/api';
import { LessonPicker } from '@/features/messaging/inbox/lead/LessonPicker';
import { useInboxMode } from '@/features/messaging/inbox/shared/mode';
import { TemplateParamFields } from './TemplateParamFields';
import { lessonValues, missingParams, prefillParams, toParamsInput, type ParamValues, type PrefillContext } from '@/features/messaging/inbox/composer/lib/template-params';
import { sendErrorText } from '@/features/messaging/inbox/composer/lib/send-error';
import { sendStart, settleOwnSend } from '@/features/messaging/inbox/composer/lib/send-start';
import { showAnswer } from '@/features/messaging/inbox/api/send-cache';

const NAMES: Record<string, string | undefined> = t.templates.names;

export interface TemplateComposerProps {
  phone: string;
  context: PrefillContext;
  /** A teacher's thread: only teacher templates, and only there. */
  teacher: boolean;
  /** Reopening the chat offers only these, `initial` picked and filled; sent with reopen: true. */
  reopen?: ReopenPick;
}

/** The reopen dialog's list (reopenChoices) and what it does once the template went. */
export interface ReopenPick {
  list: TemplateView[];
  initial: TemplateView | null;
  /** The draft fills the free-text slot, overriding the prefill. */
  values?: ParamValues;
  /** The sent template's key. */
  onSent: (key: string) => void;
}

/** The only way to write after the 24 h window; restricted roles get the admin's allow-list. */
export function TemplateComposer({ phone, context, teacher, reopen }: TemplateComposerProps) {
  const queryClient = useQueryClient();
  const templates = useQuery({ ...templatesQuery, enabled: useReadsMessaging() });
  const me = useQuery(meQuery).data;
  const staff = useInboxMode() !== 'admin';
  const noneAllowed = useNoneAllowed(teacher);
  // Teacher and sales are always restricted; in the admin inbox, a role without the permissions.
  const restricted = staff || (me ? !sendsAllTemplates(me) : false);
  const approved = reopen?.list ?? allowedTemplates(templates.data, teacher);
  const lessons = context.lessons ?? [];
  const first = reopen?.initial ?? null;
  const [key, setKey] = useState(first?.key ?? '');
  const [lessonId, setLessonId] = useState('');
  // The carried draft (reopen.values) belongs to the first template, also when picked again.
  const carried = (x: TemplateView) => (x === first ? reopen?.values : undefined);
  const fill = (x: TemplateView) => ({ ...prefillParams(x, context), ...carried(x) });
  const prefill = () => (first ? fill(first) : {});
  const [values, setValues] = useState<ParamValues>(prefill);
  const [tried, setTried] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const tpl = approved.find((x) => x.key === key);
  const withLesson = !!tpl && needsLesson(tpl.params);
  function pick(next: string) {
    const chosen = approved.find((x) => x.key === next);
    setKey(next);
    setLessonId('');
    setValues(chosen ? fill(chosen) : {});
    setTried(false);
    requestId.current = crypto.randomUUID();
  }
  const send = useMutation({
    mutationFn: sendTemplate,
    onMutate: sendStart,
    onSuccess: (view, sent, start) => {
      settleOwnSend(sent.phone, view.id, start);
      pick('');
      reopen?.onSent(sent.key);
      showAnswer(queryClient, view);
    },
  });
  const pickLesson = (id: string) => {
    const lesson = lessons.find((l) => l.id === id);
    setLessonId(id);
    if (tpl && lesson) setValues({ ...values, ...lessonValues(tpl, lesson) });
  };
  const missing = tpl && tried ? missingParams(tpl, values) : [];
  // Teacher/sales, nothing allowed or no messages.read: what she can do, no disabled select (W7).
  if (noneAllowed) return <p className="text-xs text-ink-2">{noneAllowedText(noneAllowed, t.inbox.composer.noAllowedHelp)}</p>;

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!tpl || missingParams(tpl, values).length > 0 || (withLesson && !lessonId)) return;
        const lesson = lessonId ? { lessonId } : {};
        // Any registry key (a producer's, or a starter imported from Meta): the API validates it.
        const flag = reopen ? { reopen: true } : {};
        const params = toParamsInput(tpl, values);
        const clientRequestId = requestId.current;
        send.mutate({ phone, key: tpl.key, params, clientRequestId, ...lesson, ...flag });
      }}
    >
      <Field label={t.inbox.composer.chooseTemplate}>
        {(p) => (
          <Select
            {...p}
            value={key}
            onChange={(e) => pick(e.target.value)}
            disabled={approved.length === 0}
          >
            <option value="">—</option>
            {approved.map((x) => (
              <option key={x.key} value={x.key}>
                {NAMES[x.key] ?? x.key}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {templates.isSuccess && approved.length === 0 && (
        // Restricted: only the allow-list, so none ticked (or not imported) ≠ «nothing approved».
        <p className="text-xs text-ink-3">{restricted ? t.inbox.composer.noAllowed : t.inbox.composer.noApproved}</p>
      )}
      {templates.isError && <FormAlert>{t.common.error}</FormAlert>}
      {withLesson && (
        <LessonPicker
          lessons={lessons}
          value={lessonId}
          onChange={pickLesson}
          error={tried && !lessonId ? t.inbox.composer.pickLesson : undefined}
        />
      )}
      {tpl && (
        <TemplateParamFields
          template={tpl}
          values={values}
          missing={missing}
          onChange={setValues}
        />
      )}
      {send.isError && <FormAlert>{sendErrorText(send.error)}</FormAlert>}
      <div className="flex justify-end">
        <Button type="submit" disabled={!tpl || send.isPending || (withLesson && lessons.length === 0)}>
          {send.isPending ? t.inbox.composer.sending : t.inbox.composer.sendTemplate}
        </Button>
      </div>
    </form>
  );
}
