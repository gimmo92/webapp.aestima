import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function createResetToken() {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function appBaseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "http://localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function isLocalHost(url: string) {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESET_EMAIL_FROM ?? "aftercore <beth.t@example.com>";
  if (!apiKey) return { sent: false as const };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Recupero password aftercore",
      html: `
        <p>Hai chiesto di reimpostare la password del tuo account aftercore.</p>
        <p><a href="${resetUrl}">Scegli una nuova password</a></p>
        <p>Il link scade tra un'ora. Se non sei stato tu, ignora questa email.</p>
      `,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Invio email reset fallito", res.status, detail);
    return { sent: false as const, error: true as const };
  }
  return { sent: true as const };
}
