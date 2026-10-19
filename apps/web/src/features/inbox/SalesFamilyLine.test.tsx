import type { ThreadLesson, ThreadPeople } from '@ab/shared';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { fullTime } from './format';
import { PHONE, pupil } from './inbox-fixture';
import { student } from './sales-money/sales-money-fixture';
import { SalesFamilyLine } from './SalesFamilyLine';
import { renderWithClient, routeFetch } from './test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

// What sales gets in pages[0].people: the children, their packages nulled.
const PEOPLE: ThreadPeople = {
  guardian: { id: 'g-1', name: 'أم سهيلة' },
  lead: null,
  students: [pupil({ status: 'expired' }, null), pupil({ id: 's-2', name: 'جود', code: 'AB-0184', teacher_name: null, status: 'trial' }, null)],
};
const LESSON: ThreadLesson = { id: 'l-1', starts_at: '2026-10-20T16:00:00Z', meeting_link: null, student_names: ['سهيلة'], tz: 'Asia/Riyadh' };

function renderLine(students: unknown[], people: ThreadPeople = PEOPLE, lessons: ThreadLesson[] = [LESSON]) {
  routeFetch(apiFetch, [['/sales/money/family', { students }]]);
  renderWithClient(
    <p data-testid="line">
      <SalesFamilyLine phone={PHONE} people={people} lessons={lessons} />
    </p>,
  );
  return () => screen.getByTestId('line').textContent ?? '';
}

describe('SalesFamilyLine: which children a sales chat is about (W3)', () => {
  afterEach(() => apiFetch.mockReset());

  it('each child: the name, the code, the status word and the teacher; then the next lesson', async () => {
    const text = renderLine([student()]);
    expect(await screen.findByText('سهيلة')).toBeTruthy();
    expect(screen.getByText('AB-0183')).toBeTruthy();
    expect(screen.getByText(t.enums.studentStatus.expired)).toBeTruthy();
    expect(screen.getByText('أبرار')).toBeTruthy();
    expect(screen.getByText('جود')).toBeTruthy();
    expect(screen.getByText(t.enums.studentStatus.trial)).toBeTruthy();
    expect(text()).toContain(t.inbox.nextLesson.replace('{when}', fullTime(LESSON.starts_at)));
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith(`/sales/money/family?phone=${encodeURIComponent(PHONE)}`));
    expect(text()).not.toContain(t.inbox.salesNotYours);
  });

  it('none of the children are hers: «يتابعه مساعد آخر أو الإدارة»', async () => {
    renderLine([]);
    expect(await screen.findByText(t.inbox.salesNotYours)).toBeTruthy();
  });

  it('never reads «غير مشترك» (sales gets no packages: no badge)', async () => {
    const text = renderLine([]);
    await screen.findByText(t.inbox.salesNotYours);
    expect(text()).not.toContain(t.inbox.subscription.badge.none);
    expect(text()).not.toContain(t.inbox.subscription.badge.expired);
  });

  it('no children and no lesson: nothing, and the family is never asked', () => {
    const text = renderLine([], { guardian: null, lead: null, students: [] }, []);
    expect(text()).toBe('');
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
