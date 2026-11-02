import type { NumberView } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { parseRank, RANK_MAX, RANK_MIN } from './fallback-rank';
import { numberErrorText } from './number-errors';
import { updateNumber } from '@/features/messaging/numbers/numbers-api';
import { useNumbersMutation } from '@/features/messaging/numbers/use-numbers-mutation';

const r = t.numbers.fallbackRank;

/**
 * «ترتيب البديل» (docs/23c decisions 3, 9): the number's place among its role's fallbacks (0–999, lower
 * first). numbers.manage edits it through the number PATCH; without it the value is text. A bad value
 * is said on blur or submit, not on every keystroke. NumberCard keys it by id + saved rank, so a
 * refetched rank resets the input.
 */
export function FallbackRankField({ view, manage }: { view: NumberView; manage: boolean }) {
  const [text, setText] = useState(String(view.fallback_rank));
  const [touched, setTouched] = useState(false);
  const patch = useNumbersMutation(updateNumber, {
    note: r.saved,
    onDone: () => setTouched(false),
  });
  if (!manage)
    return (
      <p className="text-xs text-ink-2">
        {r.value.replace('{{rank}}', String(view.fallback_rank))}
      </p>
    );
  const rank = parseRank(text);
  const dirty = rank !== view.fallback_rank;
  const save = () => {
    setTouched(true);
    if (rank !== null && dirty) patch.mutate({ id: view.id, body: { fallback_rank: rank } });
  };
  return (
    <form
      className="grid gap-2"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Field label={r.label} hint={r.hint} error={touched && rank === null ? r.invalid : undefined}>
        {(p) => (
          <Input
            {...p}
            type="number"
            inputMode="numeric"
            min={RANK_MIN}
            max={RANK_MAX}
            step={1}
            dir="ltr"
            className="max-w-36"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => setTouched(true)}
          />
        )}
      </Field>
      {dirty && (
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          className="justify-self-start"
          disabled={patch.isPending}
        >
          {patch.isPending ? t.common.saving : r.save}
        </Button>
      )}
      {patch.isError && <FormAlert>{numberErrorText(patch.error)}</FormAlert>}
    </form>
  );
}
