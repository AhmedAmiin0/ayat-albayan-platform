import type { CallsUi } from '@ab/client-core';
import { fireEvent, screen } from '@testing-library/react-native';
import { pathKey } from '@/core/lib/query/query-keys';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { CallsContext } from '../state/call-context';
import { OFF, ON } from '../state/call-test-kit';
import { CallButton } from './CallButton';

const ui = (over: Partial<CallsUi> = {}): CallsUi => ({ config: ON, busy: false, call: jest.fn(), ...over });
const show = (value: CallsUi | null, canSend = true, client = createTestQueryClient()) =>
  renderWithQuery(
    <CallsContext.Provider value={value}>
      <CallButton phone="+966501234567" name="أم سهيلة" canSend={canSend} />
    </CallsContext.Provider>,
    client,
  );

describe('CallButton (the phone icon in the chat header)', () => {
  it('calls this chat', async () => {
    const value = ui();
    await show(value);
    await fireEvent.press(screen.getByTestId('call-button'));
    expect(value.call).toHaveBeenCalledWith({ phone: '+966501234567', name: 'أم سهيلة' });
  });

  it('is hidden while calls are off, outside a staff tree and in a read-only chat', async () => {
    await show(ui({ config: OFF }));
    expect(screen.queryByTestId('call-button')).toBeNull();
    await show(null);
    expect(screen.queryByTestId('call-button')).toBeNull();
    await show(ui(), false);
    expect(screen.queryByTestId('call-button')).toBeNull();
  });

  it('is hidden for a role without inbox.send', async () => {
    const client = createTestQueryClient();
    client.setQueryData(pathKey('/auth/me'), { role: 'teacher', permissions: ['inbox.read'] });
    await show(ui(), true, client);
    expect(screen.queryByTestId('call-button')).toBeNull();
  });

  it('says why it cannot call while the chat line is not on Kapso; waits during a call', async () => {
    await show(ui({ config: { ...ON, available: false } }));
    expect(screen.getByLabelText(`${t.calls.call} — ${t.calls.errors.calls_unavailable}`)).toBeDisabled();
    await show(ui({ busy: true }));
    expect(screen.getAllByTestId('call-button').at(-1)).toBeDisabled();
  });
});
