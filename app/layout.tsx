import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { InboxProvider } from "@/components/inbox/InboxProvider";

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
    "Demo: un agente AI che trasforma una richiesta di ricambio in un preventivo pronto.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={inter.variable}>
      <body className="min-h-screen antialiased">
        {/* Stato condiviso tra inbox e pipeline (in memoria, demo). */}
        <InboxProvider>{children}</InboxProvider>
      </body>
    </html>
  );
}
