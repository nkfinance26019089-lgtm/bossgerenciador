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
import { RegistrarApp } from "@/components/RegistrarApp";

export const metadata: Metadata = {
  title: { default: "BSS Eventos · Painel de custos", template: "%s · BSS Eventos" },
  description: "Controle de gastos dos eventos da BSS Eventos.",
  robots: { index: false, follow: false },
  applicationName: "BSS Painel",
  // iPhone: "Adicionar à Tela de Início" abre em tela cheia, com o nome e o ícone da BSS
  appleWebApp: { capable: true, title: "BSS Painel", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false, email: false, address: false },
  other: { "apple-mobile-web-app-capable": "yes" }, // iPhones mais antigos
};

export const viewport: Viewport = {
  themeColor: "#0b0a08",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // usa a tela toda no iPhone (respeitando o entalhe)
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        {children}
        <RegistrarApp />
      </body>
    </html>
  );
}
