import { Button, t } from '@ab/web-kit';

/** Secondary, because this screen has no filled primary. */
export function SaveButton({ pending, disabled }: { pending: boolean; disabled?: boolean }) {
  return (
    <Button type="submit" variant="secondary" disabled={pending || disabled} aria-busy={pending || undefined} className="justify-self-start">
      {pending ? t.account.saving : t.account.save}
    </Button>
  );
}
