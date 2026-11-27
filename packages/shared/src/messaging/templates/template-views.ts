import type { TemplateCategory, TemplateStatus, WaLine } from '@ab/catalog';
import type { TemplateDisplay } from './template-block';
import type { TemplateButton } from './templates';

// Moved out of views.ts (150-line cap, docs/12 §13.8).

/** GET /messaging/templates item: one message_templates row. */
export interface TemplateView {
  key: string;
  meta_name: string;
  language: string;
  category: TemplateCategory;
  header_format: 'document' | null;
  body_ar: string;
  footer_ar: string | null;
  /** Names of {{1}}, {{2}}, … in order. */
  params: string[];
  buttons: TemplateButton[];
  /** What WhatsApp shows (header, every button) as Meta's sync reported it; null = not synced yet. Absent from older APIs. */
  display?: TemplateDisplay | null;
  status: TemplateStatus;
  quality: string | null;
  meta_id: string | null;
  last_checked_at: string | null;
  last_error: string | null;
  submitted_at: string | null;
  /** The line (WABA) Meta approved it on: the sender sends it from there (docs/12 §13.3). */
  line: WaLine;
  /** On the restricted allow-list: the only templates a role without templates.send_all may list or send (docs/16 §15). */
  sales_starter: boolean;
  /** The template's own number (docs/23 phase 5); null = its role's default. Absent from older APIs. */
  number_id?: string | null;
  /** Its approval on each number synced so far (one Meta template per WABA). Absent from older APIs. */
  numbers?: TemplateNumberApproval[];
  /** The CRM's name / language when its line is on crm (docs/19); null = the default. Absent from older APIs. */
  crm_name?: string | null;
  crm_language?: string | null;
  /** Who wrote it here (sales authoring); null = seeded or imported. */
  created_by?: string | null;
  /** Its edits on Meta while approved, last 30 days (Meta's edit limits, edit-limits.ts). */
  approved_edits?: string[];
}

/** One (template, number) approval: message_template_numbers. */
export interface TemplateNumberApproval {
  number_id: string;
  status: TemplateStatus;
  last_checked_at: string | null;
  last_error: string | null;
}

