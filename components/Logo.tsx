// Lockup ufficiale aftercore (emblema esagonale + wordmark).

export function Logo({
  className = "",
  height = 32,
}: {
  className?: string;
  height?: number;
}) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <img
        src="/brand/aftercore-lockup.png"
        alt="aftercore"
        height={height}
        className="w-auto select-none"
        style={{ height }}
      />
    </span>
  );
}
