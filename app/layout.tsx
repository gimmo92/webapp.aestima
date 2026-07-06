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
  title: "aestima",
  description: "Gestione richieste ricambi, preventivi e archivio documentale after-sales.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={inter.variable}>
      <body className="min-h-screen antialiased">
        {/* Stato condiviso tra inbox, pipeline e fornitori (in memoria, demo). */}
        <InboxProvider>{children}</InboxProvider>
      </body>
    </html>
  );
}
