// =======================================================
// Service Worker do Cria — v2.0
// Suporte: PWA install + Push API (pronta para push server)
// + Agendamento local de notificações via postMessage
// =======================================================

var SCHEDULED = []; // { id, timer } — notificações agendadas localmente

// ── Ciclo de vida ───────────────────────────────────────
self.addEventListener('install', function(e) { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });

// ── Network-first puro (sem cache do app) ───────────────
self.addEventListener('fetch', function(e) { return; });

// ── Push API (FUTURO: ativado pelo push server) ─────────
// Quando o push server enviar uma notificação, este handler
// a exibe mesmo com o app fechado.
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) {
    data = { titulo: 'Cria', corpo: e.data ? e.data.text() : 'Nova notificação' };
  }
  var opcoes = {
    body: data.corpo || '',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    tag: data.tag || 'cria-push-' + Date.now(),
    data: { url: data.url || '/' },
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };
  e.waitUntil(self.registration.showNotification(data.titulo || '🎬 Cria', opcoes));
});

// ── Clique na notificação ────────────────────────────────
// Foca o app se já estiver aberto, ou abre uma nova janela.
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.indexOf(self.location.origin) === 0 && 'focus' in clients[i]) {
          return clients[i].focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// ── Mensagens do app (agendamento local) ────────────────
// Protocolo de mensagens desacoplado — fácil de estender.
// Tipos: AGENDAR | CANCELAR | CANCELAR_TODOS | TESTAR
self.addEventListener('message', function(e) {
  var msg = e.data || {};

  if (msg.tipo === 'AGENDAR') {
    // Cancela agendamento anterior do mesmo ID (re-agendar)
    _cancelarLocal(msg.id);
    var delay = msg.ts - Date.now();
    if (delay <= 0) return; // horário já passou, ignora
    var timer = setTimeout(function() {
      self.registration.showNotification(msg.titulo || '🎬 Cria', {
        body: msg.corpo || 'Hora de postar! 📲',
        icon: '/icon-192.png',
        tag: 'cria-lembrete-' + msg.id,
        data: { url: '/' },
        requireInteraction: false,
        vibrate: [200, 100, 200],
      });
      _removerDaLista(msg.id);
    }, Math.min(delay, 2147483647)); // max setTimeout ~24.8 dias
    SCHEDULED.push({ id: msg.id, timer: timer });
    return;
  }

  if (msg.tipo === 'CANCELAR') {
    _cancelarLocal(msg.id);
    return;
  }

  if (msg.tipo === 'CANCELAR_TODOS') {
    SCHEDULED.forEach(function(n) { clearTimeout(n.timer); });
    SCHEDULED.length = 0;
    return;
  }

  if (msg.tipo === 'TESTAR') {
    self.registration.showNotification('🎬 Cria', {
      body: 'Tudo certo! Você vai receber lembretes dos seus conteúdos. 🔔',
      icon: '/icon-192.png',
      tag: 'cria-teste-' + Date.now(),
      requireInteraction: false,
    });
    return;
  }

  // ── FUTURO: SUBSCRIBE ──────────────────────────────────
  // Quando o push server for implementado, adicionar aqui:
  // if (msg.tipo === 'SUBSCRIBE') { ... }
});

// ── Helpers internos ─────────────────────────────────────
function _cancelarLocal(id) {
  var idx = SCHEDULED.findIndex(function(n) { return n.id === id; });
  if (idx > -1) { clearTimeout(SCHEDULED[idx].timer); SCHEDULED.splice(idx, 1); }
}
function _removerDaLista(id) {
  var idx = SCHEDULED.findIndex(function(n) { return n.id === id; });
  if (idx > -1) SCHEDULED.splice(idx, 1);
}

// =======================================================
// DOCUMENTAÇÃO PARA FUTURA INTEGRAÇÃO (Push Server)
// =======================================================
//
// Quando o push server for implementado:
//
// 1. Gerar VAPID keys (1x, guardar no .env):
//    npx web-push generate-vapid-keys
//
// 2. No frontend (NotifManager.subscribe), após permission 'granted':
//    const sub = await self.registration.pushManager.subscribe({
//      userVisibleOnly: true,
//      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
//    });
//    await fetch('/api/push-subscribe', { method: 'POST', body: JSON.stringify(sub) });
//
// 3. No push server (Vercel Cron Function /api/push-send):
//    - Busca notificações do dia no Supabase
//    - Chama webpush.sendNotification(subscription, payload) para cada uma
//
// 4. Tabela Supabase: push_subscriptions (ver push_subscriptions.sql)
// =======================================================
