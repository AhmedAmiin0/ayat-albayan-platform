import { useMutation } from '@tanstack/react-query';
import { Button, FormAlert, MoreMenu, t } from '@ab/web-kit';
import { classroomErrorText, copyStudentLink } from '@/features/teaching/classroom';

/** Room mode only (docs/48); the result shows under the head because the menu closes on pick. */
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
