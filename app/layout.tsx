import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Font Inter self-hosted da Next.js: tipografia pulita, professionale.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "aestima — Dalla richiesta al preventivo, in un attimo",
  description:
    "Demo: un agente AI che trasforma una richiesta di ricambio in un preventivo pronto. L'approvazione finale resta al tecnico.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={inter.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
