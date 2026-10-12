import type { SignedDownload } from '@ab/shared';
import { Linking } from 'react-native';
import { apiFetch } from '@/lib/api';

/** A paid statement's receipt: GET /assistant-pay/statements/:id/receipt (a short-lived signed URL), opened in the browser. */
export async function openStatementReceipt(statementId: string): Promise<void> {
  const file = await apiFetch<SignedDownload>(`/assistant-pay/statements/${statementId}/receipt`);
  await Linking.openURL(file.url);
}
