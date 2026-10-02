import { TEMPLATE_KEYS } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Select } from '@/components/ui/select';
import { templatesQuery } from '@/features/templates/api';
import { t } from '@/lib/i18n';
import { sendTemplate } from './api';
import { TemplateParamFields } from './TemplateParamFields';
import { missingParams, prefillParams, toParamsInput, type ParamValues, type PrefillContext } from './template-params';
import { sendErrorText } from './TextComposer';

const NAMES: Record<string, string | undefined> = t.templates.names;

/**
 * Any approved template, from the thread (H4): the only way to write after the 24 h window.
 * Variables are prefilled from what the thread knows; the preview is what the guardian reads.
 */
export function TemplateComposer({ phone, context }: { phone: string; context: PrefillContext }) {
  const queryClient = useQueryClient();
  const templates = useQuery(templatesQuery);
  const approved = (templates.data ?? []).filter((x) => x.status === 'approved');
  const [key, setKey] = useState('');
  const [values, setValues] = useState<ParamValues>({});
  const [tried, setTried] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const tpl = approved.find((x) => x.key === key);
  const send = useMutation({
    mutationFn: sendTemplate,
    onSuccess: async () => {
      setKey('');
      setValues({});
      setTried(false);
      requestId.current = crypto.randomUUID();
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
  const pick = (next: string) => {
    const chosen = approved.find((x) => x.key === next);
    setKey(next);
    setValues(chosen ? prefillParams(chosen, context) : {});
    setTried(false);
    requestId.current = crypto.randomUUID();
  };
  const missing = tpl && tried ? missingParams(tpl, values) : [];

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        const known = TEMPLATE_KEYS.find((k) => k === tpl?.key);
        if (!tpl || !known || missingParams(tpl, values).length > 0) return;
        send.mutate({ phone, key: known, params: toParamsInput(tpl, values), clientRequestId: requestId.current });
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
      {tpl && <TemplateParamFields template={tpl} values={values} missing={missing} onChange={setValues} />}
      {send.isError && <FormAlert>{sendErrorText(send.error)}</FormAlert>}
      <div className="flex justify-end">
        <Button type="submit" disabled={!tpl || send.isPending}>
          {send.isPending ? t.inbox.composer.sending : t.inbox.composer.sendTemplate}
        </Button>
      </div>
    </form>
  );
}
