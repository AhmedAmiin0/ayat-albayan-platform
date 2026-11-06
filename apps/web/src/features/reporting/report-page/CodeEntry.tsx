import { LOGIN_CODE_LENGTH } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { Label } from '@/components/ui/form/label';
import { t } from '@/lib/i18n/i18n';
import { gateProblem, verifyCode } from './public-api';

/** The six digits from WhatsApp; a right code calls onVerified, a wrong one says so. */
export function CodeEntry({ publicId, onVerified }: { publicId: string; onVerified: () => void }) {
  const g = t.reportPage.gate;
  const [code, setCode] = useState('');
  const verify = useMutation({ mutationFn: verifyCode, onSuccess: onVerified });
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        verify.mutate({ publicId, code });
      }}
    >
      <p className="text-sm text-ink-2">{g.sent}</p>
      <Label htmlFor="report-code">{g.code}</Label>
      <Input
        id="report-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={LOGIN_CODE_LENGTH + 4}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      {verify.isError && <FormAlert>{g[gateProblem(verify.error)]}</FormAlert>}
      <Button
        type="submit"
        className="justify-self-start"
        disabled={verify.isPending || code.trim() === ''}
      >
        {g.verify}
      </Button>
    </form>
  );
}
