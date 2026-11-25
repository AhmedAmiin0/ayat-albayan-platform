import { useMutation, useQuery } from '@tanstack/react-query';
import { LanguageSwitch } from '@ab/web-kit/components/shell/LanguageSwitch';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { Logo } from '@ab/web-kit/components/ui/display/mark';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ClassroomRoom } from '@ab/web-kit/classroom/room/components/ClassroomRoom';
import { classroomErrorText } from '@ab/web-kit/classroom/room/livekit/errors';
import { joinByStudentLink, studentLinkView } from '@/features/teaching/classroom/api/meetings-api';
import type { RoomClient } from '@ab/web-kit/classroom/room/components/room-types';
import { StudentLessonPanel } from './StudentLessonPanel';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { classroomKeys } from '@/features/teaching/classroom/api/classroom.keys';

const REFRESH_MS = 30_000;

/** No login or shell; join enables only while the room is open, re-read every 30 seconds. */
export function StudentLinkPage({ token, make }: { token: string; make?: () => RoomClient }) {
  const now = useNow(REFRESH_MS);
  const view = useQuery({
    queryKey: classroomKeys.studentLink(token),
    queryFn: () => studentLinkView(token),
    refetchInterval: REFRESH_MS,
    retry: false,
  });
  const join = useMutation({ mutationFn: joinByStudentLink });

  if (join.data)
    return <ClassroomRoom join={join.data} {...(make && { make })} onRejoin={() => join.reset()} />;
  const data = view.data;
  return (
    <main className="min-h-dvh bg-page px-4 py-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-[520px] gap-5">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <LanguageSwitch />
        </div>
        {view.isPending && <p className="text-ink-3">{t.common.loading}</p>}
        {view.isError && <FormAlert>{classroomErrorText(view.error)}</FormAlert>}
        {data && (
          <Cartouche>{t.studentLink.page.greeting.replace('{name}', data.first_name)}</Cartouche>
        )}
        {data && !data.lesson && <p className="text-body text-ink-2">{t.studentLink.page.none}</p>}
        {data?.lesson && (
          <StudentLessonPanel
            lesson={data.lesson}
            firstName={data.first_name}
            now={now}
            pending={join.isPending}
            error={join.error}
            onJoin={(name) => join.mutate({ token, ...(name && { name }) })}
          />
        )}
      </div>
    </main>
  );
}
