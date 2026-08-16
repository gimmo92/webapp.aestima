const CYAN = "#38BDF8";
const NAVY = "#1C3A5E";
const AFTER_ON_DARK = "#E5EDFB";

/** Esagono pointy-top, centri e raggi allineati al lockup ufficiale. */
function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

const OUTER = hexPoints(20, 20, 17.2);
const MIDDLE = hexPoints(20, 20, 11.4);
const CORE = hexPoints(20, 20, 5.1);

export function Logo({
  className = "",
  height = 32,
  variant = "light",
}: {
  className?: string;
  height?: number;
  /** `light` per superfici chiare, `dark` per fondi scuri (lockup ufficiale). */
  variant?: "light" | "dark";
}) {
  const after = variant === "dark" ? AFTER_ON_DARK : NAVY;
  const width = Math.round(height * (198 / 40));

  return (
    <span className={`inline-flex items-center ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 198 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="aftercore"
      >
        <g transform="translate(0,0)">
          <polygon
            points={OUTER}
            fill="none"
            stroke={NAVY}
            strokeWidth="3.4"
            strokeLinejoin="round"
          />
          <polygon
            points={MIDDLE}
            fill="none"
            stroke={CYAN}
            strokeWidth="2.15"
            strokeLinejoin="round"
          />
          <polygon points={CORE} fill={CYAN} />
        </g>
        <text
          x="46"
          y="28.2"
          fontFamily="var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif"
          fontSize="24"
          fontWeight="600"
          letterSpacing="-0.04em"
        >
          <tspan fill={after}>after</tspan>
          <tspan fill={CYAN}>core</tspan>
        </text>
      </svg>
    </span>
  );
}
