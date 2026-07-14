"use client";

import { useEffect, useState } from "react";
import { ServiceChatWorkspace } from "./ServiceChatWorkspace";

interface Props {
  /** Monta la chat direttamente (demo interna) invece dell'iframe. */
  inline?: boolean;
  baseUrl?: string;
  height?: number;
  className?: string;
}

/** Chatbox larga embeddabile inline o via iframe. */
export function ServiceChatEmbedWide({
  inline = false,
  baseUrl = "",
  height = 640,
  className = "",
}: Props) {
  const [resolvedBase, setResolvedBase] = useState(baseUrl);

  useEffect(() => {
    if (!baseUrl && typeof window !== "undefined") {
      setResolvedBase(window.location.origin);
    }
  }, [baseUrl]);

  const iframeSrc = `${resolvedBase}/embed/chat`;

  if (inline) {
    return (
      <div
        className={["flex flex-col overflow-hidden bg-base", className].join(
          " "
        )}
        style={{ height }}
      >
        <ServiceChatWorkspace embed />
      </div>
    );
  }

  return (
    <iframe
      src={iframeSrc}
      title="Assistenza service aestima"
      className={["w-full border-0", className].join(" ")}
      style={{ height }}
      allow="clipboard-write"
    />
  );
}
