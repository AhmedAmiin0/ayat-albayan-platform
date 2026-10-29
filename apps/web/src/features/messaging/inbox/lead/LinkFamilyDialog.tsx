import { formatPhone, type RegistrationCheckView, type RegistrationMatch } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Ltr } from '@/components/ui/display/ltr';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { Dialog } from '@/components/ui/overlay/dialog';
import { checkRequest, RegistrationMatches } from '@/features/sales/sales';
import { apiFetch } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { linkedText, linkFamily, linkFamilyErrorText, refreshAfterLink, searchErrorText } from './link-family';

const L = t.inbox.linkFamily;
const R = t.registrationCheck;

interface LinkFamilyDialogProps {
  /** The chat's lead (ThreadView.lead_id). */
  leadId: string;
  /** The chat's number, shown under the title: on a phone the dialog covers the chat. */
  phone: string;
  onClose: () => void;
  /** After the link: «رُبط الرقم…» or «مرتبط… من قبل». The caller closes the dialog and shows the text. */
  onDone: (text: string) => void;
}

/** One slot of «ربط الرقم بعائلة {name} ({code})؟»: the name and the code are bidi islands, so a Latin name never pulls the brackets. */
function slot(part: string, m: RegistrationMatch, key: number): ReactNode {
  if (part === '{name}') return <bdi key={key}>{m.name}</bdi>;
  if (part === '{code}') return <Ltr key={key}>{m.code}</Ltr>;
  return part;
}

/**
 * «ربط بطالب موجود» (owner 2026-10-29): find the child by name or code (GET /sales/registration-check, the
 * same answer as «التحقق من التسجيل»: name, code, status, teacher), pick one, confirm, and this chat's number
 * becomes the family's second number. The lead's follow-up owner does not change; nothing is sent to anyone.
 */
export function LinkFamilyDialog({ leadId, phone, onClose, onDone }: LinkFamilyDialogProps) {
  const formId = useId();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [picked, setPicked] = useState<RegistrationMatch | null>(null);
  const answer = useQuery({
    queryKey: ['sales', 'registration-check', path ?? ''],
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
  // No pick: the footer offers «بحث» again (an edited name is searched before anything is linked).
  const pick = (m: RegistrationMatch | null) => {
    setPicked(m);
    link.reset();
  };
  const search = (e: FormEvent) => {
    e.preventDefault();
    const r = checkRequest('name', query);
    setInvalid(r.ok ? null : R.error[r.code]);
    setPath(r.ok ? r.path : null);
    pick(null);
  };
  const action = picked ? (
    <Button type="button" disabled={link.isPending} onClick={() => link.mutate({ leadId, code: picked.code })}>
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
        {picked && <p className="text-sm font-semibold text-ink">{L.confirm.split(/(\{name\}|\{code\})/).map((part, i) => slot(part, picked, i))}</p>}
        {link.isError && <FormAlert>{linkFamilyErrorText(link.error)}</FormAlert>}
        {path && answer.isError && <FormAlert>{searchErrorText(answer.error)}</FormAlert>}
        {path && answer.data && <RegistrationMatches view={answer.data} by="name" onPick={pick} picked={picked?.code ?? null} />}
      </div>
    </Dialog>
  );
}
