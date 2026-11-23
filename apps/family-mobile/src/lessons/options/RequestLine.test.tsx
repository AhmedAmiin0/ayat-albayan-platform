import { render, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { lesson } from '#/portal/portal.fixtures.ts';
import { LessonChip } from './LessonChip';
import { RequestLine } from './RequestLine';

const now = new Date('2026-11-16T10:00:00.000Z');
const clock = { tz: 'Asia/Riyadh', cycle: '12', locale: 'ar' } as const;
const A = t.portal.actions;
const request = (status: 'pending' | 'rejected', decision_note: string | null = null) => ({
  id: 'r', status, proposed_starts_at: '2026-11-18T14:30:00.000Z', note: null, decision_note, decided_at: null,
});

test('a waiting request: «بانتظار رد الأكاديمية» and what was asked', async () => {
  const l = lesson(now, 60, { status: 'scheduled', family: { group: false, counts: false, request: request('pending') } });
  await render(<><LessonChip lesson={l} /><RequestLine lesson={l} clock={clock} ink="#000" now={now} student="يوسف" /></>);
  expect(screen.getByText(A.pendingChip)).toBeTruthy();
  expect(screen.getByText(/^طلبتم .*18/)).toBeTruthy();
});

test('a declined request: «لم يُقبل الطلب» with the academy’s note; the status chip is back', async () => {
  const l = lesson(now, 60, { status: 'confirmed', family: { group: false, counts: false, request: request('rejected', 'لا يتوفر وقت') } });
  await render(<><LessonChip lesson={l} /><RequestLine lesson={l} clock={clock} ink="#000" now={now} student="يوسف" /></>);
  expect(screen.getByText(`${A.rejectedChip} · ${A.decisionNote.replace('{note}', 'لا يتوفر وقت')}`)).toBeTruthy();
  expect(screen.getByText(t.enums.lessonStatus.confirmed)).toBeTruthy();
});

test('an excused lesson says whether it counts from the package; a scheduled one: no line', async () => {
  const excused = lesson(now, 60, { status: 'excused', family: { group: false, counts: false, request: null } });
  await render(<RequestLine lesson={excused} clock={clock} ink="#000" now={now} student="يوسف" />);
  expect(screen.getByText(A.excusedNo)).toBeTruthy();
  const plain = lesson(now, 60, { status: 'scheduled', family: { group: false, counts: false, request: null } });
  await render(<RequestLine lesson={plain} clock={clock} ink="#000" now={now} student="يوسف" />);
  expect(screen.queryByText(A.excusedNo)).toBeNull();
});

test('a confirmed lesson: «أكّدتم حضور يوسف لهذه الحلقة»', async () => {
  const confirmed = lesson(now, 60, { status: 'confirmed', family: { group: false, counts: false, request: null } });
  await render(<RequestLine lesson={confirmed} clock={clock} ink="#000" now={now} student="يوسف" />);
  expect(screen.getByText(A.confirmedLine.replace('{student}', 'يوسف'))).toBeTruthy();
});
