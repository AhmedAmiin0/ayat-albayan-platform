import { router, useLocalSearchParams } from 'expo-router';
import { z } from 'zod';

const msgParam = z.uuid();

/** The chat route's `?msg=<uuid>` (a search hit to open at); anything else is no anchor. */
export function useAnchorParam(): string | undefined {
  const { msg } = useLocalSearchParams<{ msg?: string }>();
  const parsed = msgParam.safeParse(msg);
  return parsed.success ? parsed.data : undefined;
}

/** Opens the chat at that message (one request when it is not loaded). */
export const anchorAt = (id: string): void => router.setParams({ msg: id });

/** Back to the live chat: the anchor goes with the param. */
export const leaveAnchor = (): void => router.setParams({ msg: undefined });
