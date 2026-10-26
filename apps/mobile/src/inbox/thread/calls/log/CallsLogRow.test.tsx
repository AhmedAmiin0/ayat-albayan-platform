import type { CallView } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { CallsLogRow } from './CallsLogRow';

const call = (over: Partial<CallView> = {}): CallView => ({
  ...{ id: 'c1', phone_e164: '+966501234567', direction: 'inbound', status: 'ended', end_reason: 'missed', display_name: null },
  ...{ staff_id: null, started_at: '2026-10-26T10:00:00Z', answered_at: null, ended_at: '2026-10-26T10:01:00Z', duration_seconds: null },
  ...over,
});

describe('CallsLogRow («المكالمات»)', () => {
  it('who, what and a tap that opens the chat; a teacher never sees the number', async () => {
    const open = jest.fn();
    await render(<CallsLogRow call={call()} showsPhone={false} onOpen={open} />);
    expect(screen.getByText(t.inbox.unknownNumber)).toBeTruthy();
    expect(screen.getByText(t.calls.entry.missed)).toBeTruthy();
    await fireEvent.press(screen.getByText(t.inbox.unknownNumber));
    expect(open).toHaveBeenCalled();
  });

  it('a named caller and an answered call with its talk time', async () => {
    await render(<CallsLogRow call={call({ display_name: 'أم سهيلة', end_reason: 'completed', duration_seconds: 40 })} showsPhone onOpen={jest.fn()} />);
    expect(screen.getByText('أم سهيلة')).toBeTruthy();
    expect(screen.getByText(`${t.calls.entry.incoming} · 0:40`)).toBeTruthy();
  });
});
