import { isOpenLesson, type LessonView } from '@ab/schedule';
import { useMutation } from '@tanstack/react-query';
import { Button, FormAlert, t, copyJoinLinkUrl, classroomErrorText } from '@ab/web-kit';

/** A fresh guest link, copied to the clipboard when allowed; the URL either way. */
export async function copyStudentLink(lessonId: string): Promise<string> {
  const { url } = await copyJoinLinkUrl(lessonId);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Clipboard blocked (http, old browser): the URL is still shown below to copy by hand.
  }
  return url;
}

/** A fresh guest link copied and shown, no WhatsApp needed; full width (docs/07). */
export function CopyLinkButton({ lesson }: { lesson: Pick<LessonView, 'id' | 'status'> }) {
  const make = useMutation({ mutationFn: copyStudentLink });
  if (!isOpenLesson(lesson.status)) return null;
  return (
    <div className="grid gap-1.5">
      <Button type="button" variant="secondary" disabled={make.isPending} onClick={() => make.mutate(lesson.id)}>
        {make.isPending ? t.classroom.copying : t.classroom.copyLink}
      </Button>
      {make.data && (
        <div role="status" className="grid gap-1">
          <p className="text-xs text-ink-2">{t.classroom.copied}</p>
          <input readOnly dir="ltr" value={make.data} aria-label={t.classroom.linkShown} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-md border border-rule bg-raised px-2 py-1 text-xs" />
          <p className="text-xs text-ink-3">{t.classroom.linkWindow}</p>
        </div>
      )}
      {make.isError && <FormAlert>{classroomErrorText(make.error)}</FormAlert>}
    </div>
  );
}
