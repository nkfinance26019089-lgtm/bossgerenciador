import type { Metadata, Viewport } from "next";
// Fontes hospedadas junto com o site (não dependem do Google Fonts)
import "@fontsource/zilla-slab/latin-600.css";
import "@fontsource/zilla-slab/latin-700.css";
import "@fontsource/barlow/latin-400.css";
import "@fontsource/barlow/latin-500.css";
import "@fontsource/barlow/latin-600.css";
import "@fontsource/barlow/latin-700.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "BSS Eventos · Painel de custos", template: "%s · BSS Eventos" },
  description: "Controle de gastos dos eventos da BSS Eventos.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#100e0b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
