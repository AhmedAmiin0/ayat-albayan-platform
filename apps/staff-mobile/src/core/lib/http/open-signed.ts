import { Linking } from 'react-native';
import { z } from 'zod';
import { apiFetch } from '@ab/mobile-kit';

/** The signed download answer: only its URL is read. */
const signedUrl = z.object({ url: z.string() });

/**
 * Opens a private file (an attachment, the report PDF) through its short-lived signed URL. Lives in
 * core so the sales and teacher features can both use it without importing each other (cycle).
 */
export async function openSigned(path: string): Promise<void> {
  const { url } = signedUrl.parse(await apiFetch(path));
  await Linking.openURL(url);
}

/** Opens the signed URL a typed call answered. */
export async function openDownload(answer: Promise<{ url: string }>): Promise<void> {
  const { url } = await answer;
  await Linking.openURL(url);
}
