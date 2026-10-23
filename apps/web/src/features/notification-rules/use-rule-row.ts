import type { NotificationEntryView, NotificationRuleView, NotificationsOverview, RulePatchInput } from '@ab/shared';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { CONFIG_QUERY_KEYS } from '@/lib/query-keys';
import { CATALOGUE_QUERY_KEY } from '../notification-catalogue/catalogue-api';
import { draftOf, draftResult, isDirty, type DraftResult, type RuleDraft } from './rule-draft';
import { numberName, useRules } from './rules-context';
import { patchRule, ruleFailure, type RuleFailure } from './rules-api';

export interface SwitchInput {
  on: boolean;
  /** An essential row's OFF: the typed word (ESSENTIAL_OFF_TEXT). */
  confirmText?: string;
  /** After the save landed (closes the dialog). */
  onDone?: () => void;
}

export interface RuleRowState {
  rule: NotificationRuleView;
  draft: RuleDraft;
  set: (patch: Partial<RuleDraft>) => void;
  result: DraftResult;
  dirty: boolean;
  revert: () => void;
  /** One PATCH with only the changed fields (nothing when the draft does not parse); onDone after it lands. */
  save: (onDone?: () => void) => void;
  /** The switch: one PATCH { enabled } (+ confirmText), saved at once. */
  setEnabled: (input: SwitchInput) => void;
  saving: boolean;
  failure: RuleFailure | null;
}

const isEntry = (v: unknown): v is NotificationEntryView => typeof v === 'object' && v !== null && 'key' in v && 'audience' in v;

/** The answer replaces the row in every cached catalogue, then the catalogue and the settings refetch. */
function afterSave(client: QueryClient, updated: unknown) {
  if (isEntry(updated)) {
    client.setQueriesData<NotificationsOverview>({ queryKey: CATALOGUE_QUERY_KEY }, (old) =>
      old ? { ...old, entries: old.entries.map((e) => (e.key === updated.key ? updated : e)) } : old,
    );
  }
  void client.invalidateQueries({ queryKey: CATALOGUE_QUERY_KEY });
  void client.invalidateQueries({ queryKey: CONFIG_QUERY_KEYS.settings });
}

/** One editable row of «الإشعارات»: its draft, its per-row save and its switch (docs/26b §3). */
export function useRuleRow(rule: NotificationRuleView): RuleRowState {
  const api = useRules();
  const client = useQueryClient();
  const [edits, setEdits] = useState<RuleDraft | null>(null);
  const [failure, setFailure] = useState<RuleFailure | null>(null);
  const mutation = useMutation({ mutationFn: patchRule });
  const draft = edits ?? draftOf(rule);
  const result = draftResult({ rule, draft, numberName: (id) => numberName(api.numbers, id) });
  const send = (body: RulePatchInput, onDone?: () => void) => {
    setFailure(null);
    mutation.mutate(
      { key: rule.key, body },
      {
        onSuccess: (updated) => {
          afterSave(client, updated);
          if (!('enabled' in body)) setEdits(null);
          api.onSaved(t.notificationRules.saved);
          onDone?.();
        },
        onError: (error) => setFailure(ruleFailure(error)),
      },
    );
  };
  return {
    rule,
    draft,
    set: (patch) => setEdits({ ...draft, ...patch }),
    result,
    dirty: edits !== null && isDirty(result),
    revert: () => {
      setEdits(null);
      setFailure(null);
    },
    save: (onDone) => {
      if (result.ok && result.changes.length > 0) send(result.patch, onDone);
      else if (result.ok) onDone?.();
    },
    setEnabled: ({ on, confirmText, onDone }) => send(confirmText === undefined ? { enabled: on } : { enabled: on, confirmText }, onDone),
    saving: mutation.isPending,
    failure,
  };
}
