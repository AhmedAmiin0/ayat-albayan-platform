import type { SignedDownload } from '@ab/shared';
import { Linking } from 'react-native';
import { apiFetch } from '@/core/lib/http/api';

/** A paid month's receipt: a short-lived signed URL, opened in the phone's browser (no native module). */
export async function openPayoutReceipt(payoutId: string): Promise<void> {
  const file = await apiFetch<SignedDownload>(`/payouts/${payoutId}/receipt`);
  await Linking.openURL(file.url);
}
