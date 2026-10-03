import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Input, controlClass } from '@/components/ui/input';
import { RequiredLegend } from '@/components/ui/label';
import { RadioChips } from '@/components/ui/radio-chips';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { publicProblem, submitFeedback, type PublicProblem } from './api';
import { RatingScale } from './RatingScale';
import { FEEDBACK_KINDS, FEEDBACK_RECOMMEND, type FeedbackFormView, type FeedbackRecommend, type Rating } from './types';

const KINDS = FEEDBACK_KINDS.map((k) => ({ value: k, label: t.enums.feedbackKind[k] }));
const RECOMMEND = FEEDBACK_RECOMMEND.map((r) => ({ value: r, label: t.enums.feedbackRecommend[r] }));
const PROBLEM_TEXT: Record<PublicProblem, string> = {
  invalid: t.feedback.expired,
  already: t.feedback.alreadySent,
  too_many: t.feedback.tooMany,
  failed: t.feedback.submitFailed,
};

export interface FeedbackFormProps {
  token: string;
  form: FeedbackFormView;
  /** The server said it is done (sent, or already sent): the page swaps to its closing screen. */
  onDone: (outcome: 'sent' | PublicProblem) => void;
}

/**
 * «رأيك يهمّنا», the Google Form's fields in its order: the teacher (read-only), «نوع الحلقة»
 * (the lesson's own, read-only), «تقييمك للحلقة *», «هل ترشّح الأكاديمية لصديق أو قريب؟ *»,
 * «ملاحظة أو اقتراح» and «رقم واتساب للتواصل» (prefilled from the link). The server sets kind and
 * teacher; only rating, recommend, note and phone are sent.
 */
export function FeedbackForm({ token, form, onDone }: FeedbackFormProps) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [recommend, setRecommend] = useState<FeedbackRecommend | null>(null);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const send = useMutation({
    mutationFn: submitFeedback,
    onSuccess: () => onDone('sent'),
    onError: (e) => {
      const problem = publicProblem(e);
      if (problem !== 'failed' && problem !== 'too_many') onDone(problem);
    },
  });
  const problem = send.isError ? publicProblem(send.error) : null;

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!rating || !recommend) return;
        const trimmed = note.trim();
        send.mutate({
          token,
          body: {
            rating,
            recommend,
            ...(trimmed ? { note: trimmed } : {}),
            ...(form.contactPhone ? { contactPhone: form.contactPhone } : {}),
          },
        });
      }}
    >
      <RequiredLegend />
      <Field label={t.feedback.teacher}>
        {(p) => <Input {...p} readOnly value={form.teacherName} />}
      </Field>
      <RadioChips name="feedback-kind" legend={t.feedback.kind} options={KINDS} value={form.kind} onChange={() => undefined} disabled required />
      <RatingScale value={rating} onChange={setRating} invalid={tried && !rating} />
      <RadioChips
        name="feedback-recommend"
        legend={t.feedback.recommend}
        options={RECOMMEND}
        value={recommend}
        onChange={setRecommend}
        invalid={tried && !recommend}
        required
      />
      <Field label={t.feedback.note}>
        {(p) => (
          <textarea
            {...p}
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={cn(controlClass, 'field-sizing-content min-h-24 py-2 leading-relaxed sm:min-h-24')}
          />
        )}
      </Field>
      <Field label={t.feedback.contact}>
        {(p) => <Input {...p} readOnly dir="ltr" type="tel" value={form.contactPhone ?? ''} />}
      </Field>
      {tried && (!rating || !recommend) && <FormAlert>{t.common.required}</FormAlert>}
      {problem && <FormAlert>{PROBLEM_TEXT[problem]}</FormAlert>}
      <Button type="submit" size="lg" disabled={send.isPending} className="w-full">
        {send.isPending ? t.feedback.sending : t.feedback.submit}
      </Button>
    </form>
  );
}
