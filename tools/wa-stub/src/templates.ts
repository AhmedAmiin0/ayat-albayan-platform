// Template create (POST /{waba}/message_templates) and edit (POST /{template id}) with the checks a
// real submission fails on: a media header without an uploaded sample's handle, a body variable
// without an example, a variable at the very start or end of the body, a quick-reply text over 25
// characters.
import { randomUUID } from 'node:crypto';
import { stubLines } from './lines.ts';
import { defaultChatTemplates, defaultTemplates, ERR, onWaba, type Json, type StubTemplate } from './providers/meta.ts';
import type { Reply, StubOptions, StubState } from './state.ts';

/** createStub's and /__stub/reset's templates: the given (or default) ones, plus the chat line's starter. */
export function initialTemplates(opts: StubOptions): StubTemplate[] {
  const chat = stubLines(opts)[1];
  return [...(opts.templates ?? defaultTemplates()), ...(chat ? defaultChatTemplates(chat.wabaId) : [])];
}

const MEDIA_HEADERS = new Set(['DOCUMENT', 'IMAGE', 'VIDEO']);

const example = (c: Json, field: string): unknown => (c['example'] as Json | undefined)?.[field];

function headerError(s: StubState, c: Json): Json | null {
  if (!MEDIA_HEADERS.has(String(c['format'] ?? ''))) return null;
  const handles = example(c, 'header_handle');
  const h: unknown = Array.isArray(handles) ? handles[0] : undefined;
  if (typeof h !== 'string') return ERR.invalid('component of type HEADER is missing expected field(s) (example.header_handle)');
  return s.handles.has(h) ? null : ERR.invalid(`header_handle ${h} is not an uploaded file`);
}

function bodyError(c: Json): Json | null {
  const text = String(c['text'] ?? '').trim();
  if (/^\{\{\d+\}\}|\{\{\d+\}\}$/.test(text)) return ERR.invalid("Variables can't be at the start or end of the template.");
  const vars = new Set(text.match(/\{\{\d+\}\}/g) ?? []).size;
  if (!vars) return null;
  const rows = example(c, 'body_text');
  const values: unknown = Array.isArray(rows) ? rows[0] : undefined;
  const ok = Array.isArray(values) && values.length === vars && values.every((v) => typeof v === 'string' && v.trim());
  return ok ? null : ERR.invalid(`component of type BODY needs example.body_text with ${vars} values`);
}

/** Meta's button limits: at most 10, a QUICK_REPLY text 1..25 characters (lesson_rating has 3). */
function buttonsError(c: Json): Json | null {
  const buttons = Array.isArray(c['buttons']) ? (c['buttons'] as Json[]) : [];
  if (buttons.length > 10) return ERR.invalid('a template can have at most 10 buttons');
  const bad = buttons.find((b) => b['type'] === 'QUICK_REPLY' && !/^.{1,25}$/u.test(String(b['text'] ?? '')));
  return bad ? ERR.invalid(`button text "${String(bad['text'] ?? '')}" must be 1-25 characters`) : null;
}

function componentError(s: StubState, c: Json): Json | null {
  if (c['type'] === 'HEADER') return headerError(s, c);
  if (c['type'] === 'BODY') return bodyError(c);
  return c['type'] === 'BUTTONS' ? buttonsError(c) : null;
}

function componentsError(s: StubState, components: Json[]): Json | null {
  for (const c of components) {
    const err = componentError(s, c);
    if (err) return err;
  }
  return null;
}

const componentsOf = (body: Json): Json[] => (Array.isArray(body['components']) ? (body['components'] as Json[]) : []);

/**
 * The WABA a created template lives on: the path's, when it is a configured line's (as on Meta, the
 * other number never lists it); a path no line owns (lenient single-line tests) = every WABA, as before.
 */
const ownWaba = (s: StubState, wabaId: string): string | undefined =>
  stubLines(s.opts).some((l) => l.wabaId === wabaId) ? wabaId : undefined;

export function createTemplate(s: StubState, input: { body: Json; wabaId: string }): Reply {
  const { body } = input;
  const name = String(body['name'] ?? '');
  const language = String(body['language'] ?? 'ar');
  const wabaId = ownWaba(s, input.wabaId);
  if (!/^[a-z0-9_]{1,512}$/.test(name)) return [400, ERR.badName(name)];
  if (s.templates.some((t) => t.name === name && t.language === language && onWaba(t, input.wabaId))) return [400, ERR.duplicate(name)];
  const components = componentsOf(body);
  const invalid = componentsError(s, components);
  if (invalid) return [400, invalid];
  const category = String(body['category'] ?? 'UTILITY').toUpperCase();
  const t: StubTemplate = { id: randomUUID(), name, language, category, status: 'PENDING', quality: 'UNKNOWN', components, ...(wabaId ? { wabaId } : {}) };
  s.templates.push(t);
  return [200, { id: t.id, status: t.status, category }];
}

/** POST /{template id}: Meta's edit of a rejected / paused template; it goes back to review. */
export function editTemplate(s: StubState, id: string, body: Json): Reply {
  const t = s.templates.find((x) => x.id === id);
  if (!t) return [400, ERR.noObject(id)];
  if (Array.isArray(body['components'])) {
    const invalid = componentsError(s, componentsOf(body));
    if (invalid) return [400, invalid];
    t.components = componentsOf(body);
  }
  if (typeof body['category'] === 'string') t.category = body['category'].toUpperCase();
  t.status = 'PENDING';
  return [200, { success: true }];
}

/**
 * POST /__stub/templates/{name}: Meta's review result. `waba` picks the template on that WABA (the
 * same name may exist on both numbers); `rejected_reason` is what GET message_templates then answers.
 */
export function reviewTemplate(s: StubState, input: { name: string; body: Json }): Reply {
  const { name, body } = input;
  const waba = typeof body['waba'] === 'string' ? body['waba'] : undefined;
  const named = s.templates.filter((x) => x.name === name && (!waba || onWaba(x, waba)));
  const t = named.find((x) => x.wabaId === waba) ?? named[0];
  if (!t) return [404, { error: `no template ${name}${waba ? ` on ${waba}` : ''}` }];
  t.status = String(body['status'] ?? t.status);
  t.quality = String(body['quality'] ?? t.quality);
  if (typeof body['rejected_reason'] === 'string') t.rejectedReason = body['rejected_reason'];
  return [200, t];
}
