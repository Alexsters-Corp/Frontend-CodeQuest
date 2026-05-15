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
      overflow="visible"
    >
      <defs>
        <filter id="cqGlw" x="-15" y="-15" width="242" height="74" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Bracket izquierdo < — chevron redondeado ── */}
      <path
        d="M 15,16 L 8,22 L 15,28"
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#cqGlw)"
      />

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
        fontSize="29" fontWeight="700"
        fill="#10b981"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        paintOrder="stroke fill"
        filter="url(#cqGlw)"
        textLength="14"
        lengthAdjust="spacingAndGlyphs"
      >
        /
      </text>

      {/* ── Bracket derecho > — chevron redondeado ── */}
      <path
        d="M 191,16 L 198,22 L 191,28"
        fill="none"
        stroke="#10b981"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#cqGlw)"
      />
    </svg>
  )
}

export default LogoCQ
