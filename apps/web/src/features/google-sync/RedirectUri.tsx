import { useId } from 'react';
import { Input } from '@/components/ui/form/input';
import { Label } from '@/components/ui/form/label';
import { t } from '@/lib/i18n';

/** The OAuth redirect URI, read-only: one tap selects it all so the owner can copy it into Google Cloud. */
export function RedirectUri({ uri }: { uri: string }) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{t.googleSync.connection.redirect}</Label>
      <Input id={id} readOnly dir="ltr" value={uri} onFocus={(e) => e.currentTarget.select()} className="font-mono" />
    </div>
  );
}
