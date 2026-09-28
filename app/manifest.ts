import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BSS Eventos · Painel de custos",
    short_name: "BSS Painel",
    start_url: "/eventos",
    display: "standalone",
    background_color: "#100e0b",
    theme_color: "#100e0b",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
