import { useQuery } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent } from 'react';
import {
  Button,
  Dialog,
  Field,
  FormAlert,
  Input,
  SegmentedControl,
  t,
} from '@ab/web-kit';
import { apiErrorText } from '@/features/finance/subscriptions';
import type { RegistrationCheckBy, RegistrationCheckCode } from '@ab/shared';
import { checkRequest } from './registration-check';
import { RegistrationMatches } from './RegistrationMatches';
import { registrationCheckQuery } from './registration-check-query';
import type { RegistrationAsk } from './registration-check.types';

const R = t.registrationCheck;

export interface RegistrationCheckDialogProps {
  /** The chat's number: the check runs on open. */
  phone?: string;
  onClose: () => void;
}

type Asked = { by: RegistrationCheckBy; query: RegistrationAsk } | null;

function firstAsk(phone: string | undefined): Asked {
  const r = phone ? checkRequest('phone', phone) : null;
  return r?.ok ? { by: r.by, query: r.query } : null;
}

function serverError(error: unknown): string {
  const text = apiErrorText(error, { ...R.error });
  return text === t.common.error ? R.error.generic : text;
}

/** Only name, code, status and teacher come back, never a phone or money (docs/16 row 23). */
export function RegistrationCheckDialog({ phone, onClose }: RegistrationCheckDialogProps) {
  const formId = useId();
  const [by, setBy] = useState<RegistrationCheckBy>(phone ? 'phone' : 'name');
  const [value, setValue] = useState({ phone: phone ?? '', name: '' });
  const [invalid, setInvalid] = useState<RegistrationCheckCode | null>(null);
  const [asked, setAsked] = useState<Asked>(() => firstAsk(phone));
  const answer = useQuery(registrationCheckQuery(asked?.query ?? null));
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const r = checkRequest(by, value[by]);
    setInvalid(r.ok ? null : r.code);
    setAsked(r.ok ? { by: r.by, query: r.query } : null);
  };
  const pick = (next: RegistrationCheckBy) => {
    setBy(next);
    setInvalid(null);
    setAsked(null);
  };
  const error = invalid ? R.error[invalid] : undefined;
  return (
    <Dialog
      title={R.title}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {R.close}
          </Button>
          <Button type="submit" form={formId} disabled={answer.isFetching}>
            {answer.isFetching ? R.checking : R.submit}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        <SegmentedControl
          label={R.title}
          value={by}
          onChange={pick}
          options={[
            { value: 'phone', label: R.byPhone },
            { value: 'name', label: R.byName },
          ]}
        />
        {by === 'phone' ? (
          <Field label={R.phone} error={error}>
            {(p) => <Input {...p} dir="ltr" type="tel" inputMode="tel" value={value.phone} onChange={(e) => setValue({ ...value, phone: e.target.value })} />}
          </Field>
        ) : (
          <Field label={R.query} hint={R.queryHint} error={error}>
            {(p) => (
              <Input
                {...p}
                value={value.name}
                onChange={(e) => setValue({ ...value, name: e.target.value })}
              />
            )}
          </Field>
        )}
      </form>
      <div className="mt-4" aria-live="polite">
        {asked && answer.isError && <FormAlert>{serverError(answer.error)}</FormAlert>}
        {asked && answer.data && <RegistrationMatches view={answer.data} by={asked.by} />}
      </div>
    </Dialog>
  );
}
