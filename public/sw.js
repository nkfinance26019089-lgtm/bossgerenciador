/* BSS Painel — service worker
 * - Arquivos do site (JS, CSS, fontes, ícones) ficam guardados no aparelho: o app abre mais rápido.
 * - Páginas e dados sempre vêm da internet (nunca mostramos valores antigos).
 * - Sem internet: mostra a tela "Sem conexão".
 */
const VERSAO = "bss-v1";
const OFFLINE = "/offline.html";
const PRE_CACHE = [OFFLINE, "/icone-192.png", "/logo-bss.webp"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((c) => c.addAll(PRE_CACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Abrir uma página: sempre da internet; sem conexão, tela offline
  if (req.mode === "navigate") {
    evento.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }

  // Arquivos fixos do site (têm nome único a cada versão): guarda e reaproveita
  const fixo =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:woff2?|png|webp|jpg|jpeg|svg|ico)$/.test(url.pathname);
  if (fixo) {
    evento.respondWith(
      caches.match(req).then(
        (salvo) =>
          salvo ||
          fetch(req).then((resp) => {
            if (resp.ok) {
              const copia = resp.clone();
              caches.open(VERSAO).then((c) => c.put(req, copia));
            }
            return resp;
          }),
      ),
    );
  }
  // Todo o resto (dados, /api, telas) segue normal pela internet.
});
