type PalmSpec = {
  baseX: number
  height: number
  lean: number
  fronds: number
  frondLength: number
  trunkWidth: number
}

const PALMS: PalmSpec[] = [
  // Far left: tall, leaning right, 3 fronds
  { baseX: 90, height: 260, lean: 60, fronds: 3, frondLength: 100, trunkWidth: 13 },
  // Left-center: shorter, straight, 4 fronds
  { baseX: 340, height: 185, lean: 5, fronds: 4, frondLength: 75, trunkWidth: 11 },
  // Center-right: tallest, slight lean, most prominent
  { baseX: 780, height: 320, lean: 25, fronds: 5, frondLength: 125, trunkWidth: 16 },
  // Far right: two palms close together
  { baseX: 1270, height: 215, lean: -20, fronds: 4, frondLength: 85, trunkWidth: 12 },
  { baseX: 1345, height: 245, lean: 15, fronds: 3, frondLength: 90, trunkWidth: 12 },
]

const BASE_Y = 420
const SILHOUETTE = '#0a0a0f'

function trunkPath({ baseX, height, lean, trunkWidth }: PalmSpec): string {
  const crownX = baseX + lean
  const crownY = BASE_Y - height
  const midX = baseX + lean * 0.55
  const midY = BASE_Y - height * 0.55
  const topWidth = trunkWidth * 0.4

  const leftBase = baseX - trunkWidth / 2
  const rightBase = baseX + trunkWidth / 2
  const leftTop = crownX - topWidth / 2
  const rightTop = crownX + topWidth / 2

  return [
    `M ${leftBase} ${BASE_Y}`,
    `C ${leftBase - lean * 0.15} ${BASE_Y - height * 0.35}, ${midX - trunkWidth * 0.6} ${midY}, ${leftTop} ${crownY}`,
    `L ${rightTop} ${crownY}`,
    `C ${midX + trunkWidth * 0.6} ${midY}, ${rightBase + lean * 0.15} ${BASE_Y - height * 0.35}, ${rightBase} ${BASE_Y}`,
    'Z',
  ].join(' ')
}

function frondPath(cx: number, cy: number, angleDeg: number, length: number): string {
  const angle = (angleDeg * Math.PI) / 180
  const perp = angle + Math.PI / 2
  const tipX = cx + Math.cos(angle) * length
  const tipY = cy + Math.sin(angle) * length
  const midX = cx + Math.cos(angle) * length * 0.5
  const midY = cy + Math.sin(angle) * length * 0.5
  const bulge = length * 0.16

  const ctrl1X = midX + Math.cos(perp) * bulge
  const ctrl1Y = midY + Math.sin(perp) * bulge
  const ctrl2X = midX - Math.cos(perp) * bulge * 0.45
  const ctrl2Y = midY - Math.sin(perp) * bulge * 0.45

  return [
    `M ${cx} ${cy}`,
    `Q ${ctrl1X} ${ctrl1Y} ${tipX} ${tipY}`,
    `Q ${ctrl2X} ${ctrl2Y} ${cx} ${cy}`,
    'Z',
  ].join(' ')
}

function frondAngles(count: number): number[] {
  // Fan spread across ~150deg opening upward from the crown (SVG y-down,
  // so -90 is straight up; -165..-15 sweeps from up-left to up-right).
  const start = -165
  const end = -15
  if (count === 1) return [-90]
  const step = (end - start) / (count - 1)
  return Array.from({ length: count }, (_, i) => start + step * i)
}

function Palm({ spec }: { spec: PalmSpec }) {
  const crownX = spec.baseX + spec.lean
  const crownY = BASE_Y - spec.height

  return (
    <g fill={SILHOUETTE}>
      <path d={trunkPath(spec)} />
      {frondAngles(spec.fronds).map((angle, i) => (
        <path key={i} d={frondPath(crownX, crownY, angle, spec.frondLength)} />
      ))}
    </g>
  )
}

export function PalmSilhouette({
  className,
  opacity = 0.9,
}: {
  className?: string
  opacity?: number
}) {
  return (
    <svg
      viewBox="0 0 1440 420"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax slice"
      opacity={opacity}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vice-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#241436" />
          <stop offset="45%"  stopColor="#5c1c52" />
          <stop offset="72%"  stopColor="#c8446f" />
          <stop offset="100%" stopColor="#f0975a" />
        </linearGradient>
        <filter id="vice-horizon-blur" x="-20%" y="-500%" width="140%" height="1100%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      <rect x="0" y="0" width="1440" height="420" fill="url(#vice-sky)" />

      <line
        x1="0"
        y1={420 * 0.75}
        x2="1440"
        y2={420 * 0.75}
        stroke="#c8446f"
        strokeWidth="1"
        filter="url(#vice-horizon-blur)"
        opacity="0.6"
      />

      {PALMS.map((spec, i) => (
        <Palm key={i} spec={spec} />
      ))}
    </svg>
  )
}
