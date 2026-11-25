import { useState } from 'react';
import { SwitchTrack, switchInputClass } from '@/components/settings/fields/SwitchTrack';
import { Button, FormAlert, t } from '@ab/web-kit';
import { testFlagError, type TestFlagTarget } from './test-flag.api';
import { useSetTestFlag } from './use-test-flag';

const T = t.testAccounts;
const LABEL: Readonly<Record<TestFlagTarget, string>> = {
  user: T.userSwitch,
  student: T.studentSwitch,
};

export interface TestFlagSwitchProps {
  target: TestFlagTarget;
  /** The login or student: its id and its is_test (absent = real). */
  row: { id: string; is_test?: boolean };
  /** The caller's write permission: without it nothing is shown. */
  enabled?: boolean;
}

/** docs/56: the whole family changes; a 409 means it would mix test and real accounts. */
export function TestFlagSwitch({ target, row, enabled = true }: TestFlagSwitchProps) {
  const [asked, setAsked] = useState<boolean | null>(null);
  const save = useSetTestFlag();
  const settled = { onSettled: () => setAsked(null) };
  const confirm = (next: boolean) => save.mutate({ target, id: row.id, isTest: next }, settled);
  const shown = asked ?? row.is_test === true;
  if (!enabled) return null;
  return (
    <div className="grid gap-2">
      <label className="inline-flex min-h-11 items-center gap-3 text-sm text-ink sm:min-h-0">
        <span className="relative inline-flex items-center">
          <input
            type="checkbox"
            role="switch"
            checked={shown}
            aria-checked={shown}
            disabled={save.isPending}
            onChange={(e) => setAsked(e.target.checked)}
            className={switchInputClass}
          />
          <SwitchTrack />
        </span>
        {LABEL[target]}
      </label>
      <p className="text-xs text-ink-3">{T.hint}</p>
      {asked !== null && (
        <TestFlagConfirm
          on={asked}
          pending={save.isPending}
          onConfirm={confirm}
          onCancel={() => setAsked(null)}
        />
      )}
      {save.isError && <FormAlert>{testFlagError(save.error)}</FormAlert>}
    </div>
  );
}

interface ConfirmProps {
  on: boolean;
  pending: boolean;
  onConfirm: (next: boolean) => void;
  onCancel: () => void;
}

function TestFlagConfirm({ on, pending, onConfirm, onCancel }: ConfirmProps) {
  return (
    <div role="alertdialog" aria-label={T.chip} className="grid gap-2 rounded-md border border-rule p-3">
      <p className="text-sm text-ink">{on ? T.confirmOn : T.confirmOff}</p>
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => onConfirm(on)}>
          {T.confirm}
        </Button>
        <Button size="sm" variant="secondary" data-autofocus onClick={onCancel}>
          {T.cancel}
        </Button>
      </div>
    </div>
  );
}
