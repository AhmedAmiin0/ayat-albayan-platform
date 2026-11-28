import type { SignedDownload } from '@ab/shared';
import { Linking } from 'react-native';
import { apiFetch } from '@ab/mobile-kit';

/** A paid statement's receipt: a short-lived signed URL from the API, opened in the browser. */
export async function openStatementReceipt(statementId: string): Promise<void> {
  const file = await apiFetch<SignedDownload>(`/assistant-pay/statements/${statementId}/receipt`);
  await Linking.openURL(file.url);
}
