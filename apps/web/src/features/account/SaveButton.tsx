import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

/** «حفظ» of one section: secondary (no filled primary on this screen), «جاري الحفظ…» while pending. */
export function SaveButton({ pending, disabled }: { pending: boolean; disabled?: boolean }) {
  return (
    <Button type="submit" variant="secondary" disabled={pending || disabled} aria-busy={pending || undefined} className="justify-self-start">
      {pending ? t.account.saving : t.account.save}
    </Button>
  );
}
