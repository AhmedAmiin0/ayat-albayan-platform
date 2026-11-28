import { payoutCalls } from '@ab/client-core';
import { Linking } from 'react-native';
import { apiFetch, apiSend } from '@ab/mobile-kit';

/** A paid month's receipt: a short-lived signed URL opened in the browser (no native module). */
export async function openPayoutReceipt(payoutId: string): Promise<void> {
  const file = await payoutCalls({ apiFetch, apiSend }).receipt(payoutId);
  await Linking.openURL(file.url);
}
