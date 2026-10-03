import { needsLesson, TEMPLATE_KEYS } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Select } from '@/components/ui/select';
import { FEEDBACK_TEMPLATE } from '@/features/feedback/types';
import { templatesQuery } from '@/features/templates/api';
import { t } from '@/lib/i18n';
import { sendTemplate } from './api';
import { LessonPicker } from './LessonPicker';
import { TemplateParamFields } from './TemplateParamFields';
import { forAudience, lessonValues, missingParams, prefillParams, toParamsInput, type ParamValues, type PrefillContext } from './template-params';
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
 * 24 h window. Names are prefilled, a lesson time comes from the lesson picked (rule 6), and the
 * preview is what they read. The lesson is sent too, so a «تمام» reply links to it.
 */
export function TemplateComposer({ phone, context, teacher }: TemplateComposerProps) {
  const queryClient = useQueryClient();
  const templates = useQuery(templatesQuery);
  const approved = (templates.data ?? [])
    // The feedback request needs its own signed link (token): it is sent only by «ابعت طلب الرأي».
    .filter((x) => x.status === 'approved' && x.key !== FEEDBACK_TEMPLATE && forAudience(x, teacher));
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

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        const known = TEMPLATE_KEYS.find((k) => k === tpl?.key);
        if (!tpl || !known || missingParams(tpl, values).length > 0 || (withLesson && !lessonId)) return;
        const lesson = lessonId ? { lessonId } : {};
        send.mutate({ phone, key: known, params: toParamsInput(tpl, values), clientRequestId: requestId.current, ...lesson });
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
      {templates.isSuccess && approved.length === 0 && <p className="text-xs text-ink-3">{t.inbox.composer.noApproved}</p>}
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
