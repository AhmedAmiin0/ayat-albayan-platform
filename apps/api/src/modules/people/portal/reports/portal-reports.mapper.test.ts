import { describe, expect, it } from 'vitest';
import { recordingByLesson, toPortalReport } from './portal-reports.mapper';

describe('portal reports mapper', () => {
  it('keeps the newest visible recording per lesson (rows come newest first)', () => {
    const rows = [{ id: 'new', lesson_id: 'l1', file_path: 'a' }, { id: 'old', lesson_id: 'l1', file_path: 'b' }, { id: 'x', lesson_id: 'l2', file_path: 'c' }];
    expect([...recordingByLesson(rows)]).toEqual([['l1', 'new'], ['l2', 'x']]);
  });

  it('whitelists the row: no path, no form field; a report without its lesson still lists', () => {
    const row = { id: 'r1', lesson_id: 'l1', sent_at: 'S', pdf_path: 'secret/path.pdf', notes: 'سر', lesson: null } as Parameters<typeof toPortalReport>[0];
    expect(toPortalReport(row, new Map([['l1', 'rec']]))).toEqual({ id: 'r1', lesson_id: 'l1', lesson_starts_at: null, sent_at: 'S', teacher: null, recording_id: 'rec' });
  });
});
