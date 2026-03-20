import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/app/components/ServiceWorkerRegistrar";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "SOCI - Tu socio tecnológico",
  description: "Sistema de gestión para tiendas y papelerías",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${nunito.variable} antialiased`} style={{ fontFamily: "var(--font-nunito), sans-serif" }}>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}