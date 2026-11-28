import { z } from 'zod';

/** What expo-notifications getExpoPushTokenAsync returns: «ExponentPushToken[xxxxxxxx]». */
export const pushTokenSchema = z
  .string()
  .regex(/^Expo(nent)?PushToken\[[\w-]+\]$/, { message: 'invalid_push_token' });

/** The key PUT /me/push-tokens handed this device last time (claimDevice): base64url, 32 bytes. */
export const deviceKeySchema = z.string().regex(/^[\w-]{43}$/, { message: 'invalid_device_key' });

export const pushTokenBodySchema = z.object({
  token: pushTokenSchema,
  deviceKey: deviceKeySchema.optional(),
});
export type PushTokenBody = z.infer<typeof pushTokenBodySchema>;

export const pushTokenAnswerSchema = z.object({ deviceKey: deviceKeySchema });
export type PushTokenAnswer = z.infer<typeof pushTokenAnswerSchema>;
