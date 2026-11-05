import { describe, expect, it, vi } from 'vitest';
import type { FeedbackRepo } from '@/modules/teaching/feedback/feedback.repo';
import {
  EXP,
  feedbackRow,
  LESSON_ID,
  NOW,
  requestContext,
  SECRET,
  STUDENT_ID,
  tokenFor,
} from '@/modules/teaching/feedback/feedback.fakes';
import { hashToken, verifyToken } from '@/modules/teaching/feedback/public/feedback.token';
import { FeedbackLinks } from './feedback.links';

const PAIR = { lessonId: LESSON_ID, studentId: STUDENT_ID };

function setup(secret: string | null = SECRET) {
  const repo = {
    find: vi.fn(),
    requestContext: vi.fn(async () => requestContext()),
    issue: vi.fn(async () => feedbackRow()),
  };
  return { repo, links: new FeedbackLinks(repo as unknown as FeedbackRepo, { secret }) };
}

describe('FeedbackLinks.forLesson (session_report_pdf {{4}}, docs/19)', () => {
  it('a live link is rebuilt as is: the same token the admin’s request sends, nothing written', async () => {
    const { repo, links } = setup();
    repo.find.mockResolvedValue(feedbackRow());
    expect(await links.forLesson(PAIR, NOW)).toEqual({
      token: tokenFor(),
      expiresAt: new Date(EXP * 1000),
    });
    expect(repo.issue).not.toHaveBeenCalled();
  });

  it('an answered row keeps its link (the page says «already answered»), even past its expiry', async () => {
    const { repo, links } = setup();
    repo.find.mockResolvedValue(feedbackRow({ submitted_at: NOW.toISOString() }));
    expect((await links.forLesson(PAIR, new Date(EXP * 1000 + 1)))?.token).toBe(tokenFor());
  });

  it('no row (or an expired one): a new 14-day link, stored by its hash', async () => {
    const { repo, links } = setup();
    repo.find.mockResolvedValue(null);
    const link = await links.forLesson(PAIR, NOW);
    expect(link?.token).toBe(tokenFor());
    expect(verifyToken(SECRET, link?.token ?? '', NOW).ok).toBe(true);
    expect(repo.issue).toHaveBeenCalledWith(
      expect.objectContaining({
        lesson_id: LESSON_ID,
        student_id: STUDENT_ID,
        token_hash: hashToken(tokenFor()),
      }),
    );
  });

  it('null without the secret, or without the student’s guardian; never throws for them', async () => {
    expect(await setup(null).links.forLesson(PAIR, NOW)).toBeNull();
    const { repo, links } = setup();
    repo.find.mockResolvedValue(null);
    repo.requestContext.mockResolvedValue(null as never);
    expect(await links.forLesson(PAIR, NOW)).toBeNull();
  });
});
