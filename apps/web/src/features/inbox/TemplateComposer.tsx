import { needsLesson, sendsAllTemplates } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Select } from '@/components/ui/select';
import { meQuery } from '@/features/auth/me';
import { templatesQuery } from '@/features/templates/api';
import { t } from '@/lib/i18n';
import { allowedTemplates, useReadsMessaging } from './allowed-templates';
import { sendTemplate } from './api';
import { LessonPicker } from './LessonPicker';
import { useInboxMode } from './mode';
import { TemplateParamFields } from './TemplateParamFields';
import { lessonValues, missingParams, prefillParams, toParamsInput, type ParamValues, type PrefillContext } from './template-params';
import { sendErrorText } from './TextComposer';

const NAMES: Record<string, string | undefined> = t.templates.names;

export interface TemplateComposerProps {
  phone: string;
  context: PrefillContext;
  /** A teacher's thread: only teacher templates, and only there. */
  teacher: boolean;
}

/**
 * Any approved template for this person, from the thread (H4): the only way to write after the
 * 24 h window. A restricted role (teacher, sales, any role without templates.send_all) gets only the
 * admin's allow-list (owner 2026-10-12: the API lists no other), with «المتغير n» fields. Names are
 * prefilled, a lesson time comes from the lesson picked (rule 6), and the preview is what they
 * read. The lesson is sent too, so a «تمام» reply links to it.
 */
export function TemplateComposer({ phone, context, teacher }: TemplateComposerProps) {
  const queryClient = useQueryClient();
  const templates = useQuery({ ...templatesQuery, enabled: useReadsMessaging() });
  const me = useQuery(meQuery).data;
  const staff = useInboxMode() !== 'admin';
  // Teacher and sales modes are always restricted; in the admin inbox, a role without the permissions.
  const restricted = staff || (me ? !sendsAllTemplates(me) : false);
  const approved = allowedTemplates(templates.data, teacher);
  const lessons = context.lessons ?? [];
  const [key, setKey] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [values, setValues] = useState<ParamValues>({});
  const [tried, setTried] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const tpl = approved.find((x) => x.key === key);
  const withLesson = !!tpl && needsLesson(tpl.params);
  function pick(next: string) {
    const chosen = approved.find((x) => x.key === next);
    setKey(next);
    setLessonId('');
    setValues(chosen ? prefillParams(chosen, context) : {});
    setTried(false);
    requestId.current = crypto.randomUUID();
  }
  const send = useMutation({
    mutationFn: sendTemplate,
    onSuccess: async () => {
      pick('');
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
  const pickLesson = (id: string) => {
    const lesson = lessons.find((l) => l.id === id);
    setLessonId(id);
    if (tpl && lesson) setValues({ ...values, ...lessonValues(tpl, lesson) });
  };
  const missing = tpl && tried ? missingParams(tpl, values) : [];
  // Teacher and sales with nothing allowed: what she can do, not a disabled select (W7).
  if (staff && templates.isSuccess && approved.length === 0) return <p className="text-xs text-ink-2">{t.inbox.composer.noAllowedHelp}</p>;

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!tpl || missingParams(tpl, values).length > 0 || (withLesson && !lessonId)) return;
        const lesson = lessonId ? { lessonId } : {};
        // Any registry key (a producer's, or a starter imported from Meta): the API validates it.
        send.mutate({ phone, key: tpl.key, params: toParamsInput(tpl, values), clientRequestId: requestId.current, ...lesson });
      }}
    >
      <Field label={t.inbox.composer.chooseTemplate}>
        {(p) => (
          <Select {...p} value={key} onChange={(e) => pick(e.target.value)} disabled={approved.length === 0}>
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
        // A restricted role lists only the allow-list: none ticked (or not imported yet) is not «nothing approved».
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
      {tpl && <TemplateParamFields template={tpl} values={values} missing={missing} onChange={setValues} />}
      {send.isError && <FormAlert>{sendErrorText(send.error)}</FormAlert>}
      <div className="flex justify-end">
        <Button type="submit" disabled={!tpl || send.isPending || (withLesson && lessons.length === 0)}>
          {send.isPending ? t.inbox.composer.sending : t.inbox.composer.sendTemplate}
        </Button>
      </div>
    </form>
  );
}
