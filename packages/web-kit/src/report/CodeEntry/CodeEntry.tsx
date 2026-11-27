import { LOGIN_CODE_LENGTH } from '@ab/shared';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { Input } from '@ab/web-kit/components/ui/form/Input';
import { Label } from '@ab/web-kit/components/ui/form/Label';
import { gateProblem } from '@ab/web-kit/report/public-api';
import type { CodeEntryProps } from './CodeEntry.types';
import { useCodeEntry } from './use-code-entry';

/** The six digits from WhatsApp; a right code calls onVerified, a wrong one says so. */
export function CodeEntry({ publicId, onVerified }: CodeEntryProps) {
  const { g, code, setCode, verify } = useCodeEntry({ onVerified });
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
