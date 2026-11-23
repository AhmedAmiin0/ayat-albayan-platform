import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '#/lib/i18n/i18n.ts';
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

  it('«تعديل» opens the box in place; «إلغاء» leaves the text as it was', () => {
    showBubble(msg(1));
    fireEvent.click(screen.getByRole('button', { name: a.menu }));
    fireEvent.click(screen.getByRole('button', { name: a.edit }));
    expect(screen.getByLabelText(a.editTitle)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    expect(screen.queryByLabelText(a.editTitle)).toBeNull();
    expect(screen.getByText('See you tomorrow')).toBeTruthy();
  });
});
