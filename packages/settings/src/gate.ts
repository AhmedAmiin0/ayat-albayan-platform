import { z } from 'zod';

/** The two sending switches with their own routes (docs/26 §2f 26-P0): PUT /messages/gate/{sending|auto}. */
export const GATE_SWITCHES = ['sending', 'auto'] as const;
export type GateSwitch = (typeof GATE_SWITCHES)[number];

/** The settings row each gate route writes (the ONLY writers of these keys). */
export const GATE_SWITCH_KEY = {
  sending: 'messaging_enabled',
  auto: 'auto_messages_enabled',
} as const satisfies Record<GateSwitch, string>;

/**
 * The words the web dialog asks the admin to confirm today (ar.json templates.settings.enableYes /
 * autoEnableYes). Turning a switch ON needs the exact text, checked by the server; OFF never does.
 * A test pins these to ar.json. Clients send this constant, not the (overridable) rendered label.
 */
export const GATE_CONFIRM_TEXT = {
  sending: 'نعم، فعّل الإرسال',
  auto: 'نعم، فعّلها',
} as const satisfies Record<GateSwitch, string>;

/**
 * PUT /messages/gate/sending | /messages/gate/auto body. confirmText is not validated here so that OFF
 * is never refused over it; gateConfirmed() accepts only the exact string for ON.
 */
export const gateSwitchSchema = z.object({
  on: z.boolean(),
  confirmText: z.unknown().optional(),
});
export type GateSwitchInput = z.infer<typeof gateSwitchSchema>;

/** PUT /messages/gate/cutover body: the CRM cut-over tick (crm_cutover_done), no confirmation. */
export const gateCutoverSchema = z.object({ done: z.boolean() });
export type GateCutoverInput = z.infer<typeof gateCutoverSchema>;

/** true only for the exact confirmation text of that switch (trimmed). */
export const gateConfirmed = (sw: GateSwitch, text: unknown): boolean =>
  typeof text === 'string' && text.trim() === GATE_CONFIRM_TEXT[sw];
