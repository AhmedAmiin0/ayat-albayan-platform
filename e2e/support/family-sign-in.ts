import { expect } from './fixtures';
import { API, setSetting } from './messages';
import { seedFamily, withSql } from './schedule';
import { STUB_URL, setMessaging, stubSent, stubTemplateStatus } from './wa-stub';

// Family accounts (docs/30): the account_code template on the stub, the switch, a fresh family, and the
// code as the stub captured it. Example data only; «Meta» is tools/wa-stub.

const TEMPLATE = 'account_code';
/** Codes leave from the CHAT line (owner 2026-10-29): the template lives on the chat WABA (= playwright.config.ts). */
const CHAT_WABA = 'e2e-chat-waba';

/** Codes can go out (two-line runs only: no chat line = no codes): the template exists and is approved (stub + DB), sending and family sign-in are on. */
export async function openCodes(): Promise<void> {
  const created = await fetch(`${STUB_URL}/v21.0/${CHAT_WABA}/message_templates`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer e2e-token' },
    body: JSON.stringify({
      name: TEMPLATE,
      language: 'ar',
      category: 'AUTHENTICATION',
      // Meta lists an approved authentication template with its fixed text ({{1}} = the code) and the
      // copy-code button as a URL button: the stub checks a send's body values against this text.
      components: [
        { type: 'BODY', text: 'رمز التحقق الخاص بك هو *{{1}}*. لا تشاركه مع أحد.', example: { body_text: [['123456']] } },
        {
          type: 'BUTTONS',
          buttons: [{ type: 'URL', text: 'نسخ الرمز', url: 'https://www.whatsapp.com/otp/code/?otp_type=COPY_CODE&code=otp{{1}}', example: ['https://www.whatsapp.com/otp/code/?otp_type=COPY_CODE&code=otp123456'] }],
        },
      ],
    }),
  });
  expect([200, 400]).toContain(created.status); // 400 = left from an earlier run
  await stubTemplateStatus(TEMPLATE, 'APPROVED', CHAT_WABA);
  await withSql((sql) => sql`update public.message_templates set status = 'approved' where key = ${TEMPLATE}`);
  await setMessaging(true);
  await setSetting('family_login_enabled', true);
}

/** The seeded state: the flag off (its default), the template not submitted, sending off. */
export async function closeCodes(): Promise<void> {
  await setSetting('family_login_enabled', false);
  await setMessaging(false);
  await withSql((sql) => sql`update public.message_templates set status = 'not_submitted' where key = ${TEMPLATE}`);
}

/** A guardian with one child: the guardian's phone and the child's AB- code. */
export async function family(): Promise<{ phone: string; code: string; guardianId: string; studentId: string }> {
  const f = await seedFamily(`أسرة ${Date.now() % 10_000}`, ['طالب الدخول']);
  const [studentId = ''] = f.studentIds;
  return withSql(async (sql) => {
    const [row] = await sql<{ phone: string; code: string }[]>`
      select g.phone_e164 as phone, s.code from public.students s join public.guardians g on g.id = s.guardian_id where s.id = ${studentId}`;
    if (!row) throw new Error('family not written');
    return { ...row, guardianId: f.guardianId, studentId };
  });
}

/** The newest code the stub got for this phone (the template's body value). */
export async function codeSentTo(phone: string, after = 0): Promise<string> {
  const digits = phone.replace(/\D/g, '');
  let code = '';
  await expect
    .poll(async () => {
      const sent = (await stubSent()).filter((m) => m.template === TEMPLATE && m.to.replace(/\D/g, '') === digits).slice(after);
      const body = sent.at(-1)?.body as { template?: { components?: { type: string; parameters?: { text?: string }[] }[] } } | undefined;
      code = body?.template?.components?.find((c) => c.type === 'body')?.parameters?.[0]?.text ?? '';
      return code;
    }, { timeout: 30_000 })
    .toMatch(/^\d{6}$/);
  return code;
}

/** How many codes the stub got for this phone so far. */
export async function codesSent(phone: string): Promise<number> {
  const digits = phone.replace(/\D/g, '');
  return (await stubSent()).filter((m) => m.template === TEMPLATE && m.to.replace(/\D/g, '') === digits).length;
}

let visitor = 0;

/** A public POST from a visitor of its own (the API trusts one proxy hop): the per-IP buckets never fill across specs. */
export function post(path: string, body: unknown): Promise<Response> {
  visitor += 1;
  const ip = `198.51.${Math.floor(Date.now() / 1000) % 250}.${visitor % 250}`;
  return fetch(`${API}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(body) });
}
