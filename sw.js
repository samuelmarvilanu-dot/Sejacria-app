// Service Worker do Cria
// Proposito: habilitar a instalacao como app (PWA).
// IMPORTANTE: nao faz cache do cria.txt nem do index.html,
// pra que suas atualizacoes sempre apareçam na hora.

self.addEventListener('install', function(e){
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(self.clients.claim());
});

// Estrategia: sempre busca da rede (network-first puro).
// Assim o app fica instalavel mas nunca serve versao velha.
self.addEventListener('fetch', function(e){
  // Deixa o navegador lidar normalmente com todas as requisicoes
  return;
});
