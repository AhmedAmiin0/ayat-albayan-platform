import { UPLOADED, SUN_17 } from './fixtures';
import { makeupRequest } from './makeup-body';
import { makeupDraft, type MakeupSource } from './makeup-draft';

const REQ = '99999999-9999-4999-8999-999999999999';
const source: MakeupSource = {
  lessonId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  studentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  studentName: 'سهيلة',
  tz: 'Asia/Dubai',
  missedAt: '2026-09-27T14:00:00.000Z',
  durationMin: 60,
  teacherId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  teacherName: 'مريم المعلمة',
};

test('a makeup is one lesson of that student, linked to the missed one: no package, lead or new child', () => {
  const body = makeupRequest({ ...makeupDraft(source), startsAt: SUN_17, invoice: UPLOADED }, REQ);
  expect(body).toEqual({
    kind: 'makeup',
    studentIds: [source.studentId],
    makeupOfLessonId: source.lessonId,
    teacherId: source.teacherId,
    byday: [0],
    startTimeLocal: '18:00',
    tz: 'Asia/Dubai',
    durationMin: 60,
    startsOn: '2026-10-04',
    startsAt: SUN_17,
    clientRequestId: REQ,
    invoice: { source: 'upload', path: UPLOADED.source === 'upload' ? UPLOADED.path : '' },
  });
  for (const key of ['package', 'leadId', 'newStudent', 'guardian']) expect(body).not.toHaveProperty(key);
});

test('another teacher is the pick; no slot yet means nothing to send; no invoice is left to the API', () => {
  const other = { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', name: 'سارة' };
  const d = { ...makeupDraft(source), teacher: other, startsAt: SUN_17 };
  expect(makeupRequest(d, REQ)).toMatchObject({ teacherId: other.id });
  expect(makeupRequest(d, REQ)).not.toHaveProperty('invoice');
  expect(makeupRequest({ ...d, startsAt: null }, REQ)).toBeNull();
});
