// Kill-switch: versões antigas do app registraram um service worker que servia
// o index.html/bundle em cache "cache-first", travando usuários numa versão
// desatualizada. Este arquivo limpa todos os caches, se desregistra e recarrega
// as abas abertas para que todos passem a receber sempre a versão nova.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })(),
  );
});

// Sempre rede: nunca mais servir conteúdo antigo do cache.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
