import { guestJoinSchema, type ClockCycle } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useState, type SubmitEvent } from 'react';
import { LanguageSwitch } from '@/components/shell/account/LanguageSwitch';
import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { Logo } from '@/components/ui/display/mark';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { joinAsGuest } from '@/features/teaching/classroom/api/api';
import { ClassroomRoom } from '@/features/teaching/classroom/room/components/ClassroomRoom';
import { classroomErrorText, opensAtOf } from '@/features/teaching/classroom/room/livekit/errors';
import { RecordedNotice } from '@/features/teaching/classroom/recordings/RecordedNotice';
import type { RoomClient } from '@/features/teaching/classroom/room/components/room-types';
import { opensAtText } from '@/features/teaching/classroom/room/livekit/window-hint';

/** A 403 with opens_at reads «بتفتح الساعة …»; every other code has its own line. */
function problemText(error: unknown, cycle: ClockCycle): string {
  const opens = opensAtOf(error);
  return opens ? opensAtText(opens, cycle) : classroomErrorText(error);
}

interface Props {
  linkToken: string;
  make?: () => RoomClient;
  /** The public join call: the lesson link's by default, an internal meeting's (/m/:token) otherwise. */
  joinWith?: typeof joinAsGuest;
  /** Heading and intro; the lesson's words by default. */
  title?: string;
  intro?: string;
  /** A refused join in the page's own words (a meeting's, meetingJoinProblem); the lesson's by default. */
  problem?: (error: unknown) => string;
}

/** /join/:linkToken for a student or guardian (and /m/:token for a meeting): a name, then the room. No login, no app shell. */
export function GuestJoinPage(props: Props) {
  const { linkToken, make, joinWith = joinAsGuest, title = t.classroom.guest.title, intro = t.classroom.guest.intro, problem } = props;
  const { cycle } = useClock();
  const problemOf = problem ?? ((e: unknown) => problemText(e, cycle));
  const [name, setName] = useState('');
  const [missing, setMissing] = useState(false);
  const join = useMutation({ mutationFn: joinWith });

  if (join.data) {
    return <ClassroomRoom join={join.data} {...(make && { make })} onRejoin={() => join.reset()} />;
  }
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const parsed = guestJoinSchema.safeParse({ name });
    setMissing(!parsed.success);
    if (parsed.success) join.mutate({ linkToken, name: parsed.data.name });
  };
  return (
    <main className="min-h-dvh bg-page px-4 py-6 sm:py-10">
      <form onSubmit={submit} noValidate className="mx-auto grid w-full max-w-[520px] gap-5">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <LanguageSwitch />
        </div>
        <Cartouche>{title}</Cartouche>
        <p className="text-body text-ink-2">{intro}</p>
        <Field label={t.classroom.guest.name} required {...(missing && { error: t.common.required })}>
          {(p) => (
            <Input {...p} value={name} maxLength={30} autoComplete="off" placeholder={t.classroom.guest.namePlaceholder} onChange={(e) => setName(e.target.value)} />
          )}
        </Field>
        {join.isError && <FormAlert>{problemOf(join.error)}</FormAlert>}
        <RecordedNotice />
        <Button type="submit" size="lg" disabled={join.isPending}>
          {join.isPending ? t.classroom.joining : t.classroom.guest.join}
        </Button>
      </form>
    </main>
  );
}
