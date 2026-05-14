function LogoCQ({ height = 38 }) {
  const w = Math.round((212 / 44) * height)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 212 44"
      width={w}
      height={height}
      aria-label="CodeQuest"
      role="img"
    >
      <defs>
        <filter id="cqGlw" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Bracket izquierdo < ── */}
      <text
        x="2" y="22"
        dominantBaseline="central"
        fontFamily="'Fira Code','Cascadia Code','Consolas','Courier New',monospace"
        fontSize="32" fontWeight="700"
        fill="#8b5cf6"
        stroke="#8b5cf6"
        strokeWidth="0.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        paintOrder="stroke fill"
        filter="url(#cqGlw)"
        textLength="14"
        lengthAdjust="spacingAndGlyphs"
      >
        {'<'}
      </text>

      {/* ── Nombre CodeQuest ── */}
      <text
        x="26" y="21"
        dominantBaseline="central"
        fontFamily="'Inter','Segoe UI',system-ui,-apple-system,sans-serif"
        fontSize="26" fontWeight="700"
        fill="#e8eef8"
      >
        CodeQuest
      </text>

      {/* ── Slash / ── */}
      <text
        x="172" y="22"
        dominantBaseline="central"
        fontFamily="'Fira Code','Cascadia Code','Consolas','Courier New',monospace"
        fontSize="30" fontWeight="700"
        fill="#10b981"
        stroke="#10b981"
        strokeWidth="0.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        paintOrder="stroke fill"
        filter="url(#cqGlw)"
        textLength="14"
        lengthAdjust="spacingAndGlyphs"
      >
        /
      </text>

      {/* ── Bracket derecho > ── */}
      <text
        x="191" y="22"
        dominantBaseline="central"
        fontFamily="'Fira Code','Cascadia Code','Consolas','Courier New',monospace"
        fontSize="32" fontWeight="700"
        fill="#10b981"
        stroke="#10b981"
        strokeWidth="0.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        paintOrder="stroke fill"
        filter="url(#cqGlw)"
        textLength="14"
        lengthAdjust="spacingAndGlyphs"
      >
        &gt;
      </text>
    </svg>
  )
}

export default LogoCQ
