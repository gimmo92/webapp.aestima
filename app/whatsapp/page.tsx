import type { Metadata } from "next";
import { WhatsAppWorkspace } from "@/components/whatsapp/WhatsAppWorkspace";

export const metadata: Metadata = {
  title: "WhatsApp · assistenza macchinari",
  description:
    "Canale WhatsApp Business per le richieste di assistenza macchinari inviate dai tecnici.",
};

export default function WhatsAppPage() {
  return <WhatsAppWorkspace />;
}
