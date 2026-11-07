# CRM line template sync (platform side)

The CRM (github.com/AhmedAmiin0/ayat-crm, private; hosted at crm.ayatalbayan.com) now exposes GET /api/v1/templates (scope templates:read; ?sync=1 pulls from Meta first; envelope {data:[{name,language,status,category,meta_template_id,quality_score,rejection_reason,...}], meta:{next_cursor,sync}}) and POST /api/v1/templates (scope templates:write; body = the CRM dashboard TemplatePayload; 201 {data:{meta_template_id,status,template,dry_run}}). Deployed 2026-11-06. Errors: 401 unauthorized, 403 missing scope, 400 whatsapp_not_configured/bad_request, 429 meta_rate_limited, 502 meta_error.

## What is built (2026-11-07)

- Server (commit 7957a51): `drivers/crm/crm-templates.ts` (list + submit body), `crm.client.ts` getTemplates /
  submitTemplate (404 → `crm_managed`; a rejected row with a `meta_id` refused before any call),
  `crmSyncPatch` (status only by `crmTemplateName` / `crmTemplateLanguage`), `template-submit.ts` (409
  `crm_managed` only for a document header), the verifier syncing a line saved as crm, and «قالب جديد» →
  «إرسال إلى ميتا» on a crm line.
- «القوالب» rows (this PR): an existing crm row shows «إرسال إلى ميتا» exactly when the API accepts it
  (`apps/web/.../templates/crm/crm-submit.ts`: not_submitted, missing, or rejected without a `meta_id`; never a
  document header). Otherwise it says why: «تُنشأ في لوحة CRM» (document header: no sample PDF upload) or
  «تُعدَّل في لوحة CRM» (rejected on Meta: the CRM API has no edit). The hand-set «علِّمه معتمدًا / غير متاح»
  and the CRM name buttons stay as the fallback; the status note reads «عبر نظام CRM».
- «مزامنة»: unchanged route (`POST /messaging/templates/health {line}`). A row found under its OWN name
  (renewal_due, PENDING in the CRM → pending) also takes Meta's template id from the CRM, so a template the
  CRM shows rejected is offered for editing in the CRM, never created twice. Another name's id is never kept.
- Missing scopes: a CRM 403 naming a scope keeps it (`WaError.info.missingScope`). The sync reads
  `crm_scope_missing` (message = the scope), a submit answers 502 `crm_scope_missing {scope}`; the web says
  «ينقص مفتاح واجهة نظام CRM صلاحية templates:read: أنشئ في نظام CRM مفتاحًا يملكها، واحفظه في «التواصل» ←
  «الحماية» ← «مفتاح واجهة نظام CRM»…». A 403 naming no scope stays `crm_auth`. «افحص الخطوط» shows the
  template scopes the key lacks from the GET /me it already makes (`crm_template_scopes_missing`).

## Platform changes (design, verified against develop)

