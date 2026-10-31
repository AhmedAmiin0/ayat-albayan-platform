import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/integrations/numbers-overlay';
import { kapsoOverlay } from '@/modules/messaging/webhook/external/external.fakes';
import { kapsoChatNumbers } from '@/modules/messaging/webhook/external/kapso-numbers';
import { GUARDIAN_ID, nobody } from '@/modules/messaging/webhook/webhook.fakes';
import type { ReplyWindow } from '@/modules/messaging/webhook/webhook.types';
import { catchUpRig, GAP_AT, kapsoInbound, NOW, page } from './inbound.fakes';

// Finding 1 of PR #452: a back-filled «نعم» must answer only a lesson message sent BEFORE it.

const RUN = { now: NOW, full: false };
const FINISHED = '00000000-0000-4000-8000-0000000000f1';
const LATER = '00000000-0000-4000-8000-0000000000f2';
const hours = (h: number) => new Date(GAP_AT.getTime() + h * 3_600_000);
const chat = () => {
  const [n] = kapsoChatNumbers();
  if (!n) throw new Error('no kapso chat number');
  return n;
};

interface Sent {
  lessonId: string;
  at: Date;
  open: boolean;
}

/** recentLessonOutbound as the query does it: sent in (since, until], open lesson, latest first. */
function sentMessages(x: ReturnType<typeof catchUpRig>, sent: Sent[]) {
  x.queries.identify.mockResolvedValue({ ...nobody(), guardian: { id: GUARDIAN_ID, name: 'أم سهيلة' } });
  x.queries.recentLessonOutbound.mockImplementation(async (w: ReplyWindow) => {
    const fit = sent.filter((s) => s.open && s.at > w.since && s.at <= w.until);
    return fit.sort((a, b) => +b.at - +a.at)[0]?.lessonId ?? null;
  });
}

beforeEach(() => kapsoOverlay());
afterEach(() => {
  setNumbersOverlay(null);
  vi.restoreAllMocks();
});

describe('InboundCatchUp — a back-filled «نعم» (quick reply)', () => {
  it('for a lesson since finished: never confirms the lesson messaged after it', async () => {
    const x = catchUpRig();
    sentMessages(x, [
      { lessonId: FINISHED, at: hours(-1), open: false },
      { lessonId: LATER, at: hours(2), open: true },
    ]);
    x.kapso.inbound.mockResolvedValue(page([kapsoInbound({ text: { body: 'نعم' } })]));
    expect(await x.catchUp.number(chat(), RUN)).toMatchObject({ stored: 1 });
    expect(x.lessons.confirm).not.toHaveBeenCalled();
    expect(x.queries.stored[0]?.lesson_id).toBeNull();
    const until = new Date(GAP_AT.getTime() + 999);
    expect(x.queries.recentLessonOutbound).toHaveBeenCalledWith(expect.objectContaining({ until }));
  });

  it('for a lesson still open: confirms that one, not the later one', async () => {
    const x = catchUpRig();
    const asked = '00000000-0000-4000-8000-0000000000f3';
    sentMessages(x, [
      { lessonId: asked, at: hours(-1), open: true },
      { lessonId: LATER, at: hours(2), open: true },
    ]);
    x.kapso.inbound.mockResolvedValue(page([kapsoInbound({ text: { body: 'نعم' } })]));
    await x.catchUp.number(chat(), RUN);
    expect(x.lessons.confirm).toHaveBeenCalledWith({ lessonId: asked, actor: null });
    expect(x.lessons.confirm).toHaveBeenCalledTimes(1);
  });
});
