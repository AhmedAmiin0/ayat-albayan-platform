# Evolution API kit (secondary WhatsApp number)

The **Evolution** driver is described in `docs/19-messaging-drivers.md` («Evolution driver»).
This folder is a **kit only**. It is not part of any deploy workflow. Nothing starts until the
owner runs it. No academy line uses it until an admin chooses «Evolution» for a number.

> **Ban risk (Baileys mode).** Baileys is an unofficial WhatsApp Web connection, and WhatsApp
> may ban a number that uses it. Use it only for a **separate secondary number**, never the
> academy's main or notifications number. Keep «السماح بالإشعارات التلقائية» off, so that only
> staff chat messages go out. Keep the send gap (`EVOLUTION_SEND_GAP_MS`, default 3 s).

## 1. Run it on the VPS (owner)

```sh
sudo mkdir -p /opt/evolution && cd /opt/evolution
# copy docker-compose.yml and .env.example from this folder, then:
cp .env.example .env && chmod 600 .env   # fill in the placeholders
docker compose up -d
docker compose ps                          # evolution-api healthy, port 127.0.0.1:8085
```

Add a site to the host Caddy (the shared Caddyfile, outside this repo). Then reload Caddy:

```
evolution.<your-domain> {
  reverse_proxy 127.0.0.1:8085
}
```

The platform accepts only an `https://` base, or `http://localhost` / `127.0.0.1`.

## 2. Create the instance (owner, once per number)

Use the global key from `.env`. Create the instance with its own token and its webhook to the
platform. The webhook sends the token in a header, which the platform checks in constant time:

```sh
curl -sS https://evolution.<your-domain>/instance/create \
  -H "apikey: <AUTHENTICATION_API_KEY>" -H 'content-type: application/json' \
  -d '{
    "instanceName": "secondary-1",
    "token": "<a long random instance token>",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true,
    "groupsIgnore": true,
    "webhook": {
      "enabled": true,
      "url": "https://<api-host>/webhooks/evolution/secondary-1",
      "headers": { "x-evolution-token": "<the same instance token>" },
      "byEvents": false,
      "base64": false,
      "events": ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
    }
  }'
```

For Meta's Cloud API through Evolution, use `"integration": "WHATSAPP-BUSINESS"` with Meta's ids
and token. That mode keeps Meta's 24 h window and templates.

## 3. Connect the number in the platform (admin)

1. «التكاملات» › Evolution: set `EVOLUTION_API_BASE` (`https://evolution.<your-domain>`). Save
   `EVOLUTION_API_KEY` (the global key) as a secret. `EVOLUTION_SEND_GAP_MS` is optional.
2. «الأرقام» › add a number: role «المحادثات», driver **Evolution**. The instance name
   (`secondary-1`) goes in the instance field. Pick the connection type (Baileys or Cloud). Save
   the **instance token** as the number's secret. Leave the number **disabled** for now.
3. On the number's card, press **QR** and scan it with the secondary phone (WhatsApp › Linked
   devices › Link a device). Then press «افحص الاتصال»: it must say «متصل».
4. Send one test message to a number in `WA_ALLOWED_RECIPIENTS`. Then enable the number. Make it
   the role's default only if every chat should go out from it.

To go back, disable the number, or switch its driver back. Nothing else changes.
