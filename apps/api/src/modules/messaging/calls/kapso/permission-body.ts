import { callPermissionMessage, waTo, type GraphBody } from '../../whatsapp';
import type { PermissionRequest } from './calls-api';

// The body of «اطلب إذن الاتصال» from the calls number (docs/28 §10): the interactive
// call_permission_request inside its 24 h window, else the approved template the setting names
// (calls_permission_template, «name» or «name:language», Arabic by default). No parameters: the
// template's text and its call-permission button are Meta's.

const TEMPLATE_RE = /^([a-z0-9_]{1,512})(?::([a-z]{2,3}(?:_[A-Z]{2})?))?$/;

/** The setting's value as a template name and language; null = unset or not a template name. */
export function permissionTemplate(value: string | null | undefined): { name: string; language: string } | null {
  const m = TEMPLATE_RE.exec((value ?? '').trim());
  return m?.[1] ? { name: m[1], language: m[2] ?? 'ar' } : null;
}

export function permissionRequestBody(input: PermissionRequest): GraphBody {
  if ('text' in input) return callPermissionMessage(input);
  const { name, language } = input.template;
  return {
    ...{ messaging_product: 'whatsapp', recipient_type: 'individual', to: waTo(input.to) },
    ...{ type: 'template', template: { name, language: { code: language } } },
  };
}