- NEW apps/api/src/modules/messaging/whatsapp/drivers/crm/crm-templates.ts (about 60 lines). It lists the CRM's templates as a MetaTemplate[] and builds the CRM submit body. Its own imports only: zod, @ab/shared (crmTemplateName, crmTemplateLanguage), templateButtons/templateDisplay from messages/wa-json, bodyExamples from template-review, WaError/MetaTemplate/TemplateRow from whatsapp.types, crmJson/CrmConn from ./crm-http. Sketch:
  /** ponytail: one page of 100 (crmJson keeps `data` only; the academy has ~12). Page on meta.next_cursor past that. */
  const LIST_PATH = 'templates?sync=1&limit=100';
  const rowSchema = z.object({ name: z.string(), language: z.string(), status: z.string(), category: z.string().nullish(), meta_template_id: z.string().nullable(), quality_score: z.string().nullable(), rejection_reason: z.string().nullable() });
  const savedSchema = z.object({ meta_template_id: z.string(), status: z.string() });
  const toMeta = (r: z.infer<typeof rowSchema>): MetaTemplate => ({ id: r.meta_template_id ?? '', name: r.name, language: r.language, status: r.status, category: r.category ?? '', quality: r.quality_score, components: [], rejectedReason: r.rejection_reason });
  /** The CRM's rows after it re-syncs from Meta. DRAFT was never on Meta, so it reads as absent. */
  export async function crmTemplates(conn: CrmConn): Promise<MetaTemplate[]> {
    const rows = z.array(rowSchema).safeParse(await crmJson(conn, { path: LIST_PATH }));
    if (!rows.success) throw new WaError('the CRM answered an unreadable template list', { code: null, status: 200 });
    return rows.data.filter((r) => r.status.toUpperCase() !== 'DRAFT').map(toMeta);
  }
  /** The CRM dashboard's TemplatePayload, under the name and language the sends and the sync use. */
  export function crmTemplatePayload(row: TemplateRow) {
    const head = row.header_format === 'document' ? null : templateDisplay(row.display)?.header;
    const header = head?.type === 'text' && head.text ? { header_type: 'text', header_content: head.text } : {};
    const examples = bodyExamples(row);
    return { name: crmTemplateName(row), language: crmTemplateLanguage(row), category: row.category.charAt(0).toUpperCase() + row.category.slice(1), ...header, body_text: row.body_ar, ...(row.footer_ar ? { footer_text: row.footer_ar } : {}),
      buttons: templateButtons(row.buttons).map((b) => b.type === 'url' ? { type: 'URL', text: b.text ?? '', url: b.url, ...(b.url.includes('{{1}}') ? { example: b.url.replace('{{1}}', 'sample') } : {}) } : { type: 'QUICK_REPLY', text: b.text }),
      ...(examples.length ? { sample_values: { body: examples } } : {}) };
  }
  export async function crmSubmit(conn: CrmConn, row: TemplateRow): Promise<{ metaId: string; status: string }> {
    const saved = savedSchema.safeParse(await crmJson(conn, { path: 'templates', method: 'POST', body: crmTemplatePayload(row) }));
    if (!saved.success) throw new WaError('the CRM answered without a meta_template_id', { code: null, status: 201 });
    return { metaId: saved.data.meta_template_id, status: saved.data.status };
  }
  The name and language must come from crmTemplateName/crmTemplateLanguage. wabaMatch looks rows up the same way, so any other name would leave the submitted template unmatched on every later sync.

- EDIT apps/api/src/modules/messaging/whatsapp/drivers/crm/crm.client.ts (124 lines now, about 135 after). Replace getTemplates and submitTemplate (lines 87-93). Both methods become async so that an error thrown by connection() comes back as a rejected promise. The 404 mapping lives here, not in crm-templates.ts, so the crmUnsupported import does not create a cycle:
  /** A CRM without /templates (404: overlay not deployed) answers as before: not supported by the crm driver. */
  const older = (what: string) => (e: unknown): never => { throw e instanceof WaError && e.info.status === 404 ? crmUnsupported(what) : e; };
  ...
    /** The CRM's rows after it re-syncs them from Meta (GET templates?sync=1). */
    async getTemplates(): Promise<MetaTemplate[]> { return crmTemplates(this.connection()).catch(older('the template list')); }
    /** Created through the CRM's submit. A rejected one is edited in the CRM (its API has no edit). */
    async submitTemplate(template: TemplateRow): Promise<{ metaId: string; status: string }> {
      if (template.status === 'rejected' && template.meta_id) throw crmUnsupported('editing a rejected template');
      return crmSubmit(this.connection(), template).catch(older('template submit'));
    }
  Also update the file header comment, which currently says only sending is supported.

