import { CHANNEL_SENDER_ROLES } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { toTeacherRows, UNREAD_COUNT_ROLES } from './channel.mapper';

const student = (id: string, name: string) => ({ id, name, code: `AB-${id}` });
const at = (min: number) => `2026-11-21T10:${String(min).padStart(2, '0')}:00.000Z`;

describe('the teacher list rows', () => {
  it('newest activity first, then by name; no summary = no last message and 0 unread', () => {
    const rows = toTeacherRows(
      [student('1', 'سارة'), student('2', 'أحمد'), student('3', 'بلال'), student('4', 'تميم')],
      [
        { student_id: '1', unread: 3, last_body: 'مرحبا', last_role: 'guardian', last_at: at(5) },
        { student_id: '4', unread: 1, last_body: null, last_role: null, last_at: at(9) },
      ],
    );
    expect(rows.map((r) => [r.student_id, r.unread])).toEqual([
      ['1', 3],
      ['2', 0],
      ['3', 0],
      ['4', 1],
    ]);
    expect(rows[0]?.last_message).toEqual({
      body: 'مرحبا',
      sender_role: 'guardian',
      created_at: at(5),
      deleted: false,
    });
    expect(rows[1]?.last_message).toBeNull();
  });

  it('a deleted last message never shows its text; an unknown role reads as unknown', () => {
    const [row] = toTeacherRows(
      [student('1', 'سارة')],
      [
        {
          student_id: '1',
          unread: 0,
          last_body: 'سر',
          last_role: 'x',
          last_at: at(1),
          last_deleted: true,
        },
      ],
    );
    expect(row?.last_message).toMatchObject({ body: '', deleted: true });
  });

  it('unread counts every role (review finding 4)', () => {
    expect(UNREAD_COUNT_ROLES).toEqual(CHANNEL_SENDER_ROLES);
  });
});
