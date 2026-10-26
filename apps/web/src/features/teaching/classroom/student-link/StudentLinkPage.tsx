import { useMutation, useQuery } from '@tanstack/react-query';
import { LanguageSwitch } from '@/components/shell/account/LanguageSwitch';
import { Cartouche } from '@/components/ui/display/cartouche';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Logo } from '@/components/ui/display/mark';
import { t } from '@/lib/i18n/i18n';
import { ClassroomRoom } from '../room/components/ClassroomRoom';
import { classroomErrorText } from '../room/livekit/errors';
import { joinByStudentLink, studentLinkView } from '../api/meetings-api';
import type { RoomClient } from '../room/components/room-types';
import { StudentLessonPanel } from './StudentLessonPanel';
import { useNow } from '../sessions/use-now';

const REFRESH_MS = 30_000;

/**
 * /s/:token — the student's own long-lived link (no login, no app shell): «حلقتك القادمة …» with a
 * big «ادخل الحلقة», enabled only while the room is open (re-read every 30 seconds, so it turns on by
 * itself), then the same guest classroom as a one-lesson link.
 */
export function StudentLinkPage({ token, make }: { token: string; make?: () => RoomClient }) {
  const now = useNow(REFRESH_MS);
  const view = useQuery({ queryKey: ['studentLink', token], queryFn: () => studentLinkView(token), refetchInterval: REFRESH_MS, retry: false });
  const join = useMutation({ mutationFn: joinByStudentLink });

  if (join.data) return <ClassroomRoom join={join.data} {...(make && { make })} onRejoin={() => join.reset()} />;
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
        {data && <Cartouche>{t.studentLink.page.greeting.replace('{name}', data.first_name)}</Cartouche>}
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