- EDIT apps/api/src/modules/messaging/whatsapp/templates/names/template-waba-match.ts. Add after mappedPatch:
  /** A crm line's row: status, quality and reason only, found by the name it is sent under. The CRM lists no components, so body, footer and display stay ours (syncPatch would blank footer_ar and display). If the CRM has no such template, only last_checked_at changes. That keeps the old contract that nothing is marked missing because of the CRM: report_ready, or a key without crm_name, would otherwise stop sending. A real absence is still caught on send by TemplateMissing (132001). */
  export function crmSyncPatch(row: TemplateRow, list: List, now: Date): TemplatePatch {
    const { meta } = wabaMatch(row, list);
    return meta ? mappedPatch(meta, now) : { last_checked_at: now.toISOString() };
  }

- EDIT apps/api/src/modules/messaging/whatsapp/templates/sync/template-line-sync.ts. Delete line 41 (the crm_managed early return); the not_configured check stays. After readList:
    const crm = facts.provider === 'crm';
    const patch = crm ? crmSyncPatch : wabaSyncPatch;
    const rows = await deps.queries.all();
    let synced = 0;
    for (const row of rows.filter((r) => r.line === line)) { if (await deps.queries.update(row.key, patch(row, list, now))) synced += 1; }
    // A crm line imports nothing: the CRM account's other templates are not the platform's to send.
    if (crm) return { ...facts, ok: true, checked_at: now.toISOString(), meta_count: list.length, synced, imported: [], skipped: [] };
    ...newStarters as today.
  With an older CRM, readList still yields error 'crm_managed', through crmUnsupported → readError → graphHttpError, and no rows are touched. A missing templates:read scope gives 403 → credential 'crm' → error crm_auth on the line. Update the docblock.

- EDIT apps/api/src/modules/messaging/whatsapp/templates/sync/template-verifier.ts:23: wantsSync = (saved) => (saved.provider === 'meta' || saved.provider === 'crm') && syncOn(). Saving a line as crm then syncs it once. Change the log text at :71 from 'saved as meta' to `saved as ${saved.provider}`. failedLine stays as it is.

- EDIT apps/api/src/modules/messaging/whatsapp/templates/sync/template-submit.ts:35. Change the crm 409 so it applies only to document headers:
    if (onCrm(row.line) && row.header_format === 'document') throw waHttpError(CRM_MANAGED, 409, { line: row.line });
  The CRM can upload only image samples, and canUploadSamples() is false on crm. Keep the onCrm and CRM_MANAGED imports. Every other step is unchanged: SUBMITTABLE, templateProblem, requireLine, then client.submitTemplate(row), which now goes to the CRM, then status/meta_id/submitted_at and the audit entry template_submitted.

- LEAVE apps/api/src/modules/messaging/whatsapp/templates/sync/template-number-sync.ts unchanged. Module mode is out of scope: the crm_managed return at :66 and the sameWaba filter at :70 stay.

- WEB apps/web/src/features/messaging/templates/lines/TemplateLineBlock.tsx: the button condition `{!off && !crm && (` becomes `{!off && (`, and the comment at :85 is updated. LineBody: always render <LastSync/> and {shown && <LineSyncResult sync={shown}/>}. For crm, also render the crmManaged note and <CrmTemplateCheck line={line}/>. Keep CrmStatusActions as the manual fallback.

- WEB apps/web/src/features/messaging/templates/create/NewTemplate.tsx:30: `if (!onCrm(tpl.line)) onSubmit(tpl);` becomes `onSubmit(tpl);`, so the «إرسال إلى ميتا» confirm opens on crm lines too. Fix the docblock at :19-22. CreateTemplateDialog still shows crmNote with the new text below.

- I18N packages/shared/i18n/ar.json and en.json (same keys; clear Modern Standard Arabic per rule 10). templates.perNumber.crmManaged (:3414) → ar: «قوالب هذا الرقم في نظام CRM: زر «مزامنة» يقرأ حالاتها منه بعد مزامنته مع ميتا، ويُرسَل القالب الجديد للمراجعة عبره.» en: "This number's templates live in the CRM: «Sync» reads their status from it after it syncs with Meta, and a new template is sent for review through it." templates.create.crmNote (:3654) → ar: «قوالب هذا الرقم تُرسَل إلى ميتا عبر نظام CRM بالاسم المعروف لديه. بعد الحفظ أرسِله للمراجعة، ثم اضغط «مزامنة» لمعرفة حالته.» en to match.

