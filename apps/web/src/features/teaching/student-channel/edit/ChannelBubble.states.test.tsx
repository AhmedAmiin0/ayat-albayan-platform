import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { TeacherChannelList } from '@/features/teaching/student-channel/TeacherChannelList';
import { msg, showBubble } from './bubble.testing';

const a = t.studentChannel.actions;

describe('channel bubble states (owner 2026-10-30)', () => {
  it('an edited message shows its new text and «تم التعديل»', () => {
    showBubble(msg(1, { body: 'الحلقة بعد غد', edited: true }));
    expect(screen.getByText('الحلقة بعد غد')).toBeTruthy();
    expect(screen.getByText(a.edited)).toBeTruthy();
  });

  it('a deleted message is only «تم حذف هذه الرسالة»: no text, no link, no menu', () => {
    showBubble(msg(1, { body: '', deleted: true }), 'admin');
    expect(screen.getByText(a.deleted)).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button', { name: a.menu })).toBeNull();
    expect(screen.queryByText(a.edited)).toBeNull();
  });

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

  it('«تعديل» opens the box in place; «إلغاء» leaves the text as it was', () => {
    showBubble(msg(1));
    fireEvent.click(screen.getByRole('button', { name: a.menu }));
    fireEvent.click(screen.getByRole('button', { name: a.edit }));
    expect(screen.getByLabelText(a.editTitle)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    expect(screen.queryByLabelText(a.editTitle)).toBeNull();
    expect(screen.getByText('الحلقة غدًا')).toBeTruthy();
  });
});
