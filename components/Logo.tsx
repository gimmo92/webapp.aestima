// Logo placeholder di aestima: un marchio semplice, geometrico, industriale.
// Sostituibile con l'asset reale del brand.

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width="30"
        height="30"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="1.5"
          y="1.5"
          width="29"
          height="29"
          rx="7"
          fill="var(--color-brand-soft)"
          stroke="var(--color-brand)"
          strokeWidth="1.5"
        />
        {/* "A" stilizzata a compasso/chevron */}
        <path
          d="M16 7 L23 24 H19.2 L16 15.2 L12.8 24 H9 Z"
          fill="var(--color-brand)"
        />
        <circle cx="16" cy="20.5" r="1.6" fill="var(--color-base)" />
      </svg>
      <span className="text-[1.35rem] font-extrabold tracking-tight text-ink">
        aestima
      </span>
    </span>
  );
}
