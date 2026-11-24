import { guestJoinSchema, type RoomJoinResult } from '@ab/schedule';
import type { ClockCycle } from '@ab/time';
import { useMutation } from '@tanstack/react-query';
import { useState, type SubmitEvent } from 'react';
import { LanguageSwitch } from '@ab/web-kit/components/shell/LanguageSwitch';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { Logo } from '@ab/web-kit/components/ui/display/mark';
import { useClock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { joinAsGuest } from '@ab/web-kit/classroom/api/api';
import { ClassroomRoom } from '@ab/web-kit/classroom/room/components/ClassroomRoom';
import { classroomErrorText, opensAtOf } from '@ab/web-kit/classroom/room/livekit/errors';
import { RecordedNotice } from '@ab/web-kit/classroom/recordings/RecordedNotice';
import type { RoomClient } from '@ab/web-kit/classroom/room/components/room-types';
import { opensAtText } from '@ab/web-kit/classroom/room/livekit/window-hint';

/** A 403 with opens_at says when it opens; every other code has its own line. */
function problemText(error: unknown, cycle: ClockCycle): string {
  const opens = opensAtOf(error);
  return opens ? opensAtText(opens, cycle) : classroomErrorText(error);
}

interface Props {
  linkToken: string;
  make?: () => RoomClient;
  /** The public join call: the lesson link's by default, an internal meeting's (/m/:token) otherwise. */
  joinWith?: NamedJoin;
  /** Heading and intro; the lesson's words by default. */
  title?: string;
  intro?: string;
  /** A refused join in the page's own words (a meeting's, meetingJoinProblem); the lesson's by default. */
  problem?: (error: unknown) => string;
  /** The link names its student (the family app's signed link): no name step, the API takes theirs. */
  knownStudent?: boolean;
}

/** A join with the name typed on the page (the lesson link's, a meeting's). */
type NamedJoin = (input: { linkToken: string; name: string }) => Promise<RoomJoinResult>;
type Send = () => Promise<RoomJoinResult>;

interface SendInput {
  known: boolean;
  linkToken: string;
  name: string;
  joinWith: NamedJoin;
}

/** The call the form makes: no name when the link names its student; null = no name typed. */
function sendFor({ known, linkToken, name, joinWith }: SendInput): Send | null {
  if (known) return () => joinAsGuest({ linkToken });
  const parsed = guestJoinSchema.safeParse({ name });
  return parsed.success ? () => joinWith({ linkToken, name: parsed.data.name }) : null;
}

/** No login or app shell; the family app's link already names the student. */
export function GuestJoinPage(props: Props) {
  const known = props.knownStudent === true;
  const words = known ? t.classroom.guest.introKnown : t.classroom.guest.intro;
  const { linkToken, make, joinWith = joinAsGuest, title = t.classroom.guest.title, intro = words, problem } = props;
  const { cycle } = useClock();
  const problemOf = problem ?? ((e: unknown) => problemText(e, cycle));
  const [name, setName] = useState('');
  const [missing, setMissing] = useState(false);
  const join = useMutation({ mutationFn: (send: Send) => send() });

  if (join.data) {
    return <ClassroomRoom join={join.data} {...(make && { make })} onRejoin={() => join.reset()} />;
  }
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const send = sendFor({ known, linkToken, name, joinWith });
    setMissing(send === null);
    if (send) join.mutate(send);
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
        {known ? null : (
          <Field label={t.classroom.guest.name} required {...(missing && { error: t.common.required })}>
            {(p) => (
              <Input {...p} value={name} maxLength={30} autoComplete="off" placeholder={t.classroom.guest.namePlaceholder} onChange={(e) => setName(e.target.value)} />
            )}
          </Field>
        )}
        {join.isError && <FormAlert>{problemOf(join.error)}</FormAlert>}
        <RecordedNotice />
        <Button type="submit" size="lg" disabled={join.isPending}>
          {join.isPending ? t.classroom.joining : t.classroom.guest.join}
        </Button>
      </form>
    </main>
  );
}
