# Evolution API kit (secondary WhatsApp number)

The **Evolution** driver is described in `docs/19-messaging-drivers.md` («Evolution driver»).
This folder is a **kit only**. It is not part of any deploy workflow. Nothing starts until the
owner runs it. The kit creates **no** WhatsApp instance: an instance exists only after an admin
saves the number in «الأرقام» and scans its QR.

> **Ban risk (Baileys mode).** Baileys is an unofficial WhatsApp Web connection, and WhatsApp
> may ban a number that uses it. Use it only for a **separate secondary number**, never the
> academy's main or notifications number. Keep «السماح بالإشعارات التلقائية» off, so that only
> staff chat messages go out. Keep the number's send gap («إعدادات Evolution» › `limits.gap_ms`, default 3000 ms).

## Image pin (why not 2.3.7)

Released images `v2.3.7` and `2.4.0-rc2` ship Baileys `7.0.0-rc.9`, which lacks the
trusted-contact token: sends from a fresh session fail with WhatsApp error **463**. The kit pins
`homolog@sha256:1e656f95…a549`, built from `develop` commit `e273b904` (image label
`org.opencontainers.image.revision`), whose `package-lock.json` resolves Baileys `7.0.0-rc13`.
That build is Evolution **2.4.0**: it answers `503 LICENSE_REQUIRED` until activated once (§1)
and then sends a licensing heartbeat. Move to a release tag with Baileys ≥ rc13 once one ships.

## 1. Run it on the VPS (owner)

```sh
sudo mkdir -p /opt/evolution && cd /opt/evolution
# copy docker-compose.yml and .env.example from this folder, then:
cp .env.example .env && chmod 600 .env   # fill in the placeholders
docker compose up -d
docker compose ps                          # evolution-api up, port 127.0.0.1:8085
```

- **Network.** The kit creates the docker network `ayat-evolution`. The platform API container
  must join it (in the platform's compose: `networks: { evolution: { external: true,
  name: ayat-evolution } }` on the API service). The API then reaches the service name:
  `http://evolution-api:8080`. Evolution posts its events back to the platform at
  `http://ayat-lb:8080/webhooks/evolution/<instance>` (the «internal» origin), so `ayat-lb` joins the
  same network too (or choose the «public» origin, `API_PUBLIC_URL`, in «إعدادات Evolution»). The
  kit's Postgres and Redis stay on its private network.
- **Host port.** `127.0.0.1:8085` only, never public. Reach the manager UI with an SSH tunnel
  (`ssh -L 8085:127.0.0.1:8085 <vps>`, then `http://localhost:8085/manager`).
- **Activation (2.4.0).** Open `/manager` once through the tunnel and complete the license
  registration. Until then every API call answers 503.
- **Memory.** `mem_limit` 512 MB API + 256 MB Postgres + 64 MB Redis (Redis capped at 48 MB).
  Check with `docker stats` after the first QR scan and raise the API limit only if it nears it.

## 2. Connect it in the platform (admin)

1. «التكاملات» › Evolution: set `EVOLUTION_API_BASE` to `http://evolution-api:8080`, and add
   `evolution-api` to the allowed internal http hosts (plain http is refused otherwise). Save
   `EVOLUTION_API_KEY` (the `AUTHENTICATION_API_KEY` from `.env`) as a secret.
   The send gap is per number («إعدادات Evolution» › `limits.gap_ms`, default 3000).
2. «الأرقام» › add a number: role «المحادثات», driver **Evolution**, an instance name (for
   example `secondary-1`), the connection type (Baileys or Cloud), and the **instance token** as
   the number's secret. Leave the number **disabled** for now. On save, the platform API creates
   the instance and pushes its webhook, settings and proxy itself:
   - webhook URL built by the platform (never typed): `http://ayat-lb:8080/webhooks/evolution/<instance>`
     (internal) or `<API_PUBLIC_URL>/webhooks/evolution/<instance>` (public);
   - header `x-evolution-token: <instance token>`, checked in constant time.
3. On the number's card, press **QR** and scan it with the secondary phone (WhatsApp › Linked
   devices › Link a device). Then press «افحص الاتصال»: it must say «متصل».
4. Send one test message to a number in `WA_ALLOWED_RECIPIENTS`. Then enable the number. Make it
   the role's default only if every chat should go out from it.

For Meta's Cloud API through Evolution, pick the Cloud connection type with Meta's ids and token.
That mode keeps Meta's 24 h window and templates.

To go back, disable the number, or switch its driver back. Nothing else changes.
