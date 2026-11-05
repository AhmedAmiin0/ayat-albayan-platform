import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ShortLinks } from '@/modules/platform/short-links';
import type { FamilyFeedbackLinks as FeedbackLinks } from '@/common/http/family-feedback';
import { ReportFeedbackLink } from './report-feedback-link';

const NOW = new Date('2026-11-05T12:00:00Z');
const PAIR = { lessonId: 'l1', studentId: 's1' };
const LINK = { token: 'tok.sig', expiresAt: new Date('2026-11-19T12:00:00Z') };

function setup() {
  vi.stubEnv('WEB_ORIGIN', 'https://app.example');
  const feedback = { forLesson: vi.fn(async () => LINK as typeof LINK | null) };
  const links = { forTarget: vi.fn(async () => 'https://api.example/r/Ab12Cd34Ef') };
  const service = new ReportFeedbackLink(
    feedback,
    links as unknown as ShortLinks,
  );
  return { feedback, links, service };
}

describe('ReportFeedbackLink.url (session_report_pdf {{4}})', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('the family’s feedback page, shortened per lesson and student', async () => {
    const { links, service } = setup();
    expect(await service.url(PAIR, NOW)).toBe('https://api.example/r/Ab12Cd34Ef');
    expect(links.forTarget).toHaveBeenCalledWith({
      kind: 'feedback',
      subject: 'l1:s1',
      url: 'https://app.example/feedback/tok.sig',
      expiresAt: LINK.expiresAt,
    });
  });

  it('never blocks the report: no link → the web address; a failed short link → the long link', async () => {
    const { feedback, links, service } = setup();
    links.forTarget.mockRejectedValueOnce(new Error('db down'));
    expect(await service.url(PAIR, NOW)).toBe('https://app.example/feedback/tok.sig');
    feedback.forLesson.mockResolvedValueOnce(null);
    expect(await service.url(PAIR, NOW)).toBe('https://app.example');
    feedback.forLesson.mockRejectedValueOnce(new Error('db down'));
    expect(await service.url(PAIR, NOW)).toBe('https://app.example');
  });
});
