// =============================================================
// Icone WhatsApp Web (SVG inline, stile stroke 1.8 come l'originale)
// =============================================================

type IconProps = {
  className?: string;
  size?: number;
};

function svgProps({ className, size = 24 }: IconProps) {
  return {
    className,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export function IconChats(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.8 8.8 0 0 1-3.9-.9L3 21l2-5.1a8.3 8.3 0 0 1-1-4 8.4 8.4 0 0 1 8.5-8.4 8.4 8.4 0 0 1 8.5 8z" />
    </svg>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M21 16.9v2.6a1.7 1.7 0 0 1-1.9 1.7 16.7 16.7 0 0 1-7.3-2.6 16.4 16.4 0 0 1-5-5A16.7 16.7 0 0 1 4.2 6.2 1.7 1.7 0 0 1 5.9 4.3h2.6a1.7 1.7 0 0 1 1.7 1.5c.1.8.3 1.7.6 2.5a1.7 1.7 0 0 1-.4 1.8l-1.1 1.1a13.5 13.5 0 0 0 5 5l1.1-1.1a1.7 1.7 0 0 1 1.8-.4c.8.3 1.6.5 2.5.6a1.7 1.7 0 0 1 1.3 1.6z" />
    </svg>
  );
}

export function IconStatus(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="8.5" strokeDasharray="3.2 2.6" />
      <circle cx="12" cy="12" r="3.4" />
    </svg>
  );
}

export function IconChannels(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 10.5v3a1.5 1.5 0 0 0 1.5 1.5H7l4 3.5V6L7 9.5H5.5A1.5 1.5 0 0 0 4 11z" />
      <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
      <path d="M18 6.7a7.5 7.5 0 0 1 0 10.6" />
    </svg>
  );
}

export function IconCommunities(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="9" cy="9" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2a3 3 0 0 1 0 5.8" />
      <path d="M17.2 14.4a5.2 5.2 0 0 1 3.3 4.6" />
    </svg>
  );
}

export function IconArchive(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="3.5" y="4.5" width="17" height="4" rx="1.2" />
      <path d="M5 8.5V18a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18V8.5" />
      <path d="M9.8 12h4.4" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="2.8" />
      <path d="M19.4 14.5a1.5 1.5 0 0 0 .3 1.7l.1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.5 1.5 0 0 0-2.6 1.1v.3a1.7 1.7 0 0 1-3.4 0v-.2a1.5 1.5 0 0 0-2.6-1.1l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.5 1.5 0 0 0-1.1-2.6h-.2a1.7 1.7 0 0 1 0-3.4h.3A1.5 1.5 0 0 0 5.4 7.6l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.5 1.5 0 0 0 2.6-1.1V3.9a1.7 1.7 0 0 1 3.4 0v.2a1.5 1.5 0 0 0 2.6 1.1l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.5 1.5 0 0 0 1.1 2.6h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.5 1.5 0 0 0-1.4.9z" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...svgProps(props)} strokeWidth={0} fill="currentColor">
      <circle cx="12" cy="5.5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="18.5" r="1.8" />
    </svg>
  );
}

export function IconNewChat(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 6v12" />
      <path d="M6 12h12" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M6 9.5l6 5.5 6-5.5" />
    </svg>
  );
}

export function IconVideo(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="2.8" y="6.5" width="12.4" height="11" rx="2" />
      <path d="M15.2 11l6-3.2v8.4l-6-3.2z" />
    </svg>
  );
}

export function IconPaperclip(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M17.5 8.3l-7.8 7.8a2.2 2.2 0 0 0 3.1 3.1l7.5-7.5a4.4 4.4 0 0 0-6.2-6.2l-7.6 7.6a6.6 6.6 0 0 0 9.3 9.3" />
    </svg>
  );
}

export function IconEmoji(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M8.6 14.2a4.3 4.3 0 0 0 6.8 0" />
      <path d="M9.2 9.6h.01" strokeWidth={2.4} />
      <path d="M14.8 9.6h.01" strokeWidth={2.4} />
    </svg>
  );
}

export function IconMic(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3" />
      <path d="M9 21h6" />
    </svg>
  );
}

export function IconSend(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 12l16-7-7 16-2.2-6.6L4 12z" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4.5 6.5h15" />
      <path d="M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
      <path d="M6.5 6.5l.8 12.2A1.6 1.6 0 0 0 8.9 20.2h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12.2" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...svgProps(props)} strokeWidth={0} fill="currentColor">
      <path d="M8 5.5l11 6.5-11 6.5z" />
    </svg>
  );
}

export function IconPause(props: IconProps) {
  return (
    <svg {...svgProps(props)} strokeWidth={0} fill="currentColor">
      <rect x="7" y="5" width="3.6" height="14" rx="1" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1" />
    </svg>
  );
}

export function IconDocument(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5z" />
      <path d="M14 3.5V7.5H18" />
    </svg>
  );
}

export function IconImage(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4.5 17.5l4.8-4.5 3.4 3 2.8-2.4 4 3.9" />
    </svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 4v11" />
      <path d="M7.5 11L12 15.5 16.5 11" />
      <path d="M5 19.5h14" />
    </svg>
  );
}

export function IconMuted(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M11 5.5 7.5 9H5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2.5L11 18.5z" />
      <path d="M15.5 10l4 4" />
      <path d="M19.5 10l-4 4" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconClipboard(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M9 4.5H7.5A1.5 1.5 0 0 0 6 6v13a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V6a1.5 1.5 0 0 0-1.5-1.5H15" />
      <rect x="9" y="3" width="6" height="3.2" rx="1.1" />
      <path d="M9.2 11h5.6M9.2 14.5h5.6M9.2 18h3.2" />
    </svg>
  );
}

export function IconSparkle(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 3.5l1.7 4.4 4.4 1.7-4.4 1.7L12 15.7l-1.7-4.4L5.9 9.6l4.4-1.7z" />
      <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M9.5 6l6 6-6 6" />
    </svg>
  );
}

/** Spunte di consegna: una per "inviato", doppia per consegnato/letto. */
export function IconChecks({
  double = true,
  className,
}: {
  double?: boolean;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width="16"
      height="11"
      viewBox="0 0 16 11"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 6.2 3.6 8.9 9 2.4" />
      {double ? <path d="M6.6 6.2 9.2 8.9 14.6 2.4" /> : null}
    </svg>
  );
}
