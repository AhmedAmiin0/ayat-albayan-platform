import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { TeacherChannelList } from './TeacherChannelList';

const a = t.studentChannel.actions;

describe('the teacher channel list (owner 2026-10-30)', () => {
  it('the teacher list previews a deleted last message as the placeholder, not its text', () => {
    const last = {
      body: '',
      sender_role: 'guardian' as const,
      created_at: '2026-10-27T10:00:00.000Z',
      deleted: true,
    };
    const row = {
      student_id: 's1',
      student_name: 'سلمى',
      student_code: 'AB-0201',
      unread: 0,
      last_message: last,
    };
    render(<TeacherChannelList rows={[row]} selected={null} onPick={vi.fn()} />);
    expect(screen.getByText(a.deleted)).toBeTruthy();
  });
});
