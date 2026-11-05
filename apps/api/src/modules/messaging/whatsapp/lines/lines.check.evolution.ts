import type { LineCheckView, WaLine } from '@ab/shared';
import {
  instanceState, type InstanceCall,
} from '@/modules/messaging/whatsapp/drivers/evolution/evolution-instance';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// «افحص الخطوط» on an Evolution line (docs/19 «Evolution driver»): one read-only
// connectionState with the instance token. Never a test message. The instance name shows as the
// phone id; Meta's phone facts stay null and `status` carries Evolution's state (open, close, …).

interface EvolutionCheckInput {
  line: WaLine;
  call: InstanceCall;
  checkedAt: string;
  driver: Pick<LineCheckView, 'provider' | 'gaps' | 'duplicate_chat_phone'>;
}

type CallError = LineCheckView['errors'][number];

async function stateOf(call: InstanceCall): Promise<{ state: string | null; error?: CallError }> {
  try {
    return { state: await instanceState(call) };
  } catch (e) {
    const tag = e instanceof WaError && e.info.credential ? { credential: e.info.credential } : {};
    const message = e instanceof Error ? e.message : String(e);
    return { state: null, error: { step: 'phone', code: null, message, ...tag } };
  }
}

export async function evolutionLineCheck(input: EvolutionCheckInput): Promise<LineCheckView> {
  const { state, error } = await stateOf(input.call);
  return {
    line: input.line,
    configured: true,
    ...input.driver,
    phone_number_id: input.call.env.instance,
    waba_id: null,
    app_id: null,
    display_phone_number: null,
    verified_name: null,
    quality_rating: null,
    status: state,
    name_status: null,
    code_verification_status: null,
    subscribed_apps: null,
    errors: error ? [error] : [],
    checked_at: input.checkedAt,
  };
}