- TESTS (rule 4; the new pure logic needs at least 80% coverage).
  Flip existing tests:
  - crm.client.test.ts:91: getTemplates and submitTemplate now make one request each. Expect GET templates?sync=1&limit=100, POST templates, a 404 mapped to unsupported:'crm', and a rejected row with meta_id refused before any request.
  - TemplateLineBlock.crm.test.tsx and TemplateHealth.crm.test.tsx: the sync button is now shown on crm.
  - template-line-sync tests: a crm line syncs status only and imports nothing.
  - templates.create.http.test.ts and template.submit*.test.ts: the crm 409 now applies only to document headers.
  Add new tests:
  - crm-templates.test.ts: toMeta mapping, the DRAFT filter, an unreadable list throwing WaError, and crmTemplatePayload using the crm_name/CRM_DEFAULT_NAMES name and language, the capitalised category, buttons, URL example and sample_values.
  - template-waba-match.test.ts, crmSyncPatch: a found mapped row gets status/quality/last_error and keeps footer_ar/display/body_ar; an absent row gets only last_checked_at.
  Then run pnpm turbo lint typecheck test e2e.

- DOCS docs/19-messaging-drivers.md:148-170: replace «what the CRM would need» with what is built: the overlay endpoints, the templates:read/write scopes, a crm line's «مزامنة» status-only by crmTemplateName, a submit through the CRM, a document header still made in the CRM, a rejected row edited in the CRM, and the manual approved/missing marks kept as a fallback.

## Owner steps

