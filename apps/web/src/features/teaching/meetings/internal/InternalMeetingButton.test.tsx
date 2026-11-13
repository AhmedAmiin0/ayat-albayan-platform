import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { InternalMeetingButton } from './InternalMeetingButton';

const names = () => screen.getAllByRole('button').map((b) => b.textContent);

describe('InternalMeetingButton', () => {
  it('sales and assistant pages (no props): both buttons, never the teacher switches', () => {
    render(<InternalMeetingButton />);
    expect(names()).toEqual([t.meetings.internal.item, t.meetingInvites.scheduledItem]);
  });

  it('the teacher page passes its switches: only the allowed button', () => {
    render(<InternalMeetingButton instant={false} />);
    expect(names()).toEqual([t.meetingInvites.scheduledItem]);
  });
});
