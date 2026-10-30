import { z } from 'zod';
import { graphJson, type FetchLike, type GraphConn } from '../../whatsapp/drivers/meta/graph';
import { parsed } from '../../whatsapp/drivers/meta/meta-shapes';
import { waTo } from '../../whatsapp/messages/wa-components';
import { DEFAULT_TIMEOUT_MS } from '../../whatsapp/whatsapp.client';
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

interface KapsoCallsOpts {
  fetch?: FetchLike;
  timeoutMs?: number;
}

export class KapsoCallsApi implements CallsApi {
  constructor(private readonly opts: KapsoCallsOpts = {}) {}

  async permission(line: CallingLine, to: string): Promise<CallPermissionFacts> {
    const c = this.conn(line);
    const q = new URLSearchParams({ user_wa_id: waTo(to) });
    const res = parsed(permissionSchema, await graphJson(c, { path: `${line.env.phoneNumberId}/call_permissions?${q}` }));
    const can = (name: string) => res.actions?.some((a) => a.action_name === name && a.can_perform_action) ?? false;
    const exp = res.permission?.expiration_time;
    return { canCall: can('start_call'), canRequest: can('send_call_permission_request'), expiresAt: exp ? new Date(exp * 1000).toISOString() : null };
  }

  async connect(line: CallingLine, input: { to: string; sdp: string; ref: string }): Promise<{ waCallId: string }> {
    const body = { ...base(), to: waTo(input.to), action: 'connect', session: { sdp_type: 'offer', sdp: input.sdp }, biz_opaque_callback_data: input.ref };
    const res = parsed(connectSchema, await this.post(line, body));
    return { waCallId: res.calls[0]?.id ?? '' };
  }

  async accept(line: CallingLine, input: { waCallId: string; sdp: string; ref: string }): Promise<void> {
    const session = { sdp_type: 'answer', sdp: input.sdp };
    await this.post(line, { ...base(), call_id: input.waCallId, action: 'pre_accept', session });
    await this.post(line, { ...base(), call_id: input.waCallId, action: 'accept', session, biz_opaque_callback_data: input.ref });
  }

  async reject(line: CallingLine, waCallId: string): Promise<void> {
    await this.post(line, { ...base(), call_id: waCallId, action: 'reject' });
  }

  async terminate(line: CallingLine, waCallId: string): Promise<void> {
    await this.post(line, { ...base(), call_id: waCallId, action: 'terminate' });
  }

  async requestPermission(
    line: CallingLine,
    input: PermissionRequest,
  ): Promise<{ waMessageId: string }> {
    const body = permissionRequestBody(input);
    const path = `${line.env.phoneNumberId}/messages`;
    const res = parsed(sentSchema, await graphJson(this.conn(line), { path, method: 'POST', body }));
    return { waMessageId: res.messages[0]?.id ?? '' };
  }

  private post(line: CallingLine, body: Record<string, unknown>): Promise<unknown> {
    return graphJson(this.conn(line), { path: `${line.env.phoneNumberId}/calls`, method: 'POST', body });
  }

  private conn(line: CallingLine): GraphConn {
    return { env: line.env, fetch: this.opts.fetch ?? fetch, timeoutMs: this.opts.timeoutMs ?? DEFAULT_TIMEOUT_MS };
  }
}

const base = () => ({ messaging_product: 'whatsapp' });