- 1. Deploy the CRM overlay first; a key can't carry a scope that doesn't exist yet. Copy the three files to /opt/wacrm/patches/src/lib/api-keys/scopes.ts, /opt/wacrm/patches/src/lib/api/v1/templates.ts and /opt/wacrm/patches/src/app/api/v1/templates/route.ts, add the three COPY lines to /opt/wacrm/docker-compose.yml, and run deploy-vps.sh. Check: GET https://<crm-host>/api/v1/templates with the current key should answer 403 forbidden "missing the 'templates:read' scope", not 404.
- 2. In the CRM dashboard, go to Settings → API keys and create a new key. Tick every scope the current platform key has (at least messages:send; GET /api/v1/me with the old key lists them) plus templates:read and templates:write. Scopes are fixed when a key is created, and the platform uses one WACRM_API_KEY for both sends and templates, so the new key replaces the old one.
- 3. In the platform, open «التكاملات» → the CRM group, paste the new key into WACRM_API_KEY (stored in Vault) and save. Leave WACRM_API_BASE as it is (https://<crm-host>/api/v1). Run «افحص الخطوط»: under the notifications line it must say the key may send and must NOT say «ينقص مفتاح واجهة نظام CRM صلاحية templates:read / templates:write». Revoke the old CRM key after the next step works.
- 4. Merge and deploy the platform PR, then press «مزامنة» on the crm number in «القوالب». Expected result: ok with meta_count equal to the CRM's template count, and statuses updated for the keys whose CRM name matches. If it says «ينقص مفتاح واجهة نظام CRM صلاحية templates:read» (crm_scope_missing), the saved key is still the old one or lacks the scope: redo steps 2-3. crm_auth means the key was refused. If it shows crm_managed, the CRM overlay isn't deployed.
- 5. For any key that kept a stale status (the CRM has no template under its crmTemplateName), set its CRM name with «اسم القالب في CRM» (PUT :key/crm-name) and sync again. report_ready is the likely one: set it to report_session if you want its status tracked.
- 6. To create a template on a crm number: «قالب جديد» → save → «إرسال إلى ميتا». An existing row that is not submitted, missing, or rejected without a Meta id also has «إرسال إلى ميتا» in the table. It goes through the CRM to Meta and comes back as pending; press «مزامنة» later to see it approved. Templates with a PDF/document header, and edits to rejected templates, are still done in the CRM dashboard (the row says so: «تُنشأ في لوحة CRM» / «تُعدَّل في لوحة CRM»).

## Risks

- Scope not offered when creating a key. The key UI (api-keys-settings.tsx:425) and normalizeScopes (scopes.ts:54-62) both read API_SCOPES, so the scopes.ts overlay is the whole fix. Without it, key creation returns 400 for the new scopes and requireApiKey('templates:read') fails `next build`. Every WACRM_SHA bump has to re-check that patch: if the copy goes stale, the next build either fails or silently drops scopes that were added upstream.
- Multi-account: the endpoints are scoped to the key's account. ctx.accountId comes only from the key row, every query filters .eq('account_id'), and whatsapp_config is UNIQUE(account_id), so there is one WABA and one token per account. Rows the API creates are attributed to the WhatsApp config owner (resolveAuditUserId). The CRM Settings template list filters by user_id, so other admins won't see those rows there. The inbox, broadcast and automation pickers do see them.
- Multi-account, legacy unique index (user_id, name, language): if two admins in one account already hold the same name and language (pre-existing bug #1), the lookup's .maybeSingle() errors. That template then lands in sync.errors and is skipped. An insert can collide when one person owns two accounts that share a template name. This is an edge case and the same as in the dashboard. The real fix is an upstream migration to a unique (account_id, name, language).
- Webhook status updates in the CRM still match only on meta_template_id across all accounts (template-webhook.ts:120-137). This is pre-existing and not touched here.
- Rate limits: the CRM budget is 120 requests per minute per key, in memory and per process, plus 6 ?sync=1 calls per minute per key. Each sync makes up to 20 Meta page calls. Meta allows 100 template creates per hour per WABA; going over returns 429 meta_rate_limited, which the platform treats as retry-after. The platform's crmJson timeout is 15 s, which a 20-page sync could exceed. The academy has about 12 templates, so this is 1 page today. A timeout reads as uncertain or failed on the line, and nothing is written on the platform side.
- GET ?sync=1 has side effects: it writes to the CRM database from a GET. It never sends messages. A 100-row single page is a deliberate ceiling, because crmJson drops meta.next_cursor.
- The manual «علِّمه معتمدًا / مفقود» marks race with the sync, since line-sync update() has no onlyIf. The next «مزامنة» overwrites a hand-set status whenever the CRM has the template. In the other direction, TemplateMissing's automatic «missing» mark is now restored by the next sync when the CRM shows the template as approved.
- A crm sync never marks a row missing, by design (crmSyncPatch). A key whose CRM template was deleted keeps its old status until a send fails with 132001 and TemplateMissing catches it. The CRM's own sync also never deletes local rows that are gone from Meta, so a deleted template can still read APPROVED in the CRM.
- The API submit no longer overwrites an existing row with DRAFT on a Meta failure; it records only submission_error. This deviates on purpose from the dashboard submit, to avoid losing the meta_template_id. If Meta accepts the template but the local save fails, the response is still 201 with template null; the next ?sync=1 repairs the row.
- Rows that are rejected (with a meta_id) or have a document header can't be resubmitted from the platform on a crm line. The CRM API has no edit endpoint and only image sample uploads. The platform returns 409 crm_managed and the admin finishes in the CRM dashboard.
- Deploy order matters. If the platform is deployed before the CRM overlay, the 404 is mapped to crm_managed, so behaviour stays as it is today. If the key lacks templates:read, «مزامنة» shows crm_scope_missing naming it and «افحص الخطوط» lists the missing template scopes; sends are unaffected.
- Verification: the CRM overlay was typechecked (tsc) and linted (eslint) against wacrm 98b5bd2, and scopes.test.ts passed 9/9, all in a temporary worktree that has since been removed. The platform sketches were not compiled, because the local checkout is behind origin/develop and its dependencies have drifted. The endpoints were not called against a live CRM.
