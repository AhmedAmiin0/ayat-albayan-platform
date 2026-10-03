import { normalizePhone } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
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
import { KindLine } from './KindLine';
import { FEEDBACK_RECOMMEND, type FeedbackFormView, type FeedbackRecommend, type Rating } from './types';

const RECOMMEND = FEEDBACK_RECOMMEND.map((r) => ({ value: r, label: t.enums.feedbackRecommend[r] }));
const PROBLEM_TEXT: Record<PublicProblem, string> = {
  expired: t.feedback.expired,
  invalid: t.feedback.invalid,
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
 * «رأيك يهمّنا», the Google Form's fields in its order: the teacher (prefilled, fixed), «نوع الحلقة»
 * (the lesson's own, fixed), «تقييمك للحلقة *», «هل ترشّح الأكاديمية لصديق أو قريب؟ *»,
 * «ملاحظة أو اقتراح» and «رقم واتساب للتواصل» (prefilled from the link, editable). The server sets
 * kind and teacher; only rating, recommend, note and phone are sent.
 */
export function FeedbackForm({ token, form, onDone }: FeedbackFormProps) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [recommend, setRecommend] = useState<FeedbackRecommend | null>(null);
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState(form.contactPhone ?? '');
  const [tried, setTried] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  const send = useMutation({
    mutationFn: submitFeedback,
    onSuccess: () => onDone('sent'),
    onError: (e) => {
      const problem = publicProblem(e);
      if (problem !== 'failed' && problem !== 'too_many') onDone(problem);
    },
  });
  const problem = send.isError ? publicProblem(send.error) : null;
  const typed = phone.trim() ? normalizePhone(phone) : null;
  const badPhone = tried && typed?.ok === false;

  return (
    <form
      noValidate
      ref={ref}
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!rating || !recommend || typed?.ok === false) {
          queueMicrotask(() => ref.current?.querySelector<HTMLElement>('[aria-invalid] input, input[aria-invalid]')?.focus());
          return;
        }
        const trimmed = note.trim();
        send.mutate({
          token,
          body: {
            rating,
            recommend,
            ...(trimmed ? { note: trimmed } : {}),
            ...(typed?.ok ? { contactPhone: typed.e164 } : {}),
          },
        });
      }}
    >
      <RequiredLegend />
      <Field label={t.feedback.teacher}>
        {(p) => <Input {...p} readOnly value={form.teacherName} className="bg-sunk text-ink-2" />}
      </Field>
      <KindLine kind={form.kind} />
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
      <Field label={t.feedback.contact} error={badPhone ? t.feedback.phoneInvalid : undefined}>
        {(p) => <Input {...p} dir="ltr" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}
      </Field>
      {tried && !rating && <FormAlert>{t.feedback.pickRating}</FormAlert>}
      {tried && !recommend && <FormAlert>{t.feedback.pickRecommend}</FormAlert>}
      {problem && <FormAlert>{PROBLEM_TEXT[problem]}</FormAlert>}
      <Button type="submit" size="lg" disabled={send.isPending} className="w-full">
        {send.isPending ? t.feedback.sending : t.feedback.submit}
      </Button>
    </form>
  );
}
