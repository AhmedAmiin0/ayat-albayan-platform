import { z } from 'zod';
import type { Http } from '@/common/infra/http/http.types';
import { graphHttp, type FetchLike } from '@/modules/messaging/whatsapp/drivers/meta/graph';
import { waTo } from '@/modules/messaging/whatsapp/messages/wa-components';
import { DEFAULT_TIMEOUT_MS } from '@/modules/messaging/whatsapp/whatsapp.client';
import type { CallingLine } from './calling-line';
import type { CallPermissionFacts, CallsApi, PermissionRequest } from './calls-api';
import { permissionRequestBody } from './permission-body';

// Kapso's Meta proxy mirrors Meta's Cloud API Calling (docs/28 §2): same paths and snake_case bodies,
// the project key as X-API-Key (graph.ts authHeaders). One request per method, never a retry.

const sentSchema = z.object({ messages: z.array(z.object({ id: z.string().min(1) })).min(1) });
const connectSchema = z.object({ calls: z.array(z.object({ id: z.string().min(1) })).min(1) });
const permissionSchema = z.object({
  permission: z.object({ status: z.string().optional(), expiration_time: z.number().optional() }).optional(),
  actions: z.array(z.object({ action_name: z.string(), can_perform_action: z.boolean() })).optional(),
});

/** An action's answer is not read (accept, reject, terminate): any 2xx body, as before. */
const ANY = z.unknown();

interface KapsoCallsOpts {
  fetch?: FetchLike;
  timeoutMs?: number;
}

export class KapsoCallsApi implements CallsApi {
  constructor(private readonly opts: KapsoCallsOpts = {}) {}

  async permission(line: CallingLine, to: string): Promise<CallPermissionFacts> {
    const q = new URLSearchParams({ user_wa_id: waTo(to) });
    const path = `${line.env.phoneNumberId}/call_permissions?${q}`;
    const res = await this.http(line).json({ path, schema: permissionSchema });
    const can = (name: string) => res.actions?.some((a) => a.action_name === name && a.can_perform_action) ?? false;
    const exp = res.permission?.expiration_time;
    return { canCall: can('start_call'), canRequest: can('send_call_permission_request'), expiresAt: exp ? new Date(exp * 1000).toISOString() : null };
  }

  async connect(line: CallingLine, input: { to: string; sdp: string; ref: string }): Promise<{ waCallId: string }> {
    const body = { ...base(), to: waTo(input.to), action: 'connect', session: { sdp_type: 'offer', sdp: input.sdp }, biz_opaque_callback_data: input.ref };
    const res = await this.post(line, body, connectSchema);
    return { waCallId: res.calls[0]?.id ?? '' };
  }

  async accept(line: CallingLine, input: { waCallId: string; sdp: string; ref: string }): Promise<void> {
    const session = { sdp_type: 'answer', sdp: input.sdp };
    await this.post(line, { ...base(), call_id: input.waCallId, action: 'pre_accept', session }, ANY);
    await this.post(line, { ...base(), call_id: input.waCallId, action: 'accept', session, biz_opaque_callback_data: input.ref }, ANY);
  }

  async reject(line: CallingLine, waCallId: string): Promise<void> {
    await this.post(line, { ...base(), call_id: waCallId, action: 'reject' }, ANY);
  }

  async terminate(line: CallingLine, waCallId: string): Promise<void> {
    await this.post(line, { ...base(), call_id: waCallId, action: 'terminate' }, ANY);
  }

  async requestPermission(
    line: CallingLine,
    input: PermissionRequest,
  ): Promise<{ waMessageId: string }> {
    const body = permissionRequestBody(input);
    const path = `${line.env.phoneNumberId}/messages`;
    const res = await this.http(line).json({ path, method: 'POST', json: body, schema: sentSchema });
    return { waMessageId: res.messages[0]?.id ?? '' };
  }

  private post<S extends z.ZodType>(
    line: CallingLine,
    body: Record<string, unknown>,
    schema: S,
  ): Promise<z.output<S>> {
    const path = `${line.env.phoneNumberId}/calls`;
    return this.http(line).json({ path, method: 'POST', json: body, schema });
  }

  private http(line: CallingLine): Http {
    const fetchLike = this.opts.fetch ?? fetch;
    const timeoutMs = this.opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    return graphHttp({ env: line.env, fetch: fetchLike, timeoutMs });
  }
}

const base = () => ({ messaging_product: 'whatsapp' });
