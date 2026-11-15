import type { CallSession } from '@ab/client-core';
import { avatarTone } from '@ab/shared';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CallScreen } from './CallScreen';
import { IncomingCall } from './IncomingCall';

const PHONE = '+966500000002';
const SESSION: CallSession = {
  id: 'c1',
  phone: PHONE,
  name: 'أم محمد',
  direction: 'outbound',
  startedAt: 0,
  muted: false,
  speaker: false,
  minimised: false,
  ended: false,
};
const toneOf = (root: HTMLElement) => root.querySelector('[data-avatar-tone]')?.getAttribute('data-avatar-tone');
const phoneTone = String(avatarTone(PHONE) + 1);

// The call screens seed the tone with the number, as the chat rows do: one family, one colour.
describe('call screens: the caller keeps the chat row tone', () => {
  it('CallScreen seeds with session.phone', () => {
    const actions = { hangup: vi.fn(), toggleMute: vi.fn(), minimise: vi.fn() };
    const { container } = render(<CallScreen session={SESSION} row={undefined} phase="ringing" actions={actions} />);
    expect(toneOf(container)).toBe(phoneTone);
  });

  it('IncomingCall seeds with the caller phone', () => {
    const { container } = render(
      <IncomingCall name="أم محمد" phone={PHONE} onAccept={vi.fn()} onDecline={vi.fn()} onSilence={vi.fn()} />,
    );
    expect(toneOf(container)).toBe(phoneTone);
  });
});
