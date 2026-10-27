// Test-only: the calls provider mounted with a phone icon, its fakes and the API mocks (docs/28 PR 2).
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { renderWithQuery } from '@/test/query';
import { CallButton } from '../entries/CallButton';
import { CallProvider } from './CallProvider';
import { fakeRtc, ringing } from './call-test-kit';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

/** Our outbound call as /calls/active lists it once POST /calls answered. */
export const placed = ringing({ id: 'out1', direction: 'outbound', status: 'connecting', offer_sdp: null });

/** The provider (with these fakes) above one phone icon; returns the fakes and the query client. */
export async function mountCalls(rtc = fakeRtc()) {
  const { client } = await renderWithQuery(
    <SafeAreaProvider initialMetrics={metrics}>
      <CallProvider rtc={rtc.deps}>
        <CallButton phone="+966501234567" name="Family" canSend />
      </CallProvider>
    </SafeAreaProvider>,
  );
  return Object.assign(rtc, { client });
}
