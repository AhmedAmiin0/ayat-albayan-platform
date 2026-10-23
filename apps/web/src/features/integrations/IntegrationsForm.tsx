import { INTEGRATION_GROUPS, type IntegrationConfigItem } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ConfirmSwitchDialog } from '@/components/settings/ConfirmSwitchDialog';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { sendGateQuery } from '../messaging/api';
import { integrationsQuery, putIntegrationValues } from './integrations-api';
import { changesOf, draftOf, emptiesAllowList, invalidKeys, matchesIntegration, type IntegrationDraft } from './integrations-form';
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
  const [confirming, setConfirming] = useState(false);
  const save = useMutation({
    mutationFn: putIntegrationValues,
    onSuccess: (data) => {
      queryClient.setQueryData(integrationsQuery.queryKey, data);
      setDraft(draftOf(data));
      setConfirming(false);
      onNote(s.saved);
      // The chip and the gate note read GET /messages/gate (configured? allow-list?): ask again.
      void queryClient.invalidateQueries({ queryKey: sendGateQuery.queryKey });
    },
  });
  const changes = changesOf(items, draft);
  const submit = () => {
    const bad = invalidKeys(changes);
    setInvalid(new Set(bad));
    if (bad.length > 0 || Object.keys(changes).length === 0) return;
    if (emptiesAllowList(changes)) {
      save.reset(); // an earlier failure must not greet the new question
      setConfirming(true);
    }
    else save.mutate(changes);
  };
  const shown = items.filter((i) => matchesIntegration(i.key, query));
  return (
    <>
      {INTEGRATION_GROUPS.map((group) => {
        const rows = shown.filter((i) => i.group === group);
        if (rows.length === 0) return null;
        return <IntegrationGroup key={group} group={group} items={rows} draft={draft} invalid={invalid} onDraft={setDraft} onNote={onNote} />;
      })}
      {save.isError && !confirming && <FormAlert>{t.common.error}</FormAlert>}
      {confirming && (
        <ConfirmSwitchDialog
          title={s.allowListEmptyTitle}
          description={s.allowListEmptyConfirm}
          yes={s.allowListEmptyYes}
          onYes={() => save.mutate(changes)}
          onClose={() => setConfirming(false)}
          pending={save.isPending}
          failed={save.isError}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-3">{s.clearHint}</p>
        <Button type="button" variant="secondary" disabled={save.isPending || Object.keys(changes).length === 0} onClick={submit}>
          {save.isPending ? t.common.saving : s.saveValues}
        </Button>
      </div>
    </>
  );
}
