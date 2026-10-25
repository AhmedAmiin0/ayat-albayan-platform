import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n';
import { issueStudentLink } from './meetings-api';

async function issue(studentId: string): Promise<string> {
  const { url } = await issueStudentLink(studentId);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Clipboard blocked (http, old browser): the URL is still shown below to copy by hand.
  }
  return url;
}

/**
 * «رابط دخول الطالب» on the student profile (admin): the student's long-lived classroom link,
 * created (or replaced: only its hash is kept, so it cannot be shown again) and copied, like «انسخ رابط الطالب».
 */
export function StudentJoinLink({ studentId }: { studentId: string }) {
  const make = useMutation({ mutationFn: issue });
  return (
    <section aria-label={t.studentLink.title} className="mb-6 grid gap-2 rounded-lg border border-rule bg-sunk p-3">
      <div>
        <h3 className="font-display text-h4 font-bold">{t.studentLink.title}</h3>
        <p className="text-xs text-ink-3">{t.studentLink.hint}</p>
      </div>
      <Button type="button" variant="secondary" className="justify-self-start" disabled={make.isPending} onClick={() => make.mutate(studentId)}>
        {make.isPending ? t.studentLink.creating : t.studentLink.create}
      </Button>
      {make.data && (
        <div role="status" className="grid gap-1">
          <p className="text-xs text-ink-2">{t.studentLink.copied}</p>
          <input readOnly dir="ltr" value={make.data} aria-label={t.studentLink.shown} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-md border border-rule bg-raised px-2 py-1 text-xs" />
        </div>
      )}
      {make.isError && <FormAlert>{t.studentLink.error}</FormAlert>}
    </section>
  );
}
