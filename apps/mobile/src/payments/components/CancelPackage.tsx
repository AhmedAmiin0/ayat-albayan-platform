import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { Field } from '@/core/ui/form/Field';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { type, useTheme } from '@/theme';

type CancelBody = { reason?: string };

interface CancelPackageProps {
  /** POST /subscriptions/:id/cancel (admin) or POST /sales/subscriptions/:id/cancel (her own student's). */
  cancel: (body: CancelBody) => Promise<unknown>;
  /** The reads a cancel makes stale (the balance, the list, her family's owed packages). */
  stale: readonly QueryKey[];
  onDone?: () => void;
}

const messages: Record<string, string | undefined> = t.subscriptions.cancel.errors;

/** The API's 409 / 403 / 404 code in Arabic; anything else is the generic error. */
function cancelErrorText(error: unknown): string {
  const body: unknown = error instanceof ApiError ? error.body : null;
  const code = typeof body === 'object' && body !== null && 'code' in body ? body.code : undefined;
  return (typeof code === 'string' ? messages[code] : undefined) ?? t.common.error;
}

/**
 * «إلغاء الباقة» (owner 2026-10-28): a package made by mistake is cancelled, never deleted. The button opens
 * the confirm (what it means, an optional reason); the API refuses a package with money or lessons.
 */
export function CancelPackage({ cancel, stale, onDone }: CancelPackageProps) {
  const client = useQueryClient();
  const { color } = useTheme();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const c = t.subscriptions.cancel;
  const run = useMutation({
    mutationFn: cancel,
    onSuccess: async () => {
      await Promise.all(stale.map((queryKey) => client.invalidateQueries({ queryKey })));
      setOpen(false);
      onDone?.();
    },
  });
  if (!open) return <Button variant="danger" label={c.action} onPress={() => setOpen(true)} />;
  const text = reason.trim();
  return (
    <View style={{ gap: 10 }}>
      <Field label={c.reason} value={reason} maxLength={500} onChangeText={setReason} />
      {run.isError ? (
        <AppText accessibilityRole="alert" style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.bad }}>
          {cancelErrorText(run.error)}
        </AppText>
      ) : null}
      <InlineConfirm
        message={c.body}
        confirmLabel={run.isPending ? t.common.saving : c.confirm}
        cancelLabel={t.common.back}
        busy={run.isPending}
        onConfirm={() => (run.isPending ? undefined : run.mutate(text ? { reason: text } : {}))}
        onCancel={() => setOpen(false)}
      />
    </View>
  );
}
