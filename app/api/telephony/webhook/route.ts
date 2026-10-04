import { NextResponse } from "next/server";
import { prismaTelephonyStore } from "@/lib/telephony/store";
import { classifyTranscript } from "@/lib/telephony/classifyCall";
import { handleTelephonyWebhook } from "@/lib/telephony/webhook";

export async function POST(req: Request) {
  const url = new URL(req.url);
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const result = await handleTelephonyWebhook({
    secretHeader: req.headers.get("x-telephony-secret"),
    expectedSecret: process.env.TELEPHONY_WEBHOOK_SECRET,
    queryCompany: url.searchParams.get("company") ?? "",
    body,
    store: prismaTelephonyStore,
    classify: classifyTranscript,
  });

  return NextResponse.json(result.body, { status: result.status });
}
