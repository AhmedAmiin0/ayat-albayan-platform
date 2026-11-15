import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { MoreMenu } from '@/components/ui/overlay/more-menu';
import { classroomErrorText, copyStudentLink } from '@/features/teaching/classroom';
import { t } from '@/lib/i18n/i18n';

/**
 * «المزيد» → «انسخ رابط الطالب» (docs/48, room mode only). The menu closes on the pick, so the
 * result (copied, the link to copy by hand, or the error) shows under the head, outside the menu.
 */
export function CopyStudentLink({ lessonId }: { lessonId: string }) {
  const make = useMutation({ mutationFn: copyStudentLink });
  return (
    <div className="grid justify-items-end gap-1.5">
      <MoreMenu>
        <Button
          type="button"
          variant="ghost"
          disabled={make.isPending}
          onClick={() => make.mutate(lessonId)}
        >
          {make.isPending ? t.classroom.copying : t.classroom.copyLink}
        </Button>
      </MoreMenu>
      {make.data && (
        <div role="status" className="grid gap-1">
          <p className="text-xs text-ink-2">{t.classroom.copied}</p>
          <input
            readOnly
            dir="ltr"
            value={make.data}
            aria-label={t.classroom.linkShown}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-md border border-rule bg-raised px-2 py-1 text-xs"
          />
        </div>
      )}
      {make.isError && <FormAlert>{classroomErrorText(make.error)}</FormAlert>}
    </div>
  );
}
