import type { MetadataRoute } from "next";

/** Deixa o painel instalável como aplicativo (Android: "Instalar app"; iPhone: "Adicionar à Tela de Início"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BSS Eventos · Painel de custos",
    short_name: "BSS Painel",
    description: "Controle de gastos dos eventos da BSS Eventos.",
    lang: "pt-BR",
    start_url: "/eventos",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#100e0b",
    theme_color: "#0b0a08",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Seus eventos", short_name: "Eventos", url: "/eventos", icons: [{ src: "/icone-192.png", sizes: "192x192" }] },
      { name: "Equipe online", short_name: "Equipe", url: "/equipe", icons: [{ src: "/icone-192.png", sizes: "192x192" }] },
    ],
  };
}
