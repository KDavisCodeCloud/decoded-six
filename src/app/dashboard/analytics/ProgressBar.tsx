interface Props {
  value: number
  max: number
  gateValue?: number
  gateLabel?: string
}

export function ProgressBar({ value, max, gateValue, gateLabel }: Props) {
  const pct = Math.min(100, (value / max) * 100)
  const gatePct = gateValue != null ? Math.min(100, (gateValue / max) * 100) : null

  return (
    <div>
      <div className="relative h-4 rounded-full overflow-hidden" style={{ background: '#1a1526' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: value >= max ? '#3fd17a' : '#C8A84B',
            transition: 'width 400ms ease',
          }}
        />
        {gatePct != null && (
          <div
            className="absolute top-0 bottom-0 w-[2px]"
            style={{ left: `${gatePct}%`, background: '#00f0ff' }}
          />
        )}
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[10px] text-whisper">
        <span>0</span>
        {gateValue != null && (
          <span style={{ color: '#00f0ff' }}>{gateLabel} — {gateValue.toLocaleString()}</span>
        )}
        <span>{max.toLocaleString()}</span>
      </div>
    </div>
  )
}
