import type { StepDirection } from '@ab/mobile-kit';

/** whatsapp: number → code (the default); password: student code + password (one tap away). */
export type SignInWay = 'whatsapp' | 'password';

/** While WhatsApp codes are off (GET /auth/code/status) the screen opens on the password form. */
export const firstWay = (codes: boolean): SignInWay => (codes ? 'whatsapp' : 'password');

/** The plain text button under the form goes to the other way. */
export const OTHER_WAY: Record<SignInWay, SignInWay> = { whatsapp: 'password', password: 'whatsapp' };

/** The password form sits «after» WhatsApp: going to it moves forward, coming back moves back. */
export const WAY_DIRECTION: Record<SignInWay, StepDirection> = {
  password: 'forward',
  whatsapp: 'back',
};
