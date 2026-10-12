// Web push worker (R-NOT-01). Registered only from the bell's browser-push switch (use-web-push); no
// caching, no fetch handler: it shows what the API pushes and opens it on a click.
// Payload: JSON { title, body, url, tag }; the API always sends the title (no UI text lives here:
// a bad payload falls back to the site's host name). The url is opened only on this origin, else '/'.

const ICON = '/icon-192.png';

/** A same-origin absolute URL for `url`, or the app root. */
function safeUrl(url) {
  try {
    const target = new URL(typeof url === 'string' ? url : '/', self.location.origin);
    return target.origin === self.location.origin ? target.href : new URL('/', self.location.origin).href;
  } catch {
    return new URL('/', self.location.origin).href;
  }
}

/** The payload as an object; a bad or missing one shows a bare notification. */
function readPayload(event) {
  try {
    const data = event.data ? event.data.json() : null;
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

const text = (value, fallback) => (typeof value === 'string' && value ? value : fallback);

self.addEventListener('push', (event) => {
  const data = readPayload(event);
  const options = {
    body: text(data.body, ''),
    data: { url: safeUrl(data.url) },
    icon: ICON,
    // The API writes title and body in the recipient's language: let the platform pick the direction.
    dir: 'auto',
  };
  if (typeof data.tag === 'string' && data.tag) options.tag = data.tag;
  event.waitUntil(
    self.registration.showNotification(text(data.title, self.location.hostname), options),
  );
});

async function openUrl(url) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const own = windows.find((c) => new URL(c.url).origin === self.location.origin);
  if (own) {
    try {
      // navigate() works on a tab this worker controls (any tab opened after it was installed).
      await own.focus();
      await own.navigate(url);
      return;
    } catch {
      // an older, uncontrolled tab: open a new one instead
    }
  }
  await self.clients.openWindow(url);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = safeUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(openUrl(url));
});
