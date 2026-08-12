const SHIFT_SECONDS = 8 * 3600; // reference: an 8-hour workday

// Signature "shift ring": radial progress against an 8-hour reference,
// used consistently across the employee app and this dashboard.
export default function ShiftRing({ activeSeconds, size = 40, stroke = 5, showLabel = false }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.min(activeSeconds / SHIFT_SECONDS, 1);
  const offset = circumference * (1 - fraction);
  const h = Math.floor(activeSeconds / 3600);
  const m = Math.floor((activeSeconds % 3600) / 60);
  const label = `${h}h ${m}m`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1a252c" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#0198b0"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        {showLabel && (
          <>
            <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="#eaf4f6" fontSize={size * 0.15} fontFamily="'JetBrains Mono', monospace" fontWeight="700">
              {label}
            </text>
            <text x="50%" y="63%" textAnchor="middle" dominantBaseline="middle" fill="#7e9199" fontSize={size * 0.06} fontFamily="Inter, sans-serif">
              of 8h shift
            </text>
          </>
        )}
      </svg>
      {!showLabel && <span className="ring-mini-label mono">{label}</span>}
    </div>
  );
}
