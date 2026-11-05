import { CRM_DEFAULT_NAMES, crmTemplateLanguage, crmTemplateName, type CrmValues } from '@ab/shared';
import {
  bodyValues,
  buttonValues,
  documentHeader,
} from '@/modules/messaging/whatsapp/messages/wa-components';
import { WaError, type TemplateSend } from '@/modules/messaging/whatsapp/whatsapp.types';

// One template-name resolution for every driver of a line (docs/19 «CRM → Meta»): the WABA name
// and language (message_templates.crm_name / crm_language, else the old script's default, else
// meta_name) and the values that template takes. The crm driver posts it to the CRM, the meta
// driver builds Graph components from it: the same template and values on either driver. Pure.

/** A send-time value by the button's index: a URL suffix ({{1}}) or a quick-reply payload. */
export interface WabaButton {
  index: number;
  kind: 'url' | 'quick_reply';
  value: string;
}

/** What goes to the WABA for one template send. */
export interface WabaTemplate {
  name: string;
  language: string;
  /** The body's {{1}}…{{n}} in order; [] = none. */
  body: string[];
  /** A document header (the 7-day signed Storage URL and its file name); null = none. */
  header: { link: string; filename?: string } | null;
  buttons: WabaButton[];
}

/** The old script's name for this key (CRM_DEFAULT_NAMES), not one an admin set. */
const byDefault = (t: TemplateSend['template']): boolean =>
  !t.crm_name && crmTemplateName(t) === CRM_DEFAULT_NAMES[t.key];

/**
 * The WABA name for this row: crmTemplateName, except that the old script's default
 * (teacher_lesson_v2, teacher_lesson_reminder) needs the producer's WABA values; a row without them
 * (queued before they existed, or a value missing) keeps meta_name and its own values. An admin's
 * crm_name is always sent as set.
 */
export function wabaName(input: TemplateSend): string {
  const { template } = input;
  const fallback = byDefault(template) && !input.params.crm?.body;
  return fallback ? template.meta_name : crmTemplateName(template);
}

/**
 * The producer's WABA values (params.crm) fit only the WABA's OWN template: the old script's
 * default, even when it is the meta name as well (teacher_lesson_reminder), or an admin's crm_name
 * other than meta_name. When the row goes by its meta name otherwise, its own values go, or a
 * 3-variable template would get 5.
 */
function ownValues(input: TemplateSend): CrmValues | undefined {
  const { template, params } = input;
  if (byDefault(template)) return params.crm?.body ? params.crm : undefined;
  return wabaName(input) === template.meta_name ? undefined : params.crm;
}

/** The producer's URL suffixes (params.crm.buttons; [] = none), else the row's own buttons. */
function wabaButtons(input: TemplateSend): WabaButton[] {
  const own = ownValues(input)?.buttons;
  if (!own) return buttonValues(input);
  return own.map((value, index) => ({ index, kind: 'url', value }));
}

/**
 * The template as the WABA takes it. The row's own checks (bodyValues, documentHeader,
 * buttonValues) always run, so a row one driver refuses is refused by the other too.
 */
export function wabaTemplate(input: TemplateSend): WabaTemplate {
  const own = bodyValues(input.template, input.params);
  return {
    name: wabaName(input),
    language: crmTemplateLanguage(input.template),
    body: ownValues(input)?.body ?? own,
    header: documentHeader(input),
    buttons: wabaButtons(input),
  };
}

/** A refused template send keeps the name the WABA was asked for (template-missing.ts reads it). */
export function sentAs(error: unknown, name: string): unknown {
  if (!(error instanceof WaError)) return error;
  return new WaError(error.message, { ...error.info, template: name });
}
