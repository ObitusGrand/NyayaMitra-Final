// NyayaGauge — SVG arc gauge for NyayaScore and confidence display
interface NyayaGaugeProps {
  score: number       // 0-100
  size?: number
  label?: string
  sublabel?: string
  color?: string
}

export default function NyayaGauge({
  score,
  size = 180,
  label,
  sublabel,
  color,
}: NyayaGaugeProps) {
  const radius = (size - 20) / 2
  const circumference = Math.PI * radius  // half-circle arc
  const offset = circumference - (score / 100) * circumference

  const getColor = () => {
    if (color) return color
    if (score >= 75) return '#34d399'   // emerald — good
    if (score >= 50) return '#fbbf24'   // yellow — moderate
    if (score >= 25) return '#fb923c'   // orange — warning
    return '#f87171'                     // red — danger
  }

  const scoreColor = getColor()
  const cx = size / 2
  const cy = size / 2
  const startX = cx - radius
  const startY = cy
  const endX = cx + radius
  const endY = cy

  return (
    <div id="nyaya-gauge" className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        {/* Background arc */}
        <path
          d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
          fill="none"
          stroke={scoreColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="gauge-arc"
          style={{ filter: `drop-shadow(0 0 8px ${scoreColor}60)` }}
        />
        {/* Score text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fill={scoreColor}
          fontSize="36"
          fontWeight="800"
          fontFamily="Inter, sans-serif"
        >
          {score}
        </text>
        {label && (
          <text
            x={cx}
            y={cy + 22}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="13"
            fontFamily="Inter, sans-serif"
          >
            {label}
          </text>
        )}
        {sublabel && (
          <text
            x={cx}
            y={cy + 38}
            textAnchor="middle"
            fill="#64748b"
            fontSize="11"
            fontFamily="Inter, sans-serif"
          >
            {sublabel}
          </text>
        )}
      </svg>
    </div>
  )
}
