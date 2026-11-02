// Test fixtures of the max-duration job (not shipped; excluded from the build by *.fakes.ts).
import { vi } from 'vitest';
import type { AuditService } from '@/common/audit/audit.service';
import { CONFIG } from '@/modules/teaching/classroom/classroom.fakes';
import type { InternalMeetingsRepo } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.repo';
import type { FetchLike } from '@/common/infra/http/failure';
import { LivekitApi } from '@/modules/teaching/classroom/livekit/livekit-api';
import { sentBody, twirpAnswer } from '@/modules/teaching/classroom/livekit/livekit.fakes';
import type { RecordingRepo } from '@/modules/teaching/classroom/recordings/recording.repo';
import type { MaxDurationRepo, OverdueMeeting } from './max-duration.repo';
import type { MaxDurationSettings } from './max-duration.settings';
import { MeetingAutoEnd } from './meeting-auto-end';
import { MeetingMaxDurationJob } from './meeting-max-duration.job';
import { RoomCloser } from './room-closer';

export const NOW = new Date('2026-10-30T12:00:00.000Z');
export const M1 = '00000000-0000-4000-8000-0000000000a1';
export const L1 = '00000000-0000-4000-8000-0000000000b1';
export const L2 = '00000000-0000-4000-8000-0000000000b2';
const secondsAgo = (min: number): string => String(Math.floor(NOW.getTime() / 1000) - min * 60);

interface FakeRoom {
  name: string;
  minutesAgo: number;
}

/** LiveKit behind the real LivekitApi: ListRooms, DeleteRoom (404 once gone), StopEgress. */
function fakeLivekit(rooms: FakeRoom[]) {
  const live = new Map(rooms.map((r) => [r.name, r]));
  const deleted: string[] = [];
  const stopped: string[] = [];
  const failOn = new Set<string>();
  const answer = (status: number, body: object) => Promise.resolve(twirpAnswer(status, body));
  const http = vi.fn<FetchLike>((url, init) => {
    const body = sentBody(init) as { room?: string; egress_id?: string };
    if (url.endsWith('/ListRooms')) {
      const list = [...live.values()].map((r) => ({
        name: r.name,
        creation_time: secondsAgo(r.minutesAgo),
      }));
      return answer(200, { rooms: list });
    }
    if (url.endsWith('/StopEgress')) {
      stopped.push(body.egress_id ?? '');
      return answer(200, {});
    }
    const room = body.room ?? '';
    if (failOn.has(room)) return answer(500, { code: 'internal' });
    if (!live.delete(room)) return answer(404, { code: 'not_found' });
    deleted.push(room);
    return answer(200, {});
  });
  return { api: new LivekitApi(() => CONFIG, http), http, deleted, stopped, failOn };
}

/** MaxDurationRepo over `meetings`: one in `ended` is no longer selected (ends_at is null). */
function fakeRepo(meetings: OverdueMeeting[], ended: Map<string, string>) {
  return { overdueMeetings: vi.fn(async () => meetings.filter((m) => !ended.has(m.id))) };
}

/** InternalMeetingsQueries.end as the database answers it: stamped once, then kept. */
function fakeMeetingStore() {
  const ended = new Map<string, string>();
  return {
    ended,
    end: vi.fn(async (id: string, at: string) => {
      if (!ended.has(id)) ended.set(id, at);
      return { id, ends_at: ended.get(id) ?? null };
    }),
  };
}

export const overdue = (id: string, over: Partial<OverdueMeeting> = {}): OverdueMeeting => ({
  id, created_at: '2026-10-30T09:00:00.000Z', starts_at: null, ends_at: null, cancelled_at: null, ...over,
});

interface JobParts {
  minutes?: number;
  meetings?: OverdueMeeting[];
  rooms?: FakeRoom[];
  egress?: Record<string, string>;
}

export function jobWith(parts: JobParts = {}) {
  const lk = fakeLivekit(parts.rooms ?? []);
  const store = fakeMeetingStore();
  const repo = fakeRepo(parts.meetings ?? [], store.ended);
  const audit = { record: vi.fn(async () => undefined) };
  const egress = parts.egress ?? {};
  const recordings = { runningEgress: vi.fn(async (t: { id: string }) => egress[t.id] ?? null) };
  const settings = { read: vi.fn(async () => ({ meeting_max_minutes: parts.minutes ?? 120 })) };
  const ender = new MeetingAutoEnd(
    store as unknown as InternalMeetingsRepo,
    audit as unknown as AuditService,
  );
  const closer = new RoomCloser(lk.api, recordings as unknown as RecordingRepo);
  const job = new MeetingMaxDurationJob(
    repo as unknown as MaxDurationRepo,
    closer,
    ender,
    settings as unknown as MaxDurationSettings,
  );
  return { job, lk, repo, store, audit, recordings };
}
