import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentesIA — CRM con Inteligencia Artificial",
  description:
    "Plataforma CRM multi-tenant con agentes de IA integrados a WhatsApp para agencias inmobiliarias y de viajes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
