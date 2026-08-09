// SplitWise Push Notification Service Worker

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();

    const options = {
      body: payload.body || '',
      icon: payload.icon || '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [100, 50, 100],
      data: payload.data || {},
      actions: [],
      tag: payload.data?.type || 'general',
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(payload.title || 'SplitWise', options)
    );
  } catch (err) {
    console.error('[SW] Error processing push event:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/dashboard';

  if (data.type === 'expense:created' || data.type === 'expense:updated') {
    targetUrl = '/expenses';
  } else if (data.type === 'settlement:created' || data.type === 'settlement:verified') {
    targetUrl = '/settlements';
  } else if (data.type === 'group:member_joined') {
    targetUrl = '/members';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Service Worker activate — take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
