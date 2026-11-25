import type { RegistrationCheckView, RegistrationMatch } from '@ab/shared';
import { formatPhone } from '@ab/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent, type ReactNode } from 'react';
import { Ltr, Button, Field, FormAlert, Input, Dialog, apiFetch, t } from '@ab/web-kit';
import { salesKeys } from '@/features/sales/keys';
import { checkRequest, RegistrationMatches } from '@/features/sales/sales';
import {
  linkedText,
  linkFamily,
  linkFamilyErrorText,
  refreshAfterLink,
  searchErrorText,
} from './link-family';

const L = t.inbox.linkFamily;
const R = t.registrationCheck;

interface LinkFamilyDialogProps {
  /** The chat's lead (ThreadView.lead_id). */
  leadId: string;
  /** The chat's number, shown under the title: on a phone the dialog covers the chat. */
  phone: string;
  onClose: () => void;
  onDone: (text: string) => void;
}

/** The name and code are bidi islands so a Latin name never pulls the brackets. */
function slot(part: string, m: RegistrationMatch, key: number): ReactNode {
  if (part === '{name}') return <bdi key={key}>{m.name}</bdi>;
  if (part === '{code}') return <Ltr key={key}>{m.code}</Ltr>;
  return part;
}

/** Linking adds this number as the family's second number; nothing is sent and the owner stays. */
export function LinkFamilyDialog({ leadId, phone, onClose, onDone }: LinkFamilyDialogProps) {
  const formId = useId();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [picked, setPicked] = useState<RegistrationMatch | null>(null);
  const answer = useQuery({
    queryKey: salesKeys.registrationCheck(path ?? ''),
    queryFn: () => apiFetch<RegistrationCheckView>(path ?? ''),
    enabled: path !== null,
    retry: false,
  });
  const link = useMutation({
    mutationFn: linkFamily,
    // The toast first: in the admin inbox the lead panel (and this dialog) goes once the thread refetches.
    onSuccess: async (r) => {
      onDone(linkedText(r));
      await refreshAfterLink(queryClient);
    },
  });
  // With no pick an edited name is searched again before anything is linked.
  const pick = (m: RegistrationMatch | null) => {
    setPicked(m);
    link.reset();
  };
  const search = (e: SubmitEvent) => {
    e.preventDefault();
    const r = checkRequest('name', query);
    setInvalid(r.ok ? null : R.error[r.code]);
    setPath(r.ok ? r.path : null);
    pick(null);
  };
  const action = picked ? (
    <Button
      type="button"
      disabled={link.isPending}
      onClick={() => link.mutate({ leadId, code: picked.code })}
    >
      {link.isPending ? L.linking : L.submit}
    </Button>
  ) : (
    <Button type="submit" form={formId} disabled={answer.isFetching}>
      {answer.isFetching ? R.checking : t.common.search}
    </Button>
  );
  const description = (
    <>
      <Ltr className="block font-semibold text-ink-2">{formatPhone(phone)}</Ltr>
      {L.hint}
    </>
  );
  return (
    <Dialog
      title={L.title}
      description={description}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          {action}
        </>
      }
    >
      <form id={formId} className="grid gap-4" onSubmit={search} noValidate>
        <Field label={R.query} error={invalid ?? undefined}>
          {(p) => (
            <Input
              {...p}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                pick(null);
              }}
            />
          )}
        </Field>
      </form>
      {/* The confirm line first: under 640px the dialog is a full-screen sheet and ten cards push the end off-screen. */}
      <div className="mt-4 grid gap-3" aria-live="polite">
        {picked && (
          <p className="text-sm font-semibold text-ink">
            {L.confirm.split(/(\{name\}|\{code\})/).map((part, i) => slot(part, picked, i))}
          </p>
        )}
        {link.isError && <FormAlert>{linkFamilyErrorText(link.error)}</FormAlert>}
        {path && answer.isError && <FormAlert>{searchErrorText(answer.error)}</FormAlert>}
        {path && answer.data && (
          <RegistrationMatches
            view={answer.data}
            by="name"
            onPick={pick}
            picked={picked?.code ?? null}
          />
        )}
      </div>
    </Dialog>
  );
}
