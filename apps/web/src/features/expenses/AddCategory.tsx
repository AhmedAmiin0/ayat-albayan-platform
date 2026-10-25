import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { MONEY_KEY } from '@/features/subscriptions/api';
import { apiErrorText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n/i18n';
import { addCategory } from './api';

/** «إضافة بند»: the admin adds an expense category (Arabic name + a latin key), chosen right away. */
export function AddCategory({ onAdded }: { onAdded: (key: string) => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [labelAr, setLabelAr] = useState('');
  const [key, setKey] = useState('');
  const add = useMutation({
    mutationFn: addCategory,
    onSuccess: async (c) => {
      await queryClient.invalidateQueries({ queryKey: [...MONEY_KEY, 'expense-categories'] });
      onAdded(c.key);
      setOpen(false);
    },
  });
  if (!open)
    return (
      <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => setOpen(true)}>
        {t.finance.addCategory}
      </Button>
    );
  return (
    <div className="grid gap-3 rounded-md border border-rule p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <Field label={t.finance.categoryName}>{(p) => <Input {...p} value={labelAr} onChange={(e) => setLabelAr(e.target.value)} />}</Field>
      <Field label={t.finance.categoryKey} hint={t.finance.categoryKeyHint}>
        {(p) => <Input {...p} dir="ltr" value={key} onChange={(e) => setKey(e.target.value.trim().toLowerCase())} />}
      </Field>
      <Button type="button" variant="secondary" disabled={add.isPending || !labelAr.trim() || !key} onClick={() => add.mutate({ key, labelAr: labelAr.trim() })}>
        {t.common.add}
      </Button>
      {add.isError && <FormAlert className="sm:col-span-3">{apiErrorText(add.error, t.finance.error)}</FormAlert>}
    </div>
  );
}
