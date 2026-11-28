import { describe, expect, it } from 'vitest';
import {
  personLinkIds,
  type LinkRow,
} from '@/modules/teaching/classroom/moderation/room-person.mapper';

const link = (id: string, over: Partial<LinkRow> = {}): LinkRow => ({
  id,
  student_id: null,
  sent_for_student_id: null,
  ...over,
});
// A group lesson: sisters s1 and s2 (guardian g1) and s3 of another family (g2).
const GROUP = [
  { student_id: 's1', guardian_id: 'g1' },
  { student_id: 's2', guardian_id: 'g1' },
  { student_id: 's3', guardian_id: 'g2' },
];
const LINKS = [
  link('portal-s1', { student_id: 's1' }),
  link('wa-s1', { sent_for_student_id: 's1' }),
  link('wa-s2', { sent_for_student_id: 's2' }),
  link('portal-s3', { student_id: 's3' }),
  link('wa-s3', { sent_for_student_id: 's3' }),
  link('copied'),
];

describe('personLinkIds («إخراج» keeps the person out)', () => {
  it('group lesson, removed by the WhatsApp link: every link of that family, none of the others', () => {
    expect(personLinkIds('wa-s1', { links: LINKS, students: GROUP }).sort()).toEqual([
      'portal-s1',
      'wa-s1',
      'wa-s2',
    ]);
  });

  it('group lesson, removed by the portal row: the same family', () => {
    expect(personLinkIds('portal-s3', { links: LINKS, students: GROUP }).sort()).toEqual([
      'portal-s3',
      'wa-s3',
    ]);
  });

  it('a copied link naming nobody, in a group: that link only', () => {
    expect(personLinkIds('copied', { links: LINKS, students: GROUP })).toEqual(['copied']);
  });

  it("a one-student lesson: every link of the lesson is that family's", () => {
    const solo = [{ student_id: 's1', guardian_id: 'g1' }];
    const links = [link('portal-s1', { student_id: 's1' }), link('copied'), link('old-wa')];
    expect(personLinkIds('old-wa', { links, students: solo }).sort()).toEqual([
      'copied',
      'old-wa',
      'portal-s1',
    ]);
  });
});
