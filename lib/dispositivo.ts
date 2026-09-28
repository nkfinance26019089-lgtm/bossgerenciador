/** "iPhone · Safari", "Windows · Chrome"… a partir do user-agent. */
export function descreverDispositivo(ua: string | null | undefined) {
  const s = ua ?? "";
  const sistema = /iPhone/.test(s)
    ? "iPhone"
    : /iPad/.test(s)
      ? "iPad"
      : /Android/.test(s)
        ? "Android"
        : /Windows/.test(s)
          ? "Windows"
          : /Macintosh|Mac OS X/.test(s)
            ? "Mac"
            : /Linux/.test(s)
              ? "Linux"
              : "Outro";
  const navegador = /SamsungBrowser/.test(s)
    ? "Samsung Internet"
    : /Edg\//.test(s)
      ? "Edge"
      : /OPR\//.test(s)
        ? "Opera"
        : /Firefox|FxiOS/.test(s)
          ? "Firefox"
          : /Chrome|CriOS/.test(s)
            ? "Chrome"
            : /Safari/.test(s)
              ? "Safari"
              : "Navegador";
  return `${sistema} · ${navegador}`;
}

export function ehCelular(dispositivo: string | null | undefined) {
  return /^(iPhone|Android)/.test(dispositivo ?? "");
}

/** Nome amigável da tela atual a partir do endereço. */
export function nomeDaTela(caminho: string) {
  if (/^\/eventos\/[^/]+\/gastos\/novo/.test(caminho)) return "Registrando gasto";
  if (/^\/eventos\/[^/]+\/gastos\/[^/]+$/.test(caminho)) return "Editando gasto";
  if (/^\/eventos\/[^/]+\/gastos/.test(caminho)) return "Gastos";
  if (/^\/eventos\/[^/]+\/categorias/.test(caminho)) return "Categorias";
  if (/^\/eventos\/[^/]+\/responsaveis/.test(caminho)) return "Responsáveis";
  if (/^\/eventos\/[^/]+\/configurar/.test(caminho)) return "Configurar evento";
  if (/^\/eventos\/[^/]+\/logs/.test(caminho)) return "Logs";
  if (/^\/eventos\/novo/.test(caminho)) return "Criando evento";
  if (/^\/eventos\/[^/]+$/.test(caminho)) return "Visão geral";
  if (caminho.startsWith("/eventos")) return "Lista de eventos";
  if (caminho.startsWith("/equipe")) return "Equipe";
  if (caminho.startsWith("/logs")) return "Logs gerais";
  if (caminho.startsWith("/conta")) return "Minha conta";
  return "Painel";
}
