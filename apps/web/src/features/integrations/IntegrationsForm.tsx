import { INTEGRATION_GROUPS, type IntegrationConfigItem } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { integrationsQuery, putIntegrationValues } from './integrations-api';
import { changesOf, draftOf, invalidKeys, matchesIntegration, type IntegrationDraft } from './integrations-form';
import { IntegrationGroup } from './IntegrationGroup';

const s = t.integrations;

interface FormProps {
  items: IntegrationConfigItem[];
  query: string;
  onNote: (message: string) => void;
}

/** The groups and the plain values' own «حفظ التكاملات» (secrets save row by row). */
export function IntegrationsForm({ items, query, onNote }: FormProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<IntegrationDraft>(() => draftOf(items));
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const save = useMutation({
    mutationFn: putIntegrationValues,
    onSuccess: (data) => {
      queryClient.setQueryData(integrationsQuery.queryKey, data);
      setDraft(draftOf(data));
      onNote(s.saved);
    },
  });
  const changes = changesOf(items, draft);
  const submit = () => {
    const bad = invalidKeys(changes);
    setInvalid(new Set(bad));
    if (bad.length === 0 && Object.keys(changes).length > 0) save.mutate(changes);
  };
  const shown = items.filter((i) => matchesIntegration(i.key, query));
  return (
    <>
      {INTEGRATION_GROUPS.map((group) => {
        const rows = shown.filter((i) => i.group === group);
        if (rows.length === 0) return null;
        return <IntegrationGroup key={group} group={group} items={rows} draft={draft} invalid={invalid} onDraft={setDraft} onNote={onNote} />;
      })}
      {save.isError && <FormAlert>{t.common.error}</FormAlert>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-3">{s.clearHint}</p>
        <Button type="button" variant="secondary" disabled={save.isPending || Object.keys(changes).length === 0} onClick={submit}>
          {save.isPending ? t.common.saving : s.saveValues}
        </Button>
      </div>
    </>
  );
}
