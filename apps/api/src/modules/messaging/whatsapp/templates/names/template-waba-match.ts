import { CRM_REPORT_TEMPLATES, crmTemplateLanguage, crmTemplateName, isCrmReportName } from '@ab/shared';
import type { MetaTemplate, TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';
import {
  findMeta,
  ourStatus,
  syncPatch,
  type TemplatePatch,
} from '@/modules/messaging/whatsapp/templates/sync/template-sync';

// A meta line's sync by the WABA name a row goes as (docs/19 «CRM → Meta»): the same name and
// language every driver sends (crm_name / crm_language, else the old script's default, else
// meta_name). A key whose WABA template is approved reads approved, never missing because the
// platform's own meta_name is absent from the WABA. Pure.

interface WabaMatch {
  meta: MetaTemplate | undefined;
  /** Read by a WABA name other than the row's own meta_name + language. */
  mapped: boolean;
}

const named = (name: string, language: string) => (t: MetaTemplate): boolean =>
  t.name === name && t.language === language;

/**
 * The WABA template the row goes as: by its other WABA name when it has one (absent = missing,
 * never its meta_name: the sends go by the WABA name, so a fallback would flip approved ↔
 * missing on every sync), else its own.
 */
export function wabaMatch(row: TemplateRow, list: readonly MetaTemplate[]): WabaMatch {
  const name = crmTemplateName(row);
  const language = crmTemplateLanguage(row);
  const other = name !== row.meta_name || language !== row.language;
  if (!other) return { meta: findMeta(row, list), mapped: false };
  return { meta: list.find(named(name, language)), mapped: true };
}

/**
 * Status, quality and the rejection reason only: the WABA template's own body, buttons and id
 * belong to another name (teacher_lesson_v2 has four values), so the row keeps its own shapes and
 * its meta_id (a resubmit edits the platform's template, never the WABA's other one).
 */
function mappedPatch(meta: MetaTemplate, now: Date): TemplatePatch {
  const status = ourStatus(meta.status);
  const last_error = status === 'rejected' ? meta.rejectedReason : null;
  return { last_checked_at: now.toISOString(), status, quality: meta.quality, last_error };
}

type List = readonly MetaTemplate[];

/** One row after a meta line's sync: by its WABA name (status only) or its own (syncPatch). */
export function wabaSyncPatch(row: TemplateRow, list: List, now: Date): TemplatePatch {
  const { meta, mapped } = wabaMatch(row, list);
  return mapped && meta ? mappedPatch(meta, now) : syncPatch(row, meta, now);
}

/**
 * A crm line's row (docs/39): status, quality and reason (and its own template's id), found by
 * the name it is sent under. The CRM lists no components, so body, footer and display stay ours
 * (syncPatch would blank footer_ar and display). If the CRM has no such template, only
 * last_checked_at changes:
 * nothing is marked missing because of the CRM (report_ready, or a key without crm_name, would
 * otherwise stop sending). A real absence is still caught on send by TemplateMissing (132001).
 */
export function crmSyncPatch(row: TemplateRow, list: List, now: Date): TemplatePatch {
  const { meta, mapped } = wabaMatch(row, list);
  const checked = { last_checked_at: now.toISOString() };
  return meta ? { ...mappedPatch(meta, now), ...ownId(meta, mapped) } : checked;
}

/**
 * Meta's id of the row's OWN template (its meta_name + language, renewal_due) as the CRM lists it:
 * a rejected one then reads «edit it in the CRM», never a second create. Another name's id is not
 * the row's (mappedPatch), and a row the CRM lists without an id keeps its own.
 */
const ownId = (meta: MetaTemplate, mapped: boolean): TemplatePatch =>
  (meta.id && !mapped ? { meta_id: meta.id } : {});

/**
 * Every WABA name + language («name:language») a row stands for: its own, its WABA name and, for
 * the old script's report, both report templates. The import never takes these as new rows.
 */
export function wabaNames(row: TemplateRow): string[] {
  const language = crmTemplateLanguage(row);
  const name = crmTemplateName(row);
  const reports = isCrmReportName(name) ? Object.values<string>(CRM_REPORT_TEMPLATES) : [];
  const names = [name, ...reports].map((n) => `${n}:${language}`);
  return [`${row.meta_name}:${row.language}`, ...names];
}
