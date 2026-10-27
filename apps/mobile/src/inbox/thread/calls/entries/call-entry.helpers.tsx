// Tests only: a CallEntry's alignSelf, ours and the family's (the same fixture in both directions).
import type { CallView } from '@ab/shared';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { CallEntry } from './CallEntry';

export const call = (over: Partial<CallView> = {}): CallView => ({
  ...{ id: 'c1', phone_e164: '+966501234567', direction: 'outbound', status: 'ended', end_reason: 'completed', display_name: 'أم سهيلة' },
  ...{ staff_id: 's1', started_at: '2026-10-26T10:00:00Z', answered_at: '2026-10-26T10:00:05Z', ended_at: '2026-10-26T10:02:19Z', duration_seconds: 134 },
  ...over,
});

/** Where an outbound and an inbound call sit (alignSelf): RN mirrors flex-start/end itself. */
export async function callSides(): Promise<{ ours: unknown; theirs: unknown }> {
  const alignOf = async (c: CallView) => {
    await render(<CallEntry call={c} />);
    return StyleSheet.flatten(screen.getByTestId(`call-entry-${c.id}`).props.style).alignSelf;
  };
  return { ours: await alignOf(call()), theirs: await alignOf(call({ id: 'c2', direction: 'inbound' })) };
}
