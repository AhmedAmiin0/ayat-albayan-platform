import { createCipheriv, createDecipheriv, createECDH, hkdfSync, randomBytes } from 'node:crypto';

// RFC 8291 message encryption for Web Push, content coding aes128gcm (RFC 8188), with node:crypto
// only (no web-push dependency). One record: the payload is small (≤ 4 KB with the padding byte).

/** PushSubscription.toJSON().keys: the browser's P-256 public key and its 16-byte auth secret, base64url. */
interface WebPushKeys {
  p256dh: string;
  auth: string;
}

/** The application server's ephemeral key pair and the salt; fixed only in tests (the RFC vector). */
interface EncryptionSecrets {
  /** 32-byte P-256 private key. */
  serverPrivateKey: Buffer;
  /** 16 bytes. */
  salt: Buffer;
}

const RECORD_SIZE = 4096;
/** One record of the 4096-byte record size: 4096 − 16 (tag) − 1 (delimiter). */
export const MAX_PLAINTEXT = RECORD_SIZE - 17;

const b64 = (s: string) => Buffer.from(s, 'base64url');
const hkdf = (k: { salt: Buffer; ikm: Buffer; info: Buffer; length: number }) =>
  Buffer.from(hkdfSync('sha256', k.ikm, k.salt, k.info, k.length));

function contentKeys(ikm: Buffer, salt: Buffer): { cek: Buffer; nonce: Buffer } {
  return {
    cek: hkdf({ salt, ikm, info: Buffer.from('Content-Encoding: aes128gcm\0'), length: 16 }),
    nonce: hkdf({ salt, ikm, info: Buffer.from('Content-Encoding: nonce\0'), length: 12 }),
  };
}

/** RFC 8291 §3.4: IKM from the ECDH secret, keyed by the auth secret and both public keys. */
function inputKey(input: { secret: Buffer; auth: Buffer; uaPublic: Buffer; asPublic: Buffer }): Buffer {
  const info = Buffer.concat([Buffer.from('WebPush: info\0'), input.uaPublic, input.asPublic]);
  return hkdf({ salt: input.auth, ikm: input.secret, info, length: 32 });
}

/**
 * The request body for one push: header (salt ‖ rs ‖ idlen ‖ the server's public key) followed by
 * the AES-128-GCM record (plaintext ‖ 0x02, then the tag). Fresh key pair and salt per message.
 */
export function encryptPayload(plaintext: Buffer, keys: WebPushKeys, secrets?: EncryptionSecrets): Buffer {
  if (plaintext.length > MAX_PLAINTEXT) throw new Error('web push payload too large');
  const uaPublic = b64(keys.p256dh);
  const ecdh = createECDH('prime256v1');
  if (secrets) ecdh.setPrivateKey(secrets.serverPrivateKey);
  else ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const salt = secrets?.salt ?? randomBytes(16);
  const ikm = inputKey({ secret: ecdh.computeSecret(uaPublic), auth: b64(keys.auth), uaPublic, asPublic });
  const { cek, nonce } = contentKeys(ikm, salt);
  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([plaintext, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(RECORD_SIZE, 16);
  header.writeUInt8(asPublic.length, 20);
  return Buffer.concat([header, asPublic, body]);
}

/** The browser's side (tests only): decrypts a body with the user agent's private key. */
export function decryptPayload(body: Buffer, ua: { privateKey: Buffer; auth: Buffer }): Buffer {
  const salt = body.subarray(0, 16);
  const idlen = body.readUInt8(20);
  const asPublic = body.subarray(21, 21 + idlen);
  const record = body.subarray(21 + idlen);
  const ecdh = createECDH('prime256v1');
  ecdh.setPrivateKey(ua.privateKey);
  const ikm = inputKey({ secret: ecdh.computeSecret(asPublic), auth: ua.auth, uaPublic: ecdh.getPublicKey(), asPublic });
  const { cek, nonce } = contentKeys(ikm, salt);
  const decipher = createDecipheriv('aes-128-gcm', cek, nonce);
  decipher.setAuthTag(record.subarray(record.length - 16));
  const padded = Buffer.concat([decipher.update(record.subarray(0, record.length - 16)), decipher.final()]);
  return padded.subarray(0, padded.lastIndexOf(2));
}
